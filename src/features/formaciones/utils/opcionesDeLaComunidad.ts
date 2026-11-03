import { CODIGOS_DE_FORMACION, type OpcionDeFormacion } from '../types/formaciones.types';
import { nombreLargoDeFormacion, nombreSinRenaser } from './nombreDeFormacion';

/**
 * Lo que ofrece el selector de formación de la Comunidad (spec 024), solo para quien ve todas. Puro: la pantalla y el hook no
 * deciden nada, solo pintan esto.
 */

/** El valor de «Todas» en el control (el control trabaja con textos; en el estado es `null`). */
export const VALOR_TODAS = 'todas';

export type OpcionDelSelectorDeLaComunidad = {
  /** `VALOR_TODAS` o el código de la formación. */
  valor: string;
  /** Lo que se lee en el segmento: «Todas», «Escuela», «Diplomado», «Certificación». */
  etiqueta: string;
  /** Lo que oye el lector de pantalla: «Todas las formaciones», «Diplomado Renaser». */
  nombreCompleto: string;
};

/**
 * «Todas» y las formaciones que manda el servidor (`disponibles`, con los nombres que Administración les puso). Si el servidor no las
 * mandó (no debería pasar para quien ve todas), se usan las tres de fábrica: el selector nunca queda vacío.
 */
export function opcionesDelSelector(disponibles: readonly OpcionDeFormacion[] | null | undefined): OpcionDelSelectorDeLaComunidad[] {
  const delServidor = (disponibles ?? []).filter(o => o.codigo);
  const formaciones: OpcionDeFormacion[] =
    delServidor.length > 0
      ? [...delServidor]
      : CODIGOS_DE_FORMACION.map(codigo => ({ codigo, nombre: nombreLargoDeFormacion(codigo) }));
  return [
    { valor: VALOR_TODAS, etiqueta: 'Todas', nombreCompleto: 'Todas las formaciones' },
    ...formaciones.map(o => ({ valor: o.codigo, etiqueta: nombreSinRenaser(o.nombre), nombreCompleto: o.nombre })),
  ];
}

/** Del valor del control al estado (`null` = Todas) y de vuelta. */
export function valorDelControl(eleccion: string | null): string {
  return eleccion ?? VALOR_TODAS;
}

export function eleccionDelControl(valor: string): string | null {
  return valor === VALOR_TODAS ? null : valor;
}

/** El nombre de una formación por su código: el configurado si se conoce, o el de fábrica. */
export function nombreDeLaFormacion(codigo: string, disponibles: readonly OpcionDeFormacion[] | null | undefined): string {
  const configurada = (disponibles ?? []).find(o => o.codigo === codigo)?.nombre;
  return configurada && configurada.trim() ? configurada : nombreLargoDeFormacion(codigo);
}

/** Lo que se escribe en el rótulo de una fila: el nombre de la formación, sin el «Renaser» del final. */
export function rotuloDeLaFormacion(codigo: string, disponibles: readonly OpcionDeFormacion[] | null | undefined): string {
  return nombreSinRenaser(nombreDeLaFormacion(codigo, disponibles));
}

/**
 * El orden de los grupos cuando se lee «Todas»: primero la Escuela, luego el Diplomado y la Certificación, y al final cualquier otra
 * que esta versión no conozca, en el orden en que aparece.
 */
export function ordenDeFormaciones(codigos: readonly string[]): string[] {
  const unicos = Array.from(new Set(codigos));
  const conocidas = CODIGOS_DE_FORMACION.filter(c => unicos.includes(c)) as string[];
  const otras = unicos.filter(c => !(CODIGOS_DE_FORMACION as readonly string[]).includes(c));
  return [...conocidas, ...otras];
}
