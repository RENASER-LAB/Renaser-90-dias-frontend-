/** Spec 048, fase 3 (FR-015, FR-016, FR-019, P9): lo que no se aplicó no se pierde en silencio y no deja historial. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import {
  agregarAviso,
  avisarSinPuntos,
  borrarAvisos,
  descartarAvisos,
  esCodigoDeNoAplicado,
  leerAvisos,
  motivoDeNoAplicado,
  suscribirAvisos,
} from '../avisosDeLoNoAplicado';
import { cuandoLoHiciste, textoDeLosAvisosDelGlobo, tituloDeLaHoja } from '../utils/textoDeLosAvisos';

const AVISO = {
  id: 'a1',
  tipo: 'no-aplicado' as const,
  etiqueta: 'Tu cierre del día',
  hechoEn: '2026-11-10T02:40:00.000Z',
  codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR',
  motivo: 'Esto cambió en tu cuenta después de que lo hiciste sin conexión. Se quedó lo más nuevo.',
  texto: 'Hoy avancé con la propuesta',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('avisos de lo que no se aplicó (spec 048 fase 3)', () => {
  it('se guardan por cuenta con el texto que la persona escribió', async () => { // spec 048 FR-019
    await agregarAviso('ana', AVISO);
    expect(await leerAvisos('ana')).toEqual([AVISO]);
    expect(await leerAvisos('luis')).toEqual([]);
  });

  it('un mismo envío no avisa dos veces', async () => { // spec 048 FR-019
    await agregarAviso('ana', AVISO);
    await agregarAviso('ana', { ...AVISO, motivo: 'otro' });
    expect(await leerAvisos('ana')).toHaveLength(1);
  });

  it('al verse se quitan: no hay historial (P9) y cerrar sesión los borra', async () => { // spec 048 FR-019
    await agregarAviso('ana', AVISO);
    await descartarAvisos('ana');
    expect(await leerAvisos('ana')).toEqual([]);
    await agregarAviso('ana', AVISO);
    await borrarAvisos('ana');
    expect(await leerAvisos('ana')).toEqual([]);
  });

  it('avisa a quien escucha cuando llega uno', async () => { // spec 048 FR-019
    const oyente = jest.fn();
    const quitar = suscribirAvisos(oyente);
    await agregarAviso('ana', AVISO);
    quitar();
    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it('un hábito que llegó sin puntos dice por qué (FR-015)', async () => { // spec 048 FR-015
    await avisarSinPuntos('ana', { idCliente: 'e1', etiqueta: 'Un hábito', hechoEn: AVISO.hechoEn, motivoSinPuntos: 'LLEGO_DESPUES_DE_48_H' });
    const [aviso] = await leerAvisos('ana');
    expect(aviso.tipo).toBe('sin-puntos');
    expect(aviso.motivo).toMatch(/48 horas/);
  });

  it('reconoce los cinco códigos y usa el texto del servidor o el de la app', () => { // spec 048 FR-019
    for (const c of ['CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR', 'YA_ESTABA_HECHO', 'RECURSO_YA_NO_EXISTE', 'FUERA_DE_SU_DIA', 'MI_RADAR_NO_APLICA']) {
      expect(esCodigoDeNoAplicado(c)).toBe(true);
    }
    expect(esCodigoDeNoAplicado('ALREADY_PLANNED')).toBe(false);
    expect(motivoDeNoAplicado('YA_ESTABA_HECHO', 'Lo dice el servidor.')).toBe('Lo dice el servidor.');
    expect(motivoDeNoAplicado('YA_ESTABA_HECHO', null)).toMatch(/ya estaba hecho/i);
  });

  it('el globo dice «1 cosa no se aplicó» y la hoja sabe qué título poner', () => { // spec 048 FR-019
    expect(textoDeLosAvisosDelGlobo([])).toBeNull();
    expect(textoDeLosAvisosDelGlobo([AVISO])).toBe('1 cosa no se aplicó');
    expect(textoDeLosAvisosDelGlobo([AVISO, { ...AVISO, id: 'b' }])).toBe('2 cosas no se aplicaron');
    expect(textoDeLosAvisosDelGlobo([{ tipo: 'sin-puntos' }])).toBe('1 cosa quedó sin puntos');
    expect(tituloDeLaHoja([{ tipo: 'sin-puntos' }])).toBe('Quedó sin puntos');
    expect(tituloDeLaHoja([AVISO])).toBe('Esto no se aplicó');
  });

  it('dice cuándo lo hiciste, en hora del teléfono', () => {
    const hecho = new Date(2026, 10, 9, 21, 40).toISOString();
    expect(cuandoLoHiciste(hecho, new Date(2026, 10, 9, 23, 0))).toBe('Lo hiciste hoy a las 21:40');
    expect(cuandoLoHiciste(hecho, new Date(2026, 10, 10, 8, 0))).toBe('Lo hiciste el 9/11 a las 21:40');
  });
});
