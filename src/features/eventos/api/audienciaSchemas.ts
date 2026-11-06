import { z } from 'zod';

import type {
  ColorDelSemaforo,
  OpcionesDeAudiencia,
  PersonaConvocable,
  ResumenDeAudiencia,
  TipoDeParte,
} from '../types/audiencia.types';

/** Spec 044: la audiencia elegida en el cable, leída una vez y tolerante (una fila rota se pierde ella). Puro: sin red. */

const PARTES: readonly TipoDeParte[] = ['PERSON', 'MY_LEARNERS', 'GROUP', 'MENTORS', 'TRAFFIC_LIGHT', 'STAFF'];
const COLORES: readonly ColorDelSemaforo[] = ['GREEN', 'YELLOW', 'RED'];

export function esParte(valor: unknown): valor is TipoDeParte {
  return typeof valor === 'string' && (PARTES as readonly string[]).includes(valor);
}

export function esColor(valor: unknown): valor is ColorDelSemaforo {
  return typeof valor === 'string' && (COLORES as readonly string[]).includes(valor);
}

const personaSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().nullish(),
    photoUrl: z.string().nullish(),
    role: z.string().nullish(),
    groupName: z.string().nullish(),
  })
  .passthrough();

export function aPersona(crudo: z.infer<typeof personaSchema>): PersonaConvocable {
  return {
    id: crudo.id,
    nombre: crudo.name?.trim() || 'Persona sin nombre',
    fotoUrl: crudo.photoUrl && /^https?:\/\//.test(crudo.photoUrl) ? crudo.photoUrl : null,
    rol: crudo.role?.trim() || null,
    grupo: crudo.groupName?.trim() || null,
  };
}

/** Una lista que tolera filas rotas: la fila rota se pierde ella, no la lista. */
function listaTolerante<T>(datos: unknown, leer: (fila: unknown) => T | null): T[] {
  if (!Array.isArray(datos)) return [];
  return datos.map(leer).filter((x): x is T => x !== null);
}

function leerPersona(fila: unknown): PersonaConvocable | null {
  const r = personaSchema.safeParse(fila);
  return r.success ? aPersona(r.data) : null;
}

export const personaTolerante = leerPersona;

const opcionesSchema = z
  .object({
    canCreate: z.boolean().catch(false),
    parts: z.array(z.unknown()).catch([]),
    eventTypes: z.array(z.string()).catch([]),
    defaultPart: z.unknown().optional(),
    canChooseAll: z.boolean().catch(false),
    trafficLight: z.record(z.string(), z.number()).catch({}),
    myLearners: z.number().catch(0),
    groups: z.array(z.unknown()).catch([]),
    staff: z.array(z.unknown()).catch([]),
  })
  .passthrough();

const grupoSchema = z.object({ id: z.string().min(1), name: z.string().nullish(), members: z.number().nullish() }).passthrough();

export const SIN_OPCIONES: OpcionesDeAudiencia = {
  puedeCrear: false,
  partes: [],
  tiposDeEvento: [],
  porDefecto: null,
  todos: false,
  colores: { GREEN: 0, YELLOW: 0, RED: 0 },
  misAlumnos: 0,
  grupos: [],
  personal: [],
};

export function leerOpciones(datos: unknown): OpcionesDeAudiencia {
  const r = opcionesSchema.safeParse(datos);
  if (!r.success) return SIN_OPCIONES;
  const o = r.data;
  return {
    puedeCrear: o.canCreate,
    partes: o.parts.filter(esParte),
    tiposDeEvento: o.eventTypes,
    porDefecto: esParte(o.defaultPart) ? o.defaultPart : null,
    todos: o.canChooseAll,
    colores: { GREEN: o.trafficLight.GREEN ?? 0, YELLOW: o.trafficLight.YELLOW ?? 0, RED: o.trafficLight.RED ?? 0 },
    misAlumnos: o.myLearners,
    grupos: listaTolerante(o.groups, fila => {
      const g = grupoSchema.safeParse(fila);
      return g.success ? { id: g.data.id, nombre: g.data.name?.trim() || 'Grupo', integrantes: g.data.members ?? 0 } : null;
    }),
    personal: listaTolerante(o.staff, leerPersona),
  };
}

const parteDelResumenSchema = z
  .object({
    kind: z.unknown(),
    id: z.string().nullish(),
    name: z.string().nullish(),
    color: z.unknown().optional(),
    count: z.number().catch(0),
    resolvedAt: z.string().nullish(),
    people: z.array(z.unknown()).catch([]),
  })
  .passthrough();

/** «Para quién es» del cable, tolerante: una parte que no se entiende se pierde ella. `null` si no vino (FR-016). */
export function leerResumen(datos: unknown): ResumenDeAudiencia | null {
  if (!datos || typeof datos !== 'object') return null;
  const crudo = datos as { parts?: unknown; total?: unknown };
  const partes = listaTolerante(crudo.parts, fila => {
    const p = parteDelResumenSchema.safeParse(fila);
    if (!p.success || !esParte(p.data.kind)) return null;
    return {
      tipo: p.data.kind,
      id: p.data.id ?? null,
      nombre: p.data.name?.trim() || null,
      color: esColor(p.data.color) ? p.data.color : null,
      cuantos: p.data.count,
      resueltoEn: p.data.resolvedAt ?? null,
      personas: listaTolerante(p.data.people, leerPersona),
    };
  });
  return { partes, total: typeof crudo.total === 'number' ? crudo.total : 0 };
}


export interface PaginaDePersonas {
  personas: PersonaConvocable[];
  pagina: number;
  hayMas: boolean;
}

export function listaDePersonas(datos: unknown, pagina: number): PaginaDePersonas {
  const crudo = (datos ?? {}) as { items?: unknown; page?: unknown; hasMore?: unknown };
  return {
    personas: listaTolerante(crudo.items, leerPersona),
    pagina: typeof crudo.page === 'number' ? crudo.page : pagina,
    hayMas: crudo.hasMore === true,
  };
}
