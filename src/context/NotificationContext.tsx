import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface EscalationNotification {
  id: string;
  type: 'escalation' | 'ticket';
  violationId: string;
  violationAsset: string;
  violationRule: string;
  violationFramework: string;
  violationSeverity: string;
  violationBU: string;
  fromPersona: string;
  toPersona: string;
  comments: string;
  ticketId?: string;
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: EscalationNotification[];
  unreadCount: number;
  addEscalation: (n: Omit<EscalationNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addEscalation: () => {},
  markAllRead: () => {},
  markRead: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<EscalationNotification[]>([]);

  const addEscalation = (n: Omit<EscalationNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: EscalationNotification = {
      ...n,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addEscalation, markAllRead, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
