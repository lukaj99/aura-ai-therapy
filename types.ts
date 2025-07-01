
export enum Role {
  USER = 'user',
  AI = 'ai',
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: string;
}

export enum SessionStatus {
  IDLE = 'idle',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
  ERROR = 'error',
}