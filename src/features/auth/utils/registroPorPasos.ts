import { MAX_CONTRASENA, MIN_CONTRASENA, validarContrasenaNueva } from '../hooks/useRegistroConOtp';
import { avisoDelWhatsappDelRegistro } from './codigoPorWhatsApp';

/**
 * «Solicitar acceso» por pasos (spec 051): un grupo de campos por pantalla, sin cambiar lo que viaja al servidor.
 * Acá vive lo que se puede probar sin pantalla: qué pasos hay, qué exige cada uno y cuánta fuerza tiene la contraseña.
 */

export type PasoDelRegistro = 'nombre' | 'correo' | 'whatsapp' | 'verificar' | 'contrasena';

/** Lo que se va llenando; vive en la raíz del flujo (`LoginScreen`), así ir y volver no pierde nada. */
export type DatosDelRegistro = {
  nombres: string;
  apellidos: string;
  email: string;
  whatsapp: string;
  contrasena: string;
  aceptaTerminos: boolean;
};

export type CampoDelRegistro = 'nombres' | 'apellidos' | 'email' | 'whatsapp' | 'contrasena' | 'terminos' | 'general';

export type ErrorDePaso = { campo: CampoDelRegistro; mensaje: string };

/**
 * El contacto se verifica ANTES de crear la cuenta (decisión del dueño del 12/11): nombre, correo, WhatsApp, el código y por último
 * la contraseña con los términos. El WhatsApp es un paso solo si el servidor ofrece mandar el código por ahí (spec 043, FR-013): sin
 * el canal, son cuatro pasos y no se pide el número, como siempre.
 */
export function pasosDelRegistro(canalWhatsapp: boolean): PasoDelRegistro[] {
  return canalWhatsapp
    ? ['nombre', 'correo', 'whatsapp', 'verificar', 'contrasena']
    : ['nombre', 'correo', 'verificar', 'contrasena'];
}

/** El título grande de cada paso: lo único que se lee además del campo. */
export const TITULO_DEL_PASO: Record<PasoDelRegistro, string> = {
  nombre: '¿Cómo te llamas?',
  correo: 'Tu correo',
  whatsapp: 'Tu WhatsApp',
  verificar: 'Verifica tu correo',
  contrasena: 'Tu contraseña',
};

/**
 * Qué falta en un paso, antes de avanzar. Los mensajes son los mismos de siempre (`validarDatosRegistro`), para que
 * la persona oiga lo mismo que antes; la contraseña usa la regla del servidor (`MIN_CONTRASENA`).
 * Devuelve el primer error de ese paso (con su campo, para pintarle el borde) o `null`.
 */
export function validarPasoDelRegistro(
  paso: PasoDelRegistro,
  datos: DatosDelRegistro,
  reglaDelWhatsapp: (valor: string) => { mensaje: string } | null,
): ErrorDePaso | null {
  switch (paso) {
    case 'nombre':
      if (!datos.nombres.trim()) return { campo: 'nombres', mensaje: 'Por favor ingresa tus nombres' };
      if (!datos.apellidos.trim()) return { campo: 'apellidos', mensaje: 'Por favor ingresa tus apellidos' };
      return null;
    case 'correo':
      if (!datos.email.trim() || !datos.email.includes('@')) {
        return { campo: 'email', mensaje: 'Por favor ingresa un correo electrónico válido' };
      }
      return null;
    case 'whatsapp': {
      const aviso = avisoDelWhatsappDelRegistro(datos.whatsapp, reglaDelWhatsapp);
      return aviso ? { campo: 'whatsapp', mensaje: aviso } : null;
    }
    case 'verificar':
      // El código lo valida el servidor (no hay nada que mirar acá): `LoginScreen` no deja pasar sin el token que devuelve.
      return null;
    case 'contrasena': {
      // Sin campo de confirmación: se valida contra sí misma (largo mínimo y máximo del servidor).
      const aviso = validarContrasenaNueva(datos.contrasena, datos.contrasena);
      if (aviso) return { campo: 'contrasena', mensaje: aviso };
      if (!datos.aceptaTerminos) return { campo: 'terminos', mensaje: 'Acepta los términos para continuar' };
      return null;
    }
  }
}

/** Primer paso con algo pendiente, o `null` si todo está listo para pedir el código. */
export function primerPasoIncompleto(
  pasos: PasoDelRegistro[],
  datos: DatosDelRegistro,
  reglaDelWhatsapp: (valor: string) => { mensaje: string } | null,
): { indice: number; error: ErrorDePaso } | null {
  for (let indice = 0; indice < pasos.length; indice++) {
    const error = validarPasoDelRegistro(pasos[indice], datos, reglaDelWhatsapp);
    if (error) return { indice, error };
  }
  return null;
}

/**
 * El paso siguiente. Si el contacto ya se verificó (hay token del servidor) el paso del código se salta: no se pide dos veces.
 */
export function indiceSiguiente(pasos: PasoDelRegistro[], indice: number, verificado: boolean): number {
  const siguiente = indice + 1;
  return pasos[siguiente] === 'verificar' && verificado ? siguiente + 1 : siguiente;
}

/** Atrás desde el paso `indice`: el anterior (saltando el del código ya verificado), o `null` si era el primero (ahí se sale al login). */
export function indiceAnterior(pasos: PasoDelRegistro[], indice: number, verificado: boolean): number | null {
  if (indice <= 0) return null;
  const anterior = indice - 1;
  return pasos[anterior] === 'verificar' && verificado ? Math.max(anterior - 1, 0) : anterior;
}

export type FuerzaDeLaContrasena = 0 | 1 | 2 | 3;

/**
 * Los tres segmentos del medidor: 0 = vacía, 1 = corta (no llega al mínimo del servidor), 2 = cumple, 3 = cumple y
 * además mezcla mayúscula, minúscula, número y símbolo (o es larga). Es una guía, no una regla: lo que bloquea es
 * `validarPasoDelRegistro`.
 */
export function fuerzaDeLaContrasena(contrasena: string): FuerzaDeLaContrasena {
  if (contrasena.length === 0) return 0;
  if (contrasena.length < MIN_CONTRASENA || contrasena.length > MAX_CONTRASENA) return 1;
  const variedad = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(patron => patron.test(contrasena)).length;
  return variedad >= 3 || contrasena.length >= MIN_CONTRASENA + 6 ? 3 : 2;
}

/** La palabra que acompaña al medidor, para quien no distingue los colores. */
export const TEXTO_DE_FUERZA: Record<FuerzaDeLaContrasena, string> = {
  0: '',
  1: 'Débil',
  2: 'Aceptable',
  3: 'Fuerte',
};

/** La única línea de ayuda del paso de la contraseña (la regla real del servidor). */
export const AYUDA_DE_LA_CONTRASENA = `Mínimo ${MIN_CONTRASENA} caracteres.`;

/** «Listo, Sebastián»: el primer nombre de lo que escribió la persona. */
export function primerNombre(nombres: string): string {
  return nombres.trim().split(/\s+/)[0] ?? '';
}
