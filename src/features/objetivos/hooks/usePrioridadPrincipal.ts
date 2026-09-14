import { useEffect, useState } from 'react';

import { leerResumenDelMapa } from '../../mapa-renacimiento/api/respuestasDelMapa';
import { EJE_POR_AREA } from '../../mapa-renacimiento/tipos';
import type { EjeObjetivo } from '../types/objetivos.types';

/**
 * Cuál de los tres ejes es el principal: el que la persona eligió en el paso 2 del Mapa
 * ("¿Qué área manda en tus próximos 90 días?").
 *
 * **Qué pidió el cliente.** Los tres objetivos se llenan igual, pero el principal va PRIMERO en la
 * lista. No es un orden estético: es la decisión que la persona tomó antes de escribir nada, y
 * verla arriba cada vez que abre el Plan es el punto de haberla tomado.
 *
 * **Por qué puede venir `null`, y por qué eso no es un error.** Tres casos legítimos: todavía no
 * llegó al paso 2; hizo el Mapa antes del 2026-09-14, cuando la prioridad no salía del teléfono;
 * o la lectura falló por red. En los tres, quien llama muestra el orden por defecto — nunca un
 * mensaje de error, porque no tener prioridad no rompe nada.
 *
 * Es una sola lectura al montar y no se refresca sola: la prioridad cambia dentro del Mapa, que es
 * una pantalla completa, y al volver de ahí el Plan se recarga entero.
 */
export interface PrioridadYEscala {
  ejePrincipal: EjeObjetivo | null;
  /** La escala 1-10 de Relaciones. Viaja acá porque sale de la MISMA lectura que la prioridad. */
  relacionesBase: number | null;
  relacionesMeta: number | null;
  cargando: boolean;
}

export function usePrioridadPrincipal(): PrioridadYEscala {
  const [estado, setEstado] = useState<Omit<PrioridadYEscala, 'cargando'>>({
    ejePrincipal: null,
    relacionesBase: null,
    relacionesMeta: null,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    void leerResumenDelMapa().then(resumen => {
      if (!vigente) return;
      setEstado({
        ejePrincipal: resumen.prioridad ? EJE_POR_AREA[resumen.prioridad] : null,
        relacionesBase: resumen.relacionesBase,
        relacionesMeta: resumen.relacionesMeta,
      });
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return { ...estado, cargando };
}

/**
 * Los ejes con el principal adelante. Sin principal, el orden que venga — la lista original.
 *
 * Vive acá y no en la pantalla porque es la regla, no la presentación: el mismo orden lo van a
 * necesitar el resumen del mentor y cualquier otra vista que liste los tres objetivos.
 */
export function conPrincipalPrimero(
  ejes: readonly EjeObjetivo[],
  ejePrincipal: EjeObjetivo | null
): EjeObjetivo[] {
  if (!ejePrincipal || !ejes.includes(ejePrincipal)) return [...ejes];
  // Filtrar y anteponer, en vez de ordenar: el orden de los otros dos queda intacto sin depender
  // de que `sort` sea estable, y no hay comparador que revisar.
  return [ejePrincipal, ...ejes.filter(eje => eje !== ejePrincipal)];
}
