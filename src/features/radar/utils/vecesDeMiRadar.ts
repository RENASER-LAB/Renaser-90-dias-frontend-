/**
 * Mi Radar automático y personalizado (spec 019): las cuentas puras, sin pantalla ni red.
 *
 * **Las horas las calcula el servidor** (`HorarioDelRadar` del backend) y llegan ya resueltas en cada día (`DiaDeMiRadarApi`).
 * Lo que se repite acá es la MISMA cuenta, igual y con el mismo redondeo, solo para ajustar el − / + antes de guardar y para
 * que las pruebas fijen la regla de los dos lados: `horasQueCaben` y `repartirHoras`. La app nunca guarda horas.
 *
 * ## Lo que se edita
 *
 * Se edita el **modo** (Automático o Personalizado), las **veces** (en Personalizado) y **«Sin Radar»**, por día de la semana.
 * Las ediciones son un borrador por día (`BorradorDeMiRadar`) sobre lo guardado y se mandan con «Guardar · sáb, dom», que
 * manda SOLO lo tocado. **Hoy y lo pasado no se editan** (candado): `diasQueSeEditan` nunca los devuelve. Los días que se
 * editan son los marcados o, sin marcar ninguno, todos los que vienen.
 */
import { MI_RADAR } from '../config/configRadar';
import type { CambioDeDiaApi, DiaDeMiRadarApi, MiRadarApi, MotivoSinHorario, ModoDeMiRadar } from '../types/radar.types';
import { DIAS_ISO, type DiaIso } from './miRadar';

const aMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

/**
 * Las horas en punto de 03 a 23 con `Despertar ≤ h:00 < Dormir`. Vacía si falta alguno o si el Dormir no es después del
 * Despertar: ese día no hay Radar y no se inventa un horario. 05:30 y 22:30 dan 06 a 22 (17); 08:00 y 23:00, 08 a 22 (15).
 */
export function horasQueCaben(despertar: string | null | undefined, dormir: string | null | undefined): number[] {
  if (!despertar || !dormir) return [];
  const desde = aMinutos(despertar);
  const hasta = aMinutos(dormir);
  if (hasta <= desde) return [];
  const horas: number[] = [];
  for (let h = MI_RADAR.primeraHora; h <= MI_RADAR.ultimaHora; h++) {
    if (h * 60 >= desde && h * 60 < hasta) horas.push(h);
  }
  return horas;
}

/**
 * `n` de estas horas repartidas parejo: la posición `i` es `round(i·(total−1)/(n−1))`, con la mitad hacia arriba y en
 * enteros (igual que el servidor). Con `n` igual o mayor que las que hay salen todas; con `n` de 1 o menos, la primera.
 * 6 de las 17 de 06 a 22 dan 06, 09, 12, 16, 19 y 22.
 */
export function repartirHoras(horas: readonly number[], n: number): number[] {
  const total = horas.length;
  if (total === 0) return [];
  if (n >= total) return [...horas];
  if (n <= 1) return [horas[0]];
  const elegidas: number[] = [];
  for (let i = 0; i < n; i++) {
    elegidas.push(horas[Math.floor((2 * i * (total - 1) + (n - 1)) / (2 * (n - 1)))]);
  }
  return elegidas;
}

// ---------------------------------------------------------------------------------------------------------------
// El borrador de lo que se está tocando
// ---------------------------------------------------------------------------------------------------------------

/** Lo que se tocó de un día, aún sin guardar. Lo que no está se queda como lo guardado. */
export interface TocadoDeUnDia {
  modo?: ModoDeMiRadar;
  veces?: number;
  sinRadar?: boolean;
}

/** Lo tocado, por día ISO. */
export type BorradorDeMiRadar = Partial<Record<DiaIso, TocadoDeUnDia>>;

/** Un día como se ve con el borrador encima: lo que dibuja la fila, el modo y las veces. */
export interface VistaDeUnDia {
  dia: DiaIso;
  modo: ModoDeMiRadar;
  /** Las veces con que se pregunta (0 si no hay Radar ese día: sin Despertar, sin Dormir o «Sin Radar»). */
  veces: number;
  /** Las que preguntaría si el día tuviera Radar (con «Sin Radar» puesto no se pierde la cifra): lo que cuentan − / +. */
  cuantas: number;
  maximo: number;
  sinRadar: boolean;
  editable: boolean;
  /** No tiene horario (falta el Despertar o el Dormir, o están al revés): no hay Radar y no se puede pedir ninguno. */
  sinHorario: boolean;
}

function diaGuardado(config: MiRadarApi, dia: DiaIso): DiaDeMiRadarApi | undefined {
  return config.dias.find(d => d.dia === dia);
}

/** Las veces con que volvería un día en Personalizado si no se tocan: las guardadas o, si no hay, la propuesta. */
function vecesBase(guardado: DiaDeMiRadarApi): number {
  return guardado.modo === 'PERSONALIZADO' && guardado.veces > 0 ? guardado.veces : MI_RADAR.vecesPorDefecto;
}

/**
 * El día con lo tocado encima. Al pasar a Personalizado sin haber tocado las veces se propone `vecesPorDefecto`; en Personalizado
 * las veces nunca pasan de lo que cabe ese día ni bajan de 1.
 */
export function vistaDelDia(config: MiRadarApi, dia: DiaIso, borrador: BorradorDeMiRadar = {}): VistaDeUnDia | null {
  const guardado = diaGuardado(config, dia);
  if (!guardado) return null;
  const tocado = borrador[dia] ?? {};
  const modo = tocado.modo ?? guardado.modo;
  const sinRadar = tocado.sinRadar ?? guardado.sinRadar;
  const sinHorario = guardado.maximo === 0;
  const cuantas = sinHorario
    ? 0
    : modo === 'AUTOMATICO'
      ? guardado.maximo
      : Math.max(1, Math.min(guardado.maximo, tocado.veces ?? vecesBase(guardado)));
  return {
    dia,
    modo,
    veces: sinRadar || sinHorario ? 0 : cuantas,
    cuantas,
    maximo: guardado.maximo,
    sinRadar,
    editable: guardado.editable,
    sinHorario,
  };
}

/**
 * Los días de la semana que se editan ahora: los marcados que se pueden editar o, sin marcar ninguno, todos los que se pueden
 * editar. **Hoy y lo pasado nunca**, aunque estén marcados.
 */
export function diasQueSeEditan(config: MiRadarApi, marcados: readonly DiaIso[]): DiaIso[] {
  const lista = marcados.length > 0 ? marcados : DIAS_ISO;
  return lista.filter(dia => diaGuardado(config, dia)?.editable === true);
}

/** El modo que muestra el control: el del primer día que se edita (o, sin ninguno, el del primer día que hay). */
export function modoQueSeMuestra(config: MiRadarApi, objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar): ModoDeMiRadar {
  const primero = objetivo[0];
  const vista = primero !== undefined ? vistaDelDia(config, primero, borrador) : null;
  return vista?.modo ?? config.dias[0]?.modo ?? 'AUTOMATICO';
}

/** Cambia el modo de los días que se editan. Los demás días y lo guardado no se tocan. */
export function conElModo(objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar, modo: ModoDeMiRadar): BorradorDeMiRadar {
  const nuevo: BorradorDeMiRadar = { ...borrador };
  for (const dia of objetivo) nuevo[dia] = { ...borrador[dia], modo };
  return nuevo;
}

/** «Sin Radar» para los días que se editan. */
export function conSinRadar(objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar, sinRadar: boolean): BorradorDeMiRadar {
  const nuevo: BorradorDeMiRadar = { ...borrador };
  for (const dia of objetivo) nuevo[dia] = { ...borrador[dia], sinRadar };
  return nuevo;
}

/** Lo que muestra «Veces al día» para los días que se editan. */
export interface VecesDelObjetivo {
  /** La cifra, o `null` si los días tienen veces distintas (se lee «—»). */
  veces: number | null;
  /** Ningún día se puede bajar más (todos ya están en 1). */
  noBaja: boolean;
  /** Ningún día se puede subir más (todos ya preguntan todas las que caben). */
  noSube: boolean;
}

/** `null` si ningún día que se edita tiene horario: no hay nada que contar y «Veces al día» no se muestra. */
export function vecesDelObjetivo(config: MiRadarApi, objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar): VecesDelObjetivo | null {
  const vistas = objetivo.map(d => vistaDelDia(config, d, borrador)).filter((v): v is VistaDeUnDia => v !== null && !v.sinHorario);
  if (vistas.length === 0) return null;
  const todas = vistas.map(v => v.cuantas);
  return {
    veces: todas.every(n => n === todas[0]) ? todas[0] : null,
    noBaja: todas.every(n => n <= 1),
    noSube: vistas.every(v => v.cuantas >= v.maximo),
  };
}

/** Sube o baja en uno las veces de cada día que se edita (cada uno parte de las suyas). Nunca baja de 1 ni pasa de lo que cabe. */
export function conVecesAjustadas(config: MiRadarApi, objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar, delta: 1 | -1): BorradorDeMiRadar {
  const nuevo: BorradorDeMiRadar = { ...borrador };
  for (const dia of objetivo) {
    const vista = vistaDelDia(config, dia, borrador);
    if (!vista || vista.sinHorario) continue;
    nuevo[dia] = { ...borrador[dia], veces: Math.max(1, Math.min(vista.maximo, vista.cuantas + delta)) };
  }
  return nuevo;
}

/**
 * Lo que se manda al guardar: SOLO los días editables cuya vista cambió respecto de lo guardado. En Personalizado van las veces
 * (si el día tiene horario); `sinRadar` va siempre explícito.
 */
export function cambiosParaGuardar(config: MiRadarApi, objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar): CambioDeDiaApi[] {
  const cambios: CambioDeDiaApi[] = [];
  for (const dia of objetivo) {
    const guardado = diaGuardado(config, dia);
    const vista = vistaDelDia(config, dia, borrador);
    if (!guardado || !vista || !guardado.editable) continue;
    const enPersonalizado = vista.modo === 'PERSONALIZADO';
    const cambioElModo = vista.modo !== guardado.modo;
    const cambioSinRadar = vista.sinRadar !== guardado.sinRadar;
    const cambioLasVeces =
      enPersonalizado && !vista.sinHorario && borrador[dia]?.veces !== undefined && vista.cuantas !== vecesBase(guardado);
    if (!cambioElModo && !cambioSinRadar && !cambioLasVeces) continue;
    cambios.push({
      dia,
      modo: vista.modo,
      ...(enPersonalizado && !vista.sinHorario ? { veces: vista.cuantas } : {}),
      sinRadar: vista.sinRadar,
    });
  }
  return cambios;
}

/** ¿Hay algo que guardar? */
export function hayCambios(config: MiRadarApi, objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar): boolean {
  return cambiosParaGuardar(config, objetivo, borrador).length > 0;
}

/** ¿Los días que se editan van todos «Sin Radar»? `false` si no se edita ninguno. */
export function todosSinRadar(config: MiRadarApi, objetivo: readonly DiaIso[], borrador: BorradorDeMiRadar): boolean {
  const vistas = objetivo.map(d => vistaDelDia(config, d, borrador)).filter((v): v is VistaDeUnDia => v !== null);
  return vistas.length > 0 && vistas.every(v => v.sinRadar);
}

/** Cómo se dice cada día en la fila: el número de veces, o `—` si ese día no tiene Radar. */
export function textoDelDiaEnLaFila(vista: VistaDeUnDia): string {
  return vista.veces > 0 ? String(vista.veces) : '—';
}

// ---------------------------------------------------------------------------------------------------------------
// «Hora»: el horario que se lee, solo lectura
// ---------------------------------------------------------------------------------------------------------------

/** Lo que dice el bloque «Hora» para unos días. */
export type HoraDeMiRadar =
  | { tipo: 'horario'; despertar: string; dormir: string }
  | { tipo: 'distintas' }
  | { tipo: 'falta'; motivo: MotivoSinHorario };

/**
 * El horario de los días que se miran: si todos tienen el mismo, ese; si tienen horarios distintos, «Estos días tienen horas
 * distintas»; y si alguno no tiene (falta el Despertar o el Dormir) manda la falta, que es lo que la persona tiene que arreglar.
 */
export function horaDeLosDias(config: MiRadarApi, dias: readonly DiaIso[]): HoraDeMiRadar | null {
  const guardados = dias.map(d => diaGuardado(config, d)).filter((d): d is DiaDeMiRadarApi => d !== undefined);
  if (guardados.length === 0) return null;
  const sin = guardados.find(d => d.maximo === 0 || !d.despertar || !d.dormir);
  if (sin) return { tipo: 'falta', motivo: sin.motivo ?? (!sin.despertar ? 'SIN_DESPERTAR' : !sin.dormir ? 'SIN_DORMIR' : 'HORARIO_INVALIDO') };
  const primero = guardados[0];
  const iguales = guardados.every(d => d.despertar === primero.despertar && d.dormir === primero.dormir);
  return iguales
    ? { tipo: 'horario', despertar: primero.despertar as string, dormir: primero.dormir as string }
    : { tipo: 'distintas' };
}

/** La línea de una falta de horario, de una sola línea. */
export function textoDeLaFalta(motivo: MotivoSinHorario): string {
  switch (motivo) {
    case 'SIN_DESPERTAR':
      return 'Falta tu hora de Despertar';
    case 'SIN_DORMIR':
      return 'Falta tu hora de Dormir';
    case 'HORARIO_INVALIDO':
      return 'Tu Dormir es antes que tu Despertar';
  }
}

/** El botón fijo de abajo cuando falta el horario. */
export function botonDeLaFalta(motivo: MotivoSinHorario): string {
  return motivo === 'SIN_DORMIR' ? 'Programar mi Dormir' : 'Programar mi Despertar';
}
