import { useEffect, useState } from "react";
import "./Toast.css";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast = ({ messages, onDismiss }: ToastProps) => {
  return (
    <div className="toast-container">
      {messages.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const ToastItem = ({ toast, onDismiss }: ToastItemProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "●";
    }
  };

  return (
    <div
      className={`toast toast-${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">{getIcon(toast.type)}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onDismiss} aria-label="Close">
        ×
      </button>
    </div>
  );
};

/**
 * Hook for managing toast notifications
 */
export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = (message: string, type: ToastType = "info", duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    const toast: ToastMessage = { id, message, type, duration };

    setMessages((prev) => [...prev, toast]);

    // Auto-dismiss will be handled by ToastItem useEffect
    return id;
  };

  const dismiss = (id: string) => {
    setMessages((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message: string, duration?: number) =>
    show(message, "success", duration);
  const error = (message: string, duration?: number) =>
    show(message, "error", duration);
  const warning = (message: string, duration?: number) =>
    show(message, "warning", duration);
  const info = (message: string, duration?: number) =>
    show(message, "info", duration);

  return {
    messages,
    show,
    dismiss,
    success,
    error,
    warning,
    info,
  };
};

export default Toast;
