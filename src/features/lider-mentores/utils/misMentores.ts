import type { EstadoDelLider } from './estadosDelLider';
import type { IndicadoresApi, PorResolverApi } from '../api/liderMentoresSchemas';

/**
 * Lo que «Mis mentores» dice y cómo lo ordena (spec 056 FR-002 a FR-004). Puras, para probarlas sin montar nada. La app no recalcula
 * nada: cada cifra es del servidor; una cifra que no llegó (`null`) no se dibuja, nunca se vuelve un cero.
 */
export interface FilaDePorResolver {
  clave: 'grupos' | 'consultas' | 'peorMentor';
  estado: EstadoDelLider;
  /** Una cifra corta: «3 grupos sin mentor», «3 consultas · 5 días», «Ana · 40 %». */
  texto: string;
  /** El verbo del botón: «Asignar», «Recordar», «Ver». */
  boton: string;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «hoy», «1 día», «5 días». */
function diasEnPalabras(dias: number): string {
  return dias <= 0 ? 'hoy' : plural(dias, 'día', 'días');
}

/**
 * Qué entradas le tocan a la cuenta (los interruptores de Soporte TI de siempre): grupos (`semaforo`), consultas (`tickets`) y mentores (`lider`). Una
 * entrada apagada no se ofrece ni en «Por resolver» ni en los accesos del pie. Sin decirlo, todas.
 */
export interface EntradasDelLider {
  grupos: boolean;
  consultas: boolean;
  mentores: boolean;
}
export const TODAS_LAS_ENTRADAS: EntradasDelLider = { grupos: true, consultas: true, mentores: true };

/** Hasta tres filas, en este orden. Una sin nada que resolver (o apagada por Soporte TI) no se dibuja; sin ninguna, la sección no aparece. */
export function filasPorResolver(p: PorResolverApi | null | undefined, entradas: EntradasDelLider = TODAS_LAS_ENTRADAS): FilaDePorResolver[] {
  if (!p) return [];
  const filas: FilaDePorResolver[] = [];
  const grupos = entradas.grupos ? p.gruposSinMentor ?? 0 : 0;
  if (grupos > 0) filas.push({ clave: 'grupos', estado: 'rojo', texto: plural(grupos, 'grupo sin mentor', 'grupos sin mentor'), boton: 'Asignar' });
  const consultas = entradas.consultas ? p.consultas?.cantidad ?? 0 : 0;
  if (consultas > 0) {
    const dias = p.consultas?.diasDeLaMasVieja;
    const cola = dias === null || dias === undefined ? '' : ` · ${diasEnPalabras(dias)}`;
    filas.push({ clave: 'consultas', estado: 'ambar', texto: `${plural(consultas, 'consulta', 'consultas')}${cola}`, boton: 'Recordar' });
  }
  if (entradas.mentores && p.peorMentor) {
    const nombre = p.peorMentor.nombre?.trim() || 'Un mentor';
    filas.push({ clave: 'peorMentor', estado: 'rojo', texto: `${nombre} · ${Math.round(p.peorMentor.evaluacion)} %`, boton: 'Ver' });
  }
  return filas;
}

export const estaSuspendido = (m: Pick<IndicadoresApi, 'accountActive'>) => m.accountActive === false;

/** Sin grupo a cargo: el servidor lo dice con la lista de sus grupos vacía. */
export const noTieneGrupo = (m: IndicadoresApi) => m.groups.source === 'OK' && (m.groups.items?.length ?? 0) === 0;

/**
 * Por urgencia: primero quien tiene más aprendices en rojo, después en ámbar, y a igualdad por nombre. Quien no trae sus colores va
 * después de quien sí los trae (no se sabe, no es «cero en rojo») y los suspendidos van al final. No cambia la lista que recibe.
 */
export function ordenarPorUrgencia(mentores: readonly IndicadoresApi[]): IndicadoresApi[] {
  const rango = (m: IndicadoresApi) => (estaSuspendido(m) ? 2 : m.porColor ? 0 : 1);
  return [...mentores].sort((a, b) => {
    const porRango = rango(a) - rango(b);
    if (porRango !== 0) return porRango;
    if (a.porColor && b.porColor) {
      if (a.porColor.rojo !== b.porColor.rojo) return b.porColor.rojo - a.porColor.rojo;
      if (a.porColor.ambar !== b.porColor.ambar) return b.porColor.ambar - a.porColor.ambar;
    }
    return a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' });
  });
}

/** «14 cupos libres»: la suma de lo que les queda a quienes tienen cupo; `null` si ninguno trae su cupo (no se inventa un cero). */
export function cuposLibresEnPalabras(mentores: readonly IndicadoresApi[]): string | null {
  const conCupo = mentores.filter(m => !estaSuspendido(m) && m.cupo);
  if (conCupo.length === 0) return null;
  const libres = conCupo.reduce((suma, m) => suma + Math.max(0, (m.cupo?.maximo ?? 0) - (m.cupo?.acompanados ?? 0)), 0);
  return plural(libres, 'cupo libre', 'cupos libres');
}

/** Lo que oye el lector de pantalla de una fila de mentor. */
export function dichoDelMentor(m: IndicadoresApi): string {
  if (estaSuspendido(m)) return `${m.fullName}. Cuenta suspendida.`;
  const cupo = m.cupo ? ` Cupo ${m.cupo.acompanados} de ${m.cupo.maximo}.` : '';
  const colores = m.porColor ? ` ${m.porColor.rojo} en rojo, ${m.porColor.ambar} en ámbar, ${m.porColor.verde} en verde, ${m.porColor.sinDatos} sin datos.` : '';
  return `${m.fullName}.${cupo}${noTieneGrupo(m) ? ' Sin grupo.' : colores} Abrir su ficha.`;
}
