import client from './client';

export interface SupportTicket {
  _id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  category: 'payment' | 'booking' | 'technical' | 'account' | 'other';
  messages: TicketMessage[];
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  _id: string;
  sender: string;
  senderRole: 'customer' | 'professional' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: string;
  priority?: string;
  attachments?: string[];
}

export const supportTicketApi = {
  createTicket: async (input: CreateTicketInput) => {
    const { data } = await client.post('/support-tickets', input);
    return data.data || data;
  },

  getMyTickets: async () => {
    const { data } = await client.get('/support-tickets/my-tickets');
    return data.data || data;
  },

  getTicketById: async (ticketId: string) => {
    const { data } = await client.get(`/support-tickets/${ticketId}`);
    return data.data || data;
  },

  addMessage: async (ticketId: string, message: string, attachments?: string[]) => {
    const { data } = await client.post(`/support-tickets/${ticketId}/messages`, {
      message,
      attachments,
    });
    return data.data || data;
  },

  getStats: async () => {
    const { data } = await client.get('/support-tickets/stats');
    return data.data || data;
  },
};
