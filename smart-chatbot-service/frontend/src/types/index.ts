export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  confidence?: number;
  created_at: string;
}

export interface IntentInfo {
  intent: string;
  confidence: number;
  can_answer_with_kb: boolean;
  analysis: string;
}

export interface TicketInfo {
  ticket_id: string;
  ticket_number: string;
  status: string;
  title: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  user_identifier?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface MessageRequest {
  content: string;
  conversation_id?: string;
  user_identifier?: string;
  user_email?: string;
}

export interface MessageResponse {
  conversation_id: string;
  user_message: Message;
  assistant_message: Message;
  ticket_created: boolean;
  ticket_info?: TicketInfo;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  conversation_id?: string;
  assigned_agent_id?: string;
  user_identifier?: string;
  user_email?: string;
  intent_category?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  activity_type: string;
  description: string;
  actor?: string;
  created_at: string;
}

export interface TicketDetail extends Ticket {
  activities: TicketActivity[];
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketStatistics {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface Document {
  id: string;
  metadata: Record<string, any>;
  preview: string;
}
