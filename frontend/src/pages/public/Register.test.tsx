import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Register from './Register';

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

import { api } from '../../api/client';

async function fillForm(name: string, email: string, password: string, confirm: string) {
  await userEvent.type(screen.getByPlaceholderText('Alex Johnson'), name);
  await userEvent.type(screen.getByPlaceholderText('you@example.com'), email);
  await userEvent.type(screen.getByPlaceholderText('At least 8 characters'), password);
  await userEvent.type(screen.getByPlaceholderText('Repeat your password'), confirm);
  await userEvent.click(screen.getByRole('checkbox')); // required "I agree to Terms" checkbox
}

describe('Register', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects a password shorter than 8 characters without calling the API', async () => {
    renderWithProviders(<Register />, { route: '/register' });
    await fillForm('Bob', 'bob@example.com', 'short', 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    renderWithProviders(<Register />, { route: '/register' });
    await fillForm('Bob', 'bob@example.com', 'Password123', 'Password124');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('registers successfully and navigates to the user dashboard', async () => {
    (api.post as any).mockResolvedValue({
      access_token: 'tok',
      user: { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user', is_active: true, created_at: '2026-01-01T00:00:00Z' },
    });
    renderWithProviders(<Register />, { route: '/register' });
    await fillForm('Bob', 'bob@example.com', 'Password123', 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/register', { name: 'Bob', email: 'bob@example.com', password: 'Password123' }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/user/dashboard'));
  });

  it('surfaces a duplicate-email error from the backend', async () => {
    (api.post as any).mockRejectedValue(new Error('An account with this email already exists'));
    renderWithProviders(<Register />, { route: '/register' });
    await fillForm('Bob', 'bob@example.com', 'Password123', 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });
});
