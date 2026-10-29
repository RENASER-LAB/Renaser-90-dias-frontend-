import { z } from 'zod';

import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { urlDeEvidencia } from '../../evidence/api/evidenceApi';
import { radarSchemas, validarRespuesta as validarRespuestaDelRadar } from '../../radar/api/radarSchemas';
import type { HistorialRadarApi } from '../../radar/types/radar.types';
import type { SemaforoDelGrupo } from '../../semaforo/types/semaforo.types';
import type { PublicacionDelMuro, SemanaDePersona } from '../types/cumplimientoDelLider.types';
import {
  aPublicacionDelMuro,
  aSemanaDePersona,
  aTablaDelLider,
  cumplimientoDelLiderSchemas,
  validarRespuesta,
} from './cumplimientoDelLiderSchemas';

/**
 * Las lecturas del cumplimiento por persona para el líder de mentores (spec 005, contrato
 * `leadership-cumplimiento.md`). Quién puede verlas lo decide el servidor (MENTOR_LEAD, ADMIN y ALCHEMIST
 * activos); la app solo elige la puerta. Un backend anterior responde 404 y las tarjetas del semáforo por
 * grupos ni siquiera se abren (FR-021): estas llamadas no se hacen.
 */
const BASE = '/api/v1/leadership';

/** Un tramo de la ruta, escapado: un id con `/` o `%` no puede cambiar a qué ruta se llama. */
const tramo = encodeURIComponent;

/**
 * Sin `semanaHasta`, la ventana vigente del resumen (los 7 días que terminan ayer); con él (un viernes que ya llegó),
 * esa semana de sábado a viernes. La lista y la ficha leen lo mismo que el resumen por grupos.
 */
function conSemana(ruta: string, semanaHasta?: string | null): string {
  return semanaHasta ? `${ruta}?semanaHasta=${tramo(semanaHasta)}` : ruta;
}

/** §1: la tabla del semáforo del grupo, con nombres, en el orden del líder. */
export function rutaDeLaTablaDelLider(grupoId: string, semanaHasta?: string | null): string {
  return conSemana(`${BASE}/groups/${tramo(grupoId)}/semaforo`, semanaHasta);
}

/** §2: la semana de una persona del grupo. */
export function rutaDeLaSemanaDePersona(grupoId: string, personaId: string, semanaHasta?: string | null): string {
  return conSemana(`${BASE}/groups/${tramo(grupoId)}/people/${tramo(personaId)}/week`, semanaHasta);
}

/** Spec 012: el Código Renaser de una persona del grupo, con el estado de su Mi Radar. Paginado por cursor. */
export function rutaDelRadarDePersona(grupoId: string, personaId: string, cursor?: string | null): string {
  const ruta = `${BASE}/groups/${tramo(grupoId)}/people/${tramo(personaId)}/radar`;
  return cursor ? `${ruta}?cursor=${tramo(cursor)}` : ruta;
}

/**
 * §4: una publicación del Muro. Es un recurso del Muro (`/wall/{id}`) y no del líder: la leen su autor, el
 * liderazgo y el mentor o la guía que acompaña HOY al autor, así que sirve a las tres fichas (líder, mentor y
 * administración). Cualquier otra cuenta recibe 403, y una que ya no existe, 404.
 */
export function rutaDeLaPublicacion(publicacionId: string): string {
  return `/api/v1/wall/${tramo(publicacionId)}`;
}

/** La lista del grupo. Pedirla no deja registro: el registro lo deja abrir la ficha de una persona. */
export async function obtenerTablaDelLider(grupoId: string, semanaHasta?: string | null): Promise<SemaforoDelGrupo> {
  const respuesta = await apiFetch<unknown>(rutaDeLaTablaDelLider(grupoId, semanaHasta));
  return aTablaDelLider(
    validarRespuesta(cumplimientoDelLiderSchemas.tabla, respuesta, 'GET /leadership/groups/{g}/semaforo'),
  );
}

/**
 * La semana de una persona. **Registra la consulta** en el servidor (quién miró a quién y cuándo, FR-016):
 * por eso se pide al abrir la ficha y al cambiar de semana, y no más seguido.
 */
export async function obtenerSemanaDePersona(
  grupoId: string,
  personaId: string,
  semanaHasta?: string | null,
): Promise<SemanaDePersona> {
  const respuesta = await apiFetch<unknown>(rutaDeLaSemanaDePersona(grupoId, personaId, semanaHasta));
  const semana = aSemanaDePersona(
    validarRespuesta(cumplimientoDelLiderSchemas.semana, respuesta, 'GET /leadership/groups/{g}/people/{p}/week'),
  );
  /* Si el servidor no repitió quién es, es a quien se pidió. */
  return semana.personaId ? semana : { ...semana, personaId };
}

/**
 * Spec 012: el Código Renaser de una persona, para el líder, el administrador y el alquimista (la misma forma que
 * `/radar/history`, con `miRadar`). Una página es de 84 registros, de los más nuevos a los más viejos. **No deja registro
 * de consulta** (la ficha ya lo dejó al abrirse). Un 404 o un 403 los lee quien la muestra como «no hay sección».
 */
export async function obtenerRadarDePersona(
  grupoId: string,
  personaId: string,
  cursor?: string | null,
): Promise<HistorialRadarApi> {
  const respuesta = await apiFetch<unknown>(rutaDelRadarDePersona(grupoId, personaId, cursor));
  const pagina = validarRespuestaDelRadar<HistorialRadarApi>(
    radarSchemas.historial,
    respuesta,
    'GET /leadership/groups/{g}/people/{p}/radar',
  );
  return { entries: pagina.entries, nextCursor: pagina.nextCursor ?? null, miRadar: pagina.miRadar ?? null };
}

/**
 * La publicación del post diario. Las URL de sus fotos vencen a los 15 minutos: se pide al abrirla, no antes.
 * Un 403 y un 404 llegan como `ApiError` para que quien la muestre los diga distinto.
 */
export async function obtenerPublicacion(publicacionId: string): Promise<PublicacionDelMuro> {
  const respuesta = await apiFetch<unknown>(rutaDeLaPublicacion(publicacionId));
  return aPublicacionDelMuro(
    validarRespuesta(cumplimientoDelLiderSchemas.publicacion, respuesta, 'GET /wall/{id}'),
  );
}

// ------------------------------------------------------------------------------------------
// Abrir una evidencia
// ------------------------------------------------------------------------------------------

/** Lo que el visor necesita para dibujar una evidencia ya pedida. */
export type EvidenciaLeida =
  | { tipo: 'TEXTO'; texto: string }
  | { tipo: 'FOTO' | 'AUDIO' | 'VIDEO'; url: string }
  /** Un tipo que esta versión no sabe dibujar: se ofrece abrirlo afuera. */
  | { tipo: 'OTRO'; url: string };

/** Por qué no se pudo abrir: `no_disponible` es la evidencia que ya no está (404). */
export type MotivoSinEvidencia = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

export class EvidenciaNoSeAbrio extends Error {
  readonly motivo: MotivoSinEvidencia;
  constructor(motivo: MotivoSinEvidencia, mensaje: string) {
    super(mensaje);
    this.name = 'EvidenciaNoSeAbrio';
    this.motivo = motivo;
  }
}

const detalleSchema = z
  .object({ tipo: z.string().nullish(), contenidoTexto: z.string().nullish() })
  .passthrough();

const TIPOS_CON_ARCHIVO = ['FOTO', 'AUDIO', 'VIDEO'] as const;

function esDeArchivo(tipo: string | null): tipo is (typeof TIPOS_CON_ARCHIVO)[number] {
  return (TIPOS_CON_ARCHIVO as readonly (string | null)[]).includes(tipo);
}

function motivoDe(error: unknown): MotivoSinEvidencia {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'no_disponible';
    if (error.status === 403) return 'sin_permiso';
    if (error.status === 0) return 'sin_red';
  }
  return 'error';
}

/**
 * Abre una evidencia. **El enlace de un archivo se pide aquí, al abrirla, y no antes**: vence a los diez
 * minutos (FR-012), y traerlo con la semana dejaría casi todos vencidos sin usarse.
 *
 * - Con el tipo conocido (`FOTO`, `AUDIO`, `VIDEO`) alcanza con el enlace.
 * - Un texto (la Audioterapia, una respuesta escrita) o un tipo que no se sabe (la foto de una acción del
 *   día) pide primero el detalle: de ahí sale el tipo y el contenido escrito.
 */
export async function leerEvidencia(evidenciaId: string, tipoConocido: string | null): Promise<EvidenciaLeida> {
  try {
    let tipo = tipoConocido;
    if (!esDeArchivo(tipo)) {
      const detalle = validarRespuesta(
        detalleSchema,
        await apiFetch<unknown>(`/api/v1/evidence/${tramo(evidenciaId)}`),
        'GET /evidence/{id}',
      );
      tipo = detalle.tipo?.trim() ? detalle.tipo.trim().toUpperCase() : tipoConocido;
      if (tipo === 'TEXTO' || (!esDeArchivo(tipo) && detalle.contenidoTexto)) {
        return { tipo: 'TEXTO', texto: detalle.contenidoTexto ?? '' };
      }
    }
    const url = await urlDeEvidencia(evidenciaId);
    if (!url) throw new EvidenciaNoSeAbrio('no_disponible', 'La evidencia no tiene archivo.');
    return esDeArchivo(tipo) ? { tipo, url } : { tipo: 'OTRO', url };
  } catch (e) {
    if (e instanceof EvidenciaNoSeAbrio) throw e;
    throw new EvidenciaNoSeAbrio(motivoDe(e), e instanceof Error ? e.message : 'No se pudo abrir la evidencia.');
  }
}
