import { describe, expect, it } from '@jest/globals';

import {
  accionDelToque,
  ARRANQUE_DEL_PARLANTE_MS,
  BYTES_POR_ENVIO,
  BYTES_POR_MS,
  cerrarPorInactividad,
  ESPERA_MAX_DE_TARJETA_MS,
  INACTIVIDAD_MAX_MS,
  LoteDeMicrofono,
  MARGEN_DE_ECO_MS,
  MICROFONO_PREVIO_MAX_MS,
  MicrofonoPrevio,
  Parlante,
  TarjetasDelTurno,
} from '../audioEnVivo';

describe('Parlante', () => {
  it('antes de sonar nada, el micrófono está abierto', () => {
    const parlante = new Parlante();

    expect(parlante.microfonoAbierto(0)).toBe(true);
    expect(parlante.estaSonando(0)).toBe(false);
  });

  it('suma lo que se le entrega: dos pedazos de 200 ms suenan 400 ms, después del arranque del parlante', () => {
    const parlante = new Parlante();
    parlante.sonar(200 * BYTES_POR_MS, 1000);
    parlante.sonar(200 * BYTES_POR_MS, 1010);

    expect(parlante.estaSonando(1000 + ARRANQUE_DEL_PARLANTE_MS + 399)).toBe(true);
    expect(parlante.estaSonando(1000 + ARRANQUE_DEL_PARLANTE_MS + 400)).toBe(false);
  });

  it('semidúplex: el micrófono va en silencio mientras suena y durante el margen de eco', () => {
    const parlante = new Parlante();
    parlante.sonar(1000 * BYTES_POR_MS, 0);
    const fin = ARRANQUE_DEL_PARLANTE_MS + 1000;

    expect(parlante.microfonoAbierto(500)).toBe(false);
    expect(parlante.microfonoAbierto(fin + MARGEN_DE_ECO_MS - 1)).toBe(false);
    expect(parlante.microfonoAbierto(fin + MARGEN_DE_ECO_MS)).toBe(true);
  });

  it('callar lo deja en silencio y abre el micrófono pasado el margen', () => {
    const parlante = new Parlante();
    parlante.sonar(5000 * BYTES_POR_MS, 0);

    parlante.callar(1000);

    expect(parlante.estaSonando(1000)).toBe(false);
    expect(parlante.microfonoAbierto(1000 + MARGEN_DE_ECO_MS - 1)).toBe(false);
    expect(parlante.microfonoAbierto(1000 + MARGEN_DE_ECO_MS)).toBe(true);
  });
});

describe('LoteDeMicrofono', () => {
  it('junta pedazos de 32 ms hasta pasar los 100 ms y los entrega en orden', () => {
    const lote = new LoteDeMicrofono();
    const pedazo = (valor: number) => new Uint8Array(1024).fill(valor);

    expect(lote.agregar(pedazo(1))).toBeNull();
    expect(lote.agregar(pedazo(2))).toBeNull();
    expect(lote.agregar(pedazo(3))).toBeNull();
    const listo = lote.agregar(pedazo(4));

    expect(listo).not.toBeNull();
    expect(listo!.length).toBeGreaterThanOrEqual(BYTES_POR_ENVIO);
    expect([listo![0], listo![1024], listo![2048], listo![3072]]).toEqual([1, 2, 3, 4]);
    expect(lote.agregar(pedazo(5))).toBeNull();
  });
});

describe('LoteDeMicrofono.vaciar (E-458)', () => {
  it('entrega lo juntado aunque no llegue a un lote, y después no queda nada', () => {
    const lote = new LoteDeMicrofono();
    lote.agregar(new Uint8Array(1024).fill(7));

    const resto = lote.vaciar();

    expect(resto).toHaveLength(1024);
    expect(resto![0]).toBe(7);
    expect(lote.vaciar()).toBeNull();
  });
});

describe('MicrofonoPrevio (E-458)', () => {
  it('guarda lo dicho mientras la sesión se abre y lo devuelve en orden, una sola vez', () => {
    const previo = new MicrofonoPrevio();
    previo.guardar(new Uint8Array([1]));
    previo.guardar(new Uint8Array([2]));

    expect(previo.vaciar().map(l => l[0])).toEqual([1, 2]);
    expect(previo.vaciar()).toEqual([]);
  });

  it('no pasa del tope: si la apertura se cuelga, no acumula audio sin fin', () => {
    const previo = new MicrofonoPrevio();
    const segundo = new Uint8Array(1000 * BYTES_POR_MS);
    for (let i = 0; i < MICROFONO_PREVIO_MAX_MS / 1000 + 5; i++) previo.guardar(segundo);

    expect(previo.vaciar()).toHaveLength(MICROFONO_PREVIO_MAX_MS / 1000);
  });
});

describe('accionDelToque (E-458)', () => {
  it('tocar ya no cierra: abre, «ya terminé», calla o no hace nada', () => {
    expect(accionDelToque('reposo')).toBe('empezar');
    expect(accionDelToque('escuchando')).toBe('finDeHabla');
    expect(accionDelToque('hablando')).toBe('callar');
    expect(accionDelToque('pensando')).toBe('nada');
  });
});

describe('cerrarPorInactividad (E-458)', () => {
  it('cierra recién cuando nadie habló en todo el plazo', () => {
    expect(cerrarPorInactividad(1000, 1000 + INACTIVIDAD_MAX_MS - 1)).toBe(false);
    expect(cerrarPorInactividad(1000, 1000 + INACTIVIDAD_MAX_MS)).toBe(true);
  });
});

describe('TarjetasDelTurno (E-458)', () => {
  it('la propuesta espera a que termine la respuesta y el orbe se calle', () => {
    const tarjetas = new TarjetasDelTurno<string>();
    tarjetas.guardar('propuesta', 0);

    expect(tarjetas.listas(true, 100)).toEqual([]);
    // Sin sonar (la pausa mientras corre otra herramienta), pero la respuesta sigue: todavía no.
    expect(tarjetas.listas(false, 200)).toEqual([]);
    tarjetas.terminarTurno();
    expect(tarjetas.listas(true, 300)).toEqual([]);
    expect(tarjetas.listas(false, 400)).toEqual(['propuesta']);
    expect(tarjetas.listas(false, 500)).toEqual([]);
  });

  it('una respuesta nueva vuelve a esperar su propio final', () => {
    const tarjetas = new TarjetasDelTurno<string>();
    tarjetas.terminarTurno();
    tarjetas.empezarTurno();
    tarjetas.guardar('foto', 0);

    expect(tarjetas.listas(false, 100)).toEqual([]);
  });

  it('si el final no llega, la tarjeta aparece igual: una propuesta nunca se pierde', () => {
    const tarjetas = new TarjetasDelTurno<string>();
    tarjetas.guardar('propuesta', 0);

    expect(tarjetas.listas(true, ESPERA_MAX_DE_TARJETA_MS - 1)).toEqual([]);
    expect(tarjetas.listas(true, ESPERA_MAX_DE_TARJETA_MS)).toEqual(['propuesta']);
  });

  it('al cerrar la conversación salen todas', () => {
    const tarjetas = new TarjetasDelTurno<string>();
    tarjetas.guardar('a', 0);
    tarjetas.guardar('b', 0);

    expect(tarjetas.todas()).toEqual(['a', 'b']);
    expect(tarjetas.todas()).toEqual([]);
  });
});
