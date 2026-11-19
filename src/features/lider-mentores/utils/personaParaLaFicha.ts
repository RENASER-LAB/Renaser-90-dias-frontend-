import { conEstado } from '../../mentor/reglas';
import type { AlumnoConEstado } from '../../mentor/types/mentor.types';

/**
 * La persona que abre `FichaDePersona` cuando el líder solo sabe su id y su nombre (la fila de una lista, la de un mentor): los datos de
 * seguimiento van en `null`, que quiere decir «no se sabe» y nunca cero. La semana, los hábitos y el semáforo los pide la ficha por su cuenta.
 */
export function personaParaLaFicha(personaId: string, nombre: string | null): AlumnoConEstado {
  return conEstado({
    participanteId: personaId,
    nombre,
    diaPrograma: null,
    ultimaActividadEn: null,
    habitosProgramados: null,
    habitosCumplidos: null,
    evidenciasPendientes: null,
  });
}

/** Una clave para un pedido que no debe duplicarse: la misma en un reintento, otra para cada acción nueva. */
export function nuevaClaveDeOperacion(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
