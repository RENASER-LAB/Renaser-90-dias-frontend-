import * as onboardingApi from '../api/onboardingApi';
import type { TipoPreguntaOnboarding } from '../types/onboarding.types';

/**
 * Resuelve `clave_pregunta` -> `id` contra el catálogo REAL del backend, en runtime.
 *
 * ── Por qué existe este archivo (leer antes de "simplificarlo" volviendo a hardcodear ids) ──
 *
 * Hasta el 2026-09-04, `data/mapaPreguntas.ts` tenía los `id` numéricos de las 24 preguntas
 * escritos a mano. Se rompió TRES veces seguidas (E-88, E-93, y el fallo "Una respuesta de tipo
 * FIRMA requiere mediaId" al firmar el Pacto), y cada vez se "arregló" corriendo los números en
 * ±1. La causa real no era ninguno de esos números:
 *
 *   `preguntas_onboarding.id` es una columna `GENERATED ALWAYS AS IDENTITY`, y el seed que la
 *   llena (`V10__catalogo_onboarding_default.sql`, línea 172) es un
 *   `INSERT ... SELECT ... FROM (VALUES ...) v JOIN secciones_onboarding s ON ...` **sin ORDER BY**.
 *   El orden en que ese JOIN emite las filas lo decide el planner de Postgres, no el orden del
 *   `VALUES`. Prueba: en el `VALUES` la primera fila es `accepted_terms` y `terms_signature` está
 *   en la línea 152, pero en la base quedaron con id 2 y 1 respectivamente — dado vuelta.
 *
 * Es decir: **los ids del catálogo no son reproducibles entre bases de datos.** Van a ser otros en
 * producción, y otros en la máquina de cualquiera que levante el Docker de cero. Hardcodearlos no
 * puede funcionar de forma estable, y falla de la peor manera posible: la mayoría de las veces
 * guarda la respuesta bajo la pregunta equivocada SIN error (parece que funcionó), y solo revienta
 * ruidosamente cuando el id corrido cae justo sobre una pregunta de tipo FIRMA/AUDIO/ARCHIVO, que
 * son las únicas que exigen `mediaId` en vez de un valor tipado.
 *
 * `clave_pregunta`, en cambio, tiene `UNIQUE` en la tabla y es la misma en toda base: es la única
 * identificación estable de una pregunta. `GET /onboarding/questionnaire?flow=...` ya devuelve
 * `{ id, questionKey, type }` por pregunta, así que esto no necesitó ningún cambio de backend.
 */

/**
 * Los flujos cuyas respuestas manda esta app hoy (ver los builders de `mapaPreguntas.ts`). El
 * catálogo tiene 6 flujos en total; los otros 2 (`diseno_destino`, `cierre_dia_1`) todavía no
 * tienen pantalla que los responda, así que no se piden — cada flujo es una request más al abrir
 * el onboarding.
 *
 * `cuestionario_profundo` se agregó el 2026-09-05 junto con la etapa 2 del onboarding del perfil
 * (`screens/CuestionarioProfundoScreen.tsx`). **Sin esta línea esa pantalla no puede guardar
 * nada**: sus bloques 6, 7 y 8 (Energía Vital, Los 3 Guardianes, Estado Mental Profundo) viven en
 * ese flujo, y una clave que no está en ningún flujo cargado acá no resuelve su `id` —
 * `usePersistenciaOnboarding` la deja pendiente para siempre en vez de mandarla con un id
 * inventado. Los bloques 1-5 de la misma pantalla sí resolvían, porque sus preguntas están bajo
 * `ficha_inicial` (ver el comentario largo de `data/bloquesCuestionarioProfundo.ts`).
 */
/**
 * `mapa_dia7` se agregó el 2026-09-14. **Sin esta línea el Mapa de Renacimiento no puede guardar
 * nada en el servidor**: sus 30+ preguntas las sembró la V41 justamente para eso, y sin embargo
 * el Mapa solo mandaba las tres Rocas Maestras y la marca de etapa. Todo lo demás —la prioridad
 * principal, las líneas base, los hitos, los motivos— se quedaba en el AsyncStorage del teléfono
 * y se perdía al reinstalar o al entrar desde otro equipo.
 *
 * Se comprobó contra la base el 2026-09-14: cero filas en `respuestas_onboarding` para cualquier
 * clave `map_*`, en una cuenta que sí tenía sus tres rocas y la etapa marcada como completa.
 */
const FLUJOS_QUE_RESPONDE_LA_APP = [
  'terminos',
  'pacto',
  'ficha_inicial',
  'cuestionario_profundo',
  'mapa_dia7',
] as const;

interface PreguntaResuelta {
  readonly id: number;
  readonly tipo: string;
  readonly flujo: string;
}

export type ResolucionPregunta =
  | { readonly ok: true; readonly id: number }
  | { readonly ok: false; readonly motivo: string };

export interface CatalogoPreguntas {
  /**
   * Devuelve el `id` real de una clave, verificando de paso que el tipo sea el que el cliente
   * esperaba. El chequeo de tipo NO es decorativo: es lo que convierte un "guardó bajo la pregunta
   * equivocada en silencio" en un error explícito y localizable.
   */
  idDe(clave: string, tipoEsperado: TipoPreguntaOnboarding): ResolucionPregunta;
  /** Cantidad de preguntas cargadas — solo para diagnóstico/logs. */
  readonly cantidad: number;
}

function construir(preguntas: Map<string, PreguntaResuelta>): CatalogoPreguntas {
  return {
    cantidad: preguntas.size,
    idDe(clave, tipoEsperado) {
      const pregunta = preguntas.get(clave);
      if (!pregunta) {
        return {
          ok: false,
          motivo: `la pregunta "${clave}" no existe en el catálogo del backend (flujos consultados: ${FLUJOS_QUE_RESPONDE_LA_APP.join(', ')})`,
        };
      }
      if (pregunta.tipo !== tipoEsperado) {
        return {
          ok: false,
          motivo: `la pregunta "${clave}" (flujo ${pregunta.flujo}) es de tipo ${pregunta.tipo} en el backend, pero la app la manda como ${tipoEsperado} — hay que corregir el mapeo en mapaPreguntas.ts, no forzar el envío`,
        };
      }
      return { ok: true, id: pregunta.id };
    },
  };
}

/**
 * Caché en memoria del proceso. Se guarda la PROMESA, no el resultado, para que varias pantallas
 * pidiendo el catálogo a la vez compartan una sola tanda de requests en vez de disparar tres cada
 * una. Si la carga falla, se limpia para que el próximo intento vuelva a probar (un fallo de red
 * no debe dejar el catálogo roto para toda la sesión).
 */
let catalogoEnCurso: Promise<CatalogoPreguntas> | null = null;

async function cargar(): Promise<CatalogoPreguntas> {
  const cuestionarios = await Promise.all(
    FLUJOS_QUE_RESPONDE_LA_APP.map(flujo => onboardingApi.obtenerCuestionario(flujo))
  );

  const preguntas = new Map<string, PreguntaResuelta>();
  for (const cuestionario of cuestionarios) {
    for (const seccion of cuestionario.sections) {
      for (const pregunta of seccion.questions) {
        // `clave_pregunta` es UNIQUE en toda la tabla (no por sección), así que un mapa plano
        // alcanza y no hay riesgo de colisión entre flujos.
        preguntas.set(pregunta.questionKey, {
          id: pregunta.id,
          tipo: pregunta.type,
          flujo: cuestionario.flow,
        });
      }
    }
  }

  if (preguntas.size === 0) {
    throw new Error('El catálogo de preguntas del onboarding vino vacío — no hay ids que resolver.');
  }
  return construir(preguntas);
}

/**
 * Devuelve el catálogo, cargándolo la primera vez. Lanza si no se pudo cargar (quien llama decide:
 * `usePersistenciaOnboarding` lo trata como fallo transitorio y deja las respuestas pendientes de
 * reintento, en vez de mandarlas con un id inventado).
 */
export function obtenerCatalogoPreguntas(): Promise<CatalogoPreguntas> {
  if (!catalogoEnCurso) {
    catalogoEnCurso = cargar().catch(error => {
      catalogoEnCurso = null;
      throw error;
    });
  }
  return catalogoEnCurso;
}

/** Olvida el catálogo cacheado. Para el cierre de sesión y para los tests. */
export function invalidarCatalogoPreguntas(): void {
  catalogoEnCurso = null;
}
