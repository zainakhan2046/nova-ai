
import { ChatSession, ImageRecord, AppMode } from '../types';

const STORAGE_KEY = 'nova_ai_sessions';
const IMAGES_KEY = 'nova_ai_images';

export const storageService = {
  getSessions: (): ChatSession[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSessions: (sessions: ChatSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  },

  createSession: (mode: AppMode, title: string = 'New Chat'): ChatSession => {
    const sessions = storageService.getSessions();
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title,
      mode,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    storageService.saveSessions([newSession, ...sessions]);
    return newSession;
  },

  deleteSession: (id: string) => {
    const sessions = storageService.getSessions();
    storageService.saveSessions(sessions.filter(s => s.id !== id));
  },

  updateSession: (updatedSession: ChatSession) => {
    const sessions = storageService.getSessions();
    const index = sessions.findIndex(s => s.id === updatedSession.id);
    if (index !== -1) {
      sessions[index] = { ...updatedSession, updatedAt: Date.now() };
      storageService.saveSessions([...sessions]);
    }
  },

  getImages: (): ImageRecord[] => {
    const data = localStorage.getItem(IMAGES_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveImage: (prompt: string, url: string) => {
    const images = storageService.getImages();
    const newImage: ImageRecord = {
      id: crypto.randomUUID(),
      prompt,
      url,
      createdAt: Date.now()
    };
    localStorage.setItem(IMAGES_KEY, JSON.stringify([newImage, ...images]));
    return newImage;
  }
};
