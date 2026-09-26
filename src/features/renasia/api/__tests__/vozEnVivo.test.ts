import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../config/apiConfig', () => ({ API_CONFIG: { BASE_URL: 'http://10.0.2.2:8080' } }));

import { leerEventoEnVivo, urlDeVozEnVivo } from '../vozEnVivo';

describe('urlDeVozEnVivo', () => {
  it('pasa de http a ws y de https a wss', () => {
    expect(urlDeVozEnVivo()).toBe('ws://10.0.2.2:8080/api/v1/renasia/voz/en-vivo');
    expect(urlDeVozEnVivo('https://api.renaser.pe/')).toBe('wss://api.renaser.pe/api/v1/renasia/voz/en-vivo');
  });
});

describe('leerEventoEnVivo', () => {
  it('lee los eventos del contrato', () => {
    expect(leerEventoEnVivo('{"tipo":"listo","segundosRestantes":540}')).toEqual({
      tipo: 'listo',
      segundosRestantes: 540,
    });
    expect(leerEventoEnVivo('{"tipo":"dicho","texto":"Hola"}')).toEqual({ tipo: 'dicho', texto: 'Hola' });
    expect(leerEventoEnVivo('{"tipo":"interrumpido"}')).toEqual({ tipo: 'interrumpido' });
    expect(
      leerEventoEnVivo('{"tipo":"propuesta","id":"p1","resumen":"Mover Leer","venceEn":"2026-09-24T20:00:00Z"}')
    ).toEqual({ tipo: 'propuesta', id: 'p1', resumen: 'Mover Leer', venceEn: '2026-09-24T20:00:00Z' });
  });

  it('lee el pedido de foto de un hábito (evento evidencia, 2026-09-26)', () => {
    expect(
      leerEventoEnVivo('{"tipo":"evidencia","registroId":"r-1","titulo":"Ducha fría","venceEn":"2026-09-26T23:00:00Z"}')
    ).toEqual({ tipo: 'evidencia', registroId: 'r-1', titulo: 'Ducha fría', venceEn: '2026-09-26T23:00:00Z' });
    expect(leerEventoEnVivo('{"tipo":"evidencia","registroId":"r-1"}')).toBeNull();
  });

  it('ignora lo desconocido o mal formado en vez de romper', () => {
    expect(leerEventoEnVivo('{"tipo":"nuevo"}')).toBeNull();
    expect(leerEventoEnVivo('{"tipo":"dicho"}')).toBeNull();
    expect(leerEventoEnVivo('no es json')).toBeNull();
  });
});
