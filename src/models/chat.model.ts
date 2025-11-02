export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  containsChart?: boolean;
  quickReplies?: string[];
}