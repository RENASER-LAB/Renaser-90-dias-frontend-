import { describe, expect, it } from '@jest/globals';

import type { ListaDeAsistencia, PersonaDeLaLista, PersonaQueRespondio } from '../../types/asistencia.types';
import {
  agruparRespuestas,
  fechaCorta,
  filtrarPorNombre,
  momentoDeLaLista,
  puedeVerAsistencia,
  respuestaAnterior,
  resumirLista,
  siguienteLlegada,
  textoDeAntes,
  textoDeRespuesta,
  textoEnLaLista,
  textoEnLaListaCerrada,
  textoParaCompartir,
} from '../asistencia';

const LIMA = 'America/Lima';

function respondio(parcial: Partial<PersonaQueRespondio>): PersonaQueRespondio {
  return { id: 'x', nombre: 'Ana Ríos', avatarUrl: null, respuesta: null, respondidaEn: null, historial: [], ...parcial };
}

function enLista(parcial: Partial<PersonaDeLaLista>): PersonaDeLaLista {
  return { id: 'x', nombre: 'Ana Ríos', avatarUrl: null, respuesta: null, respondidaEn: null, llegada: null, marcadaEn: null, ...parcial };
}

describe('quién ve la asistencia (regla del dueño, D-256)', () => {
  it('Admin, Alquimista y Líder de mentores, en cualquier evento', () => {
    for (const rol of ['ADMIN', 'ALCHEMIST', 'MENTOR_LEAD']) {
      expect(puedeVerAsistencia(rol, 'yo', 'otro')).toBe(true);
    }
  });

  it('el mentor solo en el evento que creó; el aprendiz nunca', () => {
    expect(puedeVerAsistencia('MENTOR', 'yo', 'yo')).toBe(true);
    expect(puedeVerAsistencia('MENTOR', 'yo', 'otro')).toBe(false);
    expect(puedeVerAsistencia('MENTOR', 'yo', null)).toBe(false);
    expect(puedeVerAsistencia('TRAINEE', 'yo', 'otro')).toBe(false);
    expect(puedeVerAsistencia(null, null, null)).toBe(false);
  });
});

describe('agrupar respuestas', () => {
  it('«Quizás» va con «Sin respuesta»: la app no lo ofrece', () => {
    const g = agruparRespuestas([
      respondio({ id: 'a', respuesta: 'GOING' }),
      respondio({ id: 'b', respuesta: 'NOT_GOING' }),
      respondio({ id: 'c', respuesta: 'MAYBE' }),
      respondio({ id: 'd', respuesta: null }),
    ]);
    expect(g.van.map(p => p.id)).toEqual(['a']);
    expect(g.noVan.map(p => p.id)).toEqual(['b']);
    expect(g.sinRespuesta.map(p => p.id)).toEqual(['c', 'd']);
  });
});

describe('fechas en la zona del evento', () => {
  it('«sáb 3, 18:42» aunque en UTC ya sea domingo (madrugada UTC)', () => {
    // 2026-10-04T01:42Z es el sábado 3 a las 20:42 en Lima.
    expect(fechaCorta('2026-10-04T01:42:00Z', LIMA)).toBe('sáb 3, 20:42');
    expect(fechaCorta('2026-10-03T23:42:00Z', LIMA)).toBe('sáb 3, 18:42');
  });

  it('«Dijo «Voy» · sáb 3, 18:42» y «No respondió»', () => {
    expect(textoDeRespuesta(respondio({ respuesta: 'GOING', respondidaEn: '2026-10-03T23:42:00Z' }), LIMA)).toBe(
      'Dijo «Voy» · sáb 3, 18:42',
    );
    expect(textoDeRespuesta(respondio({ respuesta: 'MAYBE' }), LIMA)).toBe('No respondió');
  });
});

describe('lo que dijo antes', () => {
  it('muestra la última respuesta distinta a la de hoy', () => {
    const p = respondio({
      respuesta: 'GOING',
      historial: [
        { respuesta: 'GOING', en: '2026-10-02T15:00:00Z' },
        { respuesta: 'NOT_GOING', en: '2026-10-04T02:05:00Z' },
        { respuesta: 'GOING', en: '2026-10-04T14:10:00Z' },
      ],
    });
    const antes = respuestaAnterior(p);
    expect(antes?.respuesta).toBe('NOT_GOING');
    expect(textoDeAntes(antes!, LIMA)).toBe('Antes dijo «No voy» (sáb 3, 21:05)');
  });

  it('sin historia (respuestas de antes de la V93) no inventa nada', () => {
    expect(respuestaAnterior(respondio({ respuesta: 'GOING', historial: [] }))).toBeNull();
    expect(respuestaAnterior(respondio({ respuesta: 'GOING', historial: [{ respuesta: 'GOING', en: 'x' }] }))).toBeNull();
  });
});

describe('pasar lista', () => {
  it('un toque = a tiempo, el segundo = tarde, el tercero vuelve a sin marcar', () => {
    expect(siguienteLlegada(null)).toBe('A_TIEMPO');
    expect(siguienteLlegada('A_TIEMPO')).toBe('TARDE');
    expect(siguienteLlegada('TARDE')).toBeNull();
  });

  it('la fila dice cómo llegó y a qué hora de Lima', () => {
    expect(textoEnLaLista(enLista({ llegada: 'A_TIEMPO', marcadaEn: '2026-10-06T01:02:00Z' }), LIMA)).toBe('A tiempo · 20:02');
    expect(textoEnLaLista(enLista({ llegada: 'TARDE', marcadaEn: '2026-10-06T01:13:00Z' }), LIMA)).toBe('Tarde · 20:13');
    expect(textoEnLaLista(enLista({ respuesta: 'GOING' }), LIMA)).toBe('Dijo «Voy»');
    expect(textoEnLaLista(enLista({}), LIMA)).toBe('No respondió');
  });

  it('cerrada: «Dijo «Voy» · llegó 20:02» y «No confirmó · llegó 20:09»', () => {
    expect(textoEnLaListaCerrada(enLista({ respuesta: 'GOING', llegada: 'A_TIEMPO', marcadaEn: '2026-10-06T01:02:00Z' }), LIMA)).toBe(
      'Dijo «Voy» · llegó 20:02',
    );
    expect(textoEnLaListaCerrada(enLista({ llegada: 'A_TIEMPO', marcadaEn: '2026-10-06T01:09:00Z' }), LIMA)).toBe(
      'No confirmó · llegó 20:09',
    );
    expect(textoEnLaListaCerrada(enLista({ respuesta: 'GOING', llegada: 'TARDE', marcadaEn: '2026-10-06T01:13:00Z' }), LIMA)).toBe(
      'Dijo «Voy» · llegó tarde, 20:13',
    );
  });

  it('el resumen cuenta presentes, los que dijeron «Voy» y los que faltaron', () => {
    const r = resumirLista([
      enLista({ id: 'a', respuesta: 'GOING', llegada: 'A_TIEMPO' }),
      enLista({ id: 'b', respuesta: 'GOING', llegada: 'TARDE' }),
      enLista({ id: 'c', respuesta: 'GOING' }),
      enLista({ id: 'd', llegada: 'A_TIEMPO' }),
      enLista({ id: 'e', respuesta: 'NOT_GOING' }),
    ]);
    expect(r).toEqual({
      presentes: 3,
      aTiempo: 2,
      tarde: 1,
      dijeronVoy: 3,
      vinieronDeLosQueDijeronVoy: 2,
      sinConfirmar: 1,
      faltaron: 1,
      total: 5,
    });
  });

  it('busca sin importar tildes ni mayúsculas', () => {
    const ps = [enLista({ id: 'a', nombre: 'Ana Ríos' }), enLista({ id: 'b', nombre: 'Jorge Sáenz' })];
    expect(filtrarPorNombre(ps, 'rios').map(p => p.id)).toEqual(['a']);
    expect(filtrarPorNombre(ps, 'SAENZ').map(p => p.id)).toEqual(['b']);
    expect(filtrarPorNombre(ps, '  ').length).toBe(2);
  });
});

describe('momento de la lista', () => {
  const base = { abreEn: '2026-10-06T00:30:00Z', cierraEn: '2026-10-06T14:00:00Z', cerrada: null };

  it('con el reloj en la madrugada UTC (19:45 del lunes en Lima) está abierta', () => {
    expect(momentoDeLaLista(base, Date.parse('2026-10-06T00:45:00Z'))).toBe('abierta');
    expect(momentoDeLaLista(base, Date.parse('2026-10-06T00:20:00Z'))).toBe('todavia');
    expect(momentoDeLaLista(base, Date.parse('2026-10-06T14:00:01Z'))).toBe('vencida');
    expect(momentoDeLaLista({ ...base, cerrada: { en: 'x', porId: null, porNombre: null } }, 0)).toBe('cerrada');
  });
});

describe('compartir', () => {
  it('arma un texto con los que asistieron y los que dijeron «Voy» y faltaron', () => {
    const lista: ListaDeAsistencia = {
      inicioOcurrencia: '2026-10-06T01:00:00Z',
      abreEn: '',
      cierraEn: '',
      abierta: false,
      cerrada: null,
      personas: [
        enLista({ id: 'a', nombre: 'Ana Ríos', respuesta: 'GOING', llegada: 'A_TIEMPO' }),
        enLista({ id: 'b', nombre: 'Luis Paz', respuesta: 'GOING', llegada: 'TARDE' }),
        enLista({ id: 'c', nombre: 'Tomás Ruiz', respuesta: 'GOING' }),
      ],
    };
    const texto = textoParaCompartir('Mentoría del Alquimista', '2026-10-06T01:00:00Z', LIMA, lista);
    expect(texto).toContain('Mentoría del Alquimista · lun 5 oct, 20:00');
    expect(texto).toContain('• Luis Paz (tarde)');
    expect(texto).toContain('Dijeron «Voy» y faltaron (1):\n• Tomás Ruiz');
  });
});
