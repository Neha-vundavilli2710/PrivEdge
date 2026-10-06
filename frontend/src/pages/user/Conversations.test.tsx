import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Conversations from './Conversations';

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

const SAMPLE = [
  { id: 1, title: 'Explain Java inheritance', route: 'cloud', status: 'Completed', msgs: 2, preview: 'Inheritance lets...', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
  { id: 2, title: 'Confidential salary report', route: 'edge', status: 'Completed', msgs: 2, preview: 'Processed locally...', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' },
  { id: 3, title: 'Medication dosage question', route: 'human', status: 'Under Review', msgs: 2, preview: 'Human review is required...', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-04T00:00:00Z' },
];

function mockGets(convs = SAMPLE) {
  (api.get as any).mockImplementation((path: string) => {
    if (path === '/conversations') return Promise.resolve(convs);
    if (path.startsWith('/notifications')) return Promise.resolve({ items: [], unread: 0 });
    return Promise.resolve([]);
  });
}

describe('Conversations', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGets(); });

  it('lists all conversations with their route badges', async () => {
    renderWithProviders(<Conversations />, { route: '/user/conversations' });
    expect(await screen.findByText('Explain Java inheritance')).toBeInTheDocument();
    expect(screen.getByText('Confidential salary report')).toBeInTheDocument();
    expect(screen.getByText('Medication dosage question')).toBeInTheDocument();
    // 'Edge AI' etc. also appear as filter-tab labels, so there are 2 of each (tab + row badge)
    expect(screen.getAllByText('Edge AI').length).toBe(2);
    expect(screen.getAllByText('Cloud AI').length).toBe(2);
    expect(screen.getAllByText('Human Review').length).toBe(2);
  });

  it('filters conversations by search text', async () => {
    renderWithProviders(<Conversations />, { route: '/user/conversations' });
    await screen.findByText('Explain Java inheritance');
    await userEvent.type(screen.getByPlaceholderText('Search conversations...'), 'salary');
    expect(screen.queryByText('Explain Java inheritance')).not.toBeInTheDocument();
    expect(screen.getByText('Confidential salary report')).toBeInTheDocument();
  });

  it('filters conversations by route tab', async () => {
    renderWithProviders(<Conversations />, { route: '/user/conversations' });
    await screen.findByText('Explain Java inheritance');
    await userEvent.click(screen.getByRole('button', { name: 'Human Review' }));
    expect(screen.queryByText('Explain Java inheritance')).not.toBeInTheDocument();
    expect(screen.getByText('Medication dosage question')).toBeInTheDocument();
  });

  it('deletes a conversation after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    (api.del as any).mockResolvedValue(undefined);
    renderWithProviders(<Conversations />, { route: '/user/conversations' });
    await screen.findByText('Explain Java inheritance');

    const row = screen.getByText('Explain Java inheritance').closest('tr')!;
    const deleteBtn = row.querySelectorAll('button')[0]; // the Link (view) renders as <a>, so the only <button> is delete
    await userEvent.click(deleteBtn);

    await waitFor(() => expect(api.del).toHaveBeenCalledWith('/conversations/1'));
    expect(screen.queryByText('Explain Java inheritance')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('does not delete when the confirmation dialog is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    renderWithProviders(<Conversations />, { route: '/user/conversations' });
    await screen.findByText('Explain Java inheritance');
    const row = screen.getByText('Explain Java inheritance').closest('tr')!;
    const deleteBtn = row.querySelectorAll('button')[0];
    await userEvent.click(deleteBtn);
    expect(api.del).not.toHaveBeenCalled();
    expect(screen.getByText('Explain Java inheritance')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('shows an empty state when there are no conversations', async () => {
    mockGets([]);
    renderWithProviders(<Conversations />, { route: '/user/conversations' });
    expect(await screen.findByText('No conversations found')).toBeInTheDocument();
  });
});
