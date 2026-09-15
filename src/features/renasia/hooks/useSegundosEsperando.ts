import { useEffect, useRef, useState } from 'react';

/**
 * Cuántos segundos enteros lleva esperando el asistente. `0` cuando no hay nada en curso.
 *
 * Se mide contra `Date.now()` y no contando ticks: un temporizador de React no garantiza
 * dispararse cada 1000 ms exactos —y en segundo plano el sistema directamente lo frena—, así que
 * sumar ticks daría un número menor al tiempo real justo cuando más importa que sea honesto.
 *
 * El intervalo se arma solo mientras `activo` es `true`; al apagarse se limpia y el contador
 * vuelve a cero, listo para la pregunta siguiente.
 */
export function useSegundosEsperando(activo: boolean): number {
  const [segundos, setSegundos] = useState(0);
  const inicioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) {
      inicioRef.current = null;
      setSegundos(0);
      return;
    }
    inicioRef.current = Date.now();
    setSegundos(0);
    const id = setInterval(() => {
      const inicio = inicioRef.current;
      if (inicio === null) return;
      setSegundos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activo]);

  return segundos;
}
