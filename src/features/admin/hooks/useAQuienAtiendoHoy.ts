import { useCallback, useEffect, useRef, useState } from 'react';

import {
  esNoDisponible,
  falloDeLectura,
  obtenerAtencionDelSemaforo,
  obtenerResumenPorGrupos,
  obtenerSemaforoDelGrupo,
} from '../../semaforo/api/semaforoApi';
import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import type { SemaforoDelGrupo } from '../../semaforo/types/semaforo.types';
import { aQuienAtenderHoy, gruposConAyuda, type PersonaParaAtender } from '../../semaforo/utils/ayudaDelSemaforo';

/** Cuántas tablas de grupo se piden a la vez: el servidor es chico y la lista no apura. */
const EN_PARALELO = 4;

/**
 * «¿A quién atiendo hoy?» (26/09, S-4): las personas en rojo o amarillo de TODOS los grupos, arriba
 * de Administración.
 *
 * **Desde el 26/09 (tarde) la lista sale de UNA lectura**, `GET /api/v1/admin/semaforo/atencion`
 * (contrato §4.6): parte del padrón, así que incluye la recepción, los grupos sin mentor y a quien no
 * está en ningún grupo — lo que el camino de abajo no podía ver. Los colores y las palabras del
 * semáforo no cambian (decisión del dueño): la fila se pinta igual.
 *
 * Si ese endpoint responde **404** (un APK nuevo contra un backend anterior), se cae al camino de
 * antes, grupo por grupo. Con 403 no se reintenta por otro lado: la cuenta no puede verlo y la sección
 * se oculta, igual que antes.
 *
 * El camino de antes: primero el resumen por grupos (`GET /api/v1/semaforo/groups`, sin nombres) y
 * después la tabla CON nombres (`GET /api/v1/admin/semaforo/groups/{g}`) **solo de los grupos que
 * tienen a alguien en rojo o amarillo**. Un grupo que va bien no cuesta una petición.
 *
 * Muestra lo que devuelve el servidor, sin filtrar por su cuenta: si el resumen incluye grupos sin
 * mentor o de bienvenida, aparecen; si no los incluye, no hay de dónde sacarlos (eso se corrige en el
 * backend, no acá).
 *
 * - Con 404 o 403 en el resumen (backend sin la ruta, o rol sin permiso): `oculta`, y la sección no
 *   se dibuja — Administración queda como estaba.
 * - Si falla la tabla de algún grupo, se muestra lo demás y se dice cuántos grupos no se pudieron
 *   leer: un fallo parcial no borra lo que sí se sabe (ARF-02).
 */
export function useAQuienAtiendoHoy(activo = true) {
  const [personas, setPersonas] = useState<PersonaParaAtender[]>([]);
  const [cargando, setCargando] = useState(activo);
  const [fallo, setFallo] = useState<FalloSemaforo | null>(null);
  const [gruposSinLeer, setGruposSinLeer] = useState(0);
  const [vuelta, setVuelta] = useState(0);
  const turno = useRef(0);

  useEffect(() => {
    if (!activo) {
      setCargando(false);
      return;
    }
    const miTurno = ++turno.current;
    setCargando(true);
    leerTodo()
      .then(resultado => {
        if (miTurno !== turno.current) return;
        setPersonas(resultado.personas);
        setGruposSinLeer(resultado.gruposSinLeer);
        setFallo(null);
      })
      .catch((e: unknown) => {
        if (miTurno !== turno.current) return;
        setPersonas([]);
        setGruposSinLeer(0);
        setFallo(falloDeLectura(e));
      })
      .finally(() => {
        if (miTurno === turno.current) setCargando(false);
      });
    return () => {
      turno.current++;
    };
  }, [activo, vuelta]);

  const recargar = useCallback(() => setVuelta(v => v + 1), []);
  const oculta = fallo === 'no_disponible' || fallo === 'sin_permiso';

  return { personas, cargando, fallo, oculta, gruposSinLeer, recargar };
}

export async function leerTodo(): Promise<{ personas: PersonaParaAtender[]; gruposSinLeer: number }> {
  try {
    return { personas: await obtenerAtencionDelSemaforo(), gruposSinLeer: 0 };
  } catch (e) {
    if (!esNoDisponible(e)) throw e;
  }
  return leerGrupoPorGrupo();
}

/** El camino de antes del endpoint §4.6: resumen por grupos + la tabla de cada grupo con ayuda. */
async function leerGrupoPorGrupo(): Promise<{ personas: PersonaParaAtender[]; gruposSinLeer: number }> {
  const resumen = await obtenerResumenPorGrupos();
  const aLeer = gruposConAyuda(resumen.grupos);
  const tablas: Array<{ grupoId: string; grupoNombre: string | null; aprendices: SemaforoDelGrupo['aprendices'] }> = [];
  let gruposSinLeer = 0;

  for (let i = 0; i < aLeer.length; i += EN_PARALELO) {
    const tanda = aLeer.slice(i, i + EN_PARALELO);
    const leidas = await Promise.allSettled(
      tanda.map(g => obtenerSemaforoDelGrupo({ quien: 'admin', grupoId: g.grupoId })),
    );
    leidas.forEach((r, j) => {
      if (r.status === 'fulfilled') {
        /* El nombre del resumen si la tabla no lo trae: el mismo grupo, dicho igual en las dos. */
        tablas.push({
          grupoId: tanda[j].grupoId,
          grupoNombre: r.value.grupoNombre ?? tanda[j].grupoNombre,
          aprendices: r.value.aprendices,
        });
      } else {
        gruposSinLeer++;
      }
    });
  }

  return { personas: aQuienAtenderHoy(tablas), gruposSinLeer };
}
