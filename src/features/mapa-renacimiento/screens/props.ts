import type { EstadoMapaRenacimiento } from '../hooks/useMapaRenacimiento';

/** Lo que recibe cada vista del flujo. `onSalir` cierra el mapa entero (V01 atrás, V11 terminar). */
export interface PropsPaso {
  estado: EstadoMapaRenacimiento;
  onSalir: () => void;
}

export function idLocal(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
