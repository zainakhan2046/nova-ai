
export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  CODE = 'CODE',
  VOICE = 'VOICE'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  type?: 'text' | 'image' | 'code' | 'voice';
}

export interface ChatSession {
  id: string;
  title: string;
  mode: AppMode;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ImageRecord {
  id: string;
  prompt: string;
  url: string;
  createdAt: number;
}
