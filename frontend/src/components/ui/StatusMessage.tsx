import { X } from 'lucide-react';
import { useEffect } from 'react';

interface StatusMessageProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function StatusMessage({
  message,
  type,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: StatusMessageProps) {
  useEffect(() => {
    if (autoClose && (type === 'success' || type === 'info') && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, type, onClose, autoCloseDelay]);

  const typeClasses = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-900 border-blue-200',
  };

  return (
    <div
      className={`p-4 rounded-lg border mb-4 flex items-center justify-between ${typeClasses[type]}`}
    >
      <p className="text-sm font-medium">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-current opacity-70 hover:opacity-100"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

