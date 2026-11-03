import type { CodigoRenaserEnFichasApi } from '../api/codigoRenaserEnFichasApi';

/**
 * Los textos de la pantalla «Código Renaser en las fichas» (spec 034), en tipo oración y con tuteo. Todo puro. Dicen qué
 * pasa en el servidor y a quién: el mentor, la guía y el líder; Administración, Alquimista y la propia persona lo ven siempre.
 */

export const TITULO_DE_LA_PANTALLA = 'Código Renaser en las fichas';
export const SUBTITULO_DE_LA_PANTALLA = 'Quién ve el Código Renaser de los aprendices';
export const ETIQUETA_DEL_INTERRUPTOR = 'El mentor y el líder ven el Código Renaser';

export const TEXTO_VISIBLE = 'El mentor, la guía y el líder lo ven en la ficha de cada aprendiz.';
export const TEXTO_OCULTO = 'El mentor, la guía y el líder no lo ven. Tú, Alquimista y la propia persona lo siguen viendo.';
export const TEXTO_MIXTO =
  'Soporte TI lo dejó distinto para cada rol. Si lo cambias aquí, queda igual para el mentor, la guía y el líder.';
export const TEXTO_SIN_PERMISO = 'Tu cuenta no puede cambiar esto.';
export const TEXTO_NO_DISPONIBLE = 'Esta opción todavía no está disponible. Inténtalo cuando se actualice el servidor.';
export const TEXTO_SIN_RED = 'Sin conexión con el servidor.';
export const TEXTO_NO_SE_PUDO_LEER = 'No se pudo cargar esta opción.';

/** El estado vigente en una frase. */
export function textoDelEstado(estado: Pick<CodigoRenaserEnFichasApi, 'visible' | 'mixto'>): string {
  if (estado.mixto) return TEXTO_MIXTO;
  return estado.visible ? TEXTO_VISIBLE : TEXTO_OCULTO;
}

/** Lo que se le pregunta antes de cambiar: dice qué va a pasar, sin pedir motivo. */
export function confirmacionDelCambio(haciaVisible: boolean): { titulo: string; mensaje: string; ok: string } {
  return haciaVisible
    ? {
        titulo: 'Mostrar el Código Renaser',
        mensaje:
          'El mentor, la guía y el líder verán el Código Renaser de los aprendices en sus fichas, con todos sus registros. ' +
          'No se avisa a nadie.',
        ok: 'Mostrar',
      }
    : {
        titulo: 'Ocultar el Código Renaser',
        mensaje:
          'El mentor, la guía y el líder dejarán de ver el Código Renaser de los aprendices. ' +
          'Tú y la propia persona lo seguirán viendo. No se avisa a nadie.',
        ok: 'Ocultar',
      };
}

/** La línea que confirma lo hecho, en una línea que se va sola. */
export function textoDeLoHecho(visible: boolean): string {
  return visible ? 'Listo: el mentor y el líder ya ven el Código Renaser.' : 'Listo: el mentor y el líder ya no ven el Código Renaser.';
}

/** «Último cambio: Ana Pérez, 31 oct 2026, 18:40». `null` mientras nadie lo cambió. */
export function textoDelUltimoCambio(ultimo: CodigoRenaserEnFichasApi['ultimoCambio']): string | null {
  if (!ultimo?.en) return null;
  const fecha = new Date(ultimo.en);
  if (Number.isNaN(fecha.getTime())) return null;
  const cuando = `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}, ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
  return ultimo.porNombre ? `Último cambio: ${ultimo.porNombre}, ${cuando}` : `Último cambio: ${cuando}`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dos = (n: number) => String(n).padStart(2, '0');
