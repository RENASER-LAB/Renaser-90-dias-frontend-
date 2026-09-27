import { ApiError } from '../../../services/http/apiClient';

/**
 * Cerrar un registro del día (`POST /habit-tracks/{id}/complete`) UNA vez, aunque lo toquen dos.
 *
 * > **TRN-02 (e2e web del 2026-09-27).** Doble toque en «Despertar»: salían dos pedidos, un 200 y
 * > un 409, y la app mostraba «No pudimos registrar la hora / Este registro no puede completarse:
 * > COMPLETADO» sobre algo que SÍ se había registrado. La tarjeta no se marca de forma optimista
 * > (se marca cuando el servidor confirma), así que el segundo toque todavía la veía pendiente.
 *
 * Dos resguardos, porque cubren casos distintos:
 * - Mientras un cierre está en vuelo, otro pedido del MISMO registro no sale (`'en-curso'`).
 * - Si el servidor responde que el registro ya estaba COMPLETADO (se cerró desde otra pantalla u
 *   otro teléfono), eso no es un error para quien lo quería cerrado (`'ya-estaba-cerrado'`).
 *
 * Cualquier otro error (vencido, sin red, fallido) se relanza tal cual: esos sí hay que avisarlos.
 */
export type ResultadoDelCierre = 'cerrado' | 'ya-estaba-cerrado' | 'en-curso';

export function crearCierreSinRepetir(
  completar: (registroId: string) => Promise<unknown>,
): (registroId: string) => Promise<ResultadoDelCierre> {
  const enVuelo = new Set<string>();
  return async registroId => {
    if (enVuelo.has(registroId)) return 'en-curso';
    enVuelo.add(registroId);
    try {
      await completar(registroId);
      return 'cerrado';
    } catch (e) {
      if (yaEstabaCompletado(e)) return 'ya-estaba-cerrado';
      throw e;
    } finally {
      enVuelo.delete(registroId);
    }
  };
}

/**
 * El 409 con que el backend rechaza cerrar un registro que ya está COMPLETADO:
 * `"Este registro no puede completarse: COMPLETADO"` (`RegistroHabito.completar`, documentado en
 * `docs/api/CONTRATO_DIA_A_DIA.md` del backend). El mismo texto con otro estado (`FALLIDO`) no es
 * esto: ese registro no quedó cerrado.
 */
export function yaEstabaCompletado(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    /no puede completarse:\s*COMPLETADO\s*$/i.test(error.message)
  );
}
