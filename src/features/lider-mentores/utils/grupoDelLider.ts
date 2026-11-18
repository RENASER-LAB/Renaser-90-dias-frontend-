import { motivoDeLaFila } from '../../mentor/utils/motivoDeLaFila';
import { ordenDeAprendices } from '../../mentor/utils/ordenDeAprendices';
import { PALABRA_NO_SE_MIDE } from '../../semaforo/utils/ayudaDelSemaforo';
import type { AprendizDelSemaforo, ColorSemaforo, GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { estadoDelColor, type EstadoDelLider } from './estadosDelLider';

/** La fila de un aprendiz en el grupo del líder: su estado con forma y la línea con su motivo y su porcentaje (spec 056 FR-012). */
export interface FilaDelGrupo {
  persona: AprendizDelSemaforo;
  estado: EstadoDelLider;
  color: ColorSemaforo;
  linea: string;
}

/** Los aprendices en el orden de la 055 (rojo, ámbar, verde, sin datos; dentro de cada color el que menos cumplió primero). Quien no se mide va como sin datos. */
export function filasDelGrupo(aprendices: readonly AprendizDelSemaforo[]): FilaDelGrupo[] {
  return ordenDeAprendices(aprendices).map(persona => {
    const color: ColorSemaforo = persona.noSeMide ? 'SIN_DATOS' : persona.color;
    const base = persona.noSeMide
      ? PALABRA_NO_SE_MIDE
      : motivoDeLaFila({ aprendizId: persona.aprendizId, nombre: persona.nombre, color, dias: persona.dias, etiqueta: persona.etiqueta, avisos: [] });
    const porcentaje = persona.porcentaje === null ? '' : ` · ${Math.round(persona.porcentaje)} %`;
    return { persona, estado: estadoDelColor(color), color, linea: `${base}${porcentaje}` };
  });
}

const PALABRA_DEL_GRUPO: Record<EstadoDelLider, string> = { rojo: 'rojo', ambar: 'ámbar', verde: 'verde', sinDatos: 'sin datos' };

/** El estado del grupo y su frase corta: «Grupo en rojo · 0 % en 7 días». Sin promedio, «Grupo sin datos». */
export function estadoDelGrupo(resumen: Pick<GrupoDelResumen, 'colorDelPromedio' | 'promedio'> | null | undefined): { estado: EstadoDelLider; frase: string } {
  if (!resumen || resumen.promedio === null) return { estado: 'sinDatos', frase: 'Grupo sin datos' };
  const estado = estadoDelColor(resumen.colorDelPromedio);
  const cifra = `${Math.round(resumen.promedio)} % en 7 días`;
  return { estado, frase: estado === 'sinDatos' ? `Grupo sin datos · ${cifra}` : `Grupo en ${PALABRA_DEL_GRUPO[estado]} · ${cifra}` };
}
