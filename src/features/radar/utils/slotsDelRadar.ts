/**
 * Qué slot del Código Renaser está abierto ahora, y si ya se respondió.
 *
 * Decisión pura: recibe el día de programa, el instante del último envío y el reloj, y devuelve
 * qué mostrar. No importa nada de la app ni llama a ningún servicio, así que se puede razonar
 * —y más adelante probar— sin montar una pantalla.
 *
 * La regla de fondo está explicada en `config/configRadar.ts`: **un solo slot abierto a la vez,
 * el de la hora en curso, y los que pasaron no se acumulan**.
 *
 * ## Zona horaria
 *
 * Todo se compara en la zona del DISPOSITIVO. Es lo correcto acá: los slots son "las 10 en
 * punto" para la persona que mira el reloj, no un instante UTC. `creadoEn` llega del backend
 * como `Instant` (UTC) y `new Date(iso)` lo convierte a local antes de comparar, así que una
 * respuesta hecha a las 10:30 locales cae en el slot de las 10 aunque el servidor la haya
 * guardado como 15:30Z.
 */
import { CONFIG_RADAR, type ConfigRadar } from '../config/configRadar';

export interface SlotRadar {
  /** Hora en punto en que abre, 0..23. */
  hora: number;
  /** `HH:00`, para mostrar. */
  etiqueta: string;
  /** `HH:00` de la hora siguiente — cuándo se cierra. */
  cierraA: string;
}

export type EstadoRadar =
  /** No corresponde mostrarlo. `motivo` dice por qué, para poder decirlo si hace falta. */
  | { tipo: 'apagado'; motivo: 'desactivado' | 'programa-sin-arrancar' | 'etapa-terminada' }
  /** Es un día con Código Renaser, pero esta hora no tiene slot. */
  | { tipo: 'fuera-de-ventana'; proximaHora: number | null }
  /** Hay que responderlo ahora. */
  | { tipo: 'abierto'; slot: SlotRadar; minutosParaCerrar: number }
  /** Ya respondido EN ESTA HORA. */
  | { tipo: 'respondido'; slot: SlotRadar; proximaHora: number | null };

/** `8` → `'08:00'`. Envuelve a 00 después de las 23, que es lo que hace un reloj. */
export function horaEnPunto(hora: number): string {
  return `${String(((hora % 24) + 24) % 24).padStart(2, '0')}:00`;
}

/** Las horas en punto que tienen slot, en orden. Con la config de fábrica: 8, 9, … 19. */
export function horasConSlot(cfg: ConfigRadar = CONFIG_RADAR): number[] {
  return Array.from({ length: cfg.slotsPorDia }, (_, i) => (cfg.horaDelPrimerSlot + i) % 24);
}

/** La próxima hora con slot DE HOY, o `null` si ya pasaron todas. */
export function proximaHoraConSlot(ahora: Date, cfg: ConfigRadar = CONFIG_RADAR): number | null {
  const siguientes = horasConSlot(cfg).filter(h => h > ahora.getHours());
  return siguientes.length > 0 ? siguientes[0] : null;
}

/**
 * ¿Ese envío cae en la MISMA hora que este momento?
 *
 * Acá vive la regla de "no se acumulan": un envío sólo cuenta para la hora en que se hizo. Al
 * cambiar la hora, el slot anterior deja de estar respondido y el nuevo nace vacío — pero el
 * anterior tampoco queda debiendo, porque nadie lo vuelve a mirar.
 */
export function envioEnElMismoSlot(envioIso: string | null | undefined, ahora: Date): boolean {
  if (!envioIso) return false;
  const envio = new Date(envioIso);
  if (Number.isNaN(envio.getTime())) return false;
  return (
    envio.getFullYear() === ahora.getFullYear() &&
    envio.getMonth() === ahora.getMonth() &&
    envio.getDate() === ahora.getDate() &&
    envio.getHours() === ahora.getHours()
  );
}

export function estadoDelRadar(params: {
  /** `diaPrograma` de `GET /api/v1/home`: 0 = inscrito pero sin arrancar. */
  diaPrograma: number;
  /** `creadoEn` del último registro (`GET /api/v1/radar/latest`), o `null` si no hay ninguno. */
  ultimoEnvioIso: string | null;
  /**
   * Marca puesta por ESTE dispositivo al confirmar un envío, con su propio reloj.
   *
   * Existe por un caso que deja a la persona encerrada: el registro se da por hecho comparando
   * la hora del servidor con la del teléfono, y si los dos relojes difieren en una hora o más
   * —teléfono con la zona mal puesta, hora manual— esa comparación no coincide NUNCA. Para un
   * aprendiz, que no puede cerrar el formulario, eso es un bucle sin salida: envía, el
   * formulario sigue ahí, vuelve a enviar, y de paso llena la tabla de registros repetidos.
   *
   * Con esta segunda marca alcanza con que UNA de las dos caiga en el slot en curso. La del
   * servidor sigue siendo la que manda para lo que se guarda; ésta sólo decide si hay que
   * seguir pidiéndolo en pantalla.
   */
  envioLocalIso?: string | null;
  ahora: Date;
  cfg?: ConfigRadar;
}): EstadoRadar {
  const { diaPrograma, ultimoEnvioIso, envioLocalIso = null, ahora, cfg = CONFIG_RADAR } = params;

  if (!cfg.activo) return { tipo: 'apagado', motivo: 'desactivado' };
  if (diaPrograma < cfg.primerDia) return { tipo: 'apagado', motivo: 'programa-sin-arrancar' };
  // El día 8 en adelante. Mismo corte que el traslado fuera del grupo de bienvenida.
  if (diaPrograma > cfg.ultimoDia) return { tipo: 'apagado', motivo: 'etapa-terminada' };

  const hora = ahora.getHours();
  if (!horasConSlot(cfg).includes(hora)) {
    return { tipo: 'fuera-de-ventana', proximaHora: proximaHoraConSlot(ahora, cfg) };
  }

  const slot: SlotRadar = {
    hora,
    etiqueta: horaEnPunto(hora),
    cierraA: horaEnPunto(hora + 1),
  };

  if (envioEnElMismoSlot(ultimoEnvioIso, ahora) || envioEnElMismoSlot(envioLocalIso, ahora)) {
    return { tipo: 'respondido', slot, proximaHora: proximaHoraConSlot(ahora, cfg) };
  }

  return { tipo: 'abierto', slot, minutosParaCerrar: 60 - ahora.getMinutes() };
}
