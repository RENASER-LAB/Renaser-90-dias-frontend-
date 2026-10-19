/**
 * Una pestaña pedida para cuando se vuelvan a armar las pestañas (fase 2 de la spec 002, «ver como»). Al salir de «ver
 * como» las pestañas se desmontan y se arman de nuevo con la cuenta de Soporte TI (`MainTabs` lleva `key` por cuenta):
 * navegar antes o durante ese cambio se perdía y la app caía en Hoy (Maestro, flujo 39). Así, las pestañas nuevas
 * arrancan directamente en la pedida. Se toma una sola vez.
 */
export type PestanaAlMontar = { nombre: string; params?: Record<string, unknown> };

let pedida: PestanaAlMontar | null = null;

export function pedirPestanaAlMontar(pestana: PestanaAlMontar | null): void {
  pedida = pestana;
}

export function tomarPestanaAlMontar(): PestanaAlMontar | null {
  const tomada = pedida;
  pedida = null;
  return tomada;
}
