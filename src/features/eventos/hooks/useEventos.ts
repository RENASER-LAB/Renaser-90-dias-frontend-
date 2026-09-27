import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import * as eventosApi from '../api/eventosApi';
import {
  cancelarAlarmaDeEvento,
  programarAlarmaDeEvento,
  sincronizarAlarmasDeEventos,
  type ResultadoAlarma,
} from '../notificaciones/alarmasDeEventos';
import type { Asistencia, Ocurrencia } from '../types/eventos.types';
import { crearLecturaVigente, type LecturaVigente } from '../utils/lecturaVigente';

export type FalloDeEventos = 'sin_red' | 'no_disponible' | 'otro';

function falloDe(e: unknown): FalloDeEventos {
  if (e instanceof ApiError && e.status === 0) return 'sin_red';
  if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return 'no_disponible';
  return 'otro';
}

/**
 * Los eventos de los próximos 60 días (`DIAS_EN_LA_SECCION`; eran 30 hasta el rediseño del
 * 2026-09-26, cuando las tarjetas pasaron a mostrar el mes en curso y el siguiente) y el «Voy» /
 * «No voy» de esta persona. La ventana de sincronización de alarmas es la misma que la lectura.
 *
 * Cada lectura también pone al día las alarmas del teléfono (`sincronizarAlarmasDeEventos`): quita
 * la de un evento que se canceló o al que ya no va, y pone la que falte. Así «si el evento se cancela,
 * la alarma se quita» (E-7) no depende de que alguien toque nada: alcanza con abrir la sección.
 *
 * Se pide solo cuando `activo` (la sección Eventos está abierta): Comunidad abre con el Muro y no
 * paga esta lectura si nadie entra (V-3).
 *
 * **Relecturas (bug del e2e del 26/09).** Antes se leía una sola vez, al montar: un evento creado con
 * la app abierta no aparecía hasta cerrarla. Ahora la sección llama a `recargar` al ganar el foco, al
 * volver a la lista y al deslizar; `lecturaVigente` hace que esos disparos compartan un solo pedido y
 * que una respuesta vieja no pise una nueva. **Solo la primera lectura muestra «Buscando eventos…»**
 * (estilo V-2 de `useTraining`): después, lo que está en pantalla se queda hasta que llega lo nuevo, y
 * si la relectura falla se conserva la lista (con `fallo` puesto, para que la sección lo diga).
 */
export function useEventos(userId: string | null, activo: boolean) {
  const [ocurrencias, setOcurrencias] = useState<Ocurrencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [fallo, setFallo] = useState<FalloDeEventos | null>(null);
  const [yaLeido, setYaLeido] = useState(false);
  const hayDatos = useRef(false);
  const usuario = useRef(userId);
  usuario.current = userId;

  const lectura = useRef<LecturaVigente | null>(null);
  if (lectura.current === null) {
    lectura.current = crearLecturaVigente(
      async () => {
        const ahora = Date.now();
        return { ahora, lista: await eventosApi.listarProximos(ahora, eventosApi.DIAS_EN_LA_SECCION) };
      },
      resultado => {
        if (!resultado.ok) {
          setFallo(falloDe(resultado.error));
          return;
        }
        const { ahora, lista } = resultado.valor;
        hayDatos.current = true;
        setOcurrencias(lista);
        setFallo(null);
        setYaLeido(true);
        const id = usuario.current;
        if (id) {
          void sincronizarAlarmasDeEventos(id, lista, {
            desdeMs: ahora - 60 * 60 * 1000,
            hastaMs: ahora + eventosApi.DIAS_EN_LA_SECCION * 24 * 60 * 60 * 1000,
          }).catch(() => {});
        }
      },
    );
  }

  /**
   * Relee la lista. `forzar`: aunque haya una lectura en vuelo (después de guardar un evento).
   * `deslizando`: prende el indicador del pull-to-refresh mientras dura.
   */
  const recargar = useCallback(async (opciones: { forzar?: boolean; deslizando?: boolean } = {}) => {
    const lector = lectura.current as LecturaVigente;
    if (!hayDatos.current) setCargando(true);
    if (opciones.deslizando) setRefrescando(true);
    try {
      await lector.leer({ forzar: opciones.forzar });
    } finally {
      if (!lector.ocupada()) setCargando(false);
      if (opciones.deslizando) setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void recargar();
  }, [activo, recargar]);

  /**
   * «Voy» / «No voy». Optimista: se ve al toque y vuelve atrás si el servidor no lo acepta. La alarma
   * se toca DESPUÉS de que el servidor confirma: una alarma para un «Voy» que no se guardó sonaría
   * para algo a lo que la persona no quedó anotada.
   */
  const responder = useCallback(
    async (oc: Ocurrencia, respuesta: Exclude<Asistencia, null>): Promise<ResultadoAlarma | null> => {
      const esLaMisma = (x: Ocurrencia) =>
        x.evento.id === oc.evento.id && x.inicioOcurrencia === oc.inicioOcurrencia;
      const anterior = oc.asistencia;
      // Una lectura que salió antes de este cambio traería la asistencia vieja (y su sincronización
      // quitaría la alarma recién puesta): se descarta antes y después del PUT.
      lectura.current?.invalidar();
      setOcurrencias(prev => prev.map(x => (esLaMisma(x) ? { ...x, asistencia: respuesta } : x)));
      try {
        await eventosApi.responderAsistencia(oc.evento.id, oc.inicioOcurrencia, respuesta);
      } catch (e) {
        setOcurrencias(prev => prev.map(x => (esLaMisma(x) ? { ...x, asistencia: anterior } : x)));
        throw e;
      }
      lectura.current?.invalidar();
      if (!userId) return null;
      if (respuesta === 'GOING') return programarAlarmaDeEvento(userId, { ...oc, asistencia: 'GOING' });
      await cancelarAlarmaDeEvento(userId, oc.evento.id, oc.inicioOcurrencia);
      return null;
    },
    [userId],
  );

  /** Tras cancelar un evento: sale de la lista y se quita su alarma (de todas sus fechas si `todas`). */
  const quitarDeLaLista = useCallback(
    async (eventoId: string, inicioOcurrencia: string | null) => {
      lectura.current?.invalidar();
      setOcurrencias(prev =>
        prev.filter(x => x.evento.id !== eventoId || (inicioOcurrencia !== null && x.inicioOcurrencia !== inicioOcurrencia)),
      );
      if (userId) await cancelarAlarmaDeEvento(userId, eventoId, inicioOcurrencia ?? undefined);
    },
    [userId],
  );

  return { ocurrencias, cargando, refrescando, fallo, yaLeido, recargar, responder, quitarDeLaLista };
}
