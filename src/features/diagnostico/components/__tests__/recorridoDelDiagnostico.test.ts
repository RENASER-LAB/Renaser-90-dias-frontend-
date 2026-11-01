import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { ScrollView } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El recorrido de la persona por el diagnóstico (spec 026): portada, pasos cortos, preguntas condicionales, lo que falta,
 * guardar de verdad antes de avanzar, retomar, el cierre y la vista previa. La lógica fina (pasos, validación, serialización)
 * tiene sus propias pruebas en `utils/`; aquí se prueba que la pantalla las junta bien.
 */

const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };
let mockAtrasDelSistema: (() => boolean | void) | null = null;

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../../utils/tacto', () => ({
  get tacto() {
    return mockTacto;
  },
}));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({
  useSystemBackHandler: (manejador: () => boolean | void, activo: boolean) => {
    if (activo) mockAtrasDelSistema = manejador;
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '../../../../services/http/apiClient';
import type { PropiedadesDelRecorrido, RespuestaDelDiagnostico, ResultadoDeTerminar } from '../../types/diagnostico.types';
import {
  diagnosticoDeEjemplo,
  P,
  respuestasCompletas,
  respuestaTexto,
  seccionesDeEjemplo,
} from '../../__tests__/fixturesDelDiagnostico';
import { armarPasos } from '../../utils/pasosDelRecorrido';
import { valoresIniciales } from '../../utils/respuestasEnEdicion';
import { claveDelBorrador } from '../../utils/borradorLocal';
import { RecorridoDelDiagnostico } from '../RecorridoDelDiagnostico';
import { botonDe, escribir, hayBoton, marcada, nodoDe, pasoQueSeVe, pulsar, textos, tocar, vaciar } from './ayudasDePrueba';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RESULTADO: ResultadoDeTerminar = {
  estado: 'COMPLETADO',
  objetivos: [
    { eje: 'CUERPO', texto: 'Bajar 8 kilos.' },
    { eje: 'TRABAJO', texto: 'Duplicar mis ventas.' },
  ],
  prioridad: 'TRABAJO',
  primeraAccion: 'Llamar a mi primer cliente.',
};

let raiz: ReactTestRenderer | null = null;
const onGuardarPaso = jest.fn<(r: RespuestaDelDiagnostico[], i: number) => Promise<void>>(async () => undefined);
const onTerminar = jest.fn<() => Promise<ResultadoDeTerminar>>(async () => RESULTADO);
const onSalir = jest.fn();
const onContinuar = jest.fn();

async function montar(extra: Partial<PropiedadesDelRecorrido> = {}, datos = diagnosticoDeEjemplo()): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(RecorridoDelDiagnostico, { datos, modo: 'persona', onGuardarPaso, onTerminar, onSalir, onContinuar, ...extra }),
    );
    await vaciar();
  });
  raiz = r;
  return r;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  onGuardarPaso.mockReset().mockImplementation(async () => undefined);
  onTerminar.mockReset().mockImplementation(async () => RESULTADO);
  onSalir.mockReset();
  onContinuar.mockReset();
  mockTacto.seleccion.mockReset();
  mockTacto.error.mockReset();
  mockAtrasDelSistema = null;
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

/** Un diagnóstico con TODO respondido salvo lo que se pase, para recorrerlo de punta a punta tocando solo «Siguiente». */
const completo = (conNegocio = false, extra: Partial<ReturnType<typeof diagnosticoDeEjemplo>> = {}) =>
  diagnosticoDeEjemplo({ respuestas: respuestasCompletas(conNegocio), ...extra });

async function atrasDelSistema() {
  await act(async () => {
    mockAtrasDelSistema?.();
    await vaciar();
  });
}

describe('la portada', () => {
  it('muestra el título, el mensaje línea por línea y «Empezar»; la barra de avance no la cuenta', async () => {
    const r = await montar();
    const t = textos(r);
    expect(t).toContain('Diagnóstico inicial');
    expect(t).toContain('Tiempo estimado: 15 minutos');
    expect(t).toContain('No buscamos respuestas perfectas. Buscamos respuestas verdaderas.');
    expect(pasoQueSeVe(r)).toBeNull();
    expect(hayBoton(r, 'EMPEZAR')).toBe(true);
  });

  it('«Empezar» lleva al paso 1 con la barra de avance', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    const total = armarPasos(seccionesDeEjemplo(), valoresIniciales(diagnosticoDeEjemplo())).length;
    expect(pasoQueSeVe(r)).toBe(`Paso 1 de ${total}, conociéndote`);
  });

  it('atrás en la portada llama a onSalir (flecha y gesto del sistema)', async () => {
    const r = await montar();
    await atrasDelSistema();
    expect(onSalir).toHaveBeenCalledTimes(1);
    await tocar(r, 'Salir del diagnóstico');
    expect(onSalir).toHaveBeenCalledTimes(2);
  });
});

describe('un paso', () => {
  it('trae de una a tres preguntas, la sección y la precarga para confirmarla', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    const t = textos(r);
    expect(t).toContain('Conociéndote');
    expect(t).toContain('Cuéntanos quién eres.');
    expect(t).toContain('¿Cuál es tu nombre completo?');
    expect(t).toContain('¿Qué edad tienes?');
    expect(t).toContain('¿En qué ciudad vives?');
    expect(t).not.toContain('¿A qué te dedicas?'); // esa va en el paso siguiente
    expect(nodoDe(r, '¿Cuál es tu nombre completo?').props.value).toBe('María Pérez');
    expect(nodoDe(r, '¿En qué ciudad vives?').props.value).toBe('Arequipa');
  });

  it('una obligatoria sin responder marca ESA pregunta, baja hasta ella y no manda nada', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    await pulsar(r, 'SIGUIENTE'); // falta la edad
    expect(textos(r)).toContain('Escribe un número para continuar.');
    expect(onGuardarPaso).not.toHaveBeenCalled();
    expect(mockTacto.error).toHaveBeenCalled();
    // El nombre y la ciudad vienen precargados: solo la edad queda marcada.
    expect(textos(r).match(/para continuar/g)).toHaveLength(1);
  });

  it('el mensaje se va al corregir la pregunta', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    await pulsar(r, 'SIGUIENTE');
    await escribir(r, '¿Qué edad tienes?', '34');
    expect(textos(r)).not.toContain('Escribe un número para continuar.');
  });

  it('un número solo acepta números', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    await escribir(r, '¿Qué edad tienes?', '3a4');
    expect(nodoDe(r, '¿Qué edad tienes?').props.value).toBe('34');
  });

  it('guarda el paso entero y avanza al siguiente, guardando el paso al que llega', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    await escribir(r, '¿Qué edad tienes?', '34');
    await pulsar(r, 'SIGUIENTE');
    expect(onGuardarPaso).toHaveBeenCalledTimes(1);
    const [respuestas, paso] = onGuardarPaso.mock.calls[0];
    expect(paso).toBe(1);
    expect(respuestas).toEqual([
      respuestaTexto(P.nombre, 'María Pérez'),
      { preguntaId: P.edad, valorTexto: null, valorNumero: 34, valorBooleano: null, valorEscala: null, valorJson: null },
      respuestaTexto(P.ciudad, 'Arequipa'),
    ]);
    expect(textos(r)).toContain('¿A qué te dedicas?');
    expect(pasoQueSeVe(r)).toContain('Paso 2 de');
  });

  it('una opcional vacía se manda con todo en null (borra la anterior) y deja avanzar', async () => {
    const r = await montar(undefined, completo());
    await pulsar(r, 'EMPEZAR');
    await pulsar(r, 'SIGUIENTE');
    await pulsar(r, 'SIGUIENTE'); // «¿A qué te dedicas?», opcional y vacía
    const [respuestas] = onGuardarPaso.mock.calls[1];
    expect(respuestas).toEqual([{ preguntaId: P.dedica, valorTexto: null, valorNumero: null, valorBooleano: null, valorEscala: null, valorJson: null }]);
    expect(pasoQueSeVe(r)).toContain('Paso 3 de');
  });
});

describe('guardar de verdad', () => {
  it('si el servidor falla, se queda en el paso con lo escrito, lo dice y deja reintentar', async () => {
    onGuardarPaso.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    await escribir(r, '¿Qué edad tienes?', '34');
    await pulsar(r, 'SIGUIENTE');
    expect(textos(r)).toContain('No se pudo guardar. Revisa tu conexión.');
    expect(pasoQueSeVe(r)).toContain('Paso 1 de');
    expect(nodoDe(r, '¿Qué edad tienes?').props.value).toBe('34');

    await tocar(r, 'Reintentar');
    expect(onGuardarPaso).toHaveBeenCalledTimes(2);
    expect(textos(r)).not.toContain('No se pudo guardar');
    expect(pasoQueSeVe(r)).toContain('Paso 2 de');
  });

  it('un doble toque en «Siguiente» manda un solo pedido', async () => {
    let terminar!: () => void;
    onGuardarPaso.mockImplementationOnce(() => new Promise<void>(res => { terminar = res; }));
    const r = await montar(undefined, completo());
    await pulsar(r, 'EMPEZAR');
    await act(async () => {
      botonDe(r, 'SIGUIENTE').props.onPress();
      botonDe(r, 'SIGUIENTE').props.onPress();
      await vaciar();
    });
    expect(onGuardarPaso).toHaveBeenCalledTimes(1);
    await act(async () => {
      terminar();
      await vaciar();
    });
    expect(pasoQueSeVe(r)).toContain('Paso 2 de');
  });
});

describe('preguntas condicionales', () => {
  async function hastaElNegocio(r: ReactTestRenderer) {
    await pulsar(r, 'EMPEZAR');
    await pulsar(r, 'SIGUIENTE'); // nombre, edad, ciudad
    await pulsar(r, 'SIGUIENTE'); // dedica
    await pulsar(r, 'SIGUIENTE'); // cuadrícula
  }

  it('con «Sí.» aparecen las preguntas del negocio; con «No.» se saltan sin pasos vacíos', async () => {
    const conSi = await montar(undefined, completo(true));
    await hastaElNegocio(conSi);
    // Paso del sueño y del negocio (una pregunta de «Sí.» y otra después).
    expect(textos(conSi)).toContain('¿Cuántas horas duermes?');
    const totalConSi = armarPasos(seccionesDeEjemplo(), valoresIniciales(completo(true))).length;
    expect(pasoQueSeVe(conSi)).toContain(`de ${totalConSi},`);
    act(() => conSi.unmount());

    const conNo = await montar(undefined, completo(false));
    await hastaElNegocio(conNo);
    await pulsar(conNo, 'SIGUIENTE');
    expect(textos(conNo)).not.toContain('¿A qué se dedica tu negocio?');
    expect(textos(conNo)).toContain('¿Qué haces cuando no actúas?');
  });

  it('contestar «Sí.» en el paso agrega los pasos del negocio sin cambiar el paso donde se está', async () => {
    const r = await montar(undefined, diagnosticoDeEjemplo({ respuestas: respuestasCompletas(false).filter(x => x.preguntaId !== P.tieneNegocio) }));
    await pulsar(r, 'EMPEZAR');
    await pulsar(r, 'SIGUIENTE');
    await pulsar(r, 'SIGUIENTE');
    await pulsar(r, 'SIGUIENTE');
    expect(textos(r)).toContain('¿Tienes un negocio que ya genera ventas?');
    const antes = pasoQueSeVe(r);
    await tocar(r, 'Sí.');
    // El paso en que se está no cambió de contenido, y el total creció.
    expect(textos(r)).toContain('¿Tienes un negocio que ya genera ventas?');
    expect(pasoQueSeVe(r)).not.toBe(antes);
    expect(pasoQueSeVe(r)).toContain('Paso 4 de');
  });
});

describe('tipos de pregunta', () => {
  async function enElPasoDe(texto: string, r: ReactTestRenderer) {
    await pulsar(r, 'EMPEZAR');
    for (let i = 0; i < 30 && !textos(r).includes(texto); i++) await pulsar(r, 'SIGUIENTE');
    expect(textos(r)).toContain(texto);
  }

  it('casillas con máximo: la tercera no se marca y un texto breve lo dice', async () => {
    const sinElegir = diagnosticoDeEjemplo({ respuestas: respuestasCompletas(false).filter(x => x.preguntaId !== P.queHaces) });
    const r = await montar(undefined, sinElegir);
    await enElPasoDe('¿Qué haces cuando no actúas?', r);
    expect(textos(r)).toContain('Puedes elegir hasta 2.');
    await tocar(r, 'Postergo');
    await tocar(r, 'Dudo');
    await tocar(r, 'Me distraigo');
    expect(marcada(r, 'Postergo')).toBe(true);
    expect(marcada(r, 'Dudo')).toBe(true);
    expect(marcada(r, 'Me distraigo')).toBe(false);
    expect(textos(r)).toContain('Elige como máximo 2');
    // Quitar una deja marcar otra, y el aviso vuelve a ser el de siempre.
    await tocar(r, 'Postergo');
    expect(textos(r)).not.toContain('Elige como máximo 2');
    await tocar(r, 'Me distraigo');
    expect(marcada(r, 'Me distraigo')).toBe(true);
  });

  it('la cuadrícula muestra cada fila con su escala y no avanza hasta responder todas', async () => {
    const r = await montar(undefined, diagnosticoDeEjemplo({ respuestas: respuestasCompletas(false).filter(x => x.preguntaId !== P.satisfaccion) }));
    await enElPasoDe('¿Qué tan satisfecho(a) estás con cada área?', r);
    const t = textos(r);
    expect(t).toContain('Mi salud');
    expect(t).toContain('Mi propósito');
    expect(t).toContain('1 · Muy insatisfecho(a)');
    expect(t).toContain('5 · Muy satisfecho(a)');
    expect(t).toContain('0 de 7 respondidas');

    await tocar(r, 'Mi salud: 4');
    expect(textos(r)).toContain('1 de 7 respondidas');
    await pulsar(r, 'SIGUIENTE');
    expect(textos(r)).toContain('Responde todas las filas para continuar.');
    expect(onGuardarPaso).toHaveBeenCalledTimes(2); // solo los pasos anteriores

    for (const fila of ['Mis relaciones', 'Mi dinero', 'Mi trabajo', 'Mi crecimiento', 'Mi descanso', 'Mi propósito']) {
      await tocar(r, `${fila}: 3`);
    }
    expect(textos(r)).toContain('7 de 7 respondidas');
    await pulsar(r, 'SIGUIENTE');
    const ultima = onGuardarPaso.mock.calls[onGuardarPaso.mock.calls.length - 1][0][0];
    expect(JSON.parse(ultima.valorJson as string)['Mi salud']).toBe(4);
  });

  it('el párrafo que alimenta un objetivo muestra su contador y no deja pasarse', async () => {
    const r = await montar(undefined, completo());
    await enElPasoDe('En salud…', r);
    expect(textos(r)).toContain('Bajar 8 kilos.'.length + ' / 500');
    expect(nodoDe(r, 'En salud…').props.maxLength).toBe(500);
  });

  it('el consentimiento muestra la declaración sobre la casilla y no deja terminar sin marcarla', async () => {
    const sinConsentir = diagnosticoDeEjemplo({ respuestas: respuestasCompletas(false).filter(x => x.preguntaId !== P.consentimiento) });
    const r = await montar(undefined, sinConsentir);
    await enElPasoDe('Declaración de responsabilidad y consentimiento', r);
    expect(textos(r)).toContain('Declaro que mis respuestas son verdaderas');
    expect(hayBoton(r, 'TERMINAR')).toBe(true);
    await pulsar(r, 'TERMINAR');
    expect(textos(r)).toContain('Marca la casilla para continuar.');
    expect(onTerminar).not.toHaveBeenCalled();
    expect(marcada(r, 'He leído y acepto la declaración')).toBe(false);

    await tocar(r, 'He leído y acepto la declaración');
    expect(marcada(r, 'He leído y acepto la declaración')).toBe(true);
    await pulsar(r, 'TERMINAR');
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });
});

describe('terminar y el cierre', () => {
  async function hastaElFinal(r: ReactTestRenderer) {
    await pulsar(r, 'EMPEZAR');
    for (let i = 0; i < 30 && !hayBoton(r, 'TERMINAR'); i++) await pulsar(r, 'SIGUIENTE');
  }

  it('recorre todo guardando cada paso (el que sigue; en el último, ese mismo) y termina', async () => {
    const r = await montar(undefined, completo());
    await hastaElFinal(r);
    const total = armarPasos(seccionesDeEjemplo(), valoresIniciales(completo())).length;
    expect(onGuardarPaso).toHaveBeenCalledTimes(total - 1);
    await pulsar(r, 'TERMINAR');
    expect(onGuardarPaso).toHaveBeenCalledTimes(total);
    expect(onGuardarPaso.mock.calls.map(c => c[1])).toEqual([...Array.from({ length: total - 1 }, (_, i) => i + 1), total - 1]);
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it('el cierre dice que los objetivos están preparados, los lista con la prioridad primero y qué sigue', async () => {
    const r = await montar(undefined, completo());
    await hastaElFinal(r);
    await pulsar(r, 'TERMINAR');
    const t = textos(r);
    expect(t).toContain('Tus objetivos ya están preparados');
    expect(t.indexOf('Duplicar mis ventas.')).toBeLessThan(t.indexOf('Bajar 8 kilos.'));
    expect(t).toContain('Negocio y dinero · tu prioridad principal');
    expect(t).toContain('Llamar a mi primer cliente.');
    expect(t).toContain('Términos');
    expect(pasoQueSeVe(r)).toBeNull();

    await pulsar(r, 'CONTINUAR');
    expect(onContinuar).toHaveBeenCalledTimes(1);
  });

  it('sin objetivos preparados dice que los escribirá en Plan; el texto de «qué sigue» y el botón se pueden cambiar', async () => {
    onTerminar.mockResolvedValueOnce({ estado: 'COMPLETADO', objetivos: [], prioridad: null, primeraAccion: null });
    const r = await montar({ textoQueSigue: 'Revisa Plan.', etiquetaContinuar: 'Ir a Plan' }, completo());
    await hastaElFinal(r);
    await pulsar(r, 'TERMINAR');
    expect(textos(r)).toContain('Los escribirás en Plan.');
    expect(textos(r)).toContain('Revisa Plan.');
    expect(hayBoton(r, 'IR A PLAN')).toBe(true);
  });

  it('si no se pudo terminar, lo dice y deja reintentar sin perder nada', async () => {
    onTerminar.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    const r = await montar(undefined, completo());
    await hastaElFinal(r);
    await pulsar(r, 'TERMINAR');
    expect(textos(r)).toContain('No se pudo terminar. Revisa tu conexión.');
    expect(hayBoton(r, 'TERMINAR')).toBe(true);
    await tocar(r, 'Reintentar');
    expect(onTerminar).toHaveBeenCalledTimes(2);
    expect(textos(r)).toContain('Tus objetivos ya están preparados');
  });

  it('un DIAGNOSTICO_INCOMPLETO del servidor lleva al paso de la primera pregunta que falta y la marca', async () => {
    onTerminar.mockRejectedValueOnce(new ApiError(400, 'Falta responder', { codigo: 'DIAGNOSTICO_INCOMPLETO', faltan: [P.relaciones, P.riqueza] }));
    const r = await montar(undefined, completo());
    await hastaElFinal(r);
    await pulsar(r, 'TERMINAR');
    expect(textos(r)).toContain('En relaciones, en {duracion} quiero haber conseguido…');
    expect(textos(r)).toContain('Responde esta pregunta para continuar.');
    expect(textos(r)).not.toContain('Tus objetivos ya están preparados');
  });

  it('un DIAGNOSTICO_INCOMPLETO con preguntas que no se muestran no deja atrapada a la persona', async () => {
    onTerminar.mockRejectedValueOnce(new ApiError(400, 'Falta', { codigo: 'DIAGNOSTICO_INCOMPLETO', faltan: [999] }));
    const r = await montar(undefined, completo());
    await hastaElFinal(r);
    await pulsar(r, 'TERMINAR');
    expect(textos(r)).toContain('Todavía falta responder algo. Vuelve atrás y revísalo.');
    await atrasDelSistema();
    expect(pasoQueSeVe(r)).toContain('Paso');
  });
});

describe('atrás', () => {
  it('sube un paso por vez, en el primero vuelve a la portada y de ahí sale', async () => {
    const r = await montar(undefined, completo());
    await pulsar(r, 'EMPEZAR');
    await pulsar(r, 'SIGUIENTE');
    expect(pasoQueSeVe(r)).toContain('Paso 2 de');
    await atrasDelSistema();
    expect(pasoQueSeVe(r)).toContain('Paso 1 de');
    await atrasDelSistema();
    expect(pasoQueSeVe(r)).toBeNull();
    expect(textos(r)).toContain('Tiempo estimado: 15 minutos');
    expect(onSalir).not.toHaveBeenCalled();
    await atrasDelSistema();
    expect(onSalir).toHaveBeenCalledTimes(1);
  });

  it('volver no pierde lo escrito ni manda nada al servidor', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    await escribir(r, '¿Qué edad tienes?', '41');
    await pulsar(r, 'SIGUIENTE');
    onGuardarPaso.mockClear();
    await atrasDelSistema();
    expect(nodoDe(r, '¿Qué edad tienes?').props.value).toBe('41');
    expect(onGuardarPaso).not.toHaveBeenCalled();
  });

  it('desde el cierre, atrás es «Continuar»: no se vuelve a los pasos', async () => {
    const r = await montar(undefined, completo());
    await pulsar(r, 'EMPEZAR');
    for (let i = 0; i < 30 && !hayBoton(r, 'TERMINAR'); i++) await pulsar(r, 'SIGUIENTE');
    await pulsar(r, 'TERMINAR');
    await atrasDelSistema();
    expect(onContinuar).toHaveBeenCalledTimes(1);
  });
});

describe('retomar', () => {
  it('arranca en el paso guardado, sin portada, con todo lo respondido', async () => {
    const datos = completo(true, { paso: 3, estado: 'EN_CURSO' });
    const r = await montar(undefined, datos);
    const total = armarPasos(seccionesDeEjemplo(), valoresIniciales(datos)).length;
    expect(pasoQueSeVe(r)).toBe(`Paso 4 de ${total}, tu vida hoy`);
    expect(textos(r)).not.toContain('Tiempo estimado');
  });

  it('un paso guardado de más se acota al último', async () => {
    const r = await montar(undefined, completo(false, { paso: 99 }));
    const total = armarPasos(seccionesDeEjemplo(), valoresIniciales(completo(false))).length;
    expect(pasoQueSeVe(r)).toContain(`Paso ${total} de ${total}`);
    expect(hayBoton(r, 'TERMINAR')).toBe(true);
  });
});

describe('borrador local', () => {
  const esperar = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

  it('lo escrito en el paso se guarda en el teléfono por usuario y versión, y vuelve al reabrir', async () => {
    const r = await montar({ usuarioId: 'u-7' });
    await pulsar(r, 'EMPEZAR');
    await escribir(r, '¿Qué edad tienes?', '52');
    await act(async () => {
      await esperar(700);
    });
    const crudo = await AsyncStorage.getItem(claveDelBorrador('u-7', 3));
    expect(crudo).not.toBeNull();
    expect(JSON.parse(crudo as string).respuestas.some((x: RespuestaDelDiagnostico) => x.valorNumero === 52)).toBe(true);
    act(() => r.unmount());

    // «Cerró la app»: otro montaje con la misma cuenta recupera lo escrito y NO muestra la portada.
    const otra = await montar({ usuarioId: 'u-7' });
    await act(async () => {
      await vaciar();
    });
    expect(nodoDe(otra, '¿Qué edad tienes?').props.value).toBe('52');
    expect(pasoQueSeVe(otra)).toContain('Paso 1 de');

    // Otra cuenta no lo ve.
    act(() => otra.unmount());
    const ajena = await montar({ usuarioId: 'u-8' });
    expect(textos(ajena)).toContain('Tiempo estimado');
  });

  it('se borra al guardar el paso y no se escribe nada en la vista previa', async () => {
    const r = await montar({ usuarioId: 'u-7' });
    await pulsar(r, 'EMPEZAR');
    await escribir(r, '¿Qué edad tienes?', '52');
    await pulsar(r, 'SIGUIENTE'); // guarda el paso en el servidor y borra el borrador
    await act(async () => {
      await esperar(700);
    });
    expect(await AsyncStorage.getItem(claveDelBorrador('u-7', 3))).toBeNull();
    act(() => r.unmount());

    const vista = await montar({ usuarioId: 'u-7', modo: 'vistaPrevia' });
    await pulsar(vista, 'EMPEZAR');
    await escribir(vista, '¿Qué edad tienes?', '60');
    await act(async () => {
      await esperar(700);
    });
    expect(await AsyncStorage.getItem(claveDelBorrador('u-7', 3))).toBeNull();
  });
});

describe('vista previa de Administración', () => {
  it('recorre sin guardar ni terminar nada y el último botón cierra con onSalir', async () => {
    const r = await montar({ modo: 'vistaPrevia' }, completo());
    await pulsar(r, 'EMPEZAR');
    for (let i = 0; i < 30 && !hayBoton(r, 'CERRAR VISTA PREVIA'); i++) await pulsar(r, 'SIGUIENTE');
    expect(onGuardarPaso).not.toHaveBeenCalled();
    expect(hayBoton(r, 'TERMINAR')).toBe(false);
    await pulsar(r, 'CERRAR VISTA PREVIA');
    expect(onSalir).toHaveBeenCalledTimes(1);
    expect(onTerminar).not.toHaveBeenCalled();
  });

  it('muestra cómo se ve lo obligatorio: no deja pasar un paso sin responder', async () => {
    const r = await montar({ modo: 'vistaPrevia' });
    await pulsar(r, 'EMPEZAR');
    await pulsar(r, 'SIGUIENTE');
    expect(textos(r)).toContain('Escribe un número para continuar.');
  });
});

describe('bajar hasta la pregunta que falta', () => {
  it('le pide al scroll del marco que baje hasta la pregunta con el error', async () => {
    const r = await montar();
    await pulsar(r, 'EMPEZAR');
    const scrollTo = (r.root.findAll(n => (n.type as unknown) === ScrollView)[0].instance as { scrollTo: jest.Mock }).scrollTo;

    // Cada pregunta avisa dónde quedó (la altura que mide en el paso); la edad está a media altura.
    const conLayout = r.root.findAll(
      n => typeof n.props.onLayout === 'function' && n.findAll(m => m.props.accessibilityLabel === '¿Qué edad tienes?').length > 0,
    );
    const edad = conLayout[conLayout.length - 1]; // el más profundo: la pregunta, no el scroll del marco
    expect(edad).toBeDefined();
    await act(async () => {
      edad.props.onLayout({ nativeEvent: { layout: { x: 0, y: 180, width: 300, height: 90 } } });
      await vaciar();
    });
    scrollTo.mockClear();
    await pulsar(r, 'SIGUIENTE');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ y: 176 });
  });

  it('si el error está en un paso al que se vuelve, baja cuando la pregunta ya se midió', async () => {
    onTerminar.mockRejectedValueOnce(new ApiError(400, 'Falta', { codigo: 'DIAGNOSTICO_INCOMPLETO', faltan: [P.edad] }));
    const r = await montar(undefined, completo());
    await pulsar(r, 'EMPEZAR');
    for (let i = 0; i < 30 && !hayBoton(r, 'TERMINAR'); i++) await pulsar(r, 'SIGUIENTE');
    await pulsar(r, 'TERMINAR');
    // Está en el paso de la edad, marcada; la altura llega con el dibujado del paso y ahí se baja.
    expect(textos(r)).toContain('Responde esta pregunta para continuar.');
    const scrollTo = (r.root.findAll(n => (n.type as unknown) === ScrollView)[0].instance as { scrollTo: jest.Mock }).scrollTo;
    scrollTo.mockClear();
    const conLayout = r.root.findAll(
      n => typeof n.props.onLayout === 'function' && n.findAll(m => m.props.accessibilityLabel === '¿Qué edad tienes?').length > 0,
    );
    await act(async () => {
      conLayout[conLayout.length - 1].props.onLayout({ nativeEvent: { layout: { x: 0, y: 90, width: 300, height: 90 } } });
      await vaciar();
    });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0]).toMatchObject({ y: 86 });
  });
});
