import { z } from 'zod';

import { DURACION_POR_DEFECTO, TIPOS_DE_COMUNIDAD, type ComunidadDeLaFormacion, type DetalleDeFormacion, type FormacionDeLaSesion, type FormacionDeUnaPersona, type ResumenDeFormacion, type TarjetaDeFormacion } from '../types/formaciones.types';
import { fasesDeLaDuracion } from '../utils/fasesDeLaDuracion';
import { etiquetaDeDuracion } from '../utils/etiquetaDeDuracion';

/**
 * Lo que manda el servidor de las formaciones (spec 022), leído con tolerancia: un campo nuevo no rompe nada, y lo que falta o
 * no se entiende se reemplaza por lo seguro. La regla de fondo: **si la sesión no trae formación (un backend anterior) la
 * persona se trata como de la Escuela**; nunca se inventa una elección ni un selector.
 */

const opcion = z.object({ codigo: z.string().min(1), nombre: z.string().min(1) }).passthrough();

const faseSchema = z
  .object({ numero: z.number().int(), primerDia: z.number().int(), ultimoDia: z.number().int() })
  .passthrough();

export const formacionDeLaSesionSchema = z
  .object({
    activa: opcion.nullish(),
    disponibles: z.array(z.unknown()).nullish(),
    puedeElegir: z.boolean().nullish(),
    veTodas: z.boolean().nullish(),
    sinFormacion: z.boolean().nullish(),
    duracionDias: z.number().int().positive().nullish(),
    fases: z.array(z.unknown()).nullish(),
  })
  .passthrough();

/** De lo que llegó a la formación de la sesión, o `null` si no viene o no es un objeto (backend anterior). */
export function leerFormacionDeLaSesion(dato: unknown): FormacionDeLaSesion | null {
  if (dato === null || typeof dato !== 'object') return null;
  const lectura = formacionDeLaSesionSchema.safeParse(dato);
  if (!lectura.success) return null;
  const v = lectura.data;
  const duracionDias = v.duracionDias ?? DURACION_POR_DEFECTO;
  const fases = (v.fases ?? []).flatMap(f => {
    const fase = faseSchema.safeParse(f);
    return fase.success ? [{ numero: fase.data.numero, primerDia: fase.data.primerDia, ultimoDia: fase.data.ultimoDia }] : [];
  });
  return {
    activa: v.activa ? { codigo: v.activa.codigo, nombre: v.activa.nombre } : null,
    disponibles: (v.disponibles ?? []).flatMap(o => {
      const una = opcion.safeParse(o);
      return una.success ? [{ codigo: una.data.codigo, nombre: una.data.nombre }] : [];
    }),
    puedeElegir: v.puedeElegir === true,
    veTodas: v.veTodas === true,
    sinFormacion: v.sinFormacion === true,
    duracionDias,
    fases: fases.length > 0 ? fases : fasesDeLaDuracion(duracionDias),
  };
}

const resumenSchema = z
  .object({
    codigo: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullish(),
    activa: z.boolean().nullish(),
    duracionesDias: z.array(z.number()).nullish(),
    etiquetasDeDuracion: z.array(z.string()).nullish(),
    version: z.number().nullish(),
  })
  .passthrough();

export function aResumen(dato: z.infer<typeof resumenSchema>): ResumenDeFormacion {
  const duraciones = dato.duracionesDias ?? [];
  return {
    codigo: dato.codigo,
    nombre: dato.nombre,
    descripcion: dato.descripcion ?? '',
    activa: dato.activa !== false,
    duracionesDias: duraciones,
    etiquetasDeDuracion:
      dato.etiquetasDeDuracion && dato.etiquetasDeDuracion.length === duraciones.length
        ? dato.etiquetasDeDuracion
        : duraciones.map(etiquetaDeDuracion),
    version: dato.version ?? 1,
  };
}

const numero = z.number().nullish().transform(n => n ?? 0);

const tarjetaSchema = z
  .object({ resumen: resumenSchema, aprendicesActivos: numero, personal: numero, grupos: numero, porAtender: numero })
  .passthrough();

export const tarjetasSchema = z.array(z.unknown());

/** Una tarjeta rota se pierde ELLA y no el centro entero. */
export function aTarjetas(dato: unknown[]): TarjetaDeFormacion[] {
  return dato.flatMap(t => {
    const lectura = tarjetaSchema.safeParse(t);
    if (!lectura.success) return [];
    const v = lectura.data;
    return [{ resumen: aResumen(v.resumen), aprendicesActivos: v.aprendicesActivos, personal: v.personal, grupos: v.grupos, porAtender: v.porAtender }];
  });
}

const detalleSchema = z
  .object({
    resumen: resumenSchema,
    personas: z
      .object({ aprendices: numero, porEmpezar: numero, enCurso: numero, terminaron: numero, personal: numero })
      .passthrough(),
    grupos: z.object({ total: numero, conMentor: numero, sinMentor: numero, recepcion: numero }).passthrough(),
    porAtender: z.object({ gruposSinMentor: numero, aprendicesSinGrupo: numero, personalSinFormacion: numero }).passthrough(),
  })
  .passthrough();

export function leerDetalle(dato: unknown): DetalleDeFormacion | null {
  const lectura = detalleSchema.safeParse(dato);
  if (!lectura.success) return null;
  const v = lectura.data;
  return {
    resumen: aResumen(v.resumen),
    personas: {
      aprendices: v.personas.aprendices,
      porEmpezar: v.personas.porEmpezar,
      enCurso: v.personas.enCurso,
      terminaron: v.personas.terminaron,
      personal: v.personas.personal,
    },
    grupos: { total: v.grupos.total, conMentor: v.grupos.conMentor, sinMentor: v.grupos.sinMentor, recepcion: v.grupos.recepcion },
    porAtender: {
      gruposSinMentor: v.porAtender.gruposSinMentor,
      aprendicesSinGrupo: v.porAtender.aprendicesSinGrupo,
      personalSinFormacion: v.porAtender.personalSinFormacion,
    },
  };
}

export function leerResumen(dato: unknown): ResumenDeFormacion | null {
  const lectura = resumenSchema.safeParse(dato);
  return lectura.success ? aResumen(lectura.data) : null;
}

const anteriorSchema = z
  .object({
    formacion: z.string(),
    duracionDias: z.number().nullish(),
    fechaInicio: z.string().nullish(),
    fechaFin: z.string(),
    diaFinal: z.number().nullish(),
    resultado: z.string(),
    motivo: z.string().nullish(),
    puntosLiga: z.number().nullish(),
    trasladadoA: z.string().nullish(),
  })
  .passthrough();

const personaSchema = z
  .object({
    formacion: z.string().nullish(),
    duracionDias: z.number().nullish(),
    programaActivado: z.boolean().nullish(),
    formacionesDelPersonal: z.array(z.unknown()).nullish(),
    historial: z.array(z.unknown()).nullish(),
  })
  .passthrough();

const asignadaSchema = z.object({ formacion: z.string(), activa: z.boolean().nullish() }).passthrough();

export function leerFormacionDeUnaPersona(dato: unknown): FormacionDeUnaPersona | null {
  const lectura = personaSchema.safeParse(dato);
  if (!lectura.success) return null;
  const v = lectura.data;
  return {
    formacion: v.formacion ?? null,
    duracionDias: v.duracionDias ?? DURACION_POR_DEFECTO,
    programaActivado: v.programaActivado === true,
    formacionesDelPersonal: (v.formacionesDelPersonal ?? []).flatMap(a => {
      const una = asignadaSchema.safeParse(a);
      return una.success ? [{ formacion: una.data.formacion, activa: una.data.activa === true }] : [];
    }),
    historial: (v.historial ?? []).flatMap(h => {
      const una = anteriorSchema.safeParse(h);
      if (!una.success) return [];
      const x = una.data;
      return [
        {
          formacion: x.formacion,
          duracionDias: x.duracionDias ?? DURACION_POR_DEFECTO,
          fechaInicio: x.fechaInicio ?? null,
          fechaFin: x.fechaFin,
          diaFinal: x.diaFinal ?? 0,
          resultado: x.resultado,
          motivo: x.motivo ?? null,
          puntosLiga: x.puntosLiga ?? null,
          trasladadoA: x.trasladadoA ?? '',
        },
      ];
    }),
  };
}

/* ── La comunidad de una formación (spec 024) ─────────────────────────────────────────────────────────────────────────── */

const tipoDeComunidadSchema = z
  .object({
    tipo: z.string(),
    prendido: z.boolean().catch(true),
    conversaciones: z.number().nullish().transform(n => (typeof n === 'number' && n > 0 ? Math.round(n) : 0)),
  })
  .passthrough();

const comunidadSchema = z.object({ formation: z.string().nullish(), tipos: z.array(z.unknown()) }).passthrough();

/**
 * Los tipos de comunidad de una formación, en el orden fijo de la app (general, grupo, soporte, directos). Un tipo que esta versión no
 * conoce se descarta (no hay con qué explicarlo) y una fila rota se pierde ELLA. `null` si la respuesta no es lo que se espera.
 */
export function leerComunidadDeLaFormacion(dato: unknown, codigo: string): ComunidadDeLaFormacion | null {
  const lectura = comunidadSchema.safeParse(dato);
  if (!lectura.success) return null;
  const porTipo = new Map<string, { tipo: (typeof TIPOS_DE_COMUNIDAD)[number]; prendido: boolean; conversaciones: number }>();
  for (const fila of lectura.data.tipos) {
    const tipo = tipoDeComunidadSchema.safeParse(fila);
    if (!tipo.success) continue;
    const conocido = TIPOS_DE_COMUNIDAD.find(t => t === tipo.data.tipo);
    if (!conocido) continue;
    porTipo.set(conocido, { tipo: conocido, prendido: tipo.data.prendido, conversaciones: tipo.data.conversaciones });
  }
  const tipos = TIPOS_DE_COMUNIDAD.flatMap(t => {
    const dato = porTipo.get(t);
    return dato ? [dato] : [];
  });
  return { formacion: lectura.data.formation?.trim() || codigo, tipos };
}
