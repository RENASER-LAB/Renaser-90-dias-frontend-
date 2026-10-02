/**
 * La decisión de «ocultar la barra al desplazar» (2026-10-02), con números: dirección sostenida,
 * umbral contra el temblor del dedo, tope, lista corta y el bucle del final de la lista.
 */
import { describe, expect, it } from '@jest/globals';
import {
  CERCA_DEL_TOPE_PX,
  ESTADO_INICIAL,
  UMBRAL_PX,
  siguienteEstadoDeLaBarra,
  type EstadoDeLaBarra,
} from '../logicaDeLaBarra';

const VISTA = 600;
const CONTENIDO = 3000;
const GANA = 70;

/** Recorre una serie de posiciones y devuelve el estado final. */
function recorrer(ys: number[], inicio: EstadoDeLaBarra = ESTADO_INICIAL, contenido = CONTENIDO, vista = VISTA) {
  return ys.reduce(
    (estado, y) => siguienteEstadoDeLaBarra(estado, { y, altoContenido: contenido, altoVista: vista }, GANA),
    inicio
  );
}

describe('siguienteEstadoDeLaBarra', () => {
  it('arranca a la vista', () => {
    expect(ESTADO_INICIAL.visible).toBe(true);
  });

  it('se esconde al bajar de forma sostenida más allá del umbral', () => {
    expect(recorrer([100, 104, 108, 112]).visible).toBe(false);
  });

  it('un temblor por debajo del umbral no la esconde', () => {
    const quieto: EstadoDeLaBarra = { visible: true, ancla: 200, ultimaY: 200, altoVista: VISTA };
    expect(recorrer([200 + UMBRAL_PX - 1, 200 + 2, 200 + UMBRAL_PX - 2], quieto).visible).toBe(true);
  });

  it('vuelve al subir de forma sostenida', () => {
    const escondida = recorrer([100, 200, 400]);
    expect(escondida.visible).toBe(false);
    expect(recorrer([396, 392, 388], escondida).visible).toBe(true);
  });

  it('subir menos que el umbral no la devuelve', () => {
    const escondida = recorrer([100, 200, 400]);
    expect(recorrer([395], escondida).visible).toBe(false);
  });

  it('mide desde donde cambió la dirección, no desde el evento anterior', () => {
    // Baja 300, sube 6, vuelve a bajar 6: el tramo de bajada nuevo mide 6, no alcanza.
    const escondida = recorrer([100, 400]);
    const subio = recorrer([394], escondida);
    expect(subio.visible).toBe(false);
    expect(recorrer([388], subio).visible).toBe(true);
  });

  it('cerca del tope se ve siempre, aunque venga bajando', () => {
    const escondida = recorrer([100, 400]);
    expect(recorrer([CERCA_DEL_TOPE_PX], escondida).visible).toBe(true);
    expect(recorrer([0, CERCA_DEL_TOPE_PX], ESTADO_INICIAL).visible).toBe(true);
  });

  it('en una lista corta no se esconde', () => {
    // Sobran 100 px para desplazar: menos que el doble de lo que gana la pantalla.
    expect(recorrer([40, 80, 100], ESTADO_INICIAL, VISTA + 100).visible).toBe(true);
  });

  it('una lista que no se desplaza no la esconde', () => {
    expect(recorrer([0, 50], ESTADO_INICIAL, VISTA - 10).visible).toBe(true);
  });

  it('el cambio de alto de la vista (la barra se fue) no cuenta como «subió»: no hay bucle al final', () => {
    const alFinal = recorrer([2000, 2400]); // máximo = 2400
    expect(alFinal.visible).toBe(false);
    // La vista creció GANA y el sistema recortó el desplazamiento: y baja GANA sin que nadie suba.
    const recortado = siguienteEstadoDeLaBarra(
      alFinal,
      { y: 2400 - GANA, altoContenido: CONTENIDO, altoVista: VISTA + GANA },
      GANA
    );
    expect(recortado.visible).toBe(false);
  });

  it('ignora el rebote de iOS por encima del máximo', () => {
    const alFinal = recorrer([2000, 2400]);
    // 2450 se recorta a 2400 y el regreso del rebote a 2400 no es «subir».
    expect(recorrer([2450, 2400], alFinal).visible).toBe(false);
  });

  it('ignora el rebote por debajo de cero: arriba de todo, visible', () => {
    expect(recorrer([-40]).visible).toBe(true);
  });
});
