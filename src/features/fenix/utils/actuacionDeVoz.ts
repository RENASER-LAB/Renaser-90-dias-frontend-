import { MOOD_PROFILES, type PhoenixDirector } from '../rive/phoenixMaster';
import { planDelEstado, type EstadoDeSer, type PlanDelEstado } from './conversacionDeSer';
import { visemasNaturales } from './visemas';

/** Lo que la actuación usa del Director: así las pruebas le pasan un doble que anota. */
export type DirectorDeVoz = Pick<
  PhoenixDirector,
  'expression' | 'actTo' | 'set' | 'talk' | 'speak' | 'setBool' | 'trigger' | 'react' | 'alive' | 'currentMood'
>;

export type RelojDeVoz = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
};

const RELOJ_DEL_SISTEMA: RelojDeVoz = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: h => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Cada tanda de visemas. Corta: el Director no cancela un `speak` en curso, así que al callarse la boca se mueve
 * como mucho este tiempo de más. */
export const TANDA_DE_VISEMAS_MS = 900;
/** Duración de referencia de la postura de cada fase (`actTo`, 400 = la normal): entra y vuelve suave. */
const POSE_MS = 600;
/** El vaivén usa el 70 % de su ciclo en llegar: siempre va hacia algún lado, nunca queda quieto. */
const PROPORCION_DEL_VAIVEN = 0.7;
/** Lo más que el micrófono estira el pecho (`bodyStretch`) y levanta las alas. */
const PECHO_MAXIMO = 0.3;
const ALAS_POR_NIVEL = 0.25;
/** Ojos (140 ms) y cabeza (~530 ms con el retardo, a la duración de la postura) ya volvieron al frente: se vuelve a fijar `lifeGaze`. */
const MIRADA_DE_VUELTA_MS = 700;

/**
 * La actuación del fénix mientras dura cada fase de la voz (2026-10-07, pedido del dueño). Sostiene la fase con
 * timers propios hasta la siguiente: la postura, el vaivén, el disparo que se repite, la boca y los parpadeos. Al
 * volver a reposo devuelve la postura del dibujo, la mirada autónoma, la energía del ánimo y la vida autónoma
 * (`alive`), que mientras tanto se apaga: sus micro-conductas (mirar a un costado, estirarse) peleaban con la fase.
 */
export class ActuacionDeVoz {
  private timers = new Set<unknown>();
  private plan: PlanDelEstado = planDelEstado('reposo', false);
  private reducido = false;

  constructor(
    private director: DirectorDeVoz,
    private reloj: RelojDeVoz = RELOJ_DEL_SISTEMA,
    private rng: () => number = Math.random,
  ) {}

  entrar(estado: EstadoDeSer, reducido: boolean): void {
    this.detener();
    this.reducido = reducido;
    this.plan = planDelEstado(estado, reducido);
    const d = this.director;
    if (estado !== 'reposo') d.alive(false);
    d.expression(this.plan.expresion);
    this.ponerPostura(estado);
    this.ponerMiradaYEnergia(estado);
    d.talk(this.plan.hablar);
    if (this.plan.hablar) this.hablar();
    this.disparar();
    if (this.plan.vaiven) this.vaiven(0);
    if (this.plan.parpadeoCadaMs) this.parpadear(this.plan.parpadeoCadaMs);
    if (estado === 'reposo' && !reducido) d.alive(true);
  }

  /** Volumen del micrófono (0–1): solo mientras escucha, el pecho se estira y las alas suben con la voz. */
  nivel(n: number): void {
    if (!this.plan.nivelDeVoz) return;
    const v = Math.max(0, Math.min(1, n));
    this.director.set({ bodyStretch: v * PECHO_MAXIMO, wingL: v * ALAS_POR_NIVEL, wingR: v * ALAS_POR_NIVEL }, { dur: 120 });
  }

  detener(): void {
    for (const h of this.timers) this.reloj.clearTimeout(h);
    this.timers.clear();
  }

  private ponerPostura(estado: EstadoDeSer) {
    if (this.reducido) this.director.set(this.plan.pose, { instant: true });
    else this.director.actTo(this.plan.pose, estado === 'reposo' ? POSE_MS * 1.2 : POSE_MS);
  }

  private ponerMiradaYEnergia(estado: EstadoDeSer) {
    const d = this.director;
    const energia = this.plan.energia ?? MOOD_PROFILES[d.currentMood].energy;
    d.set({ energy: energia }, this.reducido ? { instant: true } : { dur: 400 });
    if (this.reducido) return;                         // con «reducir movimiento» la vida del .riv ya está en 0
    const mirada = this.plan.miradaAutonoma;
    if (mirada == null) {
      if (estado === 'reposo') d.set({ lifeGaze: 1 }, { dur: 400 });
      return;
    }
    d.set({ lifeGaze: mirada }, { dur: 200 });
    // si venía con la mirada dirigida (pensando), el Director restaura lifeGaze cuando los ojos vuelven al frente
    this.despues(MIRADA_DE_VUELTA_MS, () => d.set({ lifeGaze: mirada }, { dur: 200 }));
  }

  private disparar() {
    const { disparo, repetirDisparoMs } = this.plan;
    if (!disparo) return;
    if (disparo === 'retry') void this.director.react('retry');
    else this.director.trigger(disparo);
    if (repetirDisparoMs) this.despues(repetirDisparoMs, () => this.disparar());
  }

  private vaiven(i: number) {
    const v = this.plan.vaiven!;
    this.director.actTo(v.pasos[i % v.pasos.length], v.cadaMs * PROPORCION_DEL_VAIVEN);
    // la mirada dirigida vuelve a subir lifeGaze al llegar al frente (Director, §8.1): se sostiene en cada paso
    if (this.plan.miradaAutonoma != null) this.director.set({ lifeGaze: this.plan.miradaAutonoma }, { dur: 200 });
    this.despues(v.cadaMs, () => this.vaiven(i + 1));
  }

  private parpadear(cadaMs: number) {
    this.despues(cadaMs, () => {
      this.director.trigger('blink');
      this.parpadear(cadaMs);
    });
  }

  private hablar() {
    this.director.speak(visemasNaturales(TANDA_DE_VISEMAS_MS, this.rng));
    this.director.setBool('isTalking', true);          // speak() lo apaga; la boca del clip y los visemas se suman
    this.despues(TANDA_DE_VISEMAS_MS, () => this.hablar());
  }

  private despues(ms: number, fn: () => void) {
    const h = this.reloj.setTimeout(() => {
      this.timers.delete(h);
      fn();
    }, ms);
    this.timers.add(h);
  }
}
