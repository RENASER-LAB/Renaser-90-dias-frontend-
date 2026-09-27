import { useEffect, useRef } from 'react';

import { pedidosHastaAhora, rutasDesde } from '../services/http/medicionDePedidos';

/** Cuánto después del montaje se hace el segundo recuento, para ver lo que llegó tarde. */
const SEGUNDO_RECUENTO_MS = 5000;

/**
 * Medición de desarrollo: cuántos pedidos dispara una pantalla y cuánto tarda en tener datos.
 *
 * Escribe dos líneas en la consola de Metro, y solo con `__DEV__`:
 *   - cuando `listo` pasa a verdadero por primera vez: los milisegundos desde el montaje y los
 *     pedidos hechos hasta ese momento (el "tiempo al primer render con datos");
 *   - a los 5 s del montaje: todos los pedidos que salieron desde que se montó.
 *
 * Cuenta TODOS los pedidos de la app en esa ventana, no solo los de la pantalla: si Hoy está
 * refrescando al mismo tiempo, aparecen también. Por eso se listan las rutas.
 */
export function useMedicionDePantalla(pantalla: string, listo: boolean): void {
  const inicio = useRef<{ ms: number; pedidos: number } | null>(null);
  if (inicio.current === null) {
    inicio.current = { ms: Date.now(), pedidos: pedidosHastaAhora() };
  }
  const informado = useRef(false);

  useEffect(() => {
    if (!__DEV__) return;
    const marca = inicio.current!;
    const temporizador = setTimeout(() => {
      const rutas = rutasDesde(marca.pedidos);
      console.log(`[medición] ${pantalla}: ${rutas.length} pedidos en los primeros 5 s`, rutas);
    }, SEGUNDO_RECUENTO_MS);
    return () => clearTimeout(temporizador);
  }, [pantalla]);

  useEffect(() => {
    if (!__DEV__ || !listo || informado.current) return;
    informado.current = true;
    const marca = inicio.current!;
    const rutas = rutasDesde(marca.pedidos);
    console.log(
      `[medición] ${pantalla}: datos en pantalla a los ${Date.now() - marca.ms} ms, con ${rutas.length} pedidos`,
      rutas
    );
  }, [listo, pantalla]);
}
