import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import type { CuentaCerrada } from '../api/cuentaSchemas';

/**
 * Lógica pura de la eliminación de cuenta (backend D-243). Sin React, para probarla sola.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * «1 de noviembre de 2026» en la zona del teléfono.
 *
 * Un instante (`2026-11-01T04:00:00Z`) se pasa a la fecha LOCAL: en Lima ese instante todavía es el
 * 31 de octubre, y es esa la fecha que la persona tiene que leer. Una fecha sola (`2026-11-01`) se
 * parte a mano y no con `new Date`, que la tomaría como medianoche UTC y en Lima mostraría el día
 * anterior. `null` si no se entiende.
 */
export function fechaLegible(iso: string | null | undefined, opciones: { conAnio?: boolean } = {}): string | null {
  if (!iso) return null;
  const conAnio = opciones.conAnio ?? true;
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  let anio: number;
  let mes: number;
  let dia: number;
  if (soloFecha) {
    anio = Number(soloFecha[1]);
    mes = Number(soloFecha[2]);
    dia = Number(soloFecha[3]);
  } else {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return null;
    anio = fecha.getFullYear();
    mes = fecha.getMonth() + 1;
    dia = fecha.getDate();
  }
  if (mes < 1 || mes > 12) return null;
  return `${dia} de ${MESES[mes - 1]}${conAnio ? ` de ${anio}` : ''}`;
}

/** Lo que se le dice a quien acaba de cerrar su cuenta (desde la app). */
export function textoDeCuentaCerrada(cerrada: CuentaCerrada): string {
  const fecha = fechaLegible(cerrada.seBorraEl);
  const cuando = fecha ? `Se borrará el ${fecha}.` : `Se borrará en ${cerrada.diasDeGracia} días.`;
  return `${cuando} Si cambias de opinión, escríbele a soporte antes de esa fecha.`;
}

// ── Campos ────────────────────────────────────────────────────────────────

export const LARGO_DEL_CODIGO = 6;

/** Deja solo dígitos y corta en seis: el campo nunca guarda algo que el servidor rechazaría por forma. */
export function limpiarCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, LARGO_DEL_CODIGO);
}

export function codigoCompleto(codigo: string): boolean {
  return new RegExp(`^\\d{${LARGO_DEL_CODIGO}}$`).test(codigo);
}

/** Forma mínima de un correo. No valida que exista: eso no se revela nunca (página pública). */
export function correoConForma(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

/** El correo escrito coincide con el de la persona, sin distinguir mayúsculas ni espacios en los extremos. */
export function coincideElCorreo(escrito: string, real: string | null | undefined): boolean {
  const a = escrito.trim().toLowerCase();
  const b = (real ?? '').trim().toLowerCase();
  return a.length > 0 && a === b;
}

// ── Errores ───────────────────────────────────────────────────────────────

export type DondeSeElimina = 'app' | 'web';

/**
 * El texto de un fallo al pedir el código o al confirmar.
 *
 * - 400: en la app, el motivo del servidor (contraseña o código incorrecto); en la web, siempre
 *   «Código incorrecto o vencido.».
 * - 409: el motivo del servidor (p. ej. «eres la única cuenta Admin activa»).
 * - 429: demasiados intentos.
 */
export function mensajeDelFalloAlEliminar(error: unknown, donde: DondeSeElimina): string {
  if (!(error instanceof ApiError)) return 'No se pudo completar. Vuelve a intentar.';
  if (error.esDeRed) return 'Sin conexión. Revisa tu red y vuelve a intentar.';
  if (error.status === 429) return 'Demasiados intentos. Prueba más tarde.';
  if (error.status === 400) {
    if (donde === 'web') return 'Código incorrecto o vencido.';
    return motivoDelServidor(error, 'La contraseña o el código no son correctos.');
  }
  if (error.status === 409) return motivoDelServidor(error, 'Ahora no se puede eliminar esta cuenta.');
  return 'No se pudo completar. Vuelve a intentar.';
}

/** El `message` del cuerpo si es para leerse; si no (vacío, «Error 400» o interno), el texto corto. */
function motivoDelServidor(error: ApiError, porDefecto: string): string {
  if (/^Error \d{3}$/.test(error.message.trim())) return porDefecto;
  return mensajeDeError(error, porDefecto);
}

// ── Administración ────────────────────────────────────────────────────────

const ADMINISTRAN = new Set(['ADMIN', 'ALCHEMIST']);

const normalizar = (rol: string | null | undefined) => (rol ?? '').trim().toUpperCase();

/**
 * ¿Se le ofrece a quien mira el botón «Eliminar cuenta» sobre esta persona? El backend vuelve a
 * decidirlo; esto solo evita ofrecer lo imposible.
 *
 * - Solo ADMIN o ALQUIMISTA.
 * - Nunca sobre sí mismo (para eso está Yo → Eliminar mi cuenta).
 * - Sobre un ADMIN o ALQUIMISTA, solo un ADMIN. Si el rol de la persona no se conoce (no cargó su
 *   detalle), se trata como si pudiera serlo: solo un ADMIN lo ve.
 */
export function puedeEliminarCuentaAjena(params: {
  miRol: string | null | undefined;
  miId: string | null | undefined;
  personaId: string;
  rolDePersona: string | null | undefined;
}): boolean {
  const miRol = normalizar(params.miRol);
  if (!ADMINISTRAN.has(miRol)) return false;
  if (!params.miId || params.miId === params.personaId) return false;
  const suRol = normalizar(params.rolDePersona);
  const podriaAdministrar = suRol === '' || ADMINISTRAN.has(suRol);
  return podriaAdministrar ? miRol === 'ADMIN' : true;
}

/** Aviso de la ficha: «Cerró su cuenta. Se borra el 1 de noviembre.» `null` si no hay borrado pendiente. */
export function avisoDeCuentaCerrada(deletionScheduledFor: string | null | undefined): string | null {
  if (!deletionScheduledFor) return null;
  const fecha = fechaLegible(deletionScheduledFor, { conAnio: false });
  return fecha ? `Cerró su cuenta. Se borra el ${fecha}.` : 'Cerró su cuenta.';
}

/** Etiqueta de la fila de Personas: «Se elimina el 1 de noviembre». */
export function etiquetaDeBorradoPendiente(deletionScheduledFor: string | null | undefined): string | null {
  if (!deletionScheduledFor) return null;
  const fecha = fechaLegible(deletionScheduledFor, { conAnio: false });
  return fecha ? `Se elimina el ${fecha}` : 'Cuenta cerrada';
}
