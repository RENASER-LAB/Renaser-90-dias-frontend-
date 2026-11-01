import { useCategoriasDeHabito } from '../../habits/categorias/hooks/useCategoriasDeHabito';
import { useFormacionDeLaSesion } from '../context/FormacionContext';
import { programaEnOtraFormacion, type ProgramaEnOtraFormacion } from '../utils/programaEnOtraFormacion';

/**
 * Si «Mi programa» de esta persona está en otra formación que la activa (spec 023, FR-030a). Mientras no se sabe cuál es la formación
 * de sus hábitos, nunca: el aviso no parpadea.
 */
export function useProgramaEnOtraFormacion(): ProgramaEnOtraFormacion | null {
  const { formacion } = useFormacionDeLaSesion();
  const categorias = useCategoriasDeHabito();
  return categorias.listo && categorias.delServidor ? programaEnOtraFormacion(formacion, categorias.formacion) : null;
}
