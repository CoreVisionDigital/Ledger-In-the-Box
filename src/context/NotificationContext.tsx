import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationItem } from '../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface NotificationContextType {
  notifications: NotificationItem[];
  notify: (type: NotificationItem['type'], title: string, message: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = useCallback((type: NotificationItem['type'], title: string, message: string = '') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif: NotificationItem = {
      id,
      type,
      title,
      message,
      timestamp: Date.now(),
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);

    setTimeout(() => {
      dismiss(id);
    }, 5000);
  }, [dismiss]);

  const success = useCallback((title: string, message: string = '') => notify('success', title, message), [notify]);
  const error = useCallback((title: string, message: string = '') => notify('error', title, message), [notify]);
  const warning = useCallback((title: string, message: string = '') => notify('warning', title, message), [notify]);
  const info = useCallback((title: string, message: string = '') => notify('info', title, message), [notify]);

  return (
    <NotificationContext.Provider value={{ notifications, notify, success, error, warning, info, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.map(item => {
          let bg = 'bg-white border-slate-200 text-slate-800';
          let Icon = Info;
          let iconColor = 'text-blue-500';

          if (item.type === 'success') {
            bg = 'bg-emerald-950/90 text-emerald-100 border-emerald-800 backdrop-blur';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (item.type === 'error') {
            bg = 'bg-rose-950/90 text-rose-100 border-rose-800 backdrop-blur';
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
          } else if (item.type === 'warning') {
            bg = 'bg-amber-950/90 text-amber-100 border-amber-800 backdrop-blur';
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          }

          return (
            <div
              key={item.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-start gap-3 transition-all transform translate-y-0 opacity-100 ${bg}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold leading-tight">{item.title}</h4>
                {item.message && <p className="text-xs opacity-90 mt-1 leading-relaxed break-words">{item.message}</p>}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
