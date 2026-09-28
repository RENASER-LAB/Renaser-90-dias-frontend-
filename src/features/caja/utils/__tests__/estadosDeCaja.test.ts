import { describe, expect, it } from '@jest/globals';

import {
  FORMULARIO_VACIO,
  accionesDelEstado,
  costoDelTexto,
  etiquetaDelChip,
  etiquetaDelEstado,
  etiquetaParaElAprendiz,
  faltaSegunElServidor,
  fechaCortaDe,
  motivoEnPalabras,
  notaDelPaso,
  pasosDeMiCaja,
  problemaDeMiCaja,
  queFaltaParaEnviar,
  rastreoAbrible,
  textoDeLoQueFalta,
  textoDelCosto,
  textoDelEnvio,
  textoDelEnvioSalido,
  textoDelFondo,
  textoDelPaso,
} from '../estadosDeCaja';

/**
 * Caja Renaser (backend D-219, spec §2, §7 y §8): qué ve cada quien y qué botones tiene el Admin en
 * cada estado. Las pruebas corren en `America/Lima` (jest.config.js).
 */

describe('lo que ve el aprendiz', () => {
  it('ve los cinco estados de su camino con sus palabras', () => {
    expect(etiquetaParaElAprendiz('EN_EVALUACION')).toBe('En evaluación');
    expect(etiquetaParaElAprendiz('POR_REVISAR')).toBe('En revisión');
    expect(etiquetaParaElAprendiz('ARMANDO')).toBe('Armando tu caja');
    expect(etiquetaParaElAprendiz('ENVIADA')).toBe('En camino');
    expect(etiquetaParaElAprendiz('ENTREGADA')).toBe('Entregada');
    expect(etiquetaParaElAprendiz('CON_PROBLEMA')).toBe('Estamos resolviendo tu envío');
  });

  it('no ve nada antes del día 8, en pausa, fuera de la app ni con un estado desconocido', () => {
    expect(etiquetaParaElAprendiz('NO_APLICA')).toBeNull();
    expect(etiquetaParaElAprendiz('EN_PAUSA')).toBeNull();
    expect(etiquetaParaElAprendiz('FUERA_DE_LA_APP')).toBeNull();
    expect(etiquetaParaElAprendiz('NUEVO_ESTADO')).toBeNull();
    expect(etiquetaParaElAprendiz(null)).toBeNull();
  });
});

describe('el chip de la ficha', () => {
  it('dice el estado y no aparece antes del día 8', () => {
    expect(etiquetaDelChip('ENVIADA')).toBe('Caja: Enviada');
    expect(etiquetaDelChip('EN_PAUSA')).toBe('Caja: En pausa');
    expect(etiquetaDelChip('NO_APLICA')).toBeNull();
    expect(etiquetaDelChip(null)).toBeNull();
  });

  it('un estado que la app no conoce se ve crudo, no en blanco', () => {
    expect(etiquetaDelEstado('RETENIDA')).toBe('RETENIDA');
  });
});

describe('los botones del Admin', () => {
  it('uno principal por estado, y «Ya se envió antes» mientras la caja no salió por la app', () => {
    expect(accionesDelEstado('EN_EVALUACION')).toEqual({ principal: 'aprobar', secundarias: ['previa'] });
    expect(accionesDelEstado('POR_REVISAR')).toEqual({ principal: 'armar', secundarias: ['previa'] });
    expect(accionesDelEstado('ARMANDO')).toEqual({ principal: 'enviar', secundarias: ['previa'] });
    expect(accionesDelEstado('ENVIADA')).toEqual({ principal: 'entregada', secundarias: ['problema'] });
    expect(accionesDelEstado('CON_PROBLEMA')).toEqual({ principal: 'reenviar', secundarias: ['entregada'] });
  });

  it('sin botones cuando no hay nada que hacer', () => {
    for (const estado of ['ENTREGADA', 'EN_PAUSA', 'FUERA_DE_LA_APP', 'NO_APLICA', 'OTRO']) {
      expect(accionesDelEstado(estado)).toEqual({ principal: null, secundarias: [] });
    }
  });
});

describe('qué falta para marcarla enviada', () => {
  const lleno = { medio: 'Courier', courier: 'Olva', codigo: 'OL-123', costo: '15' };

  it('junta lo que dice el servidor y lo que falta del formulario', () => {
    const falta = queFaltaParaEnviar({ faltaParaEnviar: ['FOTO', 'COMPROBANTE'] }, FORMULARIO_VACIO);
    expect(falta).toEqual(['foto de la caja', 'comprobante', 'por dónde se envió', 'código']);
    expect(textoDeLoQueFalta(falta)).toBe('Falta: foto de la caja, comprobante, por dónde se envió, código');
  });

  it('con todo, no falta nada (el costo es opcional)', () => {
    expect(queFaltaParaEnviar({ faltaParaEnviar: [] }, lleno)).toEqual([]);
    expect(queFaltaParaEnviar({ faltaParaEnviar: null }, { ...lleno, costo: '' })).toEqual([]);
    expect(textoDeLoQueFalta([])).toBeNull();
  });

  it('un costo que no es un número no se manda', () => {
    expect(queFaltaParaEnviar({ faltaParaEnviar: [] }, { ...lleno, costo: 'quince' })).toEqual(['costo válido']);
  });

  it('solo espacios no cuenta como código', () => {
    expect(queFaltaParaEnviar({ faltaParaEnviar: [] }, { ...lleno, codigo: '   ' })).toEqual(['código']);
  });
});

describe('el costo', () => {
  it('acepta coma o punto y «S/» delante', () => {
    expect(costoDelTexto('12,50')).toBe(12.5);
    expect(costoDelTexto('S/ 8')).toBe(8);
    expect(costoDelTexto('')).toBeNull();
    expect(costoDelTexto('-3')).toBe('invalido');
    expect(costoDelTexto('1.234')).toBe('invalido');
  });

  it('se muestra con dos decimales, llegue como número o como texto', () => {
    expect(textoDelCosto(15)).toBe('S/ 15.00');
    expect(textoDelCosto('12.5')).toBe('S/ 12.50');
    expect(textoDelCosto(null)).toBeNull();
  });
});

describe('fechas', () => {
  it('un instante de la madrugada UTC cae en el día anterior de Lima', () => {
    // 03:10 UTC del 28 = 22:10 del 27 en Lima. Un 10:00 UTC habría escondido esto.
    expect(fechaCortaDe('2026-09-28T03:10:00Z')).toBe('27 sep');
    expect(fechaCortaDe('2026-09-28T15:00:00Z')).toBe('28 sep');
  });

  it('una fecha sola no se corre un día', () => {
    expect(fechaCortaDe('2026-10-01')).toBe('1 oct');
  });

  it('sin fecha o con una rota, nada', () => {
    expect(fechaCortaDe(null)).toBeNull();
    expect(fechaCortaDe('ayer')).toBeNull();
  });
});

describe('el historial', () => {
  it('«Enviada · 27 sep · Ana», con el número de envío si es un reenvío', () => {
    expect(textoDelPaso({ envio: 1, estado: 'ENVIADA', en: '2026-09-27T20:00:00Z', porNombre: 'Ana' })).toBe(
      'Enviada · 27 sep · Ana',
    );
    expect(textoDelPaso({ envio: 2, estado: 'ARMANDO', en: '2026-09-29T15:00:00Z', porNombre: null })).toBe(
      'Envío 2 · Armando · 29 sep',
    );
  });

  it('un problema dice su motivo, y la nota del Admin va aparte (CAJA-10, D-220)', () => {
    const problema = {
      envio: 1,
      estado: 'CON_PROBLEMA',
      en: '2026-09-28T15:00:00Z',
      porNombre: 'Kelin',
      motivo: 'PERDIDA',
      nota: ' El courier no la encuentra ',
    };
    expect(textoDelPaso(problema)).toBe('Con problema · Se perdió · 28 sep · Kelin');
    expect(notaDelPaso(problema)).toBe('El courier no la encuentra');
    expect(notaDelPaso({ ...problema, nota: '  ' })).toBeNull();
    expect(notaDelPaso({ envio: 1, estado: 'ENVIADA', en: null, porNombre: null, nota: 'x' })).toBeNull();
    expect(motivoEnPalabras('DANADA')).toBe('Llegó dañada');
    expect(motivoEnPalabras('ROBADA')).toBeNull();
  });

  it('POR_REVISAR en el historial es la aprobación del Admin, no «Por revisar»', () => {
    expect(textoDelPaso({ envio: 1, estado: 'POR_REVISAR', en: '2026-09-28T15:00:00Z', porNombre: 'Ana' })).toBe(
      'Aprobada · 28 sep · Ana',
    );
  });
});

describe('el 409 de «Marcar enviada»', () => {
  it('dice qué falta con palabras, no con las claves del servidor', () => {
    const error = { status: 409, body: { message: 'Para enviarla falta: [FOTO, COMPROBANTE]', faltan: ['FOTO', 'COMPROBANTE'] } };
    expect(faltaSegunElServidor(error)).toBe('Falta: foto de la caja, comprobante');
  });

  it('otro 409 (el estado cambió) u otro error sigue con su mensaje de siempre', () => {
    expect(faltaSegunElServidor({ status: 409, body: { message: 'La caja ya no está en ARMANDO' } })).toBeNull();
    expect(faltaSegunElServidor({ status: 400, body: { faltan: ['FOTO'] } })).toBeNull();
    expect(faltaSegunElServidor(new Error('red'))).toBeNull();
    expect(faltaSegunElServidor(null)).toBeNull();
  });
});

describe('el fondo de la carta', () => {
  it('original, o nuevo con fecha y quién lo cambió', () => {
    expect(textoDelFondo({ cambiado: false, sePuedeCambiar: true, cambiadoPor: null, cambiadoEn: null })).toBe('Fondo original');
    expect(textoDelFondo({ cambiado: true, sePuedeCambiar: true, cambiadoPor: 'Ana', cambiadoEn: '2026-09-28T15:00:00Z' })).toBe(
      'Fondo nuevo · 28 sep · Ana',
    );
    expect(textoDelFondo(null)).toBeNull();
  });
});

describe('los pasos que ve el aprendiz', () => {
  it('marca hechos los anteriores y resalta el actual, con su fecha', () => {
    const pasos = pasosDeMiCaja({
      estado: 'ARMANDO',
      pasos: [
        { estado: 'POR_REVISAR', en: '2026-09-20T15:00:00Z' },
        { estado: 'ARMANDO', en: '2026-09-22T15:00:00Z' },
      ],
    });
    expect(pasos.map(p => p.etiqueta)).toEqual(['En evaluación', 'En revisión', 'Armando', 'En camino', 'Entregada']);
    expect(pasos.map(p => p.hecho)).toEqual([true, true, false, false, false]);
    expect(pasos.map(p => p.actual)).toEqual([false, false, true, false, false]);
    expect(pasos[1].fecha).toBe('20 sep');
    expect(pasos[2].fecha).toBe('22 sep');
  });

  it('entregada: los cinco hechos', () => {
    expect(pasosDeMiCaja({ estado: 'ENTREGADA', pasos: [] }).every(p => p.hecho)).toBe(true);
  });

  it('con un problema queda sobre «En camino»', () => {
    const pasos = pasosDeMiCaja({ estado: 'CON_PROBLEMA', pasos: null });
    expect(pasos.find(p => p.actual)?.etiqueta).toBe('En camino');
  });

  it('después de un reenvío vale la fecha del envío nuevo', () => {
    const pasos = pasosDeMiCaja({
      estado: 'ENVIADA',
      pasos: [
        { estado: 'ENVIADA', en: '2026-09-22T15:00:00Z' },
        { estado: 'ARMANDO', en: '2026-09-25T15:00:00Z' },
        { estado: 'ENVIADA', en: '2026-09-26T15:00:00Z' },
      ],
    });
    expect(pasos[3].fecha).toBe('26 sep');
  });
});

describe('el envío y su rastreo', () => {
  it('«Olva · 123», o por dónde se envió si no hay courier', () => {
    expect(textoDelEnvio({ medio: 'Courier', courier: 'Olva', codigo: '123' })).toBe('Olva · 123');
    expect(textoDelEnvio({ medio: 'inDrive', courier: null, codigo: 'ABC-123' })).toBe('inDrive · ABC-123');
    expect(textoDelEnvio(null)).toBeNull();
  });

  it('solo se abre un enlace web', () => {
    expect(rastreoAbrible('https://tracking.olvacourier.com/?g=1')).toBe('https://tracking.olvacourier.com/?g=1');
    expect(rastreoAbrible('javascript:alert(1)')).toBeNull();
    expect(rastreoAbrible(null)).toBeNull();
  });
});

describe('la trazabilidad del aprendiz (D-220)', () => {
  const perdido = {
    envio: 1,
    medio: 'Olva Courier',
    courier: 'Olva',
    codigo: 'OLV-7777',
    rastreoUrl: 'https://tracking.olvaexpress.pe/',
    resultado: 'CON_PROBLEMA',
    en: '2026-09-28T15:00:00Z',
    motivo: 'PERDIDA',
  };
  const entregado = {
    envio: 2,
    medio: 'Shalom',
    courier: 'Shalom',
    codigo: 'SH-7777',
    resultado: 'ENTREGADA',
    en: '2026-09-30T15:00:00Z',
    motivo: null,
  };

  it('una línea por envío: medio, código, en qué terminó y cuándo', () => {
    expect(textoDelEnvioSalido(perdido, 0)).toBe('Envío 1 · Olva OLV-7777 · Se perdió · 28 sep');
    expect(textoDelEnvioSalido(entregado, 1)).toBe('Envío 2 · Shalom SH-7777 · Entregada · 30 sep');
    expect(textoDelEnvioSalido({ ...entregado, resultado: 'ENVIADA', courier: null, medio: 'inDrive' }, 1)).toBe(
      'Envío 2 · inDrive SH-7777 · En camino · 30 sep',
    );
  });

  it('los motivos en palabras simples; «Otro» o uno desconocido, sin nombres internos', () => {
    expect(textoDelEnvioSalido({ ...perdido, motivo: 'DANADA' }, 0)).toContain('Llegó dañada');
    expect(textoDelEnvioSalido({ ...perdido, motivo: 'DEVUELTA' }, 0)).toContain('La devolvieron');
    expect(textoDelEnvioSalido({ ...perdido, motivo: 'OTRO' }, 0)).toContain('Tuvo un problema');
    expect(textoDelEnvioSalido({ ...perdido, motivo: 'ROBADA' }, 0)).not.toContain('ROBADA');
  });

  it('con problema, el motivo del último envío; sin problema, nada', () => {
    expect(problemaDeMiCaja({ estado: 'CON_PROBLEMA', envios: [perdido] })).toBe('Se perdió');
    expect(problemaDeMiCaja({ estado: 'ARMANDO', envios: [perdido] })).toBeNull();
    expect(problemaDeMiCaja({ estado: 'CON_PROBLEMA', envios: null })).toBeNull();
  });
});
