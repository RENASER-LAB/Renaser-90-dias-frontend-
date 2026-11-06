import { useSyncExternalStore } from 'react';

/**
 * Spec 045: lo que el recorrido comparte con el resto de la app, fuera de React (lo leen el Muro y Yo).
 *
 * - `esperandoPrimerPost`: la persona tocó «Escribir mi publicación» y todavía no publicó. El Muro muestra la ayuda del
 *   compositor y la pastilla «Tu primera publicación · Continuar».
 * - `composerAbierto`: el compositor del Muro está a la vista (lo marca `ComunidadScreen`): la pastilla no se dibuja encima.
 * - `pedidoDeRepetir`: Yo → Ajustes → «Ver el recorrido» pide verlo otra vez.
 */
type Estado = { esperandoPrimerPost: boolean; composerAbierto: boolean; pedidoDeRepetir: number };

let estado: Estado = { esperandoPrimerPost: false, composerAbierto: false, pedidoDeRepetir: 0 };
const oyentes = new Set<() => void>();

function publicar(cambio: Partial<Estado>) {
  estado = { ...estado, ...cambio };
  for (const oyente of [...oyentes]) oyente();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function estadoDelRecorrido(): Estado {
  return estado;
}

export function useEstadoDelRecorrido(): Estado {
  return useSyncExternalStore(suscribir, estadoDelRecorrido, estadoDelRecorrido);
}

export function marcarEsperandoPrimerPost(esperando: boolean): void {
  if (estado.esperandoPrimerPost !== esperando) publicar({ esperandoPrimerPost: esperando });
}

export function marcarComposerDelMuroAbierto(abierto: boolean): void {
  if (estado.composerAbierto !== abierto) publicar({ composerAbierto: abierto });
}

export function pedirVerElRecorrido(): void {
  publicar({ pedidoDeRepetir: estado.pedidoDeRepetir + 1 });
}

const oyentesDelFin = new Set<() => void>();

/** El recorrido terminó (y, si hubo primer post, ya se cerró la felicitación): la guía de SER sigue con el Pacto (D1). */
export function avisarRecorridoTerminado(): void {
  for (const oyente of [...oyentesDelFin]) oyente();
}

export function alTerminarElRecorrido(oyente: () => void): () => void {
  oyentesDelFin.add(oyente);
  return () => {
    oyentesDelFin.delete(oyente);
  };
}

/**
 * Spec 045, D9 («se reiniciaba»): el paso más adelantado que alcanzó cada cuenta en esta sesión. Al reabrirse el recorrido (la
 * sesión parpadea, el paso no llegó al servidor por la red) se sigue desde el más adelantado, nunca desde el principio.
 */
const alcanzados = new Map<string, number>();

export function pasoAlcanzado(usuarioId: string): number {
  return alcanzados.get(usuarioId) ?? 1;
}

export function anotarPasoAlcanzado(usuarioId: string, paso: number): void {
  alcanzados.set(usuarioId, Math.max(paso, alcanzados.get(usuarioId) ?? 1));
}

export function reiniciarRecorridoParaPruebas(): void {
  alcanzados.clear();
  oyentesDelFin.clear();
  estado = { esperandoPrimerPost: false, composerAbierto: false, pedidoDeRepetir: 0 };
  oyentes.clear();
}
