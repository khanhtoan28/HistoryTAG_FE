import React, { useState } from 'react';
import { searchHardware, searchHospitals, createBusiness, getBusinesses, updateBusiness, deleteBusiness, getBusinessById } from '../../api/business.api';
import api from '../../api/client';
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  EyeIcon,
  DollarLineIcon,
} from '../../icons';

const BusinessPage: React.FC = () => {
  const roles = JSON.parse(localStorage.getItem('roles') || '[]');
  const isAdmin = roles.some((r: unknown) => {
    if (typeof r === 'string') return r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPERADMIN';
    if (r && typeof r === 'object') {
      const roleName = (r as Record<string, unknown>).roleName;
      if (typeof roleName === 'string') return roleName.toUpperCase() === 'ADMIN' || roleName.toUpperCase() === 'SUPERADMIN';
    }
    return false;
  });

  const [hardwareOptions, setHardwareOptions] = useState<Array<{ id: number; label: string; subLabel?: string }>>([]);
  const [hospitalOptions, setHospitalOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedHardwareId, setSelectedHardwareId] = useState<number | null>(null);
  const [selectedHardwarePrice, setSelectedHardwarePrice] = useState<number | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [selectedHospitalPhone, setSelectedHospitalPhone] = useState<string | null>(null);
  // commissionPercent is the user-facing input (entered as percent, e.g. 12 means 12%)
  const [commissionPercent, setCommissionPercent] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [statusValue, setStatusValue] = useState<string>('CARING');
  const [startDateValue, setStartDateValue] = useState<string>('');
  const [deadlineValue, setDeadlineValue] = useState<string>('');
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
    deadline?: string | null;
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
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<BusinessItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  

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

  async function loadList() {
    try {
      const res = await getBusinesses({ page: 0, size: 50 });
      const content = Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : []);
      // ensure numeric fields are numbers
      const normalized = (content as Array<Record<string, unknown>>).map((c) => {
        const unit = c['unitPrice'];
        const total = c['totalPrice'];
        const comm = c['commission'];
        return {
          ...c,
          unitPrice: unit != null ? Number(String(unit)) : null,
          totalPrice: total != null ? Number(String(total)) : null,
          commission: comm != null ? Number(String(comm)) : null,
        } as BusinessItem;
      });
      setItems(normalized);
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
        setItems(withPhones);
      } catch (e) {
        // ignore phone enrichment failures
        console.warn('Failed to enrich hospitals with phone', e);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchHardwareOptions(''); fetchHospitalOptions(''); loadList(); }, []);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!isAdmin) return setToast({ message: 'Bạn không có quyền', type: 'error' });
    // validation
  if (!name || name.trim().length === 0) return setToast({ message: 'Tên dự án là bắt buộc', type: 'error' });
  if (!selectedHospitalId) return setToast({ message: 'Vui lòng chọn bệnh viện', type: 'error' });
  if (!selectedHardwareId) return setToast({ message: 'Vui lòng chọn phần cứng', type: 'error' });
    if (!quantity || quantity < 1) return setToast({ message: 'Số lượng phải lớn hơn hoặc bằng 1', type: 'error' });

    setSaving(true);
      try {
        const toLocalDateTimeStr = (v?: string | null) => v ? (v.length === 16 ? `${v}:00` : v) : undefined;
        const payload: Record<string, unknown> = { name, hospitalId: selectedHospitalId, hardwareId: selectedHardwareId, quantity, status: statusValue,
          startDate: toLocalDateTimeStr(startDateValue),
          deadline: toLocalDateTimeStr(deadlineValue),
          completionDate: toLocalDateTimeStr(completionDateValue),
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
      await loadList();
    } catch (err: unknown) {
      console.error(err);
      setToast({ message: 'Lỗi khi lưu dữ liệu', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function computeTotal() {
    if (selectedHardwarePrice == null) return 0;
    return (selectedHardwarePrice) * (quantity || 0);
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
      if (res.hospital?.id) {
        // use the auth/hospitals endpoint (works for non-superadmin roles too)
        api.get(`/api/v1/auth/hospitals/${res.hospital.id}`).then(r => {
          const d = r.data || {};
          const phone = d.contactNumber || d.contact_number || d.contactPhone || d.contact_phone || null;
          setSelectedHospitalPhone(phone);
        }).catch(() => setSelectedHospitalPhone(null));
      } else setSelectedHospitalPhone(null);
  setSelectedHardwareId(res.hardware?.id ?? null);
  setStartDateValue(res.startDate ? (res.startDate.length === 16 ? res.startDate : res.startDate.substring(0,16)) : '');
  setDeadlineValue(res.deadline ? (res.deadline.length === 16 ? res.deadline : res.deadline.substring(0,16)) : '');
  setCompletionDateValue(res.completionDate ? (res.completionDate.length === 16 ? res.completionDate : res.completionDate.substring(0,16)) : '');
      // convert existing commission amount to percentage for the input
      const existingTotal = res.totalPrice != null ? Number(res.totalPrice) : null;
      if (res.commission != null && existingTotal && existingTotal > 0) {
        const pct = (Number(res.commission) / existingTotal) * 100;
        setCommissionPercent(Number(pct.toFixed(2)));
      } else {
        setCommissionPercent(null);
      }
      setQuantity(res.quantity ?? 1);
      // fetch price
      if (res.hardware?.id) {
        const r = await api.get(`/api/v1/superadmin/hardware/${res.hardware.id}`);
        setSelectedHardwarePrice(r.data && r.data.price != null ? Number(r.data.price) : null);
      } else setSelectedHardwarePrice(null);
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
    <div className="p-6 relative overflow-hidden">
      {/* Toasts */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`px-4 py-2 rounded shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.message}
          </div>
        </div>
      )}
      {/* Animated gradient background */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div style={{
          background: 'linear-gradient(45deg, rgba(99,102,241,0.25), rgba(16,185,129,0.18), rgba(234,88,12,0.15))',
          width: '200%',
          height: '200%',
          transform: 'translate(-25%, -25%)',
          filter: 'blur(60px)',
          animation: 'bgMove 12s linear infinite'
        }} />
      </div>

      <style>{`@keyframes bgMove { 0% { transform: translate(-30%, -30%) rotate(0deg); } 50% { transform: translate(-20%, -10%) rotate(10deg);} 100% { transform: translate(-30%, -30%) rotate(0deg);} }`}</style>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold mb-0">Quản lý Kinh doanh</h1>
  <button type="button" onClick={() => { setEditingId(null); setName(''); setSelectedHardwareId(null); setQuantity(1); setStatusValue('CARING'); setStartDateValue(''); setDeadlineValue(''); setCompletionDateValue(''); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded shadow-lg">
          <PlusIcon style={{ width: 18, height: 18, fill: 'white' }} />
          <span>Thêm mới</span>
        </button>
      </div>
      {!isAdmin ? (
        <div className="text-red-600">Bạn không có quyền truy cập trang này.</div>
      ) : (
        <div>
          {/* Inline form kept for legacy but hidden on modal-enabled UI - keep for fallback */}
          <form onSubmit={handleSubmit} className="hidden space-y-3 mb-6 bg-white/60 p-4 rounded shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Tên dự án</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phần cứng</label>
              <select value={selectedHardwareId ?? ''} onChange={(e) => {
                const v = e.target.value; setSelectedHardwareId(v ? Number(v) : null);
                const found = hardwareOptions.find(h => String(h.id) === v);
                if (found) {
                  // fetch hardware detail to read price
                  api.get(`/api/v1/superadmin/hardware/${found.id}`).then(r => {
                    // keep null if backend did not provide price
                    setSelectedHardwarePrice(r.data && r.data.price != null ? Number(r.data.price) : null);
                  }).catch(() => setSelectedHardwarePrice(null));
                } else setSelectedHardwarePrice(null);
              }} className="w-full rounded border px-3 py-2">
                <option value="">— Chọn phần cứng —</option>
                {hardwareOptions.map(h => <option key={h.id} value={h.id}>{h.label} {h.subLabel ? `— ${h.subLabel}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số lượng</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-40 rounded border px-3 py-2" />
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
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => { if (!saving) setShowModal(false); }} />
              <div className="relative bg-white rounded p-6 w-[720px] shadow-lg">
                <h3 className="text-xl font-semibold mb-4">{editingId ? 'Sửa Kinh doanh' : 'Thêm Kinh doanh'}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tên dự án</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phần cứng</label>
                      <select value={selectedHardwareId ?? ''} onChange={(e) => {
                        const v = e.target.value; setSelectedHardwareId(v ? Number(v) : null);
                        const found = hardwareOptions.find(h => String(h.id) === v);
                        if (found) {
                          api.get(`/api/v1/superadmin/hardware/${found.id}`).then(r => setSelectedHardwarePrice(r.data && r.data.price != null ? Number(r.data.price) : null)).catch(() => setSelectedHardwarePrice(null));
                        } else setSelectedHardwarePrice(null);
                      }} className="w-full rounded border px-3 py-2">
                        <option value="">— Chọn phần cứng —</option>
                        {hardwareOptions.map(h => <option key={h.id} value={h.id}>{h.label} {h.subLabel ? `— ${h.subLabel}` : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bệnh viện</label>
                      <select value={selectedHospitalId ?? ''} onChange={(e) => { const v = e.target.value; const id = v ? Number(v) : null; setSelectedHospitalId(id); if (id) {
                          const found = hospitalOptions.find(h => Number(h.id) === id);
                          if (found) {
                            api.get(`/api/v1/auth/hospitals/${found.id}`).then(r => {
                              const d = r.data || {};
                              const phone = d.contactNumber || d.contact_number || d.contactPhone || d.contact_phone || null;
                              setSelectedHospitalPhone(phone);
                            }).catch(() => setSelectedHospitalPhone(null));
                          } else setSelectedHospitalPhone(null);
                        } else setSelectedHospitalPhone(null);
                      }} className="w-full rounded border px-3 py-2">
                        <option value="">— Chọn bệnh viện —</option>
                        {hospitalOptions.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                      </select>
                      {selectedHospitalPhone && <div className="mt-1 text-sm text-gray-700">Số điện thoại bệnh viện: <span className="font-medium">{selectedHospitalPhone}</span></div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Trạng thái</label>
                      <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)} className="w-full rounded border px-3 py-2">
                        <option value="CARING">Đang chăm sóc</option>
                        <option value="CONTRACTED">Ký hợp đồng</option>
                        <option value="CANCELLED">Hủy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Số lượng</label>
                      <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-40 rounded border px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Hoa hồng (%)</label>
                      <input type="number" step="0.01" min={0} value={commissionPercent ?? ''} onChange={(e) => setCommissionPercent(e.target.value ? Number(e.target.value) : null)} className="w-40 rounded border px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Đơn giá</label>
                      <div className="p-2">{selectedHardwarePrice != null ? selectedHardwarePrice.toLocaleString() + ' ₫' : '—'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                      <input type="datetime-local" value={startDateValue} onChange={(e) => setStartDateValue(e.target.value)} className="w-full rounded border px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Deadline</label>
                      <input type="datetime-local" value={deadlineValue} onChange={(e) => setDeadlineValue(e.target.value)} className="w-full rounded border px-3 py-2" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Ngày hoàn thành</label>
                      <input type="datetime-local" value={completionDateValue} onChange={(e) => setCompletionDateValue(e.target.value)} className="w-full rounded border px-3 py-2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between">
                    <div className="text-sm text-gray-600">Tổng: <span className="font-semibold">{computeTotal() > 0 ? computeTotal().toLocaleString() + ' ₫' : '—'}</span></div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { if (!saving) { setShowModal(false); setEditingId(null); } }} className="px-4 py-2 border rounded">Hủy</button>
                      <button type="submit" disabled={saving} className={`px-4 py-2 rounded text-white ${saving ? 'bg-gray-400' : 'bg-blue-600'}`}>{saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu')}</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-2">Danh sách Kinh doanh</h2>
            <div className="rounded border bg-white p-3">
              <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gradient-to-r from-white to-gray-50">
                    <th className="text-center px-2 py-3">ID</th>
                    <th className="text-center px-2 py-3">Tên</th>
                    <th className="text-center px-2 py-3">Bệnh viện</th>
                    <th className="text-center px-2 py-3">Điện thoại</th>
                    <th className="text-center px-2 py-3">Phần cứng</th>
                    <th className="text-center px-2 py-3">Bắt đầu</th>
                    <th className="text-center px-2 py-3">Deadline</th>
                    <th className="text-center px-2 py-3">Hoàn thành</th>
                    <th className="text-center px-2 py-3">Số lượng</th>
                    <th className="text-center px-2 py-3">Đơn giá</th>
                    <th className="text-center px-2 py-3">Tổng</th>
                    <th className="text-center px-2 py-3">Hoa hồng</th>
                    <th className="text-center px-2 py-3">Hành động</th>
                    <th className="text-center px-2 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="text-center px-2 py-2">{it.id}</td>
                        <td className="text-center px-2 py-2">{it.name}</td>
                        <td className="text-center px-2 py-2">{it.hospital?.label ?? '—'}</td>
                        <td className="text-center px-2 py-2">{it.hospitalPhone ?? '—'}</td>
                        <td className="text-center px-2 py-2">{it.hardware?.label ?? '—'}</td>
                        <td className="text-center px-2 py-2">{formatDateShort(it.startDate)}</td>
                        <td className="text-center px-2 py-2">{formatDateShort(it.deadline)}</td>
                        <td className="text-center px-2 py-2">{formatDateShort(it.completionDate)}</td>
                        <td className="text-center px-2 py-2">{it.quantity ?? '—'}</td>
                        <td className="text-center px-2 py-2">{it.unitPrice != null ? it.unitPrice.toLocaleString() + ' ₫' : '—'}</td>
                        <td className="text-center px-2 py-2">{it.totalPrice != null ? it.totalPrice.toLocaleString() + ' ₫' : '—'}</td>
                        <td className="text-center px-2 py-2">{it.commission != null ? (it.commission.toLocaleString() + ' ₫') : '—'} {it.commission != null && it.totalPrice ? `(${((it.commission / it.totalPrice) * 100).toFixed(2).replace(/\.00$/,'')}%)` : ''}</td>
                        <td className="text-center px-2 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <button title="Xem" onClick={() => openView(it)} className="p-2 rounded-full bg-white shadow hover:scale-105 transition">
                              <EyeIcon style={{ width: 16, height: 16 }} />
                            </button>
                            <button title="Sửa" onClick={() => openEditModal(it.id)} className="p-2 rounded-full bg-yellow-50 hover:scale-105 transition">
                              <PencilIcon style={{ width: 16, height: 16 }} />
                            </button>
                            <button title="Xóa" onClick={() => handleDelete(it.id)} disabled={deletingId === it.id} className={`p-2 rounded-full ${deletingId === it.id ? 'bg-red-200 opacity-70' : 'bg-red-50'} hover:scale-105 transition`}>
                              <TrashBinIcon style={{ width: 16, height: 16 }} />
                            </button>
                          </div>
                        </td>
                        <td className="text-center px-2 py-2">{renderStatusBadge(it.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Detail modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeView} />
          <div className="relative bg-white rounded p-6 w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Chi tiết Kinh doanh #{viewItem.id}</h3>
              <div className="text-sm space-y-2">
              <div><strong>Tên:</strong> {viewItem.name}</div>
              <div><strong>Bệnh viện:</strong> {viewItem.hospital?.label ?? '—'}</div>
              <div><strong>Điện thoại:</strong> {viewItem.hospitalPhone ?? '—'}</div>
              <div><strong>Phần cứng:</strong> {viewItem.hardware?.label ?? '—'}</div>
              <div><strong>Bắt đầu:</strong> {formatDateShort(viewItem.startDate)}</div>
              <div><strong>Deadline:</strong> {formatDateShort(viewItem.deadline)}</div>
              <div><strong>Hoàn thành:</strong> {formatDateShort(viewItem.completionDate)}</div>
              <div><strong>Số lượng:</strong> {viewItem.quantity ?? '—'}</div>
              <div><strong>Đơn giá:</strong> {viewItem.unitPrice != null ? viewItem.unitPrice.toLocaleString() + ' ₫' : '—'}</div>
              <div><strong>Tổng:</strong> {viewItem.totalPrice != null ? viewItem.totalPrice.toLocaleString() + ' ₫' : '—'}</div>
              <div><strong>Hoa hồng:</strong> {viewItem.commission != null ? (Number(viewItem.commission).toLocaleString() + ' ₫') : '—'} {viewItem.commission != null && viewItem.totalPrice ? `(${((Number(viewItem.commission) / Number(viewItem.totalPrice)) * 100).toFixed(2).replace(/\.00$/,'')}%)` : ''}</div>
              <div><strong>Trạng thái:</strong> {viewItem.status ?? '—'}</div>
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

