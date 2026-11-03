import { CODIGOS_DE_FORMACION } from '../types/formaciones.types';

/**
 * Las formaciones del personal en «Equipo y roles» (spec 022, historia 5, escenario 7): se marcan una o más y una queda activa. La
 * regla del servidor es que nunca se queda sin ninguna y que no se le quita una donde lidera un grupo (409 con el grupo); aquí
 * solo se ordena lo marcado y se decide cuál queda activa.
 */
export type SeleccionDelPersonal = { marcadas: string[]; activa: string | null };

export function seleccionInicial(asignadas: Array<{ formacion: string; activa: boolean }>): SeleccionDelPersonal {
  const marcadas = ordenar(asignadas.map(a => a.formacion));
  const activa = asignadas.find(a => a.activa)?.formacion ?? marcadas[0] ?? null;
  return { marcadas, activa };
}

function ordenar(codigos: string[]): string[] {
  const orden = (c: string) => {
    const i = (CODIGOS_DE_FORMACION as readonly string[]).indexOf(c);
    return i === -1 ? CODIGOS_DE_FORMACION.length : i;
  };
  return [...new Set(codigos)].sort((a, b) => orden(a) - orden(b));
}

/** Marca o desmarca una formación. Si se desmarca la activa, pasa a ser la primera que queda. */
export function alternarFormacion(seleccion: SeleccionDelPersonal, codigo: string): SeleccionDelPersonal {
  const estaba = seleccion.marcadas.includes(codigo);
  const marcadas = ordenar(estaba ? seleccion.marcadas.filter(c => c !== codigo) : [...seleccion.marcadas, codigo]);
  const activa = seleccion.activa && marcadas.includes(seleccion.activa) ? seleccion.activa : (marcadas[0] ?? null);
  return { marcadas, activa };
}

export function haCambiado(inicial: SeleccionDelPersonal, actual: SeleccionDelPersonal): boolean {
  return inicial.activa !== actual.activa || inicial.marcadas.join('|') !== actual.marcadas.join('|');
}

export function errorDeLaSeleccion(seleccion: SeleccionDelPersonal): string | null {
  return seleccion.marcadas.length === 0 ? 'Marca al menos una formación.' : null;
}
