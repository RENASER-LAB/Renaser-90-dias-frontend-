import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import type { EjeObjetivo } from '../types/objetivos.types';
import { formatearNumero } from '../utils/cifraDelObjetivo';
import { validarRespuesta } from './objetivosSchemas';

/**
 * El plan mensual: qué tiene que estar logrado al cierre de cada mes, en los tres ejes.
 *
 * ── Por qué esto lo calcula el SERVIDOR y ya no la app ──
 *
 * Había **dos números para la misma pregunta** y el dueño los vio uno al lado del otro. Con un
 * objetivo de 84 → 78 kg, el hito del Mapa para el Día 30 decía *81,6 kg* (progresión 40/75/100 %,
 * §3 V08 del manual del cliente) y la tarjeta "Este mes" del Plan decía *82 kg* (un tercio).
 * Las dos cuentas eran correctas en su terreno y las dos respondían "qué logro este mes", que es
 * una sola pregunta.
 *
 * Ahora la cuenta vive en un solo lugar —`rocks.domain.rocamensual.CalculadoraObjetivoMensual`—
 * y manda la curva del manual, conservando lo que aportaba la otra fórmula: que el tramo se
 * **recalcula contra el valor real de hoy**, así que lo que no se hizo no desaparece, se
 * redistribuye. En el mes 1, sin mediciones todavía, da exactamente el hito del Mapa.
 *
 * El otro motivo para moverlo: la app no puede calcularlo bien sola. Hace falta saber **qué** se
 * mide (`map_health_result_type` y sus hermanas), y eso vive en las respuestas del Mapa, no en la
 * Roca Maestra. El servidor ya tiene las dos cosas a mano.
 */

/** Por qué un mes no lleva cifra. Espejo de `ObjetivoDelMes.MotivoSinCifra` del backend. */
export const MOTIVOS_SIN_CIFRA = [
  'SIN_DATOS',
  'SIN_TIPO',
  'SIN_RECORRIDO',
  'ACOMPANAMIENTO_CLINICO',
  'FUERA_DE_ALCANCE',
  'RITMO_NO_SALUDABLE',
] as const;
export type MotivoSinCifra = (typeof MOTIVOS_SIN_CIFRA)[number];

const mesSchema = z.object({
  numeroMes: z.number().int(),
  diaDeCierre: z.number().int(),
  enCurso: z.boolean(),
  estado: z.enum(['CON_CIFRA', 'YA_ALCANZADO', 'SIN_CIFRA', 'SOLO_TITULO']),
  cifra: z.number().nullable(),
  paso: z.number().nullable(),
  falta: z.number().nullable(),
  sube: z.boolean().nullable(),
  motivo: z.enum(MOTIVOS_SIN_CIFRA).nullable(),
  editado: z.boolean(),
  titulo: z.string().nullable(),
});

const planSchema = z.array(
  z.object({
    eje: z.enum(['CUERPO', 'TRABAJO', 'RELACIONES']),
    mesActual: z.number().int(),
    unidad: z.string(),
    unidadAdelante: z.boolean(),
    meses: z.array(mesSchema),
  })
);

export type MesDelPlan = z.infer<typeof mesSchema>;
export type PlanMensualDelEje = z.infer<typeof planSchema>[number];

/** `GET /api/v1/rocks/monthly/plan` — los tres meses de cada eje, ya calculados. */
export async function obtenerPlanMensual(): Promise<PlanMensualDelEje[]> {
  const r = await apiFetch<unknown>('/api/v1/rocks/monthly/plan');
  return validarRespuesta(planSchema, r, 'GET /api/v1/rocks/monthly/plan');
}

/**
 * `PUT /api/v1/rocks/monthly/{eje}/{mes}` — corrige el objetivo de ese mes a mano.
 *
 * Desde que se guarda, **manda sobre el cálculo**: el servidor deja de proponer y devuelve lo que
 * escribió la persona, con `editado: true`. Es idempotente (por eje y mes hay una sola fila), así
 * que reintentar tras un fallo de red es seguro.
 *
 * `meta`, `avance` y `unidad` van los tres o ninguno — media meta da 400. Sin ellos queda un tramo
 * **cualitativo**: un título y nada de números, que es válido ("recuperar el hábito de cocinar").
 */
export async function guardarObjetivoDelMes(
  eje: EjeObjetivo,
  numeroMes: number,
  cambio: { titulo: string; meta?: number; avance?: number; unidad?: string }
): Promise<void> {
  await apiFetch<unknown>(`/api/v1/rocks/monthly/${eje}/${numeroMes}`, { method: 'PUT', body: cambio });
}

/**
 * La cifra tal como se escribe: `"81.6 kg"`, `"S/ 10 000"`, `"7/10"`.
 *
 * La moneda va delante y la unidad física detrás, igual que en los hitos del Mapa. Una escala se
 * pega al número sin espacio — `"7/10"`, no `"7 /10"`.
 */
export function cifraEscrita(valor: number, unidad: string, adelante: boolean): string {
  const numero = formatearNumero(valor);
  const u = unidad.trim();
  if (!u) return numero;
  if (u.startsWith('/')) return `${numero}${u}`;
  return adelante ? `${u} ${numero}` : `${numero} ${u}`;
}
