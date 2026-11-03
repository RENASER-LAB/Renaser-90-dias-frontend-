import { describe, expect, it } from '@jest/globals';

import { conAccionPropia, opcionesDelEje, sugeridasDelEje, type AccionElegida } from '../accionesPropias';

const MAXIMO = 3;
const caminar = { texto: 'Caminar 40 minutos', sugerida: true };

function elegida(eje: AccionElegida['eje'], titulo: string): AccionElegida {
  return { eje, titulo, hora: '', pasos: [] };
}

describe('conAccionPropia', () => {
  it('agrega la accion escrita, sin espacios de sobra', () => {
    const resultado = conAccionPropia([], 'TRABAJO', '  Cerrar propuesta de Roberto  ', MAXIMO);
    expect(resultado).toEqual([
      { eje: 'TRABAJO', titulo: 'Cerrar propuesta de Roberto', hora: '', pasos: [] },
    ]);
  });

  it('no agrega texto vacio ni solo espacios: no hay nada que agendar', () => {
    expect(conAccionPropia([], 'TRABAJO', '', MAXIMO)).toBeNull();
    expect(conAccionPropia([], 'TRABAJO', '   ', MAXIMO)).toBeNull();
  });

  it('no pasa del tope del eje, que lo impone la base y no la pantalla', () => {
    const llenas = [elegida('TRABAJO', 'a'), elegida('TRABAJO', 'b'), elegida('TRABAJO', 'c')];
    expect(conAccionPropia(llenas, 'TRABAJO', 'd', MAXIMO)).toBeNull();
  });

  it('el tope es POR EJE: con Trabajo lleno, Cuerpo sigue aceptando', () => {
    const llenas = [elegida('TRABAJO', 'a'), elegida('TRABAJO', 'b'), elegida('TRABAJO', 'c')];
    expect(conAccionPropia(llenas, 'CUERPO', 'Caminar', MAXIMO)).toHaveLength(4);
  });

  it('no repite una que ya esta elegida en ese eje', () => {
    const previas = [elegida('TRABAJO', 'Llamar a Ana')];
    expect(conAccionPropia(previas, 'TRABAJO', 'Llamar a Ana', MAXIMO)).toBeNull();
    // El mismo texto en OTRO eje si vale: son dos objetivos distintos.
    expect(conAccionPropia(previas, 'CUERPO', 'Llamar a Ana', MAXIMO)).toHaveLength(2);
  });

  it('no toca la lista que recibe', () => {
    const previas = [elegida('TRABAJO', 'a')];
    conAccionPropia(previas, 'TRABAJO', 'b', MAXIMO);
    expect(previas).toHaveLength(1);
  });
});

describe('opcionesDelEje', () => {
  it('muestra la sugerida y las propias juntas, la sugerida primero', () => {
    const elegidas = [elegida('CUERPO', 'Ir al gimnasio')];
    const opciones = opcionesDelEje('CUERPO', [caminar], elegidas);

    expect(opciones.map(o => o.texto)).toEqual(['Caminar 40 minutos', 'Ir al gimnasio']);
    expect(opciones[0].sugerida).toBe(true);
  });

  it('la propia se dibuja sin marca de sugerida: no sale del diagnóstico', () => {
    const opciones = opcionesDelEje('CUERPO', [], [elegida('CUERPO', 'Ir al gimnasio')]);
    expect(opciones[0]).toEqual({ texto: 'Ir al gimnasio' });
  });

  it('no duplica una propia que coincide con la sugerida: es la misma, y sigue marcada como sugerida', () => {
    const opciones = opcionesDelEje('CUERPO', [caminar], [elegida('CUERPO', 'Caminar 40 minutos')]);
    expect(opciones).toHaveLength(1);
    expect(opciones[0].sugerida).toBe(true);
  });

  it('no se lleva las propias de otro eje', () => {
    const elegidas = [elegida('TRABAJO', 'Cerrar propuesta')];
    expect(opcionesDelEje('CUERPO', [caminar], elegidas).map(o => o.texto))
      .toEqual(['Caminar 40 minutos']);
  });

  it('un eje sin nada sugerido ofrece solo lo propio, y no rompe', () => {
    expect(opcionesDelEje('RELACIONES', [], [])).toEqual([]);
  });
});

describe('sugeridasDelEje: la primera acción del diagnóstico', () => {
  const sugerencia = { eje: 'TRABAJO' as const, texto: 'El lunes revisaré mis ventas' };

  it('se ofrece solo en el eje de la prioridad principal, marcada como sugerida', () => {
    expect(sugeridasDelEje('TRABAJO', sugerencia)).toEqual([{ texto: 'El lunes revisaré mis ventas', sugerida: true }]);
    expect(sugeridasDelEje('CUERPO', sugerencia)).toEqual([]);
    expect(sugeridasDelEje('RELACIONES', sugerencia)).toEqual([]);
  });

  it('sin diagnóstico, sin prioridad o con el texto vacío no hay sugerencia, sin error', () => {
    expect(sugeridasDelEje('TRABAJO', null)).toEqual([]);
    expect(sugeridasDelEje('TRABAJO', undefined)).toEqual([]);
    expect(sugeridasDelEje('TRABAJO', { eje: 'TRABAJO', texto: '   ' })).toEqual([]);
  });

  it('el texto se limpia de espacios de sobra', () => {
    expect(sugeridasDelEje('TRABAJO', { eje: 'TRABAJO', texto: '  Llamar a Ana ' })[0].texto).toBe('Llamar a Ana');
  });
});
