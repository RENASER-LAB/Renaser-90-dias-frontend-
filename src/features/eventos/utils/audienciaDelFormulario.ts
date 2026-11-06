import type {
  ColorDelSemaforo,
  OpcionesDeAudiencia,
  ParteDelCable,
  PersonaConvocable,
  ResumenDeAudiencia,
  TipoDeParte,
} from '../types/audiencia.types';

/**
 * Spec 044: lo que la persona elige en «¿Para quién es?» y cómo viaja al servidor. Puro: lo prueban sin pantalla. Quién puede elegir qué lo dice
 * el servidor (`OpcionesDeAudiencia`); acá solo se arma lo elegido.
 */
export interface AudienciaDelFormulario {
  /** «Todos» (lo de siempre): solo Administración y Alquimista. Con `todos` el evento no lleva audiencia elegida. */
  todos: boolean;
  personas: PersonaConvocable[];
  misAlumnos: boolean;
  mentores: boolean;
  grupos: string[];
  colores: ColorDelSemaforo[];
  /** El personal por nombre. */
  personal: PersonaConvocable[];
  todoElPersonal: boolean;
  /** Solo al editar: tomar una foto nueva del semáforo («Volver a calcular», FR-011). */
  recalcular: boolean;
}

export const NADIE: AudienciaDelFormulario = {
  todos: false,
  personas: [],
  misAlumnos: false,
  mentores: false,
  grupos: [],
  colores: [],
  personal: [],
  todoElPersonal: false,
  recalcular: false,
};

/** Cómo abre el paso (FR-034): Administración en «Todos»; el mentor en «Mis alumnos»; el líder sin elección. */
export function audienciaInicial(opciones: OpcionesDeAudiencia): AudienciaDelFormulario {
  if (opciones.todos) return { ...NADIE, todos: true };
  if (opciones.porDefecto === 'MY_LEARNERS' && opciones.partes.includes('MY_LEARNERS')) return { ...NADIE, misAlumnos: true };
  return NADIE;
}

/** Al editar: lo que el evento ya tiene, leído del resumen que manda el servidor. */
export function audienciaDesdeElResumen(resumen: ResumenDeAudiencia): AudienciaDelFormulario {
  const a: AudienciaDelFormulario = { ...NADIE, personas: [], grupos: [], colores: [], personal: [] };
  for (const parte of resumen.partes) {
    if (parte.tipo === 'PERSON') a.personas = [...a.personas, ...parte.personas];
    else if (parte.tipo === 'MY_LEARNERS') a.misAlumnos = true;
    else if (parte.tipo === 'MENTORS') a.mentores = true;
    else if (parte.tipo === 'GROUP' && parte.id) a.grupos = [...a.grupos, parte.id];
    else if (parte.tipo === 'TRAFFIC_LIGHT' && parte.color) a.colores = [...a.colores, parte.color];
    else if (parte.tipo === 'STAFF') {
      if (parte.personas.length > 0) a.personal = [...a.personal, ...parte.personas];
      else a.todoElPersonal = true;
    }
  }
  return a;
}

/** Si se eligió algo (con «Todos» no hace falta más). */
export function eligioAlgo(a: AudienciaDelFormulario): boolean {
  return (
    a.todos ||
    a.personas.length > 0 ||
    a.misAlumnos ||
    a.mentores ||
    a.grupos.length > 0 ||
    a.colores.length > 0 ||
    a.personal.length > 0 ||
    a.todoElPersonal
  );
}

/** Las partes tal como viajan (contrato §1). Vacío con «Todos». */
export function partesDelCable(a: AudienciaDelFormulario): ParteDelCable[] {
  if (a.todos) return [];
  const partes: ParteDelCable[] = [];
  if (a.misAlumnos) partes.push({ kind: 'MY_LEARNERS' });
  if (a.mentores) partes.push({ kind: 'MENTORS' });
  a.grupos.forEach(id => partes.push({ kind: 'GROUP', id }));
  a.colores.forEach(color => partes.push({ kind: 'TRAFFIC_LIGHT', color }));
  a.personas.forEach(p => partes.push({ kind: 'PERSON', id: p.id }));
  if (a.todoElPersonal) partes.push({ kind: 'STAFF' });
  else a.personal.forEach(p => partes.push({ kind: 'STAFF', id: p.id }));
  return partes;
}

/** Lo que se suma al cuerpo de crear o editar (FR-030: al editar se manda siempre completo). */
export function camposDeAudiencia(a: AudienciaDelFormulario): Record<string, unknown> {
  if (a.todos) return { audienceType: 'ALL_MEMBERS', targetRoles: [] };
  return { audienceType: 'SELECTION', targetRoles: [], audience: { parts: partesDelCable(a), recalculate: a.recalcular } };
}

/** Marca o desmarca una parte (los chips de arriba). «Todos» es exclusivo: elegirlo limpia lo demás, y elegir otra cosa lo apaga. */
export function alternar(a: AudienciaDelFormulario, parte: TipoDeParte | 'ALL'): AudienciaDelFormulario {
  if (parte === 'ALL') return a.todos ? { ...NADIE } : { ...NADIE, todos: true };
  const base = { ...a, todos: false };
  if (parte === 'MY_LEARNERS') return { ...base, misAlumnos: !a.misAlumnos };
  if (parte === 'MENTORS') return { ...base, mentores: !a.mentores };
  return base;
}

export function alternarColor(a: AudienciaDelFormulario, color: ColorDelSemaforo): AudienciaDelFormulario {
  const colores = a.colores.includes(color) ? a.colores.filter(c => c !== color) : [...a.colores, color];
  return { ...a, todos: false, colores };
}

export function alternarGrupo(a: AudienciaDelFormulario, id: string): AudienciaDelFormulario {
  const grupos = a.grupos.includes(id) ? a.grupos.filter(g => g !== id) : [...a.grupos, id];
  return { ...a, todos: false, grupos };
}

export function alternarPersona(lista: PersonaConvocable[], persona: PersonaConvocable): PersonaConvocable[] {
  return lista.some(p => p.id === persona.id) ? lista.filter(p => p.id !== persona.id) : [...lista, persona];
}

/** El color en palabras, con su ayuda (nunca solo color: va con ícono y palabra, FR-033). */
export const COLORES: ReadonlyArray<{ clave: ColorDelSemaforo; nombre: string; ayuda: string }> = [
  { clave: 'GREEN', nombre: 'Verde', ayuda: 'Van bien' },
  { clave: 'YELLOW', nombre: 'Amarillo', ayuda: 'Necesitan un empujón' },
  { clave: 'RED', nombre: 'Rojo', ayuda: 'Necesitan tu ayuda' },
];

/** Los nombres de los chips. */
export const NOMBRE_DE_LA_PARTE: Record<TipoDeParte | 'ALL', string> = {
  ALL: 'Todos',
  PERSON: 'Personas',
  MY_LEARNERS: 'Mis alumnos',
  GROUP: 'Grupos',
  MENTORS: 'Mentores',
  TRAFFIC_LIGHT: 'Por semáforo',
  STAFF: 'Personal',
};

/** El orden de los chips: lo propio primero. */
export function partesEnOrden(opciones: OpcionesDeAudiencia): Array<TipoDeParte | 'ALL'> {
  const orden: TipoDeParte[] = ['MY_LEARNERS', 'PERSON', 'GROUP', 'MENTORS', 'TRAFFIC_LIGHT', 'STAFF'];
  return [...(opciones.todos ? (['ALL'] as const) : []), ...orden.filter(p => opciones.partes.includes(p))];
}

/** «Llega a 23 personas» / «Llega a 1 persona» / «Llega a 6 alumnos» (el mentor). */
export function textoLlegaA(total: number, soloAlumnos: boolean): string {
  if (soloAlumnos) return `Llega a ${total} ${total === 1 ? 'alumno' : 'alumnos'}`;
  return `Llega a ${total} ${total === 1 ? 'persona' : 'personas'}`;
}

/** «Te invitó Rocío, líder de mentores» (FR-019, S7): el primer nombre y el rol en minúscula. Sin datos, nada. */
export function lineaDelOrganizador(nombre: string | null | undefined, rol: string | null | undefined): string | null {
  const primero = nombre?.trim().split(/\s+/)[0];
  if (!primero) return null;
  const papel = rol?.trim();
  return papel ? `Te invitó ${primero}, ${papel.charAt(0).toLowerCase()}${papel.slice(1)}` : `Te invitó ${primero}`;
}

/** «Según el semáforo del 6 de noviembre» (la foto, P1). */
export function lineaDeLaFoto(resueltoEn: string | null, zona: string | null): string | null {
  if (!resueltoEn) return null;
  const fecha = new Date(resueltoEn);
  if (Number.isNaN(fecha.getTime())) return null;
  const texto = fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: zona ?? undefined });
  return `Según el semáforo del ${texto}`;
}
