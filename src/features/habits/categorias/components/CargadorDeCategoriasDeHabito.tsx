import { useCategoriasDeHabito } from '../hooks/useCategoriasDeHabito';

/**
 * Lee las categorías de hábito de la formación de la sesión (spec 023) apenas hay sesión, y las vuelve a leer al cambiar de cuenta o de
 * formación. Va en `App.tsx` y no dentro de Training porque las leen también cosas que no son una pantalla: el aviso de un hábito que se
 * abre en su dimensión, las alarmas y las etiquetas de las fichas. No pinta nada.
 */
export function CargadorDeCategoriasDeHabito(): null {
  useCategoriasDeHabito();
  return null;
}
