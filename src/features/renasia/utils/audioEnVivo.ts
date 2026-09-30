/** PCM de 16 bits mono a 16 kHz: 32 bytes por milisegundo. */
export const BYTES_POR_MS = 32;
/**
 * Después de que el orbe termina de sonar, el micrófono sigue en silencio este tiempo más: es la
 * cola del sonido que todavía rebota en la habitación.
 */
export const MARGEN_DE_ECO_MS = 400;
/**
 * Lo que tarda el parlante nativo en empezar a sonar desde silencio: con el parche de E-458 su búfer
 * es de 200 ms, y Android arranca a reproducir cuando lo llena.
 */
export const ARRANQUE_DEL_PARLANTE_MS = 200;
/** El micrófono se manda en lotes de ~100 ms (el módulo nativo lo entrega de a 32 ms). */
export const BYTES_POR_ENVIO = 100 * BYTES_POR_MS;

/**
 * Hasta cuándo suena lo que ya se le entregó al parlante nativo (E-238).
 *
 * El audio se le entrega **entero y enseguida**: el módulo lo encola y lo toca de corrido. Antes se
 * dosificaba desde JavaScript con un reloj 250 ms por delante, y cualquier demora de JavaScript
 * dejaba al parlante sin datos (`underrun` en el log de Android): se oía entrecortado.
 *
 * Con eso también decide si el micrófono se manda (**semidúplex**): mientras el orbe habla, y un
 * margen después, va silencio en vez del micrófono. Sin cancelación de eco efectiva (el emulador con
 * el micrófono de la laptop, o un teléfono barato) Gemini se oía a sí mismo, se interrumpía y se
 * contestaba en loop. Para cortarlo se toca el orbe.
 *
 * El tiempo entra por parámetro para poder probarlo sin relojes.
 */
export class Parlante {
  private suenaHastaMs = -Infinity;

  sonar(bytes: number, ahoraMs: number): void {
    const desde = this.suenaHastaMs > ahoraMs ? this.suenaHastaMs : ahoraMs + ARRANQUE_DEL_PARLANTE_MS;
    this.suenaHastaMs = desde + bytes / BYTES_POR_MS;
  }

  callar(ahoraMs: number): void {
    this.suenaHastaMs = ahoraMs;
  }

  estaSonando(ahoraMs: number): boolean {
    return this.suenaHastaMs > ahoraMs;
  }

  microfonoAbierto(ahoraMs: number): boolean {
    return ahoraMs >= this.suenaHastaMs + MARGEN_DE_ECO_MS;
  }
}

/** Junta los pedazos del micrófono hasta tener {@link BYTES_POR_ENVIO} y los entrega de una vez. */
export class LoteDeMicrofono {
  private partes: Uint8Array[] = [];
  private bytes = 0;

  /** El lote listo para mandar, o `null` si todavía falta. */
  agregar(pcm: Uint8Array): Uint8Array | null {
    this.partes.push(pcm);
    this.bytes += pcm.length;
    return this.bytes < BYTES_POR_ENVIO ? null : this.vaciar();
  }

  /**
   * Lo juntado hasta ahora aunque no complete un lote, o `null` si no hay nada. Al tocar «ya
   * terminé» (E-458) son las últimas sílabas: van antes del aviso, no se pierden.
   */
  vaciar(): Uint8Array | null {
    if (this.bytes === 0) return null;
    const lote = new Uint8Array(this.bytes);
    let desde = 0;
    for (const parte of this.partes) {
      lote.set(parte, desde);
      desde += parte.length;
    }
    this.descartar();
    return lote;
  }

  descartar(): void {
    this.partes = [];
    this.bytes = 0;
  }
}

/**
 * Lo que se dice mientras se abre la conversación (E-458). La persona toca el orbe y empieza a hablar
 * enseguida; abrir la sesión con Gemini tarda 2 a 4 s, y antes eso se perdía (el micrófono recién se
 * prendía con `listo`). Se guarda en lotes y se manda de una vez al quedar lista. Con tope: si la
 * apertura se cuelga, no se acumula audio sin fin.
 */
export const MICROFONO_PREVIO_MAX_MS = 15_000;

export class MicrofonoPrevio {
  private lotes: Uint8Array[] = [];
  private bytes = 0;

  guardar(lote: Uint8Array): void {
    if (this.bytes + lote.length > MICROFONO_PREVIO_MAX_MS * BYTES_POR_MS) return;
    this.lotes.push(lote);
    this.bytes += lote.length;
  }

  /** Lo guardado, en orden, y queda vacío. */
  vaciar(): Uint8Array[] {
    const lotes = this.lotes;
    this.lotes = [];
    this.bytes = 0;
    return lotes;
  }
}

/** Qué hace un toque al orbe con la conversación en vivo abierta (E-458). */
export type AccionDelToque = 'empezar' | 'finDeHabla' | 'callar' | 'nada';

/**
 * El toque ya no cierra la conversación (E-458): antes cada toque la cerraba, y como el rótulo
 * decía «toca de nuevo para terminar», se abría una sesión nueva por pregunta (2 a 4 s de conexión
 * cada vez, y el modelo sin lo hablado antes). Ahora:
 * - en reposo, abre;
 * - escuchando, «ya terminé»: el modelo contesta sin esperar 1,5 s de silencio;
 * - hablando, lo calla y sigue escuchando;
 * - pensando, nada.
 * Para cerrar: mantener presionado, salir de la app o quedarse callados un rato.
 */
export function accionDelToque(fase: 'reposo' | 'escuchando' | 'pensando' | 'hablando'): AccionDelToque {
  switch (fase) {
    case 'reposo':
      return 'empezar';
    case 'escuchando':
      return 'finDeHabla';
    case 'hablando':
      return 'callar';
    default:
      return 'nada';
  }
}

/**
 * Sin que nadie hable este tiempo (ni la persona ni el orbe), la conversación se cierra sola: ahora
 * queda abierta entre preguntas, y cada minuto abierto se descuenta de los 20 del día.
 */
export const INACTIVIDAD_MAX_MS = 45_000;

export function cerrarPorInactividad(ultimaActividadMs: number, ahoraMs: number): boolean {
  return ahoraMs - ultimaActividadMs >= INACTIVIDAD_MAX_MS;
}

/**
 * Lo más que se guarda una tarjeta esperando que el orbe termine de hablar. Si algo se traba (un
 * `turnoCompleto` que no llega), la tarjeta aparece igual: una propuesta nunca se pierde.
 */
export const ESPERA_MAX_DE_TARJETA_MS = 20_000;

/**
 * Las tarjetas del turno (propuesta, pedido de foto) esperan a que el orbe termine de hablar (E-458).
 * El servidor las manda apenas corre la herramienta, a mitad de la respuesta: la hoja aparecía
 * mientras el orbe seguía hablando. El dueño: «que siga fluido… y luego que mande el mensaje de
 * confirmación del hábito».
 */
export class TarjetasDelTurno<T> {
  private guardadas: { tarjeta: T; desdeMs: number }[] = [];
  private turnoTerminado = false;

  guardar(tarjeta: T, ahoraMs: number): void {
    this.guardadas.push({ tarjeta, desdeMs: ahoraMs });
  }

  /** Llegó `turnoCompleto`: ya no viene más de esta respuesta. */
  terminarTurno(): void {
    this.turnoTerminado = true;
  }

  /** Empieza otra respuesta: lo guardado sigue esperando a que termine la nueva. */
  empezarTurno(): void {
    this.turnoTerminado = false;
  }

  /** Las que ya se pueden mostrar: terminó el turno y el orbe no suena, o esperaron demasiado. */
  listas(sonando: boolean, ahoraMs: number): T[] {
    if (this.guardadas.length === 0) return [];
    const vencida = this.guardadas.some(g => ahoraMs - g.desdeMs >= ESPERA_MAX_DE_TARJETA_MS);
    if (!vencida && (!this.turnoTerminado || sonando)) return [];
    return this.todas();
  }

  /** Todas, ya (al cerrar la conversación). */
  todas(): T[] {
    const tarjetas = this.guardadas.map(g => g.tarjeta);
    this.guardadas = [];
    return tarjetas;
  }
}
