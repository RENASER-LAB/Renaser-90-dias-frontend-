import { obtenerCatalogoPreguntas } from '../../onboarding/data/catalogoPreguntas';
import * as onboardingApi from '../../onboarding/api/onboardingApi';
import type { Area } from '../tipos';
import { AREAS } from '../tipos';

/**
 * La prioridad principal del Mapa (V02, `¿Qué área manda en tus próximos 90 días?`), guardada en
 * el servidor en vez de solo en el teléfono.
 *
 * ── Por qué existe este archivo ──
 *
 * El Mapa preguntaba la prioridad, la exigía para poder continuar… y nunca salía del dispositivo.
 * De todo el recorrido solo llegaban al servidor las tres Rocas Maestras y una marca de "etapa
 * terminada"; el resto vivía en `AsyncStorage` bajo `renaser.mapa-renacimiento.v2.{userId}`.
 * Resultado: quien reinstalaba, cambiaba de teléfono o entraba por web perdía su prioridad, y la
 * pantalla de Objetivos del Plan no tenía forma de saber cuál de los tres ejes manda.
 *
 * No hizo falta backend ni migración: la V41 ya había sembrado la pregunta `map_priority_area` con
 * sus tres opciones, y `POST/GET /api/v1/onboarding/answers` ya existían. Esto es cableado.
 *
 * ── Por qué los valores no se traducen ──
 *
 * Las opciones que sembró la V41 son, textualmente, `salud`, `negocio_dinero` y `relaciones`: las
 * mismas tres cadenas que el tipo {@link Area} de este módulo. Es a propósito y conviene no
 * "mejorarlo": cualquier traducción intermedia sería un cuarto vocabulario que mantener, y ya
 * tenemos dos (áreas del Mapa y ejes de Rocas, ver `EJE_POR_AREA`).
 */

/** La clave es estable en toda base; el `id` numérico NO — ver `data/catalogoPreguntas.ts`. */
const CLAVE_PRIORIDAD = 'map_priority_area';

/** Una `SELECCION_UNICA` viaja en `textValue`, igual que `sex` en la Ficha Inicial. */
const TIPO_PRIORIDAD = 'SELECCION_UNICA' as const;

const FLUJO = 'mapa_dia7';

function esArea(valor: string | null): valor is Area {
  return valor !== null && (AREAS as readonly string[]).includes(valor);
}

/**
 * Guarda la prioridad elegida. Es un upsert por `(usuario, pregunta)`, así que llamarla dos veces
 * con lo mismo deja lo mismo y reintentar tras un fallo de red es seguro.
 *
 * **No lanza.** Se la llama desde la pantalla de prioridad mientras la persona elige, y un fallo
 * de red no debe bloquear el recorrido del Mapa: el borrador local sigue siendo la fuente durante
 * el flujo, y la activación vuelve a intentarlo. Devuelve si se guardó, para quien quiera saberlo.
 */
export async function guardarPrioridad(area: Area): Promise<boolean> {
  try {
    const catalogo = await obtenerCatalogoPreguntas();
    const resolucion = catalogo.idDe(CLAVE_PRIORIDAD, TIPO_PRIORIDAD);
    if (!resolucion.ok) {
      // Mandarla con un id inventado guardaría la respuesta bajo OTRA pregunta sin dar error, que
      // es justo el fallo silencioso que `catalogoPreguntas` existe para impedir.
      console.warn(`[mapa] no se pudo guardar la prioridad: ${resolucion.motivo}`);
      return false;
    }
    await onboardingApi.guardarRespuesta({ questionId: resolucion.id, textValue: area });
    return true;
  } catch {
    return false;
  }
}

/**
 * Lee la prioridad guardada. `null` cuando la persona todavía no la eligió, cuando hizo el Mapa
 * antes de que esto existiera, o cuando la lectura falla — los tres casos se tratan igual a
 * propósito: quien llama muestra el orden por defecto en vez de un error, porque no tener
 * prioridad no es una falla.
 */
export async function leerPrioridad(): Promise<Area | null> {
  try {
    const agrupadas = await onboardingApi.obtenerRespuestas(FLUJO);
    for (const seccion of agrupadas.sections) {
      for (const respuesta of seccion.answers) {
        if (respuesta.questionKey === CLAVE_PRIORIDAD && esArea(respuesta.textValue)) {
          return respuesta.textValue;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
