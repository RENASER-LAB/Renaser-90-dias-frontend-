/**
 * Relecturas de la lista de Eventos sin multiplicar pedidos y sin que una respuesta vieja pise a una
 * nueva (bug del e2e del 26/09: un evento creado por el Alquimista con la app abierta no aparecía ni
 * al volver a la sección ni deslizando; solo cerrando la app).
 *
 * Desde ese arreglo la lista se relee al entrar a la sección, al volver a la pestaña, al volver del
 * detalle, la agenda o el formulario, y al deslizar hacia abajo. Varios de esos disparos caen juntos
 * (montar la sección y ganar el foco llegan en el mismo instante), así que:
 *
 * - **Una lectura en curso se comparte.** Un disparo que llega mientras hay una en vuelo no pide otra:
 *   espera la misma.
 * - **`forzar`** pide una nueva aunque haya otra en vuelo (después de crear o editar un evento: la
 *   que estaba en vuelo salió antes del cambio y no lo trae). La vieja queda descartada.
 * - **`invalidar`** descarta la que esté en vuelo sin pedir otra: la usa «Voy» / «No voy» y cancelar,
 *   que cambian la lista a mano; una lectura que salió antes del cambio devolvería la asistencia
 *   vieja y, peor, la sincronización de alarmas quitaría la alarma recién puesta.
 *
 * Solo la lectura más nueva llega a `aplicar`. Es lógica pura (sin React) para poder probarla.
 */

export type ResultadoDeLectura<T> = { ok: true; valor: T } | { ok: false; error: unknown };

export interface LecturaVigente {
  /** Relee. Si ya hay una en vuelo (y no se pide `forzar`), devuelve esa misma. */
  leer(opciones?: { forzar?: boolean }): Promise<void>;
  /** Descarta la lectura en vuelo: su respuesta ya no se aplica. */
  invalidar(): void;
  /** `true` si hay una lectura vigente en vuelo. */
  ocupada(): boolean;
}

export function crearLecturaVigente<T>(
  pedir: () => Promise<T>,
  aplicar: (resultado: ResultadoDeLectura<T>) => void,
): LecturaVigente {
  let turno = 0;
  let enVuelo: { turno: number; promesa: Promise<void> } | null = null;

  const leer = ({ forzar = false }: { forzar?: boolean } = {}): Promise<void> => {
    if (enVuelo && enVuelo.turno === turno && !forzar) return enVuelo.promesa;
    const mio = ++turno;
    const promesa = (async () => {
      let resultado: ResultadoDeLectura<T>;
      try {
        resultado = { ok: true, valor: await pedir() };
      } catch (error) {
        resultado = { ok: false, error };
      }
      if (mio === turno) aplicar(resultado);
    })().finally(() => {
      if (enVuelo?.turno === mio) enVuelo = null;
    });
    enVuelo = { turno: mio, promesa };
    return promesa;
  };

  return {
    leer,
    invalidar: () => {
      turno++;
    },
    ocupada: () => enVuelo !== null && enVuelo.turno === turno,
  };
}

/** Las vistas de la sección Eventos (ver `SeccionEventos`). */
export type NombreDeVista = 'lista' | 'detalle' | 'formulario' | 'agenda';

/**
 * Si pasar de una vista a otra pide releer la lista: volver a la lista desde el detalle, la agenda o
 * el formulario. Antes del arreglo ningún cambio de vista releía.
 */
export function vistaPideReleer(anterior: NombreDeVista, nueva: NombreDeVista): boolean {
  return anterior !== nueva && nueva === 'lista';
}
