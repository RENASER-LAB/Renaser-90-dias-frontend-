import type { VozSintetizada } from '../api/renasiaVoz';

/** Lo que el locutor necesita del mundo; en la app son el backend y expo-audio. */
export type Parlantes = {
  sintetizar: (texto: string, signal: AbortSignal) => Promise<VozSintetizada>;
  /**
   * Resuelve `true` cuando el audio terminó o se detuvo, y `false` si no se pudo reproducir (entonces
   * la oración la dice la voz del teléfono). `oracion` sirve para estimar cuánto debería durar.
   */
  reproducir: (voz: Extract<VozSintetizada, { tipo: 'audio' }>, oracion: string) => Promise<boolean>;
  detener: () => void;
};

/**
 * Dice oraciones en orden, una detrás de otra, con la voz del servidor. Si no hay voz, avisa una vez
 * y la respuesta queda escrita en pantalla: nunca suena la voz robótica del teléfono (D-164).
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

  private avisoDado = false;

  constructor(
    private readonly parlantes: Parlantes,
    private readonly alQuedarCallado: () => void,
    /** No hubo voz del servidor para una oración: la persona la lee en pantalla (D-164). */
    private readonly alFaltarLaVoz: () => void = () => undefined
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
        if (!sono && !this.cortado && !this.avisoDado) {
          // Corregido 2026-09-24 (D-164): antes acá hablaba la voz robótica del teléfono. El dueño
          // prefiere que se avise y que la respuesta quede escrita; la voz es una sola, la del servidor.
          this.avisoDado = true;
          this.alFaltarLaVoz();
        }
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
