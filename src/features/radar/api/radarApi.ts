import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { escribirOEncolar } from '../../sinRed/escrituraSinRed';
import { horaReal } from '../../sinRed/horaReal';
import type {
  CheckInRadarApi,
  HistorialRadarApi,
  MiRadarApi,
  PedidoDeMiRadarApi,
  RegistroRadarApi,
  UltimoRadarApi,
} from '../types/radar.types';
import { radarSchemas, validarRespuesta } from './radarSchemas';
import {
  RUTA_DEL_RADAR,
  RUTA_DE_MI_RADAR,
  etiquetaDelCodigo,
  miRadarConLoPedido,
  registroEnEspera,
  resumenDelCodigo,
} from './radarSinRed';

/**
 * El Código Renaser contra la API propia de Spring.
 *
 * Los tres endpoints existían en el backend desde 2026-08-24 (D-41, "no quiero depender de
 * Supabase") y **ninguna pantalla los llamaba**: hasta hoy este frontend no tenía radar en
 * absoluto. Este archivo es el primer consumidor.
 *
 * `apiFetch` ya hace `JSON.stringify` del cuerpo: se le pasa el objeto crudo. Mandarlo
 * pre-serializado produce un 400 "cuerpo malformado" —el mismo error que costó el cambio de rol
 * en producción (E-181)—, así que ojo con "arreglarlo" agregando un `JSON.stringify` acá.
 */

/**
 * `POST /api/v1/radar`. El actor sale de la sesión: no hay parámetro de persona, y es a propósito.
 *
 * Spec 048 fase 3 (FR-019): sin señal se guarda en la cola con la hora real y devuelve el registro en espera; la hora queda respondida
 * al instante (`radarSinRed.ts`).
 */
export async function registrarCheckIn(checkIn: CheckInRadarApi): Promise<RegistroRadarApi> {
  return escribirOEncolar<RegistroRadarApi>(
    {
      area: 'radar',
      etiqueta: etiquetaDelCodigo(horaReal().instante),
      metodo: 'POST',
      ruta: RUTA_DEL_RADAR,
      cuerpo: checkIn,
      resumen: resumenDelCodigo(checkIn),
    },
    {
      validar: r => validarRespuesta(radarSchemas.registro, r, 'POST /api/v1/radar'),
      optimista: envio => registroEnEspera(checkIn, envio.idCliente, envio.hechoEn),
    },
  );
}

/**
 * `GET /api/v1/radar/latest` — el instante del último check-in, o `null`.
 *
 * Es lo único que hace falta para saber si el slot de esta hora ya está respondido: si ese
 * instante cae en la hora en curso, está hecho. Una sola llamada, sin traer textos.
 */
export async function obtenerUltimoCheckIn(): Promise<string | null> {
  const r = await apiFetch<unknown>('/api/v1/radar/latest');
  const dato = validarRespuesta<UltimoRadarApi>(radarSchemas.ultimo, r, 'GET /api/v1/radar/latest');
  return dato.createdAt ?? null;
}

/** `GET /api/v1/radar/history` — páginas de 20, de la más nueva a la más vieja. */
export async function obtenerHistorial(cursor?: string | null): Promise<HistorialRadarApi> {
  const ruta = cursor ? `/api/v1/radar/history?cursor=${encodeURIComponent(cursor)}` : '/api/v1/radar/history';
  const r = await apiFetch<unknown>(ruta);
  const dato = validarRespuesta<HistorialRadarApi>(radarSchemas.historial, r, 'GET /api/v1/radar/history');
  return { entries: dato.entries, nextCursor: dato.nextCursor ?? null, miRadar: dato.miRadar ?? null };
}

/**
 * `GET /api/v1/radar/mi-radar` (spec 019): si la persona encendió Mi Radar y, para cada día de la semana, el modo, las veces y las
 * horas que el servidor calculó con su Despertar y su Dormir (`dias`, siete). Un 404 es un backend anterior. Un 403 **dice por qué**
 * en el `codigo` del cuerpo (`PROGRAMA_NO_ACTIVADO`, `CUENTA_SUSPENDIDA`, `SIN_PERMISO`; spec 019): `useConfigDeMiRadar.lecturaDeUnError` lo lee, y un
 * 403 sin motivo (un backend anterior) sigue siendo «no hay Mi Radar», no un fallo.
 */
export async function obtenerMiRadar(): Promise<MiRadarApi> {
  const r = await apiFetch<unknown>('/api/v1/radar/mi-radar');
  return validarRespuesta<MiRadarApi>(radarSchemas.miRadar, r, 'GET /api/v1/radar/mi-radar');
}

/**
 * `PUT /api/v1/radar/mi-radar`: enciende o apaga Mi Radar (rige en el acto) y guarda SOLO los días que se tocan (`dias`:
 * modo, veces, sin Radar). Responde la semana ya resuelta, con la forma del GET. Un 400 es un modo o unas veces fuera de las
 * reglas (la app las valida antes, pero el servidor decide) y un 409, un pedido que cambia hoy o un día pasado.
 */
export async function guardarMiRadar(pedido: PedidoDeMiRadarApi, actual?: MiRadarApi | null): Promise<MiRadarApi> {
  // Spec 048 fase 3: sin señal se guarda en la cola y se ve lo pedido; sin la semana a la vista no hay qué mostrar, y falla como siempre.
  return escribirOEncolar<MiRadarApi>(
    { area: 'radar', etiqueta: 'Tus cambios de Mi Radar', metodo: 'PUT', ruta: RUTA_DE_MI_RADAR, cuerpo: pedido },
    {
      validar: r => validarRespuesta<MiRadarApi>(radarSchemas.miRadar, r, 'PUT /api/v1/radar/mi-radar'),
      antesDeEncolar: () => {
        if (!actual) throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
      },
      optimista: () => miRadarConLoPedido(actual as MiRadarApi, pedido),
    },
  );
}
