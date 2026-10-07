import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import AdminSettings from './AdminSettings';

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

const SETTINGS = {
  settings: {
    routing: { edgeEnabled: true, cloudEnabled: true, humanEnabled: true, autoRoute: true },
    security: { auditLog: true, sessionTimeout: true },
    ai: { ragEnabled: true, contextWindow: '4096', temperature: '0.7' },
    notifs: { highRisk: true, systemAlerts: true, reviewBacklog: true },
  },
  enforced: ['routing.edgeEnabled', 'routing.autoRoute', 'security.auditLog', 'security.sessionTimeout', 'ai.contextWindow'],
};

function rowToggle(labelText: string) {
  // label div -> title+desc wrapper div -> flex row div (which also contains the Toggle button)
  const label = screen.getByText(labelText);
  const row = label.parentElement!.parentElement!;
  return row.querySelector('button')!;
}

function mockGets() {
  (api.get as any).mockImplementation((path: string) => {
    if (path === '/admin/settings') return Promise.resolve(SETTINGS);
    if (path.startsWith('/notifications')) return Promise.resolve({ items: [], unread: 0 });
    return Promise.resolve([]);
  });
}

describe('AdminSettings', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGets(); });

  it('loads current settings from the backend', async () => {
    renderWithProviders(<AdminSettings />, { route: '/admin/settings' });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/settings'));
    expect(await screen.findByText('Automatic Routing')).toBeInTheDocument();
  });

  it('toggles Automatic Routing off and saves the change', async () => {
    (api.put as any).mockResolvedValue(SETTINGS);
    renderWithProviders(<AdminSettings />, { route: '/admin/settings' });
    await screen.findByText('Automatic Routing');

    await userEvent.click(rowToggle('Automatic Routing'));
    await userEvent.click(screen.getByRole('button', { name: /save all settings/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/settings', expect.objectContaining({
      routing: expect.objectContaining({ autoRoute: false }),
    })));
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
  });

  it('shows a save error from the backend', async () => {
    (api.put as any).mockRejectedValue(new Error('Could not save settings'));
    renderWithProviders(<AdminSettings />, { route: '/admin/settings' });
    await screen.findByText('Automatic Routing');
    await userEvent.click(screen.getByRole('button', { name: /save all settings/i }));
    expect(await screen.findByText('Could not save settings')).toBeInTheDocument();
  });
});
