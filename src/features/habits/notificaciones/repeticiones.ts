import AsyncStorage from '@react-native-async-storage/async-storage';

import { alCumplirUnHabito } from '../eventos/habitoCumplido';
import {
  asegurarCanal,
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
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
 * - La Pastilla Renacer y la Clase diaria se cierran por su propio endpoint, que no emite `habitoCumplido`: si
 *   una de ellas se cumple sin tocar la alarma, sus repeticiones de ese día suenan igual.
 * - Un hábito cumplido desde OTRO teléfono o desde la web no avisa a este: sus repeticiones de hoy suenan igual.
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
export async function atenderHabito(habitoId: string, ahora: Date = new Date()): Promise<void> {
  const hoy = fechaCompacta(ahora);
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

/** Escucha «se cumplió un hábito» y lo da por atendido. Devuelve cómo dejar de escuchar. */
export function atenderAlCumplirUnHabito(): () => void {
  return alCumplirUnHabito(cumplido => {
    if (cumplido.habitoId) void atenderHabito(cumplido.habitoId).catch(() => undefined);
  });
}
