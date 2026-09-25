import { describe, expect, it } from '@jest/globals';

import type { MemoriaRenasiaApi, RecuerdoRenasiaApi } from '../../types/renasia.types';
import { agruparRecuerdos, memoriaVacia, mostrarMemoria } from '../memoria';

const recuerdo = (categoria: string, texto: string, titulo = categoria): RecuerdoRenasiaApi => ({
  id: `${categoria}-${texto}`,
  categoria,
  titulo,
  texto,
});

const vacia: MemoriaRenasiaApi = { activa: true, recuerdos: [], resumen: null };

describe('mostrarMemoria (D-167)', () => {
  it('sin respuesta todavía, no se muestra', () => {
    expect(mostrarMemoria(null)).toBe(false);
  });

  it('encendida se muestra aunque esté vacía: cuenta qué hace', () => {
    expect(mostrarMemoria(vacia)).toBe(true);
  });

  it('apagada y sin nada guardado, no se muestra', () => {
    expect(mostrarMemoria({ ...vacia, activa: false })).toBe(false);
  });

  it('apagada con algo de antes, sí: tiene que poder borrarlo', () => {
    expect(mostrarMemoria({ ...vacia, activa: false, recuerdos: [recuerdo('CONTEXTO_DE_VIDA', 'Trabaja de noche')] })).toBe(true);
    expect(mostrarMemoria({ ...vacia, activa: false, resumen: 'Armaron su rutina.' })).toBe(true);
  });
});

describe('memoriaVacia', () => {
  it('vacía solo si no hay recuerdos ni resumen', () => {
    expect(memoriaVacia(vacia)).toBe(true);
    expect(memoriaVacia({ ...vacia, resumen: 'Armaron su rutina.' })).toBe(false);
  });
});

describe('agruparRecuerdos', () => {
  it('agrupa en el orden del dueño, con la categoría desconocida al final y cada grupo en su orden', () => {
    const grupos = agruparRecuerdos([
      recuerdo('PREFERENCIAS_DE_TRATO', 'Respuestas cortas', 'Cómo prefieres que te acompañe'),
      recuerdo('OTRA_NUEVA', 'Algo nuevo', 'Otra cosa'),
      recuerdo('CONTEXTO_DE_VIDA', 'Trabaja de noche', 'Tu contexto'),
      recuerdo('METAS_Y_LO_QUE_FUNCIONA', 'Caminar temprano', 'Tus metas y lo que te funciona'),
      recuerdo('CONTEXTO_DE_VIDA', 'Vive con su hermano', 'Tu contexto'),
    ]);

    expect(grupos.map(g => g.titulo)).toEqual([
      'Tu contexto',
      'Tus metas y lo que te funciona',
      'Cómo prefieres que te acompañe',
      'Otra cosa',
    ]);
    expect(grupos[0].recuerdos.map(r => r.texto)).toEqual(['Trabaja de noche', 'Vive con su hermano']);
  });
});
