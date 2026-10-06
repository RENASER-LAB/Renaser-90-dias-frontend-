import type { ColorSemaforo } from '../types/semaforo.types';

/**
 * El color VIGENTE del semáforo propio, en un solo lugar de la app (2026-10-06, pedido del dueño: el fénix de la
 * tarjeta de Hoy y el del botón de SER muestran el ánimo del semáforo y leen de acá).
 *
 * **No calcula nada.** El color lo decide el servidor (`points.ReglaDelSemaforo`, guardado en `semaforo_dias`). Acá
 * solo se guarda el último que llegó, venga de donde venga:
 * - **Hoy lo publica** con lo que ya lee: el campo `semaforo` de `GET /api/v1/home` y, si está, `vigente` de
 *   `GET /api/v1/me/semaforo`. Esa lectura no se repite: este almacén no pide nada mientras Hoy le alcance.
 * - **Se refresca solo** (una `GET /api/v1/me/semaforo?semanas=1`) al volver la app al frente si pasaron ≥ 15 min
 *   desde la última lectura, y después de cumplir un hábito. Sin sondeo periódico.
 * - **Solo para quien tiene semáforo propio** (`habilitar(true)`): sin eso no pide nada nunca.
 * - Si la lectura falla o no hay dato, el color queda en `null` → el fénix sale neutral, nunca alegre por falta de datos.
 *
 * Una sola petición en vuelo: si llegan dos motivos de refresco a la vez, el segundo espera al mismo resultado.
 */
export const UMBRAL_DE_REFRESCO_MS = 15 * 60 * 1000;

export type LecturaDelColor = () => Promise<ColorSemaforo | null>;

export type AlmacenDelSemaforoVigente = {
  color: () => ColorSemaforo | null;
  suscribir: (aviso: () => void) => () => void;
  /** Lo que ya leyó otra pantalla (Hoy). `null` = no se mide o no vino. */
  publicar: (color: ColorSemaforo | null) => void;
  habilitar: (habilitado: boolean) => void;
  alVolverAlFrente: () => Promise<void>;
  trasCumplirUnHabito: () => Promise<void>;
  /** Cierre de sesión: olvida el color de la cuenta anterior. */
  reiniciar: () => void;
};

export function crearAlmacenDelSemaforoVigente(leer: LecturaDelColor, ahora: () => number = Date.now): AlmacenDelSemaforoVigente {
  let color: ColorSemaforo | null = null;
  let leidoEn: number | null = null;
  let habilitado = false;
  let enVuelo: Promise<void> | null = null;
  const avisos = new Set<() => void>();

  const cambiar = (nuevo: ColorSemaforo | null) => {
    leidoEn = ahora();
    if (nuevo === color) return;
    color = nuevo;
    for (const aviso of [...avisos]) aviso();
  };

  const refrescar = (): Promise<void> => {
    if (!habilitado) return Promise.resolve();
    if (enVuelo) return enVuelo;
    enVuelo = leer()
      .then(cambiar, () => cambiar(null))
      .finally(() => {
        enVuelo = null;
      });
    return enVuelo;
  };

  return {
    color: () => color,
    suscribir: aviso => {
      avisos.add(aviso);
      return () => avisos.delete(aviso);
    },
    publicar: nuevo => cambiar(nuevo),
    habilitar: valor => {
      habilitado = valor;
    },
    alVolverAlFrente: () => {
      const reciente = leidoEn !== null && ahora() - leidoEn < UMBRAL_DE_REFRESCO_MS;
      return reciente ? Promise.resolve() : refrescar();
    },
    trasCumplirUnHabito: refrescar,
    reiniciar: () => {
      leidoEn = null;
      cambiar(null);
      leidoEn = null;
    },
  };
}
