import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerHistorial } from '../api/radarApi';
import { useRadar } from '../RadarContext';
import type { CambioDeDiaApi, CheckInRadarApi, MiRadarApi } from '../types/radar.types';
import { resumenDeMiRadarHoy } from '../utils/miRadar';
import { configDeMiRadar } from './useConfigDeMiRadar';
import { useHistorialDeRadar } from './useHistorialDeRadar';

/** El resultado de guardar: lo que el servidor dejó, o por qué no (ya dicho para la persona). */
export type ResultadoDeGuardar = { ok: true; config: MiRadarApi } | { ok: false; error: string };

/**
 * Todo lo que necesita la pantalla Yo → Mi Radar (spec 012), armado con piezas que ya existen:
 *
 *  - la configuración (encendido y los siete días con las horas que el servidor calculó con el Despertar y el Dormir) es la de
 *    `RadarContext`, la misma que dispara los avisos del teléfono;
 *  - **«Hoy» usa las horas de HOY** (`horasDelDia`): un día sin horario o sin Radar no tiene ninguna;
 *  - lo respondido hoy sale del historial de siempre (`useHistorialDeRadar`, `GET /radar/history`): la pantalla solo dice cuántas de las de
 *    hoy ya tienen su respuesta (`respondidasHoy`), no las respuestas;
 *  - registrar usa el MISMO envío del Código Renaser (`radar.enviar`): el mismo `POST /radar`, y el mismo 409 que se
 *    relee y se da por registrado. No hay una segunda lógica de envío.
 *
 * Todo lo que se decide (qué se muestra de hoy) está en `utils/miRadar.ts`, sin React.
 */
export function useMiRadar() {
  const { user } = useAuth();
  const radar = useRadar();
  const ahora = useMinutoActual();
  const { recargar: recargarConfig, reiniciar: reiniciarConfig, guardar, lectura } = radar.miRadar;
  const config = configDeMiRadar(lectura);
  /* El historial solo se lee con Mi Radar a la vista: sin programa, bloqueada o con un fallo no hay nada que contar y pedirlo daría otro 403. */
  const historial = useHistorialDeRadar(config !== null ? obtenerHistorial : null);
  const { recargar: recargarHistorial } = historial;
  const [guardando, setGuardando] = useState(false);

  /* Al entrar, lo guardado se relee en silencio (no vacía lo que ya se ve): pudo cambiarse desde otro teléfono o la web. */
  useEffect(() => {
    recargarConfig();
  }, [recargarConfig]);

  /* Lo de HOY (horas de hoy, si hay Mi Radar hoy, lo respondido, el horario y si la hora en curso pide un registro) sale
     de una sola cuenta, `resumenDeMiRadarHoy`, la misma que usa la mitad del Radar de Hoy. */
  const { hoyTieneRadar, horasDeHoy, respondidasHoy, yaRegistroEstaHora, dentroDelHorario, horaEnCursoPendiente } = useMemo(
    () => resumenDeMiRadarHoy(config, historial.registros, ahora),
    [config, historial.registros, ahora],
  );

  /**
   * Enciende, apaga o guarda SOLO los días tocados (modo, veces, «Sin Radar»). Hoy y lo pasado no se editan: el servidor lo
   * rechaza con un 409 y la app ni los manda. Encender y apagar rigen en el acto.
   */
  const guardarConfig = useCallback(
    async (encendido: boolean, dias: readonly CambioDeDiaApi[] = []): Promise<ResultadoDeGuardar> => {
      setGuardando(true);
      try {
        return { ok: true, config: await guardar({ encendido, ...(dias.length > 0 ? { dias: [...dias] } : {}) }) };
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
    /** Lo que se leyó de Mi Radar, con el motivo si no se pudo (sin programa, bloqueada, fallo). */
    lectura,
    /** «Reintentar» y volver de elegir el Día 1: olvida el motivo (queda «Cargando…») y lee. Estable: lo recibe un `Modal`. */
    reiniciarConfig,
    config,
    guardando,
    guardarConfig,
    historial,
    horasDeHoy,
    respondidasHoy,
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
