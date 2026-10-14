import type { DespliegueApi, FuncionalidadConsola, MetricaDeHora } from '../api/soporteTiSchemas';

/**
 * El despliegue progresivo en la consola (spec 002, fase 2, contrato `fase-2.md` §3.4 y decisión del dueño: «lista de
 * probadores y luego porcentaje estable, 5 → 25 → 50 → 100 %», a mano). Funciones puras: las usan la pantalla y las
 * pruebas.
 */

/** Los escalones, en orden. 0 = solo probadores; 100 = para todos (el despliegue termina). */
export const ESCALONES = [0, 5, 25, 50, 100] as const;

export const PARA_TODOS = 100;

/** «25 %», «Solo probadores», «Para todos». */
export function nombreDelEscalon(porcentaje: number): string {
  if (porcentaje >= PARA_TODOS) return 'Para todos';
  if (porcentaje <= 0) return 'Solo probadores';
  return `${porcentaje} %`;
}

/** El estado de despliegue de una fila de la lista (`despliegue` del catálogo, fase 2). `null` = no está en despliegue. */
export function porcentajeDeLaFila(f: FuncionalidadConsola): number | null {
  const p = f.despliegue?.porcentaje;
  return typeof p === 'number' && Number.isFinite(p) && p < PARA_TODOS ? Math.max(0, p) : null;
}

/** La insignia de la lista: «En despliegue · 25 %» o «En despliegue · solo probadores». `null` si no está en despliegue. */
export function textoDeDespliegueEnLaLista(f: FuncionalidadConsola): string | null {
  const p = porcentajeDeLaFila(f);
  if (p === null) return null;
  return p <= 0 ? 'En despliegue · solo probadores' : `En despliegue · ${p} %`;
}

/** El porcentaje vigente de lo que respondió el servidor; `null` si no está en despliegue (la tienen todos). */
export function porcentajeVigente(d: DespliegueApi | null | undefined): number | null {
  if (!d) return null;
  if (d.enDespliegue === false) return null;
  const p = d.porcentaje;
  if (typeof p !== 'number' || !Number.isFinite(p) || p >= PARA_TODOS) return null;
  return Math.max(0, p);
}

/** El escalón siguiente al porcentaje actual (sin despliegue, no hay siguiente: ya la tienen todos). */
export function escalonSiguiente(actual: number | null): number | null {
  if (actual === null) return null;
  return ESCALONES.find(e => e > actual) ?? null;
}

/** El escalón anterior: bajar desde 5 % deja solo a los probadores; sin despliegue, bajar es empezarlo en 50 %. */
export function escalonAnterior(actual: number | null): number | null {
  if (actual === null) return 50;
  const menores = ESCALONES.filter(e => e < actual);
  return menores.length > 0 ? menores[menores.length - 1] : null;
}

export type QueHaceElCambio = 'empezar' | 'subir' | 'bajar' | 'prender_para_todos' | 'nada';

export function queHaceElCambio(actual: number | null, nuevo: number): QueHaceElCambio {
  if (actual === null) return nuevo >= PARA_TODOS ? 'nada' : 'empezar';
  if (nuevo >= PARA_TODOS) return 'prender_para_todos';
  if (nuevo === actual) return 'nada';
  return nuevo > actual ? 'subir' : 'bajar';
}

/** La etiqueta del botón que guarda el escalón elegido. */
export function textoDelBotonDeEscalon(actual: number | null, nuevo: number): string {
  switch (queHaceElCambio(actual, nuevo)) {
    case 'empezar':
      return nuevo <= 0 ? 'Empezar solo con probadores' : `Empezar en ${nuevo} %`;
    case 'subir':
      return `Subir a ${nuevo} %`;
    case 'bajar':
      return nuevo <= 0 ? 'Bajar a solo probadores' : `Bajar a ${nuevo} %`;
    case 'prender_para_todos':
      return 'Prender para todos';
    case 'nada':
      return 'Elige otro escalón';
  }
}

/**
 * ¿Pide la contraseña? (contrato §3.4): empezar un despliegue o bajar el porcentaje de una funcionalidad marcada crítica,
 * y empezar uno en 0 % en cualquiera (la esconde para todos salvo probadores). El servidor decide de verdad (428 si
 * falta); esto evita el viaje de ida y vuelta.
 */
export function esEscalonCritico(f: Pick<FuncionalidadConsola, 'critica'>, actual: number | null, nuevo: number): boolean {
  const que = queHaceElCambio(actual, nuevo);
  if (que === 'empezar' && nuevo <= 0) return true;
  return f.critica === true && (que === 'empezar' || que === 'bajar');
}

/** Lo que falta para guardar un escalón, en una frase; `null` si se puede. */
export function faltaParaElEscalon(actual: number | null, nuevo: number | null, motivo: string): string | null {
  if (nuevo === null || queHaceElCambio(actual, nuevo) === 'nada') return 'Elige un escalón distinto del de ahora.';
  if (!motivo.trim()) return 'Escribe el motivo del cambio: queda en la auditoría.';
  return null;
}

/** Lo que se ve del estado: «25 % de las personas, más 3 probadores», «Solo los 2 probadores», «La tienen todos». */
export function resumenDelDespliegue(actual: number | null, probadores: number): string {
  const conProbadores = probadores > 0 ? `, más ${probadores} ${probadores === 1 ? 'probador' : 'probadores'}` : '';
  if (actual === null) return 'No está en despliegue: la tienen todos.';
  if (actual <= 0) return probadores > 0 ? `Solo ${probadores === 1 ? 'el probador' : `los ${probadores} probadores`}.` : 'Nadie todavía: suma probadores.';
  return `${actual} % de las personas${conProbadores}.`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Métricas de las últimas 24 h (decisión P5 del dueño)
// ---------------------------------------------------------------------------------------------------------------------

export type HoraDeMetricas = {
  hora: string;
  dentro: { pedidos: number; errores: number };
  fuera: { pedidos: number; errores: number };
};

const numero = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

/** Las horas en orden, con los huecos en 0 (el servidor ya los manda, pero no se confía en el orden ni en los nulos). */
export function horasDeMetricas(metricas: readonly MetricaDeHora[] | null | undefined): HoraDeMetricas[] {
  return (metricas ?? [])
    .filter(m => Number.isFinite(Date.parse(m.hora)))
    .map(m => ({
      hora: m.hora,
      dentro: { pedidos: numero(m.dentro?.pedidos), errores: numero(m.dentro?.errores) },
      fuera: { pedidos: numero(m.fuera?.pedidos), errores: numero(m.fuera?.errores) },
    }))
    .sort((a, b) => Date.parse(a.hora) - Date.parse(b.hora));
}

export type TotalesDeMetricas = { pedidos: number; errores: number; porcentajeDeErrores: number | null };

export function totales(horas: readonly HoraDeMetricas[], lado: 'dentro' | 'fuera'): TotalesDeMetricas {
  const pedidos = horas.reduce((s, h) => s + h[lado].pedidos, 0);
  const errores = horas.reduce((s, h) => s + h[lado].errores, 0);
  return { pedidos, errores, porcentajeDeErrores: pedidos > 0 ? (errores / pedidos) * 100 : null };
}

/** «1.284», «12,9 mil»: cifras de la consola, en español de Perú. */
export function cifra(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })} mil`;
  return Math.round(n).toLocaleString('es-PE');
}

/** «0,4 %», «—» sin pedidos. Menos de 0,1 % y más de cero se dice «< 0,1 %» (no «0 %», que miente). */
export function porcentajeDeErrores(p: number | null): string {
  if (p === null) return '—';
  if (p > 0 && p < 0.1) return '< 0,1 %';
  return `${p.toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`;
}

/** El tope del eje: un número redondo por encima del máximo (1, 2, 5 × 10ⁿ), para que la escala se lea de un vistazo. */
export function topeDelEje(maximo: number): number {
  if (!(maximo > 0)) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const paso of [1, 2, 5, 10]) {
    if (paso * potencia >= maximo) return paso * potencia;
  }
  return 10 * potencia;
}

/** «14:00» en la hora del teléfono. */
export function horaCorta(iso: string): string {
  const d = new Date(Date.parse(iso));
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}
