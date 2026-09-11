/**
 * Cuál de los hábitos de hoy le toca AHORA a la persona.
 *
 * ## Por qué existe (2026-09-11)
 *
 * La primera tarjeta de Hoy decía siempre lo mismo — *"Lidera tu energía diaria"* y el contador
 * `0/16` — con dos problemas que el dueño reportó como uno: la frase no cambia nunca, así que
 * deja de leerse a los dos días, y el contador dice CUÁNTO falta pero no QUÉ. Alguien que abre
 * la app a las 13:00 con 16 hábitos pendientes no necesita saber que son 16; necesita saber cuál
 * es el de esta hora.
 *
 * ## La regla
 *
 * Un solo hábito en pantalla, elegido por el reloj:
 *
 *  - **`ahora`** — el pendiente cuya hora de disparo ya pasó y es la MÁS CERCANA a este momento.
 *    Es "lo que te toca": si a las 13:00 hay uno de las 06:00 y otro de las 12:30 sin cerrar, el
 *    de las 12:30 gana. El de las 06:00 sigue estando en Training, pero no es lo que la persona
 *    tiene entre manos.
 *  - **`proximo`** — cuando ninguno arrancó todavía (típico de la madrugada): el siguiente.
 *  - **`todo-hecho`** — no queda ninguno accionable y el día tenía hábitos.
 *  - **`sin-datos`** — el backend no devolvió tracks. Día 0, cuenta recién aprobada, o un fallo:
 *    la pantalla vuelve al texto genérico de siempre en vez de inventar un hábito.
 *
 * **Accionable NO es "no terminal".** `EXPIRADO` cuenta como accionable a propósito: el backend
 * dejó que un hábito vencido se pueda completar igual (`EstadoRegistro`, "registrar tarde es
 * información"), y ocultarlo acá sería contradecir esa decisión desde la pantalla. `FALLIDO`
 * queda fuera: lo escribe el barrido nocturno cuando el día ya CERRÓ, y no se puede hacer nada
 * con él.
 *
 * Este archivo no importa nada de la app salvo `aMinutos`, que ya existía — mismo criterio que
 * `momentosDelDia.ts`: es una decisión pura sobre datos, y se puede razonar sin montar nada.
 */
import type { TrackDelDiaApi } from '../types/habits.types';
import { aMinutos } from './momentosDelDia';

/** Estados de `EstadoRegistro` (backend) que ya no admiten acción de la persona. */
const SIN_ACCION_POSIBLE = new Set(['COMPLETADO', 'FALLIDO']);

export type EstadoHabitoDelMomento = 'ahora' | 'proximo' | 'todo-hecho' | 'sin-datos';

export interface HabitoDelMomento {
  estado: EstadoHabitoDelMomento;
  /** Título del hábito elegido. `null` en `todo-hecho` y `sin-datos`. */
  titulo: string | null;
  /** `HH:mm` de su hora de disparo, o `null` si ese hábito no tiene hora. */
  hora: string | null;
  /** Id del registro del día, para poder abrirlo desde la tarjeta. */
  registroId: string | null;
  /** Cuántos quedan accionables, contando el elegido. */
  pendientes: number;
}

/** Minutos desde medianoche de una fecha, en la zona del dispositivo. */
function minutosDelDia(momento: Date): number {
  return momento.getHours() * 60 + momento.getMinutes();
}

export function habitoDelMomento(
  tracks: readonly TrackDelDiaApi[],
  ahora: Date = new Date(),
): HabitoDelMomento {
  const vacio: HabitoDelMomento = {
    estado: 'sin-datos',
    titulo: null,
    hora: null,
    registroId: null,
    pendientes: 0,
  };
  if (tracks.length === 0) return vacio;

  const accionables = tracks.filter(t => !SIN_ACCION_POSIBLE.has(t.estado));
  if (accionables.length === 0) {
    return { ...vacio, estado: 'todo-hecho' };
  }

  const minutosAhora = minutosDelDia(ahora);
  // `horaDisparo` es el campo resuelto del backend; `triggerTime` es el alias que manda alguna
  // versión. Se miran los dos para no depender de cuál llegó.
  const conHora = accionables
    .map(t => ({ track: t, minutos: aMinutos(t.horaDisparo ?? t.triggerTime ?? null) }))
    .filter((x): x is { track: TrackDelDiaApi; minutos: number } => x.minutos !== null);

  const elegido = (track: TrackDelDiaApi, estado: EstadoHabitoDelMomento): HabitoDelMomento => ({
    estado,
    titulo: track.tituloHabito,
    hora: (track.horaDisparo ?? track.triggerTime ?? '').slice(0, 5) || null,
    registroId: track.id,
    pendientes: accionables.length,
  });

  // Ya llegó su hora: gana el MÁS RECIENTE, no el más viejo. El más viejo es el que la persona
  // ya dejó pasar; el más reciente es el que tiene delante.
  //
  // El desempate es POR ORDEN DE LLEGADA, y no da igual: con `>=` ganaba el último del arreglo,
  // así que dos hábitos a la misma hora hacían que la tarjeta mostrara uno u otro según cómo
  // viniera la lista. `>` conserva el primero, que es el orden curado del catálogo
  // (`habitos.orden`) — el mismo criterio de "ante empate, siempre el mismo" que el backend ya
  // aplica al elegir grupo (`PlanificadorDeTraslado`).
  const yaLlegaron = conHora.filter(x => x.minutos <= minutosAhora);
  if (yaLlegaron.length > 0) {
    const masCercano = yaLlegaron.reduce((a, b) => (b.minutos > a.minutos ? b : a));
    return elegido(masCercano.track, 'ahora');
  }

  // Ninguno arrancó todavía: el siguiente del día.
  if (conHora.length > 0) {
    const siguiente = conHora.reduce((a, b) => (b.minutos < a.minutos ? b : a));
    return elegido(siguiente.track, 'proximo');
  }

  // Quedan pendientes pero ninguno tiene hora: se muestra el primero como "ahora". Sin hora no
  // hay nada que ordenar, y dejar la tarjeta genérica sería esconder lo único que hay que hacer.
  return elegido(accionables[0], 'ahora');
}
