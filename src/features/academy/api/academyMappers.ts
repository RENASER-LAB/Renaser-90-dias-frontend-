import type { CourseItem, CourseSection, LessonResource, ResourceType } from '../../../screens/ComunidadScreen';
import type {
  CursoBloqueadoApi,
  LeccionDetalleApi,
  LeccionLiteApi,
  MiCursoApi,
  SeccionConLeccionesApi,
} from '../types/academy.types';

/**
 * Traduce las respuestas del backend (español/camelCase, `academy.types.ts`) a los tipos que ya
 * consume el diseño de "Recursos Exclusivos" (`CourseItem`/`CourseSection`/`LessonResource`,
 * definidos en `ComunidadScreen.tsx`). El JSX no se toca: solo cambia de dónde sale el valor de
 * cada prop — mismo criterio que `features/community/api/wallMappers.ts`.
 */

/** `l1 min`, `45s`, `12:05 min`. Vacío si no hay duración (evita un "0 min" feo en la UI). */
export function formatearDuracionMs(ms?: number | null): string {
  if (!ms || ms <= 0) return '';
  const totalSeg = Math.round(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  if (min <= 0) return `${seg}s`;
  return seg === 0 ? `${min} min` : `${min}:${String(seg).padStart(2, '0')} min`;
}

/**
 * El backend no tiene un campo `tipo` por lección (`video`/`doc`/`link`/`texto` era un dato del
 * mock que agrupaba todo en un único recurso). Una lección real puede tener video Y cuerpo Y
 * recursos adjuntos a la vez, así que esto es solo la prioridad para elegir UN ícono/etiqueta
 * representativa en el árbol: video primero (es lo que la persona va a mirar), después lectura,
 * después "documento" si solo hay adjuntos.
 */
function inferirTipo(videoTipo: string | null, tieneCuerpo: boolean, recursosCount: number): ResourceType {
  if (videoTipo === 'youtube' || videoTipo === 'storage') return 'video';
  if (tieneCuerpo) return 'text';
  if (recursosCount > 0) return 'doc';
  return 'text';
}

function metaLite(l: LeccionLiteApi, tipo: ResourceType): string {
  if (tipo === 'video') {
    const dur = formatearDuracionMs(l.videoDuracionMs);
    return dur ? `🎥 Video · ${dur}` : '🎥 Video';
  }
  if (tipo === 'doc') {
    return l.recursosCount === 1 ? '📄 1 recurso adjunto' : `📄 ${l.recursosCount} recursos adjuntos`;
  }
  return '✍️ Lectura';
}

/** Nodo del árbol (`GET /cursos/{id}/secciones`) — sin cuerpo ni videoUrl todavía, ver `LeccionLiteApi`. */
export function mapearLeccionLite(l: LeccionLiteApi): LessonResource {
  const tipo = inferirTipo(l.videoTipo, l.tieneCuerpo, l.recursosCount);
  return {
    id: l.id,
    type: tipo,
    title: l.titulo,
    meta: metaLite(l, tipo),
    // El detalle real (GET /lecciones/{id}) es el que trae el cuerpo para armar una descripción
    // — acá solo hay metadata del árbol, así que se deja vacío hasta que se abra la lección.
    desc: '',
    // El backend NUNCA expone, ni en el árbol ni en el detalle de una lección, qué lecciones
    // puntuales ya completó el aprendiz — solo el agregado (`ProgresoCursoResponse.completadas`).
    // No hay de dónde sacar un valor real acá; se documenta como limitación conocida en el informe
    // de la integración, no se inventa un true/false.
    completed: false,
    videoTipo: l.videoTipo,
    videoDuracionMs: l.videoDuracionMs,
    locked: l.bloqueadaPorDia,
    diaDesbloqueo: l.diaDesbloqueo,
    diasFaltantes: l.diasFaltantes,
  };
}

function mapearSeccion(s: SeccionConLeccionesApi): CourseSection {
  return {
    id: s.id,
    title: s.titulo,
    lessons: s.lecciones.map(mapearLeccionLite),
  };
}

/**
 * Compone la tarjeta de curso (`CourseItem`) a partir de `MiCursoResponse` (progreso real) +
 * `SeccionConLeccionesResponse[]` (árbol real, pedido aparte por `useCursos` en paralelo para
 * los 25 cursos). `totalModules`/`totalResources` salen del árbol real, no de un número fijo.
 */
export function mapearCursoConSecciones(mc: MiCursoApi, secciones: SeccionConLeccionesApi[]): CourseItem {
  const totalLeccionesDelArbol = secciones.reduce((acc, s) => acc + s.lecciones.length, 0);
  const progressPercent =
    mc.progreso.totalLecciones > 0
      ? Math.round((mc.progreso.completadas / mc.progreso.totalLecciones) * 100)
      : 0;
  return {
    id: mc.id,
    title: mc.titulo,
    category: mc.acceso === 'abierto' ? 'CURSO ABIERTO' : 'CURSO RESTRINGIDO',
    // `CursoResponse` no tiene un campo "instructor" (el mock lo inventaba). Se deja un texto
    // genérico en vez de inventar un nombre que no existe en el backend.
    instructor: 'Equipo Renaser',
    summary: mc.descripcion || '',
    progressPercent,
    totalModules: secciones.length,
    // Si por lo que sea `obtenerSeccionesCurso` falló para este curso puntual (ver `useCursos`),
    // el árbol queda vacío — se cae al conteo agregado de `progreso` para no mostrar "0 recursos".
    totalResources: totalLeccionesDelArbol || mc.progreso.totalLecciones,
    sections: secciones.map(mapearSeccion),
    coverUrl: mc.portadaFirmada,
    orden: mc.orden,
    locked: false,
    diaDesbloqueo: null,
    diasFaltantes: undefined,
  };
}

/**
 * Curso todavía NO accesible (`GET /cursos/bloqueados`). `CursoBloqueadoResponse` trae muchos
 * menos campos que `MiCursoResponse` — no tiene instructor, descripción, progreso, `acceso` ni el
 * árbol de secciones (ver `academy.types.ts`). No se inventan esos valores para "completar" la
 * tarjeta: quedan vacíos o en cero, tal como el backend los deja de mandar.
 *
 * `diasFaltantes` no viaja en este DTO (a diferencia de `LeccionLiteResponse`, que sí lo trae
 * calculado) — se deriva acá mismo de los dos números que sí llegan (`diaDesbloqueo` y
 * `programDayActual`), con el mismo signo que usa el backend para lecciones.
 */
export function mapearCursoBloqueado(cb: CursoBloqueadoApi): CourseItem {
  return {
    id: cb.id,
    title: cb.titulo,
    category: 'CURSO BLOQUEADO',
    instructor: 'Equipo Renaser', // mismo texto genérico que ya usa mapearCursoConSecciones arriba
    summary: '', // CursoBloqueadoResponse no trae descripción
    progressPercent: 0,
    totalModules: 0,
    totalResources: 0,
    sections: [],
    // Se usa `portadaFirmada`, NUNCA `portadaUrl`: esta última es la ruta cruda del objeto en un
    // bucket privado y no carga nunca. El backend no firmaba acá porque asumía que el cliente
    // resolvía las URLs por su cuenta — cierto en la app anterior, falso en esta; se corrigió del
    // lado del backend (2026-09-02). Los cursos sin portada cargada en la base siguen viniendo en
    // `null`, y `CursoPortada` ya sabe mostrar el degradado en ese caso.
    coverUrl: cb.portadaFirmada,
    orden: cb.orden,
    locked: true,
    diaDesbloqueo: cb.diaDesbloqueo,
    diasFaltantes: Math.max(0, cb.diaDesbloqueo - cb.programDayActual),
  };
}

// =========================================================================
// Detalle de una lección puntual (GET /api/v1/lecciones/{id})
// =========================================================================

function despojarHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function despojarMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * `fullScreenLesson.content` siempre se pintó como texto plano dentro de un `<Text>` (ver
 * `ComunidadScreen.tsx`) — no hay ningún renderer de HTML/Markdown instalado en el proyecto, y la
 * tarea prohíbe agregar una dependencia nueva solo para esto. Se prefiere `cuerpoMd` por ser más
 * liviano de despojar; si no vino, se cae a despojar el HTML.
 */
export function textoPlanoDesdeCuerpo(html: string | null, md: string | null): string {
  if (md && md.trim()) return despojarMarkdown(md);
  if (html && html.trim()) return despojarHtml(html);
  return '';
}

function recortar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > max ? `${limpio.slice(0, max).trimEnd()}…` : limpio;
}

/**
 * Campos que solo trae el detalle completo (`GET /lecciones/{id}`) y que el árbol
 * (`mapearLeccionLite`) no tiene: se combinan sobre la lección "lite" ya abierta en pantalla
 * (ver `hooks/useLeccionDetalle.ts`), nunca la reemplazan de entrada — así la pantalla se abre
 * al toque, sin esperar esta segunda respuesta.
 */
export function extraerCamposDetalle(detalle: LeccionDetalleApi): Partial<LessonResource> {
  const { leccion, recursos } = detalle;
  const tieneCuerpo = !!(leccion.cuerpoMd?.trim() || leccion.cuerpoHtml?.trim());
  const tipo = inferirTipo(leccion.videoTipo, tieneCuerpo, recursos.length);
  const textoPlano = textoPlanoDesdeCuerpo(leccion.cuerpoHtml, leccion.cuerpoMd);
  const meta =
    tipo === 'video'
      ? (() => {
          const dur = formatearDuracionMs(leccion.videoDuracionMs);
          return dur ? `🎥 Video · ${dur}` : '🎥 Video';
        })()
      : tipo === 'doc'
        ? recursos.length === 1
          ? '📄 1 recurso adjunto'
          : `📄 ${recursos.length} recursos adjuntos`
        : '✍️ Lectura';
  return {
    type: tipo,
    meta,
    desc: textoPlano ? recortar(textoPlano, 160) : '',
    content: textoPlano || undefined,
    videoTipo: leccion.videoTipo,
    videoUrl: leccion.videoUrl,
    videoMiniaturaUrl: leccion.videoMiniaturaUrl,
    videoDuracionMs: leccion.videoDuracionMs,
  };
}

/** Extrae el id de un video de YouTube de cualquiera de sus formas de URL habituales. */
export function extraerIdYoutube(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/);
  return m ? m[1] : null;
}
