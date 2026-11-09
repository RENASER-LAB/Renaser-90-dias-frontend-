import { almacen } from './almacen';
import { requireOptionalNativeModule } from 'expo';

/**
 * Spec 048 (FR-013): la hora REAL en que la persona hizo algo sin señal.
 *
 * Con cada respuesta del servidor se ancla su hora junto al reloj del sistema desde el encendido (`modules/renaser-reloj`, Android).
 * Sin señal, la hora real es esa ancla más lo que avanzó ese reloj: cambiar la hora del teléfono no la mueve. Si el teléfono se
 * reinició desde el ancla (ese reloj volvió a empezar) o no hay módulo (iPhone, o una app sin el APK nuevo), se usa el reloj del
 * teléfono corregido con el último desfase conocido, y el envío lo dice (`TELEFONO_CORREGIDO`); el servidor revisa igual.
 */
export type OrigenDeLaHora = 'RELOJ_DEL_SISTEMA' | 'TELEFONO_CORREGIDO';
export type HoraReal = { instante: Date; origen: OrigenDeLaHora };

type Ancla = { servidorMs: number; sistemaMs: number; telefonoMs: number };
type ModuloReloj = { milisDesdeElEncendido(): number };

const CLAVE = 'renaser.sinRed.anclaDeHora';
let ancla: Ancla | null = null;
let cargada = false;
let modulo: ModuloReloj | null | undefined;

function reloj(): ModuloReloj | null {
  if (modulo === undefined) {
    try {
      modulo = requireOptionalNativeModule<ModuloReloj>('RenaserReloj');
    } catch {
      modulo = null;
    }
  }
  return modulo ?? null;
}

function sistemaMs(): number | null {
  try {
    const m = reloj();
    const v = m ? m.milisDesdeElEncendido() : null;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Lo llama el cliente HTTP con la hora (header `Date`) de cada respuesta. */
export function anclarHoraDelServidor(servidorMs: number): void {
  const sistema = sistemaMs();
  ancla = { servidorMs, sistemaMs: sistema ?? -1, telefonoMs: Date.now() };
  cargada = true;
  almacen().setItem(CLAVE, JSON.stringify(ancla)).catch(() => undefined);
}

/** Al abrir la app sin señal, el ancla de la última vez (un `performance.now()` no sobreviviría a cerrar la app). */
export async function cargarAnclaGuardada(): Promise<void> {
  if (cargada) return;
  try {
    const crudo = await almacen().getItem(CLAVE);
    const a = crudo ? (JSON.parse(crudo) as Ancla) : null;
    if (!cargada && a && typeof a.servidorMs === 'number') ancla = a;
  } catch {
    /* sin ancla: se usa el reloj del teléfono */
  }
  cargada = true;
}

export function horaReal(): HoraReal {
  const sistema = sistemaMs();
  if (ancla && sistema !== null && ancla.sistemaMs >= 0 && sistema >= ancla.sistemaMs) {
    return { instante: new Date(ancla.servidorMs + (sistema - ancla.sistemaMs)), origen: 'RELOJ_DEL_SISTEMA' };
  }
  const desfase = ancla ? ancla.servidorMs - ancla.telefonoMs : 0;
  return { instante: new Date(Date.now() + desfase), origen: 'TELEFONO_CORREGIDO' };
}

/** Solo para las pruebas. */
export function _reiniciarHoraReal(m?: ModuloReloj | null): void {
  ancla = null;
  cargada = false;
  modulo = m === undefined ? undefined : m;
}
