import { obtenerCatalogoPreguntas } from '../../onboarding/data/catalogoPreguntas';
import * as onboardingApi from '../../onboarding/api/onboardingApi';
import type { Area, DiaHito, Hito } from '../tipos';
import { AREAS } from '../tipos';

/**
 * Las respuestas del Mapa que van al servidor por la maquinaria del onboarding: la prioridad
 * principal (V02) y los nueve hitos (V08).
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

/* ------------------------------------------------------------------------------------------------
 * Los nueve hitos (V08)
 * ---------------------------------------------------------------------------------------------- */

/**
 * El segmento que usa la clave del catálogo para cada área. **No coincide con el nombre del área**
 * y por eso vive en una tabla explícita: la V41 nombró las preguntas en inglés
 * (`map_milestone_health_30`) mientras el modelo de pantalla habla en castellano (`salud`).
 * Derivarlo con un `slice` o un `replace` sería adivinar; `negocio_dinero` → `business` no sale de
 * ninguna regla.
 */
const SEGMENTO_POR_AREA: Record<Area, string> = {
  salud: 'health',
  negocio_dinero: 'business',
  relaciones: 'relations',
};

/** `map_milestone_business_60`. Las nueve claves se arman, no se escriben a mano nueve veces. */
function claveDeHito(area: Area, dia: DiaHito): string {
  return `map_milestone_${SEGMENTO_POR_AREA[area]}_${dia}`;
}

/**
 * Guarda los hitos que tengan texto. Son nueve respuestas independientes —tres días por cada una
 * de las tres áreas— y por eso van en `POST /onboarding/answers` una por una: el endpoint guarda
 * de a una, y así un fallo en el séptimo no se lleva puestos los seis anteriores.
 *
 * **Se saltean los vacíos.** Un hito en blanco no es un dato: es una casilla que la persona no
 * llenó. Mandar la cadena vacía escribiría una respuesta que dice "respondió: nada", que es
 * distinto de no haber respondido y ensucia cualquier lectura posterior.
 *
 * No lanza, por el mismo motivo que {@link guardarPrioridad}: se la llama al activar, cuando las
 * Rocas y los hábitos ya se crearon, y un fallo de red acá no debe hacer parecer que la activación
 * falló. Devuelve cuántos se guardaron, para quien quiera registrarlo.
 */
export async function guardarHitos(hitos: Hito[]): Promise<number> {
  const conTexto = hitos.filter(h => h.valor.trim().length > 0);
  if (conTexto.length === 0) return 0;

  let catalogo;
  try {
    catalogo = await obtenerCatalogoPreguntas();
  } catch {
    return 0;
  }

  let guardados = 0;
  for (const hito of conTexto) {
    const clave = claveDeHito(hito.area, hito.dia);
    const resolucion = catalogo.idDe(clave, 'TEXTO');
    if (!resolucion.ok) {
      console.warn(`[mapa] no se pudo guardar el hito ${clave}: ${resolucion.motivo}`);
      continue;
    }
    try {
      await onboardingApi.guardarRespuesta({ questionId: resolucion.id, textValue: hito.valor.trim() });
      guardados += 1;
    } catch {
      // Se sigue con el resto: nueve hitos son nueve hechos sueltos, no una transacción.
    }
  }
  return guardados;
}
