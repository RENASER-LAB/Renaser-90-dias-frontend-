import { ARCHIVO_VOZ_GENERICA, VOCES_DE_HABITOS, vozDelHabito, type HabitoConVoz } from './vozDeLosHabitos';

/**
 * El sonido de una alarma local y el canal de Android por el que sale (E-9 y E-10 de la
 * retroalimentación del 26/09).
 *
 * ## Por qué un canal por tipo Y por sonido
 *
 * En Android 8+ el sonido **es del canal, no de la notificación**, y un canal no se puede cambiar
 * después de creado: `setNotificationChannelAsync` sobre un id existente respeta el sonido viejo.
 * Así que «elegir el sonido» es elegir por qué canal sale la alarma. Cada tipo (hábitos, eventos,
 * objetivos) tiene su canal por sonido, y la persona puede silenciar cada uno desde los ajustes del
 * teléfono (E-9: «para silenciarlos por separado»). **Un sonido nuevo es siempre un canal nuevo**
 * (`<base>-<clave>`): nunca se reusa un id con otro archivo.
 *
 * El canal de hábitos con el sonido del teléfono conserva su id de siempre (`recordatorios-habitos`):
 * las alarmas ya programadas en los teléfonos siguen saliendo por ahí y nada cambia para quien no
 * toque la sección Alarmas. El sonido por defecto sigue siendo «El del teléfono».
 *
 * ## Los sonidos propios
 *
 * Van empaquetados en la app por el plugin de `expo-notifications` (`sounds` en `app.json`) y en
 * Android quedan en `res/raw/` (minúsculas, dígitos y guion bajo: nada de guiones). **Hace falta un
 * APK nuevo**: sin el archivo dentro, Android no tiene qué sonar. Como la app no se actualiza por
 * aire, este código y los archivos llegan siempre juntos. Si igual se creara un canal cuyo archivo
 * no está, `expo-notifications` lo crea con el sonido del sistema y ese id queda así para siempre.
 *
 * - `campana_renaser.wav`: la campana (2026-09-26).
 * - **Voz** (Dora, 2026-09-27): una campanita corta y una voz. En los hábitos **dice el nombre del
 *   hábito** (`voz_habito_<clave>.mp3`, uno por hábito del catálogo, ver `vozDeLosHabitos.ts`); en
 *   un hábito propio, «Tu hábito está por empezar»; en eventos, «Tu evento está por empezar»; en
 *   objetivos, «Tienes acciones de tus objetivos por hacer». Los hábitos con voz propia salen por su
 *   propio canal (`recordatorios-habitos-voz-<clave>`), porque el sonido es del canal.
 * - **Para alertar** y **para relajar** (2026-09-27): cuatro y cuatro, síntesis propia, aprobados
 *   por el dueño tal como estaban. Los de relajar arrancan casi en silencio y crecen despacio.
 *
 * Todos se regeneran con `scripts/sonidos/generar-sonidos.sh` (Kokoro-82M para la voz). Cambiar lo
 * que dice una voz no toca el código: el archivo conserva su nombre y el canal guarda el recurso por
 * NOMBRE (`android.resource://<paquete>/raw/voz_habito`, `SoundResolver.kt` de `expo-notifications`,
 * que además ignora la extensión), así que en un teléfono que ya tenía el canal suena lo nuevo en
 * cuanto se instala el APK.
 *
 * > **Cambiado 2026-09-27.** Decía que la voz era una sola frase por tipo («Tu hábito está por
 * > empezar» también para los hábitos del catálogo), con `espeak-ng` y PROVISIONAL, en
 * > `voz_habito.wav`, `voz_evento.wav` y `voz_objetivos.wav`. El dueño eligió la voz Dora de Kokoro y
 * > pidió que diga el nombre del hábito; los audios pasan a MP3 (Android los busca por nombre, sin
 * > extensión: `voz_habito` sigue siendo `voz_habito`) y `generar-voces-provisionales.sh` ya no existe.
 *
 * ## iOS
 *
 * iOS solo acepta WAV, AIFF o CAF en un aviso: con un MP3 suena el sonido del sistema. Hoy la app
 * es solo Android (Play Store). Si algún día sale para iOS, hay que generar una versión CAF de cada
 * sonido y nombrarla en `sonidoDelAviso` en esa plataforma; la campana (WAV) ya sirve.
 */

export type SonidoPropio =
  | 'alertar-amanecer'
  | 'alertar-marimba'
  | 'alertar-campana'
  | 'alertar-kalimba'
  | 'relajar-cuenco'
  | 'relajar-campanitas'
  | 'relajar-lluvia'
  | 'relajar-ruido-marron';
export type SonidoDeAlarma = 'sistema' | 'campana' | 'voz' | 'vibrar' | SonidoPropio;
export type TipoDeAlarma = 'habitos' | 'eventos' | 'objetivos';
export type GrupoDeSonidos = 'basicos' | 'alertar' | 'relajar';

export interface OpcionDeSonido {
  clave: SonidoDeAlarma;
  nombre: string;
  detalle: string;
  grupo: GrupoDeSonidos;
}

export const SONIDOS: ReadonlyArray<OpcionDeSonido> = [
  { clave: 'sistema', nombre: 'El del teléfono', detalle: 'El sonido de siempre de tus avisos', grupo: 'basicos' },
  { clave: 'campana', nombre: 'Campana Renaser', detalle: 'Una campana suave', grupo: 'basicos' },
  { clave: 'voz', nombre: 'Voz', detalle: 'Una campanita y una voz que dice el nombre de tu hábito', grupo: 'basicos' },
  { clave: 'vibrar', nombre: 'Solo vibrar', detalle: 'Sin sonido', grupo: 'basicos' },
  { clave: 'alertar-amanecer', nombre: 'Amanecer', detalle: 'Notas que suben de a poco, como un amanecer', grupo: 'alertar' },
  { clave: 'alertar-marimba', nombre: 'Marimba', detalle: 'Una melodía alegre de madera', grupo: 'alertar' },
  { clave: 'alertar-campana', nombre: 'Campanas', detalle: 'Tres campanas claras que suben', grupo: 'alertar' },
  { clave: 'alertar-kalimba', nombre: 'Kalimba', detalle: 'Una melodía corta y juguetona', grupo: 'alertar' },
  { clave: 'relajar-cuenco', nombre: 'Cuenco', detalle: 'Un cuenco tibetano que vibra largo', grupo: 'relajar' },
  { clave: 'relajar-campanitas', nombre: 'Campanitas', detalle: 'Campanitas de viento, muy suaves', grupo: 'relajar' },
  { clave: 'relajar-lluvia', nombre: 'Lluvia', detalle: 'Lluvia suave que crece despacio', grupo: 'relajar' },
  { clave: 'relajar-ruido-marron', nombre: 'Ruido marrón', detalle: 'Un soplido suave, como el mar a lo lejos', grupo: 'relajar' },
];

/** Cómo se agrupan en Yo → Alarmas. Los básicos van primero y sin título, como antes. */
export const GRUPOS_DE_SONIDOS: ReadonlyArray<{ clave: GrupoDeSonidos; titulo: string | null; detalle: string | null }> = [
  { clave: 'basicos', titulo: null, detalle: null },
  { clave: 'alertar', titulo: 'Para alertar', detalle: 'Más vivos, para que no se te pase.' },
  { clave: 'relajar', titulo: 'Para relajar', detalle: 'Suaves: empiezan bajito y suben despacio.' },
];

/** El archivo de cada sonido propio: el mismo para hábitos, eventos y objetivos. */
const ARCHIVO_DEL_SONIDO: Record<SonidoPropio, string> = {
  'alertar-amanecer': 'alertar_amanecer.mp3',
  'alertar-marimba': 'alertar_marimba.mp3',
  'alertar-campana': 'alertar_campana.mp3',
  'alertar-kalimba': 'alertar_kalimba.mp3',
  'relajar-cuenco': 'relajar_cuenco.mp3',
  'relajar-campanitas': 'relajar_campanitas.mp3',
  'relajar-lluvia': 'relajar_lluvia.mp3',
  'relajar-ruido-marron': 'relajar_ruido_marron.mp3',
};

/** El archivo empaquetado por el plugin. Mismo nombre en `app.json` y en el canal. */
export const ARCHIVO_CAMPANA = 'campana_renaser.wav';

/** La frase genérica de cada tipo (hábitos propios, eventos, objetivos). Ver «Voz» arriba. */
export const ARCHIVO_VOZ: Record<TipoDeAlarma, string> = ARCHIVO_VOZ_GENERICA;

export const SONIDO_POR_DEFECTO: SonidoDeAlarma = 'sistema';

const CLAVES = new Set<string>(SONIDOS.map(s => s.clave));

export function esSonido(valor: unknown): valor is SonidoDeAlarma {
  return typeof valor === 'string' && CLAVES.has(valor);
}

function esSonidoPropio(sonido: SonidoDeAlarma): sonido is SonidoPropio {
  return Object.prototype.hasOwnProperty.call(ARCHIVO_DEL_SONIDO, sonido);
}

const NOMBRE_DEL_TIPO: Record<TipoDeAlarma, string> = {
  habitos: 'Recordatorios de hábitos',
  eventos: 'Eventos y clases',
  objetivos: 'Acciones de tus objetivos',
};

/** Id de canal de siempre, por tipo. El de hábitos NO cambia (ver arriba). */
const CANAL_BASE: Record<TipoDeAlarma, string> = {
  habitos: 'recordatorios-habitos',
  eventos: 'recordatorios-eventos',
  objetivos: 'recordatorios-objetivos',
};

export interface CanalDeAlarma {
  id: string;
  nombre: string;
  /** Lo que va en el canal: `undefined` = el del sistema; `null` = sin sonido; texto = archivo propio. */
  sonidoDelCanal: string | null | undefined;
  /** Lo que va en el contenido de la notificación (iOS y Android viejos). */
  sonidoDelAviso: boolean | string;
}

function conArchivo(id: string, nombre: string, archivo: string): CanalDeAlarma {
  return { id, nombre, sonidoDelCanal: archivo, sonidoDelAviso: archivo };
}

function idDelCanalDeVoz(clave: string): string {
  return `${CANAL_BASE.habitos}-voz-${clave}`;
}

/** «Voz»: la del hábito si tiene una propia; si no, la frase genérica del tipo. */
function canalDeVoz(tipo: TipoDeAlarma, habito: HabitoConVoz | undefined): CanalDeAlarma {
  const nombre = NOMBRE_DEL_TIPO[tipo];
  const propia = tipo === 'habitos' ? vozDelHabito(habito) : null;
  if (propia) return conArchivo(idDelCanalDeVoz(propia.clave), `${nombre} (voz: ${propia.dice})`, propia.archivo);
  return conArchivo(`${CANAL_BASE[tipo]}-voz`, `${nombre} (voz)`, ARCHIVO_VOZ[tipo]);
}

/**
 * El canal de una alarma. `habito` solo cuenta para la «Voz» de un hábito: con él, la voz dice su
 * nombre (si es del catálogo y no fue renombrado); sin él, la frase genérica.
 */
export function canalDeAlarma(tipo: TipoDeAlarma, sonido: SonidoDeAlarma, habito?: HabitoConVoz): CanalDeAlarma {
  const base = CANAL_BASE[tipo];
  const nombre = NOMBRE_DEL_TIPO[tipo];
  if (sonido === 'campana') return conArchivo(`${base}-campana`, `${nombre} (campana)`, ARCHIVO_CAMPANA);
  if (sonido === 'voz') return canalDeVoz(tipo, habito);
  if (sonido === 'vibrar') {
    return { id: `${base}-vibrar`, nombre: `${nombre} (solo vibrar)`, sonidoDelCanal: null, sonidoDelAviso: false };
  }
  if (esSonidoPropio(sonido)) {
    const opcion = SONIDOS.find(s => s.clave === sonido);
    return conArchivo(`${base}-${sonido}`, `${nombre} (${opcion?.nombre.toLowerCase() ?? sonido})`, ARCHIVO_DEL_SONIDO[sonido]);
  }
  // SIN `sound` en el canal: en Android ese campo es el NOMBRE DE UN ARCHIVO, y omitirlo es lo que
  // deja el sonido del sistema (ver `asegurarCanal` en `recordatoriosDeHabito.ts`).
  return { id: base, nombre, sonidoDelCanal: undefined, sonidoDelAviso: true };
}

/** Cada canal que lleva un archivo propio → su archivo. Todas las combinaciones que la app puede crear. */
const ARCHIVO_POR_CANAL: ReadonlyMap<string, string> = (() => {
  const mapa = new Map<string, string>();
  for (const tipo of Object.keys(CANAL_BASE) as TipoDeAlarma[]) {
    for (const { clave } of SONIDOS) {
      const canal = canalDeAlarma(tipo, clave);
      if (typeof canal.sonidoDelCanal === 'string') mapa.set(canal.id, canal.sonidoDelCanal);
    }
  }
  for (const voz of VOCES_DE_HABITOS) mapa.set(idDelCanalDeVoz(voz.clave), voz.archivo);
  return mapa;
})();

/** Todos los archivos que la app puede nombrar: cada uno tiene que ir en `sounds` de `app.json`. */
export const ARCHIVOS_DE_SONIDO: ReadonlyArray<string> = [...new Set(ARCHIVO_POR_CANAL.values())];

/**
 * El archivo propio que suena por un canal, a partir de su id. Lo usa el rearmado: la librería
 * devuelve el sonido de una alarma ya programada como `'custom'`, sin decir cuál, y al volver a
 * programarla hay que nombrarlo (iOS y Android viejos lo toman del aviso, no del canal).
 * `null` si el canal no lleva un archivo propio (o es de una versión que ya no existe).
 */
export function archivoDelCanal(canalId: unknown): string | null {
  return typeof canalId === 'string' ? ARCHIVO_POR_CANAL.get(canalId) ?? null : null;
}
