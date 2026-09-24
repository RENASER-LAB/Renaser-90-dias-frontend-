/** PCM de 16 bits mono a 16 kHz: 32 bytes por milisegundo. */
export const BYTES_POR_MS = 32;
/** Cuánto audio se le adelanta al reproductor. Es también lo que sigue sonando si se interrumpe. */
export const ADELANTO_MS = 250;

/**
 * Entrega el audio de la conversación en vivo al reproductor DE A POCO (D-162).
 *
 * `expo-two-way-audio` no permite vaciar lo que ya se le entregó. Si se le pasara todo apenas
 * llega, al interrumpir al acompañante seguiría hablando varios segundos. Por eso se le adelanta
 * como mucho {@link ADELANTO_MS}: al vaciar, lo que queda sonando es a lo sumo eso.
 *
 * El tiempo entra por parámetro (`ahoraMs`) para poder probarlo sin relojes.
 */
export class Dosificador {
  private readonly cola: Uint8Array[] = [];
  /** Hasta cuándo alcanza lo que ya se le entregó al reproductor. */
  private sonandoHastaMs = 0;

  agregar(pcm: Uint8Array): void {
    if (pcm.length > 0) this.cola.push(pcm);
  }

  /** Lo que hay que entregarle ahora al reproductor, en orden. */
  entregar(ahoraMs: number): Uint8Array[] {
    const listos: Uint8Array[] = [];
    this.sonandoHastaMs = Math.max(this.sonandoHastaMs, ahoraMs);
    while (this.cola.length > 0 && this.sonandoHastaMs - ahoraMs < ADELANTO_MS) {
      const pedazo = this.cola.shift()!;
      listos.push(pedazo);
      this.sonandoHastaMs += pedazo.length / BYTES_POR_MS;
    }
    return listos;
  }

  /** La persona interrumpió: lo que no se entregó ya no suena. */
  vaciar(ahoraMs: number): void {
    this.cola.length = 0;
    this.sonandoHastaMs = Math.min(this.sonandoHastaMs, ahoraMs + ADELANTO_MS);
  }

  /** Todavía hay algo sonando o por sonar. */
  estaSonando(ahoraMs: number): boolean {
    return this.cola.length > 0 || this.sonandoHastaMs > ahoraMs;
  }
}
