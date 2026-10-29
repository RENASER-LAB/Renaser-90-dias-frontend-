import { useEffect, useState } from 'react';

/**
 * La hora actual, refrescada cada `cadaMs` (la etiqueta «En curso · 20:14» y el estado de la ventana).
 *
 * `reiniciarCon` (opcional): cuando cambia, la hora se toma de nuevo en ese mismo render. Training lo usa con el día de hoy
 * que dice el servidor: a medianoche el lunes no puede armarse con las 23:59 del domingo hasta el siguiente refresco (spec 014).
 */
export function useAhora(cadaMs = 30_000, reiniciarCon?: unknown): number {
  const [tomada, setTomada] = useState(() => ({ ahora: Date.now(), clave: reiniciarCon }));
  // Se actualiza durante el render (React lo permite para estado propio): sin un cuadro con la hora vieja.
  if (tomada.clave !== reiniciarCon) setTomada({ ahora: Date.now(), clave: reiniciarCon });
  useEffect(() => {
    const reloj = setInterval(() => setTomada(anterior => ({ ...anterior, ahora: Date.now() })), cadaMs);
    return () => clearInterval(reloj);
  }, [cadaMs]);
  return tomada.ahora;
}
