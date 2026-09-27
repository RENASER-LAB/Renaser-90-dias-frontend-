/**
 * Cuándo la conversación baja sola al último mensaje y cuándo aparece «↓» (2026-09-27). El bug que
 * lo trajo: el grupo «Fénix» abría arriba y no bajaba nunca. La lista ahora es invertida (el
 * desplazamiento 0 es el final) y estas reglas deciden el resto, como WhatsApp.
 */
import { describe, expect, it } from '@jest/globals';

import {
  alDesplazar,
  alLlegarMensajes,
  contadorDelBoton,
  ESTADO_INICIAL,
  estaAbajo,
  mensajesQueLlegaron,
  mostrarBotonBajar,
  posicionAMantener,
  TOLERANCIA_ABAJO_PX,
} from '../bajadaDelChat';

const m = (id: string, isMe = false) => ({ id, isMe });

describe('estaAbajo', () => {
  it('el final es el desplazamiento 0 de la lista invertida, con un margen para el roce del dedo', () => {
    expect(estaAbajo(0)).toBe(true);
    expect(estaAbajo(-12)).toBe(true); // rebote de iOS
    expect(estaAbajo(TOLERANCIA_ABAJO_PX)).toBe(true);
    expect(estaAbajo(TOLERANCIA_ABAJO_PX + 1)).toBe(false);
    expect(estaAbajo(900)).toBe(false);
  });
});

describe('al abrir', () => {
  it('arranca abajo, sin pendientes y sin botón', () => {
    expect(ESTADO_INICIAL).toEqual({ abajo: true, nuevosSinVer: 0 });
    expect(mostrarBotonBajar(ESTADO_INICIAL)).toBe(false);
  });
});

describe('alDesplazar', () => {
  it('subir a leer historia muestra «↓»', () => {
    const arriba = alDesplazar(ESTADO_INICIAL, 400);
    expect(arriba).toEqual({ abajo: false, nuevosSinVer: 0 });
    expect(mostrarBotonBajar(arriba)).toBe(true);
  });

  it('volver abajo esconde el botón y pone el contador en cero', () => {
    expect(alDesplazar({ abajo: false, nuevosSinVer: 3 }, 0)).toEqual(ESTADO_INICIAL);
  });

  it('seguir moviéndose sin cambiar de lado devuelve el mismo estado (no redibuja la pantalla)', () => {
    const arriba = { abajo: false, nuevosSinVer: 2 };
    expect(alDesplazar(arriba, 600)).toBe(arriba);
    expect(alDesplazar(ESTADO_INICIAL, 10)).toBe(ESTADO_INICIAL);
  });
});

describe('mensajesQueLlegaron', () => {
  it('son los que están después del que era el último', () => {
    expect(mensajesQueLlegaron('b', [m('a'), m('b'), m('c'), m('d')]).map(x => x.id)).toEqual(['c', 'd']);
    expect(mensajesQueLlegaron('d', [m('a'), m('b'), m('c'), m('d')])).toEqual([]);
  });

  it('abrir o cargar el historial no es «llegar»: no hay último anterior', () => {
    expect(mensajesQueLlegaron(null, [m('a'), m('b')])).toEqual([]);
  });

  it('si el anterior quedó fuera de la página no se inventa un contador', () => {
    expect(mensajesQueLlegaron('perdido', [m('x'), m('y')])).toEqual([]);
  });
});

describe('alLlegarMensajes', () => {
  it('estando abajo, lo nuevo se muestra: baja al final', () => {
    expect(alLlegarMensajes(ESTADO_INICIAL, [m('c')])).toEqual({ estado: ESTADO_INICIAL, bajar: true });
  });

  it('leyendo historia no lo arrastra: suma al contador del botón', () => {
    const r = alLlegarMensajes({ abajo: false, nuevosSinVer: 1 }, [m('c'), m('d')]);
    expect(r).toEqual({ estado: { abajo: false, nuevosSinVer: 3 }, bajar: false });
    expect(mostrarBotonBajar(r.estado)).toBe(true);
  });

  it('lo que manda uno mismo siempre baja, aunque estuviera arriba', () => {
    expect(alLlegarMensajes({ abajo: false, nuevosSinVer: 4 }, [m('mio', true)])).toEqual({
      estado: ESTADO_INICIAL,
      bajar: true,
    });
  });

  it('si no llegó nada, no pasa nada', () => {
    const arriba = { abajo: false, nuevosSinVer: 2 };
    expect(alLlegarMensajes(arriba, [])).toEqual({ estado: arriba, bajar: false });
  });
});

describe('posicionAMantener', () => {
  it('leyendo historia, la lista mantiene a la vista lo que se lee cuando entra algo debajo', () => {
    expect(posicionAMantener({ abajo: false, nuevosSinVer: 0 })).toEqual({ minIndexForVisible: 0 });
  });

  it('abajo no se pone: lo nuevo aparece solo en el final, sin ir y volver', () => {
    expect(posicionAMantener(ESTADO_INICIAL)).toBeUndefined();
  });

  it('es siempre el mismo objeto, para no mandar un cambio a la vista nativa en cada dibujo', () => {
    expect(posicionAMantener({ abajo: false, nuevosSinVer: 1 })).toBe(posicionAMantener({ abajo: false, nuevosSinVer: 7 }));
  });
});

describe('contadorDelBoton', () => {
  it('sin nuevos no hay círculo; con muchos, «99+»', () => {
    expect(contadorDelBoton(0)).toBeNull();
    expect(contadorDelBoton(1)).toBe('1');
    expect(contadorDelBoton(99)).toBe('99');
    expect(contadorDelBoton(150)).toBe('99+');
  });
});
