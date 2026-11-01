import { ApiError } from '../../../services/http/apiClient';
import { mensajeDeFallo } from '../../admin/utils/mensajes';

/** «1 pregunta», «3 preguntas». */
export function cantidad(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** «1 marcada», «3 marcadas»: concuerda el adjetivo con el número. */
export function conGenero(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «31 oct» en la hora del teléfono, o `null` si la fecha no se entiende. */
export function fechaConMesCorto(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

/** Los campos del cuerpo de un error del servidor que esta pantalla usa (`codigo`, `dependientes`, `motivos`, `versionVigente`). */
function cuerpoDe(e: unknown): Record<string, unknown> {
  return e instanceof ApiError && e.body && typeof e.body === 'object' ? (e.body as Record<string, unknown>) : {};
}

export function codigoDelError(e: unknown): string | null {
  return e instanceof ApiError ? e.codigo : null;
}

export function dependientesDelError(e: unknown): number[] {
  const d = cuerpoDe(e).dependientes;
  return Array.isArray(d) ? d.filter((x): x is number => typeof x === 'number') : [];
}

export function motivosDelError(e: unknown): string[] {
  const m = cuerpoDe(e).motivos;
  return Array.isArray(m) ? m.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

export function versionVigenteDelError(e: unknown): number | null {
  const v = cuerpoDe(e).versionVigente;
  return typeof v === 'number' ? v : null;
}

/** Los errores por fila de una importación que el servidor rechazó con 400 (trae la misma lista que la vista previa). */
export function erroresDelCuerpo(e: unknown): unknown {
  return cuerpoDe(e).errores;
}

/** Un 403 se dice con palabras (sin pantalla rota); un 404 es un servidor sin esta función; lo demás, el motivo del servidor. */
export const SIN_PERMISO_DE_FICHAS = 'Tu cuenta no tiene permiso para administrar las fichas.';
export const SIN_LA_FUNCION = 'Esta versión del servidor todavía no tiene las fichas con diagnóstico.';

export type FalloDeFichas = 'sin_permiso' | 'sin_red' | 'no_disponible' | 'error';

export function falloDe(e: unknown): FalloDeFichas {
  if (e instanceof ApiError) {
    if (e.esProhibido) return 'sin_permiso';
    if (e.esDeRed) return 'sin_red';
    if (e.status === 404) return 'no_disponible';
  }
  return 'error';
}

export function textoDelFallo(fallo: FalloDeFichas, alFallar: string): string {
  switch (fallo) {
    case 'sin_permiso':
      return SIN_PERMISO_DE_FICHAS;
    case 'sin_red':
      return 'Sin conexión con el servidor. Revisa tu red y vuelve a intentar.';
    case 'no_disponible':
      return SIN_LA_FUNCION;
    default:
      return alFallar;
  }
}

/** El texto de un error al guardar algo: el motivo del servidor en 400 y 409, y palabras claras en lo demás. */
export function mensajeDeGuardar(e: unknown, alFallar: string): string {
  return mensajeDeFallo(e, alFallar);
}
