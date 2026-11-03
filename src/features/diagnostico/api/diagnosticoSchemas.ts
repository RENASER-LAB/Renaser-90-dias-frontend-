import { z } from 'zod';

import type {
  CondicionDeLaPregunta,
  DestinoDeLaPregunta,
  DiagnosticoParaLaPersona,
  EjeDelObjetivo,
  EscalaDeLaPregunta,
  EstadoDeMiDiagnostico,
  EstadoDelDiagnostico,
  LecturaDelDiagnostico,
  PreguntaDelDiagnostico,
  PreguntaLeida,
  ResultadoDeTerminar,
  ResumenDeMiDiagnostico,
  RespuestaDelDiagnostico,
  SeccionDelDiagnostico,
  TipoDePregunta,
} from '../types/diagnostico.types';

/**
 * Lo que manda el servidor del diagnóstico (spec 026), leído con tolerancia (AGENTS.md: un APK publicado no se rompe):
 * una pregunta rota o de un tipo que esta app no conoce se pierde ELLA, no el diagnóstico; un campo nuevo no rompe nada.
 */

const TIPOS: readonly TipoDePregunta[] = [
  'TEXTO', 'AREA_TEXTO', 'NUMERO', 'SELECCION_UNICA', 'SELECCION_MULTIPLE', 'ESCALA', 'CUADRICULA', 'FECHA', 'CASILLA',
];
const DESTINOS: readonly DestinoDeLaPregunta[] = [
  'OBJETIVO_CUERPO', 'OBJETIVO_NEGOCIO', 'OBJETIVO_RELACIONES', 'PRIORIDAD_PRINCIPAL', 'PRIMERA_ACCION', 'TRATO_DE_LA_PERSONA',
  'META_CUERPO', 'UNIDAD_CUERPO', 'PARTIDA_CUERPO', 'META_NEGOCIO', 'UNIDAD_NEGOCIO', 'PARTIDA_NEGOCIO', 'META_RELACIONES', 'PARTIDA_RELACIONES',
];
const ESTADOS: readonly EstadoDelDiagnostico[] = ['NO_APLICA', 'PENDIENTE', 'EN_CURSO', 'COMPLETADO'];
const EJES: readonly EjeDelObjetivo[] = ['CUERPO', 'TRABAJO', 'RELACIONES'];

const opcionSchema = z.object({ valor: z.string(), etiqueta: z.string() }).passthrough();
const escalaSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    etiquetaMin: z.string().nullish(),
    etiquetaMax: z.string().nullish(),
  })
  .passthrough();
const condicionSchema = z.object({ preguntaId: z.number(), valor: z.string() }).passthrough();

const preguntaSchema = z
  .object({
    id: z.number(),
    clave: z.string().nullish(),
    texto: z.string(),
    ayuda: z.string().nullish(),
    tipo: z.string(),
    requerida: z.boolean().nullish(),
    maximoOpciones: z.number().nullish(),
    largoMaximo: z.number().nullish(),
    opciones: z.array(z.unknown()).nullish(),
    escala: z.unknown().nullish(),
    seMuestraSi: z.unknown().nullish(),
    alimenta: z.string().nullish(),
    precarga: z.string().nullish(),
  })
  .passthrough();

export function leerEscala(dato: unknown): EscalaDeLaPregunta | null {
  const r = escalaSchema.safeParse(dato);
  if (!r.success) return null;
  return { min: r.data.min, max: r.data.max, etiquetaMin: r.data.etiquetaMin ?? null, etiquetaMax: r.data.etiquetaMax ?? null };
}

function leerCondicion(dato: unknown): CondicionDeLaPregunta | null {
  const r = condicionSchema.safeParse(dato);
  return r.success ? { preguntaId: r.data.preguntaId, valor: r.data.valor } : null;
}

/** Una pregunta; `null` si está rota o es de un tipo que esta app no sabe dibujar. */
export function leerPregunta(dato: unknown): PreguntaDelDiagnostico | null {
  const r = preguntaSchema.safeParse(dato);
  if (!r.success) return null;
  const p = r.data;
  const tipo = TIPOS.find(t => t === p.tipo);
  if (!tipo) return null;
  const opciones = (p.opciones ?? []).flatMap(o => {
    const una = opcionSchema.safeParse(o);
    return una.success ? [{ valor: una.data.valor, etiqueta: una.data.etiqueta }] : [];
  });
  const alimenta = DESTINOS.find(d => d === p.alimenta) ?? null;
  return {
    id: p.id,
    clave: p.clave ?? `p${p.id}`,
    texto: p.texto,
    ayuda: p.ayuda && p.ayuda.trim() ? p.ayuda : null,
    tipo,
    requerida: p.requerida === true,
    maximoOpciones: p.maximoOpciones ?? null,
    largoMaximo: p.largoMaximo ?? null,
    opciones,
    escala: leerEscala(p.escala),
    seMuestraSi: leerCondicion(p.seMuestraSi),
    alimenta,
    precarga: p.precarga && p.precarga.trim() ? p.precarga : null,
  };
}

const seccionSchema = z
  .object({ clave: z.string().nullish(), titulo: z.string(), descripcion: z.string().nullish(), preguntas: z.array(z.unknown()).nullish() })
  .passthrough();

export function leerSecciones(dato: unknown): SeccionDelDiagnostico[] {
  if (!Array.isArray(dato)) return [];
  return dato.flatMap((s, i) => {
    const r = seccionSchema.safeParse(s);
    if (!r.success) return [];
    const preguntas = (r.data.preguntas ?? []).flatMap(p => {
      const una = leerPregunta(p);
      return una ? [una] : [];
    });
    return [{ clave: r.data.clave ?? `seccion-${i}`, titulo: r.data.titulo, descripcion: r.data.descripcion ?? null, preguntas }];
  });
}

const respuestaSchema = z
  .object({
    preguntaId: z.number(),
    valorTexto: z.string().nullish(),
    valorNumero: z.number().nullish(),
    valorBooleano: z.boolean().nullish(),
    valorEscala: z.number().nullish(),
    valorJson: z.string().nullish(),
  })
  .passthrough();

export function leerRespuestas(dato: unknown): RespuestaDelDiagnostico[] {
  if (!Array.isArray(dato)) return [];
  return dato.flatMap(d => {
    const r = respuestaSchema.safeParse(d);
    if (!r.success) return [];
    return [{
      preguntaId: r.data.preguntaId,
      valorTexto: r.data.valorTexto ?? null,
      valorNumero: r.data.valorNumero ?? null,
      valorBooleano: r.data.valorBooleano ?? null,
      valorEscala: r.data.valorEscala ?? null,
      valorJson: r.data.valorJson ?? null,
    }];
  });
}

const diagnosticoSchema = z
  .object({
    version: z.number().nullish(),
    estado: z.string().nullish(),
    titulo: z.string().nullish(),
    portada: z.object({ titulo: z.string().nullish(), mensaje: z.string().nullish() }).passthrough().nullish(),
    formacion: z.object({ codigo: z.string(), nombre: z.string() }).passthrough().nullish(),
    duracion: z.object({ dias: z.number(), texto: z.string() }).passthrough().nullish(),
    paso: z.number().nullish(),
    secciones: z.array(z.unknown()).nullish(),
    respuestas: z.array(z.unknown()).nullish(),
  })
  .passthrough();

function leerEstado(dato: unknown, porDefecto: EstadoDelDiagnostico): EstadoDelDiagnostico {
  return ESTADOS.find(e => e === dato) ?? porDefecto;
}

/** El diagnóstico de la persona (o la vista previa), o `null` si lo que llegó no es un diagnóstico. */
export function leerDiagnostico(dato: unknown): DiagnosticoParaLaPersona | null {
  const r = diagnosticoSchema.safeParse(dato);
  if (!r.success) return null;
  const d = r.data;
  const titulo = d.titulo?.trim() || 'Diagnóstico inicial';
  return {
    version: d.version ?? 0,
    estado: leerEstado(d.estado, 'EN_CURSO'),
    titulo,
    portada: { titulo: d.portada?.titulo?.trim() || titulo, mensaje: d.portada?.mensaje ?? null },
    formacion: d.formacion ? { codigo: d.formacion.codigo, nombre: d.formacion.nombre } : null,
    duracion: d.duracion ? { dias: d.duracion.dias, texto: d.duracion.texto } : { dias: 90, texto: '90 días' },
    paso: d.paso ?? null,
    secciones: leerSecciones(d.secciones).filter(s => s.preguntas.length > 0),
    respuestas: leerRespuestas(d.respuestas),
  };
}

const estadoSchema = z
  .object({ ficha: z.string().nullish(), estado: z.string().nullish(), version: z.number().nullish(), completedAt: z.string().nullish() })
  .passthrough();

/** Sin lectura (un backend anterior) la persona es de la ficha estándar: nada cambia para ella. */
export function leerEstadoDeMiDiagnostico(dato: unknown): EstadoDeMiDiagnostico {
  const r = estadoSchema.safeParse(dato);
  if (!r.success) return { ficha: 'ESTANDAR', estado: 'NO_APLICA', version: null, completedAt: null };
  return {
    ficha: r.data.ficha === 'CON_DIAGNOSTICO' ? 'CON_DIAGNOSTICO' : 'ESTANDAR',
    estado: leerEstado(r.data.estado, 'NO_APLICA'),
    version: r.data.version ?? null,
    completedAt: r.data.completedAt ?? null,
  };
}

const objetivoSchema = z.object({ eje: z.string(), texto: z.string() }).passthrough();

function leerObjetivos(dato: unknown) {
  if (!Array.isArray(dato)) return [];
  return dato.flatMap(o => {
    const r = objetivoSchema.safeParse(o);
    const eje = r.success ? EJES.find(e => e === r.data.eje) : undefined;
    return r.success && eje ? [{ eje, texto: r.data.texto }] : [];
  });
}

const resumenSchema = z
  .object({ completado: z.boolean().nullish(), prioridad: z.string().nullish(), primeraAccion: z.string().nullish(), objetivos: z.array(z.unknown()).nullish() })
  .passthrough();

export function leerResumenDeMiDiagnostico(dato: unknown): ResumenDeMiDiagnostico {
  const r = resumenSchema.safeParse(dato);
  if (!r.success) return { completado: false, prioridad: null, primeraAccion: null, objetivos: [] };
  return {
    completado: r.data.completado === true,
    prioridad: EJES.find(e => e === r.data.prioridad) ?? null,
    primeraAccion: r.data.primeraAccion?.trim() ? r.data.primeraAccion : null,
    objetivos: leerObjetivos(r.data.objetivos),
  };
}

export function leerResultadoDeTerminar(dato: unknown): ResultadoDeTerminar {
  const resumen = leerResumenDeMiDiagnostico(dato);
  const estado = leerEstado((dato as { estado?: unknown } | null)?.estado, 'COMPLETADO');
  return { estado, objetivos: resumen.objetivos, prioridad: resumen.prioridad, primeraAccion: resumen.primeraAccion };
}

const respuestaLegibleSchema = z
  .object({
    texto: z.string().nullish(),
    valores: z.array(z.string()).nullish(),
    filas: z.array(z.object({ etiqueta: z.string(), valor: z.number() }).passthrough()).nullish(),
  })
  .passthrough();

const preguntaLeidaSchema = z
  .object({
    id: z.number(),
    texto: z.string(),
    tipo: z.string(),
    retirada: z.boolean().nullish(),
    respuesta: z.unknown().nullish(),
    escala: z.unknown().nullish(),
  })
  .passthrough();

function leerPreguntaLeida(dato: unknown): PreguntaLeida | null {
  const r = preguntaLeidaSchema.safeParse(dato);
  if (!r.success) return null;
  const resp = respuestaLegibleSchema.safeParse(r.data.respuesta);
  return {
    id: r.data.id,
    texto: r.data.texto,
    tipo: r.data.tipo,
    retirada: r.data.retirada === true,
    escalaMax: leerEscala(r.data.escala)?.max ?? null,
    respuesta: resp.success
      ? { texto: resp.data.texto ?? null, valores: resp.data.valores ?? [], filas: (resp.data.filas ?? []).map(f => ({ etiqueta: f.etiqueta, valor: f.valor })) }
      : null,
  };
}

const lecturaSchema = z
  .object({
    persona: z.object({ id: z.string(), nombre: z.string() }).passthrough().nullish(),
    ficha: z.string().nullish(),
    estado: z.string().nullish(),
    version: z.number().nullish(),
    completadoEn: z.string().nullish(),
    formacion: z.object({ codigo: z.string(), nombre: z.string() }).passthrough().nullish(),
    secciones: z.array(z.unknown()).nullish(),
  })
  .passthrough();

/** La lectura del diagnóstico de alguien; sin nada que mostrar, `estado: 'NO_APLICA'` y sin secciones. */
export function leerLecturaDelDiagnostico(dato: unknown): LecturaDelDiagnostico {
  const r = lecturaSchema.safeParse(dato);
  if (!r.success) {
    return { persona: null, ficha: 'ESTANDAR', estado: 'NO_APLICA', version: null, completadoEn: null, formacion: null, secciones: [] };
  }
  const l = r.data;
  const secciones = (l.secciones ?? []).flatMap(s => {
    const una = z.object({ titulo: z.string(), preguntas: z.array(z.unknown()).nullish() }).passthrough().safeParse(s);
    if (!una.success) return [];
    const preguntas = (una.data.preguntas ?? []).flatMap(p => {
      const q = leerPreguntaLeida(p);
      return q ? [q] : [];
    });
    return preguntas.length > 0 ? [{ titulo: una.data.titulo, preguntas }] : [];
  });
  return {
    persona: l.persona ? { id: l.persona.id, nombre: l.persona.nombre } : null,
    ficha: l.ficha === 'CON_DIAGNOSTICO' ? 'CON_DIAGNOSTICO' : 'ESTANDAR',
    estado: leerEstado(l.estado, 'NO_APLICA'),
    version: l.version ?? null,
    completadoEn: l.completadoEn ?? null,
    formacion: l.formacion ? { codigo: l.formacion.codigo, nombre: l.formacion.nombre } : null,
    secciones,
  };
}
