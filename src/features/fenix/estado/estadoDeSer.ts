import { useSyncExternalStore } from 'react';

import type { EstadoDeSer } from '../utils/conversacionDeSer';

/**
 * En qué está la conversación con SER ahora (lo publica `RenasiaPanel`). Lo leen los dos fénix de SER: el del
 * encabezado del panel y el del botón flotante, para que al cerrar el panel el botón no siga «pensando» si la respuesta
 * ya llegó. Un solo panel de SER a la vez (el del botón o el del curso), así que alcanza con un valor.
 */
let estado: EstadoDeSer = 'reposo';
const avisos = new Set<() => void>();

export function publicarEstadoDeSer(nuevo: EstadoDeSer): void {
  if (nuevo === estado) return;
  estado = nuevo;
  for (const aviso of [...avisos]) aviso();
}

function suscribir(aviso: () => void): () => void {
  avisos.add(aviso);
  return () => {
    avisos.delete(aviso);
  };
}

const leer = () => estado;

export function useEstadoDeSer(): EstadoDeSer {
  return useSyncExternalStore(suscribir, leer, leer);
}
