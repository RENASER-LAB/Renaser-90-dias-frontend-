import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { obtenerResumenDeMiDiagnostico } from '../../diagnostico/api/diagnosticoApi';
import type { EjeObjetivo } from '../types/objetivos.types';

/**
 * Cuál de los tres ejes es el principal, y cuál es la primera acción que la persona se propuso: ambas salen de su
 * **diagnóstico** (spec 026; antes salían del paso 2 del Mapa de Renacimiento, que se retiró).
 *
 * **Qué pidió el cliente.** Los tres objetivos se llenan igual, pero el principal va PRIMERO en la lista. No es un orden
 * estético: es la decisión que la persona tomó antes de escribir nada, y verla arriba cada vez que abre el Plan es el punto de
 * haberla tomado. La primera acción se ofrece como sugerida al agendar (en el eje de esa prioridad).
 *
 * **Por qué puede venir `null`, y por qué eso no es un error.** Cuatro casos legítimos: la persona tiene la ficha estándar (sin
 * diagnóstico); todavía no lo terminó; el servidor es anterior a la spec 026 (404); o la lectura falló por red. En todos,
 * quien llama muestra el orden de siempre y ninguna sugerencia — nunca un mensaje de error, porque no tener prioridad no
 * rompe nada. Un fallo tampoco borra lo que ya se había leído.
 *
 * Se vuelve a leer cada vez que Plan recupera el foco: la prioridad puede nacer al terminar el diagnóstico desde Hoy o Yo
 * (Plan es una pestaña que no se desmonta).
 */
export interface PrioridadYPrimeraAccion {
  ejePrincipal: EjeObjetivo | null;
  /** «El lunes revisaré…»: lo que escribió en el diagnóstico. `null` si no hay. */
  primeraAccion: string | null;
  cargando: boolean;
}

export function usePrioridadPrincipal(): PrioridadYPrimeraAccion {
  const [estado, setEstado] = useState<Omit<PrioridadYPrimeraAccion, 'cargando'>>({ ejePrincipal: null, primeraAccion: null });
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      obtenerResumenDeMiDiagnostico()
        .then(resumen => {
          if (!vigente) return;
          setEstado({
            ejePrincipal: resumen.completado ? resumen.prioridad : null,
            primeraAccion: resumen.completado ? resumen.primeraAccion : null,
          });
        })
        .catch(() => {
          // Sin diagnóstico, sin la ruta (servidor anterior) o sin red: se queda lo último que se leyó, y el orden de siempre.
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
      return () => {
        vigente = false;
      };
    }, []),
  );

  return { ...estado, cargando };
}

/**
 * Los ejes con el principal adelante. Sin principal, el orden que venga — la lista original.
 *
 * Vive acá y no en la pantalla porque es la regla, no la presentación: el mismo orden lo van a
 * necesitar el resumen del mentor y cualquier otra vista que liste los tres objetivos.
 */
export function conPrincipalPrimero<T>(items: readonly T[], principal: T | null): T[] {
  if (!principal || !items.includes(principal)) return [...items];
  // Filtrar y anteponer, en vez de ordenar: el orden de los otros dos queda intacto sin depender
  // de que `sort` sea estable, y no hay comparador que revisar.
  return [principal, ...items.filter(item => item !== principal)];
}
