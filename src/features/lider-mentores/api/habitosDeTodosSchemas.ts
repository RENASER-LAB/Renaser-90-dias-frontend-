import { z } from 'zod';

import type {
  EstadoEnUnHabito,
  HabitoDeTodos,
  HabitosDeTodos,
  MotivoSinDatos,
  PersonaEnUnHabito,
  PersonasDeUnHabito,
  TotalesDelDia,
} from '../types/habitosDeTodos.types';

/**
 * Validación de `GET /api/v1/leadership/habits` y `…/habits/{id}/people` (spec 029). Mismo criterio que el resto del
 * liderazgo: `.nullish()` en todo lo que no es imprescindible, campos desconocidos tolerados y **una fila rota se pierde
 * sola, no la lista**: los hábitos y las personas se validan uno por uno. Lo único imprescindible de un hábito es su id; de
 * una persona, su id; del día, su fecha.
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const habitoSchema = z
  .object({
    habitId: z.string().trim().min(1),
    title: z.string().nullish(),
    category: z.string().nullish(),
    categoryKey: z.string().nullish(),
    categoryName: z.string().nullish(),
    formation: z.string().nullish(),
    expected: z.number().nullish(),
    done: z.number().nullish(),
    pending: z.number().nullish(),
    missed: z.number().nullish(),
  })
  .passthrough();

const totalesSchema = z
  .object({
    students: z.number().nullish(),
    withHabits: z.number().nullish(),
    expected: z.number().nullish(),
    done: z.number().nullish(),
    pending: z.number().nullish(),
    missed: z.number().nullish(),
  })
  .passthrough();

const diaSchema = z
  .object({
    date: z.string().regex(FECHA),
    isToday: z.boolean().nullish(),
    earliest: z.string().nullish(),
    latest: z.string().nullish(),
    totals: totalesSchema.nullish(),
    habits: z.array(z.unknown()),
  })
  .passthrough();

const personaSchema = z
  .object({
    personId: z.string().trim().min(1),
    name: z.string().nullish(),
    photoPath: z.string().nullish(),
    groupId: z.string().nullish(),
    groupName: z.string().nullish(),
    status: z.string().nullish(),
    reason: z.string().nullish(),
    plannedTime: z.string().nullish(),
    doneAt: z.string().nullish(),
    evidenceId: z.string().nullish(),
  })
  .passthrough();

const personasSchema = z
  .object({
    date: z.string().regex(FECHA),
    isToday: z.boolean().nullish(),
    habit: z.unknown().nullish(),
    page: z.number().nullish(),
    size: z.number().nullish(),
    total: z.number().nullish(),
    people: z.array(z.unknown()),
  })
  .passthrough();

export const SIN_NOMBRE_DE_PERSONA = 'Persona sin nombre';
export const HABITO_SIN_NOMBRE = 'Hábito sin nombre';

function limpio(valor: string | null | undefined): string | null {
  const texto = valor?.trim();
  return texto ? texto : null;
}

/** Un conteo: un entero no negativo; cualquier otra cosa (falta, negativo, decimal) es 0. */
function conteo(valor: number | null | undefined): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 ? valor : 0;
}

function entero(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 ? valor : null;
}

/** `HH:mm:ss` o `HH:mm` → `HH:mm`; otra cosa = `null` (no se dibuja una hora que no se entiende). */
export function horaCorta(valor: string | null | undefined): string | null {
  const texto = valor?.trim();
  const m = texto ? /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(texto) : null;
  return m ? `${m[1]}:${m[2]}` : null;
}

const ESTADOS: readonly EstadoEnUnHabito[] = ['CUMPLIDO', 'PENDIENTE', 'SIN_CUMPLIR', 'SIN_DATOS'];
const MOTIVOS: readonly MotivoSinDatos[] = ['NO_EXIGIBLE', 'NO_LE_TOCABA', 'ANTES_DEL_DIA_1'];

/** Un estado que no se conoce NUNCA se lee como una falta: es «sin datos». */
export function estadoDe(valor: string | null | undefined): EstadoEnUnHabito {
  const texto = valor?.trim().toUpperCase();
  return ESTADOS.find(e => e === texto) ?? 'SIN_DATOS';
}

function motivoDe(valor: string | null | undefined): MotivoSinDatos | null {
  const texto = valor?.trim().toUpperCase();
  return MOTIVOS.find(m => m === texto) ?? null;
}

export function aHabito(crudo: z.infer<typeof habitoSchema>): HabitoDeTodos {
  const cumplieron = conteo(crudo.done);
  const pendientes = conteo(crudo.pending);
  const sinCumplir = conteo(crudo.missed);
  const suma = cumplieron + pendientes + sinCumplir;
  return {
    habitoId: crudo.habitId.trim(),
    titulo: limpio(crudo.title) ?? HABITO_SIN_NOMBRE,
    categoria: limpio(crudo.category) ?? '',
    categoriaClave: limpio(crudo.categoryKey),
    nombreDeLaCategoria: limpio(crudo.categoryName),
    formacion: limpio(crudo.formation),
    /* Lo esperado es la suma de los tres; si el servidor la manda y no coincide, manda la suma (es lo que se dibuja). */
    esperados: suma > 0 ? suma : conteo(crudo.expected),
    cumplieron,
    pendientes,
    sinCumplir,
  };
}

function aPersona(crudo: z.infer<typeof personaSchema>): PersonaEnUnHabito {
  const estado = estadoDe(crudo.status);
  return {
    personaId: crudo.personId.trim(),
    nombre: limpio(crudo.name) ?? SIN_NOMBRE_DE_PERSONA,
    fotoPath: limpio(crudo.photoPath),
    grupoId: limpio(crudo.groupId),
    grupoNombre: limpio(crudo.groupName),
    estado,
    motivo: estado === 'SIN_DATOS' ? motivoDe(crudo.reason) : null,
    horaPlanificada: horaCorta(crudo.plannedTime),
    cumplioA: horaCorta(crudo.doneAt),
    evidenciaId: limpio(crudo.evidenceId),
  };
}

function fallo(origen: string, error: z.ZodError): Error {
  const detalle = error.issues
    .slice(0, 3)
    .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
    .join(' | ');
  return new Error(`Respuesta inesperada de ${origen} — ${detalle}`);
}

function totalesDe(crudo: z.infer<typeof totalesSchema> | null | undefined, habitos: HabitoDeTodos[]): TotalesDelDia {
  const suma = (campo: 'esperados' | 'cumplieron' | 'pendientes' | 'sinCumplir') => habitos.reduce((n, h) => n + h[campo], 0);
  /* Lo que el servidor no dijo se calcula de la lista; los alumnos no se pueden calcular: sin dato son 0 y no se dibujan. */
  return {
    alumnos: conteo(crudo?.students),
    conHabitos: conteo(crudo?.withHabits),
    esperados: crudo?.expected != null ? conteo(crudo.expected) : suma('esperados'),
    cumplieron: crudo?.done != null ? conteo(crudo.done) : suma('cumplieron'),
    pendientes: crudo?.pending != null ? conteo(crudo.pending) : suma('pendientes'),
    sinCumplir: crudo?.missed != null ? conteo(crudo.missed) : suma('sinCumplir'),
  };
}

function fechaValida(valor: string | null | undefined): string | null {
  const texto = valor?.trim();
  return texto && FECHA.test(texto) ? texto : null;
}

export function leerHabitosDeTodos(respuesta: unknown, origen: string): HabitosDeTodos {
  const resultado = diaSchema.safeParse(respuesta);
  if (!resultado.success) throw fallo(origen, resultado.error);
  const crudo = resultado.data;
  const habitos: HabitoDeTodos[] = [];
  for (const fila of crudo.habits) {
    const buena = habitoSchema.safeParse(fila);
    if (buena.success) habitos.push(aHabito(buena.data));
  }
  const esHoy = crudo.isToday === true;
  return {
    fecha: crudo.date,
    esHoy,
    masAntigua: fechaValida(crudo.earliest),
    /* Si es hoy y el servidor no dijo hasta dónde se puede ir, el límite de adelante es el propio día. */
    masReciente: fechaValida(crudo.latest) ?? (esHoy ? crudo.date : null),
    totales: totalesDe(crudo.totals, habitos),
    habitos,
  };
}

export function leerPersonasDeUnHabito(
  respuesta: unknown,
  pedido: { pagina: number; tamano: number },
  origen: string,
): PersonasDeUnHabito {
  const resultado = personasSchema.safeParse(respuesta);
  if (!resultado.success) throw fallo(origen, resultado.error);
  const crudo = resultado.data;
  const personas: PersonaEnUnHabito[] = [];
  for (const fila of crudo.people) {
    const buena = personaSchema.safeParse(fila);
    if (buena.success) personas.push(aPersona(buena.data));
  }
  const habito = habitoSchema.safeParse(crudo.habit);
  const pagina = entero(crudo.page) ?? pedido.pagina;
  const tamano = (entero(crudo.size) ?? 0) > 0 ? (crudo.size as number) : pedido.tamano;
  const total = entero(crudo.total);
  /* Si el servidor no dice cuántos hay, hay más cuando la página vino llena (las filas rotas también ocuparon su lugar). */
  const hayMas = crudo.people.length === 0 ? false : total !== null ? (pagina + 1) * tamano < total : crudo.people.length >= tamano;
  return {
    fecha: crudo.date,
    esHoy: crudo.isToday === true,
    habito: habito.success ? aHabito(habito.data) : null,
    pagina,
    tamano,
    total,
    hayMas,
    personas,
  };
}
