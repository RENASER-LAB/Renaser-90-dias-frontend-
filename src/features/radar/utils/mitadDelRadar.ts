/**
 * La mitad del Radar de la tarjeta «Hábitos de hoy» de Hoy (spec 016, opción A «Lado a lado»): qué dice y qué hace al
 * tocarla, en cada caso. Lógica pura, sin React ni red: la prueba `__tests__/mitadDelRadar.test.ts` y la dibuja
 * `features/home/components/TarjetaHabitoYRadar`.
 *
 * Reemplaza a la tarjeta aparte del Código Renaser de los días 1 a 7 (`TarjetaCodigoRenaser`, ya borrada) y suma lo que
 * la spec 012 dejaba fuera de Hoy: **desde el día 8 también hay mitad** (decisión del dueño del 2026-10-29).
 *
 * | Cuándo | Qué dice | Al tocarla |
 * | --- | --- | --- |
 * | Días 1 a 7, hora pendiente | Código Renaser · HH:00 · Innegociable | el formulario de siempre (`RadarContext`) |
 * | Días 1 a 7, hora registrada | … · Registrado | `resumen`: lo respondido y cuándo es el siguiente |
 * | Día 8 o más, Mi Radar apagado | Planifica tu Radar | `yo`: Yo → Mi Radar |
 * | Encendido, una hora elegida pendiente | Tu hora | `formulario`, que se puede cerrar |
 * | Encendido, sin hora pendiente ahora | Próxima a las HH:00 · 05:30 a 22:30 · 17 veces | `horas`: «Tu Radar de hoy» |
 * | Encendido, hoy sin Radar | Hoy no tienes Mi Radar | `yo` |
 * | Sin Día 1, backend sin Mi Radar, o aún sin saber | nada (`null`) | — |
 *
 * **Mientras no se sabe, no se dibuja** (la misma regla del 2026-10-19 para el parpadeo del formulario): sin lectura de
 * la hora en curso, de Mi Radar o de lo respondido hoy, la mitad no existe. Decir «Tu hora» sin saber si ya se respondió
 * es el error que ya costó arreglar.
 *
 * Las reglas de las horas y de «hoy» no se repiten acá: salen de `miRadar.ts` (`horasDelDia`, `resumenDeMiRadarHoy`), las
 * mismas que usa Yo → Mi Radar.
 */
import type { IconName } from '../../../components/Icon';
import { horaLocalDelRegistro } from '../../mentor/utils/agruparRegistrosRadar';
import { CONFIG_RADAR } from '../config/configRadar';
import type { LecturaDeMiRadar } from '../hooks/useConfigDeMiRadar';
import type { MiRadarApi, RegistroRadarApi } from '../types/radar.types';
import {
  HOY_SIN_RADAR,
  diaDeHoyDeMiRadar,
  mismoDia,
  miRadarCorresponde,
  resumenDeMiRadarHoy,
  textoDeLasVeces,
  textoDelHorario,
} from './miRadar';
import { envioEnElMismoSlot, horaEnPunto, type EstadoRadar } from './slotsDelRadar';

/** Qué hace tocar la mitad. `ninguna` = no es un botón. */
export type AccionDeLaMitad = 'formulario' | 'resumen' | 'horas' | 'yo' | 'ninguna';

export interface MitadDelRadar {
  /** El rótulo: `Código Renaser` los días 1 a 7, `Mi Radar` desde el día 8. */
  nombre: 'Código Renaser' | 'Mi Radar';
  /** `HH:00` de la hora de que se habla, o `null` si no es de una hora. */
  hora: string | null;
  /** El estado en una palabra: `Innegociable`, `Registrado`, `Tu hora`, `Apagado`… */
  estado: string;
  tono: 'dorado' | 'ok' | 'suave';
  icono: Extract<IconName, 'compass' | 'checkCircle' | 'clock'>;
  titulo: string | null;
  /** Solo registrada: cuándo es el siguiente («El siguiente a las 14:00.»), para repetirlo en la hoja de lo respondido. */
  siguiente?: string;
  accion: AccionDeLaMitad;
  /** El fondo lavado de oro: lo que pide una respuesta ahora. */
  destacada: boolean;
}

export interface EntradaDeLaMitad {
  /** `diaPrograma` e `inscrito` de `GET /home`, los mismos de Hoy. */
  diaPrograma: number | null | undefined;
  inscrito: boolean | null | undefined;
  /** Los días 1 a 7: el estado de la hora en curso (`useRadarDelDia`). */
  estadoDelDia: EstadoRadar;
  /** `true` = este rol no puede cerrar el formulario (el aprendiz). Solo cambia el rótulo. */
  obligatorio: boolean;
  /** Cuenta atrás hasta que el formulario se abre solo. 0 = ya está en pantalla. */
  minutosParaAbrir: number;
  /** Desde el día 8: lo que se sabe de Mi Radar de esta cuenta. */
  miRadar: LecturaDeMiRadar;
  /** Lo respondido que ya se leyó (`GET /radar/history`); `null` = todavía no se sabe qué hora está respondida. */
  registros: readonly RegistroRadarApi[] | null;
  ahora: Date;
}

/** Lo que dice la mitad en voz alta para el lector de pantalla. */
export function etiquetaDeLaMitad(m: MitadDelRadar): string {
  // Lo que se ve (2026-10-31: la línea de detalle se quitó de la tarjeta de Hoy): el rótulo, la hora, el estado y el título.
  return `${m.nombre}${m.hora ? ` ${m.hora}` : ''}, ${m.estado}${m.titulo ? `. ${m.titulo}` : ''}`;
}

const PREGUNTA = '¿Dónde estás ahora mismo?';

export function mitadDelRadar(e: EntradaDeLaMitad): MitadDelRadar | null {
  const dia = e.diaPrograma;
  // Sin Día 1 (sin inscripción o con el programa sin arrancar) no hay Radar de ninguna clase.
  if (!e.inscrito || dia == null || dia < CONFIG_RADAR.primerDia) return null;
  if (dia <= CONFIG_RADAR.ultimoDia) return deLosPrimerosSieteDias(e);
  if (miRadarCorresponde(dia)) return desdeElDiaOcho(e);
  return null;
}

/** Los días 1 a 7: el Código Renaser de siempre, con el estado que ya calculaba `useRadarDelDia`. */
function deLosPrimerosSieteDias(e: EntradaDeLaMitad): MitadDelRadar | null {
  const estado = e.estadoDelDia;
  switch (estado.tipo) {
    // `cargando`: todavía no se sabe si esta hora ya se respondió. `apagado`: ni el día ni el interruptor lo piden.
    case 'apagado':
    case 'cargando':
      return null;
    case 'fuera-de-ventana':
      // Pasado el último registro del día no se dibuja nada: recordarle a las 23:00 algo que ya no puede hacer es ruido.
      if (estado.proximaHora === null) return null;
      return {
        nombre: 'Código Renaser',
        hora: null,
        estado: 'En espera',
        tono: 'suave',
        icono: 'clock',
        titulo: null,
        accion: 'ninguna',
        destacada: false,
      };
    case 'respondido': {
      const siguiente =
        estado.proximaHora !== null ? `El siguiente a las ${horaEnPunto(estado.proximaHora)}.` : 'Era el último registro del día.';
      return {
        nombre: 'Código Renaser',
        hora: estado.slot.etiqueta,
        estado: 'Registrado',
        tono: 'ok',
        icono: 'checkCircle',
        titulo: null,
        siguiente,
        accion: 'resumen',
        destacada: false,
      };
    }
    case 'abierto': {
      const queda = estado.minutosParaCerrar <= 15 ? ` · quedan ${estado.minutosParaCerrar} min` : '';
      return {
        nombre: 'Código Renaser',
        hora: estado.slot.etiqueta,
        estado: e.obligatorio ? 'Innegociable' : 'Abierto',
        tono: 'dorado',
        icono: 'compass',
        titulo: PREGUNTA,
        accion: 'formulario',
        destacada: true,
      };
    }
  }
}

/** Desde el día 8: Mi Radar, que la persona enciende y configura en Yo. */
function desdeElDiaOcho(e: EntradaDeLaMitad): MitadDelRadar | null {
  // `pendiente` (leyendo), `no-disponible` (backend sin Mi Radar: 404 o 403) y `fallo` (sin red): ninguna de las tres
  // sabe qué decir, y mandar a una pantalla que tampoco carga no ayuda.
  if (e.miRadar.estado !== 'lista') return null;
  const config = e.miRadar.config;

  if (!config.encendido) {
    return {
      nombre: 'Mi Radar',
      hora: null,
      estado: 'Apagado',
      tono: 'suave',
      icono: 'compass',
      titulo: 'Planifica tu Radar',
      accion: 'yo',
      destacada: false,
    };
  }

  // Encendido: lo que sigue depende de qué hora de hoy ya se respondió.
  if (e.registros === null) return null;
  const hoy = resumenDeMiRadarHoy(config, e.registros, e.ahora);
  const hora = e.ahora.getHours();

  if (!hoy.hoyTieneRadar) {
    return {
      nombre: 'Mi Radar',
      hora: null,
      estado: 'Encendido',
      tono: 'suave',
      icono: 'compass',
      titulo: HOY_SIN_RADAR,
      accion: 'yo',
      destacada: false,
    };
  }

  const siguiente = hoy.horasDeHoy.find(h => h > hora) ?? null;

  if (hoy.horaEnCursoPendiente) {
    return {
      nombre: 'Mi Radar',
      hora: horaEnPunto(hora),
      estado: 'Tu hora',
      tono: 'dorado',
      icono: 'compass',
      titulo: PREGUNTA,
      accion: 'formulario',
      destacada: true,
    };
  }

  if (hoy.horasDeHoy.includes(hora) && hoy.yaRegistroEstaHora) {
    const cuando = siguiente !== null ? `La siguiente a las ${horaEnPunto(siguiente)}.` : 'No quedan más horas hoy.';
    return {
      nombre: 'Mi Radar',
      hora: horaEnPunto(hora),
      estado: 'Registrado',
      tono: 'ok',
      icono: 'checkCircle',
      titulo: null,
      siguiente: cuando,
      accion: 'resumen',
      destacada: false,
    };
  }

  return {
    nombre: 'Mi Radar',
    hora: null,
    estado: 'Encendido',
    tono: 'suave',
    icono: 'compass',
    titulo: siguiente !== null ? `Próxima a las ${horaEnPunto(siguiente)}` : 'No quedan más horas hoy',
    accion: 'horas',
    destacada: false,
  };
}

/**
 * Lo que dice Mi Radar de HOY en una línea: `05:30 a 22:30 · 17 veces` (el Despertar, el Dormir y cuántas veces pregunta), o
 * `null` si esta lectura no trae el día de hoy o hoy no tiene Radar.
 */
export function resumenDelDiaDeHoy(config: MiRadarApi, ahora: Date): string | null {
  const dia = diaDeHoyDeMiRadar(config, ahora);
  const horario = dia ? textoDelHorario(dia) : null;
  return dia && horario && dia.veces > 0 ? `${horario} · ${textoDeLasVeces(dia.veces)}` : null;
}

// ---------------------------------------------------------------------------------------------------------------
// «Tu Radar de hoy»: las horas de hoy con su estado
// ---------------------------------------------------------------------------------------------------------------

/**
 * Una hora elegida de hoy:
 *  - `respondida`: tiene registro (`respondidaA` dice a qué hora se respondió);
 *  - `sin-registro`: ya pasó sin respuesta (a secas, sin palabras de falta ni de culpa, como en Yo → Mi Radar);
 *  - `ahora`: es la hora en curso y falta responder;
 *  - `prevista`: todavía no llega.
 */
export interface FilaDeHoraDeHoy {
  hora: number;
  etiqueta: string;
  estado: 'respondida' | 'sin-registro' | 'ahora' | 'prevista';
  respondidaA: string | null;
}

/**
 * Las horas elegidas de HOY (`horasDelDia`) con su estado, en orden de hora. Un registro responde a una hora elegida por su
 * `horaPrevista` (la calcula el servidor al registrar), como en «Hoy» de Yo → Mi Radar; en la hora en curso, además, vale
 * cualquier registro de esa hora.
 */
export function filasDeLasHorasDeHoy(
  horasDeHoy: readonly number[],
  registros: readonly RegistroRadarApi[],
  ahora: Date,
): FilaDeHoraDeHoy[] {
  const deHoy = registros.filter(r => {
    const cuando = new Date(r.createdAt);
    return !Number.isNaN(cuando.getTime()) && mismoDia(cuando, ahora);
  });
  const horaEnCurso = ahora.getHours();
  return [...horasDeHoy]
    .sort((a, b) => a - b)
    .map((hora): FilaDeHoraDeHoy => {
      const registro =
        deHoy.find(r => r.horaPrevista === hora) ??
        (hora === horaEnCurso ? deHoy.find(r => envioEnElMismoSlot(r.createdAt, ahora)) : undefined);
      const base = { hora, etiqueta: horaEnPunto(hora) };
      if (registro) return { ...base, estado: 'respondida', respondidaA: horaLocalDelRegistro(registro.createdAt) };
      if (hora < horaEnCurso) return { ...base, estado: 'sin-registro', respondidaA: null };
      return { ...base, estado: hora === horaEnCurso ? 'ahora' : 'prevista', respondidaA: null };
    });
}

/** Lo que dice cada fila de «Tu Radar de hoy». */
export function textoDeLaFilaDeHoy(fila: FilaDeHoraDeHoy): string {
  switch (fila.estado) {
    case 'respondida':
      return fila.respondidaA ? `Respondida ${fila.respondidaA}` : 'Respondida';
    case 'sin-registro':
      return 'Sin registro';
    case 'ahora':
      return 'Es tu hora';
    case 'prevista':
      return 'Prevista';
  }
}

/** El registro de la hora en curso (el que muestra la hoja «Ya lo registraste»), o `null` si no se encontró. */
export function registroDeEstaHora(registros: readonly RegistroRadarApi[], ahora: Date): RegistroRadarApi | null {
  return registros.find(r => envioEnElMismoSlot(r.createdAt, ahora)) ?? null;
}
