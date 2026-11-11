import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { conMarcadosSinRed } from '../../habits/api/evidenciaHabitoApi';
import { DiaDeHabitosCambiadoError } from '../../habits/api/registroVigente';
import { fechaLocal } from '../../habits/notificaciones/utils/alarmasPorDia';
import { avisarSinPuntos } from '../../sinRed/avisosDeLoNoAplicado';
import { cabecerasDe } from '../../sinRed/cabecerasSinRed';
import { agregarEnvio, cuentaDeLaSesion, leerCola, registrarManejador, type EnvioSinRed } from '../../sinRed/colaSinRed';
import { horaReal } from '../../sinRed/horaReal';
import { registrarAjusteDeLectura, retocarLecturasGuardadas } from '../../sinRed/lecturasGuardadas';
import type { SubmitSpiritSummaryApi } from '../types/spirit.types';
import { spiritSchemas, validarRespuesta } from './spiritSchemas';

/**
 * Spec 048 (D2, FR-007, FR-010, FR-011, FR-015, FR-016): la Pastilla Renacer entregada sin señal.
 *
 * - Se guarda en la cola de la cuenta con la hora real y se ve hecha al instante: el hábito en Entrenar y el día de la Pastilla
 *   como entregado (los ajustes de lectura de abajo), mientras espera.
 * - Al volver la señal la cola la manda a `POST /api/v1/spirit-audio/submit` **con las tres cabeceras de lo hecho sin señal**
 *   (`cabecerasSinRed.ts`: `X-Id-Cliente`, `X-Hecho-En`, `X-Origen-De-La-Hora`). El servidor la registra con SU hora real y no con la de
 *   llegada (issue #186, D29): la de las 11:00 que llega a las 13:00 —o al otro día— cuenta a tiempo, y un reintento con el mismo
 *   `X-Id-Cliente` devuelve lo mismo sin entregarla dos veces.
 * - Lo que el servidor no aplica es un 409 con `codigo` (`YA_ESTABA_HECHO`, `FUERA_DE_SU_DIA`…): la cola lo da por terminado y la hoja
 *   de avisos lo dice con el motivo y lo que escribiste (`desenlaceDe`, igual que en las demás áreas). Si el hábito quedó sin puntos
 *   (`motivoSinPuntos`) también se avisa: nada se pierde en silencio.
 *
 * > **Corregido 2026-11-11 (issue #186).** Aquí decía que el endpoint no recibía `hechoEn` ni `idCliente` y que la entrega se registraba
 * > con la hora de llegada (tardía pasado el mediodía, 409 «PERDIDO» al otro día), y que un 409 «ENVIADO» se daba por entregada. Ahora
 * > recibe las cabeceras; y aquel 409 nunca se reconocía, porque el servidor dice «ENTREGADO», no «ENVIADO».
 */
export const TIPO_PASTILLA = 'entregarPastilla' as const;

export type DatosDePastillaSinRed = {
  /** Día de AUDIO, como lo manda la pantalla con señal. */
  day: number;
  summaryText: string;
  /** El registro del hábito «Pastilla Renacer» de ese día, para verlo hecho mientras espera. */
  registroId: string | null;
};

/** Datos del hábito que la pantalla ya conoce (los leyó para validar el día). */
export type ContextoDeLaPastilla = { registroId?: string | null; fecha?: string | null };

/**
 * Encola la entrega. Sin la cuenta de la sesión no hay cómo: sube el error de red original. Las mismas reglas que con señal: un
 * registro de un día que ya terminó no se entrega (D-259).
 */
export async function encolarPastilla(
  day: number,
  summaryText: string,
  contexto: ContextoDeLaPastilla,
  errorDeRed: unknown,
): Promise<void> {
  const cuenta = cuentaDeLaSesion();
  if (!cuenta) throw errorDeRed;
  const hora = horaReal();
  if (contexto.fecha && fechaLocal(hora.instante) > contexto.fecha) throw new DiaDeHabitosCambiadoError();
  // Ya espera una entrega de ese día: no se manda dos veces (el servidor respondería 409 a la segunda).
  if ((await leerCola(cuenta)).some(e => e.tipo === TIPO_PASTILLA && (e.datos as DatosDePastillaSinRed).day === day)) return;
  const datos: DatosDePastillaSinRed = { day, summaryText, registroId: contexto.registroId ?? null };
  await agregarEnvio(cuenta, TIPO_PASTILLA, datos, hora);
}

const RUTA_ENTREGA = '/api/v1/spirit-audio/submit';

/** El 409 con el que el servidor dice que ese día de la Pastilla ya estaba entregado (otro teléfono, o con señal antes). */
function yaEstabaEntregada(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.codigo === 'YA_ESTABA_HECHO';
}

/** Lo guardado para ver sin señal dice entregada: el hábito de ese día y el día de la Pastilla. */
async function marcarEntregadaEnLoGuardado(d: DatosDePastillaSinRed, hechoEn: string): Promise<void> {
  if (d.registroId) {
    const registro = d.registroId;
    await retocarLecturasGuardadas(
      ruta => ruta.startsWith('/api/v1/habit-tracks/'),
      datos => conMarcadosSinRed(datos, new Set([registro])),
    );
  }
  await retocarLecturasGuardadas(
    ruta => ruta === RUTA_ESTADO,
    datos => conDiasEntregados(datos, new Map([[d.day, { texto: d.summaryText, hechoEn }]])),
  );
}

registrarManejador(TIPO_PASTILLA, async (envio: EnvioSinRed) => {
  const d = envio.datos as DatosDePastillaSinRed;
  let respuesta: SubmitSpiritSummaryApi;
  try {
    const r = await apiFetch<unknown>(RUTA_ENTREGA, {
      method: 'POST',
      body: { day: d.day, summaryText: d.summaryText },
      cabeceras: cabecerasDe(envio),
    });
    respuesta = validarRespuesta<SubmitSpiritSummaryApi>(spiritSchemas.submit, r, `POST ${RUTA_ENTREGA} (sin red)`);
  } catch (error) {
    // Ese día ya estaba entregado en el servidor: lo guardado tiene que decirlo (sin esto, sin señal volvería a verse pendiente). El aviso
    // de «ya estaba hecho» lo anota igual la cola, porque el error sigue de largo.
    if (yaEstabaEntregada(error)) await marcarEntregadaEnLoGuardado(d, envio.hechoEn);
    throw error;
  }
  // FR-015: el audio quedó registrado, pero el hábito sin puntos (hora futura o más de 48 h): se dice con su motivo.
  if (respuesta.motivoSinPuntos) {
    await avisarSinPuntos(envio.cuentaId, {
      idCliente: envio.idCliente,
      etiqueta: 'Tu Pastilla Renacer',
      hechoEn: envio.hechoEn,
      motivoSinPuntos: respuesta.motivoSinPuntos,
    });
  }
  // Ya no está en la cola: lo guardado tiene que decir entregada, o sin señal volvería a verse pendiente.
  await marcarEntregadaEnLoGuardado(d, envio.hechoEn);
});

const RUTA_ESTADO = '/api/v1/spirit-audio/status';

/** El día de la Pastilla que espera en la cola se ve entregado, con lo que se escribió. */
export function conDiasEntregados(datos: unknown, entregas: ReadonlyMap<number, { texto: string; hechoEn: string }>): unknown {
  if (!datos || typeof datos !== 'object' || !Array.isArray((datos as { days?: unknown }).days)) return datos;
  const estado = datos as { days: Array<Record<string, unknown>> };
  return {
    ...estado,
    days: estado.days.map(dia => {
      const entrega = typeof dia.day === 'number' ? entregas.get(dia.day) : undefined;
      if (!entrega || dia.state === 'submitted') return dia;
      return { ...dia, state: 'submitted', summaryText: entrega.texto, submittedAt: entrega.hechoEn };
    }),
  };
}

/** Spec 048 (FR-011): mientras espera, el hábito se ve hecho y el día de la Pastilla, entregado. */
registrarAjusteDeLectura(async (ruta, datos) => {
  const esHabitos = ruta.startsWith('/api/v1/habit-tracks/');
  if (!esHabitos && ruta !== RUTA_ESTADO) return datos;
  const cuenta = cuentaDeLaSesion();
  if (!cuenta) return datos;
  const pastillas = (await leerCola(cuenta))
    .filter(e => e.tipo === TIPO_PASTILLA)
    .map(e => ({ ...(e.datos as DatosDePastillaSinRed), hechoEn: e.hechoEn }));
  if (pastillas.length === 0) return datos;
  if (esHabitos) {
    const marcados = new Set(pastillas.map(p => p.registroId).filter((id): id is string => typeof id === 'string'));
    return marcados.size ? conMarcadosSinRed(datos, marcados) : datos;
  }
  return conDiasEntregados(datos, new Map(pastillas.map(p => [p.day, { texto: p.summaryText, hechoEn: p.hechoEn }])));
});
