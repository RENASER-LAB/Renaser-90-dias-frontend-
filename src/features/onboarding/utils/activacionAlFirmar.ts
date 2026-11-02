import * as onboardingApi from '../api/onboardingApi';
import { ApiError } from '../../../services/http/apiClient';
import { avisarDiaUnoElegido } from '../../programa/events/avisoDiaUnoElegido';

/**
 * Activar el programa al firmar (spec 036, D-309, ajuste del dueño del 2026-11-02: «Firma, y al día siguiente ya es su día número 1, ¿verdad?»).
 *
 * En el onboarding la pantalla «Tu programa empieza mañana» ya no espera un toque: al llegar a ella (justo después de firmar los Términos, o al
 * volver a abrir la app con los Términos firmados) llama a esto. Se pide **sin fecha**: el servidor pone el Día 1 en mañana, en la zona de la
 * persona, y si el programa ya estaba activado responde 200 con la fecha que tiene (idempotente, nunca 409). Devuelve la fecha de inicio
 * (`yyyy-MM-dd`) que dijo el servidor, que es la que la pantalla muestra una vez que respondió.
 *
 * **Una sola vez por pedido en vuelo.** Si la pantalla se monta dos veces seguidas (StrictMode, Fast Refresh, un montaje que se repite), el segundo
 * montaje espera el mismo pedido en vez de mandar otro. Terminado el pedido, otro montaje sí manda uno nuevo (es idempotente: 200).
 *
 * **Contra un servidor anterior a la spec 036** (que exige la fecha y responde 400 si no viene) se hace como antes de este ajuste: se lee la fecha
 * que ofrece (la primera es mañana) y se activa con ella; si ya estaba activado, se usa su fecha.
 */
let enVuelo: Promise<string | null> | null = null;

export function activarElProgramaDeManana(): Promise<string | null> {
  if (enVuelo) return enVuelo;
  const pedido = pedirLaActivacion().then(fecha => {
    // Los que muestran su Día 1 (Hoy, Yo, Training) y siguen montados releen su lectura.
    avisarDiaUnoElegido();
    return fecha;
  });
  enVuelo = pedido;
  // Pase lo que pase se libera, para que «Reintentar» (o un montaje posterior) mande un pedido nuevo.
  const liberar = () => { if (enVuelo === pedido) enVuelo = null; };
  pedido.then(liberar, liberar);
  return pedido;
}

async function pedirLaActivacion(): Promise<string | null> {
  try {
    return (await onboardingApi.activarPrograma()).startDate;
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 400) throw e;
  }
  // 400 sin fecha: un servidor anterior a la spec 036, que la exige.
  const estado = await onboardingApi.consultarActivacionPrograma();
  if (estado.activated) return estado.startDate ?? null;
  const manana = estado.validStartDates[0];
  if (!manana) throw new Error('El servidor no ofreció una fecha de inicio.');
  return (await onboardingApi.activarPrograma({ startDate: manana })).startDate;
}
