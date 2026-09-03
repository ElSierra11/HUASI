import { useState, useEffect } from 'react';

/**
 * useDebounce — Retarda la actualización de un valor durante delay ms.
 *
 * Uso:
 *   const debouncedSearch = useDebounce(searchTerm, 350);
 *   useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
 *
 * @param {*}      value  Valor a debouncear
 * @param {number} delay  Milisegundos de espera (default 350)
 * @returns {*}           Valor debounceado
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
