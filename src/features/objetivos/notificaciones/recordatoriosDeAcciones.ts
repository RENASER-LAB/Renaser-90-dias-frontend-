import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  asegurarCanal,
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
  pedirPermiso,
} from '../../habits/notificaciones/recordatoriosDeHabito';
import {
  codigoDeLaCombinacion,
  COMBINACION_POR_DEFECTO,
  esLaCombinacionPorDefecto,
  type CombinacionDeAlarma,
} from '../../habits/notificaciones/utils/combinacionDeAlarma';
import type { CanalDeAlarma } from '../../alarmas/sonidoDeAlarma';
// Solo se LEE (no se toca `features/eventos/`): es la conversión fecha + hora de pared → instante que
// ya está probada allá. Duplicarla sería tener dos lugares donde equivocarse con la zona.
import { instanteEnZona, zonaDelTelefono } from '../../eventos/utils/zonaHoraria';
import type { RocaDiariaApi } from '../types/objetivos.types';
import { guardarPreferenciasDeAcciones, preferenciasDeAcciones } from './almacenDePreferencias';
import { canalDeLaAlarmaDeObjetivos } from './canalDeObjetivos';
import { planDelRecordatorioDiario, TEXTO_DIARIO } from './planDelDiario';
import {
  alarmaDeLaFecha,
  antelacionesDeLaFecha,
  esHora,
  leerPreferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  type PreferenciasDeAcciones,
} from './preferenciasPorDia';
import {
  cancelarRepeticionesDeLasAcciones,
  cancelarRepeticionesDelDiario,
  sincronizarRepeticionesDeLasAcciones,
  sincronizarRepeticionesDelDiario,
} from './repeticionesDeAcciones';
import { rutaDelAvisoDeAccion } from './rutaDelAvisoDeAccion';

// Las preferencias (y su lectura) viven en `preferenciasPorDia.ts` y `almacenDePreferencias.ts`; se reexportan para quien
// ya las importaba de acá.
export {
  guardarPreferenciasDeAcciones,
  leerPreferenciasDeAcciones,
  preferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  rutaDelAvisoDeAccion,
  TEXTO_DIARIO,
  type PreferenciasDeAcciones,
};

/**
 * Los recordatorios de las acciones de los objetivos (las rocas del día), en el teléfono
 * (decisión del dueño del 2026-09-26: «hoy solo los hábitos tienen recordatorio»).
 *
 * ## Lo que dice el modelo real
 *
 * Una acción del día (`RocaDiaria`, `GET /rocks/today` y `/rocks/tomorrow`) tiene `fecha` y una
 * `horaInicio` **opcional**: se agenda con hora o sin ella (`AgendarAccionesModal`: «una acción sin
 * hora es igual de válida que una agendada»). Por eso hay DOS recordatorios, los dos locales, sin
 * servidor ni tablas:
 *
 * 1. **«Recordarme mis acciones del día»**: uno diario a la hora que la persona elige, encendido o
 *    apagado. Cubre también las acciones sin hora. El texto es FIJO («Revisa las acciones de tus
 *    objetivos de hoy»): una alarma diaria se programa una vez y suena sola, sin que la app corra, así
 *    que no puede contar a esa hora cuántas quedan pendientes. Contarlas al programar mentiría en
 *    cuanto la persona cumpla una desde otro lado.
 * 2. **Aviso antes de cada acción con hora**: las mismas opciones que un hábito —sin aviso, 30 o 10
 *    min antes, a la hora (se pueden varias)—, pero UNA elección para todas las acciones de un mismo
 *    día: las acciones se agendan de nuevo cada día, y pedir la antelación de cada una cada vez es
 *    justo lo que no se le pide a alguien de 50-60 años. Son alarmas de FECHA (una acción es de un día,
 *    no se repite), y se ponen al día cada vez que la app lee la lista: se quitan las de acciones
 *    cumplidas, movidas o que ya no están.
 *
 * ## Por día de la semana (spec 010, 2026-10-20)
 *
 * Los dos recordatorios se pueden elegir distinto para cada día de la semana, como las horas y los
 * avisos de los hábitos (008): la hora y el encendido del recordatorio diario, y las antelaciones del
 * aviso. Lo que un día no dice lo hereda de la general (`preferenciasPorDia.ts`, que es pura). Sin días
 * distintos el recordatorio diario es UNA alarma diaria, como siempre; con alguno distinto, una semanal
 * por día (`planDelDiario.ts`). El aviso de cada acción usa las antelaciones del día de SU fecha.
 *
 * Todo sigue en el teléfono, por cuenta: sin servidor y sin endpoints nuevos.
 *
 * ## La hora
 *
 * `fecha` es el día del participante (lo decide el servidor en su zona) y `horaInicio` es hora de
 * pared. El instante se arma en la zona del TELÉFONO, igual que los hábitos (`DAILY` con la hora del
 * teléfono): la persona eligió «07:00» mirando su teléfono. Para el padrón (Lima, teléfono en Lima)
 * es lo mismo, y no depende de en qué hora UTC corra esto (probado con el reloj en la madrugada UTC,
 * que en Lima es el día anterior).
 */

export const ANTELACIONES_DE_ACCIONES: readonly number[] = [30, 10, 0];

const CLAVE_DIARIO = 'renaser.objetivos.recordatorios.diario.';
const CLAVE_ACCIONES = 'renaser.objetivos.recordatorios.acciones.';

async function cancelarIds(ids: string[]): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  for (const id of ids) {
    try {
      await N.cancelScheduledNotificationAsync(id);
    } catch {
      // Una que ya sonó o que el sistema olvidó no es un error.
    }
  }
}

/* ------------------------------------------------------------------------------------------------
 * 1. El recordatorio diario
 * ---------------------------------------------------------------------------------------------- */

/**
 * Los ids del recordatorio diario guardados. Una alarma diaria (lo de siempre) se guarda como su id suelto; las
 * semanales por día, como una lista JSON. Se leen los dos formatos: el teléfono que ya tenía el diario puesto no
 * pierde el id (y con él, la posibilidad de cancelarlo).
 */
function leerIdsDelDiario(crudo: string | null): string[] {
  if (!crudo) return [];
  if (!crudo.startsWith('[')) return [crudo];
  try {
    const lista = JSON.parse(crudo);
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function idsDelDiario(userId: string): Promise<string[]> {
  try {
    return leerIdsDelDiario(await AsyncStorage.getItem(CLAVE_DIARIO + userId));
  } catch {
    return [];
  }
}

/**
 * Quita el recordatorio diario (la alarma diaria o las semanales de cada día) y sus repeticiones («Repetir si no la
 * atiendo»). Idempotente.
 */
export async function cancelarRecordatorioDiario(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  try {
    const ids = await idsDelDiario(userId);
    if (ids.length > 0) {
      await cancelarIds(ids);
      await AsyncStorage.removeItem(CLAVE_DIARIO + userId);
    }
    await cancelarRepeticionesDelDiario();
    if (ids.length > 0) await reagrupar(userId);
  } catch {
    // Sin poder leer, no hay id que cancelar.
  }
}

/**
 * Deja puesto el recordatorio diario como dicen las preferencias (las guardadas, o las que se pasen): reemplaza el
 * anterior, así que ponerlo dos veces deja lo mismo. Sin días distintos, UNA alarma diaria a la hora general; con
 * alguno distinto, una semanal por día encendido (`planDelDiario.ts`). Apagado en todos los días: no queda ninguna.
 *
 * Devuelve `false` si no se pudo (sin permiso, web, Expo Go).
 */
export async function ponerElRecordatorioDiario(
  userId: string,
  prefsDadas?: PreferenciasDeAcciones,
  ahora: Date = new Date(),
): Promise<boolean> {
  const N = cargarNotificaciones();
  if (!N) return false;
  const prefs = prefsDadas ?? (await preferenciasDeAcciones(userId));
  const plan = planDelRecordatorioDiario(prefs);
  await cancelarRecordatorioDiario(userId);
  if (plan.esquema === 'ninguno' || (plan.esquema === 'porDia' && plan.pedidos.length === 0)) return true;
  try {
    if (!(await pedirPermiso())) return false;
    // Cada día suena como dice SU combinación: el canal es el de ella (varios canales si los días suenan distinto).
    const canales = new Map<string, CanalDeAlarma>();
    const canalDe = async (alarma: CombinacionDeAlarma): Promise<CanalDeAlarma> => {
      const canal = await canalDeLaAlarmaDeObjetivos(userId, alarma);
      if (!canales.has(canal.id)) {
        await asegurarCanal(canal);
        canales.set(canal.id, canal);
      }
      return canal;
    };
    const contenido = (canal: CanalDeAlarma, alarma: CombinacionDeAlarma) => ({
      title: TEXTO_DIARIO.titulo,
      body: TEXTO_DIARIO.cuerpo,
      sound: canal.sonidoDelAviso,
      // Cómo suena viaja en el aviso SOLO si no es lo de siempre (así el cambio de sonido de Yo → Alarmas y el aviso
      // agrupado la conservan); `diario` es lo que dice, al tocarlo, qué recordatorio se atendió.
      ...(esLaCombinacionPorDefecto(alarma) ? {} : { data: { diario: true, alarma } }),
    });
    if (plan.esquema === 'diario') {
      const [h, m] = plan.hora.split(':').map(Number);
      const canal = await canalDe(plan.alarma);
      const id = await N.scheduleNotificationAsync({
        content: contenido(canal, plan.alarma),
        trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: canal.id },
      });
      await AsyncStorage.setItem(CLAVE_DIARIO + userId, id);
    } else {
      const ids: string[] = [];
      for (const pedido of plan.pedidos) {
        const canal = await canalDe(pedido.alarma);
        ids.push(
          await N.scheduleNotificationAsync({
            identifier: pedido.identificador,
            content: contenido(canal, pedido.alarma),
            trigger: {
              type: N.SchedulableTriggerInputTypes.WEEKLY,
              weekday: pedido.weekday,
              hour: pedido.hora,
              minute: pedido.minuto,
              channelId: canal.id,
            },
          }),
        );
      }
      await AsyncStorage.setItem(CLAVE_DIARIO + userId, JSON.stringify(ids));
    }
    await sincronizarRepeticionesDelDiario(userId, { ahora, prefs });
    await reagrupar(userId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pone el recordatorio diario a `horaHHmm` (hora del teléfono) como hora GENERAL, encendido, con lo propio de cada
 * día que haya guardado. Reemplaza el anterior: programarlo dos veces deja UNO. Devuelve `false` si no se pudo (sin
 * permiso, web, Expo Go, hora inválida).
 */
export async function programarRecordatorioDiario(userId: string, horaHHmm: string): Promise<boolean> {
  if (!esHora(horaHHmm)) return false;
  const guardadas = await preferenciasDeAcciones(userId);
  return ponerElRecordatorioDiario(userId, { ...guardadas, diarioActivo: true, horaDiaria: horaHHmm });
}

/* ------------------------------------------------------------------------------------------------
 * 2. El aviso antes de cada acción con hora
 * ---------------------------------------------------------------------------------------------- */

export interface AlarmaDeAccion {
  /**
   * `rocaId|instante`: si cambia la hora o la antelación, cambia la clave y se reemplaza. Con una combinación «cómo suena»
   * que no es la de siempre (spec 010) suma `|codigo`: cambiar cómo suena un día rehace solo las alarmas de ese día. Las
   * de siempre conservan la clave de antes, así que actualizar la app no rehace nada.
   */
  clave: string;
  fecha: string;
  instanteMs: number;
  titulo: string;
  cuerpo: string;
  /** Adónde lleva tocarla: Plan → Objetivos en el eje de la acción (D-218). */
  ruta: string;
  /** La acción de la que es: lo que, al tocar la alarma, dice qué repeticiones se atendieron. */
  rocaId: string;
  /** Cómo suena ESE día (spec 010). */
  alarma: CombinacionDeAlarma;
}

export interface AlarmaDeAccionGuardada {
  id: string;
  fecha: string;
  instanteMs: number;
}

/** Las antelaciones que rigen las acciones de una fecha `YYYY-MM-DD`: las de su día de la semana (spec 010). */
export type AntelacionesDeLaFecha = (fecha: string) => readonly number[];

/**
 * Pura: qué alarmas corresponden a estas acciones, con estas antelaciones, a partir de `ahoraMs`.
 *
 * `antelaciones` es una lista fija para todas las acciones (así era antes de la spec 010) o una función que dice
 * cuáles rigen para la fecha de cada una: el aviso de una acción del sábado es el del sábado.
 */
export function alarmasDeseadas(
  rocas: RocaDiariaApi[],
  antelaciones: readonly number[] | AntelacionesDeLaFecha,
  ahoraMs: number,
  zona: string | null,
  alarmaDeLaFecha?: (fecha: string) => CombinacionDeAlarma,
): AlarmaDeAccion[] {
  const deseadas: AlarmaDeAccion[] = [];
  const vistas = new Set<string>();
  for (const roca of rocas) {
    // Una cumplida ya no necesita aviso. Una bloqueada (espera la VERDE de su eje) sí lo lleva: tiene
    // hora, y el aviso es justamente lo que ayuda a cumplir la VERDE.
    if (roca.completada || !roca.horaInicio) continue;
    const hora = roca.horaInicio.slice(0, 5);
    const aLaHora = instanteEnZona(roca.fecha, hora, zona);
    if (aLaHora === null) continue;
    const delDia = typeof antelaciones === 'function' ? antelaciones(roca.fecha) : antelaciones;
    const alarma = alarmaDeLaFecha?.(roca.fecha) ?? COMBINACION_POR_DEFECTO;
    for (const minutos of [...delDia].sort((a, b) => b - a)) {
      const instanteMs = aLaHora - minutos * 60_000;
      const clave = `${roca.id}|${instanteMs}${esLaCombinacionPorDefecto(alarma) ? '' : `|${codigoDeLaCombinacion(alarma)}`}`;
      if (instanteMs <= ahoraMs || vistas.has(clave)) continue;
      vistas.add(clave);
      deseadas.push({
        clave,
        fecha: roca.fecha,
        instanteMs,
        titulo: minutos > 0 ? `En ${minutos} min: ${roca.titulo}` : roca.titulo,
        cuerpo: `Te toca a las ${hora}.`,
        ruta: rutaDelAvisoDeAccion(roca),
        rocaId: roca.id,
        alarma,
      });
    }
  }
  return deseadas;
}

/**
 * Pura: qué cancelar y qué programar para que el teléfono quede como `deseadas`. Idempotente: con lo
 * guardado ya al día, no hay nada que hacer.
 *
 * Solo se cancela lo que esta lista puede desmentir: alarmas de un día que la lista TRAE (`fechas`), o
 * que ya pasaron. Desde D-217 la lista es la semana agendable entera (`GET /rocks/upcoming`); con un
 * backend anterior, hoy y mañana, y entonces una acción del viernes conserva su alarma hasta que su día
 * entra en la lista.
 */
export function planDeAlarmasDeAcciones(args: {
  guardadas: Record<string, AlarmaDeAccionGuardada>;
  deseadas: AlarmaDeAccion[];
  fechas: ReadonlySet<string>;
  ahoraMs: number;
}): { cancelar: string[]; programar: AlarmaDeAccion[] } {
  const { guardadas, deseadas, fechas, ahoraMs } = args;
  const claves = new Set(deseadas.map(d => d.clave));
  const cancelar = Object.entries(guardadas)
    .filter(([clave, g]) => !claves.has(clave) && (fechas.has(g.fecha) || g.instanteMs <= ahoraMs))
    .map(([clave]) => clave);
  const programar = deseadas.filter(d => !guardadas[d.clave]);
  return { cancelar, programar };
}

/**
 * Una sola escritura por vez. Plan y el sincronizador de `App.tsx` pueden correr juntos al abrir la
 * app; sin cola, los dos leerían «no hay nada guardado», los dos programarían, y el segundo en escribir
 * pisaría los ids del primero: alarmas duplicadas que ya nadie puede cancelar.
 */
let cola: Promise<unknown> = Promise.resolve();
function enCola<T>(trabajo: () => Promise<T>): Promise<T> {
  const turno = cola.then(trabajo, trabajo);
  cola = turno.catch(() => undefined);
  return turno;
}

async function leerGuardadas(userId: string): Promise<Record<string, AlarmaDeAccionGuardada>> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_ACCIONES + userId);
    const leido = crudo ? JSON.parse(crudo) : {};
    return leido && typeof leido === 'object' && !Array.isArray(leido) ? leido : {};
  } catch {
    return {};
  }
}

async function escribirGuardadas(userId: string, guardadas: Record<string, AlarmaDeAccionGuardada>): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_ACCIONES + userId, JSON.stringify(guardadas));
  } catch {
    // La próxima sincronización lo vuelve a intentar.
  }
}

/**
 * Pone las alarmas de las acciones de acuerdo con la lista que acaba de llegar (hoy y mañana). No
 * pide permiso —corre al abrir una pantalla, no por un toque—: sin permiso solo quita.
 *
 * @param fechasDeLaLista los días que la lista representa aunque vengan vacíos (hoy y mañana). Si no
 *        se pasan, los de las acciones de la lista.
 */
export async function sincronizarAlarmasDeAcciones(
  userId: string,
  rocas: RocaDiariaApi[],
  opciones: { ahoraMs?: number; zona?: string | null; fechasDeLaLista?: string[] } = {},
): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  return enCola(() => sincronizarAhora(userId, rocas, opciones));
}

async function sincronizarAhora(
  userId: string,
  rocas: RocaDiariaApi[],
  opciones: { ahoraMs?: number; zona?: string | null; fechasDeLaLista?: string[] },
): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  const ahoraMs = opciones.ahoraMs ?? Date.now();
  const zona = opciones.zona === undefined ? zonaDelTelefono() : opciones.zona;
  const prefs = await preferenciasDeAcciones(userId);
  const guardadas = await leerGuardadas(userId);
  const fechas = new Set([...(opciones.fechasDeLaLista ?? []), ...rocas.map(r => r.fecha)]);
  const plan = planDeAlarmasDeAcciones({
    guardadas,
    deseadas: alarmasDeseadas(
      rocas,
      fecha => antelacionesDeLaFecha(prefs, fecha),
      ahoraMs,
      zona,
      fecha => alarmaDeLaFecha(prefs, fecha),
    ),
    fechas,
    ahoraMs,
  });
  if (plan.cancelar.length > 0 || plan.programar.length > 0) {
    for (const clave of plan.cancelar) {
      await cancelarIds([guardadas[clave].id]);
      delete guardadas[clave];
    }
    const permiso = plan.programar.length > 0 && (await N.getPermissionsAsync().catch(() => ({ granted: false }))).granted;
    if (permiso) {
      // Cada acción sale por el canal de la combinación de SU día (varios canales si los días suenan distinto).
      const canales = new Map<string, CanalDeAlarma>();
      for (const alarma of plan.programar) {
        try {
          const canal = await canalDeLaAlarmaDeObjetivos(userId, alarma.alarma);
          if (!canales.has(canal.id)) {
            await asegurarCanal(canal);
            canales.set(canal.id, canal);
          }
          // La ruta y, solo si no es lo de siempre, cómo suena; con «Repetir», también la acción, para que tocar esta
          // alarma sepa qué repeticiones atendió. Sin combinación propia el contenido es el de antes.
          const data: Record<string, unknown> = { route: alarma.ruta };
          if (!esLaCombinacionPorDefecto(alarma.alarma)) data.alarma = alarma.alarma;
          if (alarma.alarma.repetir) data.rocaId = alarma.rocaId;
          const id = await N.scheduleNotificationAsync({
            content: { title: alarma.titulo, body: alarma.cuerpo, sound: canal.sonidoDelAviso, data },
            trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(alarma.instanteMs), channelId: canal.id },
          });
          guardadas[alarma.clave] = { id, fecha: alarma.fecha, instanteMs: alarma.instanteMs };
        } catch {
          // Una que falla no impide las demás; la próxima lectura la vuelve a intentar.
        }
      }
    }
    await escribirGuardadas(userId, guardadas);
    await reagrupar(userId);
  }
  // «Repetir si no la atiendo»: aunque las alarmas de aviso no cambiaran, una acción cumplida o movida deja sin repetición
  // a la suya, y una que cambió de «cómo suena» las gana.
  await sincronizarRepeticionesDeLasAcciones(userId, { rocas, fechas, prefs, ahoraMs, zona });
}

/**
 * E-410: con varias acciones (o el diario y un hábito) a la misma hora, suena un solo aviso que las
 * nombra a todas; y una que quedó sola vuelve a sonar. Se carga acá adentro porque aquel módulo usa
 * este (un import de ida y vuelta dejaría uno sin cargar).
 */
async function reagrupar(userId: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { agruparAvisosQueCoinciden } = require('../../alarmas/avisosJuntos') as typeof import('../../alarmas/avisosJuntos');
    await agruparAvisosQueCoinciden(userId);
  } catch {
    // Sin agrupar, cada una suena por su lado, como antes.
  }
}

/**
 * Quita todas las alarmas de acciones de esta persona en este teléfono, con las repeticiones de cada acción (no el
 * recordatorio diario ni las suyas).
 */
export async function cancelarTodasLasAlarmasDeAcciones(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  return enCola(async () => {
    const guardadas = await leerGuardadas(userId);
    await cancelarIds(Object.values(guardadas).map(g => g.id));
    await cancelarRepeticionesDeLasAcciones();
    await escribirGuardadas(userId, {});
    await reagrupar(userId);
  });
}

/**
 * Quita el aviso «antes de la acción» de UNA acción que acaba de sellarse (issue #33, 2026-10-27): una acción cumplida
 * no avisa más. Hasta ahora ese aviso solo se cancelaba en la próxima lectura de la lista (al abrir Plan o la app), y
 * entre medio sonaba aunque la acción ya estuviera hecha. Son alarmas de fecha de esa acción: se cancelan en el sistema.
 * Solo las de esa acción: el recordatorio diario y las demás acciones no se tocan.
 *
 * **Las entradas guardadas se dejan.** Si se borraran, una lectura de la lista anterior al sello (Plan sin releer) las
 * volvería a programar. Con la entrada puesta no se reprograma, y la primera lectura que ya trae la acción cumplida la
 * quita sola (`planDeAlarmasDeAcciones`: lo que la lista desmiente se cancela y se olvida). Idempotente. No sabe de qué
 * cuenta es la acción —`sellarRocaDiaria` no recibe la cuenta—, así que mira las de este teléfono (hay una cuenta con
 * alarmas por vez: `prepararAlarmasPara` suelta las de otra).
 */
export async function cancelarElAvisoDeLaAccion(rocaId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES || !rocaId) return;
  return enCola(async () => {
    try {
      const claves = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(CLAVE_ACCIONES));
      for (const clave of claves) {
        const userId = clave.slice(CLAVE_ACCIONES.length);
        const propias = Object.entries(await leerGuardadas(userId)).filter(([k]) => k.startsWith(`${rocaId}|`));
        if (propias.length === 0) continue;
        await cancelarIds(propias.map(([, g]) => g.id));
        // Si esta acción era la que llevaba el aviso de un grupo, el otro vuelve a sonar solo con su texto y su sonido.
        await reagrupar(userId);
      }
    } catch {
      // Sin poder leer lo guardado, el aviso se quita en la próxima lectura de la lista, como antes.
    }
  });
}

/** Pide el permiso de avisos (para cuando la persona enciende algo con un toque). */
export async function pedirPermisoDeAvisos(): Promise<boolean> {
  return pedirPermiso();
}

/** Los ids de todas las alarmas de objetivos (diario y por acción): para pasarlas al sonido nuevo. */
export async function idsDeRecordatoriosDeAcciones(userId: string): Promise<string[]> {
  if (!HAY_RECORDATORIOS_LOCALES) return [];
  const ids = Object.values(await leerGuardadas(userId)).map(g => g.id);
  // El diario puede ser una alarma diaria o una semanal por día (spec 010).
  ids.push(...(await idsDelDiario(userId)));
  return ids;
}

/** Todas las fechas `YYYY-MM-DD` de `desde` a `hasta`, inclusive (a lo sumo 14, por las dudas). */
export function fechasEntre(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  const [a, m, d] = desde.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d));
  while (fechas.length < 14) {
    const iso = dia.toISOString().slice(0, 10);
    if (iso > hasta) break;
    fechas.push(iso);
    dia.setUTCDate(dia.getUTCDate() + 1);
  }
  return fechas;
}

/** De dónde se leen las acciones agendadas. Se inyecta para probarlo sin red. */
export interface LectorDeAcciones {
  agendadas: () => Promise<{ desde: string; hasta: string; rocas: RocaDiariaApi[] }>;
  hoy: () => Promise<RocaDiariaApi[]>;
  manana: () => Promise<RocaDiariaApi[]>;
}

/**
 * Las acciones con las que se ponen al día las alarmas, y qué días representan (D-217).
 *
 * Primero la semana agendable entera (`GET /rocks/upcoming`). Si ese pedido falla —un backend anterior
 * a D-217 responde 404— se cae a hoy y mañana, como antes; y si una de esas dos falla, se usa la otra y
 * solo sus días. `null` si no llegó nada: no se toca ninguna alarma.
 */
export async function leerAccionesAgendadas(
  lector: LectorDeAcciones,
): Promise<{ rocas: RocaDiariaApi[]; fechas: string[] } | null> {
  try {
    const { desde, hasta, rocas } = await lector.agendadas();
    return { rocas, fechas: fechasEntre(desde, hasta) };
  } catch {
    const [hoy, manana] = await Promise.allSettled([lector.hoy(), lector.manana()]);
    if (hoy.status === 'rejected' && manana.status === 'rejected') return null;
    const rocas = [...(hoy.status === 'fulfilled' ? hoy.value : []), ...(manana.status === 'fulfilled' ? manana.value : [])];
    return { rocas, fechas: [] };
  }
}
