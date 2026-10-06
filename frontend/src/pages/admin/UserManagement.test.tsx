import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import UserManagement from './UserManagement';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(), upload: vi.fn() },
  getToken: () => 'fake-admin-token',
  setToken: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));

import { api } from '../../api/client';

const ME = { id: 1, name: 'Admin', email: 'admin@privedge.io', role: 'admin', is_active: true, created_at: '2026-01-01T00:00:00Z' };
const USERS = [
  { id: 1, code: 'USR-001', name: 'Admin', email: 'admin@privedge.io', role: 'Admin', status: 'Active', joined: '2026-01-01T00:00:00Z', queries: 10 },
  { id: 2, code: 'USR-002', name: 'Bob Builder', email: 'bob@example.com', role: 'User', status: 'Active', joined: '2026-01-05T00:00:00Z', queries: 3 },
];

function mockGets() {
  (api.get as any).mockImplementation((path: string) => {
    if (path === '/auth/me') return Promise.resolve(ME);
    if (path.startsWith('/admin/users?')) return Promise.resolve(USERS);
    if (path.startsWith('/notifications')) return Promise.resolve({ items: [], unread: 0 });
    return Promise.resolve([]);
  });
}

describe('UserManagement', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGets(); });

  it('lists users with role and status badges', async () => {
    renderWithProviders(<UserManagement />, { route: '/admin/users' });
    expect(await screen.findByText('Bob Builder')).toBeInTheDocument();
    // "Active" also appears in the "N Active" summary badge at the top, so just confirm both rows show it
    expect(screen.getByText('Bob Builder').closest('tr')?.textContent).toContain('Active');
    expect(screen.getByText('admin@privedge.io').closest('tr')?.textContent).toContain('Active');
  });

  it('changes a user\'s role via the dropdown', async () => {
    (api.patch as any).mockResolvedValue({ ...USERS[1], role: 'Reviewer' });
    renderWithProviders(<UserManagement />, { route: '/admin/users' });
    await screen.findByText('Bob Builder');

    const bobRow = screen.getByText('Bob Builder').closest('tr')!;
    const roleSelect = bobRow.querySelector('select')!;
    await userEvent.selectOptions(roleSelect, 'Reviewer');

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/users/2', { role: 'REVIEWER' }));
  });

  it('deactivates a user', async () => {
    (api.patch as any).mockResolvedValue({ ...USERS[1], status: 'Inactive' });
    renderWithProviders(<UserManagement />, { route: '/admin/users' });
    await screen.findByText('Bob Builder');

    const bobRow = screen.getByText('Bob Builder').closest('tr')!;
    await userEvent.click(within(bobRow).getByRole('button', { name: /deactivate/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/users/2', { is_active: false }));
  });

  it('prevents an admin from deactivating or changing their own role', async () => {
    renderWithProviders(<UserManagement />, { route: '/admin/users' });
    await screen.findByText('Bob Builder');

    const myRow = screen.getAllByText('Admin').map(el => el.closest('tr')).find(tr => tr?.textContent?.includes('admin@privedge.io'))!;
    // No role <select> for self - just a static badge
    expect(myRow.querySelector('select')).toBeNull();
    const deactivateBtn = within(myRow).getByRole('button', { name: /deactivate/i });
    expect(deactivateBtn).toBeDisabled();
  });

  it('filters users by search', async () => {
    renderWithProviders(<UserManagement />, { route: '/admin/users' });
    await screen.findByText('Bob Builder');
    await userEvent.type(screen.getByPlaceholderText('Search users...'), 'bob');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(expect.stringContaining('q=bob')));
  });
});
