import type { EstadoMapaRenacimiento } from '../hooks/useMapaRenacimiento';
import type { TextosConLosDiasQueQuedan } from '../textosDeApertura';

/** Lo que recibe cada vista del flujo. `onSalir` cierra el mapa entero (V01 atrás, V11 terminar). */
export interface PropsPaso {
  estado: EstadoMapaRenacimiento;
  onSalir: () => void;
  /**
   * Los textos que dependen del día real del programa (el día de la apertura, «los próximos 75
   * días»…), armados UNA vez por el flujo con `useProgramaDia` (2026-10-05). Antes cada pantalla
   * tenía «83 días» escrito a mano; leer el día en cada una pediría `/home` en cada paso y el texto
   * saltaría de «lo que queda del programa» al número al terminar de cargar.
   */
  dias: TextosConLosDiasQueQuedan;
  /**
   * En qué número de paso se está mostrando esta pantalla.
   *
   * > **Agregado el 2026-09-23.** Las tres pantallas de objetivo traían su número cableado
   * > (`paso={3}`, `{4}`, `{5}`). Desde que el orden lo decide la prioridad del paso 2, ese número
   * > dejó de ser fijo: elegir Relaciones mostraba su pantalla rotulada **"Paso 5 de 10"**, como si
   * > el flujo se hubiera saltado dos pasos. El contenido estaba bien; el rótulo mentía.
   * >
   * > Sin valor, cada pantalla usa el suyo de siempre — las que no se reordenan no cambian nada.
   */
  numeroDePaso?: number;
}

export function idLocal(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
