import { obtenerCatalogoPreguntas } from '../../onboarding/data/catalogoPreguntas';
import * as onboardingApi from '../../onboarding/api/onboardingApi';
import type { TipoPreguntaOnboarding } from '../../onboarding/types/onboarding.types';
import { PERIODOS, RESULTADOS_NEGOCIO, RESULTADOS_SALUD } from '../reglas';
import type {
  Area, DiaHito, MapaRenacimiento, PeriodoMedicion, TipoResultadoNegocio, TipoResultadoSalud,
} from '../tipos';
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
 * Los valores guardados son **exactamente** las claves de los catálogos de `reglas.ts` (verificado
 * contra `opciones_pregunta` el 2026-09-14), pero el backend no valida que una respuesta esté entre
 * las opciones: un valor de más se guardaría callado. Se comprueban acá antes de creerles.
 */
function esTipoSalud(valor: string | null): valor is TipoResultadoSalud {
  return valor !== null && RESULTADOS_SALUD.some(r => r.clave === valor);
}

function esTipoNegocio(valor: string | null): valor is TipoResultadoNegocio {
  return valor !== null && RESULTADOS_NEGOCIO.some(r => r.clave === valor);
}

function esPeriodo(valor: string | null): valor is PeriodoMedicion {
  return valor !== null && PERIODOS.some(p => p.clave === valor);
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
  return (await leerResumenDelMapa()).prioridad;
}

/** Lo que Plan necesita del Mapa. Ver {@link leerResumenDelMapa}. */
export interface ResumenDelMapa {
  prioridad: Area | null;
  /** La escala 1-10 de Relaciones: de dónde partió y a dónde va. `null` si no la contestó. */
  relacionesBase: number | null;
  relacionesMeta: number | null;
  /**
   * Qué mide cada objetivo, que es lo que decide si su avance admite una cuota mensual y de qué
   * clase. La Roca Maestra guarda el número, la unidad y la línea base, pero **no** el tipo de
   * resultado ni el periodo: sin estos tres campos, Plan no puede distinguir 82 kg de peso —que se
   * reparte, con tope de salud— de un 8/10 de energía o de una condición clínica, que no se
   * reparten. Ver `magnitudDeSalud` y `magnitudDeNegocio` en `reglas.ts`.
   */
  saludTipo: TipoResultadoSalud | null;
  /** La unidad que escribió la persona. Solo se usa para detectar una escala en el tipo "otro". */
  saludUnidad: string | null;
  negocioTipo: TipoResultadoNegocio | null;
  negocioPeriodo: PeriodoMedicion | null;
}

/**
 * Lo que Plan necesita del Mapa, en **una sola lectura**.
 *
 * Son cosas que no tienen nada que ver entre sí —la prioridad, la escala de Relaciones, y qué mide
 * cada objetivo— y viajan juntas por un motivo práctico: salen del mismo
 * `GET /onboarding/answers?flow=mapa_dia7`. Pedirlas por separado serían tres o cuatro requests
 * idénticas cada vez que alguien abre el Plan.
 *
 * **Por qué la escala de Relaciones sale de acá y no de la Roca Maestra.** Ese objetivo viaja a
 * `rocks` sin meta cuantitativa a propósito (un puntaje de 1 a 10 no es una unidad de negocio, y
 * mezclarlo con kilos o soles rompería el porcentaje). Así que este es el **único** lugar donde
 * sus dos números quedan guardados — y solo desde que el Mapa los manda, el 2026-09-14.
 *
 * Todo `null` ante cualquier fallo: no tener estos datos no es un error, es el estado normal de
 * quien recorrió el Mapa antes de que esto se cableara.
 */
export async function leerResumenDelMapa(): Promise<ResumenDelMapa> {
  const vacio: ResumenDelMapa = {
    prioridad: null,
    relacionesBase: null,
    relacionesMeta: null,
    saludTipo: null,
    saludUnidad: null,
    negocioTipo: null,
    negocioPeriodo: null,
  };
  try {
    const agrupadas = await onboardingApi.obtenerRespuestas(FLUJO);
    const resumen = { ...vacio };
    for (const seccion of agrupadas.sections) {
      for (const r of seccion.answers) {
        if (r.questionKey === CLAVE_PRIORIDAD && esArea(r.textValue)) resumen.prioridad = r.textValue;
        if (r.questionKey === 'map_relations_baseline_scale') resumen.relacionesBase = r.scaleValue;
        if (r.questionKey === 'map_relations_target_scale') resumen.relacionesMeta = r.scaleValue;
        if (r.questionKey === 'map_health_result_type' && esTipoSalud(r.textValue)) resumen.saludTipo = r.textValue;
        if (r.questionKey === 'map_health_unit') resumen.saludUnidad = r.textValue;
        if (r.questionKey === 'map_business_result_type' && esTipoNegocio(r.textValue)) {
          resumen.negocioTipo = r.textValue;
        }
        if (r.questionKey === 'map_business_period' && esPeriodo(r.textValue)) resumen.negocioPeriodo = r.textValue;
      }
    }
    return resumen;
  } catch {
    return vacio;
  }
}


/* ------------------------------------------------------------------------------------------------
 * El resto del Mapa: los tres objetivos completos, los nueve hitos y el cierre
 *
 * Son 36 respuestas que hasta el 2026-09-14 morían en el AsyncStorage del teléfono. Las preguntas
 * estaban sembradas por la V41 desde el primer día; lo que faltaba era que alguien las contestara.
 * ---------------------------------------------------------------------------------------------- */

/** Una respuesta lista para resolver su id y salir. El `tipo` se verifica contra el catálogo. */
interface Entrada {
  clave: string;
  tipo: TipoPreguntaOnboarding;
  textValue?: string;
  scaleValue?: number;
  booleanValue?: boolean;
}

/** Texto y selección única: en blanco NO se manda. Una casilla sin llenar no es "respondió: nada". */
function texto(clave: string, tipo: TipoPreguntaOnboarding, valor: string | null | undefined): Entrada | null {
  const v = (valor ?? '').trim();
  return v ? { clave, tipo, textValue: v } : null;
}

/** Escala 1-10 (Relaciones). `null` es "todavía no eligió", y eso tampoco se manda. */
function escala(clave: string, valor: number | null | undefined): Entrada | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  return { clave, tipo: 'ESCALA', scaleValue: Math.round(Math.max(1, Math.min(10, valor))) };
}

/**
 * Casilla. **`false` SÍ se manda**, y es la diferencia importante con las de arriba.
 *
 * "No edité la meta a mano" y "no me comprometo al seguimiento" son respuestas de verdad, no
 * campos vacíos. Saltearlas dejaría a `map_health_goal_edited` sin fila y nadie podría distinguir
 * "dijo que no" de "nunca llegó a esa pantalla".
 */
function casilla(clave: string, valor: boolean | null | undefined): Entrada | null {
  return valor === null || valor === undefined ? null : { clave, tipo: 'CASILLA', booleanValue: valor };
}

const SEGMENTO_POR_AREA: Record<Area, string> = {
  salud: 'health',
  negocio_dinero: 'business',
  relaciones: 'relations',
};

/** `map_milestone_business_60`. Las nueve claves se arman; no se escriben a mano nueve veces. */
function claveDeHito(area: Area, dia: DiaHito): string {
  return `map_milestone_${SEGMENTO_POR_AREA[area]}_${dia}`;
}

/**
 * Todas las respuestas del Mapa, en el orden en que la persona las fue dando.
 *
 * Los valores de las cuatro preguntas de selección única (`result_type`, `period`, `bond`) son
 * **exactamente** las mismas cadenas que los tipos de `tipos.ts`. Verificado contra
 * `opciones_pregunta` el 2026-09-14: los cuatro juegos coinciden uno a uno. Importa porque el
 * backend NO valida que el valor esté entre las opciones — un valor de más se guardaría callado.
 */
function entradasDelMapa(mapa: MapaRenacimiento): Entrada[] {
  const s = mapa.salud;
  const n = mapa.negocio;
  const r = mapa.relaciones;

  const posibles: (Entrada | null)[] = [
    texto('map_priority_area', 'SELECCION_UNICA', mapa.prioridad),

    // V03 · cuerpo y salud
    texto('map_health_result_type', 'SELECCION_UNICA', s.tipoResultado),
    texto('map_health_baseline', 'TEXTO', s.lineaBase),
    texto('map_health_target_day90', 'TEXTO', s.resultadoDia90),
    texto('map_health_unit', 'TEXTO', s.unidad),
    texto('map_health_evidence', 'TEXTO', s.evidencia),
    texto('map_health_reason', 'AREA_TEXTO', s.motivo),
    texto('map_health_goal_text', 'AREA_TEXTO', s.metaRedactada),
    casilla('map_health_goal_edited', s.metaEditadaAMano),

    // V04 · negocio y dinero
    texto('map_business_result_type', 'SELECCION_UNICA', n.tipoResultado),
    texto('map_business_baseline', 'TEXTO', n.lineaBase),
    texto('map_business_target_day90', 'TEXTO', n.resultadoDia90),
    texto('map_business_currency', 'TEXTO', n.moneda),
    texto('map_business_period', 'SELECCION_UNICA', n.periodo),
    texto('map_business_evidence', 'TEXTO', n.evidencia),
    texto('map_business_reason', 'AREA_TEXTO', n.motivo),
    texto('map_business_goal_text', 'AREA_TEXTO', n.metaRedactada),
    casilla('map_business_goal_edited', n.metaEditadaAMano),

    // V05 · relaciones. Su línea base y su meta son una ESCALA de 1 a 10, no un texto con unidad:
    // por eso este objetivo viaja sin meta cuantitativa a la Roca Maestra y acá sí conserva sus
    // dos números, que es el único lugar donde quedan guardados.
    texto('map_relations_bond', 'SELECCION_UNICA', r.vinculo),
    escala('map_relations_baseline_scale', r.situacionActual),
    escala('map_relations_target_scale', r.resultadoDia90),
    texto('map_relations_observable_change', 'AREA_TEXTO', r.cambioObservable),
    texto('map_relations_evidence', 'TEXTO', r.evidencia),
    texto('map_relations_reason', 'AREA_TEXTO', r.motivo),
    texto('map_relations_goal_text', 'AREA_TEXTO', r.metaRedactada),
    casilla('map_relations_goal_edited', r.metaEditadaAMano),

    // V08 · los nueve hitos
    ...mapa.hitos.map(h => texto(claveDeHito(h.area, h.dia), 'TEXTO', h.valor)),

    // V09 · retorno, y V10 · compromiso de seguimiento
    texto('map_return_protocol', 'AREA_TEXTO', mapa.retorno),
    casilla('map_followup_commitment', mapa.compromisoSeguimiento),
  ];

  return posibles.filter((e): e is Entrada => e !== null);
}

/**
 * Manda las respuestas una por una y devuelve cuántas entraron.
 *
 * **Una por una y no en lote** porque el endpoint guarda de a una, y porque son hechos sueltos: un
 * fallo en la respuesta 20 no tiene por qué llevarse puestas las 19 anteriores. Cada una es un
 * upsert por `(usuario, pregunta)`, así que reintentar la tanda completa es seguro.
 *
 * **No lanza nunca.** Se la llama al activar, después de que las Rocas Maestras y los hábitos ya
 * se crearon: un fallo de red acá no debe hacer parecer que la activación falló, porque lo que
 * importaba ya está hecho. Lo que se pierde es la memoria entre dispositivos, no el trabajo.
 */
export async function guardarRespuestasDelMapa(mapa: MapaRenacimiento): Promise<number> {
  const entradas = entradasDelMapa(mapa);
  if (entradas.length === 0) return 0;

  let catalogo;
  try {
    catalogo = await obtenerCatalogoPreguntas();
  } catch {
    return 0;
  }

  let guardadas = 0;
  for (const entrada of entradas) {
    const resolucion = catalogo.idDe(entrada.clave, entrada.tipo);
    if (!resolucion.ok) {
      // Mandarla con un id inventado la guardaría bajo OTRA pregunta sin dar error, que es el
      // fallo silencioso que `catalogoPreguntas` existe para impedir.
      console.warn(`[mapa] no se pudo guardar ${entrada.clave}: ${resolucion.motivo}`);
      continue;
    }
    try {
      await onboardingApi.guardarRespuesta({
        questionId: resolucion.id,
        textValue: entrada.textValue,
        scaleValue: entrada.scaleValue,
        booleanValue: entrada.booleanValue,
      });
      guardadas += 1;
    } catch {
      // Se sigue con el resto.
    }
  }
  return guardadas;
}
