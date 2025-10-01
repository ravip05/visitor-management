import { useState, useEffect } from "react";

/**
 * const debounced = useDebounce(value, 300);
 */

export default function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
