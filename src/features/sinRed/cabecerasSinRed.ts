import type { EnvioSinRed } from './colaSinRed';

/**
 * Spec 048, fase 3 (FR-007, FR-014, FR-019): lo que el servidor necesita saber de algo hecho sin señal viaja en TRES cabeceras, no
 * en el cuerpo. Hay `PUT` y `DELETE` sin cuerpo, el cuerpo de `POST /rocks/plan` es una lista y ningún DTO se toca. Un servidor
 * anterior las ignora y un pedido sin ellas es uno normal. El contrato vive en el plan de la fase 3 del backend
 * (`specs/048-modo-offline/plan.md`): NO se cambian los nombres.
 *
 * - `X-Id-Cliente`: el UUID del envío. Repetirlo da el mismo resultado sin tocar nada (FR-008).
 * - `X-Hecho-En`: el instante en que la persona lo hizo, ISO-8601 en UTC con `Z`.
 * - `X-Origen-De-La-Hora`: `RELOJ_DEL_SISTEMA` o `TELEFONO_CORREGIDO` (D14).
 */
export const CABECERA_ID_CLIENTE = 'X-Id-Cliente';
export const CABECERA_HECHO_EN = 'X-Hecho-En';
export const CABECERA_ORIGEN_DE_LA_HORA = 'X-Origen-De-La-Hora';

export function cabecerasDe(envio: Pick<EnvioSinRed, 'idCliente' | 'hechoEn' | 'origenDeLaHora'>): Record<string, string> {
  return {
    [CABECERA_ID_CLIENTE]: envio.idCliente,
    // `toISOString()` ya es UTC con `Z`; un valor guardado de otra forma se normaliza.
    [CABECERA_HECHO_EN]: new Date(envio.hechoEn).toISOString(),
    [CABECERA_ORIGEN_DE_LA_HORA]: envio.origenDeLaHora,
  };
}
