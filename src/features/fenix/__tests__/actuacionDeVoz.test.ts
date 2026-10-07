/**
 * La actuación de la voz contra el Director real (con un reloj falso): lo que el `.riv` recibe MIENTRAS dura cada
 * fase. Queja del dueño (2026-10-07): «no se está usando el movimiento cuando te escucha, piensa y habla; probé y
 * nada». Antes cada fase mandaba una cara y, como mucho, un disparo: después el fénix quedaba como en reposo.
 */
import { afterEach, describe, expect, it } from '@jest/globals';

import { PhoenixDirector, type Clock } from '../rive/phoenixMaster';
import { ActuacionDeVoz } from '../utils/actuacionDeVoz';
import type { EstadoDeSer } from '../utils/conversacionDeSer';
import { visemasNaturales } from '../utils/visemas';

type Envio = { t: number; nombre: string; valor: number | boolean | 'fire' };

function semilla(s: number) {
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Reloj falso: timers y cuadros en una cola ordenada por tiempo. */
function relojFalso() {
  let ahora = 0;
  let id = 0;
  const cola: Array<{ at: number; fn: () => void; id: number }> = [];
  const quitar = (h: unknown) => {
    const i = cola.findIndex(x => x.id === h);
    if (i >= 0) cola.splice(i, 1);
  };
  const poner = (fn: () => void, ms: number) => {
    cola.push({ at: ahora + ms, fn, id: ++id });
    return id;
  };
  const reloj: Clock = {
    now: () => ahora,
    setTimeout: poner,
    clearTimeout: quitar,
    requestFrame: fn => poner(fn, 16),
    cancelFrame: quitar,
  };
  const avanzar = (ms: number) => {
    const hasta = ahora + ms;
    for (;;) {
      cola.sort((a, b) => a.at - b.at || a.id - b.id);
      const sig = cola[0];
      if (!sig || sig.at > hasta) break;
      cola.shift();
      ahora = sig.at;
      sig.fn();
    }
    ahora = hasta;
  };
  return { reloj, avanzar, ahora: () => ahora };
}

const vivos: PhoenixDirector[] = [];
afterEach(() => {
  for (const d of vivos.splice(0)) d.dispose();
});

function escena() {
  const { reloj, avanzar, ahora } = relojFalso();
  const envios: Envio[] = [];
  const anotar = (nombre: string, valor: Envio['valor']) => envios.push({ t: ahora(), nombre, valor });
  const director = new PhoenixDirector(
    { setNumber: anotar, setBool: anotar, fire: t => anotar(t, 'fire') },
    reloj,
  );
  vivos.push(director);
  director.alive(true, { rng: semilla(5) });
  const actuacion = new ActuacionDeVoz(director, reloj, semilla(9));
  const entre = (desde: number, nombre: string) =>
    envios.filter(e => e.t >= desde && e.nombre === nombre).map(e => e.valor);
  const numeros = (desde: number, nombre: string) => entre(desde, nombre) as number[];
  const fase = (estado: EstadoDeSer, reducido = false) => {
    const desde = ahora();
    actuacion.entrar(estado, reducido);
    return desde;
  };
  return { director, actuacion, avanzar, entre, numeros, fase, ahora };
}

const rango = (v: number[]) => Math.max(...v) - Math.min(...v);

describe('escuchando', () => {
  it('se inclina hacia la persona y ladea la cabeza de un lado al otro mientras dura, sin quedarse quieto', () => {
    const e = escena();
    const desde = e.fase('escuchando');
    e.avanzar(6000);
    expect(Math.max(...e.numeros(desde, 'bodyLean'))).toBeGreaterThan(0.3);
    expect(rango(e.numeros(desde + 3000, 'headRoll'))).toBeGreaterThan(0.3);   // sigue ladeándose a los 3 s
    expect(e.entre(desde, 'trgBlink').length).toBeGreaterThanOrEqual(1);
    expect(e.entre(desde, 'emotion')).toContain(3);
  });

  it('mira al frente: lifeGaze bajo y la vida autónoma (que mira a los costados) apagada', () => {
    const e = escena();
    const desde = e.fase('escuchando');
    e.avanzar(6000);
    expect(e.numeros(desde, 'lifeGaze').at(-1)).toBeLessThanOrEqual(0.1);
    expect(e.director.isAlive).toBe(false);
    expect(e.numeros(desde, 'gazeX').every(v => Math.abs(v) < 1e-6)).toBe(true);
  });

  it('el volumen del micrófono estira el pecho; en otra fase no hace nada', () => {
    const e = escena();
    e.fase('escuchando');
    let desde = e.ahora();
    e.actuacion.nivel(1);
    e.avanzar(300);
    expect(Math.max(...e.numeros(desde, 'bodyStretch'))).toBeGreaterThan(0.25);
    e.fase('pensando');
    e.avanzar(1000);
    desde = e.ahora();
    e.actuacion.nivel(1);
    e.avanzar(300);
    expect(e.numeros(desde, 'bodyStretch')).toEqual([]);
  });
});

describe('pensando', () => {
  it('trgThinking otra vez mientras dure, mirada arriba que alterna a cada lado y energía baja', () => {
    const e = escena();
    const desde = e.fase('pensando');
    e.avanzar(6000);
    expect(e.entre(desde, 'trgThinking').length).toBeGreaterThanOrEqual(3);
    const gazeX = e.numeros(desde, 'gazeX');
    expect(Math.max(...gazeX)).toBeGreaterThan(0.3);
    expect(Math.min(...gazeX)).toBeLessThan(-0.3);
    expect(Math.max(...e.numeros(desde, 'gazeY'))).toBeGreaterThan(0.55);
    expect(e.numeros(desde, 'energy').at(-1)).toBeCloseTo(0.3);
    expect(e.entre(desde, 'emotion')).toContain(4);
  });
});

describe('hablando', () => {
  it('la boca se mueve de verdad (visemas de 0 a 3) todo el tiempo, con isTalking encendido', () => {
    const e = escena();
    const desde = e.fase('hablando');
    e.avanzar(4000);
    const bocaAlFinal = e.numeros(desde + 3000, 'mouth');
    expect(Math.max(...bocaAlFinal)).toBeGreaterThan(2.5);
    expect(Math.min(...bocaAlFinal)).toBeLessThan(0.8);
    expect(e.entre(desde, 'isTalking').at(-1)).toBe(true);
  });

  it('gesto de explicar al empezar, alas que acompañan y cara contenta', () => {
    const e = escena();
    const desde = e.fase('hablando');
    e.avanzar(4000);
    expect(e.entre(desde, 'trgExplain').length).toBeGreaterThanOrEqual(1);
    expect(rango(e.numeros(desde + 1500, 'wingL'))).toBeGreaterThan(0.1);
    expect(e.entre(desde, 'emotion')).toContain(1);
  });
});

describe('al volver a reposo', () => {
  it('vuelve suave al dibujo y al ánimo: boca cerrada, cara neutral, mirada y vida autónoma de vuelta', () => {
    const e = escena();
    e.fase('hablando');
    e.avanzar(3000);
    const desde = e.fase('reposo');
    e.avanzar(3000);
    expect(e.entre(desde, 'isTalking').at(-1)).toBe(false);
    expect(e.entre(desde, 'emotion').at(-1)).toBe(0);
    for (const eje of ['wingL', 'wingR', 'headRoll', 'headPitch', 'bodyLean'] as const) {
      expect(e.director.get(eje)).toBeCloseTo(0);
    }
    expect(e.director.get('lifeGaze')).toBe(1);
    expect(e.director.get('energy')).toBeCloseTo(0.5);
    expect(e.director.isAlive).toBe(true);
  });

  it('nada de la fase sigue después: ni trgThinking ni vaivén', () => {
    const e = escena();
    e.fase('pensando');
    e.avanzar(2000);
    const desde = e.fase('reposo');
    e.avanzar(8000);
    expect(e.entre(desde, 'trgThinking')).toEqual([]);
  });
});

describe('con «reducir movimiento»', () => {
  it('una pose quieta por fase: al instante, sin disparos, sin boca y sin vaivén', () => {
    const e = escena();
    e.director.reduceMotion(true);
    const desde = e.fase('escuchando', true);
    expect(e.director.get('bodyLean')).toBeGreaterThan(0.3);
    e.avanzar(500);
    const despues = e.ahora();
    e.avanzar(6000);
    expect(e.entre(despues, 'headRoll')).toEqual([]);
    e.fase('hablando', true);
    e.avanzar(3000);
    expect(e.numeros(desde, 'mouth').every(v => v === 1)).toBe(true);   // la boca en su reposo, sin visemas
    expect(e.entre(desde, 'trgExplain')).toEqual([]);
    expect(e.entre(desde, 'trgBlink')).toEqual([]);
  });
});

describe('visemas', () => {
  it('abren y cierran a ritmo de sílaba (110–190 ms) dentro de la tanda', () => {
    const pista = visemasNaturales(900, semilla(3));
    expect(pista.length).toBeGreaterThanOrEqual(8);
    expect(pista.every(v => v.t >= 0 && v.t < 900 && v.mouth >= 0 && v.mouth <= 3)).toBe(true);
    expect(new Set(pista.map(v => v.mouth >= 2)).size).toBe(2);
  });
});
