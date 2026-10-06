import { useEffect, useState } from 'react';

/** La hora actual, refrescada cada `cadaMs` (la etiqueta «En curso · 20:14» y el estado de la ventana). */
export function useAhora(cadaMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(reloj);
  }, [cadaMs]);
  return ahora;
}
