import { almacen } from './almacen';

import { cuentaDeLaSesion } from './colaSinRed';
import { huellaDelToken } from './perfilGuardado';

/**
 * Spec 048 (FR-004): lo último que dio el servidor en las lecturas de Hoy, los hábitos de hoy y el Plan, para mostrarlo sin
 * señal. Va por sesión (huella del token) y se borra al cerrar sesión (FR-009). Solo las rutas de la lista: lo demás (SER, chat,
 * Pagos, Eventos) no se guarda y sin señal dice que necesita conexión (FR-005).
 */
const PREFIJO = 'renaser.sinRed.lectura.';

const RUTAS_EXACTAS = new Set([
  '/api/v1/home',
  '/api/v1/habit-tracks/today',
  '/api/v1/habit-tracks/today/snapshot',
  '/api/v1/habits',
  '/api/v1/habit-preferences',
  '/api/v1/me/semaforo',
  // Si el programa ya empezó y qué puede usar la cuenta: sin ellas, Hoy, Plan y Yo mostraban «No pudimos comprobar tu programa» (E2E 09/11).
  '/api/v1/onboarding/activate-program',
  '/api/v1/mentor/context',
  // Qué audio toca hoy (Pastilla y Audioterapia): sin esto la hoja del audio quedaba en blanco sin señal (E2E 09/11, FR-017).
  '/api/v1/spirit-audio/status',
  '/api/v1/audio-therapy/status',
  // Spec 048 fase 2 (FR-021): las categorías del Muro, para escribir una publicación sin señal.
  '/api/v1/wall/categories',
  // Fase 3 (FR-004, FR-019): Mi Radar, la última hora respondida y qué plan de hábitos tiene la persona, para planificar sin señal.
  '/api/v1/radar/mi-radar',
  '/api/v1/radar/latest',
  '/api/v1/habit-unlocks',
]);
/** Solo la primera página: con `cursor` es otra página y no debe pisar a la primera. */
const RUTAS_SIN_CONSULTA = new Set(['/api/v1/radar/history']);
// `/api/v1/habit-preferences/` (fase 3): los días de la semana, una semana puntual y la oferta de repetir la semana de cada hábito.
const PREFIJOS = ['/api/v1/rocks/', '/api/v1/habit-tracks/day', '/api/v1/habit-preferences/'];

export function esLecturaGuardable(ruta: string): boolean {
  const [sinConsulta, consulta] = ruta.split('?');
  if (RUTAS_SIN_CONSULTA.has(sinConsulta)) return consulta === undefined;
  return RUTAS_EXACTAS.has(sinConsulta) || PREFIJOS.some(p => sinConsulta.startsWith(p));
}

/** Por cuenta (E2E 09/11: por huella del token se perdía todo si el servidor lo renovaba); antes de saber la cuenta, por huella. */
function clave(token: string, ruta: string): string {
  return `${PREFIJO}${cuentaDeLaSesion() ?? huellaDelToken(token)}.${ruta}`;
}

export async function guardarLectura(token: string | null, ruta: string, datos: unknown): Promise<void> {
  if (!token || datos === undefined) return;
  try {
    const crudo = JSON.stringify(datos);
    await almacen().setItem(clave(token, ruta), crudo);
    // También por huella: al abrir sin señal, las primeras lecturas pueden salir antes de que se sepa la cuenta (E2E 09/11).
    await almacen().setItem(`${PREFIJO}${huellaDelToken(token)}.${ruta}`, crudo);
  } catch {
    /* sin lugar o sin almacenamiento: sin señal se verá «necesitas conexión», nada se rompe */
  }
}

/** `undefined` si no hay nada guardado para esa ruta y esa sesión. */
export async function leerLectura(token: string | null, ruta: string): Promise<unknown> {
  if (!token) return undefined;
  try {
    const crudo = (await almacen().getItem(clave(token, ruta))) ?? (await almacen().getItem(`${PREFIJO}${huellaDelToken(token)}.${ruta}`));
    return crudo === null ? undefined : JSON.parse(crudo);
  } catch {
    return undefined;
  }
}

/**
 * Corrige lo guardado de las rutas que cumplen `aplica` (spec 048, FR-011). Al confirmarse un envío de la cola, la lectura guardada
 * de una pantalla que no se volvió a leer con señal seguía diciendo lo de antes: Entrenar mostraba sin hacer, sin señal, un hábito
 * que el servidor ya tenía hecho (E2E 09/11).
 */
export async function retocarLecturasGuardadas(aplica: (ruta: string) => boolean, retocar: (datos: unknown) => unknown): Promise<void> {
  try {
    const claves = (await almacen().getAllKeys()).filter(k => k.startsWith(PREFIJO));
    for (const k of claves) {
      const inicio = k.indexOf('./api/');
      if (inicio < 0 || !aplica(k.slice(inicio + 1))) continue;
      const crudo = await almacen().getItem(k);
      if (crudo === null) continue;
      await almacen().setItem(k, JSON.stringify(retocar(JSON.parse(crudo))));
    }
  } catch {
    /* sin almacenamiento: la próxima lectura con señal lo deja al día */
  }
}

export async function borrarLecturasGuardadas(): Promise<void> {
  try {
    const claves = (await almacen().getAllKeys()).filter(k => k.startsWith(PREFIJO));
    if (claves.length) await almacen().multiRemove(claves);
  } catch {
    /* nada que hacer */
  }
}

/**
 * Spec 048 (FR-011): ajustes sobre lo que se lee, para que lo hecho sin señal se siga viendo hecho aunque la lectura (guardada, o
 * del servidor antes de que la cola lo envíe) diga lo contrario. Los registra cada funcionalidad (hoy, los hábitos).
 */
type Ajuste = (ruta: string, datos: unknown) => Promise<unknown>;
const ajustes: Ajuste[] = [];

export function registrarAjusteDeLectura(ajuste: Ajuste): void {
  ajustes.push(ajuste);
}

export async function aplicarAjustesDeLectura(ruta: string, datos: unknown): Promise<unknown> {
  let actual = datos;
  for (const ajuste of ajustes) {
    try {
      actual = await ajuste(ruta, actual);
    } catch {
      /* un ajuste roto no rompe la lectura */
    }
  }
  return actual;
}
