/**
 * Cómo se dice una duración en la app: «3 meses» (90 días), «1 año» (365) o los días. Lo mismo que dice el servidor en
 * `etiquetasDeDuracion`; esto cubre lo que se arma en la app (el selector de duración al trasladar a alguien).
 */
export function etiquetaDeDuracion(dias: number): string {
  if (dias > 0 && dias % 365 === 0) {
    const anios = dias / 365;
    return anios === 1 ? '1 año' : `${anios} años`;
  }
  if (dias > 0 && dias % 90 === 0) return `${dias / 30} meses`;
  return `${dias} días`;
}
