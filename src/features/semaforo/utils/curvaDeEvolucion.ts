import type { DiaDelSemaforo } from '../types/semaforo.types';

/** Un punto de la curva en el sistema del `viewBox`. */
export type PuntoDeLaCurva = { clave: string; x: number; y: number };

export type CurvaDeEvolucion = { trazo: string; puntos: PuntoDeLaCurva[] };

type Lienzo = { ancho: number; alto: number; margen: number };

const LIENZO_DE_YO: Lienzo = { ancho: 320, alto: 78, margen: 6 };

function medido(dia: DiaDelSemaforo): dia is DiaDelSemaforo & { porcentaje: number } {
  return dia.estado === 'MEDIDO' && dia.porcentaje !== null;
}

/**
 * La curva de «Tu Evolución» en Yo: el porcentaje de cumplimiento de cada día de la ventana del
 * semáforo (`dias`, del más viejo al más nuevo), tal cual lo calculó el servidor.
 *
 * Un día que no se midió (sin nada programado, en pausa, sin calcular) NO es un cero: no lleva
 * punto y corta la línea, para no dibujar una caída que no ocurrió ni unir por encima de un hueco.
 * El eje X guarda el lugar de cada día, así el corte se ve donde está.
 *
 * `null` con menos de dos días medidos: un punto suelto no es una curva, y la pantalla no dibuja.
 *
 * > **Agregado 2026-09-29.** Antes la curva y el gráfico de «Patrones» eran coordenadas fijas
 * > (`EVOLUCION`, `PATRONES`): la misma subida para todo el mundo, desde el día 1.
 */
export function curvaDeEvolucion(
  dias: readonly DiaDelSemaforo[],
  lienzo: Lienzo = LIENZO_DE_YO,
): CurvaDeEvolucion | null {
  if (dias.filter(medido).length < 2) return null;
  const { ancho, alto, margen } = lienzo;
  const paso = dias.length > 1 ? (ancho - 2 * margen) / (dias.length - 1) : 0;
  const puntos: PuntoDeLaCurva[] = [];
  const tramos: string[] = [];
  let anteriorMedido = false;
  dias.forEach((dia, i) => {
    if (!medido(dia)) {
      anteriorMedido = false;
      return;
    }
    const porcentaje = Math.min(100, Math.max(0, dia.porcentaje));
    const x = redondear(margen + i * paso);
    const y = redondear(alto - margen - (porcentaje / 100) * (alto - 2 * margen));
    tramos.push(`${anteriorMedido ? 'L' : 'M'}${x} ${y}`);
    puntos.push({ clave: dia.fecha, x, y });
    anteriorMedido = true;
  });
  return { trazo: tramos.join(' '), puntos };
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}
