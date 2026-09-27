import type { Ocurrencia, ReglaDeAviso } from '../types/eventos.types';
import { fechaEnZona, instanteEnZona } from './zonaHoraria';

/**
 * Cuándo suena la alarma local de un evento al que la persona dijo «Voy» (E-7). Funciones puras: se
 * prueban sin teléfono.
 *
 * ## Por qué hace falta la alarma local
 *
 * El backend **apaga sus propios avisos** de esa fecha para quien responde «Voy»
 * (`ConfirmacionService`, `cancelarPorAsistencia`): el diseño heredado es que desde ahí avisa el
 * teléfono. Sin esta alarma, quien dice «Voy» se queda sin ningún recordatorio.
 *
 * ## De dónde salen las horas
 *
 * Las mismas reglas que usaría el servidor (`CalculadoraRecordatorios`):
 * - `minutosAntes` / `diasAntes`: se restan del inicio;
 * - `horaDelDia`: esa hora, el mismo día del evento **en la zona del evento**.
 *
 * Si el evento trae reglas propias, esas. Si no (el backend no manda las de por defecto), las del
 * tipo — copiadas de `ReglasPorTipoEvento` del backend, la única fuente. Si el tipo es nuevo, 10
 * minutos antes, que es el aviso que comparten hoy todos los tipos salvo la Semana de Manifestación.
 * > Si el backend empieza a mandar las reglas efectivas siempre, esta tabla sobra y se borra.
 */
export const AVISOS_POR_TIPO: Readonly<Record<string, readonly ReglaDeAviso[]>> = {
  MENTORIA_ALQUIMISTA: [{ tipo: 'minutosAntes', minutos: 10 }],
  ESPONTANEO: [
    { tipo: 'horaDelDia', hora: '06:00' },
    { tipo: 'minutosAntes', minutos: 10 },
  ],
  SEMANA_MANIFESTACION: [
    { tipo: 'diasAntes', dias: 1 },
    { tipo: 'horaDelDia', hora: '04:50' },
  ],
  SESION_ESPECIAL: [
    { tipo: 'horaDelDia', hora: '06:00' },
    { tipo: 'minutosAntes', minutos: 10 },
  ],
};

const AVISO_DE_RESPALDO: readonly ReglaDeAviso[] = [{ tipo: 'minutosAntes', minutos: 10 }];

export function reglasEfectivas(oc: Ocurrencia): readonly ReglaDeAviso[] {
  if (oc.evento.reglasDeAviso && oc.evento.reglasDeAviso.length > 0) return oc.evento.reglasDeAviso;
  return (oc.evento.tipoEvento && AVISOS_POR_TIPO[oc.evento.tipoEvento]) || AVISO_DE_RESPALDO;
}

/** Los instantes (ms) en que tiene que sonar, solo los futuros, sin repetidos y en orden. */
export function instantesDeAviso(oc: Ocurrencia, ahoraMs: number): number[] {
  const inicio = Date.parse(oc.iniciaEn);
  if (!Number.isFinite(inicio)) return [];
  const zona = oc.evento.zona;
  const instantes = new Set<number>();
  for (const regla of reglasEfectivas(oc)) {
    let cuando: number | null = null;
    if (regla.tipo === 'minutosAntes') cuando = inicio - regla.minutos * 60_000;
    else if (regla.tipo === 'diasAntes') cuando = inicio - regla.dias * 86_400_000;
    else cuando = instanteEnZona(fechaEnZona(inicio, zona), regla.hora, zona);
    if (cuando !== null && cuando > ahoraMs) instantes.add(cuando);
  }
  return [...instantes].sort((a, b) => a - b);
}

/** Cómo se identifica la alarma de UNA fecha de un evento. */
export function claveDeOcurrencia(eventoId: string, inicioOcurrencia: string): string {
  return `${eventoId}|${inicioOcurrencia}`;
}

/** Lo que el teléfono recuerda de cada alarma de evento programada. */
export interface AlarmaGuardada {
  ids: string[];
  /** Cuándo empieza la ocurrencia (ISO), para olvidarla cuando ya pasó. */
  iniciaEn: string;
}

/**
 * Qué hacer para que las alarmas del teléfono coincidan con lo que dice el servidor.
 *
 * - Se **cancela** la alarma de una ocurrencia que ya empezó, de una que cae dentro de la ventana que
 *   se leyó y ya no está (el evento se canceló o se borró), o de una a la que ya no se va (respondió
 *   «No voy» en otro teléfono, o en la web). Con las alarmas apagadas se cancelan todas.
 * - Se **programa** la de cada ocurrencia con «Voy» que todavía no tenga una (por ejemplo, respondió
 *   desde la web o reinstaló la app).
 *
 * Una alarma guardada FUERA de la ventana leída no se toca: que no esté en la lista no dice nada.
 */
export function planDeSincronizacion(params: {
  guardadas: Record<string, AlarmaGuardada>;
  ocurrencias: Ocurrencia[];
  ventana: { desdeMs: number; hastaMs: number };
  ahoraMs: number;
  activas: boolean;
}): { cancelar: string[]; programar: Ocurrencia[] } {
  const { guardadas, ocurrencias, ventana, ahoraMs, activas } = params;
  const vigentes = new Map<string, Ocurrencia>();
  for (const oc of ocurrencias) vigentes.set(claveDeOcurrencia(oc.evento.id, oc.inicioOcurrencia), oc);

  const cancelar: string[] = [];
  for (const [clave, alarma] of Object.entries(guardadas)) {
    const inicio = Date.parse(alarma.iniciaEn);
    const yaEmpezo = Number.isFinite(inicio) && inicio <= ahoraMs;
    const dentroDeLaVentana = Number.isFinite(inicio) && inicio >= ventana.desdeMs && inicio <= ventana.hastaMs;
    const oc = vigentes.get(clave);
    const noVa = oc !== undefined && oc.asistencia !== 'GOING';
    const desaparecio = dentroDeLaVentana && oc === undefined;
    if (!activas || yaEmpezo || noVa || desaparecio) cancelar.push(clave);
  }

  const programar = activas
    ? ocurrencias.filter(
        oc =>
          oc.asistencia === 'GOING' &&
          guardadas[claveDeOcurrencia(oc.evento.id, oc.inicioOcurrencia)] === undefined &&
          instantesDeAviso(oc, ahoraMs).length > 0,
      )
    : [];
  return { cancelar, programar };
}

/** El texto de la alarma, en palabras simples. */
export function textoDeLaAlarma(oc: Ocurrencia, cuandoMs: number): { titulo: string; cuerpo: string } {
  const inicio = Date.parse(oc.iniciaEn);
  const minutos = Math.round((inicio - cuandoMs) / 60_000);
  let cuerpo: string;
  if (minutos <= 0) cuerpo = 'Empieza ahora.';
  else if (minutos < 60) cuerpo = `Empieza en ${minutos} min.`;
  else if (minutos < 24 * 60) cuerpo = 'Es hoy.';
  else cuerpo = 'Es mañana.';
  return { titulo: oc.titulo, cuerpo: `${cuerpo} Toca para ver el detalle.` };
}
