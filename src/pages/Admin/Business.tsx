import React, { useState } from 'react';
import { searchHardware, searchHospitals, createBusiness, getBusinesses, updateBusiness, deleteBusiness, getBusinessById, getHardwareById, getBusinessPicOptions } from '../../api/business.api';
import { getAllUsers } from '../../api/superadmin.api';
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
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Pagination from '../../components/common/Pagination';
import ComponentCard from '../../components/common/ComponentCard';
import { normalizeBusinessContractName } from '../../utils/businessContract';

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
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [selectedHospitalPhone, setSelectedHospitalPhone] = useState<string | null>(null);
  const [businessPicOptionsState, setBusinessPicOptionsState] = useState<Array<{ id: number; label: string; subLabel?: string }>>([]);
  const [selectedPicId, setSelectedPicId] = useState<number | null>(null);
  const [picDropdownOpen, setPicDropdownOpen] = useState<boolean>(false);
  const [picSearchInput, setPicSearchInput] = useState<string>('');
  const [hospitalDropdownOpen, setHospitalDropdownOpen] = useState<boolean>(false);
  const [hospitalSearchInput, setHospitalSearchInput] = useState<string>('');
  // commission is the user-facing input (entered as amount in VND)
  const [commission, setCommission] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [name, setName] = useState<string>('');
  const [statusValue, setStatusValue] = useState<string>('CARING');
  const [startDateValue, setStartDateValue] = useState<string>('');
  const [completionDateValue, setCompletionDateValue] = useState<string>('');
  const [originalStatus, setOriginalStatus] = useState<string>('CARING');
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{ payload: Record<string, unknown>; isUpdate: boolean; successMessage?: string } | null>(null);
  const [bankName, setBankName] = useState<string>('');
  const [bankContactPerson, setBankContactPerson] = useState<string>('');
  type BusinessItem = {
    id: number;
    name?: string;
    hospital?: { id?: number; label?: string } | null;
    hospitalPhone?: string | null;
    hardware?: { label?: string } | null;
    picUser?: { id?: number; label?: string; subLabel?: string } | null;
    quantity?: number | null;
    unitPrice?: number | null;
    totalPrice?: number | null;
    commission?: number | null;
    status?: string | null;
    startDate?: string | null;
    completionDate?: string | null;
    createdAt?: string | null;
    bankName?: string | null;
    bankContactPerson?: string | null;
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

  function formatFilterDateLabel(value?: string | null) {
    if (!value) return '—';
    if (value.includes('T')) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('vi-VN');
    }
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  }

  function parseDateForFilter(value?: string | null, isEnd = false) {
    if (!value || value.trim() === '') return null;
    const base = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;
    if (isEnd) {
      base.setHours(23, 59, 59, 999);
    } else {
      base.setHours(0, 0, 0, 0);
    }
    return base;
  }

  function applyLocalDateFilter(source: BusinessItem[]): BusinessItem[] {
    const fromDate = parseDateForFilter(filterStartFrom, false);
    const toDate = parseDateForFilter(filterStartTo, true);
    if (!fromDate && !toDate) return source;
    return source.filter((item) => {
      const candidateRaw = item.startDate ?? item.createdAt ?? null;
      if (!candidateRaw) return false;
      const candidate = new Date(candidateRaw);
      if (Number.isNaN(candidate.getTime())) return false;
      if (fromDate && candidate < fromDate) return false;
      if (toDate && candidate > toDate) return false;
      return true;
    });
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
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<BusinessItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const picDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const filteredBusinessPicOptions = React.useMemo(() => {
    const q = picSearchInput.trim().toLowerCase();
    if (!q) return businessPicOptionsState;
    return businessPicOptionsState.filter((opt) => opt.label.toLowerCase().includes(q) || (opt.subLabel ?? '').toLowerCase().includes(q));
  }, [businessPicOptionsState, picSearchInput]);
  const selectedPicOption = React.useMemo(() => {
    if (selectedPicId == null) return null;
    return businessPicOptionsState.find((opt) => opt.id === selectedPicId) ?? null;
  }, [selectedPicId, businessPicOptionsState]);
  const searchFilterTimeoutRef = React.useRef<number | null>(null);
  const [dateFilterOpen, setDateFilterOpen] = useState<boolean>(false);
  const [pendingFilterStart, setPendingFilterStart] = useState<string>('');
  const [pendingFilterEnd, setPendingFilterEnd] = useState<string>('');
  const dateFilterRef = React.useRef<HTMLDivElement | null>(null);
  const hospitalPhoneCacheRef = React.useRef<Map<number, string | null>>(new Map());
  const reloadTimeoutRef = React.useRef<number | null>(null);
  const initialSearchAppliedRef = React.useRef(false);
  const initialStatusAppliedRef = React.useRef(false);
  const initialDateAppliedRef = React.useRef(false);
  const initialPicAppliedRef = React.useRef(false);
  const [filterPicId, setFilterPicId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const pendingStartInputRef = React.useRef<HTMLInputElement | null>(null);
  const pendingEndInputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (!dateFilterOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setDateFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dateFilterOpen]);


  async function fetchHardwareOptions(q: string) {
    try {
      const list = await searchHardware(q);
      setHardwareOptions(list || []);
    } catch (e) {
      console.error(e);
    }
  }

  function normalizeDateForStart(value?: string | null) {
    if (!value || value.trim() === '') return undefined;
    if (value.length === 10) return `${value}T00:00:00`;
    if (value.length === 16) return `${value}:00`;
    if (value.length >= 19) return value.substring(0, 19);
    return value;
  }

  function normalizeDateForEnd(value?: string | null) {
    if (!value || value.trim() === '') return undefined;
    if (value.length === 10) return `${value}T23:59:59`;
    if (value.length === 16) return `${value}:59`;
    if (value.length >= 19) return value.substring(0, 19);
    return value;
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
  const usePicFilter = Boolean(filterPicId);
  const effectivePage = page;
  const effectiveSize = size;
  const params: Record<string, unknown> = { page: effectivePage, size: effectiveSize };
      const startFromParam = normalizeDateForStart(filterStartFrom);
      const startToParam = normalizeDateForEnd(filterStartTo);
      if (startFromParam) params.startDateFrom = startFromParam;
      if (startToParam) params.startDateTo = startToParam;
      const trimmedSearch = filterSearch.trim();
      if (trimmedSearch) params.search = trimmedSearch;
      if (filterStatus && filterStatus !== 'ALL') params.status = filterStatus;
      if (filterPicId) params.picUserId = filterPicId;
      console.debug('[Business] loadList params', params);
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
        const created = (c['createdAt'] ?? c['created_at']) as string | undefined | null;
        const picRaw = c['picUser'] ?? c['pic_user'] ?? null;
        let picUser: BusinessItem['picUser'] = null;
        if (picRaw && typeof picRaw === 'object') {
          const pr = picRaw as Record<string, unknown>;
          const pid = pr['id'];
          const plabel = pr['label'] ?? pr['name'];
          const psub = pr['subLabel'] ?? pr['sub_label'] ?? pr['email'];
          picUser = {
            id: pid != null ? Number(pid) : undefined,
            label: plabel != null ? String(plabel) : undefined,
            subLabel: psub != null ? String(psub) : undefined,
          };
        }
        return {
          ...c,
          unitPrice: unit != null ? Number(String(unit)) : null,
          totalPrice: total != null ? Number(String(total)) : null,
          commission: comm != null ? Number(String(comm)) : null,
          quantity: qty != null ? Number(String(qty)) : null,
          startDate: start ?? null,
          completionDate: completion ?? null,
          createdAt: created ?? null,
          picUser,
          bankName: c['bankName'] ?? c['bank_name'] ?? null,
          bankContactPerson: c['bankContactPerson'] ?? c['bank_contact_person'] ?? null,
        } as BusinessItem;
      });
      const locallyFiltered = applyLocalDateFilter(normalized);
      const filteredByPic = filterPicId
        ? locallyFiltered.filter((item) => {
            const rawId = item.picUser?.id;
            const numericId = rawId != null ? Number(rawId) : null;
            return numericId != null && Number.isFinite(numericId) && numericId === filterPicId;
          })
        : locallyFiltered;
      const finalList = sortBusinessItems(filteredByPic);
      setItems(finalList);
      let listForTotals = finalList;
      // fetch phone numbers for each unique hospital in the list (best-effort, cache results)
      try {
        const cache = hospitalPhoneCacheRef.current;
        const hospitalIds = (normalized as BusinessItem[])
          .map((it) => {
            const id = it.hospital?.id;
            if (id == null) return null;
            const numericId = Number(id);
            return Number.isFinite(numericId) ? numericId : null;
          })
          .filter((id): id is number => id != null);

        const uniqueIds = Array.from(new Set(hospitalIds));
        const idsToFetch = uniqueIds.filter((id) => !cache.has(id));

        if (idsToFetch.length) {
          await Promise.all(
            idsToFetch.map(async (hid) => {
              try {
                const r = await api.get(`/api/v1/auth/hospitals/${hid}`);
                const d = r.data || {};
                const phone = d.contactNumber || d.contact_number || d.contactPhone || d.contact_phone || null;
                cache.set(hid, phone ?? null);
              } catch {
                cache.set(hid, null);
              }
            }),
          );
        }

        const withPhones = (normalized as BusinessItem[]).map((it) => {
          const hidRaw = it.hospital?.id;
          const hid = hidRaw != null ? Number(hidRaw) : null;
          const phone = hid != null && Number.isFinite(hid) ? cache.get(hid) ?? null : null;
          return { ...it, hospitalPhone: phone };
        });

        const withPhonesFiltered = applyLocalDateFilter(withPhones);
        const withPhonesPicFiltered = filterPicId
          ? withPhonesFiltered.filter((item) => {
              const rawId = item.picUser?.id;
              const numericId = rawId != null ? Number(rawId) : null;
              return numericId != null && Number.isFinite(numericId) && numericId === filterPicId;
            })
          : withPhonesFiltered;
        const finalWithPhones = sortBusinessItems(withPhonesPicFiltered);
        setItems(finalWithPhones);
        listForTotals = finalWithPhones;
      } catch (e) {
        // ignore phone enrichment failures
        console.warn('Failed to enrich hospitals with phone', e);
      }
      const fallbackTotal = res?.totalElements ?? (Array.isArray(res) ? res.length : content.length);
      setTotalItems(fallbackTotal);
      setTotalPages(res?.totalPages ?? 1);
      setCurrentPage(res?.number ?? page);
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

  async function loadBusinessPicOptions() {
    try {
      const list = await getBusinessPicOptions();
      const baseOptions = Array.isArray(list)
        ? list.map((item: any) => ({
            id: Number(item?.id ?? 0),
            label: String(item?.label ?? ''),
            subLabel: item?.subLabel ? String(item.subLabel) : undefined,
          }))
        : [];

      let superAdminOptions: Array<{ id: number; label: string; subLabel?: string }> = [];
      try {
        const res = await getAllUsers({ page: 0, size: 200 });
        const content = Array.isArray(res?.content)
          ? res.content
          : Array.isArray(res)
          ? res
          : [];
        superAdminOptions = content
          .filter((user: any) => {
            const roles = user?.roles;
            if (!roles) return false;
            const roleArr = Array.isArray(roles) ? roles : [];
            return roleArr.some((r: any) => {
              if (!r) return false;
              if (typeof r === 'string') return r.toUpperCase() === 'SUPERADMIN';
              const roleName = r.roleName ?? r.role_name ?? r.role;
              return typeof roleName === 'string' && roleName.toUpperCase() === 'SUPERADMIN';
            });
          })
          .map((user: any) => ({
            id: Number(user?.id ?? 0),
            label: String(user?.fullname ?? user?.fullName ?? user?.username ?? user?.email ?? `User #${user?.id ?? ''}`),
            subLabel: user?.email ? String(user.email) : undefined,
          }));
      } catch (err) {
        // ignore if superadmin endpoint not accessible
        console.warn('Failed to fetch superadmin users for PIC options', err);
      }

      const mergedMap = new Map<number, { id: number; label: string; subLabel?: string }>();
      [...baseOptions, ...superAdminOptions].forEach((opt) => {
        if (!opt || !opt.id) return;
        if (!opt.label || !opt.label.trim()) return;
        if (!mergedMap.has(opt.id)) {
          mergedMap.set(opt.id, { ...opt, label: opt.label.trim() });
        }
      });

      const merged = Array.from(mergedMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' })
      );

      setBusinessPicOptionsState((prev) => {
        if (selectedPicId && !merged.some((opt) => opt.id === selectedPicId)) {
          const existing = prev.find((opt) => opt.id === selectedPicId);
          return existing ? [...merged, existing] : merged;
        }
        return merged;
      });
    } catch (err) {
      console.error('Failed to load business PIC options', err);
      setBusinessPicOptionsState([]);
    }
  }

  React.useEffect(() => {
    fetchHardwareOptions('');
    fetchHospitalOptions('');
    loadBusinessPicOptions();
  }, []);
  React.useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) {
        window.clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { loadList(currentPage, itemsPerPage); }, [currentPage, itemsPerPage, reloadKey]);

  const scheduleReload = React.useCallback((options?: { resetPage?: boolean; delay?: number }) => {
    const { resetPage = false, delay = 0 } = options || {};
    if (reloadTimeoutRef.current) {
      window.clearTimeout(reloadTimeoutRef.current);
    }
    const execute = () => {
      if (resetPage) setCurrentPage(0);
      setReloadKey((key) => key + 1);
      reloadTimeoutRef.current = null;
    };
    reloadTimeoutRef.current = window.setTimeout(execute, delay > 0 ? delay : 0);
  }, []);

  // Debounce hospital search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (hospitalSearchInput || hospitalDropdownOpen) {
        fetchHospitalOptions(hospitalSearchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [hospitalSearchInput, hospitalDropdownOpen]);

  React.useEffect(() => {
    if (!initialSearchAppliedRef.current) {
      initialSearchAppliedRef.current = true;
      return;
    }
    if (searchFilterTimeoutRef.current) {
      window.clearTimeout(searchFilterTimeoutRef.current);
    }
    searchFilterTimeoutRef.current = window.setTimeout(() => {
      scheduleReload({ resetPage: true });
    }, 400);
    return () => {
      if (searchFilterTimeoutRef.current) {
        window.clearTimeout(searchFilterTimeoutRef.current);
      }
    };
  }, [filterSearch, scheduleReload]);

  React.useEffect(() => {
    if (!initialStatusAppliedRef.current) {
      initialStatusAppliedRef.current = true;
      return;
    }
    scheduleReload({ resetPage: true });
  }, [filterStatus, scheduleReload]);

  React.useEffect(() => {
    if (!initialDateAppliedRef.current) {
      initialDateAppliedRef.current = true;
      return;
    }
    scheduleReload({ resetPage: true });
  }, [filterStartFrom, filterStartTo, scheduleReload]);

  React.useEffect(() => {
    if (!initialPicAppliedRef.current) {
      initialPicAppliedRef.current = true;
      return;
    }
    scheduleReload({ resetPage: true });
  }, [filterPicId, scheduleReload]);

  React.useEffect(() => {
    if (!picDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (picDropdownRef.current && !picDropdownRef.current.contains(event.target as Node)) {
        setPicDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [picDropdownOpen]);

  React.useEffect(() => {
    if (!picDropdownOpen) {
      setPicSearchInput('');
    }
  }, [picDropdownOpen]);

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
    scheduleReload({ resetPage: true });
  }

  function clearFilters() {
    setFilterStartFrom('');
    setFilterStartTo('');
    setFilterStatus('ALL');
    setFilterSearch('');
    setFilterPicId(null);
    scheduleReload({ resetPage: true });
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
      const candidateLower = trimmedName.toLowerCase();
      const candidateNormalized = normalizeBusinessContractName(trimmedName);
      const matchesExistingName = (value?: string | null) => {
        const existingTrimmed = (value ?? '').toString().trim();
        if (!existingTrimmed) return false;
        if (existingTrimmed.toLowerCase() === candidateLower) return true;
        const existingNormalized = normalizeBusinessContractName(existingTrimmed);
        if (existingNormalized && candidateNormalized) {
          return existingNormalized === candidateNormalized;
        }
        return false;
      };

      const duplicate = items.find(item => {
        // Exclude current editing item if in edit mode
        if (editingId && item.id === editingId) return false;
        return matchesExistingName(item.name);
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
            return matchesExistingName(item.name);
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
    if (businessPicOptionsState.length > 0 && !selectedPicId) errors.selectedPicId = 'Vui lòng chọn người phụ trách';
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

    const finalUnitPrice = unitPrice !== '' ? Number(unitPrice) : (selectedHardwarePrice ?? null);
    const payload: Record<string, unknown> = {
      name,
      hospitalId: selectedHospitalId,
      hardwareId: selectedHardwareId,
      quantity,
      status: statusValue,
      startDate: toLocalDateTimeStr(finalStart),
      completionDate: toLocalDateTimeStr(completionDateValue),
      // some backends use 'finishDate' instead of 'completionDate' — include both to be safe
      finishDate: toLocalDateTimeStr(completionDateValue),
      picUserId: selectedPicId ?? null,
      bankName: bankName?.trim() || null,
      bankContactPerson: bankContactPerson?.trim() || null,
      unitPrice: finalUnitPrice,
    };
    // commission is entered directly as amount
    if (commission !== '') {
      payload.commission = Number(commission);
    }

    const isUpdate = Boolean(editingId);
    const requireConfirm = statusValue === 'CONTRACTED' && originalStatus !== 'CONTRACTED';
    if (requireConfirm && !statusConfirmOpen) {
      setPendingSubmit({ payload, isUpdate, successMessage: 'Chuyển trạng thái thành công' });
      setStatusConfirmOpen(true);
      return;
    }

    await submitBusiness(payload, isUpdate, requireConfirm ? 'Chuyển trạng thái thành công' : undefined);
  }

  async function submitBusiness(
    payload: Record<string, unknown>,
    isUpdate: boolean,
    successMessage?: string,
  ) {
    setPendingSubmit(null);
    setStatusConfirmOpen(false);
    setSaving(true);
    try {
      if (isUpdate) {
        if (!editingId) throw new Error('Không xác định được ID để cập nhật');
        await updateBusiness(editingId, payload);
      } else {
        await createBusiness(payload);
      }
      setToast({ message: successMessage ?? (isUpdate ? 'Cập nhật thành công' : 'Tạo thành công'), type: 'success' });
      setName('');
      setSelectedHardwareId(null);
      setSelectedHardwarePrice(null);
      setUnitPrice('');
      setQuantity(1);
      setStatusValue('CARING');
      setOriginalStatus('CARING');
      setCommission('');
      setSelectedHospitalId(null);
      setSelectedHospitalPhone(null);
      setSelectedPicId(null);
      setHospitalSearchInput('');
      setCompletionDateValue('');
      setStartDateValue(nowDateTimeLocal());
      setBankName('');
      setBankContactPerson('');
      setEditingId(null);
      setShowModal(false);
      // reload the first page so the new item is visible
      setCurrentPage(0);
      await loadList(0, itemsPerPage);
      await loadBusinessPicOptions();
    } catch (err: unknown) {
      console.error(err);
      setToast({ message: 'Lỗi khi lưu dữ liệu', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function computeTotal() {
    const price = unitPrice !== '' ? Number(unitPrice) : (selectedHardwarePrice ?? 0);
    if (price === 0) return 0;
    return price * (Number(quantity) || 0);
  }

  // Helper functions để format số với dấu chấm phân cách hàng nghìn
  function formatNumber(value: number | ''): string {
    if (value === '' || value === null || value === undefined) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function parseFormattedNumber(value: string): number | '' {
    // Loại bỏ dấu chấm phân cách hàng nghìn (chỉ giữ lại số)
    // Ví dụ: "1.000.000" -> "1000000", "1.234.56" -> "123456"
    const cleaned = value.replace(/\./g, '').replace(/[^\d]/g, '');
    if (cleaned === '' || cleaned === '0') return '';
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : num;
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
      const now = nowDateTimeLocal();
      setCompletionDateValue(now);
    }
  }

  async function confirmStatusTransition() {
    const submission = pendingSubmit;
    setStatusConfirmOpen(false);
    if (!submission) {
      setPendingSubmit(null);
      return;
    }
    setPendingSubmit(null);
    await submitBusiness(submission.payload, submission.isUpdate, submission.successMessage);
  }

  function cancelStatusTransition() {
    setPendingSubmit(null);
    setStatusConfirmOpen(false);
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
      setSelectedPicId(res.picUser?.id ?? null);
      setPicDropdownOpen(false);
      setPicSearchInput('');
      if (res.picUser?.id != null) {
        setBusinessPicOptionsState((prev) => {
          const exists = prev.some((opt) => opt.id === res.picUser?.id);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: res.picUser.id,
              label: res.picUser.label ?? res.picUser.fullname ?? res.picUser.email ?? `User #${res.picUser.id}`,
              subLabel: res.picUser.subLabel ?? res.picUser.email ?? undefined,
            },
          ];
        });
      }
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
      const remoteStatus = (res.status as string | undefined) ?? 'CARING';
      setStatusValue(remoteStatus);
      setOriginalStatus(remoteStatus);
      setSelectedHardwareId(res.hardware?.id ?? null);
      const remoteStart = (res.startDate ?? (res as unknown as Record<string, unknown>)['start_date'] ?? (res as unknown as Record<string, unknown>)['startDateTime']) as string | undefined | null;
      setStartDateValue(remoteStart ? (remoteStart.length === 16 ? remoteStart : remoteStart.substring(0, 16)) : '');
      setCompletionDateValue(remoteCompletion ? (remoteCompletion.length === 16 ? remoteCompletion : remoteCompletion.substring(0, 16)) : '');
      // Load commission directly as amount
      if (res.commission != null) {
        setCommission(Number(res.commission));
      } else {
        setCommission('');
      }
      setQuantity(res.quantity != null ? Number(String(res.quantity)) : 1);
      // Load unitPrice từ response (có thể khác với giá mặc định từ phần cứng)
      if (res.unitPrice != null) {
        setUnitPrice(Number(res.unitPrice));
      } else {
        setUnitPrice('');
      }
      // fetch price từ phần cứng để hiển thị giá mặc định
      if (res.hardware?.id) {
        try {
          const hw = await getHardwareById(res.hardware.id);
          setSelectedHardwarePrice(hw && hw.price != null ? Number(hw.price) : null);
        } catch {
          setSelectedHardwarePrice(null);
        }
      } else setSelectedHardwarePrice(null);
      setBankName(res.bankName ?? '');
      setBankContactPerson(res.bankContactPerson ?? '');
      setFieldErrors({});
      setPendingSubmit(null);
      setStatusConfirmOpen(false);
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
          <div
            className={`flex min-w-[220px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg bg-white ${
              toast.type === 'success' ? 'border-green-200' : 'border-red-200'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {toast.type === 'success' ? <FiCheckCircle size={20} /> : <FiXCircle size={20} />}
            </span>
            <span className="text-sm font-medium text-gray-900">{toast.message}</span>
          </div>
        </div>
      )}

      {statusConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelStatusTransition();
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Xác nhận chuyển trạng thái</h3>
            <p className="mt-3 text-sm text-red-600">
              Bạn có muốn chuyển trạng thái sang ký hợp đồng và chuyển sang phòng triển khai không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelStatusTransition}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmStatusTransition}
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
              >
                Xác nhận
              </button>
            </div>
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
            setOriginalStatus('CARING');
            setSelectedHardwareId(null);
            setSelectedHardwarePrice(null);
            setUnitPrice('');
            setSelectedHospitalId(null);
            setSelectedHospitalPhone(null);
            setSelectedPicId(null);
            setPicDropdownOpen(false);
            setPicSearchInput('');
            setQuantity(1);
            setStatusValue('CARING');
            setStartDateValue(nowDateTimeLocal());
            setCompletionDateValue('');
            setCommission('');
            setFieldErrors({});
            setPendingSubmit(null);
            setStatusConfirmOpen(false);
            setHospitalSearchInput('');
            setHospitalDropdownOpen(false);
            setBankName('');
            setBankContactPerson('');
            setShowModal(true);
          }}
          disabled={!canManage}
          className={`rounded-xl border px-6 py-3 text-sm font-medium text-white transition-all flex items-center gap-2 ${canManage ? 'border-blue-500 bg-blue-500 hover:bg-blue-600 hover:shadow-md' : 'border-gray-200 bg-gray-300 cursor-not-allowed'}`}
        >
          <PlusIcon style={{ width: 18, height: 18, fill: 'white' }} />
          <span>Thêm mới</span>
        </button>
      </div>
      <ComponentCard title="Tìm kiếm & Lọc">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Tìm theo mã hợp đồng / bệnh viện"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm shadow-sm min-w-[240px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
          />
          <div className="relative" ref={dateFilterRef}>
            <button
              type="button"
              onClick={() => {
                setPendingFilterStart(filterStartFrom);
                setPendingFilterEnd(filterStartTo);
                setDateFilterOpen((prev) => !prev);
              }}
              className="rounded-full border border-gray-200 px-4 py-2.5 text-sm shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
            >
              <span>📅</span>
              <span>Lọc theo thời gian</span>
            </button>
            {dateFilterOpen && (
              <div className="absolute z-40 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bắt đầu từ</label>
                  <input
                    type="date"
                    value={pendingFilterStart}
                    onChange={(e) => setPendingFilterStart(e.target.value)}
                    ref={pendingStartInputRef}
                    onFocus={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        e.currentTarget.showPicker();
                      }
                    }}
                    onClick={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        e.currentTarget.showPicker();
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Đến</label>
                  <input
                    type="date"
                    value={pendingFilterEnd}
                    onChange={(e) => setPendingFilterEnd(e.target.value)}
                    ref={pendingEndInputRef}
                    onFocus={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        e.currentTarget.showPicker();
                      }
                    }}
                    onClick={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        e.currentTarget.showPicker();
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFilterStart('');
                      setPendingFilterEnd('');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Xóa chọn
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDateFilterOpen(false)}
                      className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilterOpen(false);
                        setFilterStartFrom(pendingFilterStart);
                        setFilterStartTo(pendingFilterEnd);
                      }}
                      className="px-3 py-1.5 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Lọc
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Trạng thái</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            >
              <option value="ALL">— Tất cả —</option>
              <option value="CARING">Đang chăm sóc</option>
              <option value="CONTRACTED">Ký hợp đồng</option>
              <option value="CANCELLED">Hủy</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Người phụ trách</span>
            <select
              value={filterPicId ?? ''}
              onChange={(e) => setFilterPicId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            >
              <option value="">— Tất cả —</option>
              {businessPicOptionsState.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition"
            >
              <span>Lọc</span>
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <span>Xóa</span>
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm font-semibold text-gray-700">
          Tổng hợp đồng:
          <span className="ml-1 text-gray-900">{totalItems}</span>
        </div>
        {(filterStartFrom || filterStartTo) && (
          <div className="mt-2 text-xs text-gray-500">
            Đang lọc từ{' '}
            <span className="font-semibold text-blue-600">
              {formatFilterDateLabel(filterStartFrom)}
            </span>{' '}
            đến{' '}
            <span className="font-semibold text-blue-600">
              {formatFilterDateLabel(filterStartTo)}
            </span>
          </div>
        )}
      </ComponentCard>
      {!pageAllowed ? (
        <div className="text-red-600">Bạn không có quyền truy cập trang này.</div>
      ) : (
        <div className="mt-6">
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
                  getHardwareById(found.id).then(r => {
                    const price = r && r.price != null ? Number(r.price) : null;
                    setSelectedHardwarePrice(price);
                    if (price != null) {
                      setUnitPrice(price);
                    }
                  }).catch(() => {
                    setSelectedHardwarePrice(null);
                    setUnitPrice('');
                  });
                } else {
                  setSelectedHardwarePrice(null);
                  setUnitPrice('');
                }
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
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice === '' ? '' : unitPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setUnitPrice(val === '' ? '' : Number(val));
                }}
                placeholder={selectedHardwarePrice != null ? `Giá mặc định: ${selectedHardwarePrice.toLocaleString()} ₫` : 'Nhập đơn giá'}
                className="w-full rounded border px-3 py-2"
              />
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
                            getHardwareById(found.id).then(r => {
                              const price = r && r.price != null ? Number(r.price) : null;
                              setSelectedHardwarePrice(price);
                              // Tự động điền giá vào input đơn giá khi chọn phần cứng
                              if (price != null) {
                                setUnitPrice(price);
                              }
                            }).catch(() => {
                              setSelectedHardwarePrice(null);
                              setUnitPrice('');
                            });
                          } else {
                            setSelectedHardwarePrice(null);
                            setUnitPrice('');
                          }
                        }} 
                        className={`w-full rounded border px-3 py-2 ${fieldErrors.selectedHardwareId ? 'border-red-500' : ''}`}
                      >
                        <option value="">— Chọn phần cứng —</option>
                        {hardwareOptions.map(h => <option key={h.id} value={h.id}>{h.label} {h.subLabel ? `— ${h.subLabel}` : ''}</option>)}
                      </select>
                      {fieldErrors.selectedHardwareId && <div className="mt-1 text-sm text-red-600">{fieldErrors.selectedHardwareId}</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Người phụ trách</label>
                      <div className="relative" ref={picDropdownRef}>
                        <input
                          type="text"
                          value={picDropdownOpen ? picSearchInput : (selectedPicOption?.label ?? '')}
                          placeholder="Tìm người phụ trách..."
                          onFocus={() => {
                            setPicDropdownOpen(true);
                            setPicSearchInput('');
                          }}
                          onChange={(e) => {
                            setPicDropdownOpen(true);
                            setPicSearchInput(e.target.value);
                            clearFieldError('selectedPicId');
                          }}
                          className={`w-full rounded border px-3 py-2 ${fieldErrors.selectedPicId ? 'border-red-500' : ''}`}
                        />
                        {selectedPicOption && !picDropdownOpen && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                            onClick={() => {
                              setSelectedPicId(null);
                              setPicSearchInput('');
                              clearFieldError('selectedPicId');
                            }}
                            aria-label="Clear PIC"
                          >
                            ✕
                          </button>
                        )}
                        {picDropdownOpen && (
                          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-auto">
                            {filteredBusinessPicOptions.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500">Không tìm thấy người phù hợp</div>
                            ) : (
                              filteredBusinessPicOptions.map((opt) => {
                                const isSelected = opt.id === selectedPicId;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''}`}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedPicId(opt.id);
                                      setPicDropdownOpen(false);
                                      setPicSearchInput('');
                                      clearFieldError('selectedPicId');
                                    }}
                                  >
                                    <div className="font-medium text-gray-800">{opt.label}</div>
                                    {opt.subLabel && <div className="text-xs text-gray-500">{opt.subLabel}</div>}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                      {fieldErrors.selectedPicId && <div className="mt-1 text-sm text-red-600">{fieldErrors.selectedPicId}</div>}
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
                      <label className="block text-sm font-medium mb-1">Hoa hồng</label>
                      {isSuperAdmin ? (
                        <input 
                          type="text" 
                          value={formatNumber(commission)} 
                          onChange={(e) => {
                            const parsed = parseFormattedNumber(e.target.value);
                            setCommission(parsed);
                            clearFieldError('commission');
                          }}
                          onBlur={(e) => {
                            // Format lại khi blur
                            const parsed = parseFormattedNumber(e.target.value);
                            setCommission(parsed);
                          }}
                          className="w-full rounded border px-3 py-2" 
                          placeholder="Nhập số tiền hoa hồng"
                        />
                      ) : (
                        <div className="p-2 text-gray-700">{commission !== '' ? formatNumber(commission) + ' ₫' : '—'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Đơn vị tài trợ</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                        placeholder="Nhập đơn vị tài trợ"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Liên hệ đơn vị tài trợ</label>
                      <input
                        type="text"
                        value={bankContactPerson}
                        onChange={(e) => setBankContactPerson(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                        placeholder="Nhập người liên hệ"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Đơn giá (VND)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formatNumber(unitPrice)}
                          onChange={(e) => {
                            const parsed = parseFormattedNumber(e.target.value);
                            setUnitPrice(parsed);
                            clearFieldError('unitPrice');
                          }}
                          onBlur={(e) => {
                            // Format lại khi blur
                            const parsed = parseFormattedNumber(e.target.value);
                            setUnitPrice(parsed);
                          }}
                          placeholder={selectedHardwarePrice != null ? `Giá mặc định: ${formatNumber(selectedHardwarePrice)} ₫` : 'Nhập đơn giá'}
                          className="flex-1 rounded border px-3 py-2"
                        />
                         
                      </div>
                      {fieldErrors.unitPrice && <div className="mt-1 text-sm text-red-600">{fieldErrors.unitPrice}</div>}
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
                    <div className="text-sm text-gray-600">Thành tiền: <span className="font-semibold">{computeTotal() > 0 ? computeTotal().toLocaleString() + ' ₫' : '—'}</span></div>
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
                        <div className="col-span-2 md:col-span-2">Người phụ trách:
                          <div className="font-medium text-gray-800">
                            {it.picUser?.label ?? '—'}
                            {it.picUser?.subLabel ? <span className="ml-2 text-xs text-gray-500">{it.picUser?.subLabel}</span> : null}
                          </div>
                        </div>
                        {it.bankName && (
                          <div className="col-span-2 md:col-span-2">Đơn vị tài trợ: <div className="font-medium text-gray-800">{it.bankName}</div></div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
                        <div className="flex items-center gap-6">
                          <div>Số lượng: <span className="font-medium">{it.quantity ?? '—'}</span></div>
                          <div>Đơn giá (VND): <span className="font-medium">{it.unitPrice != null ? it.unitPrice.toLocaleString() + ' ₫' : '—'}</span></div>
                          <div>Thành tiền: <span className="font-semibold">{it.totalPrice != null ? it.totalPrice.toLocaleString() + ' ₫' : '—'}</span></div>
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
              <Info label="Người phụ trách" value={<div className="font-medium">{viewItem.picUser?.label ?? '—'}{viewItem.picUser?.subLabel ? <span className="ml-2 text-xs text-gray-500">{viewItem.picUser?.subLabel}</span> : null}</div>} icon={<UserCircleIcon style={{ width: 18, height: 18 }} />} />
              <Info label="Bắt đầu" value={<div className="font-medium">{formatDateShort(viewItem.startDate)}</div>} icon={<CalenderIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Hoàn thành" value={<div className="font-medium">{formatDateShort(viewItem.completionDate)}</div>} icon={<TimeIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Số lượng" value={<div className="font-medium">{viewItem.quantity ?? '—'}</div>} icon={<BoxIconLine style={{ width: 16, height: 16 }} />} />
              <Info label="Đơn giá" value={<div className="font-medium">{viewItem.unitPrice != null ? viewItem.unitPrice.toLocaleString() + ' ₫' : '—'}</div>} icon={<DollarLineIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Thành tiền" value={<div className="font-medium">{viewItem.totalPrice != null ? viewItem.totalPrice.toLocaleString() + ' ₫' : '—'}</div>} icon={<DollarLineIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Hoa hồng" value={<div className="font-medium">{viewItem.commission != null ? (Number(viewItem.commission).toLocaleString() + ' ₫') : '—'} {viewItem.commission != null && viewItem.totalPrice ? `(${((Number(viewItem.commission) / Number(viewItem.totalPrice)) * 100).toFixed(2).replace(/\.00$/,'')}%)` : ''}</div>} icon={<CheckCircleIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Trạng thái" value={<div className="font-medium">{statusLabel(viewItem.status) ?? '—'}</div>} icon={<TaskIcon style={{ width: 16, height: 16 }} />} />
              <Info label="Đơn vị tài trợ" value={<div className="font-medium">{viewItem.bankName ?? '—'}</div>} icon={<UserCircleIcon style={{ width: 18, height: 18 }} />} />
              <Info label="Liên hệ đơn vị tài trợ" value={<div className="font-medium">{viewItem.bankContactPerson ?? '—'}</div>} icon={<UserCircleIcon style={{ width: 18, height: 18 }} />} />
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

