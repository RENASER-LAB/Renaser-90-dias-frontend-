import type { VozSintetizada } from '../api/renasiaVoz';

/** Lo que el locutor necesita del mundo; en la app son el backend, expo-audio y expo-speech. */
export type Parlantes = {
  sintetizar: (texto: string, signal: AbortSignal) => Promise<VozSintetizada>;
  /**
   * Resuelve `true` cuando el audio terminó o se detuvo, y `false` si no se pudo reproducir (entonces
   * la oración la dice la voz del teléfono). `oracion` sirve para estimar cuánto debería durar.
   */
  reproducir: (voz: Extract<VozSintetizada, { tipo: 'audio' }>, oracion: string) => Promise<boolean>;
  /** La voz del teléfono. Resuelve al terminar, detenerse o fallar. */
  hablarConSistema: (texto: string) => Promise<void>;
  detener: () => void;
};

/**
 * Dice oraciones en orden, una detrás de otra, con la voz natural si hay y la del teléfono si no.
 *
 * Cada oración se pide al servidor **apenas llega** (mientras suena la anterior), así entre frase y
 * frase no se oye el viaje de red. Pero se reproducen en el orden en que llegaron, aunque el audio
 * de la segunda esté listo antes que el de la primera.
 */
export class Locutor {
  private cola: Promise<void> = Promise.resolve();
  private pendientes = 0;
  private cortado = false;
  private readonly aborto = new AbortController();

  constructor(
    private readonly parlantes: Parlantes,
    private readonly alQuedarCallado: () => void
  ) {}

  get hablando(): boolean {
    return this.pendientes > 0;
  }

  decir(oracion: string): void {
    if (this.cortado) return;
    this.pendientes += 1;
    const audio = this.parlantes.sintetizar(oracion, this.aborto.signal).catch((): VozSintetizada => ({ tipo: 'fallo' }));
    this.cola = this.cola
      .then(async () => {
        const voz = await audio;
        if (this.cortado) return;
        const sono = voz.tipo === 'audio' && (await this.parlantes.reproducir(voz, oracion));
        if (!sono && !this.cortado) await this.parlantes.hablarConSistema(oracion);
      })
      .catch(() => undefined)
      .finally(() => {
        this.pendientes -= 1;
        if (this.pendientes === 0) this.alQuedarCallado();
      });
  }

  /** Callado de verdad: lo que esté sonando se corta y lo que llegue después ya no se dice. */
  callar(): void {
    this.cortado = true;
    this.aborto.abort();
    this.parlantes.detener();
  }
}
