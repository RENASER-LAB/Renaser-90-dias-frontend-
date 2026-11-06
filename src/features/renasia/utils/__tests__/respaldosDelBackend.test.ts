/**
 * Los textos de respaldo del backend se quitan estén donde estén y aunque vengan varios seguidos (issue #105, E2E del 02/11: capturas
 * `B4-ser-ritual-tarjeta` y `B4-ser-historial-recargado`). Antes `quitarRespaldoDeFoto` esperaba «…subela desde Hoy.» al FINAL del mensaje, el servidor
 * ya dice «desde Training.» y el del ritual («cuenta como te sientes…») no tenía quien lo quitara; con dos respaldos seguidos, «Propuesta: …» quedaba
 * como texto porque solo se quitaba si iba al final.
 *
 * Los textos son los REALES de `B4-SER-respuestas.txt`.
 */
import { describe, expect, it } from '@jest/globals';

import { crearAgrupador } from '../voz';
import { esLineaDeRespaldo, plano, quitarRespaldoDeFoto, quitarTextoDeRespaldo, sinRespaldosRepetidos } from '../respaldosDelBackend';
import * as desdePropuestas from '../propuestas';

const RITUAL = "RITUAL TIERRA - AGUA - FUEGO (mañana)";
const RESPALDO_RITUAL = `Para registrar '${RITUAL}' cuenta como te sientes: si no ves el boton para escribir, hazlo desde Training.`;
const RESPALDO_KM = "Foto para registrar 'KILÓMETROS DIARIOS': si no ves el boton de la camara, subela desde Training.";
const RESUMEN = "Marcar 'ÚLTIMA COMIDA DEL DÍA' como hecho (+10 puntos si lo confirmas ahora)";
const INTRO = 'Te dejé abajo el botón para escribir cómo te sientes después del ritual de la mañana. ✨\n\nHacerlo de a pocos te acerca a tu objetivo.';

describe('el respaldo del ritual (lo que nadie quitaba)', () => {
  it('se quita al final del mensaje, con el texto real del servidor', () => {
    expect(quitarRespaldoDeFoto(`${INTRO}\n\n${RESPALDO_RITUAL}`, RITUAL)).toBe(INTRO);
  });

  it('también con tildes y con «desde Hoy» o «desde Training» (el backend los va a corregir, #63)', () => {
    const corregido = `Para registrar '${RITUAL}' cuenta cómo te sientes: si no ves el botón para escribir, hazlo desde Hoy.`;
    expect(quitarRespaldoDeFoto(`${INTRO}\n\n${corregido}`, RITUAL)).toBe(INTRO);
    const conTraining = `Para registrar '${RITUAL}' cuenta como te sientes: si no ves el botón para escribir, hazlo desde Training.`;
    expect(quitarRespaldoDeFoto(`${INTRO}\n\n${conTraining}`, RITUAL)).toBe(INTRO);
  });

  it('spec 045 FR-010: con «desde Entrenar», lo que dice el servidor desde que la pestaña se llama así (D5)', () => {
    const conEntrenar = `Para registrar '${RITUAL}' cuenta cómo te sientes: si no ves el botón para escribir, hazlo desde Entrenar.`;
    expect(quitarRespaldoDeFoto(`${INTRO}\n\n${conEntrenar}`, RITUAL)).toBe(INTRO);
    const foto = "Foto para registrar 'KILÓMETROS DIARIOS': si no ves el botón de la cámara, súbela desde Entrenar.";
    expect(quitarRespaldoDeFoto(`${INTRO}\n\n${foto}`, 'KILÓMETROS DIARIOS')).toBe(INTRO);
  });

  it('no toca el de OTRO ritual', () => {
    const texto = `${INTRO}\n\n${RESPALDO_RITUAL}`;
    expect(quitarRespaldoDeFoto(texto, 'RITUAL DE MAÑANA (domingo)')).toBe(texto);
  });
});

describe('el respaldo de la foto, con «Training» y con tildes', () => {
  it('«subela desde Training.» (lo que dice el servidor ahora) se quita', () => {
    expect(quitarRespaldoDeFoto(`Dale.\n\n${RESPALDO_KM}`, 'KILÓMETROS DIARIOS')).toBe('Dale.');
  });

  it.each([
    ["Foto para registrar 'KILÓMETROS DIARIOS': si no ves el botón de la cámara, súbela desde Training."],
    ["Foto para registrar 'KILÓMETROS DIARIOS': si no ves el botón de la cámara, súbela desde Hoy."],
    ["Foto para registrar 'KILÓMETROS DIARIOS': si no ves el boton de la camara, subela desde Hoy."],
    ["Foto para registrar tu acción 'KILÓMETROS DIARIOS': si no ves el botón de la cámara, súbela desde Training."],
  ])('%s', respaldo => {
    expect(quitarRespaldoDeFoto(`Dale.\n\n${respaldo}`, 'KILÓMETROS DIARIOS')).toBe('Dale.');
  });
});

describe('estén donde estén y aunque vengan varios seguidos', () => {
  it('«Propuesta: …» en medio del mensaje, no solo al final', () => {
    const texto = `Hola.\n\nPropuesta: ${RESUMEN}\n\nTe dejé la tarjeta abajo.`;
    expect(quitarTextoDeRespaldo(texto, RESUMEN)).toBe('Hola.\n\nTe dejé la tarjeta abajo.');
  });

  it('el respaldo del ritual y después el de la propuesta: cada evento quita el suyo y no queda ninguno', () => {
    const texto = `${INTRO}\n\n${RESPALDO_RITUAL}\n\nPropuesta: ${RESUMEN}`;
    // Llega primero el evento del pedido: la línea de la propuesta, que ya no va al final de nada, no se pierde ni estorba.
    const trasElPedido = quitarRespaldoDeFoto(texto, RITUAL);
    expect(trasElPedido).toBe(`${INTRO}\n\nPropuesta: ${RESUMEN}`);
    expect(quitarTextoDeRespaldo(trasElPedido, RESUMEN)).toBe(INTRO);
    // Y en el otro orden.
    expect(quitarRespaldoDeFoto(quitarTextoDeRespaldo(texto, RESUMEN), RITUAL)).toBe(INTRO);
  });

  it('la foto del hábito seguida de la propuesta (el caso de «Kilómetros diarios» y la última comida)', () => {
    const texto = `Excelente.\n\n${RESPALDO_KM}\n\nPropuesta: ${RESUMEN}\n\nAbre Training cuando quieras.`;
    const sinFoto = quitarRespaldoDeFoto(texto, 'KILÓMETROS DIARIOS');
    expect(sinFoto).toBe(`Excelente.\n\nPropuesta: ${RESUMEN}\n\nAbre Training cuando quieras.`);
    expect(quitarTextoDeRespaldo(sinFoto, RESUMEN)).toBe('Excelente.\n\nAbre Training cuando quieras.');
  });

  it('varias propuestas seguidas: cada una quita solo la suya', () => {
    const otra = "Marcar 'DESPERTAR' como hecho (+10 puntos si lo confirmas ahora)";
    const texto = `Listo.\n\nPropuesta: ${otra}\n\nPropuesta: ${RESUMEN}`;
    const sinLaPrimera = quitarTextoDeRespaldo(texto, otra);
    expect(sinLaPrimera).toBe(`Listo.\n\nPropuesta: ${RESUMEN}`);
    expect(quitarTextoDeRespaldo(sinLaPrimera, RESUMEN)).toBe('Listo.');
  });

  it('la misma línea repetida dentro de un mismo mensaje: se quitan todas', () => {
    const texto = `Listo.\n\nPropuesta: ${RESUMEN}\n\nPropuesta: ${RESUMEN}`;
    expect(quitarTextoDeRespaldo(texto, RESUMEN)).toBe('Listo.');
  });

  it('sin tildes ni mayúsculas en la comparación del resumen', () => {
    expect(quitarTextoDeRespaldo(`Hola.\n\nPropuesta: ${plano(RESUMEN)}`, RESUMEN)).toBe('Hola.');
  });

  it('lo que NO es exactamente el respaldo no se toca', () => {
    const texto = `Propuesta: ${RESUMEN}. Y algo que dijo después el asistente.\n\nMi propuesta: descansa.`;
    expect(quitarTextoDeRespaldo(texto, RESUMEN)).toBe(texto);
    expect(quitarRespaldoDeFoto('Para registrar algo, abre Training.', RITUAL)).toBe('Para registrar algo, abre Training.');
  });

  it('un texto sin respaldo sale idéntico, sin retocar espacios', () => {
    const texto = 'Hola. \n\n\n\nSigue así.  ';
    expect(quitarTextoDeRespaldo(texto, RESUMEN)).toBe(texto);
    expect(quitarRespaldoDeFoto(texto, RITUAL)).toBe(texto);
  });

  it('las funciones se importan de `propuestas`, donde siempre estuvieron', () => {
    expect(desdePropuestas.quitarTextoDeRespaldo).toBe(quitarTextoDeRespaldo);
    expect(desdePropuestas.quitarRespaldoDeFoto).toBe(quitarRespaldoDeFoto);
    expect(desdePropuestas.sinRespaldosRepetidos).toBe(sinRespaldosRepetidos);
  });
});

describe('al releer el historial: el mismo respaldo no sale dos veces en la misma burbuja', () => {
  const DESPERTAR = "Propuesta: Marcar 'DESPERTAR' como hecho (+10 puntos si lo confirmas ahora)";

  it('deja UNA vez «Propuesta: …» (el caso de B4-ser-historial-recargado)', () => {
    const texto = `¿Quieres que veamos algo más?\n\n${DESPERTAR}\n\n${DESPERTAR}`;
    expect(sinRespaldosRepetidos(texto)).toBe(`¿Quieres que veamos algo más?\n\n${DESPERTAR}`);
  });

  it('también cuando no son vecinas, y con los otros respaldos', () => {
    const texto = `Hola.\n\n${DESPERTAR}\n\nY además.\n\n${RESPALDO_RITUAL}\n\n${DESPERTAR}\n\n${RESPALDO_RITUAL}`;
    expect(sinRespaldosRepetidos(texto)).toBe(`Hola.\n\n${DESPERTAR}\n\nY además.\n\n${RESPALDO_RITUAL}`);
  });

  it('no toca lo que no es un respaldo, aunque se repita', () => {
    const texto = 'Sí.\n\nSí.\n\nVamos.';
    expect(sinRespaldosRepetidos(texto)).toBe(texto);
  });

  it('una propuesta guardada UNA sola vez se deja tal cual (no se borra: ya no tiene botones, pero es lo que se dijo)', () => {
    const texto = `Te dejé la tarjeta.\n\n${DESPERTAR}`;
    expect(sinRespaldosRepetidos(texto)).toBe(texto);
  });
});

describe('qué es un respaldo', () => {
  it.each([
    [`Propuesta: ${RESUMEN}`, true],
    [RESPALDO_KM, true],
    [RESPALDO_RITUAL, true],
    ["Foto para registrar tu acción 'Llamar': si no ves el botón de la cámara, súbela desde Training.", true],
    ['Te dejé abajo el botón para la foto.', false],
    ['Mi propuesta es que descanses.', false],
    ['Para registrar tus hábitos abre Training.', false],
  ])('%s → %s', (linea, esperado) => {
    expect(esLineaDeRespaldo(linea)).toBe(esperado);
  });
});

describe('la voz no lee ningún respaldo', () => {
  it('ni el del ritual (antes lo leía en voz alta)', () => {
    const dicho: string[] = [];
    const agrupador = crearAgrupador(texto => dicho.push(texto));
    agrupador.oracion('Te dejé abajo el botón.');
    agrupador.oracion(RESPALDO_RITUAL);
    agrupador.oracion(RESPALDO_KM);
    agrupador.oracion(`Propuesta: ${RESUMEN}`);
    agrupador.terminar();
    expect(dicho).toEqual(['Te dejé abajo el botón.']);
  });
});
