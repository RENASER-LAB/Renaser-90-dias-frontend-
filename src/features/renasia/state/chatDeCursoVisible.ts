import { useSyncExternalStore } from 'react';

/**
 * "Hay un chat de Sparkie acotado a un curso en pantalla ahora mismo" (D-101, D-102).
 *
 * El boton flotante global del ACOMPANANTE se monta por ENCIMA del navegador (`RenasiaLauncher`),
 * asi que no puede saber que `ComunidadScreen` tiene un curso abierto con el boton de Sparkie al
 * pie. El dueno lo vio duplicado: dos entradas en la misma pantalla, y dentro de un curso la que
 * corresponde es la del tutor. Este modulo es la senal entre los dos: `ChatDelCurso` la enciende
 * mientras esta montado, y el flotante se esconde mientras este encendida.
 *
 * Mismo criterio que `sparkie/events/avisoPrimerPost.ts`: un contador y un `Set` de oyentes en
 * vez de un contexto o una libreria — hay un solo emisor y un solo oyente.
 */

let montados = 0;
const oyentes = new Set<() => void>();

function avisar(): void {
  oyentes.forEach(o => o());
}

/** Lo llama `ChatDelCurso` al montarse; devuelve la funcion para desmontar. Soporta anidados. */
export function marcarChatDeCursoMontado(): () => void {
  montados += 1;
  avisar();
  return () => {
    montados = Math.max(0, montados - 1);
    avisar();
  };
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leer(): boolean {
  return montados > 0;
}

/** `true` mientras haya un chat de curso en pantalla. Lo usa el boton flotante para esconderse. */
export function useChatDeCursoVisible(): boolean {
  return useSyncExternalStore(suscribir, leer, leer);
}
