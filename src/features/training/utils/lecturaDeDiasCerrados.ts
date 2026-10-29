import { ApiError } from '../../../services/http/apiClient';
import type { TrackDelDiaApi } from '../../habits/types/habits.types';

/**
 * La memoria de los días anteriores que ya se leyeron del servidor (spec 014, condición del dueño: «cuidado con el
 * endpoint, que se puede ejecutar 1000 veces»).
 *
 * Reglas, todas probadas en `__tests__/lecturaDeDiasCerrados.test.ts`:
 *
 * - **Se pide solo cuando se toca un día.** Nada en esta clase pide por su cuenta: `pedir` lo llama el toque de la
 *   persona. No hay efecto, ni foco, ni apertura de Training que la dispare.
 * - **Una lectura por fecha y por cuenta**, guardada en memoria durante la sesión: un día cerrado no cambia. Tocar
 *   otra vez el mismo día usa la guardada.
 * - **Dos toques seguidos comparten el pedido en vuelo**: el segundo espera al primero, no sale otro.
 * - **Un error no se reintenta solo.** Queda como `error` hasta que la persona toca «Reintentar» (`reintentar`).
 * - **Un 400/403/404 o una respuesta que no calza** es «sin datos» —definitivo—: no es un fallo que reintentar.
 * - **Al cambiar de cuenta o de semana, la memoria se limpia** (`alinear`), y una respuesta que llegue tarde de la
 *   anterior se descarta.
 *
 * Sin React ni red propia: `leer` se lo da quien la crea (`obtenerDiaCerrado` en la app, un doble en las pruebas).
 */

export type LecturaDelDia =
  | { estado: 'cargando' }
  | { estado: 'datos'; tracks: TrackDelDiaApi[] }
  /** El servidor no tiene (o no entrega) ese día: se muestra lo planificado. Definitivo. */
  | { estado: 'sin-datos' }
  /** No se pudo leer (red, 5xx). Se reintenta SOLO a pedido. */
  | { estado: 'error' };

export interface LecturaDeDiasCerrados {
  /** Cuenta y semana a las que pertenece lo guardado; si cambia alguna, se limpia todo. */
  alinear(cuenta: string, semana: string): void;
  /** Lo que se sabe de esa fecha (`undefined` = nunca se pidió). */
  estadoDe(fecha: string): LecturaDelDia | undefined;
  /** Pide la fecha si hace falta. Resuelve cuando ya hay estado. Sin red si ya hay datos, «sin datos», o error sin `reintentar`. */
  pedir(fecha: string, opciones?: { reintentar?: boolean }): Promise<void>;
  /** Avisa cuando cambia algo. Devuelve la función para dejar de escuchar. */
  suscribir(oyente: () => void): () => void;
}

/** Un 400 (fecha fuera de lo que entrega), 403 o 404: el servidor no tiene ese día para esta persona. */
const SIN_DATOS_DEL_SERVIDOR: ReadonlySet<number> = new Set([400, 403, 404]);

export function crearLecturaDeDiasCerrados(
  leer: (fecha: string) => Promise<TrackDelDiaApi[] | null>,
): LecturaDeDiasCerrados {
  let alcance = '';
  /** Sube con cada limpieza: una respuesta de la época anterior no se guarda. */
  let epoca = 0;
  const guardadas = new Map<string, LecturaDelDia>();
  const enVuelo = new Map<string, Promise<void>>();
  const oyentes = new Set<() => void>();
  const avisar = () => oyentes.forEach(o => o());

  const pedirAlServidor = (fecha: string): Promise<void> => {
    const mia = epoca;
    guardadas.set(fecha, { estado: 'cargando' });
    avisar();
    const promesa = (async () => {
      let resultado: LecturaDelDia;
      try {
        const tracks = await leer(fecha);
        resultado = tracks ? { estado: 'datos', tracks } : { estado: 'sin-datos' };
      } catch (error) {
        resultado = error instanceof ApiError && SIN_DATOS_DEL_SERVIDOR.has(error.status)
          ? { estado: 'sin-datos' }
          : { estado: 'error' };
      }
      if (mia !== epoca) return;
      guardadas.set(fecha, resultado);
    })().finally(() => {
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
      // Sin avisar: se llama al dibujar (la lectura de `estadoDe` ya ve la memoria limpia) y avisar ahí
      // movería el estado de otro componente en pleno render.
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
