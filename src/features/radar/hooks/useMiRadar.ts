import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerHistorial } from '../api/radarApi';
import { useRadar } from '../RadarContext';
import type { CheckInRadarApi, DiaDeMiRadarApi, MiRadarApi } from '../types/radar.types';
import { patronesDeMiRadar, resumenDeMiRadarHoy, validarDias, validarHoras } from '../utils/miRadar';
import { configDeMiRadar } from './useConfigDeMiRadar';
import { useHistorialDeRadar } from './useHistorialDeRadar';

/** El resultado de guardar: lo que el servidor dejó, o por qué no (ya dicho para la persona). */
export type ResultadoDeGuardar = { ok: true; config: MiRadarApi } | { ok: false; error: string };

/**
 * Todo lo que necesita la pantalla Yo → Mi Radar (spec 012), armado con piezas que ya existen:
 *
 *  - la configuración (encendido, horas de todos los días y de los días que tienen las suyas) es la de `RadarContext`, la
 *    misma que dispara los avisos del teléfono;
 *  - **«Hoy» usa las horas de HOY** (`horasDelDia`): un día con horas propias o sin Radar no usa las de todos los días;
 *  - el historial es el de siempre (`useHistorialDeRadar`, `GET /radar/history`);
 *  - registrar usa el MISMO envío del Código Renaser (`radar.enviar`): el mismo `POST /radar`, y el mismo 409 que se
 *    relee y se da por registrado. No hay una segunda lógica de envío.
 *
 * Todo lo que se decide (qué se muestra en «Hoy», qué patrones salen) está en `utils/miRadar.ts`, sin React.
 */
export function useMiRadar() {
  const { user } = useAuth();
  const radar = useRadar();
  const ahora = useMinutoActual();
  const historial = useHistorialDeRadar(obtenerHistorial);
  const { recargar: recargarConfig, guardar } = radar.miRadar;
  const { recargar: recargarHistorial } = historial;
  const config = configDeMiRadar(radar.miRadar.lectura);
  const [guardando, setGuardando] = useState(false);

  /* Al entrar, lo guardado se relee: pudo cambiarse desde otro teléfono o la web. */
  useEffect(() => {
    recargarConfig();
  }, [recargarConfig]);

  /* Lo de HOY (horas de hoy, si hay Mi Radar hoy, lo respondido, el horario y si la hora en curso pide un registro) sale
     de una sola cuenta, `resumenDeMiRadarHoy`, la misma que usa la mitad del Radar de Hoy. */
  const { hoyTieneRadar, hoy, yaRegistroEstaHora, dentroDelHorario, horaEnCursoPendiente } = useMemo(
    () => resumenDeMiRadarHoy(config, historial.registros, ahora),
    [config, historial.registros, ahora],
  );

  const patrones = useMemo(() => patronesDeMiRadar(historial.registros), [historial.registros]);

  /**
   * Enciende (con estas horas para todos los días y estos días con horas propias), cambia las horas o apaga. Valida igual
   * que el servidor antes de pedirle nada. Sin días propios el pedido es el de antes de la cuarta ronda (sin `dias`).
   */
  const guardarConfig = useCallback(
    async (
      encendido: boolean,
      elegidas: readonly number[],
      dias: readonly DiaDeMiRadarApi[] = [],
    ): Promise<ResultadoDeGuardar> => {
      let pedido: MiRadarApi = { encendido: false, horas: [] };
      if (encendido) {
        const revisadas = validarHoras(elegidas);
        if (!revisadas.ok) return { ok: false, error: revisadas.error };
        const revisados = validarDias(dias);
        if (!revisados.ok) return { ok: false, error: revisados.error };
        pedido = { encendido: true, horas: revisadas.horas, ...(revisados.dias.length > 0 ? { dias: revisados.dias } : {}) };
      }
      setGuardando(true);
      try {
        return { ok: true, config: await guardar(pedido) };
      } catch (e) {
        return { ok: false, error: mensajeDeError(e, 'No pudimos guardar tu Mi Radar. Intenta de nuevo.') };
      } finally {
        setGuardando(false);
      }
    },
    [guardar],
  );

  /** Registra con el envío de siempre y, si quedó, vuelve a leer el historial para que aparezca. */
  const registrar = useCallback(
    async (checkIn: CheckInRadarApi): Promise<boolean> => {
      const ok = await radar.enviar(checkIn);
      if (ok) await recargarHistorial();
      return ok;
    },
    [radar.enviar, recargarHistorial],
  );

  return {
    usuarioId: user?.id ?? null,
    ahora,
    config,
    guardando,
    guardarConfig,
    historial,
    hoy,
    patrones,
    hoyTieneRadar,
    yaRegistroEstaHora,
    dentroDelHorario,
    horaEnCursoPendiente,
    registrar,
    enviando: radar.enviando,
    errorAlRegistrar: radar.error,
    limpiarErrorAlRegistrar: radar.limpiarError,
  };
}
