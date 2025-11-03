import api from './client';

export async function getNotifications(limit = 20) {
  const res = await api.get(`/api/v1/auth/notifications?limit=${limit}`);
  return res.data;
}

export async function getNotificationsPage(page = 0, size = 20) {
  const res = await api.get(`/api/v1/auth/notifications?page=${page}&size=${size}`);
  return res.data;
}

export async function getUnreadCount() {
  const res = await api.get('/api/v1/auth/notifications/unread-count');
  return res.data;
}

export async function markAsRead(id: number) {
  const res = await api.put(`/api/v1/auth/notifications/${id}/read`);
  return res.data;
}

export async function deleteNotification(id: number) {
  // try to call backend delete endpoint if available. If backend doesn't support it,
  // the caller should handle the error and apply optimistic UI changes.
  const res = await api.delete(`/api/v1/auth/notifications/${id}`);
  return res.data;
}

export async function getAllNotifications() {
  // Attempt to fetch many notifications; backend may limit results.
  const res = await api.get(`/api/v1/auth/notifications?limit=1000`);
  return res.data;
}

