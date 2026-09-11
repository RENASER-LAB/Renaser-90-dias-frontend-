import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { obtenerUltimoCheckIn, registrarCheckIn } from '../api/radarApi';
import { CONFIG_RADAR } from '../config/configRadar';
import type { CheckInRadarApi } from '../types/radar.types';
import { estadoDelRadar, type EstadoRadar } from '../utils/slotsDelRadar';

export interface EstadoRadarDelDia {
  /** Qué mostrar ahora mismo. Ver `slotsDelRadar.ts`. */
  estado: EstadoRadar;
  enviando: boolean;
  /** Texto listo para mostrar; `null` si el último envío salió bien. */
  error: string | null;
  enviar: (checkIn: CheckInRadarApi) => Promise<boolean>;
  limpiarError: () => void;
}

/**
 * El Código Renaser de esta hora.
 *
 * Sólo hace **una** llamada de lectura (`/radar/latest`) y la repite cuando cambia la hora, no
 * cada minuto: lo que hay que saber es si el slot en curso ya se respondió, y eso sólo puede
 * cambiar por un envío de esta misma app (que se refleja al instante) o por uno hecho en otro
 * dispositivo dentro de la misma hora.
 *
 * ## Dos apagados silenciosos, a propósito
 *
 * 1. **Fuera de los días 1-7 no se pide nada.** Ni siquiera `/latest`: si el radar no
 *    corresponde, gastar una llamada por cada entrada a Hoy sería ruido puro.
 * 2. **Un 403 apaga el radar para esta sesión.** Ya casi no debería ocurrir: el backend dejó de
 *    gatear por rol en E-169 — `RadarService.requireParticipanteHabilitado` pide
 *    `rol == TRAINEE` **o** `programaActivado`, justamente para que el staff que cursa sus 90
 *    días pueda usarlo. Como el radar sólo se muestra con el programa corriendo (día 1 a 7), las
 *    dos condiciones coinciden. Queda el caso de una cuenta suspendida, y ahí ocultarlo es lo
 *    correcto: no tiene sentido exigir un formulario innegociable a quien no puede enviarlo.
 */
export function useRadarDelDia(
  diaPrograma: number | null | undefined,
  /**
   * Quién es. No se usa para pedir nada —el actor sale de la sesión— sino para OLVIDAR: al
   * cambiar de cuenta hay que tirar el estado del anterior. Sin esto, cerrar sesión y entrar
   * con otra dentro de la misma hora heredaba su "ya respondido" (y su 403), o sea que a la
   * segunda persona no se le pedía el registro que sí le tocaba.
   */
  usuarioId: string | null | undefined,
): EstadoRadarDelDia {
  const ahora = useMinutoActual();
  const [ultimoEnvioIso, setUltimoEnvioIso] = useState<string | null>(null);
  /** Reloj de ESTE dispositivo al confirmar un envío. Ver `envioLocalIso` en `slotsDelRadar`. */
  const [envioLocalIso, setEnvioLocalIso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prohibido, setProhibido] = useState(false);

  /* Todo lo que sabe este hook es de UNA persona. Se limpia junto, en un solo lugar, para que
     agregar un estado nuevo más adelante no deje un resto colgado sin que nadie lo note. */
  useEffect(() => {
    setUltimoEnvioIso(null);
    setEnvioLocalIso(null);
    setProhibido(false);
    setError(null);
  }, [usuarioId]);

  const dia = diaPrograma ?? 0;
  const enEtapa =
    CONFIG_RADAR.activo && !prohibido && dia >= CONFIG_RADAR.primerDia && dia <= CONFIG_RADAR.ultimoDia;

  // La hora en punto es la clave de recarga: mientras no cambie, no hay nada nuevo que leer.
  const horaEnCurso = ahora.getHours();
  const fechaEnCurso = ahora.toDateString();

  useEffect(() => {
    if (!enEtapa) return;
    let vigente = true;
    obtenerUltimoCheckIn()
      .then(iso => {
        if (vigente) setUltimoEnvioIso(iso);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setProhibido(true);
          return;
        }
        // No se muestra: que no se pueda leer el último envío no debe tapar Hoy. En el peor caso
        // la tarjeta se ofrece de nuevo dentro de la misma hora, que es inofensivo —el backend
        // acepta varios registros por hora, es un log append-only.
        console.warn('[Radar] no se pudo leer el último check-in:', e);
      });
    return () => {
      vigente = false;
    };
  }, [enEtapa, horaEnCurso, fechaEnCurso]);

  const enviar = useCallback(async (checkIn: CheckInRadarApi): Promise<boolean> => {
    setEnviando(true);
    setError(null);
    try {
      const registro = await registrarCheckIn(checkIn);
      // Las DOS marcas. La del servidor es la buena para todo lo que se guarda; la local es la
      // única que garantiza que el formulario se cierre aunque los relojes no coincidan (ver
      // `envioLocalIso` en `slotsDelRadar`). Se ponen juntas, nunca una sola.
      setUltimoEnvioIso(registro.createdAt);
      setEnvioLocalIso(new Date().toISOString());
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setProhibido(true);
        return false;
      }
      setError(mensajeDeError(e, 'No pudimos guardar tu Código Renaser. Intenta de nuevo.'));
      return false;
    } finally {
      setEnviando(false);
    }
  }, []);

  const estado = useMemo<EstadoRadar>(() => {
    if (prohibido) return { tipo: 'apagado', motivo: 'desactivado' };
    return estadoDelRadar({ diaPrograma: dia, ultimoEnvioIso, envioLocalIso, ahora });
  }, [prohibido, dia, ultimoEnvioIso, envioLocalIso, ahora]);

  const limpiarError = useCallback(() => setError(null), []);

  return { estado, enviando, error, enviar, limpiarError };
}
