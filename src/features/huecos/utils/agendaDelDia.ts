import type {
  BloqueOcupado,
  DiaConHuecos,
  HuecoDelDia,
  HuecoQueSeRepite,
  HuecosDeLaSemana,
  SinVentanaPor,
  VentanaDelDia,
} from '../types/huecos.types';
import { diasEnPalabras, duracionEnPalabras, duracionHablada } from './textosDeHuecos';

/**
 * Lo que hace falta para dibujar «Tiempo libre de la semana» por día (spec 015, corregido 2026-10-29): las siete columnas,
 * la agenda del día elegido y el aviso de una hora que falta. Todo puro y sin pantallas, para probarlo con números. La app
 * no calcula el tiempo libre ni los huecos —lo dice el servidor—: acá solo se acomoda lo que llegó.
 */

/** Cuántos dp mide un minuto en la línea de tiempo, a letra normal. Un hueco de 30 minutos mide ~20: cabe una línea de texto. */
export const DP_POR_MINUTO = 0.66;
/** Cada cuántos minutos va una marca de hora en el borde de la línea de tiempo. */
export const MINUTOS_ENTRE_MARCAS = 120;
/** Cuántas filas de «Se repite» caben como máximo. */
export const MAXIMO_DE_FILAS_QUE_SE_REPITEN = 3;

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** `330` → `05:30`; el fin del día (`1440`) se dice `24:00`. */
export function deMinutosAHora(minutos: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(minutos)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/* ---------- Las siete columnas ---------- */

/** Los minutos de la ventana del día; `null` si ese día no tiene ventana (no se sabe de cuándo a cuándo es). */
export function minutosDeLaVentana(ventana: VentanaDelDia | null): number | null {
  if (!ventana) return null;
  const minutos = aMinutos(ventana.hasta) - aMinutos(ventana.desde);
  return minutos > 0 ? minutos : null;
}

/**
 * Qué parte de la ventana del día queda libre, de 0 a 1: lo que llena el dorado de la barra. `null` sin ventana o sin
 * minutos libres (la barra queda vacía y la cifra dice «—»: no se inventa un cero).
 */
export function proporcionLibre(dia: Pick<DiaConHuecos, 'ventana' | 'minutosLibres'>): number | null {
  const ventana = minutosDeLaVentana(dia.ventana);
  if (ventana === null || dia.minutosLibres === null) return null;
  return Math.max(0, Math.min(1, dia.minutosLibres / ventana));
}

/** `270` → `4.5 h`; `240` → `4 h`; `750` → `13 h`; `20` → `0.3 h`. Corto, para que entre bajo una columna de 40 dp. */
export function horasCortas(minutos: number | null): string {
  if (minutos === null) return '—';
  const horas = Math.max(0, minutos) / 60;
  if (horas >= 10) return `${Math.round(horas)} h`;
  const redondeado = Math.round(horas * 10) / 10;
  return `${Number.isInteger(redondeado) ? redondeado : redondeado.toFixed(1)} h`;
}

/**
 * Lo libre de la semana: la suma de los días que tienen ventana. Un día sin ventana no se cuenta (cuenta el día entero y
 * contaría el sueño como tiempo libre). `null` si ningún día tiene ventana: el total dice «—».
 */
export function totalLibreDeLaSemana(dias: readonly DiaConHuecos[]): number | null {
  let total: number | null = null;
  for (const dia of dias) {
    if (dia.ventana && dia.minutosLibres !== null) total = (total ?? 0) + dia.minutosLibres;
  }
  return total;
}

/** La inicial de cada día, de lunes a domingo (`L M M J V S D`). La etiqueta accesible lleva el nombre entero. */
export function letraDelDia(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getUTCDay()];
}

export type MomentoDelDia = 'pasado' | 'hoy' | 'futuro' | 'desconocido';

/**
 * Si el día ya pasó, es hoy o todavía no llega. **Hoy lo dice el servidor** (`hoy`, en la zona de la persona): el reloj del
 * teléfono de quien acompaña no es el de ella. Sin `hoy`, una semana cerrada es toda pasada y la demás no se puede saber.
 */
export function momentoDelDia(fecha: string, hoy: string | null, cerrada: boolean): MomentoDelDia {
  if (hoy === null) return cerrada ? 'pasado' : 'desconocido';
  if (fecha < hoy) return 'pasado';
  return fecha === hoy ? 'hoy' : 'futuro';
}

/** El día que se abre al entrar a una semana: hoy si cae en ella; si no, el primero con ventana (y si ninguno, el primero). */
export function diaInicial(datos: Pick<HuecosDeLaSemana, 'dias' | 'hoy'>): string | null {
  if (datos.dias.length === 0) return null;
  const hoy = datos.hoy ? datos.dias.find(d => d.fecha === datos.hoy) : undefined;
  return (hoy ?? datos.dias.find(d => d.ventana) ?? datos.dias[0]).fecha;
}

/* ---------- Lo que se lee de un día ---------- */

export interface ConteosDelDia {
  aTiempo: number;
  tarde: number;
  sinCumplir: number;
}

/**
 * Lo cumplido de ese día, si hay algo que contar: `null` cuando el servidor no lo dice (una semana cerrada) o cuando son
 * tres ceros —un día sin registros, o uno que no llega, no tiene «0 a tiempo · 0 tarde…», que parecería un resultado—.
 */
export function conteosDelDia(dia: Pick<DiaConHuecos, 'cumplidosATiempo' | 'cumplidosTarde' | 'noCumplidos'>): ConteosDelDia | null {
  const { cumplidosATiempo: aTiempo, cumplidosTarde: tarde, noCumplidos: sinCumplir } = dia;
  if (aTiempo === null || tarde === null || sinCumplir === null) return null;
  return aTiempo + tarde + sinCumplir === 0 ? null : { aTiempo, tarde, sinCumplir };
}

/** El nombre del día completo: `Jueves 29`, y `Jueves 29 · hoy` cuando lo es. */
export function titularDelDia(nombre: string, momento: MomentoDelDia): string {
  return momento === 'hoy' ? `${nombre} · hoy` : nombre;
}

/** Lo que dice el lector de pantalla de una columna: `Jueves 29, 4 h 30 min libres, hoy`. */
export function etiquetaDeLaColumna(nombre: string, dia: Pick<DiaConHuecos, 'ventana' | 'minutosLibres'>, momento: MomentoDelDia): string {
  const partes = [nombre];
  if (!dia.ventana) partes.push('sin hora de Despertar o de Dormir');
  else if (dia.minutosLibres !== null) partes.push(`${duracionHablada(dia.minutosLibres)} libres`);
  if (momento === 'hoy') partes.push('hoy');
  return partes.join(', ');
}

/* ---------- La línea de tiempo ---------- */

/** Las horas redondas pares que caen dentro de la ventana, en minutos: las marcas del borde (`06:00`, `08:00`…). */
export function marcasDeHora(ventana: VentanaDelDia): number[] {
  const desde = aMinutos(ventana.desde);
  const hasta = aMinutos(ventana.hasta);
  const marcas: number[] = [];
  for (let m = Math.ceil(desde / MINUTOS_ENTRE_MARCAS) * MINUTOS_ENTRE_MARCAS; m <= hasta; m += MINUTOS_ENTRE_MARCAS) {
    marcas.push(m);
  }
  return marcas;
}

/** Un bloque ocupado ya acomodado en la línea de tiempo: sus minutos recortados a la ventana y su carril. */
export interface BloqueAcomodado {
  bloque: BloqueOcupado;
  desde: number;
  hasta: number;
  /** Cuál de los `carriles` columnas ocupa, de izquierda a derecha. */
  carril: number;
  /** Cuántos carriles tiene el grupo de bloques que se cruzan con este. Uno si no se cruza con nadie. */
  carriles: number;
}

/**
 * Acomoda los bloques ocupados en carriles, como una agenda: los que no se cruzan con nadie ocupan todo el ancho; los que
 * se cruzan se reparten en columnas, cada uno en la primera libre. El servidor los manda sin unir justamente para esto:
 * dos cosas a la misma hora tienen que verse las dos. Recorta a la ventana (lo que cae afuera no se dibuja) y mantiene
 * el orden de hora. No depende del orden en que lleguen.
 */
export function acomodarEnCarriles(bloques: readonly BloqueOcupado[], ventana: VentanaDelDia): BloqueAcomodado[] {
  const piso = aMinutos(ventana.desde);
  const techo = aMinutos(ventana.hasta);
  const dentro = bloques
    .map(bloque => ({ bloque, desde: Math.max(aMinutos(bloque.desde), piso), hasta: Math.min(aMinutos(bloque.hasta), techo) }))
    .filter(b => b.desde < b.hasta)
    .sort((a, b) => a.desde - b.desde || a.hasta - b.hasta);

  const resultado: BloqueAcomodado[] = [];
  let grupo: BloqueAcomodado[] = [];
  let finesDeCarril: number[] = [];
  let finDelGrupo = -1;
  const cerrarGrupo = () => {
    grupo.forEach(b => {
      b.carriles = finesDeCarril.length;
    });
    resultado.push(...grupo);
    grupo = [];
    finesDeCarril = [];
  };

  for (const b of dentro) {
    if (b.desde >= finDelGrupo) cerrarGrupo();
    let carril = finesDeCarril.findIndex(fin => fin <= b.desde);
    if (carril === -1) carril = finesDeCarril.length;
    finesDeCarril[carril] = b.hasta;
    finDelGrupo = grupo.length === 0 ? b.hasta : Math.max(finDelGrupo, b.hasta);
    grupo.push({ ...b, carril, carriles: 1 });
  }
  cerrarGrupo();
  return resultado;
}

/** Lo que dice un bloque: su nombre, o «Ocupado» si no lo tiene (la agenda personal). */
export function nombreDelBloque(bloque: Pick<BloqueOcupado, 'titulo'>): string {
  return bloque.titulo ?? 'Ocupado';
}

/** Para el lector de pantalla: `Despertar, de 05:30 a 06:00`. */
export function bloqueHablado(bloque: BloqueOcupado): string {
  return `${nombreDelBloque(bloque)}, de ${bloque.desde} a ${bloque.hasta}`;
}

/** Lo que dice un hueco en la línea de tiempo: `1 h 30 min` y, a la derecha, `15:00–16:30`. */
export function duracionDelHueco(hueco: HuecoDelDia): string {
  return duracionEnPalabras(hueco.minutos);
}

export function huecoHabladoEnLaAgenda(hueco: HuecoDelDia): string {
  return `Libre ${duracionHablada(hueco.minutos)}, de ${hueco.desde} a ${hueco.hasta}`;
}

/* ---------- Cuando falta una hora ---------- */

export interface AvisoDeHoraQueFalta {
  titulo: string;
  detalle: string;
}

const COMO_ARREGLARLO = 'Pídele que la elija en Training → Planificar.';

/**
 * Qué decir cuando un día no tiene ventana: cuál hora falta y por qué eso importa. Sin motivo (el servidor no lo dijo, o
 * es un día de una semana cerrada) se nombran las dos.
 */
export function avisoDeHoraQueFalta(motivo: SinVentanaPor | null): AvisoDeHoraQueFalta {
  switch (motivo) {
    case 'SIN_DESPERTAR':
      return {
        titulo: 'Falta su hora de Despertar',
        detalle: `Sin ella no se sabe cuándo empieza su día y no se calcula su tiempo libre. ${COMO_ARREGLARLO}`,
      };
    case 'SIN_DORMIR':
      return {
        titulo: 'Falta su hora de Dormir',
        detalle: `Sin ella no se sabe cuándo termina su día y no se calcula su tiempo libre. ${COMO_ARREGLARLO}`,
      };
    case 'DORMIR_ANTES_DE_DESPERTAR':
      return {
        titulo: 'Su hora de Dormir va antes que la de Despertar',
        detalle: 'Así no se sabe de cuándo a cuándo es su día y no se calcula su tiempo libre. Pídele que las revise en Training → Planificar.',
      };
    case 'SIN_DESPERTAR_NI_DORMIR':
      return {
        titulo: 'Faltan sus horas de Despertar y de Dormir',
        detalle: 'Sin ellas no se sabe de cuándo a cuándo es su día y no se calcula su tiempo libre. Pídele que las elija en Training → Planificar.',
      };
    default:
      return {
        titulo: 'Falta su hora de Despertar o de Dormir',
        detalle: 'Sin ellas no se sabe de cuándo a cuándo es su día y no se calcula su tiempo libre. Pídele que las elija en Training → Planificar.',
      };
  }
}

/**
 * El aviso de toda la semana: cuando NINGÚN día tiene ventana. Une lo que falta en los siete días (si un día no tiene
 * Despertar y otro no tiene Dormir, faltan las dos). `null` si algún día sí tiene ventana: ahí el aviso va en el día.
 */
export function avisoDeLaSemanaSinHoras(dias: readonly DiaConHuecos[]): AvisoDeHoraQueFalta | null {
  if (dias.length === 0 || dias.some(d => d.ventana)) return null;
  const motivos = dias.map(d => d.sinVentanaPor);
  if (motivos.some(m => m === null)) return avisoDeHoraQueFalta(null);
  const sinDespertar = motivos.some(m => m === 'SIN_DESPERTAR' || m === 'SIN_DESPERTAR_NI_DORMIR');
  const sinDormir = motivos.some(m => m === 'SIN_DORMIR' || m === 'SIN_DESPERTAR_NI_DORMIR');
  if (sinDespertar && sinDormir) return avisoDeHoraQueFalta('SIN_DESPERTAR_NI_DORMIR');
  if (sinDespertar) return avisoDeHoraQueFalta('SIN_DESPERTAR');
  if (sinDormir) return avisoDeHoraQueFalta('SIN_DORMIR');
  return avisoDeHoraQueFalta('DORMIR_ANTES_DE_DESPERTAR');
}

/* ---------- Se repite ---------- */

const LUNES_A_VIERNES = [1, 2, 3, 4, 5];
const FIN_DE_SEMANA = [6, 7];

/** `Todos los días`, `Casi todos los días`, `Lunes a viernes`, `Fin de semana`, o los días uno por uno (`Lun, mié y jue`). */
export function etiquetaDeLosDias(dias: readonly number[]): string {
  const unicos = [...new Set(dias)].sort((a, b) => a - b);
  if (unicos.length === 7) return 'Todos los días';
  if (unicos.length === 6) return 'Casi todos los días';
  if (unicos.join() === LUNES_A_VIERNES.join()) return 'Lunes a viernes';
  if (unicos.join() === FIN_DE_SEMANA.join()) return 'Fin de semana';
  return diasEnPalabras(unicos);
}

/**
 * Los huecos que se repiten que caben en «Se repite»: los que se apoyan en más días primero (y, a igual, el más temprano),
 * hasta {@link MAXIMO_DE_FILAS_QUE_SE_REPITEN}. El servidor ya decidió cuáles se repiten; acá solo se eligen los que entran.
 */
export function filasQueSeRepiten(lista: readonly HuecoQueSeRepite[]): HuecoQueSeRepite[] {
  return [...lista]
    .sort((a, b) => b.dias.length - a.dias.length || a.desde.localeCompare(b.desde))
    .slice(0, MAXIMO_DE_FILAS_QUE_SE_REPITEN);
}
