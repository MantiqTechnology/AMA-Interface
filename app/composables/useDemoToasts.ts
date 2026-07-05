export interface DemoToast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export function useDemoToasts() {
  const toasts = useState<DemoToast[]>('ama-demo-toasts', () => []);

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function pushToast(toast: Omit<DemoToast, 'id'>) {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    toasts.value = [...toasts.value, { ...toast, id }];

    if (import.meta.client) {
      window.setTimeout(() => dismiss(id), 4200);
    }

    return id;
  }

  return {
    dismiss,
    pushToast,
    toasts
  };
}
