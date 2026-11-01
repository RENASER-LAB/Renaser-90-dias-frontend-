import { z } from 'zod';

import { leerEscala } from '../../diagnostico/api/diagnosticoSchemas';
import type { DestinoDeLaPregunta, TipoDePregunta } from '../../diagnostico/types/diagnostico.types';
import type {
  AdvertenciaDeImportacion,
  BorradorDelDiagnostico,
  ErrorDeImportacion,
  FilaDeImportacion,
  PersonaOmitida,
  PreguntaAdmin,
  QuienPublico,
  ResultadoDeAsignar,
  ResultadoDeImportacion,
  ResultadoDePublicar,
  ResultadoDeQuitar,
  SeccionAdmin,
  VersionDelDiagnostico,
  VersionPublicada,
  VistaPreviaDeImportacion,
} from '../types/diagnosticoAdmin.types';

/**
 * Lo que manda el servidor a Administración (spec 026, contrato §5), leído con tolerancia (AGENTS.md: un APK publicado no se
 * rompe): una pregunta rota o de un tipo que esta app no sabe editar se pierde ELLA (y se cuenta, para avisarlo), no la pantalla;
 * un campo nuevo no rompe nada; un número que falta es 0, no un error.
 */

const TIPOS: readonly TipoDePregunta[] = [
  'TEXTO', 'AREA_TEXTO', 'NUMERO', 'SELECCION_UNICA', 'SELECCION_MULTIPLE', 'ESCALA', 'CUADRICULA', 'FECHA', 'CASILLA',
];
const DESTINOS: readonly DestinoDeLaPregunta[] = [
  'OBJETIVO_CUERPO', 'OBJETIVO_NEGOCIO', 'OBJETIVO_RELACIONES', 'PRIORIDAD_PRINCIPAL', 'PRIMERA_ACCION', 'TRATO_DE_LA_PERSONA',
  'META_CUERPO', 'UNIDAD_CUERPO', 'PARTIDA_CUERPO', 'META_NEGOCIO', 'UNIDAD_NEGOCIO', 'PARTIDA_NEGOCIO', 'META_RELACIONES', 'PARTIDA_RELACIONES',
];

const quienSchema = z.object({ id: z.union([z.string(), z.number()]).transform(String), nombre: z.string().nullish() }).passthrough();

function leerQuien(dato: unknown): QuienPublico | null {
  const r = quienSchema.safeParse(dato);
  return r.success ? { id: r.data.id, nombre: r.data.nombre?.trim() || 'Alguien del equipo' } : null;
}

const opcionSchema = z.object({ valor: z.string().nullish(), etiqueta: z.string() }).passthrough();
const condicionSchema = z.object({ preguntaId: z.number(), valor: z.string() }).passthrough();

const preguntaSchema = z
  .object({
    id: z.number(),
    clave: z.string().nullish(),
    orden: z.number().nullish(),
    seccionId: z.number().nullish(),
    estado: z.string().nullish(),
    protegida: z.boolean().nullish(),
    respuestas: z.number().nullish(),
    texto: z.string(),
    ayuda: z.string().nullish(),
    tipo: z.string(),
    requerida: z.boolean().nullish(),
    maximoOpciones: z.number().nullish(),
    opciones: z.array(z.unknown()).nullish(),
    escala: z.unknown().nullish(),
    seMuestraSi: z.unknown().nullish(),
    alimenta: z.string().nullish(),
    formaciones: z.array(z.string()).nullish(),
    precarga: z.string().nullish(),
  })
  .passthrough();

/** Una pregunta del borrador; `null` si está rota o es de un tipo que esta versión no sabe editar. */
export function leerPreguntaAdmin(dato: unknown, seccionPorDefecto = 0): PreguntaAdmin | null {
  const r = preguntaSchema.safeParse(dato);
  if (!r.success) return null;
  const p = r.data;
  const tipo = TIPOS.find(t => t === p.tipo);
  if (!tipo) return null;
  const opciones = (p.opciones ?? []).flatMap(o => {
    const una = opcionSchema.safeParse(o);
    // Sin `valor` el valor ES la etiqueta (contrato §5).
    return una.success ? [{ valor: una.data.valor ?? una.data.etiqueta, etiqueta: una.data.etiqueta }] : [];
  });
  const condicion = condicionSchema.safeParse(p.seMuestraSi);
  const formaciones = p.formaciones && p.formaciones.length > 0 ? p.formaciones : null;
  return {
    id: p.id,
    clave: p.clave ?? `p${p.id}`,
    orden: p.orden ?? 0,
    seccionId: p.seccionId ?? seccionPorDefecto,
    estado: p.estado === 'RETIRADA' ? 'RETIRADA' : 'ACTIVA',
    protegida: p.protegida === true,
    respuestas: Math.max(0, p.respuestas ?? 0),
    texto: p.texto,
    ayuda: p.ayuda && p.ayuda.trim() ? p.ayuda : null,
    tipo,
    requerida: p.requerida === true,
    maximoOpciones: p.maximoOpciones ?? null,
    opciones,
    escala: leerEscala(p.escala),
    seMuestraSi: condicion.success ? { preguntaId: condicion.data.preguntaId, valor: condicion.data.valor } : null,
    alimenta: DESTINOS.find(d => d === p.alimenta) ?? null,
    formaciones,
    precarga: p.precarga && p.precarga.trim() ? p.precarga : null,
  };
}

const seccionSchema = z
  .object({
    id: z.number(),
    clave: z.string().nullish(),
    titulo: z.string().nullish(),
    descripcion: z.string().nullish(),
    orden: z.number().nullish(),
    esPortada: z.boolean().nullish(),
    preguntas: z.array(z.unknown()).nullish(),
  })
  .passthrough();

/** Una sección con sus preguntas, y cuántas preguntas suyas no se pudieron leer. */
export function leerSeccionAdmin(dato: unknown): { seccion: SeccionAdmin; noEntendidas: number } | null {
  const r = seccionSchema.safeParse(dato);
  if (!r.success) return null;
  const s = r.data;
  let noEntendidas = 0;
  const preguntas = (s.preguntas ?? []).flatMap(p => {
    const una = leerPreguntaAdmin(p, s.id);
    if (!una) {
      noEntendidas += 1;
      return [];
    }
    return [una];
  });
  return {
    seccion: {
      id: s.id,
      clave: s.clave ?? `seccion-${s.id}`,
      titulo: s.titulo?.trim() || 'Sección sin título',
      descripcion: s.descripcion && s.descripcion.trim() ? s.descripcion : null,
      orden: s.orden ?? 0,
      esPortada: s.esPortada === true,
      preguntas,
    },
    noEntendidas,
  };
}

/** La respuesta de crear o editar una sección (sin preguntas), o `null` si no es una sección. */
export function leerSeccionSola(dato: unknown): SeccionAdmin | null {
  return leerSeccionAdmin(dato)?.seccion ?? null;
}

const publicadaSchema = z
  .object({ version: z.number(), publicadaEn: z.string().nullish(), publicadaPor: z.unknown().nullish() })
  .passthrough();

function leerPublicada(dato: unknown): VersionPublicada | null {
  const r = publicadaSchema.safeParse(dato);
  return r.success
    ? { version: r.data.version, publicadaEn: r.data.publicadaEn ?? null, publicadaPor: leerQuien(r.data.publicadaPor) }
    : null;
}

const borradorSchema = z
  .object({
    publicada: z.unknown().nullish(),
    hayCambiosSinPublicar: z.boolean().nullish(),
    puedePublicar: z.object({ ok: z.boolean().nullish(), motivos: z.array(z.string()).nullish() }).passthrough().nullish(),
    secciones: z.array(z.unknown()).nullish(),
    retiradas: z.array(z.unknown()).nullish(),
    totales: z.object({ secciones: z.number().nullish(), preguntas: z.number().nullish() }).passthrough().nullish(),
  })
  .passthrough();

/** El borrador completo, o `null` si lo que llegó no es un borrador (un backend anterior o un cuerpo raro). */
export function leerBorrador(dato: unknown): BorradorDelDiagnostico | null {
  const r = borradorSchema.safeParse(dato);
  if (!r.success) return null;
  const b = r.data;
  let noEntendidas = 0;
  const secciones = (b.secciones ?? []).flatMap(s => {
    const una = leerSeccionAdmin(s);
    if (!una) return [];
    noEntendidas += una.noEntendidas;
    return [una.seccion];
  });
  secciones.sort((x, y) => x.orden - y.orden);
  for (const s of secciones) s.preguntas.sort((x, y) => x.orden - y.orden);
  const retiradas = (b.retiradas ?? []).flatMap(p => {
    const una = leerPreguntaAdmin(p);
    if (!una) {
      noEntendidas += 1;
      return [];
    }
    return [{ ...una, estado: 'RETIRADA' as const }];
  });
  const motivos = (b.puedePublicar?.motivos ?? []).filter(m => m.trim());
  const preguntasActivas = secciones.reduce((suma, s) => suma + s.preguntas.length, 0);
  return {
    publicada: leerPublicada(b.publicada),
    hayCambiosSinPublicar: b.hayCambiosSinPublicar === true,
    // Si el servidor no dice que se puede, no se asume: con motivos o `ok:false` el botón queda apagado.
    puedePublicar: { ok: b.puedePublicar ? b.puedePublicar.ok !== false && motivos.length === 0 : true, motivos },
    secciones,
    retiradas,
    totales: {
      secciones: b.totales?.secciones ?? secciones.filter(s => !s.esPortada).length,
      preguntas: b.totales?.preguntas ?? preguntasActivas,
    },
    noEntendidas,
  };
}

const quitarSchema = z
  .object({ eliminadas: z.number().nullish(), retiradas: z.number().nullish(), conRespuestas: z.number().nullish() })
  .passthrough();

export function leerResultadoDeQuitar(dato: unknown): ResultadoDeQuitar {
  const r = quitarSchema.safeParse(dato);
  return {
    eliminadas: r.success ? (r.data.eliminadas ?? 0) : 0,
    retiradas: r.success ? (r.data.retiradas ?? 0) : 0,
    conRespuestas: r.success ? (r.data.conRespuestas ?? 0) : 0,
  };
}

const publicarSchema = z
  .object({ version: z.number(), publicadaEn: z.string().nullish(), publicadaPor: z.unknown().nullish() })
  .passthrough();

export function leerResultadoDePublicar(dato: unknown): ResultadoDePublicar | null {
  const r = publicarSchema.safeParse(dato);
  return r.success
    ? { version: r.data.version, publicadaEn: r.data.publicadaEn ?? null, publicadaPor: leerQuien(r.data.publicadaPor) }
    : null;
}

const versionSchema = z
  .object({ version: z.number(), publicadaEn: z.string().nullish(), publicadaPor: z.unknown().nullish(), preguntas: z.number().nullish() })
  .passthrough();

export function leerVersiones(dato: unknown): VersionDelDiagnostico[] {
  if (!Array.isArray(dato)) return [];
  return dato.flatMap(d => {
    const r = versionSchema.safeParse(d);
    return r.success
      ? [{ version: r.data.version, publicadaEn: r.data.publicadaEn ?? null, publicadaPor: leerQuien(r.data.publicadaPor), preguntas: r.data.preguntas ?? 0 }]
      : [];
  });
}

const filaSchema = z
  .object({
    numero: z.number(),
    seccion: z.string().nullish(),
    clave: z.string().nullish(),
    texto: z.string().nullish(),
    tipo: z.string().nullish(),
  })
  .passthrough();
const errorSchema = z
  .object({ fila: z.number().nullish(), columna: z.string().nullish(), mensaje: z.string().nullish() })
  .passthrough();
const advertenciaSchema = z.object({ fila: z.number().nullish(), mensaje: z.string().nullish() }).passthrough();
const vistaPreviaSchema = z
  .object({
    secciones: z.number().nullish(),
    preguntas: z.number().nullish(),
    filas: z.array(z.unknown()).nullish(),
    errores: z.array(z.unknown()).nullish(),
    advertencias: z.array(z.unknown()).nullish(),
    preguntasQueSeRetirarian: z.number().nullish(),
    conRespuestas: z.number().nullish(),
  })
  .passthrough();

/** Los errores por fila, en el orden del archivo. Una entrada rota se pierde sola. */
export function leerErroresDeImportacion(dato: unknown): ErrorDeImportacion[] {
  if (!Array.isArray(dato)) return [];
  return dato.flatMap(d => {
    const r = errorSchema.safeParse(d);
    return r.success && r.data.mensaje
      ? [{ fila: r.data.fila ?? 0, columna: r.data.columna?.trim() || null, mensaje: r.data.mensaje }]
      : [];
  });
}

export function leerVistaPreviaDeImportacion(dato: unknown): VistaPreviaDeImportacion | null {
  const r = vistaPreviaSchema.safeParse(dato);
  if (!r.success) return null;
  const v = r.data;
  const filas: FilaDeImportacion[] = (v.filas ?? []).flatMap(f => {
    const una = filaSchema.safeParse(f);
    return una.success
      ? [{ numero: una.data.numero, seccion: una.data.seccion ?? '', clave: una.data.clave ?? '', texto: una.data.texto ?? '', tipo: una.data.tipo ?? '' }]
      : [];
  });
  const advertencias: AdvertenciaDeImportacion[] = (v.advertencias ?? []).flatMap(a => {
    const una = advertenciaSchema.safeParse(a);
    return una.success && una.data.mensaje ? [{ fila: una.data.fila ?? 0, mensaje: una.data.mensaje }] : [];
  });
  return {
    secciones: v.secciones ?? 0,
    preguntas: v.preguntas ?? 0,
    filas,
    errores: leerErroresDeImportacion(v.errores),
    advertencias,
    preguntasQueSeRetirarian: v.preguntasQueSeRetirarian ?? 0,
    conRespuestas: v.conRespuestas ?? 0,
  };
}

const importacionSchema = z
  .object({ secciones: z.number().nullish(), preguntas: z.number().nullish(), eliminadas: z.number().nullish(), retiradas: z.number().nullish() })
  .passthrough();

export function leerResultadoDeImportacion(dato: unknown): ResultadoDeImportacion {
  const r = importacionSchema.safeParse(dato);
  return {
    secciones: r.success ? (r.data.secciones ?? 0) : 0,
    preguntas: r.success ? (r.data.preguntas ?? 0) : 0,
    eliminadas: r.success ? (r.data.eliminadas ?? 0) : 0,
    retiradas: r.success ? (r.data.retiradas ?? 0) : 0,
  };
}

const omitidaSchema = z
  .object({ id: z.union([z.string(), z.number()]).transform(String), nombre: z.string().nullish(), motivo: z.string().nullish() })
  .passthrough();
const asignarSchema = z.object({ asignadas: z.number().nullish(), omitidas: z.array(z.unknown()).nullish() }).passthrough();

export function leerResultadoDeAsignar(dato: unknown): ResultadoDeAsignar {
  const r = asignarSchema.safeParse(dato);
  const omitidas: PersonaOmitida[] = r.success
    ? (r.data.omitidas ?? []).flatMap(o => {
        const una = omitidaSchema.safeParse(o);
        return una.success
          ? [{ id: una.data.id, nombre: una.data.nombre?.trim() || 'Persona sin nombre', motivo: una.data.motivo?.trim() || 'No se pudo cambiar su ficha.' }]
          : [];
      })
    : [];
  return { asignadas: r.success ? (r.data.asignadas ?? 0) : 0, omitidas };
}
