/** PCM de 16 bits mono a 16 kHz: 32 bytes por milisegundo. */
export const BYTES_POR_MS = 32;
/**
 * Después de que el orbe termina de sonar, el micrófono sigue en silencio este tiempo más: es la
 * cola del sonido que todavía rebota en la habitación.
 */
export const MARGEN_DE_ECO_MS = 400;
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
    this.suenaHastaMs = Math.max(this.suenaHastaMs, ahoraMs) + bytes / BYTES_POR_MS;
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
    if (this.bytes < BYTES_POR_ENVIO) return null;
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
