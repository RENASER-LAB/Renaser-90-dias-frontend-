/**
 * Una pestaña pedida para cuando se vuelvan a armar las pestañas (fase 2 de la spec 002, «ver como»). Al salir de «ver
 * como» las pestañas se desmontan y se arman de nuevo con la cuenta de Soporte TI (`MainTabs` lleva `key` por cuenta):
 * navegar antes o durante ese cambio se perdía y la app caía en Hoy (Maestro, flujo 39).
 *
 * Dos lecturas, porque quien la usa puede no ser quien la consume:
 * - {@link verPestanaAlMontar} solo mira: `MainTabs` la usa para `initialRouteName` / `initialParams`, que React
 *   Navigation ignora si el contenedor ya traía un estado guardado de las pestañas anteriores.
 * - {@link tomarPestanaAlMontar} la consume, una sola vez: `MainTabs` la toma recién cuando navegó (o se rindió) y el
 *   respaldo de la franja la toma si a los 1500 ms nadie lo hizo. Un montaje intermedio que se desmonta no se la lleva.
 */
export type PestanaAlMontar = { nombre: string; params?: Record<string, unknown> };

let pedida: PestanaAlMontar | null = null;

export function pedirPestanaAlMontar(pestana: PestanaAlMontar | null): void {
  pedida = pestana;
}

/** Lo que está pedido, sin consumirlo. */
export function verPestanaAlMontar(): PestanaAlMontar | null {
  return pedida;
}

/** Lo que está pedido, consumiéndolo: la segunda vez ya no hay nada. */
export function tomarPestanaAlMontar(): PestanaAlMontar | null {
  const tomada = pedida;
  pedida = null;
  return tomada;
}
