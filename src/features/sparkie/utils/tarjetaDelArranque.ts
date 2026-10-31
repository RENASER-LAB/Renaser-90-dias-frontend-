import type { PasoArranque } from '../hooks/useArranqueGuiado';

/**
 * Cuándo la guía de arranque (`SparkieOverlay`) se presenta, se vuelve a abrir o se esconde.
 * Todo puro, para probarlo sin pantalla (issue #50).
 */

/** Los dos pasos en que la guía tiene algo que decir. `CARGANDO` y `NINGUNO` no son pasos: son «no sé» y «nada». */
export type PasoAccionable = Extract<PasoArranque['paso'], 'PUBLICAR_PRIMER_POST' | 'FIRMAR_PACTO'>;

export function esPasoAccionable(paso: PasoArranque['paso']): paso is PasoAccionable {
  return paso === 'PUBLICAR_PRIMER_POST' || paso === 'FIRMAR_PACTO';
}

/**
 * ¿Hay que volver a abrir una guía que la persona minimizó?
 *
 * Solo cuando el arranque AVANZÓ de verdad a otro paso («publica tu primer post» → «firma el Pacto»):
 * minimizar el primero no puede dejar escondido el segundo. Pasar por `CARGANDO` o `NINGUNO` no es
 * avanzar: `useArranqueGuiado` cae en `NINGUNO` ante cualquier fallo de red y vuelve al mismo paso en la
 * lectura siguiente (al volver de la cámara o de segundo plano es lo más común). Si eso reabriera la
 * guía, saltaría sola, encima de lo que la persona estuviera haciendo, justo después de que dijo «Ahora no».
 *
 * @param ultimoPaso el último paso accionable que se vio, o `null` si todavía no se vio ninguno.
 */
export function reabreLaGuia(ultimoPaso: PasoAccionable | null, paso: PasoArranque['paso']): boolean {
  return esPasoAccionable(paso) && ultimoPaso !== null && ultimoPaso !== paso;
}

type EntradaDeLaTarjeta = {
  habilitado: boolean;
  minimizado: boolean;
  pactoAbierto: boolean;
  paso: PasoArranque['paso'];
};

/** La tarjeta le toca a la persona: hay un paso que contar y no la minimizó ni está firmando el Pacto. */
export function tarjetaPendiente({ habilitado, minimizado, pactoAbierto, paso }: EntradaDeLaTarjeta): boolean {
  return habilitado && !pactoAbierto && !minimizado && esPasoAccionable(paso);
}

/**
 * La tarjeta se dibuja: le toca y no hay un panel de SER a la vista. Un `Modal` creado con el chat ya
 * abierto queda encima de él (y en Android no recibía los toques): espera a que el chat se cierre.
 */
export function tarjetaVisible(entrada: EntradaDeLaTarjeta & { panelDeSerAbierto: boolean }): boolean {
  return tarjetaPendiente(entrada) && !entrada.panelDeSerAbierto;
}
