import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { esDeRed, esNoDisponible, esProhibido, obtenerRadarDeAlumno } from '../api/mentorApi';
import { agruparPorDiaYHora } from '../utils/agruparRegistrosRadar';
import type { RegistroRadarApi } from '../../radar/types/radar.types';
import type { FalloCelula } from './useCelulaQueAcompano';

/**
 * El Código Renaser de un aprendiz: lo que escribió cada hora durante sus primeros siete días.
 *
 * Mismo manejo de fallos que `useSemanaDelAlumno` — `no_disponible` mientras el endpoint no esté
 * desplegado, `sin_permiso` si ya no acompaña a esa persona— y paginado por cursor, porque siete
 * días por doce slots son hasta 84 registros de texto y traerlos todos de una es una pantalla de
 * varios miles de píxeles que nadie pidió.
 *
 * **Una lista vacía NO es un fallo.** El Código Renaser se apaga el día 8 y no vuelve, así que a
 * un aprendiz que va por el día 40 le corresponde no tener registros nuevos. Si además no tiene
 * ninguno viejo, la sección lo dice en una línea y se termina.
 */
/** Los mismos cuatro motivos que el resto del módulo, para que la sección los diga igual. */
function clasificar(e: unknown): FalloCelula {
  return esNoDisponible(e) ? 'no_disponible'
    : esProhibido(e) ? 'sin_permiso'
    : esDeRed(e) ? 'sin_red'
    : 'error';
}

export function useCodigoRenaserDelAlumno(grupoId: string | null, alumnoId: string | null) {
  const [registros, setRegistros] = useState<RegistroRadarApi[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [fallo, setFallo] = useState<FalloCelula | null>(null);

  /* Una página en vuelo a la vez. Sin esto, dos toques seguidos en "Ver más" piden DOS veces el
     mismo cursor y la lista termina con cada registro repetido. */
  const enVuelo = useRef(false);

  const cargar = useCallback(async () => {
    if (!grupoId || !alumnoId) {
      setRegistros([]);
      setCursor(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    setFallo(null);
    try {
      const pagina = await obtenerRadarDeAlumno(grupoId, alumnoId);
      setRegistros(pagina.entries);
      setCursor(pagina.nextCursor);
    } catch (e) {
      setRegistros([]);
      setCursor(null);
      setFallo(clasificar(e));
    } finally {
      setCargando(false);
    }
  }, [grupoId, alumnoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * La página siguiente. Falla en silencio hacia el estado de fallo de la sección: si la segunda
   * página no llega, lo que ya se leyó se queda en pantalla — descartarlo sería castigar al
   * mentor por un problema de red con los registros que sí tenía.
   */
  const cargarMas = useCallback(async () => {
    if (!grupoId || !alumnoId || !cursor || enVuelo.current) return;
    enVuelo.current = true;
    setCargandoMas(true);
    try {
      const pagina = await obtenerRadarDeAlumno(grupoId, alumnoId, cursor);
      /* Se filtra por id antes de concatenar. El cursor es un instante, y dos registros de la
         misma hora exacta pueden hacer que la página siguiente repita el último de la anterior. */
      setRegistros(previos => {
        const vistos = new Set(previos.map(r => r.id));
        return [...previos, ...pagina.entries.filter(r => !vistos.has(r.id))];
      });
      setCursor(pagina.nextCursor);
    } catch (e) {
      setFallo(clasificar(e));
      setCursor(null);
    } finally {
      enVuelo.current = false;
      setCargandoMas(false);
    }
  }, [grupoId, alumnoId, cursor]);

  const dias = useMemo(() => agruparPorDiaYHora(registros), [registros]);

  return { dias, hayMas: cursor !== null, cargando, cargandoMas, fallo, cargarMas, recargar: cargar };
}
