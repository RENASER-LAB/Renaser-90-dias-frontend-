import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { conMarcadosSinRed } from '../../habits/api/evidenciaHabitoApi';
import { DiaDeHabitosCambiadoError } from '../../habits/api/registroVigente';
import { fechaLocal } from '../../habits/notificaciones/utils/alarmasPorDia';
import { agregarEnvio, cuentaDeLaSesion, leerCola, registrarManejador } from '../../sinRed/colaSinRed';
import { horaReal } from '../../sinRed/horaReal';
import { registrarAjusteDeLectura, retocarLecturasGuardadas } from '../../sinRed/lecturasGuardadas';

/**
 * Spec 048 (D2, FR-007, FR-010, FR-011): la Pastilla Renacer entregada sin señal.
 *
 * - Se guarda en la cola de la cuenta con la hora real y se ve hecha al instante: el hábito en Entrenar y el día de la Pastilla
 *   como entregado (los ajustes de lectura de abajo), mientras espera.
 * - Al volver la señal la cola la manda a `POST /api/v1/spirit-audio/submit`.
 *
 * **Límite (2026-11-10):** ese endpoint solo recibe `day` y `summaryText`; no acepta `hechoEn` ni `idCliente`. El servidor la
 * registra con la hora en que LLEGA: si llega pasado el mediodía cuenta como tardía, y si llega otro día el día ya venció y el
 * servidor la rechaza (409). Lo que sí se hace aquí para no mandarla dos veces: una sola entrega por día en la cola, y un 409
 * «ya se registró (ENVIADO)» —la respuesta del primer envío que se perdió— se da por entregada.
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

/** El 409 que responde el servidor cuando ese día ya estaba entregado: el primer envío llegó y se perdió la respuesta. */
function yaEstabaEntregada(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && /ENVIADO/.test(error.message);
}

registrarManejador(TIPO_PASTILLA, async envio => {
  const d = envio.datos as DatosDePastillaSinRed;
  try {
    // Sin `hechoEn` ni `idCliente`: el endpoint no los recibe (ver arriba).
    await apiFetch<unknown>('/api/v1/spirit-audio/submit', { method: 'POST', body: { day: d.day, summaryText: d.summaryText } });
  } catch (error) {
    if (!yaEstabaEntregada(error)) throw error;
  }
  // Ya no está en la cola: lo guardado tiene que decir entregada, o sin señal volvería a verse pendiente.
  if (d.registroId) {
    const registro = d.registroId;
    await retocarLecturasGuardadas(
      ruta => ruta.startsWith('/api/v1/habit-tracks/'),
      datos => conMarcadosSinRed(datos, new Set([registro])),
    );
  }
  await retocarLecturasGuardadas(
    ruta => ruta === RUTA_ESTADO,
    datos => conDiasEntregados(datos, new Map([[d.day, { texto: d.summaryText, hechoEn: envio.hechoEn }]])),
  );
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
