import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the NotificationContext to provide controlled test data (use vitest's mock)
import { describe, it, expect } from 'vitest';
import NotificationContext from '../../../context/NotificationContext';

import NotificationDropdown from '../NotificationDropdownNew';

describe('NotificationDropdownNew', () => {
  it('shows unread badge and opens dropdown with items', async () => {
    render(
      <MemoryRouter>
        <NotificationContext.Provider value={{
          notifications: [
            { id: 1, title: 'Test A', message: 'Message A', createdAt: new Date().toISOString(), read: false, actorName: 'Alice' },
            { id: 2, title: 'Test B', message: 'Message B', createdAt: new Date().toISOString(), read: true, actorName: 'Bob' },
          ],
          unreadCount: 1,
          loadNotifications: async () => {},
          markAsRead: async () => {},
        }}>
          <NotificationDropdown />
        </NotificationContext.Provider>
      </MemoryRouter>
    );

  // Badge with unread count should be visible
  const badge = await screen.findByText('1');
  expect(badge).toBeTruthy();

    // Click the bell button to open dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // After opening, the notifications list should contain Test A and Test B
    expect(await screen.findByText(/Test A/)).toBeTruthy();
    expect(screen.getByText(/Test B/)).toBeTruthy();
  });
});
