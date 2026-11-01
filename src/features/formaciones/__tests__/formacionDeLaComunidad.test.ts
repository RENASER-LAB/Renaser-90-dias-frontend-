import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FormacionPorElegirError,
  MENSAJE_ELEGIR_PARA_CREAR,
  MENSAJE_ELEGIR_PARA_PUBLICAR,
  agregarLaFormacion,
  claveDeLaEleccion,
  conLaFormacion,
  darPorLeidaLaEleccion,
  eleccionValida,
  elegirFormacionDeLaComunidad,
  estadoDeLaFormacionDeLaComunidad,
  fijarLaEleccionRecordada,
  formacionDeLaLectura,
  formacionDelCuerpo,
  hayQueElegirParaCrear,
  leerLaEleccionRecordada,
  prepararLaFormacionDeLaComunidad,
  reiniciarLaFormacionDeLaComunidad,
  suscribirseALaFormacionDeLaComunidad,
} from '../estado/formacionDeLaComunidad';

beforeEach(async () => {
  reiniciarLaFormacionDeLaComunidad();
  await AsyncStorage.clear();
});

describe('agregar la formación a una ruta', () => {
  it('sin código devuelve la ruta tal cual, carácter por carácter', () => {
    expect(agregarLaFormacion('/api/v1/wall', null)).toBe('/api/v1/wall');
    expect(agregarLaFormacion('/api/v1/wall?cursor=a', undefined)).toBe('/api/v1/wall?cursor=a');
    expect(agregarLaFormacion('/api/v1/wall', '')).toBe('/api/v1/wall');
  });

  it('con código usa ? o & según la ruta ya tenga consulta', () => {
    expect(agregarLaFormacion('/api/v1/cursos', 'DIPLOMADO')).toBe('/api/v1/cursos?formation=DIPLOMADO');
    expect(agregarLaFormacion('/api/v1/wall?cursor=a%20b', 'CERTIFICACION')).toBe('/api/v1/wall?cursor=a%20b&formation=CERTIFICACION');
  });
});

describe('quién manda la formación (FR-050)', () => {
  it('una cuenta que NO ve todas no manda nada, aunque alguien intente elegir', () => {
    prepararLaFormacionDeLaComunidad('aprendiz-1', false);
    elegirFormacionDeLaComunidad('DIPLOMADO');
    expect(estadoDeLaFormacionDeLaComunidad()).toMatchObject({ veTodas: false, eleccion: null, listo: true });
    expect(formacionDeLaLectura()).toBeNull();
    expect(conLaFormacion('/api/v1/wall')).toBe('/api/v1/wall');
    expect(formacionDelCuerpo()).toEqual({});
    expect(hayQueElegirParaCrear()).toBe(false);
  });

  it('sin sesión tampoco', () => {
    prepararLaFormacionDeLaComunidad(null, true);
    expect(estadoDeLaFormacionDeLaComunidad()).toMatchObject({ veTodas: false, eleccion: null, cuenta: null });
    expect(formacionDeLaLectura()).toBeNull();
  });

  it('quien ve todas lee «Todas» hasta que elige: sin código en la lectura y sin poder crear', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    expect(estadoDeLaFormacionDeLaComunidad()).toMatchObject({ veTodas: true, eleccion: null, listo: false });
    fijarLaEleccionRecordada('admin-1', null);
    expect(estadoDeLaFormacionDeLaComunidad().listo).toBe(true);
    expect(formacionDeLaLectura()).toBeNull();
    expect(hayQueElegirParaCrear()).toBe(true);
  });

  it('con una formación elegida, las lecturas y lo que se crea llevan ese código', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    fijarLaEleccionRecordada('admin-1', null);
    elegirFormacionDeLaComunidad('DIPLOMADO');
    expect(formacionDeLaLectura()).toBe('DIPLOMADO');
    expect(conLaFormacion('/api/v1/calendar/events?from=a&to=b')).toBe('/api/v1/calendar/events?from=a&to=b&formation=DIPLOMADO');
    expect(formacionDelCuerpo()).toEqual({ formation: 'DIPLOMADO' });
    expect(hayQueElegirParaCrear()).toBe(false);
  });
});

describe('crear con «Todas» elegida', () => {
  it('lanza en vez de mandar nada, con el texto de publicar o de crear', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    fijarLaEleccionRecordada('admin-1', null);
    expect(() => formacionDelCuerpo()).toThrow(FormacionPorElegirError);
    expect(() => formacionDelCuerpo(MENSAJE_ELEGIR_PARA_PUBLICAR)).toThrow('Elige una formación arriba para publicar.');
    expect(() => formacionDelCuerpo()).toThrow(MENSAJE_ELEGIR_PARA_CREAR);
    expect(MENSAJE_ELEGIR_PARA_CREAR).toBe('Elige una formación arriba para crear.');
  });
});

describe('la elección se recuerda por cuenta', () => {
  it('elegir la guarda en el teléfono y «Todas» la borra', async () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    fijarLaEleccionRecordada('admin-1', null);
    elegirFormacionDeLaComunidad('CERTIFICACION');
    await Promise.resolve();
    expect(await leerLaEleccionRecordada('admin-1')).toBe('CERTIFICACION');
    expect(await AsyncStorage.getItem(claveDeLaEleccion('admin-1'))).toBe('CERTIFICACION');
    elegirFormacionDeLaComunidad(null);
    await Promise.resolve();
    expect(await leerLaEleccionRecordada('admin-1')).toBeNull();
  });

  it('lo recordado vuelve al entrar, pero solo si es una formación que la cuenta puede elegir', () => {
    expect(eleccionValida('DIPLOMADO', ['ESCUELA', 'DIPLOMADO', 'CERTIFICACION'])).toBe('DIPLOMADO');
    expect(eleccionValida('OTRA', ['ESCUELA', 'DIPLOMADO'])).toBeNull();
    expect(eleccionValida(42, ['ESCUELA'])).toBeNull();
    expect(eleccionValida(null, ['ESCUELA'])).toBeNull();
  });

  it('lo recordado no pisa lo que la persona ya eligió, ni vale para otra cuenta', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    fijarLaEleccionRecordada('admin-1', 'ESCUELA');
    elegirFormacionDeLaComunidad('DIPLOMADO');
    fijarLaEleccionRecordada('admin-1', 'CERTIFICACION'); // llegó tarde: ya estaba lista
    expect(estadoDeLaFormacionDeLaComunidad().eleccion).toBe('DIPLOMADO');

    prepararLaFormacionDeLaComunidad('admin-2', true);
    expect(estadoDeLaFormacionDeLaComunidad()).toMatchObject({ cuenta: 'admin-2', eleccion: null, listo: false });
    fijarLaEleccionRecordada('admin-1', 'ESCUELA'); // una lectura vieja de la cuenta anterior
    expect(estadoDeLaFormacionDeLaComunidad().eleccion).toBeNull();
  });

  it('si la lectura del teléfono falla, se sigue con «Todas» y no se queda esperando', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    expect(estadoDeLaFormacionDeLaComunidad().listo).toBe(false);
    darPorLeidaLaEleccion('admin-1');
    expect(estadoDeLaFormacionDeLaComunidad()).toMatchObject({ listo: true, eleccion: null });
  });

  it('volver a preparar la misma cuenta conserva lo elegido (la sesión se releyó)', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    fijarLaEleccionRecordada('admin-1', null);
    elegirFormacionDeLaComunidad('DIPLOMADO');
    prepararLaFormacionDeLaComunidad('admin-1', true);
    expect(estadoDeLaFormacionDeLaComunidad().eleccion).toBe('DIPLOMADO');
  });

  it('avisa a quien escucha solo cuando cambia algo', () => {
    prepararLaFormacionDeLaComunidad('admin-1', true);
    fijarLaEleccionRecordada('admin-1', null);
    const oyente = jest.fn();
    const soltar = suscribirseALaFormacionDeLaComunidad(oyente);
    elegirFormacionDeLaComunidad('DIPLOMADO');
    elegirFormacionDeLaComunidad('DIPLOMADO');
    expect(oyente).toHaveBeenCalledTimes(1);
    soltar();
    elegirFormacionDeLaComunidad(null);
    expect(oyente).toHaveBeenCalledTimes(1);
  });
});
