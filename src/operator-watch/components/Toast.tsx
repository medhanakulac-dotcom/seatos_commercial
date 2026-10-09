import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext<(message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => {
    setMessage(m);
    setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), 2200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div id="toast" className={on ? 'on' : ''} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
