import { useEffect } from 'react';

/**
 * Las capas que toman la pantalla y no se pueden saltear: hoy el Código Renaser (días 1-7, de 08:00 a
 * 19:59, desde el minuto 2 de cada hora hasta que se registra) y el arranque guiado con el Pacto.
 *
 * ## Para qué (D-218, 2026-09-28)
 *
 * Tocar el aviso de un hábito lleva a Training. El dueño pidió que esa navegación **no se cruce** con
 * lo que la persona tiene que resolver en sus primeros siete días: «que no tenga esta función cruces
 * motivos, ya que en los primeros 7 días aparecen preguntas a resolver…, lo que puede ocasionar un
 * bug». Con una capa abierta, la ruta del aviso espera (`rutaDeAviso.ts` ya la guarda) y se abre
 * cuando la capa se cierra. La capa no se cierra ni se esconde por el aviso.
 *
 * El onboarding y el Mapa del Día 7 no se anotan acá: reemplazan a las pestañas enteras
 * (`RootNavigator`) y quien navega ya espera a que la pestaña exista (`pestanaDisponible`).
 *
 * Un registro chico y no una lectura de los contextos de cada capa: el arranque guiado guarda si la
 * tarjeta o el Pacto están a la vista en estado propio de `SparkieOverlay`, y sacarlo de ahí sería
 * cambiar esa pantalla para que otra la pueda espiar. Cada capa dice «estoy abierta» y listo.
 */

const abiertas = new Set<string>();
const oyentes = new Set<() => void>();

/** Anota o quita una capa. Avisa solo si cambió algo. */
export function marcarCapaObligatoria(nombre: string, abierta: boolean): void {
  const antes = abiertas.has(nombre);
  if (antes === abierta) return;
  if (abierta) abiertas.add(nombre);
  else abiertas.delete(nombre);
  oyentes.forEach(oyente => oyente());
}

export function hayCapaObligatoriaAbierta(): boolean {
  return abiertas.size > 0;
}

/** Se entera de cada apertura o cierre. Devuelve la función para dejar de escuchar. */
export function alCambiarLasCapasObligatorias(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Solo para las pruebas. */
export function olvidarCapasObligatorias(): void {
  abiertas.clear();
  oyentes.clear();
}

/** La capa se anota mientras `abierta` sea `true` y se quita al desmontarse. */
export function useCapaObligatoria(nombre: string, abierta: boolean): void {
  useEffect(() => {
    marcarCapaObligatoria(nombre, abierta);
    return () => marcarCapaObligatoria(nombre, false);
  }, [nombre, abierta]);
}
