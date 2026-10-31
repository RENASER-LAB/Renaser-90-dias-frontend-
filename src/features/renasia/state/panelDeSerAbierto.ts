import { useEffect, useSyncExternalStore } from 'react';

/**
 * "El panel de SER (el chat a pantalla completa) está abierto ahora mismo" (issue #50).
 *
 * El panel es un `Modal`. La guía de arranque (`SparkieOverlay`, la burbuja «✳ SER») es otro `Modal`
 * montado aparte, por encima del navegador. En Android cada `Modal` es una ventana propia y la que se
 * crea después queda encima: si la guía se abría con el panel ya a la vista —porque sus tres lecturas
 * al servidor terminaron tarde, o porque su estado cambió al volver de la cámara— se montaba SOBRE el
 * chat, y su «Ahora no» no respondía. Con esta señal la guía espera: mientras el panel esté abierto no
 * se presenta, y aparece (si todavía corresponde) cuando el panel se cierra.
 *
 * Es un contador y no un booleano porque el panel se monta en tres sitios (botón flotante, orbe de
 * Hoy y botón del curso) y un desmontaje fuera de orden no debe pisar al otro. Mismo criterio que
 * `chatEnPantalla.ts`.
 */

let abiertos = 0;
const oyentes = new Set<() => void>();

function avisar(): void {
  oyentes.forEach(oyente => oyente());
}

/**
 * Anota un panel abierto; devuelve la función que lo quita. La que se llama dos veces no resta dos:
 * cada marca vale una sola vez.
 */
export function marcarPanelDeSerAbierto(): () => void {
  abiertos += 1;
  avisar();
  let quitada = false;
  return () => {
    if (quitada) return;
    quitada = true;
    abiertos = Math.max(0, abiertos - 1);
    avisar();
  };
}

export function hayPanelDeSerAbierto(): boolean {
  return abiertos > 0;
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** `true` mientras algún panel de SER esté abierto. Lo usa la guía de arranque para no abrirse encima. */
export function useHayPanelDeSerAbierto(): boolean {
  return useSyncExternalStore(suscribir, hayPanelDeSerAbierto, hayPanelDeSerAbierto);
}

/** El panel se anota mientras `abierto` sea `true` y se quita al cerrarse o desmontarse. */
export function useMarcarPanelDeSerAbierto(abierto: boolean): void {
  useEffect(() => {
    if (!abierto) return;
    return marcarPanelDeSerAbierto();
  }, [abierto]);
}

/** Solo para las pruebas. */
export function olvidarPanelesDeSer(): void {
  abiertos = 0;
  oyentes.clear();
}
