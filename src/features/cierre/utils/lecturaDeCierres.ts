import { ApiError } from '../../../services/http/apiClient';
import type { CierreDelDia } from '../types/cierre.types';

/**
 * La memoria de los cierres de días ANTERIORES que ya se leyeron del servidor (spec 017). Las mismas reglas que
 * `lecturaDeDiasCerrados` de Training (condición del dueño: «que se pueda ejecutar 1000 veces»), probadas en
 * `__tests__/lecturaDeCierres.test.ts`:
 *
 * - **Se pide solo cuando se toca un día.** Nada acá pide por su cuenta: `pedir` lo llama el toque de la persona.
 * - **Una lectura por fecha y por cuenta**, en memoria durante la sesión: un día que ya terminó no cambia.
 * - **Dos toques seguidos comparten el pedido en vuelo.**
 * - **Un error de red no se reintenta solo**; queda como `error` hasta `reintentar`. Un 400/403/404 o una respuesta que
 *   no calza es «sin datos»: acá no hay cierre y la fila no se dibuja.
 * - **Al cambiar de cuenta o de semana la memoria se limpia**, y una respuesta tardía de la anterior se descarta.
 */

export type LecturaDelCierre =
  | { estado: 'cargando' }
  | { estado: 'datos'; cierre: CierreDelDia }
  | { estado: 'sin-datos' }
  | { estado: 'error' };

export interface LecturaDeCierres {
  alinear(cuenta: string, semana: string): void;
  estadoDe(fecha: string): LecturaDelCierre | undefined;
  pedir(fecha: string, opciones?: { reintentar?: boolean }): Promise<void>;
  suscribir(oyente: () => void): () => void;
}

const SIN_DATOS_DEL_SERVIDOR: ReadonlySet<number> = new Set([400, 403, 404]);

export function crearLecturaDeCierres(leer: (fecha: string) => Promise<CierreDelDia>): LecturaDeCierres {
  let alcance = '';
  let epoca = 0;
  const guardadas = new Map<string, LecturaDelCierre>();
  const enVuelo = new Map<string, Promise<void>>();
  const oyentes = new Set<() => void>();
  const avisar = () => oyentes.forEach(o => o());

  const resultadoDe = async (fecha: string): Promise<LecturaDelCierre> => {
    try {
      const cierre = await leer(fecha);
      // Debe ser el día pedido: otra fecha sería el cierre de otro día mostrado en éste.
      return cierre.fecha === fecha ? { estado: 'datos', cierre } : { estado: 'sin-datos' };
    } catch (error) {
      if (error instanceof ApiError) return SIN_DATOS_DEL_SERVIDOR.has(error.status) ? { estado: 'sin-datos' } : { estado: 'error' };
      // No es un error de red: la respuesta no tiene la forma del cierre (un backend que no lo conoce).
      return { estado: 'sin-datos' };
    }
  };

  const pedirAlServidor = (fecha: string): Promise<void> => {
    const mia = epoca;
    guardadas.set(fecha, { estado: 'cargando' });
    avisar();
    const promesa = resultadoDe(fecha)
      .then(resultado => {
        if (mia === epoca) guardadas.set(fecha, resultado);
      })
      .finally(() => {
        if (mia !== epoca) return;
        enVuelo.delete(fecha);
        avisar();
      });
    enVuelo.set(fecha, promesa);
    return promesa;
  };

  return {
    alinear(cuenta, semana) {
      const clave = `${cuenta}|${semana}`;
      if (clave === alcance) return;
      alcance = clave;
      epoca += 1;
      guardadas.clear();
      enVuelo.clear();
      // Sin avisar: se llama al dibujar y avisar ahí movería el estado de otro componente en pleno render.
    },
    estadoDe: fecha => guardadas.get(fecha),
    pedir(fecha, { reintentar = false } = {}) {
      const enCurso = enVuelo.get(fecha);
      if (enCurso) return enCurso;
      const actual = guardadas.get(fecha);
      if (actual?.estado === 'datos' || actual?.estado === 'sin-datos') return Promise.resolve();
      if (actual?.estado === 'error' && !reintentar) return Promise.resolve();
      return pedirAlServidor(fecha);
    },
    suscribir(oyente) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
  };
}
