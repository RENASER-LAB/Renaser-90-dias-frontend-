/** Lo que se lee cuando Soporte TI apagó algo sin escribir un aviso (contrato de la spec 002, §2). */
export const AVISO_GENERICO = 'Esta función está en mantenimiento. Vuelve a intentarlo en un rato.';

/** El texto que se muestra: el aviso escrito o, si está vacío, el genérico. */
export function textoDelAviso(aviso: string | null | undefined): string {
  return aviso?.trim() || AVISO_GENERICO;
}
