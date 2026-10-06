import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Chatbot from './Chatbot';

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

function mockBaseGets() {
  (api.get as any).mockImplementation((path: string) => {
    if (path === '/conversations') return Promise.resolve([]);
    if (path.startsWith('/notifications')) return Promise.resolve({ items: [], unread: 0 });
    return Promise.resolve([]);
  });
}

describe('Chatbot', () => {
  beforeEach(() => { vi.clearAllMocks(); mockBaseGets(); });

  it('sends a message and displays the Cloud AI response with its route badge', async () => {
    (api.post as any).mockResolvedValue({
      conversation_id: 1, message_id: 1, response: 'Inheritance lets one class acquire another\u2019s members.',
      route: 'cloud', status: 'completed', error: false,
      decision: { privacy: 'Low', sensitivity: 'Low', complexity: 'Low', risk: 'Low', latency: 'Low', humanReview: false, reason: 'Low risk, general question.' },
    });
    renderWithProviders(<Chatbot />, { route: '/user/chatbot' });

    const textarea = screen.getByPlaceholderText('Ask PrivEdge anything...');
    await userEvent.type(textarea, 'Explain inheritance in Java.{enter}');
    await waitFor(() => expect(api.post).toHaveBeenCalled());

    expect(await screen.findByText(/Inheritance lets one class/)).toBeInTheDocument();
    expect(screen.getAllByText('Cloud AI').length).toBeGreaterThan(0); // route badge appears in both the message header and the decision card
    expect(api.post).toHaveBeenCalledWith('/chat', { message: 'Explain inheritance in Java.', conversation_id: null });
  });

  it('routes a confidential query to Edge AI and shows the Edge badge', async () => {
    (api.post as any).mockResolvedValue({
      conversation_id: 2, message_id: 2, response: 'Processed locally.', route: 'edge', status: 'completed', error: false,
      decision: { privacy: 'High', sensitivity: 'High', complexity: 'Medium', risk: 'Low', latency: 'Low', humanReview: false, reason: 'High privacy.' },
    });
    renderWithProviders(<Chatbot />, { route: '/user/chatbot' });
    const textarea = screen.getByPlaceholderText('Ask PrivEdge anything...');
    await userEvent.type(textarea, 'Analyze this confidential employee salary report.{enter}');
    expect((await screen.findAllByText('Edge AI')).length).toBeGreaterThan(0);
  });

  it('shows the pending-review banner for a high-risk query sent to Human Review', async () => {
    (api.post as any).mockResolvedValue({
      conversation_id: 3, message_id: 3, response: 'Human review is required. Your request has been sent for review.',
      route: 'human', status: 'pending_review', error: false,
      decision: { privacy: 'Medium', sensitivity: 'High', complexity: 'Medium', risk: 'High', latency: 'Low', humanReview: true, reason: 'High risk.' },
    });
    renderWithProviders(<Chatbot />, { route: '/user/chatbot' });
    const textarea = screen.getByPlaceholderText('Ask PrivEdge anything...');
    await userEvent.type(textarea, 'Should this patient undergo this medical procedure?{enter}');
    expect(await screen.findByText(/sent for review/i)).toBeInTheDocument();
    expect(screen.getByText('Human Review Required')).toBeInTheDocument();
    expect(screen.getAllByText('Human Review').length).toBeGreaterThan(0); // RouteBadge + DecisionCard both label it
  });

  it('shows a friendly error bubble when the backend call fails', async () => {
    (api.post as any).mockRejectedValue(new Error('Cannot reach the PrivEdge server. Is the backend running?'));
    renderWithProviders(<Chatbot />, { route: '/user/chatbot' });
    const textarea = screen.getByPlaceholderText('Ask PrivEdge anything...');
    await userEvent.type(textarea, 'What is Python?{enter}');
    expect(await screen.findByText(/cannot reach the privedge server/i)).toBeInTheDocument();
  });

  it('does not send an empty message', async () => {
    renderWithProviders(<Chatbot />, { route: '/user/chatbot' });
    const textarea = screen.getByPlaceholderText('Ask PrivEdge anything...');
    await userEvent.type(textarea, '   {enter}');
    expect(api.post).not.toHaveBeenCalled();
  });
});
