import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { ahoraConfiable } from '../../../services/http/relojServidor';
import { obtenerUltimoCheckIn, registrarCheckIn } from '../api/radarApi';
import { CONFIG_RADAR } from '../config/configRadar';
import type { CheckInRadarApi } from '../types/radar.types';
import { envioEnElMismoSlot, estadoDelRadar, type EstadoRadar } from '../utils/slotsDelRadar';

/**
 * Lo que se le dice a la persona cuando el servidor rechazó el registro por «ya hay uno en esta hora»
 * (409) y la relectura no lo pudo confirmar. Propio y corto: el texto del servidor («La operacion
 * entra en conflicto con datos que ya existen») no dice qué hacer.
 */
export const MENSAJE_HORA_YA_REGISTRADA =
  'Esta hora ya tiene un registro, pero no pudimos confirmarlo. Intenta de nuevo en un momento.';

/**
 * Identifica «la lectura de /radar/latest de ESTA cuenta, en ESTA hora de ESTA fecha». Si cambia
 * cualquiera de las tres, lo leído antes ya no sirve para decidir si el formulario se abre.
 */
function claveDeLectura(usuarioId: string | null | undefined, fecha: string, hora: number): string {
  return `${usuarioId ?? ''}|${fecha}|${hora}`;
}

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
 * ## Mientras no se sabe, no está abierto (2026-10-19)
 *
 * Hasta que la lectura de ESTA hora llega, el estado es `cargando`, no `abierto`: «no tengo registro»
 * y «todavía no lo leí» eran lo mismo, y el formulario innegociable se montaba y se cerraba ~300 ms
 * después cuando la hora ya estaba respondida (en Android, además, el Modal quedaba como una ventana
 * vacía y oscura encima de Hoy). Pasa en la primera lectura y en cada recarga: otra hora, otra fecha,
 * otra cuenta, o el radar que se apagó un rato (el Mapa abierto) y volvió. Si la lectura FALLA (red,
 * 5xx) se abre igual, como siempre —no puede quedarse sin pedirse—, pero ya sin parpadeo; un 403 apaga.
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
  /** La clave (`claveDeLectura`) de la última lectura que terminó, bien o mal. `null` = ninguna. */
  const [lecturaDe, setLecturaDe] = useState<string | null>(null);
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
  const claveEnCurso = claveDeLectura(usuarioId, fechaEnCurso, horaEnCurso);

  /* Con el radar apagado (el Mapa abierto, el arranque guiado sin terminar) lo leído deja de valer:
     al volver, aunque sea en la misma hora, hay que leer de nuevo ANTES de poder abrir —si en el
     intervalo se respondió desde otro teléfono, abrir con el dato viejo era el parpadeo otra vez—.
     Se hace al renderizar y no en un efecto: un efecto corre DESPUÉS de dibujar, o sea que habría un
     cuadro con el dato viejo en que el formulario ya estaría abierto. */
  if (!enEtapa && lecturaDe !== null) setLecturaDe(null);

  useEffect(() => {
    if (!enEtapa) return;
    let vigente = true;
    obtenerUltimoCheckIn()
      .then(iso => {
        if (!vigente) return;
        setUltimoEnvioIso(iso);
        setLecturaDe(claveEnCurso);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        if (e instanceof ApiError && e.status === 403) {
          setProhibido(true);
          return;
        }
        // No se muestra: que no se pueda leer el último envío no debe tapar Hoy. En el peor caso
        // la tarjeta se ofrece de nuevo dentro de la misma hora.
        //
        // Corregido 2026-10-19: este comentario decía «el backend acepta varios registros por
        // hora, es un log append-only». Ya no: el índice único `radar_un_registro_por_hora` rechaza
        // el segundo con un 409, y `enviar` lo resuelve releyendo (ver abajo). Leer falló, pero ya
        // se SABE que no se pudo: se deja de esperar y se abre el formulario, como siempre.
        console.warn('[Radar] no se pudo leer el último check-in:', e);
        setLecturaDe(claveEnCurso);
      });
    return () => {
      vigente = false;
    };
  }, [enEtapa, claveEnCurso]);

  /** Las DOS marcas de «ya está registrado». Siempre juntas, nunca una sola. */
  const marcarRegistrado = useCallback((creadoEnIso: string) => {
    // La del servidor es la buena para todo lo que se guarda; la local es la única que garantiza que
    // el formulario se cierre aunque los relojes no coincidan (ver `envioLocalIso` en `slotsDelRadar`).
    setUltimoEnvioIso(creadoEnIso);
    setEnvioLocalIso(new Date().toISOString());
  }, []);

  const enviar = useCallback(async (checkIn: CheckInRadarApi): Promise<boolean> => {
    setEnviando(true);
    setError(null);
    try {
      const registro = await registrarCheckIn(checkIn);
      marcarRegistrado(registro.createdAt);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setProhibido(true);
        return false;
      }
      if (e instanceof ApiError && e.status === 409) {
        /* Ya hay un registro en esta hora (índice único `radar_un_registro_por_hora`): se respondió
           desde otro teléfono, o se perdió la respuesta de un envío que sí llegó. No es un error de
           la persona. Se relee: si el último registro cae en la hora en curso, está hecho y el
           formulario se cierra como «Registrado». Sin puntos ni anuncios. */
        try {
          const iso = await obtenerUltimoCheckIn();
          if (iso && envioEnElMismoSlot(iso, ahoraConfiable())) {
            marcarRegistrado(iso);
            return true;
          }
        } catch (relectura) {
          if (relectura instanceof ApiError && relectura.status === 403) {
            setProhibido(true);
            return false;
          }
        }
        setError(MENSAJE_HORA_YA_REGISTRADA);
        return false;
      }
      setError(mensajeDeError(e, 'No pudimos guardar tu Código Renaser. Intenta de nuevo.'));
      return false;
    } finally {
      setEnviando(false);
    }
  }, [marcarRegistrado]);

  const lecturaPendiente = lecturaDe !== claveEnCurso;
  const estado = useMemo<EstadoRadar>(() => {
    if (prohibido) return { tipo: 'apagado', motivo: 'desactivado' };
    return estadoDelRadar({ diaPrograma: dia, ultimoEnvioIso, envioLocalIso, lecturaPendiente, ahora });
  }, [prohibido, dia, ultimoEnvioIso, envioLocalIso, lecturaPendiente, ahora]);

  const limpiarError = useCallback(() => setError(null), []);

  return { estado, enviando, error, enviar, limpiarError };
}
