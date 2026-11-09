import { almacen } from './almacen';

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
]);
const PREFIJOS = ['/api/v1/rocks/', '/api/v1/habit-tracks/day'];

export function esLecturaGuardable(ruta: string): boolean {
  const sinConsulta = ruta.split('?')[0];
  return RUTAS_EXACTAS.has(sinConsulta) || PREFIJOS.some(p => sinConsulta.startsWith(p));
}

function clave(token: string, ruta: string): string {
  return `${PREFIJO}${huellaDelToken(token)}.${ruta}`;
}

export async function guardarLectura(token: string | null, ruta: string, datos: unknown): Promise<void> {
  if (!token || datos === undefined) return;
  try {
    await almacen().setItem(clave(token, ruta), JSON.stringify(datos));
  } catch {
    /* sin lugar o sin almacenamiento: sin señal se verá «necesitas conexión», nada se rompe */
  }
}

/** `undefined` si no hay nada guardado para esa ruta y esa sesión. */
export async function leerLectura(token: string | null, ruta: string): Promise<unknown> {
  if (!token) return undefined;
  try {
    const crudo = await almacen().getItem(clave(token, ruta));
    return crudo === null ? undefined : JSON.parse(crudo);
  } catch {
    return undefined;
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
