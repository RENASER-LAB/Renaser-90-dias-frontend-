import type { DiaIso } from '../../habits/notificaciones/utils/alarmasPorDia';
import { avisoInicialDeLosMarcados } from '../../training/utils/avisoDeLosDias';
import {
  estadosIniciales,
  estadosMostrados,
  type EstadosDeLaSeccion,
  type Tocados,
} from '../../training/utils/comoSuena';
import {
  conCambios,
  huellaDeLasPreferencias,
  resolverDia,
  type AjustesDelDia,
  type CambioDeAcciones,
  type PreferenciasDeAcciones,
} from './preferenciasPorDia';

/**
 * Qué muestra el control de los recordatorios de las acciones (spec 010) y qué se guardaría, con unos días marcados.
 * Puro: lo usa `RecordatorioDeAcciones` y lo prueban los tests sin montar la pantalla.
 *
 * ## Dos modos (el mismo reparto que el editor de Planificar de los hábitos)
 *
 * - **Sin días marcados** (la general): cada toque se guarda en el acto, como siempre.
 * - **Con días marcados**: cada toque queda en un BORRADOR y se guarda con el botón. Se guarda SOLO lo tocado: la hora
 *   que no se movió, el aviso que no se eligió y los interruptores que no se tocaron siguen como cada día los tenía.
 *
 * ## Lo que muestra cada fila con días marcados
 *
 * Lo que los días tienen en común; si no coinciden, no hay nada elegido y una línea lo dice («Estos días tienen avisos
 * distintos»). Lo tocado va encima. En «Cómo suena» cada interruptor no común se muestra «Varía».
 */

/** Lo tocado en el modo de días, sin guardar todavía. */
export interface Borrador {
  diarioActivo?: boolean;
  horaDiaria?: string;
  antelaciones?: number[];
  /** Los interruptores tocados de «Cómo suena» (`training/utils/comoSuena`). */
  alarma?: Tocados;
}

export interface VistaDelRecordatorio {
  /** El interruptor de «Recordarme mis acciones del día». Con días que no coinciden se ve apagado y `distintos`. */
  diario: { valor: boolean; distintos: boolean };
  /** La hora que abre el selector, y si los días marcados tienen horas distintas. */
  hora: { valor: string; distintas: boolean };
  /** Las antelaciones marcadas. Con avisos distintos no hay ninguna marcada y `distintos`. */
  aviso: { mostrado: number[]; distintos: boolean };
  /** «Cómo suena» de los días marcados (o de la general), con lo tocado encima. */
  comoSuena: { iniciales: EstadosDeLaSeccion; mostrados: EstadosDeLaSeccion };
}

function enComun<T>(valores: readonly T[]): T | 'distintos' {
  const [primero] = valores;
  return valores.every(v => v === primero) ? primero : 'distintos';
}

/** Los días que se están editando, ya resueltos; sin días marcados, la general. */
export function ajustesEnEdicion(prefs: PreferenciasDeAcciones, marcados: readonly DiaIso[]): AjustesDelDia[] {
  // Sin días marcados se edita la general: se resuelve como un día sin nada propio.
  if (marcados.length === 0) {
    const { dias: _propios, ...general } = prefs;
    return [resolverDia(general, 1)];
  }
  return marcados.map(iso => resolverDia(prefs, iso));
}

export function vistaDelRecordatorio(
  prefs: PreferenciasDeAcciones,
  marcados: readonly DiaIso[],
  borrador: Borrador,
): VistaDelRecordatorio {
  const enModoDias = marcados.length > 0;
  const dias = ajustesEnEdicion(prefs, marcados);

  const diarioComun = enComun(dias.map(d => d.diarioActivo));
  const diario = {
    valor: enModoDias && borrador.diarioActivo !== undefined ? borrador.diarioActivo : diarioComun === 'distintos' ? false : diarioComun,
    distintos: enModoDias && borrador.diarioActivo === undefined && diarioComun === 'distintos',
  };

  const horaComun = enComun(dias.map(d => d.horaDiaria));
  const hora = {
    valor: enModoDias && borrador.horaDiaria !== undefined ? borrador.horaDiaria : horaComun === 'distintos' ? dias[0].horaDiaria : horaComun,
    distintas: enModoDias && borrador.horaDiaria === undefined && horaComun === 'distintos',
  };

  const avisoComun = avisoInicialDeLosMarcados(dias.map(d => d.antelaciones));
  const aviso = enModoDias && borrador.antelaciones !== undefined
    ? { mostrado: borrador.antelaciones, distintos: false }
    : avisoComun === 'distintos'
      ? { mostrado: [], distintos: true }
      : { mostrado: Array.isArray(avisoComun) ? avisoComun : [], distintos: false };

  const iniciales = estadosIniciales(dias.map(d => d.alarma));
  const comoSuena = {
    iniciales,
    // Lo tocado va encima también sin días marcados: ahí solo queda una selección que todavía no se puede guardar
    // (sonido y vibración apagados), que la pantalla muestra con su aviso en línea.
    mostrados: estadosMostrados(iniciales, borrador.alarma ?? {}),
  };

  return { diario, hora, aviso, comoSuena };
}

/** Lo tocado, como cambio para `conCambios`. */
export function cambioDelBorrador(borrador: Borrador): CambioDeAcciones {
  const cambio: CambioDeAcciones = {};
  if (borrador.diarioActivo !== undefined) cambio.diarioActivo = borrador.diarioActivo;
  if (borrador.horaDiaria !== undefined) cambio.horaDiaria = borrador.horaDiaria;
  if (borrador.antelaciones !== undefined) cambio.antelaciones = borrador.antelaciones;
  if (borrador.alarma && Object.keys(borrador.alarma).length > 0) cambio.alarma = borrador.alarma;
  return cambio;
}

/** Lo que quedaría guardado si se tocara «Guardar» ahora. */
export function prefsSiSeGuarda(
  prefs: PreferenciasDeAcciones,
  marcados: readonly DiaIso[],
  borrador: Borrador,
): PreferenciasDeAcciones {
  return conCambios(prefs, marcados, cambioDelBorrador(borrador));
}

/** ¿Guardar cambiaría algo? Tocar un interruptor y dejarlo como estaba no cuenta. */
export function hayCambiosPorGuardar(
  prefs: PreferenciasDeAcciones,
  marcados: readonly DiaIso[],
  borrador: Borrador,
): boolean {
  return huellaDeLasPreferencias(prefsSiSeGuarda(prefs, marcados, borrador)) !== huellaDeLasPreferencias(prefs);
}
