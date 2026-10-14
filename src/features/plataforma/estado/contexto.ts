import { createContext, useContext, useSyncExternalStore } from 'react';

import type { AlmacenDeFuncionalidades, EstadoDeFuncionalidades } from './almacenDeFuncionalidades';

/*
 * El contexto y los hooks de lectura de los interruptores (spec 002), aparte del proveedor: así una pantalla que solo
 * pregunta «¿está prendida?» no arrastra la sesión, la red ni el almacenamiento del teléfono (los trae el proveedor,
 * que vive en `App.tsx`).
 */

/**
 * Sin proveedor (una pantalla probada sola, un componente fuera del árbol) no hay almacén y todo está prendido: es lo
 * mismo que pasa sin datos, y el servidor igual bloquea.
 */
export const ContextoDeFuncionalidades = createContext<AlmacenDeFuncionalidades | null>(null);

const SIN_ALMACEN: EstadoDeFuncionalidades = Object.freeze({
  cuenta: null,
  version: null,
  etag: null,
  apagadas: Object.freeze({}),
  origen: 'nada',
});
const sinSuscripcion = () => () => undefined;
const estadoSinAlmacen = () => SIN_ALMACEN;
const nuncaReleyendo = () => false;

/** El estado entero (para el hook de cada funcionalidad). Se vuelve a dibujar solo cuando cambia. */
export function useEstadoDeFuncionalidades(): EstadoDeFuncionalidades {
  const almacen = useContext(ContextoDeFuncionalidades);
  const estado = almacen ? almacen.estado : estadoSinAlmacen;
  return useSyncExternalStore(almacen ? almacen.suscribir : sinSuscripcion, estado, estado);
}

/** Volver a leer ahora (el «Reintentar» del aviso). Sin proveedor no hace nada. */
export function useReleerFuncionalidades(): () => Promise<void> {
  const almacen = useContext(ContextoDeFuncionalidades);
  return almacen ? almacen.releer : sinRelectura;
}
const sinRelectura = () => Promise.resolve();

/** ¿Hay una lectura en vuelo? (el «Revisando…» del aviso). */
export function useReleyendoFuncionalidades(): boolean {
  const almacen = useContext(ContextoDeFuncionalidades);
  const releyendo = almacen ? almacen.releyendo : nuncaReleyendo;
  return useSyncExternalStore(almacen ? almacen.suscribir : sinSuscripcion, releyendo, releyendo);
}
