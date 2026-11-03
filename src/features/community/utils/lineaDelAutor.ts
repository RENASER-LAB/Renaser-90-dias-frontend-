/**
 * La línea chica bajo el nombre en la tarjeta del Muro: «Hace 1 minuto», o «Grupo Fénix · Hace 1 minuto» si la publicación trae grupo.
 *
 * El «·» solo separa cosas que existen: sin grupo (hoy el Muro no lo trae, y el chip de formación ya no está) la línea era «· Hace 1 minuto», con
 * el punto suelto adelante (E2E del 03/11, issue #115).
 */
export function lineaDelAutor(grupo: string | null | undefined, hace: string | null | undefined): string {
  return [grupo, hace]
    .map(parte => parte?.trim() ?? '')
    .filter(parte => parte.length > 0)
    .join(' · ');
}
