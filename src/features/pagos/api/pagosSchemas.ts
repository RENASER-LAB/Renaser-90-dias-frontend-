import { z } from 'zod';

import { esMoneda, type Moneda } from '../utils/dinero';

/**
 * Contrato de los pagos (backend spec 032, `contracts/pagos.md`). Tolerante como el resto de la app (`passthrough()`, `nullish()`): un campo que el
 * servidor agregue mañana no rompe la pantalla de hoy, una cuota que no se entiende se pierde ELLA y no la lista, y un valor desconocido se lee
 * del lado seguro (una cuota con un estado raro es «pendiente»; una modalidad que no se conoce es «no hay nada que mostrar»).
 */

const textoOpcional = z.string().nullish();
const montoSchema = z.union([z.number(), z.string()]);

const cuotaCrudaSchema = z
  .object({
    id: z.string().min(1),
    dueDate: z.string(),
    amount: montoSchema,
    status: z.string().nullish(),
    statusChangedAt: textoOpcional,
    statusChangedByName: textoOpcional,
  })
  .passthrough();

const confirmacionCrudaSchema = z
  .object({ state: z.string().nullish(), confirmedAt: textoOpcional, name: textoOpcional })
  .passthrough();

const pagosCrudosSchema = z
  .object({
    mode: z.string(),
    currency: textoOpcional,
    installments: z.array(z.unknown()).nullish(),
    confirmation: confirmacionCrudaSchema.nullish(),
  })
  .passthrough();

const pasoCrudoSchema = z.object({ key: z.string(), done: z.boolean().nullish() }).passthrough();

export const miIngresoCrudoSchema = z
  .object({ steps: z.array(z.unknown()).nullish(), payments: pagosCrudosSchema.nullish() })
  .passthrough();

/** La ficha de Administración: el nombre y el pago (`payments` nulo = nada anotado). */
export const pagosDeLaPersonaCrudoSchema = z
  .object({ personName: textoOpcional, payments: pagosCrudosSchema.nullish() })
  .passthrough();

// ── Lo que la app usa ────────────────────────────────────────────────────────────────────────────────────────────────

/** Una cuota ya leída: la fecha es `AAAA-MM-DD` y el monto un número. */
export type CuotaDePago = {
  id: string;
  venceEl: string;
  monto: number;
  pagada: boolean;
  /** Cuándo y quién la marcó por última vez (la lectura de Administración trae el nombre; la de la persona, no). */
  marcadaEn: string | null;
  marcadaPor: string | null;
};

export type EstadoDeLaConfirmacion = 'SIN_CONFIRMAR' | 'CONFIRMADA' | 'DESACTUALIZADA';

export type ConfirmacionDelCronograma = {
  estado: EstadoDeLaConfirmacion;
  confirmadaEn: string | null;
  nombre: string | null;
};

/**
 * Lo que tiene anotado de su pago. `moneda` y `confirmacion` solo con cronograma; sin cronograma, `cuotas` va vacío («Tu pago fue cancelado»).
 */
export type PagosDeLaPersona =
  | { modo: 'SIN_CRONOGRAMA'; moneda: null; cuotas: []; confirmacion: null }
  | { modo: 'CON_CRONOGRAMA'; moneda: Moneda | null; cuotas: CuotaDePago[]; confirmacion: ConfirmacionDelCronograma };

export type ClaveDePaso = 'DIAGNOSTICO' | 'ACUERDO' | 'PAGOS';

export type PasoDelIngreso = { clave: ClaveDePaso; hecho: boolean };

export type MiIngreso = { pasos: PasoDelIngreso[]; pagos: PagosDeLaPersona | null };

export type PagosEnLaFicha = { nombre: string | null; pagos: PagosDeLaPersona | null };

const CLAVES_DE_PASO: Record<string, ClaveDePaso> = { DIAGNOSIS: 'DIAGNOSTICO', AGREEMENT: 'ACUERDO', PAYMENTS: 'PAGOS' };

function monto(valor: string | number): number | null {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Una cuota que no se entiende (sin monto, sin id) se pierde ELLA, no la lista. */
function leerCuota(cruda: unknown): CuotaDePago | null {
  const leida = cuotaCrudaSchema.safeParse(cruda);
  if (!leida.success) return null;
  const importe = monto(leida.data.amount);
  if (importe === null) return null;
  return {
    id: leida.data.id,
    venceEl: leida.data.dueDate,
    monto: importe,
    pagada: leida.data.status === 'PAID',
    marcadaEn: leida.data.statusChangedAt ?? null,
    marcadaPor: leida.data.statusChangedByName ?? null,
  };
}

const ESTADOS_DE_CONFIRMACION: Record<string, EstadoDeLaConfirmacion> = {
  NOT_YET: 'SIN_CONFIRMAR',
  CONFIRMED: 'CONFIRMADA',
  OUTDATED: 'DESACTUALIZADA',
};

function leerPagos(cruda: z.infer<typeof pagosCrudosSchema> | null | undefined): PagosDeLaPersona | null {
  if (!cruda) return null;
  if (cruda.mode === 'NONE') return { modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null };
  if (cruda.mode !== 'SCHEDULE') return null;
  const cuotas = (cruda.installments ?? []).flatMap(c => {
    const cuota = leerCuota(c);
    return cuota ? [cuota] : [];
  });
  return {
    modo: 'CON_CRONOGRAMA',
    moneda: esMoneda(cruda.currency) ? cruda.currency : null,
    cuotas,
    confirmacion: {
      estado: ESTADOS_DE_CONFIRMACION[cruda.confirmation?.state ?? ''] ?? 'SIN_CONFIRMAR',
      confirmadaEn: cruda.confirmation?.confirmedAt ?? null,
      nombre: cruda.confirmation?.name ?? null,
    },
  };
}

/** `GET /me/ingreso` ya leído. Un paso con una clave que la app no conoce no se dibuja. */
export function leerMiIngreso(cruda: unknown): MiIngreso | null {
  const leida = miIngresoCrudoSchema.safeParse(cruda);
  if (!leida.success) return null;
  const pasos = (leida.data.steps ?? []).flatMap(p => {
    const paso = pasoCrudoSchema.safeParse(p);
    const clave = paso.success ? CLAVES_DE_PASO[paso.data.key] : undefined;
    return paso.success && clave ? [{ clave, hecho: paso.data.done === true }] : [];
  });
  return { pasos, pagos: leerPagos(leida.data.payments) };
}

/** `GET /admin/pagos/personas/{id}` (y todas sus escrituras) ya leído. */
export function leerPagosEnLaFicha(cruda: unknown): PagosEnLaFicha | null {
  const leida = pagosDeLaPersonaCrudoSchema.safeParse(cruda);
  if (!leida.success) return null;
  return { nombre: leida.data.personName ?? null, pagos: leerPagos(leida.data.payments) };
}
