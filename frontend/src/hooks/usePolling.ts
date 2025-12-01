import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  enabled?: boolean;
  interval?: number;
  onVisibilityChange?: boolean;
}

/**
 * Hook para executar uma função em intervalos regulares (polling)
 * Para automaticamente quando a aba fica inativa (se onVisibilityChange = true)
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions = {}
) {
  const {
    enabled = true,
    interval = 5000,
    onVisibilityChange = true,
  } = options;

  const savedCallback = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Atualizar callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Executar imediatamente
    savedCallback.current();

    // Configurar intervalo
    const tick = () => {
      savedCallback.current();
    };

    intervalRef.current = setInterval(tick, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval]);

  // Pausar quando aba fica inativa
  useEffect(() => {
    if (!enabled || !onVisibilityChange) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        // Retomar
        savedCallback.current();
        intervalRef.current = setInterval(() => {
          savedCallback.current();
        }, interval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, interval, onVisibilityChange]);
}
