import React, { createContext, useContext } from 'react';

import { plazoDelObjetivo, PLAZO_POR_DEFECTO } from '../utils/nombreDelObjetivo';

/**
 * El plazo del objetivo grande de la persona («90 días», «3 meses», «1 año»), para que las pantallas de Plan y de Hoy lo nombren sin pasarlo por
 * cada componente. Lo arma quien ya lee `/home` (`duracionDias` y `formacion`); sin proveedor —o sin dato— es el de siempre, «90 días».
 */
const Contexto = createContext<string>(PLAZO_POR_DEFECTO);

export function PlazoDelObjetivoProvider({
  duracionDias,
  formacion,
  children,
}: {
  duracionDias?: number | null;
  formacion?: string | null;
  children: React.ReactNode;
}) {
  return <Contexto.Provider value={plazoDelObjetivo(duracionDias, formacion)}>{children}</Contexto.Provider>;
}

/** «90 días», «3 meses» o «1 año»: el plazo con el que se nombra el objetivo de ESTA persona. */
export function usePlazoDelObjetivo(): string {
  return useContext(Contexto);
}
