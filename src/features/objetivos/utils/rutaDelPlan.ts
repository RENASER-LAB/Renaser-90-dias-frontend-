import type { IconName } from '../../../components/Icon';
import { minutosDeLaHora } from '../../training/utils/listaDelDia';
import type { MesDelPlan, PlanMensualDelEje } from '../api/planMensualApi';
import type { EjeObjetivo, RocaDiariaApi } from '../types/objetivos.types';
import { iconoDelEje } from './iconoDelEje';
import { primeraClausula } from './cifraDelObjetivo';
import { objetivoDelMesEnPalabras } from './objetivoDelMesEnPalabras';
import { diasDelProgramaDe, fechasDeLaSemanaDelPrograma, rangoDeFechas } from './mesDelPrograma';
import { mesesDelProgramaDe, semanasDelMes, semanasDelProgramaDe } from './periodoDelPrograma';
import { TEXTO_SE_GUARDARA } from './accionEnEspera';

/**
 * Plan como ruta de niveles (spec 058, R1 «Zigzag crema», 2026-11-25). Lógica pura, sin React ni red: decide QUÉ niveles tiene la ruta
 * de un eje, en qué estado está cada uno y qué abre al tocarlo. La dibuja `components/RutaDelPlan`. Nada de esto es una regla de
 * negocio nueva: el orden, el candado de la Ley IV (`bloqueada`) y lo cumplido salen de lo que el servidor ya manda.
 *
 * ## Los niveles, de arriba abajo
 *
 *  1. Sin los tres objetivos del programa (`bloqueada`) → «Tus metas de <plazo>» (el primero, grande) y el resto con candado.
 *  2. Semana sin objetivo en este eje → «Arma tu semana» (el primero, grande) y el resto con candado.
 *  3. Semana armada → un nivel por acción agendada, en orden de día y hora: cumplido (check), el siguiente (grande, con el fénix),
 *     por hacer, o con candado (la 2.ª y la 3.ª de un día esperan a la 1.ª, Ley IV).
 *  4. Al final de la semana armada: el «+» (agendar otro día) y el cofre (la revisión semanal; abierto si ya se revisó).
 */

export type TipoDeNivel = 'cumplido' | 'siguiente' | 'porHacer' | 'candado' | 'arma' | 'metas' | 'mas' | 'cofre';

/** Qué hace tocar un nivel. `null` = nada (cumplido, con candado, el cofre ya abierto o todavía cerrado sin semana). */
export type AlTocarUnNivel = 'accion' | 'agendarDia' | 'armar' | 'metas' | 'mas' | 'cofre';

export interface NivelDeLaRuta {
  clave: string;
  tipo: TipoDeNivel;
  /** El título de la acción, o «Arma tu semana», «Agendar otro día», «Cierra tu semana»… */
  titulo: string;
  /** «Hoy 14:00», «Mar 07:00 · hecho»; vacío si no hay nada que agregar. */
  detalle: string;
  icono: IconName;
  /** Más grande que los demás: el siguiente por hacer, «Arma tu semana» y «Tus metas». */
  grande: boolean;
  /** El fénix al costado: solo el siguiente por hacer. */
  conFenix: boolean;
  alTocar: AlTocarUnNivel | null;
  /** La acción de la que sale el nivel (los niveles de acción); `undefined` en los demás. */
  accion?: RocaDiariaApi;
  /** Solo el cofre: se ve abierto. */
  abierto?: boolean;
}

export type EstadoDeLaSemanaDeLaRuta = 'cargando' | 'bloqueada' | 'sin_planificar' | 'planificada' | 'cerrada';

export interface EntradaDeLaRuta {
  /** Las acciones del eje, ya ordenadas (`accionesDelEje`). */
  acciones: readonly RocaDiariaApi[];
  /** El día de hoy según el servidor; sin él, nada se considera «de hoy». */
  hoyIso: string | null;
  eje: EjeObjetivo;
  estadoDeLaSemana: EstadoDeLaSemanaDeLaRuta;
  /** El objetivo semanal de este eje; `null` = no tiene. */
  tituloDeLaSemana: string | null;
  /** La autoevaluación final, si la semana de este eje ya se revisó. */
  revisada: number | null;
  /** Hay una semana armada desde la cual agendar (`puedeAgendar` de `PlanDelEje`). */
  puedeAgendar: boolean;
  /** La lectura falló y no hay nada guardado (#182): no se sabe si hay semana ni acciones, no se inventa ningún nivel. */
  sinLectura: boolean;
  /** «90 días», «3 meses», «1 año»: el plazo de la persona (nunca escrito a mano). */
  plazo: string;
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** «Hoy», o «Mar» (tres letras del día de la semana). `fecha` es `yyyy-MM-dd`, una fecha de calendario: se lee en UTC para que el huso no la corra. */
export function diaCortoDeLaRuta(fecha: string, hoyIso: string | null): string {
  if (hoyIso !== null && fecha === hoyIso) return 'Hoy';
  const f = new Date(`${fecha}T00:00:00Z`);
  return Number.isNaN(f.getTime()) ? fecha : DIAS_CORTOS[f.getUTCDay()];
}

/** «Mar 07:00», «Hoy 14:00»; sin hora, solo el día (FR-004). */
export function diaYHoraDeLaAccion(accion: Pick<RocaDiariaApi, 'fecha' | 'horaInicio'>, hoyIso: string | null): string {
  const dia = diaCortoDeLaRuta(accion.fecha, hoyIso);
  const hora = minutosDeLaHora(accion.horaInicio) === null ? null : (accion.horaInicio as string).slice(0, 5);
  return hora ? `${dia} ${hora}` : dia;
}

const NIVEL_QUE_ESPERA = (clave: string, icono: IconName): NivelDeLaRuta => ({
  clave,
  tipo: 'candado',
  titulo: '',
  detalle: '',
  icono,
  grande: false,
  conFenix: false,
  alTocar: null,
});

function cofre(abierto: boolean, revisada: number | null, tocable: boolean): NivelDeLaRuta {
  return {
    clave: 'cofre',
    tipo: 'cofre',
    titulo: 'Cierra tu semana',
    detalle: abierto ? (revisada !== null ? `Revisada · ${revisada} de 10` : 'Revisada') : tocable ? 'Tu revisión abre el cofre' : '',
    icono: 'gift',
    grande: false,
    conFenix: false,
    alTocar: tocable ? 'cofre' : null,
    abierto,
  };
}

/** La acción que sigue: la primera sin cumplir y sin candado, de hoy en adelante (lo que ya pasó sin cumplir no es «lo siguiente»). */
function indiceDelSiguiente(acciones: readonly RocaDiariaApi[], hoyIso: string | null): number {
  return acciones.findIndex(a => !a.completada && !a.bloqueada && (hoyIso === null || a.fecha >= hoyIso));
}

/**
 * Los niveles de la ruta de un eje, en orden de arriba abajo. FR-003, FR-004, FR-006, FR-007 y FR-008.
 */
export function nivelesDeLaRuta(entrada: EntradaDeLaRuta): NivelDeLaRuta[] {
  const { acciones, hoyIso, estadoDeLaSemana, tituloDeLaSemana, revisada, puedeAgendar, sinLectura, plazo, eje } = entrada;
  if (sinLectura || estadoDeLaSemana === 'cargando') return [];

  // Día 1 sin los tres objetivos: el primer nivel pide las metas; lo demás espera.
  if (estadoDeLaSemana === 'bloqueada') {
    return [
      {
        clave: 'metas',
        tipo: 'metas',
        titulo: `Tus metas de ${plazo}`,
        detalle: 'Cuerpo, Negocio y Relaciones',
        icono: 'flag',
        grande: true,
        conFenix: false,
        alTocar: 'metas',
      },
      NIVEL_QUE_ESPERA('espera-1', 'lock'),
      NIVEL_QUE_ESPERA('espera-2', 'lock'),
      cofre(false, null, false),
    ];
  }

  // Semana sin objetivo en este eje: «Arma tu semana» primero; lo demás espera.
  if (tituloDeLaSemana === null) {
    return [
      {
        clave: 'arma',
        tipo: 'arma',
        titulo: 'Arma tu semana',
        detalle: 'Elige qué harás y cuándo',
        icono: 'plus',
        grande: true,
        conFenix: false,
        alTocar: 'armar',
      },
      { ...NIVEL_QUE_ESPERA('espera-1', 'lock'), titulo: 'Tus acciones', detalle: 'Aparecen aquí' },
      NIVEL_QUE_ESPERA('espera-2', 'lock'),
      cofre(false, null, false),
    ];
  }

  const niveles: NivelDeLaRuta[] = [];
  const siguiente = indiceDelSiguiente(acciones, hoyIso);
  acciones.forEach((accion, i) => {
    const esDeHoy = hoyIso !== null && accion.fecha === hoyIso;
    const base = diaYHoraDeLaAccion(accion, hoyIso);
    const enEspera = accion.pendienteDeEnvio === true;
    const nota = enEspera ? ` · ${TEXTO_SE_GUARDARA}` : '';
    const comun = { clave: accion.id, titulo: accion.titulo, accion, conFenix: false, grande: false } as const;
    if (accion.completada) {
      niveles.push({ ...comun, tipo: 'cumplido', detalle: `${base} · hecho${nota}`, icono: 'check', alTocar: null });
    } else if (accion.bloqueada) {
      niveles.push({ ...comun, tipo: 'candado', detalle: `${base} · después de la 1.ª`, icono: 'lock', alTocar: null });
    } else if (i === siguiente) {
      niveles.push({ ...comun, tipo: 'siguiente', detalle: `${base}${nota}`, icono: iconoDelEje(eje), grande: true, conFenix: true, alTocar: esDeHoy ? 'accion' : puedeAgendar ? 'agendarDia' : null });
    } else {
      niveles.push({ ...comun, tipo: 'porHacer', detalle: `${base}${nota}`, icono: iconoDelEje(eje), alTocar: esDeHoy ? 'accion' : puedeAgendar ? 'agendarDia' : null });
    }
  });

  // «+» al final de la semana (FR-007) y el cofre (FR-008). Sin acciones, el «+» es lo primero que se hace.
  if (puedeAgendar) {
    niveles.push({
      clave: 'mas',
      tipo: 'mas',
      titulo: 'Agendar otro día',
      detalle: acciones.length === 0 ? 'Todavía no agendaste acciones' : '',
      icono: 'plus',
      grande: false,
      conFenix: false,
      alTocar: 'mas',
    });
  }
  const yaRevisada = estadoDeLaSemana === 'cerrada' || revisada !== null;
  niveles.push(cofre(yaRevisada, revisada, !yaRevisada));
  return niveles;
}

/**
 * Cuántas de las acciones de la semana están cumplidas de las que cuenta la franja: «1 de 8». Mismo criterio que hoy (`avanceDeLasAcciones`:
 * de hoy a fin de semana, porque el servidor no trae los días que ya pasaron). Se deja aquí solo el texto.
 */
export function textoDeLaCuenta(avance: { cumplidas: number; total: number }): string | null {
  return avance.total > 0 ? `${avance.cumplidas} de ${avance.total}` : null;
}

/* ------------------------------------------------------------------------------------------------
 * El dibujo en zigzag
 * ---------------------------------------------------------------------------------------------- */

/** Cuánto se corre cada nivel del centro, en % del ancho (el zigzag del diseño R1, que repite cada 11). */
export const DESPLAZAMIENTOS_DEL_ZIGZAG: readonly number[] = [-20, 4, 22, 10, -12, -24, -8, 14, 22, 6, -14];

export interface NivelPosicionado {
  nivel: NivelDeLaRuta;
  /** El centro del nivel, en % del ancho (50 = al medio). */
  xPorCiento: number;
  /** El borde de arriba, en px desde el inicio de la ruta. */
  y: number;
  ancho: number;
  alto: number;
  /** La etiqueta (título y «Día HH:MM») va a la izquierda del nivel si este queda a la derecha del centro. */
  etiquetaALaIzquierda: boolean;
}

const ANCHO_CHICO = 56;
const ALTO_CHICO = 52;
const ANCHO_GRANDE = 68;
const ALTO_GRANDE = 64;
const SEPARACION = 34;
const AIRE_DEL_SIGUIENTE = 6;
const MARGEN_DE_ARRIBA = 10;

/** Dónde va cada nivel y cuánto mide la ruta entera. */
export function posicionarLosNiveles(niveles: readonly NivelDeLaRuta[]): { items: NivelPosicionado[]; alto: number } {
  let y = MARGEN_DE_ARRIBA;
  const items = niveles.map((nivel, i) => {
    const alto = nivel.grande ? ALTO_GRANDE : ALTO_CHICO;
    const ancho = nivel.grande ? ANCHO_GRANDE : ANCHO_CHICO;
    if (nivel.grande) y += AIRE_DEL_SIGUIENTE;
    const xPorCiento = 50 + DESPLAZAMIENTOS_DEL_ZIGZAG[i % DESPLAZAMIENTOS_DEL_ZIGZAG.length];
    const item: NivelPosicionado = { nivel, xPorCiento, y, ancho, alto, etiquetaALaIzquierda: xPorCiento >= 50 };
    y += alto + SEPARACION;
    return item;
  });
  return { items, alto: y };
}

/* ------------------------------------------------------------------------------------------------
 * El separador del mes y «Lo que viene»
 * ---------------------------------------------------------------------------------------------- */

/** Lo que dice el objetivo de un mes en una línea corta: «llegar a 80,5 kg», el título, o `null` si no hay. */
export function objetivoCortoDelMes(mes: MesDelPlan | undefined, plan: PlanMensualDelEje | undefined): string | null {
  const objetivo = objetivoDelMesEnPalabras(mes, plan);
  if (objetivo.tipo === 'cifra') return `llegar a ${objetivo.cifra}`;
  if (objetivo.tipo === 'titulo') return objetivo.texto;
  return null;
}

/** «Mes 1 · llegar a 80,5 kg»; sin objetivo para ese mes, solo «Mes 1». */
export function etiquetaDelSeparadorDelMes(numeroMes: number, objetivo: string | null): string {
  return objetivo ? `Mes ${numeroMes} · ${objetivo}` : `Mes ${numeroMes}`;
}

export type TipoDeLoQueViene = 'semana' | 'mes' | 'meta';

export interface ItemDeLoQueViene {
  clave: string;
  tipo: TipoDeLoQueViene;
  titulo: string;
  detalle: string;
  /** Solo la semana que se arma hoy (el domingo): toca y abre «Arma tu semana». */
  alTocar: 'armar' | null;
}

export interface EntradaDeLoQueViene {
  numeroSemana: number;
  numeroMes: number;
  diaPrograma: number;
  duracionDias?: number | null;
  /** El domingo ya se arma la semana que empieza el lunes. */
  armaLaQueEmpieza: boolean;
  /** Esa semana ya tiene objetivo (solo importa si `armaLaQueEmpieza`). */
  queEmpiezaArmada: boolean;
  hoy: Date;
  /** El objetivo de cada mes del eje (ya dicho en una línea), por número de mes. */
  objetivoDelMes: (mes: number) => string | null;
  /** La meta del programa del eje («De 82 a 76 kg»), o `null` si todavía no la escribió. */
  meta: string | null;
}

/**
 * «Lo que viene» (FR-003): la semana que sigue (bloqueada hasta que toque armarla), los meses que faltan y la bandera de la meta. Sin la
 * semana siguiente en la última semana del programa; sin meses extra en el último mes.
 */
export function loQueViene(e: EntradaDeLoQueViene): ItemDeLoQueViene[] {
  const items: ItemDeLoQueViene[] = [];
  const ultimaSemana = semanasDelProgramaDe(e.duracionDias);
  const siguiente = e.numeroSemana + 1;
  if (siguiente <= ultimaSemana) {
    const fechas = fechasDeLaSemanaDelPrograma(siguiente, e.diaPrograma, e.hoy, e.duracionDias);
    const rango = fechas ? ` · ${rangoDeFechas(fechas)}` : '';
    items.push({
      clave: `semana-${siguiente}`,
      tipo: 'semana',
      titulo: `Semana ${siguiente}${rango}`,
      detalle: e.armaLaQueEmpieza ? (e.queEmpiezaArmada ? 'ya armada' : 'se arma hoy') : 'se arma el domingo',
      alTocar: e.armaLaQueEmpieza && !e.queEmpiezaArmada ? 'armar' : null,
    });
  }
  const ultimoMes = mesesDelProgramaDe(e.duracionDias);
  for (let mes = e.numeroMes + 1; mes <= ultimoMes; mes += 1) {
    const semanas = semanasDelMes(mes, e.duracionDias);
    items.push({
      clave: `mes-${mes}`,
      tipo: 'mes',
      titulo: etiquetaDelSeparadorDelMes(mes, e.objetivoDelMes(mes)),
      detalle: `semanas ${semanas[0]} a ${semanas[semanas.length - 1]}`,
      alTocar: null,
    });
  }
  items.push({
    clave: 'meta',
    tipo: 'meta',
    titulo: e.meta ? `Tu meta: ${e.meta}` : 'Tu meta',
    detalle: `día ${diasDelProgramaDe(e.duracionDias)}`,
    alTocar: null,
  });
  return items;
}

/** La meta del programa en una frase corta para «Tu meta: …»: su primera cláusula. */
export function metaEnPocasPalabras(objetivo: string | null | undefined): string | null {
  const limpio = objetivo?.trim();
  return limpio ? primeraClausula(limpio) : null;
}

/* ------------------------------------------------------------------------------------------------
 * «Planifica tus objetivos» (el engranaje): los días de la semana
 * ---------------------------------------------------------------------------------------------- */

export interface DiaDeLaAgenda {
  iso: string;
  letra: string;
  numero: number;
  esHoy: boolean;
  tieneAcciones: boolean;
}

const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function isoLocal(f: Date): string {
  const m = String(f.getMonth() + 1).padStart(2, '0');
  const d = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${m}-${d}`;
}

/** Los siete días (lunes a domingo) de la semana de `hoy`, con un punto en los que tienen acciones agendadas (de cualquier eje). Fechas locales, sin `toISOString` (E-91). */
export function diasDeLaAgenda(hoy: Date, acciones: readonly Pick<RocaDiariaApi, 'fecha'>[]): DiaDeLaAgenda[] {
  const conAcciones = new Set(acciones.map(a => a.fecha));
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7), 12);
  const hoyIso = isoLocal(hoy);
  return LETRAS.map((letra, i) => {
    const f = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i, 12);
    const iso = isoLocal(f);
    return { iso, letra, numero: f.getDate(), esHoy: iso === hoyIso, tieneAcciones: conAcciones.has(iso) };
  });
}
