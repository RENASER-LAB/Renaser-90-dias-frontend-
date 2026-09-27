import { useCallback, useEffect, useRef, useState } from 'react';

import * as eventosApi from '../api/eventosApi';
import type { Asistencia, Ocurrencia } from '../types/eventos.types';
import { rangoDelPedido, type Mes } from '../utils/calendarioDelMes';
import { crearLecturaVigente, type LecturaVigente } from '../utils/lecturaVigente';

/**
 * Los eventos del mes que muestra el calendario (`GET /api/v1/calendar/events?from&to` con el rango
 * de la grilla visible, `rangoDelPedido`).
 *
 * Es una lectura aparte de `useEventos` (los próximos días, que además pone al día las alarmas): el
 * calendario también muestra días que ya pasaron y meses lejanos, y **no** toca alarmas —las alarmas
 * siguen dependiendo de una sola lectura, la de siempre—.
 *
 * Cambiar de mes pide con `forzar`: la respuesta del mes anterior, si llega tarde, se descarta
 * (`lecturaVigente`) y no pinta días de otro mes. Mientras llega el mes nuevo se muestra la grilla
 * vacía con «Buscando eventos…», no los puntos del mes anterior.
 */
export function useEventosDelMes(mes: Mes, zona: string, activo: boolean) {
  const [ocurrencias, setOcurrencias] = useState<Ocurrencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const mesPedido = useRef(mes);
  mesPedido.current = mes;
  const estaActivo = useRef(activo);
  estaActivo.current = activo;

  const lectura = useRef<LecturaVigente | null>(null);
  if (lectura.current === null) {
    lectura.current = crearLecturaVigente(
      () => {
        const { desde, hasta } = rangoDelPedido(mesPedido.current, zona);
        return eventosApi.listarEventos(desde, hasta);
      },
      resultado => {
        if (!resultado.ok) {
          setFallo(true);
          return;
        }
        setOcurrencias(resultado.valor);
        setFallo(false);
      },
    );
  }

  /** Relee el mes visible. Con el calendario oculto (vista «Tarjetas») no pide nada. */
  const recargar = useCallback(async (opciones: { forzar?: boolean } = {}) => {
    if (!estaActivo.current) return;
    const lector = lectura.current as LecturaVigente;
    setCargando(true);
    try {
      await lector.leer(opciones);
    } finally {
      if (!lector.ocupada()) setCargando(false);
    }
  }, []);

  const claveDelMes = `${mes.anio}-${mes.mes}`;
  useEffect(() => {
    if (!activo) return;
    setOcurrencias([]);
    void recargar({ forzar: true });
  }, [activo, claveDelMes, recargar]);

  /** Refleja al toque un «Voy» / «No voy» dado en el detalle, sin esperar a releer. */
  const marcarAsistencia = useCallback((eventoId: string, inicioOcurrencia: string, asistencia: Asistencia) => {
    lectura.current?.invalidar();
    setOcurrencias(prev =>
      prev.map(x => (x.evento.id === eventoId && x.inicioOcurrencia === inicioOcurrencia ? { ...x, asistencia } : x)),
    );
  }, []);

  return { ocurrencias, cargando, fallo, recargar, marcarAsistencia };
}
