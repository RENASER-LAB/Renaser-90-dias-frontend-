import AsyncStorage from '@react-native-async-storage/async-storage';

import * as habitsApi from '../api/habitsApi';
import { alCumplirUnHabito } from '../eventos/habitoCumplido';
import type { PreferenciaHabitoApi } from '../types/habits.types';
import { anotarCumplido } from './cumplidoDeHoy';
import {
  ajustarRecordatoriosAlServidor,
  asegurarCanal,
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
  recordatoriosPorHabito,
  rutaDelAvisoDeHabito,
  sonidoDe,
} from './recordatoriosDeHabito';
import { canalDeLaCombinacion, esLaCombinacionPorDefecto } from './utils/combinacionDeAlarma';
import {
  fechaCompacta,
  habitoDeLaRuta,
  planDeRepeticiones,
  prefijoDeRepeticiones,
  repeticionDe,
  type EntradaDeRepeticiones,
} from './utils/repeticionesDeAlarma';

/**
 * «Repetir si no la atiendo» en el teléfono (spec 009, research R2): pone las alarmas de repetición de un hábito,
 * las mantiene al día y las cancela cuando la persona atiende el hábito. Lo que decide QUÉ alarmas hay es puro y
 * vive en `utils/repeticionesDeAlarma.ts`; acá están los efectos.
 *
 * ## Quién las pone y quién las renueva
 *
 * - **`programar` y `programarConCambioDiferido`** (`recordatoriosDeHabito.ts`), cada vez que el hábito se
 *   reprograma: guardar en el editor, cambiar la hora desde Plan, la puesta al día. Las cancela `cancelar`.
 * - **La puesta al día** (`ajustarRecordatoriosAlServidor`, al abrir la app y al volver a primer plano): renueva la
 *   ventana de 7 días de TODOS los hábitos con lo que dice el servidor. Es lo que mantiene el «hoy y los 6 días
 *   siguientes» corriendo si la persona abre la app a diario.
 *
 * Es una diferencia contra lo ya puesto, no un «borrar y volver a poner»: lo que ya está igual (mismo instante,
 * mismo canal, mismo texto) no se toca, así que renovar no cuesta una llamada nativa por repetición.
 *
 * ## Cuándo se cancelan las de HOY (SC-003)
 *
 * - **La persona toca cualquier alarma del hábito** (`atenderLaAlarmaDeUnHabito`, desde el mismo oyente de
 *   respuestas que ya abre `/habitos/{id}`). Solo se cuenta un toque RECIENTE: al abrir la app en frío, la librería
 *   devuelve la última respuesta aunque sea de ayer, y esa no atiende lo de hoy.
 * - **Completa el hábito** (`atenderAlCumplirUnHabito`, el aviso `habitoCumplido` de `completarRegistro`).
 *
 * Además de cancelarlas, se ANOTA que ese día ya se atendió: la renovación de la ventana corre al abrir la app y,
 * sin la nota, volvería a poner la repetición de las 07:10 justo después de haber hecho el hábito. La nota es por
 * hábito y por día del hábito (`AAAAMMDD`) y guarda solo hoy y ayer.
 *
 * Una repetición de MAÑANA nunca se toca: atender el hábito hoy no apaga las de los días siguientes.
 *
 * ## Límites conocidos
 *
 * - Un hábito cumplido desde OTRO teléfono o desde la web no avisa a este: sus repeticiones de hoy suenan igual.
 *
 * > **Corregido 2026-10-27 (issue #33).** Decía también que la Pastilla Renacer y la Clase diaria, que se cierran por su
 * > propio endpoint, no cancelaban sus repeticiones. Ahora llaman a `alCumplirElHabito` al confirmar el servidor, que
 * > además silencia el resto de las alarmas de hoy (el puente de `recordatoriosDeHabito.ts`).
 * - Android calla el segundo sonido de una misma app en el mismo segundo: si la repetición de un hábito cae en el
 *   mismo minuto que la alarma de otro, una de las dos puede no sonar (ya pasa con las alarmas principales y por
 *   eso existe `avisosJuntos`, que no agrupa las repeticiones).
 */

const PREFIJO_ATENDIDAS = 'renaser.habitos.repeticiones.atendidas.';

/** Cuánto tiempo después de entregada una alarma todavía cuenta el toque como «la atendí ahora». */
const VIGENCIA_DEL_TOQUE_MS = 3 * 60 * 60 * 1000;

async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

const claveDeAtendidas = (habitoId: string) => `${PREFIJO_ATENDIDAS}${habitoId}`;

/** `AAAAMMDD` de ayer: lo más viejo que se recuerda. */
function ayerCompacto(ahora: Date): string {
  return fechaCompacta(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1, 12));
}

/** Los días del hábito (`AAAAMMDD`) que la persona ya atendió. */
export async function diasAtendidos(habitoId: string, ahora: Date = new Date()): Promise<Set<string>> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(claveDeAtendidas(habitoId));
    const lista = crudo ? JSON.parse(crudo) : [];
    const desde = ayerCompacto(ahora);
    return new Set<string>(
      Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string' && /^\d{8}$/.test(x) && x >= desde) : [],
    );
  }, new Set<string>());
}

async function anotarAtendidos(habitoId: string, fechas: Iterable<string>, ahora: Date): Promise<void> {
  await sinRomper(async () => {
    const todas = await diasAtendidos(habitoId, ahora);
    for (const f of fechas) todas.add(f);
    await AsyncStorage.setItem(claveDeAtendidas(habitoId), JSON.stringify([...todas].sort()));
  }, undefined);
}

type Disparo = { type?: unknown; value?: unknown; date?: unknown; channelId?: unknown };

/** El instante (ms) de una alarma de fecha ya programada. La librería lo devuelve en `value`; un doble, en `date`. */
function instanteDelDisparo(trigger: unknown): number | null {
  const t = (trigger ?? {}) as Disparo;
  if (typeof t.value === 'number') return t.value;
  if (typeof t.date === 'number') return t.date;
  if (t.date instanceof Date) return t.date.getTime();
  return null;
}

interface ProgramadaCruda {
  identifier?: string;
  content?: { title?: string | null; data?: Record<string, unknown> | null };
  trigger?: unknown;
}

/** Lo programado ahora, o `[]` si la librería falla. */
async function programadasAhora(N: NonNullable<ReturnType<typeof cargarNotificaciones>>): Promise<ProgramadaCruda[]> {
  const lista = (await N.getAllScheduledNotificationsAsync?.()) as unknown;
  return Array.isArray(lista) ? (lista as ProgramadaCruda[]) : [];
}

export interface EntradaParaSincronizar extends EntradaDeRepeticiones {
  titulo: string;
  /** Para que tocar la repetición abra Training en su dimensión (como la alarma principal). */
  dimension?: string | null;
  /** `false` = sin permiso de avisos: no se pone ninguna y se quitan las que hubiera. */
  permiso?: boolean;
}

/**
 * Deja puestas EXACTAMENTE las repeticiones que corresponden a este hábito: pone las que faltan o cambiaron,
 * y quita las que sobran (se apagó «Repetir», se atendió el día, ya no hay aviso). Devuelve cuántas puso.
 * Nunca lanza. En web y Expo Go no hace nada.
 */
export async function sincronizarRepeticiones(
  userId: string,
  entrada: EntradaParaSincronizar,
  opciones: { ahora?: Date; programadas?: ProgramadaCruda[] } = {},
): Promise<number> {
  if (!HAY_RECORDATORIOS_LOCALES) return 0;
  const N = cargarNotificaciones();
  if (!N) return 0;
  return sinRomper(async () => {
    const ahora = opciones.ahora ?? new Date();
    const prefijo = prefijoDeRepeticiones(entrada.habitoId);
    const programadas = opciones.programadas ?? (await programadasAhora(N));
    const sobran = new Map<string, ProgramadaCruda>();
    for (const p of programadas) {
      if (typeof p?.identifier === 'string' && p.identifier.startsWith(prefijo) && repeticionDe(p.identifier)) {
        sobran.set(p.identifier, p);
      }
    }
    const deseadas = entrada.permiso === false
      ? []
      : planDeRepeticiones(entrada, ahora, await diasAtendidos(entrada.habitoId, ahora));
    const tono = await sonidoDe(userId, entrada.habitoId);
    const ruta = rutaDelAvisoDeHabito(entrada.habitoId, entrada.dimension);
    let puestas = 0;
    for (const pedido of deseadas) {
      const canal = canalDeLaCombinacion('habitos', tono, pedido.alarma, {
        id: entrada.habitoId,
        titulo: entrada.titulo,
      });
      const ya = sobran.get(pedido.identificador);
      sobran.delete(pedido.identificador);
      const disparo = (ya?.trigger ?? {}) as Disparo;
      const yaEsLaMisma = ya !== undefined
        && instanteDelDisparo(ya.trigger) === pedido.instanteMs
        && disparo.channelId === canal.id
        && ya.content?.title === entrada.titulo
        && (ya.content?.data as { route?: unknown } | null | undefined)?.route === ruta;
      if (yaEsLaMisma) continue;
      await asegurarCanal(canal);
      await N.scheduleNotificationAsync({
        identifier: pedido.identificador,
        content: {
          title: entrada.titulo,
          body: `Te tocaba a las ${pedido.horaDelDia}.`,
          sound: canal.sonidoDelAviso,
          data: {
            route: ruta,
            // Cómo suena, para que el cambio de sonido y el aviso agrupado sepan por qué canal sale esta alarma.
            ...(esLaCombinacionPorDefecto(pedido.alarma) ? {} : { alarma: pedido.alarma }),
          },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(pedido.instanteMs), channelId: canal.id },
      });
      puestas++;
    }
    for (const id of sobran.keys()) {
      await N.cancelScheduledNotificationAsync(id).catch(() => undefined);
    }
    return puestas;
  }, 0);
}

/**
 * Quita las repeticiones de UN hábito (sin tocar la nota de «atendida»). Lo usa `cancelar`: si el hábito deja de
 * tener alarmas, tampoco tiene repeticiones.
 */
export async function cancelarRepeticiones(habitoId: string): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  await sinRomper(async () => {
    const prefijo = prefijoDeRepeticiones(habitoId);
    for (const p of await programadasAhora(N)) {
      if (typeof p?.identifier === 'string' && p.identifier.startsWith(prefijo) && repeticionDe(p.identifier)) {
        await N.cancelScheduledNotificationAsync(p.identifier).catch(() => undefined);
      }
    }
  }, undefined);
}

/**
 * Las repeticiones que hay programadas ahora: identificador → hábito. Para pasarlas al sonido nuevo cuando se
 * cambia el de Yo → Alarmas (no están entre los ids que guarda `recordatoriosPorHabito`).
 */
export async function repeticionesProgramadas(): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const N = cargarNotificaciones();
  if (!N) return mapa;
  await sinRomper(async () => {
    for (const p of await programadasAhora(N)) {
      const r = repeticionDe(p?.identifier);
      if (r && p.identifier) mapa.set(p.identifier, r.habitoId);
    }
  }, undefined);
  return mapa;
}

/**
 * La persona atendió el hábito (tocó una de sus alarmas o lo completó): las repeticiones de hoy dejan de sonar y
 * no se vuelven a poner. Las de mañana en adelante siguen. Idempotente; nunca lanza.
 */
export async function atenderHabito(habitoId: string, ahora: Date = new Date(), dia?: string): Promise<void> {
  // `dia` (`AAAAMMDD`): el día del hábito que se cumplió, si no es el de hoy (Dormir cumplido pasada la medianoche).
  const hoy = dia ?? fechaCompacta(ahora);
  const atendidos = new Set<string>([hoy]);
  const N = cargarNotificaciones();
  if (N) {
    await sinRomper(async () => {
      const prefijo = prefijoDeRepeticiones(habitoId);
      for (const p of await programadasAhora(N)) {
        if (typeof p?.identifier !== 'string' || !p.identifier.startsWith(prefijo)) continue;
        const r = repeticionDe(p.identifier);
        // Hasta hoy: una repetición de ayer que cruzó la medianoche (23:58 → 00:03) también es de lo que se atendió.
        if (!r || r.fecha > hoy) continue;
        atendidos.add(r.fecha);
        await N.cancelScheduledNotificationAsync(p.identifier).catch(() => undefined);
      }
    }, undefined);
  }
  await anotarAtendidos(habitoId, atendidos, ahora);
}

/**
 * ¿El toque a una alarma es de ahora? Al abrir la app en frío, `getLastNotificationResponseAsync` devuelve la
 * última respuesta aunque sea de ayer: esa no atiende el hábito de hoy. Cuenta si la alarma se entregó hoy o hace
 * menos de 3 h (una alarma de las 23:55 tocada a las 00:02). Sin fecha, se toma como de ahora.
 */
export function esUnToqueReciente(entregadaEnMs: unknown, ahora: Date = new Date()): boolean {
  if (typeof entregadaEnMs !== 'number' || !Number.isFinite(entregadaEnMs)) return true;
  return fechaCompacta(new Date(entregadaEnMs)) === fechaCompacta(ahora) || ahora.getTime() - entregadaEnMs <= VIGENCIA_DEL_TOQUE_MS;
}

/**
 * Lo que hace el oyente de respuestas cuando se toca un aviso: si es de un hábito (`/habitos/{id}…`) y el toque
 * es reciente, ese hábito queda atendido. Devuelve el hábito atendido, o `null`.
 */
export async function atenderLaAlarmaDeUnHabito(
  ruta: unknown,
  entregadaEnMs?: unknown,
  ahora: Date = new Date(),
): Promise<string | null> {
  const habitoId = habitoDeLaRuta(ruta);
  if (!habitoId || !esUnToqueReciente(entregadaEnMs, ahora)) return null;
  await atenderHabito(habitoId, ahora);
  return habitoId;
}

/**
 * El hábito se cumplió hoy (issue #33, 2026-10-27): no suena nada más de él en el resto del día, y mañana suena normal.
 *
 * 1. **Anota** que se cumplió hoy (`cumplidoDeHoy.ts`). Es lo primero y no depende de nada: desde ese momento cualquier
 *    `programar` del hábito —Plan al mover la hora, Training al guardar, la puesta al día— lo respeta.
 * 2. **Atiende** el hábito: las repeticiones +5/+10 de hoy se cancelan y no vuelven (`atenderHabito`).
 * 3. **Pone el puente**: si el hábito tiene alarmas en este teléfono, lee sus preferencias —lo mismo que lee la puesta al
 *    día— y vuelve a poner sus alarmas SOLO para ese hábito (`ajustarRecordatoriosAlServidor`), que con la nota sabe
 *    reemplazar las que se repiten por alarmas de fecha desde mañana (`ponerElPuenteSiHoyYaSeCumplio`). Si ya no queda
 *    ningún aviso de hoy por sonar no toca ninguna alarma. Un hábito sin alarmas en el teléfono no hace ningún pedido.
 *
 * Vale para todos los cierres de un hábito: el aviso `habitoCumplido` de `completarRegistro` (Training, la hoja de
 * evidencia, el registro con foto, el acompañante) y los que cierran por su propio endpoint, la Pastilla Renacer y la
 * Clase diaria, que llaman a esta función directamente al confirmar el servidor. Si el pedido de las preferencias falla,
 * la nota ya quedó y la próxima puesta al día lo deja como corresponde. Idempotente; nunca lanza.
 */
export async function alCumplirElHabito(
  userId: string,
  habitoId: string,
  opciones: { ahora?: Date; fecha?: string; preferencias?: () => Promise<PreferenciaHabitoApi[]> } = {},
): Promise<void> {
  if (!userId || !habitoId || !HAY_RECORDATORIOS_LOCALES) return;
  const ahora = opciones.ahora ?? new Date();
  // El día del HÁBITO (`fechaEjecucion` del registro, `YYYY-MM-DD`), que no siempre es el de hoy: Dormir cumplido a las
  // 00:40 es del día anterior y no debe apagar lo que le queda al de hoy. Sin dato, el de hoy según el teléfono.
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(opciones.fecha ?? '') ? (opciones.fecha as string).replace(/-/g, '') : fechaCompacta(ahora);
  await sinRomper(async () => {
    await anotarCumplido(userId, habitoId, dia);
    await atenderHabito(habitoId, ahora, dia);
    if (((await recordatoriosPorHabito(userId)).get(habitoId)?.length ?? 0) === 0) return;
    const preferencias = await (opciones.preferencias ?? habitsApi.obtenerPreferencias)();
    const propia = preferencias.find(p => p.habitId === habitoId);
    if (propia) await ajustarRecordatoriosAlServidor(userId, [propia], { ahora });
  }, undefined);
}

/** Escucha «se cumplió un hábito» y lo da por cumplido hoy. Devuelve cómo dejar de escuchar. */
export function atenderAlCumplirUnHabito(userId: string): () => void {
  return alCumplirUnHabito(cumplido => {
    if (cumplido.habitoId) void alCumplirElHabito(userId, cumplido.habitoId, { fecha: cumplido.fecha }).catch(() => undefined);
  });
}
