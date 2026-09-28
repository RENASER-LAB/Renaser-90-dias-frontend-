import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import {
  confirmarImagen,
  consultaDeLaLista,
  ejecutarAccion,
  guardarChecklist,
  confirmarFondo,
  guardarContenidoDeLaCaja,
  leerCaja,
  leerFondoDeLaCarta,
  leerMiCaja,
  listarCajas,
  marcarEntregada,
  marcarEnviada,
  pedirSubidaDeImagen,
  reportarProblema,
  volverAlFondoOriginal,
} from '../cajaApi';

/** El contrato de la Caja Renaser (spec §9), tal como lo usa la app: rutas, métodos y cuerpos. */

const DETALLE = { aprendizId: 'a-1', estado: 'ARMANDO', faltaParaEnviar: ['FOTO'] };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(DETALLE);
});

describe('la lista', () => {
  it('manda solo los filtros con valor, codificados', () => {
    expect(consultaDeLaLista({ estado: 'POR_REVISAR', q: ' José ', page: 0, size: 30 })).toBe(
      '?estado=POR_REVISAR&q=Jos%C3%A9&page=0&size=30',
    );
    expect(consultaDeLaLista({})).toBe('');
  });

  it('acepta conteos y un item sin campos opcionales', async () => {
    mockApiFetch.mockResolvedValue({
      items: [{ aprendizId: 'a-1', estado: 'POR_REVISAR' }],
      total: 1,
      conteos: { POR_REVISAR: 1, ENVIADA: 4 },
    });
    const lista = await listarCajas({ estado: 'POR_REVISAR' });
    expect(lista.conteos?.ENVIADA).toBe(4);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja?estado=POR_REVISAR', undefined);
  });
});

describe('las acciones del Admin', () => {
  it('aprobar, armar y reenviar son un POST sin cuerpo', async () => {
    await ejecutarAccion('a-1', 'aprobar');
    await ejecutarAccion('a-1', 'armar');
    await ejecutarAccion('a/2', 'reenviar');
    expect(mockApiFetch.mock.calls.map(c => [c[0], c[1]?.method])).toEqual([
      ['/api/v1/admin/caja/a-1/aprobar', 'POST'],
      ['/api/v1/admin/caja/a-1/armar', 'POST'],
      ['/api/v1/admin/caja/a%2F2/reenviar', 'POST'],
    ]);
  });

  it('enviar lleva medio, courier, código y costo', async () => {
    await marcarEnviada('a-1', { medio: 'Courier', courier: 'Olva', codigo: 'OL-1', costo: 15.5 });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja/a-1/enviar', {
      method: 'POST',
      body: { medio: 'Courier', courier: 'Olva', codigo: 'OL-1', costo: 15.5 },
    });
  });

  it('entregada lleva `previa` solo para «Ya se envió antes»', async () => {
    await marcarEntregada('a-1');
    await marcarEntregada('a-1', true);
    expect(mockApiFetch.mock.calls.map(c => c[1]?.body)).toEqual([{}, { previa: true }]);
  });

  it('problema lleva motivo y nota', async () => {
    await reportarProblema('a-1', { motivo: 'DANADA', nota: 'Caja mojada' });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja/a-1/problema', {
      method: 'POST',
      body: { motivo: 'DANADA', nota: 'Caja mojada' },
    });
  });

  it('el checklist es un PUT con los marcados', async () => {
    await guardarChecklist('a-1', ['LIBRETA']);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/caja/a-1/contenido', { method: 'PUT', body: { marcados: ['LIBRETA'] } });
  });

  it('la foto y el comprobante suben en dos pasos y se confirman con la ruta', async () => {
    mockApiFetch.mockResolvedValueOnce({ url: 'https://s3/put', ruta: 'r/1' });
    expect(await pedirSubidaDeImagen('a-1', 'comprobante', 'image/jpeg')).toEqual({ url: 'https://s3/put', ruta: 'r/1' });
    await confirmarImagen('a-1', 'comprobante', 'r/1');
    expect(mockApiFetch.mock.calls.map(c => [c[0], c[1]?.body])).toEqual([
      ['/api/v1/admin/caja/a-1/comprobante/upload-url', { contentType: 'image/jpeg' }],
      ['/api/v1/admin/caja/a-1/comprobante/confirm', { ruta: 'r/1' }],
    ]);
  });

  it('una respuesta que no es un detalle se rechaza con el nombre del endpoint', async () => {
    mockApiFetch.mockResolvedValue({ hola: 1 });
    await expect(ejecutarAccion('a-1', 'armar')).rejects.toThrow('POST /api/v1/admin/caja/{id}/armar');
  });
});

describe('el contenido de la caja', () => {
  it('si el servidor responde vacío, queda lo que se mandó', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    const elementos = [{ valor: 'TAZA', etiqueta: 'Taza' }];
    expect(await guardarContenidoDeLaCaja(elementos)).toEqual({ elementos });
  });
});

describe('la caja del aprendiz', () => {
  it('acepta pasos y envío ausentes', async () => {
    mockApiFetch.mockResolvedValue({ estado: 'EN_EVALUACION' });
    expect((await leerMiCaja()).estado).toBe('EN_EVALUACION');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/me/caja', undefined);
  });
});

/**
 * El servidor real (D-219, spec §11) manda `null` en todo campo sin valor, no lo omite. Estas son sus
 * respuestas tal cual: si un esquema aceptara solo `undefined`, la pantalla quedaría en «No se pudo».
 */
describe('las respuestas reales del servidor, con null', () => {
  it('un detalle recién aprobado: sin envío, sin fotos, sin cumplimiento, destino a medias', async () => {
    mockApiFetch.mockResolvedValue({
      aprendizId: 'a-1',
      nombre: 'Ana',
      estado: 'POR_REVISAR',
      envio: 1,
      cumplimientoFase1: null,
      destino: {
        nombre: 'Ana', celular: null, pais: 'Perú', ciudad: null, distrito: null, provincia: null,
        direccion: null, referencias: null, dni: null, quienRecibe: null, otraDireccion: null, otroCelular: null,
      },
      contenido: [{ valor: 'taza', etiqueta: 'Taza', marcado: false }],
      fotoArmadaUrl: null,
      comprobanteUrl: null,
      envioDatos: null,
      historial: [{ envio: 1, estado: 'POR_REVISAR', en: '2026-09-28T15:00:00Z', porNombre: null }],
      faltaParaEnviar: ['CONTENIDO', 'FOTO', 'COMPROBANTE'],
    });
    const detalle = await leerCaja('a-1');
    expect(detalle.envioDatos).toBeNull();
    expect(detalle.historial?.[0]?.porNombre).toBeNull();
  });

  it('un envío con courier y costo nulos, y el costo como número', async () => {
    mockApiFetch.mockResolvedValue({
      ...DETALLE,
      estado: 'ENVIADA',
      envioDatos: { medio: 'inDrive', courier: null, codigo: 'ABC-123', costo: null, rastreoUrl: null },
    });
    expect((await leerCaja('a-1')).envioDatos?.codigo).toBe('ABC-123');
  });

  it('la lista con grupo, día y cumplimiento nulos', async () => {
    mockApiFetch.mockResolvedValue({
      items: [
        { aprendizId: 'a-1', nombre: 'Ana', grupo: null, diaPrograma: 8, estado: 'EN_EVALUACION', envio: 1,
          actualizadoEn: null, cumplimientoFase1: null },
      ],
      total: 1,
      conteos: { EN_EVALUACION: 1, POR_REVISAR: 0 },
    });
    expect((await listarCajas({ page: 0 })).items).toHaveLength(1);
  });

  it('la caja del aprendiz: siempre cinco pasos, `en` null en los que no llegó, envío sin costo', async () => {
    mockApiFetch.mockResolvedValue({
      estado: 'ENVIADA',
      pasos: [
        { estado: 'EN_EVALUACION', en: null },
        { estado: 'POR_REVISAR', en: null },
        { estado: 'ARMANDO', en: '2026-09-28T15:00:00Z' },
        { estado: 'ENVIADA', en: '2026-09-28T16:00:00Z' },
        { estado: 'ENTREGADA', en: null },
      ],
      envioDatos: { medio: 'Olva', courier: 'Olva', codigo: '123', rastreoUrl: 'https://tracking.olvaexpress.pe' },
      puedeConfirmar: true,
      puedeCambiarDestino: false,
      destino: { otraDireccion: null, otroCelular: null, quienRecibe: null, referencias: null, provincia: null },
    });
    const caja = await leerMiCaja();
    expect(caja.pasos).toHaveLength(5);
    expect(caja.destino?.provincia).toBeNull();
  });

  it('la trazabilidad (D-220): envíos con motivo null y la foto null, como los manda el servidor', async () => {
    mockApiFetch.mockResolvedValue({
      estado: 'ARMANDO',
      pasos: [],
      envioDatos: null,
      puedeConfirmar: false,
      puedeCambiarDestino: true,
      destino: null,
      envios: [
        { envio: 1, medio: 'Olva', courier: 'Olva', codigo: 'OLV-7777', rastreoUrl: 'https://tracking.olvaexpress.pe/',
          resultado: 'CON_PROBLEMA', en: '2026-09-28T15:00:00Z', motivo: 'PERDIDA' },
        { envio: 2, medio: 'inDrive', courier: null, codigo: 'ABC', rastreoUrl: null, resultado: 'ENTREGADA',
          en: '2026-09-30T15:00:00Z', motivo: null },
      ],
      fotoArmadaUrl: null,
    });
    const caja = await leerMiCaja();
    expect(caja.envios?.map(e => e.resultado)).toEqual(['CON_PROBLEMA', 'ENTREGADA']);
    expect(caja.fotoArmadaUrl).toBeNull();
  });

  it('el historial del Admin con el motivo y la nota de un problema', async () => {
    mockApiFetch.mockResolvedValue({
      ...DETALLE,
      historial: [
        { envio: 1, estado: 'ENVIADA', en: '2026-09-27T15:00:00Z', porNombre: 'Kelin', motivo: null, nota: null },
        { envio: 1, estado: 'CON_PROBLEMA', en: '2026-09-28T15:00:00Z', porNombre: 'Kelin', motivo: 'DANADA',
          nota: 'Llegó mojada' },
      ],
    });
    const detalle = await leerCaja('a-1');
    expect(detalle.historial?.[1]).toMatchObject({ motivo: 'DANADA', nota: 'Llegó mojada' });
  });
});

describe('el fondo de la carta', () => {
  const FONDO = { cambiado: true, sePuedeCambiar: true, cambiadoPor: 'Ana', cambiadoEn: '2026-09-28T15:00:00Z' };

  it('se lee, se confirma y se quita, y los tres devuelven cómo quedó', async () => {
    mockApiFetch.mockResolvedValue(FONDO);
    expect((await leerFondoDeLaCarta()).cambiado).toBe(true);
    expect((await confirmarFondo('caja/cartas/x.png')).cambiadoPor).toBe('Ana');
    mockApiFetch.mockResolvedValue({ cambiado: false, sePuedeCambiar: false, cambiadoPor: null, cambiadoEn: null });
    expect((await volverAlFondoOriginal()).cambiado).toBe(false);
    expect(mockApiFetch.mock.calls.map(c => [c[0], c[1]?.method, c[1]?.body])).toEqual([
      ['/api/v1/admin/caja/carta/fondo', undefined, undefined],
      ['/api/v1/admin/caja/carta/fondo/confirm', 'POST', { ruta: 'caja/cartas/x.png' }],
      ['/api/v1/admin/caja/carta/fondo', 'DELETE', undefined],
    ]);
  });
});
