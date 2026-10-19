import { z } from 'zod';

import {
  aLecturaDelPromedio,
  aSemaforoDelGrupo,
  semaforoSchemas,
  validarRespuesta,
  type SemaforoDelGrupoCrudo,
} from '../../semaforo/api/semaforoSchemas';
import type { AprendizDelSemaforo, SemaforoDelGrupo } from '../../semaforo/types/semaforo.types';
import type {
  AccionDeLaPersona,
  DiaDeLaPersona,
  EvidenciaDeLaObligacion,
  ObligacionDeLaPersona,
  PublicacionDelMuro,
  ResumenDeLaSemana,
  SemanaDePersona,
} from '../types/cumplimientoDelLider.types';

/**
 * Validación y normalización de las tres lecturas del cumplimiento por persona (spec 005, contrato
 * `leadership-cumplimiento.md` §1, §2 y §4).
 *
 * Mismo criterio que el semáforo: `passthrough()` y `.nullish()` en todo lo que no es imprescindible,
 * para que un campo nuevo o que todavía no llega (un backend a medio publicar) no tire la pantalla; y las
 * reglas que nunca se rompen en pantalla, aplicadas al normalizar:
 *
 * - **Sin porcentaje no hay color** (nunca verde por falta de datos), la regla de todo el semáforo.
 * - **«No se mide» conserva su porcentaje**: el mentor o la guía con programa propio no tienen color, pero
 *   su % sí se muestra (spec, Assumptions). Por eso no pasan por `aLecturaDelPromedio`, que se lo quitaría.
 * - **La falta de datos no es incumplimiento**: el `motivo` de un día se guarda tal cual para decirlo en
 *   palabras (`utils/palabrasDeLaPersona`), nunca se traduce a «no cumplido».
 */

// ------------------------------------------------------------------------------------------
// Esquemas del cable
// ------------------------------------------------------------------------------------------

const evidenciaSchema = z
  .object({
    id: z.string(),
    tipo: z.string().nullish(),
    subidaEn: z.string().nullish(),
  })
  .passthrough();

const obligacionSchema = z
  .object({
    registroId: z.string(),
    titulo: z.string(),
    estadoHabito: z.string().nullish(),
    requiereEvidencia: z.boolean().nullish(),
    entrega: z.string().nullish(),
    entregadaEn: z.string().nullish(),
    revision: z.string().nullish(),
    evidenciaId: z.string().nullish(),
    respuestaTexto: z.string().nullish(),
    evidencias: z.array(evidenciaSchema).nullish(),
    publicacionId: z.string().nullish(),
  })
  .passthrough();

const accionSchema = z
  .object({
    id: z.string(),
    titulo: z.string().nullish(),
    estado: z.string().nullish(),
    evidenciaId: z.string().nullish(),
  })
  .passthrough();

const diaSchema = z
  .object({
    fecha: z.string(),
    diaDePrograma: z.number().nullish(),
    motivo: z.string().nullish(),
    obligaciones: z.array(obligacionSchema).nullish(),
    acciones: z.array(accionSchema).nullish(),
  })
  .passthrough();

const resumenSchema = z
  .object({
    obligaciones: z.number(),
    cumplidas: z.number(),
    conEntrega: z.number(),
    pendientes: z.number(),
    sinCumplir: z.number(),
  })
  .passthrough();

const semanaSchema = z
  .object({
    grupoId: z.string().nullish(),
    personaId: z.string().nullish(),
    nombre: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    /** Imprescindibles: sin las fechas no se puede decir qué semana es ni navegar a otra. */
    desde: z.string(),
    hasta: z.string(),
    zona: z.string().nullish(),
    semanaEnCurso: z.boolean().nullish(),
    primeraSemana: z.string().nullish(),
    mentor: z.object({ id: z.string(), nombre: z.string().nullish() }).passthrough().nullish(),
    resumen: resumenSchema.nullish(),
    /** String y no enum: `NO_SE_MIDE` y cualquier color nuevo no pueden tumbar la ficha. */
    color: z.string().nullish(),
    etiqueta: z.string().nullish(),
    porcentaje: z.number().nullish(),
    dias: z.array(diaSchema).nullish(),
  })
  .passthrough();

const fotoSchema = z.object({ url: z.string(), mimeType: z.string().nullish() }).passthrough();

/**
 * La publicación del Muro (§4, `GET /api/v1/wall/{id}`): `id, authorId, authorName, authorAvatarUrl, text,
 * createdAt, media[{url, mimeType}]`, los nombres del Muro. Todo opcional: una publicación de solo texto o de
 * solo foto sirve.
 */
const publicacionSchema = z
  .object({
    id: z.string().nullish(),
    authorId: z.string().nullish(),
    authorName: z.string().nullish(),
    authorAvatarUrl: z.string().nullish(),
    text: z.string().nullish(),
    createdAt: z.string().nullish(),
    media: z.array(fotoSchema).nullish(),
  })
  .passthrough();

type SemanaCruda = z.infer<typeof semanaSchema>;
type ObligacionCruda = z.infer<typeof obligacionSchema>;
type PublicacionCruda = z.infer<typeof publicacionSchema>;

export const cumplimientoDelLiderSchemas = {
  /** §1 es la misma tabla del semáforo del grupo (§4.3), con dos diferencias que se leen abajo. */
  tabla: semaforoSchemas.grupo,
  semana: semanaSchema,
  publicacion: publicacionSchema,
};

export { validarRespuesta };

// ------------------------------------------------------------------------------------------
// Normalización
// ------------------------------------------------------------------------------------------

/** El color con el que el servidor dice que una persona no entra al semáforo. */
export const COLOR_NO_SE_MIDE = 'NO_SE_MIDE';

function rolDe(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim().toUpperCase() : null;
}

/**
 * Una fila de la lista del líder. Una persona medida sale como en toda tabla del semáforo (la
 * normalización ya la hizo `aSemaforoDelGrupo`); la que «no se mide» (mentor o guía con programa propio)
 * se rehace aparte para no perder su porcentaje.
 */
function aFilaDelLider(fila: AprendizDelSemaforo, cruda: Record<string, unknown> | undefined): AprendizDelSemaforo {
  const rol = rolDe(cruda?.rol);
  const conRol = rol ? { ...fila, rol } : fila;
  if (cruda?.color !== COLOR_NO_SE_MIDE) return conRol;
  const porcentaje = typeof cruda.porcentaje === 'number' && Number.isFinite(cruda.porcentaje) ? cruda.porcentaje : null;
  return { ...conRol, color: 'SIN_DATOS', etiqueta: null, porcentaje, noSeMide: true };
}

/**
 * `GET /leadership/groups/{g}/semaforo`: la tabla del semáforo del grupo CON nombres y en el orden del
 * líder (rojo, amarillo, sin datos, verde, «no se mide»; menor % primero). **La app no reordena**: el
 * orden es del servidor (FR-007) y se actualiza para todos sin reinstalar.
 */
export function aTablaDelLider(crudo: SemaforoDelGrupoCrudo): SemaforoDelGrupo {
  const base = aSemaforoDelGrupo(crudo);
  const crudas = (crudo.aprendices ?? []) as Array<Record<string, unknown>>;
  return { ...base, aprendices: base.aprendices.map((fila, i) => aFilaDelLider(fila, crudas[i])) };
}

function aEvidencia(crudo: z.infer<typeof evidenciaSchema>): EvidenciaDeLaObligacion {
  return { id: crudo.id, tipo: crudo.tipo?.trim() ? crudo.tipo.trim().toUpperCase() : null, subidaEn: crudo.subidaEn ?? null };
}

/**
 * Las evidencias de una obligación, siempre incluyendo `evidenciaId` (la principal de las fichas del
 * mentor y de administración): un servidor que solo manda ese id igual deja abrir la evidencia, y una que
 * manda las dos cosas no la repite.
 */
function evidenciasDe(crudo: ObligacionCruda): EvidenciaDeLaObligacion[] {
  const lista = (crudo.evidencias ?? []).map(aEvidencia);
  if (crudo.evidenciaId && !lista.some(e => e.id === crudo.evidenciaId)) {
    lista.push({ id: crudo.evidenciaId, tipo: null, subidaEn: crudo.entregadaEn ?? null });
  }
  return lista;
}

function aObligacion(crudo: ObligacionCruda): ObligacionDeLaPersona {
  return {
    registroId: crudo.registroId,
    titulo: crudo.titulo,
    estado: crudo.estadoHabito?.trim().toUpperCase() ?? '',
    requiereEvidencia: crudo.requiereEvidencia ?? false,
    entrega: crudo.entrega ?? null,
    entregadaEn: crudo.entregadaEn ?? null,
    revision: crudo.revision ?? null,
    evidenciaId: crudo.evidenciaId ?? null,
    respuestaTexto: crudo.respuestaTexto?.trim() ? crudo.respuestaTexto : null,
    evidencias: evidenciasDe(crudo),
    publicacionId: crudo.publicacionId ?? null,
  };
}

function aAccion(crudo: z.infer<typeof accionSchema>): AccionDeLaPersona {
  return {
    id: crudo.id,
    titulo: crudo.titulo?.trim() || 'Acción del día',
    estado: crudo.estado?.trim().toUpperCase() ?? '',
    evidenciaId: crudo.evidenciaId ?? null,
  };
}

function aDia(crudo: z.infer<typeof diaSchema>): DiaDeLaPersona {
  return {
    fecha: crudo.fecha,
    diaDePrograma: crudo.diaDePrograma ?? null,
    motivo: crudo.motivo?.trim() ? crudo.motivo.trim().toUpperCase() : null,
    obligaciones: (crudo.obligaciones ?? []).map(aObligacion),
    acciones: (crudo.acciones ?? []).map(aAccion),
  };
}

function aResumen(crudo: SemanaCruda['resumen']): ResumenDeLaSemana | null {
  return crudo
    ? {
        obligaciones: crudo.obligaciones,
        cumplidas: crudo.cumplidas,
        conEntrega: crudo.conEntrega,
        pendientes: crudo.pendientes,
        sinCumplir: crudo.sinCumplir,
      }
    : null;
}

/**
 * `GET /leadership/groups/{g}/people/{p}/week`. Los días quedan de sábado a viernes (fecha ascendente).
 * El color de la semana sigue la regla de siempre —sin número no hay color— salvo `NO_SE_MIDE`, que no
 * tiene color pero conserva su porcentaje.
 */
export function aSemanaDePersona(crudo: SemanaCruda): SemanaDePersona {
  const noSeMide = crudo.color === COLOR_NO_SE_MIDE;
  const lectura = noSeMide
    ? { color: 'SIN_DATOS' as const, etiqueta: null, porcentaje: finito(crudo.porcentaje) }
    : aLecturaDelPromedio(crudo.color, crudo.etiqueta, crudo.porcentaje);
  return {
    grupoId: crudo.grupoId ?? null,
    personaId: crudo.personaId ?? '',
    nombre: crudo.nombre?.trim() ? crudo.nombre.trim() : null,
    avatarUrl: crudo.avatarUrl ?? null,
    desde: crudo.desde,
    hasta: crudo.hasta,
    zona: crudo.zona ?? null,
    semanaEnCurso: crudo.semanaEnCurso ?? false,
    primeraSemana: crudo.primeraSemana ?? null,
    mentor: crudo.mentor ? { id: crudo.mentor.id, nombre: crudo.mentor.nombre ?? null } : null,
    resumen: aResumen(crudo.resumen),
    ...lectura,
    noSeMide,
    dias: (crudo.dias ?? [])
      .map(aDia)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0)),
  };
}

function finito(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** Una foto se dibuja solo si es una imagen con dirección de la red (el almacenamiento de marcador local da `about:blank#…`). */
function esFotoDeLaRed(foto: z.infer<typeof fotoSchema>): boolean {
  const mime = foto.mimeType?.toLowerCase();
  if (mime && !mime.startsWith('image/')) return false;
  return /^https?:\/\//i.test(foto.url);
}

/** `GET /wall/{id}`. */
export function aPublicacionDelMuro(crudo: PublicacionCruda): PublicacionDelMuro {
  return {
    id: crudo.id ?? null,
    autor: crudo.authorName?.trim() ? crudo.authorName.trim() : null,
    avatarUrl: crudo.authorAvatarUrl ?? null,
    texto: crudo.text ?? '',
    creadaEn: crudo.createdAt ?? null,
    fotos: (crudo.media ?? []).filter(esFotoDeLaRed).map(foto => ({ url: foto.url })),
  };
}
