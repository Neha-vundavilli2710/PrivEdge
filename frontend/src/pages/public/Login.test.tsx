import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Login from './Login';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn(), upload: vi.fn() },
  getToken: () => null,
  setToken: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));

import { api, ApiError } from '../../api/client';

describe('Login', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('logs in successfully and navigates to the role-specific dashboard', async () => {
    (api.post as any).mockResolvedValue({
      access_token: 'tok123',
      user: { id: 1, name: 'Alice', email: 'alice@example.com', role: 'reviewer', is_active: true, created_at: '2026-01-01T00:00:00Z' },
    });
    renderWithProviders(<Login />, { route: '/login' });

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'alice@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'alice@example.com', password: 'Password123' }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/reviewer/dashboard'));
  });

  it('shows an error message when login fails', async () => {
    (api.post as any).mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    renderWithProviders(<Login />, { route: '/login' });

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'bad@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
