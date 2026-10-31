/**
 * «Tus acciones de hoy» de Plan (spec 016, opción B «Por eje»): las acciones del día agrupadas por eje, con su avance, el
 * estado de cada una y la que sigue. Lógica pura, sin React ni red: la prueba `__tests__/accionesDeHoy.test.ts` y la dibuja
 * `components/TarjetaAccionesDeHoyPorEje`.
 *
 * Las acciones son las `RocaDiariaApi` de HOY (`GET /rocks/today`), las mismas que Training lista por hora. **Plan solo
 * muestra:** registrar sigue siendo en Training (spec 014, FR-005).
 *
 * ## El estado de cada acción (con forma, nunca solo color)
 *
 *  - `cumplida`: ya tiene su evidencia (✓).
 *  - `esperaALaVerde`: la regla de Pareto — la VERDE de cada eje va primero y hasta que se cumple las otras dos llegan con
 *    `bloqueada` (candado). Manda sobre la hora: una acción bloqueada no se puede registrar, tenga la hora que tenga.
 *  - `sePaso`: sigue pendiente y su hora ya pasó (reloj rojo). Se puede registrar hoy igual (D-259): vencer la hora solo
 *    baja los puntos. **Aquí «se pasó» es solo «su hora ya pasó».** Training es más generoso (una acción queda «atrasada» cuando
 *    llega la hora del siguiente ítem del día, también los hábitos), pero Plan no lee los hábitos y no los puede conocer.
 *  - `pendiente`: el resto (círculo vacío); incluye las que no tienen hora.
 */
import { minutosDeLaHora } from '../../training/utils/listaDelDia';
import { ETIQUETA_CORTA_EJE, type EjeObjetivo, type RocaDiariaApi } from '../types/objetivos.types';

export type EstadoDeLaAccion = 'cumplida' | 'esperaALaVerde' | 'sePaso' | 'pendiente';

/** `ahoraMin`: minutos desde la medianoche, en la hora del teléfono. */
export function estadoDeLaAccion(roca: Pick<RocaDiariaApi, 'completada' | 'bloqueada' | 'horaInicio'>, ahoraMin: number): EstadoDeLaAccion {
  if (roca.completada) return 'cumplida';
  if (roca.bloqueada) return 'esperaALaVerde';
  const hora = minutosDeLaHora(roca.horaInicio);
  return hora !== null && hora < ahoraMin ? 'sePaso' : 'pendiente';
}

/** `HH:mm:ss` → `HH:mm`, o `null` si la acción no tiene hora. */
export function horaCortaDeLaAccion(roca: Pick<RocaDiariaApi, 'horaInicio'>): string | null {
  return minutosDeLaHora(roca.horaInicio) === null ? null : (roca.horaInicio as string).slice(0, 5);
}

/** Por hora; las que no tienen hora, al final; a igual hora, por su posición (la verde primero). */
export function ordenarAcciones(rocas: readonly RocaDiariaApi[]): RocaDiariaApi[] {
  return [...rocas].sort(
    (a, b) =>
      (minutosDeLaHora(a.horaInicio) ?? Infinity) - (minutosDeLaHora(b.horaInicio) ?? Infinity) || a.posicion - b.posicion,
  );
}

export interface AccionConEstado {
  accion: RocaDiariaApi;
  estado: EstadoDeLaAccion;
}

export interface FilaDelEje {
  eje: EjeObjetivo;
  /** «Negocio», «Cuerpo», «Relaciones». */
  nombre: string;
  /** Todas las acciones de hoy de este eje, en orden de hora. */
  acciones: AccionConEstado[];
  cumplidas: number;
  total: number;
  /** La que sigue, o `null` si todas están cumplidas. */
  sigue: AccionConEstado | null;
}

/**
 * La que sigue en un eje: la primera sin cumplir en orden de hora. Una que espera a la verde no es «la que sigue» mientras haya
 * otra que se pueda hacer; la verde nunca está bloqueada, así que en la práctica siempre la hay.
 */
export function queSigue(acciones: readonly AccionConEstado[]): AccionConEstado | null {
  const sinCumplir = acciones.filter(a => a.estado !== 'cumplida');
  return sinCumplir.find(a => a.estado !== 'esperaALaVerde') ?? sinCumplir[0] ?? null;
}

/**
 * La acción que sigue hoy, de TODAS las de la persona (no por eje): con la misma regla de `queSigue`, la primera sin cumplir en
 * orden de hora, sin contar las que esperan a la verde. `null` = no queda ninguna (o no hay ninguna): quien llama distingue los
 * dos casos mirando si la lista venía vacía. La usa la tarjeta de Hoy (2026-10-31).
 */
export function accionQueSigueHoy(rocas: readonly RocaDiariaApi[], ahoraMin: number): AccionConEstado | null {
  return queSigue(ordenarAcciones(rocas).map(accion => ({ accion, estado: estadoDeLaAccion(accion, ahoraMin) })));
}

/**
 * La hora de una acción para la tarjeta de Hoy: «09:00 – 09:45» si tiene inicio y fin, «09:00» si solo tiene inicio y
 * «Sin hora» si no se agendó a una hora. El fin se ignora si no es posterior al inicio (un dato roto no se dibuja).
 */
export function rangoDeHoraDeLaAccion(roca: Pick<RocaDiariaApi, 'horaInicio' | 'horaFin'>): string {
  const inicio = horaCortaDeLaAccion(roca);
  if (inicio === null) return 'Sin hora';
  const finMin = minutosDeLaHora(roca.horaFin);
  const inicioMin = minutosDeLaHora(roca.horaInicio);
  if (finMin !== null && inicioMin !== null && finMin > inicioMin) return `${inicio} – ${(roca.horaFin as string).slice(0, 5)}`;
  return inicio;
}

/**
 * Una fila por eje que tenga acciones hoy, en el orden en que se pasan los ejes (`ejesEnOrden`: el principal primero, como las
 * prioridades de Plan). Un eje sin acciones hoy no tiene fila.
 */
export function filasPorEje(
  rocas: readonly RocaDiariaApi[],
  ejesEnOrden: readonly EjeObjetivo[],
  ahoraMin: number,
): FilaDelEje[] {
  const filas: FilaDelEje[] = [];
  for (const eje of ejesEnOrden) {
    const acciones = ordenarAcciones(rocas.filter(r => r.eje === eje)).map(accion => ({
      accion,
      estado: estadoDeLaAccion(accion, ahoraMin),
    }));
    if (acciones.length === 0) continue;
    filas.push({
      eje,
      nombre: ETIQUETA_CORTA_EJE[eje],
      acciones,
      cumplidas: acciones.filter(a => a.estado === 'cumplida').length,
      total: acciones.length,
      sigue: queSigue(acciones),
    });
  }
  return filas;
}

/** `n de m`, el avance de una fila o de todas. */
export function textoDelAvance(cumplidas: number, total: number): string {
  return `${cumplidas} de ${total}`;
}

/** La línea de una fila: «Sigue: Enviar 3 propuestas · 16:00», «Se te pasó: Llamar a mi hijo» o «Todo cumplido». */
export function fraseDeLaFila(fila: Pick<FilaDelEje, 'sigue'>): string {
  const s = fila.sigue;
  if (!s) return 'Todo cumplido';
  if (s.estado === 'sePaso') return `Se te pasó: ${s.accion.titulo}`;
  const hora = horaCortaDeLaAccion(s.accion);
  return `Sigue: ${s.accion.titulo}${hora ? ` · ${hora}` : ''}`;
}

/** Lo que dice cada acción en la hoja de su eje, junto a su símbolo. `cumplidaA` es la hora local de `completadaEn`. */
export function textoDelEstado(estado: EstadoDeLaAccion, cumplidaA: string | null): string {
  switch (estado) {
    case 'cumplida':
      return cumplidaA ? `Cumplida ${cumplidaA}` : 'Cumplida';
    case 'esperaALaVerde':
      return 'Se abre al completar la primera';
    case 'sePaso':
      // Lo mismo que Training (pedido del dueño, 29/10): no se habla de puntos ni se alarma; se invita a cumplir.
      return 'Se te pasó la hora · todavía puedes cumplir tu compromiso';
    case 'pendiente':
      return 'Pendiente';
  }
}

const NOMBRE_DEL_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * El subtítulo de la tarjeta: «Jueves 29 · día 20 de 90». `fechaIso` es `yyyy-MM-dd` (una fecha de calendario: se lee con
 * UTC a mano para que el huso del teléfono no corra el día). Lo que no se sabe no se inventa: sin día de programa queda
 * solo «Jueves 29», y sin fecha, solo «Día 20 de 90».
 */
export function subtituloDelDia(fechaIso: string | null, diaPrograma: number | null, diasDelPrograma = 90): string {
  const fecha = fechaIso ? new Date(`${fechaIso}T00:00:00Z`) : null;
  const dia = fecha && !Number.isNaN(fecha.getTime()) ? `${NOMBRE_DEL_DIA[fecha.getUTCDay()]} ${fecha.getUTCDate()}` : null;
  const programa = diaPrograma !== null && diaPrograma > 0 ? `día ${diaPrograma} de ${diasDelPrograma}` : null;
  if (dia && programa) return `${dia} · ${programa}`;
  if (dia) return dia;
  return programa ? programa.replace(/^d/, 'D') : '';
}

/** Lo que oye el lector de pantalla al llegar a una fila. */
export function etiquetaDeLaFila(fila: FilaDelEje): string {
  return `${fila.nombre}, ${textoDelAvance(fila.cumplidas, fila.total)} cumplidas. ${fraseDeLaFila(fila)}. Abre sus acciones`;
}
