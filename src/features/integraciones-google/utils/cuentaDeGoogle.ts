import type { AccionDeGoogleApi, CuentaDeGoogleApi } from '../api/cuentaDeGoogleApi';

/**
 * Los textos de la pantalla «Cuenta de Google» (spec 040, D-321), sin React. Tipo oración, tuteo de Perú y poco texto.
 *
 * Nada de lo que se muestra es secreto: el correo, las fechas y las últimas acciones. Si el servidor no manda algo, no se inventa.
 */

export const TITULO_DE_LA_PANTALLA = 'Cuenta de Google';
export const SUBTITULO_DE_LA_PANTALLA = 'La que crea los enlaces de Meet';

export const TEXTO_SIN_CREDENCIALES = 'El servidor todavía no tiene las credenciales de Google. Pídele a Soporte TI que las cargue.';
export const TEXTO_SIN_CUENTA = 'Todavía no hay una cuenta de Google conectada.';
export const TEXTO_HAY_QUE_RECONECTAR = 'Hay que volver a conectar la cuenta de Google. Mientras tanto no se crean enlaces nuevos.';
export const TEXTO_TERMINA_EN_EL_NAVEGADOR = 'Termina en el navegador y vuelve a Renaser.';

export const ETIQUETA_CONECTAR = 'Conectar cuenta de Google';
export const ETIQUETA_RECONECTAR = 'Volver a conectar';
export const ETIQUETA_DESCONECTAR = 'Desconectar';

export const TEXTO_SIN_PERMISO = 'Tu cuenta no puede ver ni cambiar esto.';
export const TEXTO_NO_DISPONIBLE = 'Esta opción todavía no está disponible en el servidor.';
export const TEXTO_SIN_RED = 'Sin conexión con el servidor.';
export const TEXTO_NO_SE_PUDO_LEER = 'No se pudo cargar la cuenta de Google.';
export const TEXTO_NO_SE_PUDO_ABRIR = 'No pudimos abrir Google. Intenta de nuevo en un rato.';
export const TEXTO_NO_SE_PUDO_DESCONECTAR = 'No se pudo desconectar. Intenta de nuevo en un rato.';

export const CONFIRMACION_DE_DESCONECTAR = {
  titulo: '¿Desconectar la cuenta de Google?',
  mensaje: 'No se crean más enlaces de Meet. Los que ya se crearon siguen funcionando.',
  ok: 'Desconectar',
} as const;

export const TEXTO_DESCONECTADA = 'Cuenta desconectada.';

/** Qué ve la persona: el estado en una frase y qué botones corresponden. */
export type VistaDeLaCuenta =
  | { tipo: 'sin_credenciales' }
  | { tipo: 'sin_cuenta' }
  | { tipo: 'activa'; correo: string | null }
  | { tipo: 'revocada'; correo: string | null };

export function vistaDeLaCuenta(cuenta: CuentaDeGoogleApi): VistaDeLaCuenta {
  if (!cuenta.conectada) return cuenta.configurada ? { tipo: 'sin_cuenta' } : { tipo: 'sin_credenciales' };
  const correo = cuenta.correo?.trim() || null;
  return cuenta.estado === 'REVOCADA' ? { tipo: 'revocada', correo } : { tipo: 'activa', correo };
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dos = (n: number) => String(n).padStart(2, '0');

/** «3 nov 2026, 21:04» en la zona del teléfono, o `null` si no se entiende. */
export function fechaYHora(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function textoDeCuandoSeConecto(cuenta: CuentaDeGoogleApi): string | null {
  const cuando = fechaYHora(cuenta.conectadaEn);
  return cuando ? `Conectada el ${cuando}` : null;
}

export function textoDelUltimoUso(cuenta: CuentaDeGoogleApi): string | null {
  const cuando = fechaYHora(cuenta.ultimoUso);
  return cuando ? `Último uso: ${cuando}` : null;
}

const ACCIONES: Record<string, string> = {
  CREAR_SALA: 'Creó una sala',
  ACTUALIZAR_SALA: 'Actualizó una sala',
  BORRAR_SALA: 'Borró una sala',
  AJUSTAR_ACCESO: 'Cambió quién puede entrar',
  REINTENTAR: 'Reintentó',
  CONECTAR: 'Conectó la cuenta',
  DESCONECTAR: 'Desconectó la cuenta',
  CUENTA_REVOCADA: 'La cuenta dejó de servir',
};

/** «Creó una sala · Kelin» o «Creó una sala · el sistema»; una acción nueva que esta versión no conoce se dice en genérico. */
export function textoDeLaAccion(a: AccionDeGoogleApi): string {
  const que = (a.accion && ACCIONES[a.accion]) || 'Hizo algo con Google';
  return a.quien ? `${que} · ${a.quien}` : que;
}

/** ✓ o ✕ en palabras, para no depender del color: «Salió bien» / «No salió». */
export function resultadoDeLaAccion(a: AccionDeGoogleApi): string {
  return a.exito === false ? 'No salió' : 'Salió bien';
}
