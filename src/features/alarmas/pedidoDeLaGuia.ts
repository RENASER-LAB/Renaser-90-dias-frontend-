/**
 * El puente entre quien decide ofrecer la guía preventiva (`guiaPreventiva.ts`, llamado al guardar un
 * recordatorio en Training) y la hoja que la muestra (`AvisoDeAlarmasBorradas`, montada una sola vez en
 * `App.tsx`). Spec 007, refuerzo FR-021: es la MISMA hoja que el aviso de «tu teléfono cerró Renaser», con
 * texto preventivo.
 *
 * Solo hay una hoja montada, así que alcanza un oyente simple. No toca el almacenamiento a propósito: la hoja
 * lo importa y no debe cargar nada más.
 */
type OyenteDeLaGuia = () => boolean | void;

const oyentes = new Set<OyenteDeLaGuia>();

/** La hoja se anota para recibir el pedido. Devuelve cómo dejar de escuchar. */
export function alPedirLaGuiaPreventiva(oyente: OyenteDeLaGuia): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/**
 * Pide que se muestre la guía. `true` si una hoja la tomó; `false` si no hay ninguna montada (la web, iOS) o si la
 * que hay ya está ocupada con otro aviso (responde `false`). Un oyente que lanza no rompe el guardado que lo pidió.
 */
export function pedirLaGuiaPreventiva(): boolean {
  let mostrada = false;
  for (const oyente of [...oyentes]) {
    try {
      if (oyente() !== false) mostrada = true;
    } catch {
      /* el recordatorio ya quedó guardado: una hoja rota no lo deshace */
    }
  }
  return mostrada;
}
