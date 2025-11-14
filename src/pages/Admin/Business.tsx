import React, { useState } from 'react';
import { searchHardware, searchHospitals, createBusiness, getBusinesses, updateBusiness, deleteBusiness, getBusinessById, getHardwareById } from '../../api/business.api';
import api from '../../api/client';
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  EyeIcon,
  DollarLineIcon,
  UserCircleIcon,
  GroupIcon,
  EnvelopeIcon,
  BoxCubeIcon,
  CalenderIcon,
  TimeIcon,
  BoxIconLine,
  CheckCircleIcon,
  TaskIcon,
} from '../../icons';
import Pagination from '../../components/common/Pagination';
import ComponentCard from '../../components/common/ComponentCard';

const BusinessPage: React.FC = () => {
  // read roles from either localStorage or sessionStorage (some flows store roles in sessionStorage)
  const rolesRaw = localStorage.getItem('roles') || sessionStorage.getItem('roles') || '[]';
  const roles = JSON.parse(rolesRaw);
  const isAdmin = roles.some((r: unknown) => {
    if (typeof r === 'string') return r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPERADMIN';
    if (r && typeof r === 'object') {
      const roleName = (r as Record<string, unknown>).roleName;
      if (typeof roleName === 'string') return roleName.toUpperCase() === 'ADMIN' || roleName.toUpperCase() === 'SUPERADMIN';
    }
    return false;
  });
  const isSuperAdmin = roles.some((r: unknown) => {
    if (typeof r === 'string') return r.toUpperCase() === 'SUPERADMIN';
    if (r && typeof r === 'object') {
      const roleName = (r as Record<string, unknown>).roleName ?? (r as Record<string, unknown>).role_name ?? (r as Record<string, unknown>).role;
      if (typeof roleName === 'string') return roleName.toUpperCase() === 'SUPERADMIN';
    }
    return false;
  });
  
  // Read stored user (may contain team information)
  const storedUserRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
  let storedUser: Record<string, any> | null = null;
  try {
    storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  } catch {
    storedUser = null;
  }
  const userTeam = storedUser && storedUser.team ? String(storedUser.team).toUpperCase() : null;
  // Page access: allow if ADMIN/SUPERADMIN or we have a logged-in user (teams can view). This keeps viewing broadly available in admin area.
  const pageAllowed = isAdmin || isSuperAdmin || Boolean(storedUser);
  // Manage rights: only SUPERADMIN or team SALES can create/update/delete
  const canManage = isSuperAdmin || userTeam === 'SALES';

  const [hardwareOptions, setHardwareOptions] = useState<Array<{ id: number; label: string; subLabel?: string }>>([]);
  const [hospitalOptions, setHospitalOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedHardwareId, setSelectedHardwareId] = useState<number | null>(null);
  const [selectedHardwarePrice, setSelectedHardwarePrice] = useState<number | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [selectedHospitalPhone, setSelectedHospitalPhone] = useState<string | null>(null);
  const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState<boolean>(false);
  const [hospitalSearchInput, setHospitalSearchInput] = useState<string>('');
  // commissionPercent is the user-facing input (entered as percent, e.g. 12 means 12%)
  const [commissionPercent, setCommissionPercent] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [name, setName] = useState<string>('');
  const [statusValue, setStatusValue] = useState<string>('CARING');
  const [startDateValue, setStartDateValue] = useState<string>('');
  const [completionDateValue, setCompletionDateValue] = useState<string>('');
  type BusinessItem = {
    id: number;
    name?: string;
    hospital?: { id?: number; label?: string } | null;
    hospitalPhone?: string | null;
    hardware?: { label?: string } | null;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
    commission?: number | null;
    status?: string | null;
    startDate?: string | null;
    completionDate?: string | null;
  };

  function formatDateShort(value?: string | null) {
    if (!value) return '—';
    try {
      const d = new Date(value);
      const dd = d.getDate();
      const mm = d.getMonth() + 1;
      const yyyy = d.getFullYear();
      return `${dd.toString().padStart(2,'0')}/${mm.toString().padStart(2,'0')}/${yyyy}`;
    } catch {
      return '—';
    }
  }
  function formatBusinessId(id?: number | null) {
    if (id == null) return '—';
    // Prefix 'HD' and pad to 2 digits (HD01, HD02, ...)
    const n = Number(id);
    if (Number.isNaN(n)) return String(id);
    return `HD${String(n).padStart(2, '0')}`;
  }

  // Ensure items with status 'CARING' (Đang chăm sóc) are shown first.
  // Secondary sort: newer startDate first. Non-dates are treated as 0.
  function sortBusinessItems(list: BusinessItem[]) {
    return list.slice().sort((a, b) => {
      const aCare = (a.status ?? '').toString().toUpperCase() === 'CARING';
      const bCare = (b.status ?? '').toString().toUpperCase() === 'CARING';
      if (aCare && !bCare) return -1;
      if (!aCare && bCare) return 1;
      const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
      return bTime - aTime;
    });
  }

  // Small Info helper (styled like Hospitals page) -------------------------------------------------
  function Info({ label, value, icon }: { label: string; value?: React.ReactNode; icon?: React.ReactNode }) {
    return (
      <div className="flex items-start gap-4">
        <div className="min-w-[150px] flex items-center gap-3">
          {icon && <span className="text-gray-500 text-lg">{icon}</span>}
          <span className="font-semibold text-gray-900">{label}:</span>
        </div>
        <div className="flex-1 text-gray-700 break-words">{value ?? '—'}</div>
      </div>
    );
  }
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [filterStartFrom, setFilterStartFrom] = useState<string>('');
  const [filterStartTo, setFilterStartTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<BusinessItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  

  async function fetchHardwareOptions(q: string) {
    try {
      const list = await searchHardware(q);
      setHardwareOptions(list || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchHospitalOptions(q: string) {
    try {
      const list = await searchHospitals(q);
      setHospitalOptions(list || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadList(page = currentPage, size = itemsPerPage) {
    try {
      const toParam = (v?: string | null) => v ? (v.length === 16 ? `${v}:00` : v) : undefined;
      const params: Record<string, unknown> = { page, size, startDateFrom: toParam(filterStartFrom), startDateTo: toParam(filterStartTo) };
      if (filterStatus && filterStatus !== 'ALL') params.status = filterStatus;
      const res = await getBusinesses(params);
      const content = Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : []);
      // ensure numeric fields are numbers
      const normalized = (content as Array<Record<string, unknown>>).map((c) => {
        const unit = c['unitPrice'] ?? c['unit_price'];
        const total = c['totalPrice'] ?? c['total_price'];
        const comm = c['commission'];
        const qty = c['quantity'] ?? c['qty'] ?? c['amount'];
        // accept multiple possible keys for start/completion
        const start = (c['startDate'] ?? c['start_date'] ?? c['start'] ?? c['startDateTime']) as string | undefined | null;
        const completion = (c['completionDate'] ?? c['finishDate'] ?? c['completion_date'] ?? c['finish_date'] ?? c['finishDate']) as string | undefined | null;
        return {
          ...c,
          unitPrice: unit != null ? Number(String(unit)) : null,
          totalPrice: total != null ? Number(String(total)) : null,
          commission: comm != null ? Number(String(comm)) : null,
          quantity: qty != null ? Number(String(qty)) : null,
          startDate: start ?? null,
          completionDate: completion ?? null,
        } as BusinessItem;
      });
  setItems(sortBusinessItems(normalized));
      // fetch phone numbers for each hospital in the list (best-effort)
      try {
        const withPhones = await Promise.all((normalized as BusinessItem[]).map(async (it) => {
          const out = { ...it } as BusinessItem;
          const hid = it.hospital?.id;
          if (hid) {
            try {
              const r = await api.get(`/api/v1/auth/hospitals/${hid}`);
              const d = r.data || {};
              out.hospitalPhone = d.contactNumber || d.contact_number || d.contactPhone || d.contact_phone || null;
            } catch {
              out.hospitalPhone = null;
            }
          } else out.hospitalPhone = null;
          return out;
        }));
  setItems(sortBusinessItems(withPhones));
        // pagination metadata (when backend returns Page)
        setTotalItems(res?.totalElements ?? (Array.isArray(res) ? res.length : content.length));
        setTotalPages(res?.totalPages ?? 1);
        setCurrentPage(res?.number ?? page);
      } catch (e) {
        // ignore phone enrichment failures
        console.warn('Failed to enrich hospitals with phone', e);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // helper: current datetime in `YYYY-MM-DDTHH:mm` for <input type="datetime-local">
  function nowDateTimeLocal() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  // helper: convert a YYYY-MM-DDTHH:mm (16 chars) to backend form with :00 seconds when needed
  function toLocalDateTimeStr(v?: string | null) {
    return v ? (v.length === 16 ? `${v}:00` : v) : undefined;
  }

  // run on mount and when pagination changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchHardwareOptions(''); fetchHospitalOptions(''); loadList(currentPage, itemsPerPage); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { loadList(currentPage, itemsPerPage); }, [currentPage, itemsPerPage]);

  // Debounce hospital search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (hospitalSearchInput || hospitalDropdownOpen) {
        fetchHospitalOptions(hospitalSearchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [hospitalSearchInput, hospitalDropdownOpen]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!hospitalDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.hospital-dropdown-container')) {
        setHospitalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hospitalDropdownOpen]);

  function applyFilters() {
    setCurrentPage(0);
    loadList(0, itemsPerPage);
  }

  function clearFilters() {
    setFilterStartFrom('');
    setFilterStartTo('');
    setFilterStatus('ALL');
    setCurrentPage(0);
    loadList(0, itemsPerPage);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canManage) return setToast({ message: 'Bạn không có quyền thực hiện thao tác này', type: 'error' });
    
    // Clear previous errors
    const errors: Record<string, string> = {};
    
    // validation
    if (!name || name.trim().length === 0) errors.name = 'Mã hợp đồng là bắt buộc';
    
    // Check duplicate contract code (name) - check in current items first
    if (name && name.trim().length > 0) {
      const trimmedName = name.trim();
      const duplicate = items.find(item => {
        // Exclude current editing item if in edit mode
        if (editingId && item.id === editingId) return false;
        // Case-insensitive comparison
        const itemName = item.name?.trim() || '';
        return itemName.toLowerCase() === trimmedName.toLowerCase();
      });
      if (duplicate) {
        errors.name = 'Mã hợp đồng đã được sử dụng';
      }
      
      // If no duplicate found in current items, check all items via API for accuracy
      if (!duplicate) {
        try {
          const allBusinesses = await getBusinesses({ page: 0, size: 10000 });
          const allItems = Array.isArray(allBusinesses?.content) ? allBusinesses.content : (Array.isArray(allBusinesses) ? allBusinesses : []);
          const duplicateInAll = allItems.find((item: BusinessItem) => {
            // Exclude current editing item if in edit mode
            if (editingId && item.id === editingId) return false;
            const itemName = item.name?.trim() || '';
            return itemName.toLowerCase() === trimmedName.toLowerCase();
          });
          if (duplicateInAll) {
            errors.name = 'Mã hợp đồng đã được sử dụng';
          }
        } catch (err) {
          // If API fails, rely on items check only
          console.warn('Failed to check duplicate contract code via API', err);
        }
      }
    }
    
    if (!selectedHospitalId) errors.selectedHospitalId = 'Vui lòng chọn bệnh viện';
    if (!selectedHardwareId) errors.selectedHardwareId = 'Vui lòng chọn phần cứng';
    if (!quantity || quantity < 1) errors.quantity = 'Số lượng phải lớn hơn hoặc bằng 1';

    // Ensure startDate is set (default to now) so backend always receives a start date
    const finalStart = startDateValue && startDateValue.trim() !== '' ? startDateValue : nowDateTimeLocal();
    // Validate completion date is not earlier than start date
    if (completionDateValue && completionDateValue.trim() !== '') {
      try {
        const st = new Date(finalStart);
        const comp = new Date(completionDateValue);
        if (comp.getTime() < st.getTime()) {
          errors.completionDateValue = 'Ngày hoàn thành không được nhỏ hơn ngày bắt đầu';
        }
      } catch {
        // ignore parse errors, backend will validate further
      }
    }

    // If there are validation errors, set them and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Clear errors if validation passes
    setFieldErrors({});

    setSaving(true);
      try {
        const payload: Record<string, unknown> = { name, hospitalId: selectedHospitalId, hardwareId: selectedHardwareId, quantity, status: statusValue,
          startDate: toLocalDateTimeStr(finalStart),
          completionDate: toLocalDateTimeStr(completionDateValue),
          // some backends use 'finishDate' instead of 'completionDate' — include both to be safe
          finishDate: toLocalDateTimeStr(completionDateValue),
        };
        // compute commission amount from percent and total (backend expects absolute amount)
        const total = computeTotal();
        if (commissionPercent != null && total > 0) {
          // round to 2 decimals
          const commissionAmount = Math.round(((commissionPercent / 100) * total) * 100) / 100;
          payload.commission = commissionAmount;
        }
      if (editingId) {
        await updateBusiness(editingId, payload);
        setToast({ message: 'Cập nhật thành công', type: 'success' });
      } else {
        await createBusiness(payload);
        setToast({ message: 'Tạo thành công', type: 'success' });
      }
    setName(''); setSelectedHardwareId(null); setQuantity(1);
  setStatusValue('CARING'); setCommissionPercent(null);
      setEditingId(null);
      setShowModal(false);
      // reload the first page so the new item is visible
      setCurrentPage(0);
      await loadList(0, itemsPerPage);
    } catch (err: unknown) {
      console.error(err);
      setToast({ message: 'Lỗi khi lưu dữ liệu', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function computeTotal() {
    if (selectedHardwarePrice == null) return 0;
    return (selectedHardwarePrice) * (Number(quantity) || 0);
  }

  // Helper function to clear field error when user changes value
  function clearFieldError(fieldName: string) {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }

  // when status is changed in the modal, handle auto-complete for CONTRACTED
  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setStatusValue(newStatus);
    if (newStatus === 'CONTRACTED') {
      // only set locally — do NOT auto-save. User must click Lưu/Cập nhật to persist and trigger downstream actions
      const now = nowDateTimeLocal();
      setCompletionDateValue(now);
      setToast({ message: 'Đã đặt ngày hoàn thành tạm thời. Vui lòng nhấn Lưu để xác nhận và tạo Task Triển khai.', type: 'success' });
    }
  }

  function statusLabel(status?: string | null) {
    if (!status) return '—';
    switch (status.toUpperCase()) {
      case 'CARING': return 'Đang chăm sóc';
      case 'CONTRACTED': return 'Ký hợp đồng';
      case 'CANCELLED': return 'Hủy';
      default: return status;
    }
  }

  function renderStatusBadge(status?: string | null) {
    const s = status ? status.toUpperCase() : '';
    let cls = 'bg-gray-100 text-gray-800';
    if (s === 'CARING') cls = 'bg-yellow-100 text-yellow-800';
    if (s === 'CONTRACTED') cls = 'bg-green-100 text-green-800';
    if (s === 'CANCELLED') cls = 'bg-red-100 text-red-800';
    return <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${cls}`}>{statusLabel(status)}</span>;
  }

  // formatting helpers removed (unused) to satisfy strict TypeScript noUnusedLocals

  async function openEditModal(id: number) {
    try {
      const res = await getBusinessById(id);
      setEditingId(id);
      setName(res.name ?? '');
      setSelectedHospitalId(res.hospital?.id ?? null);
      // Set hospital search input to the selected hospital label
      setHospitalSearchInput(res.hospital?.label ?? '');
      setHospitalDropdownOpen(false);
      // support older API that may use finishDate as the key
  const remoteCompletion = (res.completionDate ?? ((res as unknown as Record<string, unknown>).finishDate as string | undefined)) as string | undefined | null;
      if (res.hospital?.id) {
        // use the auth/hospitals endpoint (works for non-superadmin roles too)
        api.get(`/api/v1/auth/hospitals/${res.hospital.id}`).then(r => {
          const d = r.data || {};
          const phone = d.contactNumber || d.contact_number || d.contactPhone || d.contact_phone || null;
          setSelectedHospitalPhone(phone);
        }).catch(() => setSelectedHospitalPhone(null));
      } else setSelectedHospitalPhone(null);
  setSelectedHardwareId(res.hardware?.id ?? null);
  const remoteStart = (res.startDate ?? (res as unknown as Record<string, unknown>)['start_date'] ?? (res as unknown as Record<string, unknown>)['startDateTime']) as string | undefined | null;
  setStartDateValue(remoteStart ? (remoteStart.length === 16 ? remoteStart : remoteStart.substring(0,16)) : '');
  setCompletionDateValue(remoteCompletion ? (remoteCompletion.length === 16 ? remoteCompletion : remoteCompletion.substring(0,16)) : '');
      // convert existing commission amount to percentage for the input
      const existingTotal = res.totalPrice != null ? Number(res.totalPrice) : null;
      if (res.commission != null && existingTotal && existingTotal > 0) {
        const pct = (Number(res.commission) / existingTotal) * 100;
        setCommissionPercent(Number(pct.toFixed(2)));
      } else {
        setCommissionPercent(null);
      }
  setQuantity(res.quantity != null ? Number(String(res.quantity)) : 1);
      // fetch price
      if (res.hardware?.id) {
        try {
          const hw = await getHardwareById(res.hardware.id);
          setSelectedHardwarePrice(hw && hw.price != null ? Number(hw.price) : null);
        } catch {
          setSelectedHardwarePrice(null);
        }
      } else setSelectedHardwarePrice(null);
      setFieldErrors({});
      setShowModal(true);
    } catch (e) { console.error(e); setToast({ message: 'Không thể load mục để sửa', type: 'error' }); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xóa mục này?')) return;
    setDeletingId(id);
    try {
      await deleteBusiness(id);
      setToast({ message: 'Đã xóa', type: 'success' });
      await loadList();
    } catch (e) { console.error(e); setToast({ message: 'Xóa thất bại', type: 'error' }); }
    finally { setDeletingId(null); }
  }

  // auto dismiss toasts
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function openView(item: BusinessItem) { setViewItem(item); }
  function closeView() { setViewItem(null); }

  return (
    <div className="p-6 relative bg-white">
      {/* Toasts */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`px-4 py-2 rounded shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.message}
          </div>
        </div>
      )}
      {/* Page background simplified to white (no animated gradient) */}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold mb-0">Quản lý Kinh doanh</h1>
        <button
          type="button"
          onClick={() => {
            if (!canManage) { setToast({ message: 'Bạn không có quyền', type: 'error' }); return; }
            setEditingId(null);
            setName('');
            setSelectedHardwareId(null);
            setQuantity(1);
            setStatusValue('CARING');
            setStartDateValue(nowDateTimeLocal());
            setCompletionDateValue('');
            setFieldErrors({});
            setHospitalSearchInput('');
            setHospitalDropdownOpen(false);
            setShowModal(true);
          }}
          disabled={!canManage}
          className={`rounded-xl border px-6 py-3 text-sm font-medium text-white transition-all flex items-center gap-2 ${canManage ? 'border-blue-500 bg-blue-500 hover:bg-blue-600 hover:shadow-md' : 'border-gray-200 bg-gray-300 cursor-not-allowed'}`}
        >
          <PlusIcon style={{ width: 18, height: 18, fill: 'white' }} />
          <span>Thêm mới</span>
        </button>
      </div>
      {/* Filters: start date range */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm">Bắt đầu từ</label>
          <input type="datetime-local" value={filterStartFrom} onChange={(e) => setFilterStartFrom(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Đến</label>
          <input type="datetime-local" value={filterStartTo} onChange={(e) => setFilterStartTo(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Trạng thái</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded border px-2 py-1">
            <option value="ALL">— Tất cả —</option>
            <option value="CARING">Đang chăm sóc</option>
            <option value="CONTRACTED">Ký hợp đồng</option>
            <option value="CANCELLED">Hủy</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={applyFilters} className="px-3 py-1 bg-blue-600 text-white rounded">Lọc</button>
          <button onClick={clearFilters} className="px-3 py-1 border rounded">Xóa</button>
        </div>
      </div>
      {!pageAllowed ? (
        <div className="text-red-600">Bạn không có quyền truy cập trang này.</div>
      ) : (
        <div>
          {/* Inline form kept for legacy but hidden on modal-enabled UI - keep for fallback */}
          <form onSubmit={handleSubmit} className="hidden space-y-3 mb-6 bg-white/60 p-4 rounded shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Mã hợp đồng</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phần cứng</label>
              <select value={selectedHardwareId ?? ''} onChange={(e) => {
                const v = e.target.value; setSelectedHardwareId(v ? Number(v) : null);
                const found = hardwareOptions.find(h => String(h.id) === v);
                if (found) {
                  // fetch hardware detail to read price (base-aware)
                  getHardwareById(found.id).then(r => setSelectedHardwarePrice(r && r.price != null ? Number(r.price) : null)).catch(() => setSelectedHardwarePrice(null));
                } else setSelectedHardwarePrice(null);
              }} className="w-full rounded border px-3 py-2">
                <option value="">— Chọn phần cứng —</option>
                {hardwareOptions.map(h => <option key={h.id} value={h.id}>{h.label} {h.subLabel ? `— ${h.subLabel}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số lượng</label>
              <input
                type="number"
                min={1}
                value={quantity === '' ? '' : quantity}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                className="w-40 rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Đơn giá</label>
              <div className="p-2">{selectedHardwarePrice != null ? selectedHardwarePrice.toLocaleString() : '—'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tổng tiền</label>
              <div className="p-2 font-semibold">{computeTotal().toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="ml-auto text-sm text-gray-600 flex items-center gap-2">
                <DollarLineIcon style={{ width: 16, height: 16 }} />
                <span className="font-medium">{computeTotal() > 0 ? computeTotal().toLocaleString() + ' ₫' : '—'}</span>
              </div>
            </div>
          </form>

          {/* Create/Edit modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) { setShowModal(false); setFieldErrors({}); } }}>
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative bg-white rounded-xl p-6 w-[720px] shadow-lg">
                <h3 className="text-xl font-semibold mb-4">{editingId ? 'Cập nhật Kinh doanh' : 'Thêm Kinh doanh'}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Mã hợp đồng</label>
                      <input 
                        value={name} 
                        onChange={(e) => {
                          setName(e.target.value);
                          clearFieldError('name');
                        }} 
                        className={`w-full rounded border px-3 py-2 ${fieldErrors.name ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.name && <div className="mt-1 text-sm text-red-600">{fieldErrors.name}</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phần cứng</label>
                      <select 
                        value={selectedHardwareId ?? ''} 
                        onChange={(e) => {
                          const v = e.target.value; 
                          setSelectedHardwareId(v ? Number(v) : null);
                          clearFieldError('selectedHardwareId');
                          const found = hardwareOptions.find(h => String(h.id) === v);
                          if (found) {
                            getHardwareById(found.id).then(r => setSelectedHardwarePrice(r && r.price != null ? Number(r.price) : null)).catch(() => setSelectedHardwarePrice(null));
                          } else setSelectedHardwarePrice(null);
                        }} 
                        className={`w-full rounded border px-3 py-2 ${fieldErrors.selectedHardwareId ? 'border-red-500' : ''}`}
                      >
                        <option value="">— Chọn phần cứng —</option>
                        {hardwareOptions.map(h => <option key={h.id} value={h.id}>{h.label} {h.subLabel ? `— ${h.subLabel}` : ''}</option>)}
                      </select>
                      {fieldErrors.selectedHardwareId && <div className="mt-1 text-sm text-red-600">{fieldErrors.selectedHardwareId}</div>}
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium mb-1">Bệnh viện</label>
                      <div className="relative hospital-dropdown-container">
                        <input
                          type="text"
                          value={hospitalSearchInput}
                          onChange={(e) => {
                            setHospitalSearchInput(e.target.value);
                            setHospitalDropdownOpen(true);
                            clearFieldError('selectedHospitalId');
                          }}
                          onFocus={() => {
                            setHospitalDropdownOpen(true);
                            if (!hospitalSearchInput) {
                              fetchHospitalOptions('');
                            }
                          }}
                          placeholder="Tìm kiếm bệnh viện..."
                          className={`w-full rounded border px-3 py-2 ${fieldErrors.selectedHospitalId ? 'border-red-500' : ''}`}
                        />
                        {hospitalDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                            {hospitalOptions.length === 0 ? (
                              <div className="px-4 py-2 text-sm text-gray-500">Không tìm thấy bệnh viện</div>
                            ) : (
                              <div className="max-h-[200px] overflow-y-auto">
                                {hospitalOptions.map((hospital) => (
                                  <div
                                    key={hospital.id}
                                    onClick={() => {
                                      setSelectedHospitalId(hospital.id);
                                      setHospitalSearchInput(hospital.label);
                                      setHospitalDropdownOpen(false);
                                      clearFieldError('selectedHospitalId');
                                      api.get(`/api/v1/auth/hospitals/${hospital.id}`).then(r => {
                                        const d = r.data || {};
                                        const phone = d.contactNumber || d.contact_number || d.contactPhone || d.contact_phone || null;
                                        setSelectedHospitalPhone(phone);
                                      }).catch(() => setSelectedHospitalPhone(null));
                                    }}
                                    className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                                      selectedHospitalId === hospital.id ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    <div className="text-sm text-gray-900">{hospital.label}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {fieldErrors.selectedHospitalId && <div className="mt-1 text-sm text-red-600">{fieldErrors.selectedHospitalId}</div>}
                      {selectedHospitalPhone && !fieldErrors.selectedHospitalId && <div className="mt-1 text-sm text-gray-700">Số điện thoại bệnh viện: <span className="font-medium">{selectedHospitalPhone}</span></div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Trạng thái</label>
                      <select value={statusValue} onChange={handleStatusChange} className="w-full rounded border px-3 py-2">
                        <option value="CARING">Đang chăm sóc</option>
                        <option value="CONTRACTED">Ký hợp đồng</option>
                        <option value="CANCELLED">Hủy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Số lượng</label>
                      <input
                        type="number"
                        min={1}
                        value={quantity === '' ? '' : quantity}
                        onChange={(e) => {
                          setQuantity(e.target.value ? Number(e.target.value) : '');
                          clearFieldError('quantity');
                        }}
                        className={`w-40 rounded border px-3 py-2 ${fieldErrors.quantity ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.quantity && <div className="mt-1 text-sm text-red-600">{fieldErrors.quantity}</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Hoa hồng (%)</label>
                      {isSuperAdmin ? (
                        <input type="number" step="0.01" min={0} value={commissionPercent ?? ''} onChange={(e) => setCommissionPercent(e.target.value ? Number(e.target.value) : null)} className="w-40 rounded border px-3 py-2" />
                      ) : (
                        <div className="p-2 text-gray-700">{commissionPercent != null ? commissionPercent + '%' : '—'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Đơn giá</label>
                      <div className="p-2">{selectedHardwarePrice != null ? selectedHardwarePrice.toLocaleString() + ' ₫' : '—'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                      <input type="datetime-local" value={startDateValue} onChange={(e) => setStartDateValue(e.target.value)} className="w-full rounded border px-3 py-2" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Ngày hoàn thành</label>
                      <input 
                        type="datetime-local" 
                        value={completionDateValue} 
                        onChange={(e) => {
                          setCompletionDateValue(e.target.value);
                          clearFieldError('completionDateValue');
                        }} 
                        min={startDateValue || undefined} 
                        className={`w-full rounded border px-3 py-2 ${fieldErrors.completionDateValue ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.completionDateValue && <div className="mt-1 text-sm text-red-600">{fieldErrors.completionDateValue}</div>}
                    </div>
                  </div>
                      <div className="flex items-center gap-3 justify-between">
                    <div className="text-sm text-gray-600">Tổng: <span className="font-semibold">{computeTotal() > 0 ? computeTotal().toLocaleString() + ' ₫' : '—'}</span></div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { if (!saving) { setShowModal(false); setEditingId(null); setFieldErrors({}); } }} className="px-4 py-2 border rounded">Hủy</button>
                      <button type="submit" disabled={saving} className={`px-4 py-2 rounded text-white ${saving ? 'bg-gray-400' : 'bg-blue-600'}`}>{saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu')}</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div>
            <ComponentCard title="Danh sách Kinh doanh">
              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.id}
                    className={`flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-lg shadow-sm transition-all duration-150 ${hoveredId === it.id ? 'shadow-lg scale-101 bg-indigo-50 border-green-400' : 'hover:shadow hover:border-green-300'}`}
                    onMouseEnter={() => setHoveredId(it.id)} onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-50 text-sm font-semibold text-gray-700">{formatBusinessId(it.id)}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{it.name ?? '—'}</div>
                          <div className="text-sm text-gray-500">{it.hospital?.label ?? '—'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(it.status)}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div>Điện thoại: <div className="font-medium text-gray-800">{it.hospitalPhone ?? '—'}</div></div>
                        <div>Phần cứng: <div className="font-medium text-gray-800">{it.hardware?.label ?? '—'}</div></div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
                        <div className="flex items-center gap-6">
                          <div>Số lượng: <span className="font-medium">{it.quantity ?? '—'}</span></div>
                          <div>Đơn giá: <span className="font-medium">{it.unitPrice != null ? it.unitPrice.toLocaleString() + ' ₫' : '—'}</span></div>
                          <div>Tổng: <span className="font-semibold">{it.totalPrice != null ? it.totalPrice.toLocaleString() + ' ₫' : '—'}</span></div>
                        </div>
                        <div />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => openView(it)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-100 text-blue-600 bg-white hover:bg-blue-50">
                        <EyeIcon style={{ width: 16, height: 16 }} />
                        <span className="text-sm">Xem</span>
                      </button>
                      <button onClick={() => { if (!canManage) { setToast({ message: 'Bạn không có quyền', type: 'error' }); return; } if (it.status === 'CONTRACTED' && !isSuperAdmin) { setToast({ message: 'Không thể sửa dự án đã ký hợp đồng', type: 'error' }); return; } openEditModal(it.id); }} disabled={!canManage || (it.status === 'CONTRACTED' && !isSuperAdmin)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${( !canManage || (it.status === 'CONTRACTED' && !isSuperAdmin) ) ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-yellow-100 text-orange-600 bg-yellow-50 hover:bg-yellow-100'}`}>
                        <PencilIcon style={{ width: 16, height: 16 }} />
                        <span className="text-sm">Sửa</span>
                      </button>
                      <button onClick={() => { if (!canManage) { setToast({ message: 'Bạn không có quyền', type: 'error' }); return; } if (it.status === 'CONTRACTED' && !isSuperAdmin) { setToast({ message: 'Không thể xóa dự án đã ký hợp đồng', type: 'error' }); return; } handleDelete(it.id); }} disabled={!canManage || deletingId === it.id || (it.status === 'CONTRACTED' && !isSuperAdmin)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${( !canManage || deletingId === it.id || (it.status === 'CONTRACTED' && !isSuperAdmin) ) ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-red-100 text-red-600 bg-red-50 hover:bg-red-100'}`}>
                        <TrashBinIcon style={{ width: 16, height: 16 }} />
                        <span className="text-sm">Xóa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onItemsPerPageChange={(s) => { setItemsPerPage(s); setCurrentPage(0); }}
              showItemsPerPage={true}
            />
            </ComponentCard>
          </div>
        </div>
      )}
      {/* Detail modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && closeView()}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl p-6 w-[640px] shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Chi tiết Kinh doanh {formatBusinessId(viewItem.id)}</h3>
            <div className="space-y-3 text-sm">
              <Info label="Tên" value={<div className="font-medium">{viewItem.name ?? '—'}</div>} icon={<UserCircleIcon style={{ width: 18, height: 18 }} />} />
              <Info label="Bệnh viện" value={<div className="font-medium">{viewItem.hospital?.label ?? '—'}</div>} icon={<GroupIcon style={{ width: 18, height: 18 }} />} />
              <Info label="Điện thoại" value={<div className="font-medium">{viewItem.hospitalPhone ?? '—'}</div>} icon={<EnvelopeIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Phần cứng" value={<div className="font-medium">{viewItem.hardware?.label ?? '—'}</div>} icon={<BoxCubeIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Bắt đầu" value={<div className="font-medium">{formatDateShort(viewItem.startDate)}</div>} icon={<CalenderIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Hoàn thành" value={<div className="font-medium">{formatDateShort(viewItem.completionDate)}</div>} icon={<TimeIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Số lượng" value={<div className="font-medium">{viewItem.quantity ?? '—'}</div>} icon={<BoxIconLine style={{ width: 16, height: 16 }} />} />
              <Info label="Đơn giá" value={<div className="font-medium">{viewItem.unitPrice != null ? viewItem.unitPrice.toLocaleString() + ' ₫' : '—'}</div>} icon={<DollarLineIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Tổng" value={<div className="font-medium">{viewItem.totalPrice != null ? viewItem.totalPrice.toLocaleString() + ' ₫' : '—'}</div>} icon={<DollarLineIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Hoa hồng" value={<div className="font-medium">{viewItem.commission != null ? (Number(viewItem.commission).toLocaleString() + ' ₫') : '—'} {viewItem.commission != null && viewItem.totalPrice ? `(${((Number(viewItem.commission) / Number(viewItem.totalPrice)) * 100).toFixed(2).replace(/\.00$/,'')}%)` : ''}</div>} icon={<CheckCircleIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Trạng thái" value={<div className="font-medium">{statusLabel(viewItem.status) ?? '—'}</div>} icon={<TaskIcon style={{ width: 16, height: 16 }} />} />
            </div>
            <div className="mt-4 text-right">
              <button onClick={closeView} className="px-3 py-1 bg-indigo-600 text-white rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessPage;

// View modal (rendered by parent when viewItem is set) -- keep outside main component tree

