import type { FaseDeVoz } from '../hooks/useConversacionPorVoz';

/** Etiqueta accesible (y título) del botón que cierra la conversación en vivo (E-458). */
export const ETIQUETA_TERMINAR = 'Terminar conversación';

/**
 * Lo que se lee debajo del orbe: la fase dicha con texto, para quien no ve la animación.
 *
 * > Corregido 2026-09-30 (E-458). Decía «Te escucho… toca de nuevo para terminar», y con la voz en
 * > vivo ese toque cerraba la conversación: cada pregunta abría una nueva y esperaba la conexión.
 * > Con la conversación en vivo abierta (`abierta`), tocar es «ya terminé»; para cerrarla está el
 * > botón «Terminar» junto al orbe (y mantenerlo presionado), así que el rótulo no lo repite.
 */
export function rotuloDelOrbe(fase: FaseDeVoz, disponible: boolean, abierta: boolean): string {
  if (!disponible) return 'Toca para escribirle';
  switch (fase) {
    case 'escuchando':
      return abierta ? 'Te escucho… toca cuando termines' : 'Te escucho… toca de nuevo para terminar';
    case 'pensando':
      return 'Pensando…';
    case 'hablando':
      return 'Toca para que se calle';
    default:
      return 'Toca y háblame';
  }
}

/** El botón «Terminar» se ve solo con la conversación en vivo abierta (hay con qué cerrarla). */
export function muestraTerminar(fase: FaseDeVoz, terminar: (() => void) | undefined): boolean {
  return terminar !== undefined && fase !== 'reposo';
}

/**
 * Si tocar el orbe ahora EMPIEZA a escuchar: en reposo y con voz. Es el toque que vibra
 * (`tacto.seleccion()`, rediseño de Hoy del 2026-10-05). Sin voz, tocar abre el chat escrito y no
 * vibra; con la conversación ya abierta, tocar es «ya terminé» o «cállate», que no vibran para que
 * la vibración diga una sola cosa: «te escucho».
 */
export function tocarEmpiezaAEscuchar(fase: FaseDeVoz, disponible: boolean): boolean {
  return disponible && fase === 'reposo';
}
