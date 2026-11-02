import React, { createContext, useContext } from 'react';

import type { VistaDeKilometros } from '../utils/vistaDeKilometros';

/**
 * Lo que la lista de hoy de Training necesita de los pasos (spec 037): la vista del hábito de kilómetros y qué hacer al tocar
 * lo que ofrece. Va por contexto para que `ListaDeHoy` y `FilaDelDia` no estrenen props que solo usa una fila.
 *
 * Solo la lista de HOY lo monta: un día anterior o uno que viene no lo tiene, y ahí la fila nunca ofrece registrar nada.
 */
export interface PasosDeLaLista {
  /** El id del registro de «Kilómetros diarios» de hoy: la fila de ese registro es la única que usa esto. */
  registroId: string;
  vista: VistaDeKilometros;
  registrando: boolean;
  /** «Cuenta tus pasos solo ›»: abre la hoja para conectar (o la que explica que se sube la captura). */
  onConectar: () => void;
  onActualizar: () => void;
  onRegistrar: () => void;
}

const Contexto = createContext<PasosDeLaLista | null>(null);

export const ProveedorDePasosDeLaLista = Contexto.Provider;

/** Los pasos de esta fila, o `null` si no es el hábito de kilómetros de hoy (o no hay pasos que ofrecer). */
export function usePasosDeLaFila(item: { clave: string; tipo: string; habit?: { id: string; systemKey?: string | null } | null }): PasosDeLaLista | null {
  const pasos = useContext(Contexto);
  if (!pasos || item.tipo !== 'habito' || item.habit?.id !== pasos.registroId) return null;
  return pasos;
}
