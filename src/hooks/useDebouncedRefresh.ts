import { useRef, useCallback } from 'react';

/**
 * Hook to debounce refresh operations and prevent rapid repeated calls
 * @param callback - The async function to debounce
 * @param delay - Delay in milliseconds (default: 1000ms)
 * @returns Debounced callback function
 */
export const useDebouncedRefresh = (
  callback: () => Promise<void>,
  delay: number = 1000
): (() => Promise<void>) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isPendingRef = useRef(false);

  return useCallback(async () => {
    // Ignore if already pending
    if (isPendingRef.current) {
      return;
    }

    isPendingRef.current = true;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Execute callback immediately
    try {
      await callback();
    } finally {
      // Set timeout to reset pending flag
      timeoutRef.current = setTimeout(() => {
        isPendingRef.current = false;
      }, delay);
    }
  }, [callback, delay]);
};
