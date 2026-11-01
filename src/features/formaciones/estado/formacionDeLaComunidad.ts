import type { OpcionDeFormacion } from '../types/formaciones.types';

/**
 * La formación con la que se lee y se crea en la Comunidad (spec 024).
 *
 * **Solo Administración, Alquimista y Soporte TI** (`veTodas`) ven las tres formaciones y por eso eligen: «Todas» (`null`) o una. Para
 * todas las demás cuentas —aprendiz, mentor, guía, líder— el servidor ya filtra por la suya y la app **no manda nada nuevo**: este
 * estado se queda con `veTodas: false` y `eleccion: null`, y cada pedido sale exactamente como antes.
 *
 * Es un estado FUERA de React (como `semaforoVigente`) porque lo leen las funciones de las APIs —que no son componentes— y varias
 * pantallas a la vez: Comunidad, «Publicaciones ocultas» de Administración y la vista previa del podio. Quien lo escribe es
 * `SincronizadorDeLaFormacionDeLaComunidad` (al entrar la cuenta) y el selector (`elegirFormacionDeLaComunidad`). Nada más lo toca.
 *
 * La regla de fondo, y la razón de que viva en un solo lugar: **un código de formación solo sale en un pedido si la cuenta ve todas
 * y eligió una.** Ningún otro camino arma `?formation=` ni `formation` en un cuerpo.
 */

export type EstadoDeLaFormacionDeLaComunidad = {
  /** Administración, Alquimista y Soporte TI. Los demás no eligen ni mandan `formation`. */
  veTodas: boolean;
  /** El código elegido, o `null` = «Todas». Siempre `null` si `veTodas` es falso. */
  eleccion: string | null;
  /** Falta leer lo recordado en el teléfono (solo se espera cuando `veTodas`). Mientras tanto Comunidad no pide nada. */
  listo: boolean;
  /** La cuenta a la que pertenece la elección; con otra cuenta, se parte de cero. */
  cuenta: string | null;
  /**
   * Las formaciones que la sesión ofrece, con los nombres que Administración les puso (para el selector y los rótulos). Las escribe el
   * sincronizador desde la sesión: así las pantallas de la Comunidad no dependen del contexto de la sesión (ni de todo lo que arrastra).
   */
  disponibles: readonly OpcionDeFormacion[];
  /** La formación activa de la sesión (quien no ve todas): la que nombra la imagen del podio. */
  activa: OpcionDeFormacion | null;
};

/** Sin sesión o sin formación conocida: nada se manda y nada se espera. */
export const SIN_ELECCION: EstadoDeLaFormacionDeLaComunidad = {
  veTodas: false,
  eleccion: null,
  listo: true,
  cuenta: null,
  disponibles: [],
  activa: null,
};

export const MENSAJE_ELEGIR_PARA_PUBLICAR = 'Elige una formación arriba para publicar.';
export const MENSAJE_ELEGIR_PARA_CREAR = 'Elige una formación arriba para crear.';

/** La elección por cuenta en este teléfono (AsyncStorage). */
export function claveDeLaEleccion(cuenta: string): string {
  return `renaser.comunidad.formacion.${cuenta}`;
}

/** Lanzado por los pedidos de CREAR cuando Administración tiene «Todas» elegida: el servidor respondería 400, así que ni se envía. */
export class FormacionPorElegirError extends Error {
  constructor(mensaje: string = MENSAJE_ELEGIR_PARA_CREAR) {
    super(mensaje);
    this.name = 'FormacionPorElegirError';
  }
}

let estado: EstadoDeLaFormacionDeLaComunidad = SIN_ELECCION;
const oyentes = new Set<() => void>();

const clave = (opciones: readonly OpcionDeFormacion[]) => opciones.map(o => `${o.codigo}=${o.nombre}`).join('|');

function publicar(nuevo: EstadoDeLaFormacionDeLaComunidad): void {
  const igual =
    nuevo.veTodas === estado.veTodas &&
    nuevo.eleccion === estado.eleccion &&
    nuevo.listo === estado.listo &&
    nuevo.cuenta === estado.cuenta &&
    clave(nuevo.disponibles) === clave(estado.disponibles) &&
    clave(nuevo.activa ? [nuevo.activa] : []) === clave(estado.activa ? [estado.activa] : []);
  if (igual) return;
  estado = nuevo;
  oyentes.forEach(oyente => oyente());
}

/** Lo que hay ahora. La referencia solo cambia cuando cambia algo (sirve para `useSyncExternalStore`). */
export function estadoDeLaFormacionDeLaComunidad(): EstadoDeLaFormacionDeLaComunidad {
  return estado;
}

export function suscribirseALaFormacionDeLaComunidad(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Un código recordado vale solo si es una de las formaciones que esta cuenta puede elegir. */
export function eleccionValida(codigo: unknown, permitidas: readonly string[]): string | null {
  return typeof codigo === 'string' && permitidas.includes(codigo) ? codigo : null;
}

/**
 * La sesión cambió. Sin cuenta, o una cuenta que no ve todas: no hay elección (nada se manda) pero se guardan los nombres de sus
 * formaciones. Con una cuenta que ve todas, queda `listo: false` hasta que `fijarLaEleccionRecordada` diga qué había elegido en este
 * teléfono; si es la misma cuenta que ya estaba preparada, se conserva lo elegido.
 */
export function prepararLaFormacionDeLaComunidad(
  cuenta: string | null,
  veTodas: boolean,
  sesion: { disponibles?: readonly OpcionDeFormacion[]; activa?: OpcionDeFormacion | null } = {},
): void {
  const disponibles = sesion.disponibles ?? [];
  const activa = sesion.activa ?? null;
  if (!cuenta || !veTodas) {
    publicar({ ...SIN_ELECCION, cuenta, disponibles, activa });
    return;
  }
  if (estado.cuenta === cuenta && estado.veTodas) {
    publicar({ ...estado, disponibles, activa });
    return;
  }
  publicar({ veTodas: true, eleccion: null, listo: false, cuenta, disponibles, activa });
}

/**
 * Lo que se recordaba (ya validado) llegó: Comunidad puede empezar. Con otra cuenta de por medio no escribe, y si ya estaba lista
 * (la persona alcanzó a elegir) tampoco: lo elegido ahora manda sobre lo recordado.
 */
export function fijarLaEleccionRecordada(cuenta: string, eleccion: string | null): void {
  if (estado.cuenta !== cuenta || !estado.veTodas || estado.listo) return;
  publicar({ ...estado, eleccion, listo: true });
}

/** Si la lectura de lo recordado falla, se sigue con «Todas»: nunca se queda esperando. */
export function darPorLeidaLaEleccion(cuenta: string): void {
  if (estado.cuenta !== cuenta || !estado.veTodas || estado.listo) return;
  publicar({ ...estado, listo: true });
}

/**
 * Elige la formación de la Comunidad (`null` = Todas) y la recuerda por cuenta. Solo vale para quien ve todas; para los demás no
 * hace nada. El estado cambia en el acto (los pedidos que salgan después ya llevan la elección); guardar en el teléfono va detrás.
 */
export function elegirFormacionDeLaComunidad(codigo: string | null): void {
  if (!estado.veTodas || !estado.cuenta) return;
  if (codigo === estado.eleccion) return;
  const cuenta = estado.cuenta;
  publicar({ ...estado, eleccion: codigo });
  void guardarLaEleccion(cuenta, codigo);
}

/**
 * El almacenamiento del teléfono, cargado AL USARLO y no al importar este archivo: las APIs de la Comunidad (el Muro, los eventos, los
 * cursos, los chats) lo importan, y con el módulo nativo cargado de entrada cada prueba que toque cualquiera de ellas reventaría con
 * «AsyncStorage is null». Si no está disponible, la elección vale solo en esta sesión.
 */
type Almacenamiento = typeof import('@react-native-async-storage/async-storage').default;

function almacenamiento(): Almacenamiento {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const modulo = require('@react-native-async-storage/async-storage') as { default?: Almacenamiento } & Almacenamiento;
  return modulo.default ?? modulo;
}

async function guardarLaEleccion(cuenta: string, codigo: string | null): Promise<void> {
  try {
    const AsyncStorage = almacenamiento();
    if (codigo === null) await AsyncStorage.removeItem(claveDeLaEleccion(cuenta));
    else await AsyncStorage.setItem(claveDeLaEleccion(cuenta), codigo);
  } catch {
    /* Sin almacenamiento la elección vale en esta sesión y se olvida al cerrar la app; nunca rompe. */
  }
}

/** Lee lo recordado de esta cuenta, o `null` si no hay nada o el almacenamiento falla. */
export async function leerLaEleccionRecordada(cuenta: string): Promise<string | null> {
  try {
    return await almacenamiento().getItem(claveDeLaEleccion(cuenta));
  } catch {
    return null;
  }
}

/* ── Lo que usan las APIs ────────────────────────────────────────────────────────────────────────────────────────────
 * Las funciones de las APIs reciben el código como un parámetro más (`formation`), NO lo leen de acá: varias las usan también Hoy,
 * Training y las alarmas (`listarProximos`, `obtenerFeedMuro`), y esas lecturas no deben cambiar porque Administración eligió una
 * formación en Comunidad. Quien lee para la Comunidad pasa {@link formacionDeLaLectura}(); quien crea, {@link formacionDelCuerpo}().
 */

/** El código que va en las LECTURAS: solo si la cuenta ve todas y eligió una. `null` = no se manda nada. */
export function formacionDeLaLectura(actual: EstadoDeLaFormacionDeLaComunidad = estado): string | null {
  return actual.veTodas ? actual.eleccion : null;
}

/**
 * Agrega `formation=` a una ruta con o sin consulta. Sin código devuelve la ruta tal cual, carácter por carácter. Es la forma pura:
 * quien llama decide de dónde sale el código (casi siempre de {@link formacionDeLaLectura}).
 */
export function agregarLaFormacion(ruta: string, codigo: string | null | undefined): string {
  if (!codigo) return ruta;
  return `${ruta}${ruta.includes('?') ? '&' : '?'}formation=${encodeURIComponent(codigo)}`;
}

/** {@link agregarLaFormacion} con la elección de ahora. */
export function conLaFormacion(ruta: string, actual: EstadoDeLaFormacionDeLaComunidad = estado): string {
  return agregarLaFormacion(ruta, formacionDeLaLectura(actual));
}

/** Administración con «Todas»: no se puede crear nada hasta elegir una formación. */
export function hayQueElegirParaCrear(actual: EstadoDeLaFormacionDeLaComunidad = estado): boolean {
  return actual.veTodas && actual.eleccion === null;
}

/**
 * El campo `formation` del cuerpo de lo que se CREA (publicación, testimonio, evento). Administración lo manda siempre (el servidor
 * responde 400 sin él); los demás no mandan nada. Con «Todas» elegida lanza {@link FormacionPorElegirError}: no se envía.
 */
export function formacionDelCuerpo(
  mensaje: string = MENSAJE_ELEGIR_PARA_CREAR,
  actual: EstadoDeLaFormacionDeLaComunidad = estado,
): { formation?: string } {
  if (!actual.veTodas) return {};
  if (actual.eleccion === null) throw new FormacionPorElegirError(mensaje);
  return { formation: actual.eleccion };
}

/** Solo para pruebas: vuelve al estado de una sesión sin formación. */
export function reiniciarLaFormacionDeLaComunidad(): void {
  publicar(SIN_ELECCION);
}
