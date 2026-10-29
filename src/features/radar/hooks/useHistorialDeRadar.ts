import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import { agruparPorDiaYHora } from '../../mentor/utils/agruparRegistrosRadar';
import type { HistorialRadarApi, MiRadarApi, RegistroRadarApi } from '../types/radar.types';

/**
 * El historial del Código Renaser de una persona, página por página: lo que escribió cada hora.
 *
 * **Sirve a cuatro lugares y no sabe de ninguno** (spec 012): Yo → Mi Radar (el propio, `/radar/history`), la ficha del
 * mentor, la del líder y la de Administración. Cada uno pasa SU manera de pedir una página (`cargar`); acá solo está
 * lo que no cambia: el cursor, no repetir un registro entre páginas y decir por qué no se pudo.
 *
 * Paginado por cursor, de lo más nuevo a lo más viejo: son hasta 12 registros por día durante meses, y traerlos todos
 * de una es una pantalla de varios miles de píxeles que nadie pidió.
 *
 * **Una lista vacía NO es un fallo.** Quien nunca registró (o aún no pasó el día 1) no tiene nada: la sección lo dice en
 * una línea y se termina.
 *
 * `cargar` tiene que ser estable (un `useCallback` por persona): al cambiar, se vuelve a leer desde la primera página.
 * `null` = no hay a quién preguntarle.
 */
export type CargarHistorialDeRadar = (cursor?: string | null) => Promise<HistorialRadarApi>;

/**
 * Por qué no se pudo leer: `no_disponible` (404: backend sin desplegar, o esa persona no se muestra), `sin_permiso`
 * (403: ya no la acompaña), `sin_red` o cualquier otra cosa.
 */
export type FalloDelHistorial = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

function clasificar(e: unknown): FalloDelHistorial {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'no_disponible';
    if (e.status === 403) return 'sin_permiso';
    if (e.status === 0) return 'sin_red';
  }
  return 'error';
}

export function useHistorialDeRadar(cargar: CargarHistorialDeRadar | null) {
  const [registros, setRegistros] = useState<RegistroRadarApi[]>([]);
  const [miRadar, setMiRadar] = useState<MiRadarApi | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(cargar !== null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [fallo, setFallo] = useState<FalloDelHistorial | null>(null);

  /* Una página en vuelo a la vez. Sin esto, dos toques seguidos en "Ver más" piden DOS veces el
     mismo cursor y la lista termina con cada registro repetido. */
  const enVuelo = useRef(false);
  /* Cada lectura desde la primera página es de UNA persona: si mientras llega cambió quién se mira, la respuesta
     vieja se descarta en vez de pisar a la nueva. */
  const generacion = useRef(0);

  /**
   * Lee la primera página. `silencioso` (volver a leer después de registrar) no vacía la lista ni muestra «Cargando»:
   * lo que ya se ve se queda, y si la lectura falla, también.
   */
  const leer = useCallback(
    async (silencioso: boolean) => {
      const esta = ++generacion.current;
      if (!cargar) {
        setRegistros([]);
        setMiRadar(null);
        setCursor(null);
        setFallo(null);
        setCargando(false);
        return;
      }
      if (!silencioso) {
        setCargando(true);
        setFallo(null);
      }
      try {
        const pagina = await cargar();
        if (esta !== generacion.current) return;
        setRegistros(pagina.entries);
        setMiRadar(pagina.miRadar ?? null);
        setCursor(pagina.nextCursor);
        setFallo(null);
      } catch (e) {
        if (esta !== generacion.current || silencioso) return;
        setRegistros([]);
        setMiRadar(null);
        setCursor(null);
        setFallo(clasificar(e));
      } finally {
        if (esta === generacion.current) setCargando(false);
      }
    },
    [cargar],
  );

  useEffect(() => {
    void leer(false);
  }, [leer]);

  /**
   * La página siguiente. Si no llega, lo que ya se leyó se queda en pantalla: descartarlo sería castigar por un problema
   * de red a quien ya tenía los registros.
   */
  const cargarMas = useCallback(async () => {
    if (!cargar || !cursor || enVuelo.current) return;
    enVuelo.current = true;
    const esta = generacion.current;
    setCargandoMas(true);
    try {
      const pagina = await cargar(cursor);
      if (esta !== generacion.current) return;
      /* Se filtra por id antes de concatenar. El cursor es un instante, y dos registros de la
         misma hora exacta pueden hacer que la página siguiente repita el último de la anterior. */
      setRegistros(previos => {
        const vistos = new Set(previos.map(r => r.id));
        return [...previos, ...pagina.entries.filter(r => !vistos.has(r.id))];
      });
      setCursor(pagina.nextCursor);
    } catch (e) {
      if (esta !== generacion.current) return;
      setFallo(clasificar(e));
      setCursor(null);
    } finally {
      enVuelo.current = false;
      setCargandoMas(false);
    }
  }, [cargar, cursor]);

  const dias = useMemo(() => agruparPorDiaYHora(registros), [registros]);
  /** Vuelve a leer la primera página. Por defecto en silencio; `false` (el «Reintentar» tras un fallo) muestra la carga. */
  const recargar = useCallback((silencioso = true) => leer(silencioso), [leer]);

  return { registros, dias, miRadar, hayMas: cursor !== null, cargando, cargandoMas, fallo, cargarMas, recargar };
}
