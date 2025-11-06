import NotificationDropdown from './NotificationDropdownNew';
import NotificationContext from '../../context/NotificationContext';

export default {
  title: 'Header/NotificationDropdown',
  component: NotificationDropdown,
};

const sampleNotifications = [
  { id: 1, title: 'Bạn được giao task', message: 'Task ABC', createdAt: new Date().toISOString(), read: false, actorName: 'Minh' },
  { id: 2, title: 'Task cập nhật', message: 'Task XYZ đã cập nhật', createdAt: new Date().toISOString(), read: true, actorName: 'Lan' },
];

export const Default = () => (
  <NotificationContext.Provider value={{
    notifications: sampleNotifications,
    unreadCount: 1,
    loadNotifications: async () => {},
    markAsRead: async () => {},
  }}>
    <div style={{ padding: 20 }}>
      <NotificationDropdown />
    </div>
  </NotificationContext.Provider>
);
