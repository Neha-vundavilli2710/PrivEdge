import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '../../contexts/AppContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import ReviewQuery from './ReviewQuery';

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

const DETAIL = {
  id: 7, code: 'REV-007', query: 'Should this patient undergo this medical procedure?', status: 'Pending',
  risk: 'High', sensitivity: 'Medium', created_at: '2026-01-01T00:00:00Z',
  query_full: 'Should this patient undergo this medical procedure?', user_ref: 'USR-00042',
  ai_draft: 'Based on general guidance, consult a licensed physician before proceeding.', has_draft: true,
  comment: '', reviewer_id: null,
  analysis: { privacy: 'Medium', sensitivity: 'Medium', complexity: 'Medium', risk: 'High', latency: 'Low', route: 'Human Review', domain: 'medical', reason: 'High risk medical decision.', scores: {} },
};

function renderPage(id = '7', detail: typeof DETAIL = DETAIL) {
  (api.get as any).mockImplementation((path: string) => {
    if (path.startsWith('/notifications')) return Promise.resolve({ items: [], unread: 0 });
    if (path === `/review/${id}`) return Promise.resolve(detail);
    return Promise.resolve([]);
  });
  (api.post as any).mockImplementation((path: string) => {
    if (path.endsWith('/claim')) return Promise.resolve(DETAIL);
    return Promise.resolve({ ...DETAIL, status: 'Approved' });
  });
  return render(
    <MemoryRouter initialEntries={[`/reviewer/review/${id}`]}>
      <ThemeProvider>
        <AppProvider>
          <Routes><Route path="/reviewer/review/:id" element={<ReviewQuery />} /></Routes>
        </AppProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('ReviewQuery', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('loads and displays the query, analysis, and AI draft, and claims the review', async () => {
    renderPage();
    expect(await screen.findByText(DETAIL.query_full)).toBeInTheDocument();
    expect(screen.getByText(DETAIL.ai_draft)).toBeInTheDocument();
    expect(screen.getByText('USR-00042', { exact: false })).toBeInTheDocument();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/review/7/claim'));
  });

  it('approves the AI draft', async () => {
    renderPage();
    await screen.findByText(DETAIL.query_full);
    await userEvent.click(screen.getByRole('button', { name: /approve response/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/review/7', { action: 'approve', comment: '', final_response: undefined }));
    expect(await screen.findByText(/response approved/i)).toBeInTheDocument();
  });

  it('rejects the query with an optional comment', async () => {
    renderPage();
    await screen.findByText(DETAIL.query_full);
    await userEvent.type(screen.getByPlaceholderText(/add a note or justification/i), 'Needs a licensed physician.');
    await userEvent.click(screen.getByRole('button', { name: /reject query/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/review/7', { action: 'reject', comment: 'Needs a licensed physician.', final_response: undefined }));
    expect(await screen.findByText(/query rejected/i)).toBeInTheDocument();
  });

  it('modifies the response with edited text', async () => {
    renderPage();
    await screen.findByText(DETAIL.query_full);
    await userEvent.click(screen.getByRole('button', { name: /modify response/i }));

    const textarea = await screen.findByDisplayValue(DETAIL.ai_draft);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Please consult your treating physician directly.');
    await userEvent.click(screen.getByRole('button', { name: /save & send response/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/review/7', { action: 'modify', comment: '', final_response: 'Please consult your treating physician directly.' }));
    expect(await screen.findByText(/response modified/i)).toBeInTheDocument();
  });

  it('disables Approve when there is no AI draft', async () => {
    renderPage('7', { ...DETAIL, has_draft: false, ai_draft: '' });
    await screen.findByText(DETAIL.query_full);
    expect(screen.getByRole('button', { name: /approve response/i })).toBeDisabled();
  });

  it('shows an error if submitting the review fails', async () => {
    renderPage();
    await screen.findByText(DETAIL.query_full);
    (api.post as any).mockImplementation((path: string) => path.endsWith('/claim') ? Promise.resolve(DETAIL) : Promise.reject(new Error('Review already completed')));
    await userEvent.click(screen.getByRole('button', { name: /approve response/i }));
    expect(await screen.findByText('Review already completed')).toBeInTheDocument();
  });
});
