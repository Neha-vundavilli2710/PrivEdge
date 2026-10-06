import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import TopBar from './TopBar';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(), upload: vi.fn() },
  getToken: () => null,
  setToken: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));

import { api } from '../../api/client';

const NOTIFS = {
  items: [
    { id: 1, type: 'review_completed', icon: 'check', title: 'Query reviewed', message: 'Your request was approved.', read: false, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, type: 'high_risk', icon: 'alert', title: 'High-risk review assigned', message: 'A new medical query needs review.', read: false, created_at: '2026-01-01T00:00:00Z' },
  ],
  unread: 2,
};

describe('TopBar notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue(NOTIFS);
    (api.post as any).mockResolvedValue({ marked: 2 });
  });

  it('shows an unread indicator after loading notifications', async () => {
    renderWithProviders(<TopBar />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications'));
  });

  it('opens the dropdown, lists notifications, and marks them read', async () => {
    renderWithProviders(<TopBar />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications'));

    const bellButtons = screen.getAllByRole('button');
    const bellButton = bellButtons.find(b => b.querySelector('svg.lucide-bell'))!;
    await userEvent.click(bellButton);

    expect(await screen.findByText('Query reviewed')).toBeInTheDocument();
    expect(screen.getByText('High-risk review assigned')).toBeInTheDocument();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/read-all'));
  });

  it('shows an empty state with no notifications', async () => {
    (api.get as any).mockResolvedValue({ items: [], unread: 0 });
    renderWithProviders(<TopBar />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications'));
    const bellButtons = screen.getAllByRole('button');
    const bellButton = bellButtons.find(b => b.querySelector('svg.lucide-bell'))!;
    await userEvent.click(bellButton);
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
  });
});
