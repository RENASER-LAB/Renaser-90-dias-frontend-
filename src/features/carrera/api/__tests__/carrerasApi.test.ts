import { describe, expect, it } from '@jest/globals';

import { medicionDeLaFichaDe, textosDeLaMedicion } from '../../../pasos/utils/medicionDeLaFicha';
import { leerRespuestaDeLaCarrera, rutaDeLaRuta } from '../carrerasApi';

describe('la respuesta de POST /api/v1/carreras', () => {
  // spec 042 FR-018, FR-019
  it('lee repetida, el resultado del hábito, el origen del día y el motivo por el que no cuenta', () => {
    const r = leerRespuestaDeLaCarrera(
      {
        carreraId: 'c',
        repetida: true,
        fecha: '2026-11-05',
        kilometros: 61.2,
        cuentaParaElHabito: false,
        porRevisar: true,
        motivoNoCuenta: 'Más de 60 km no se registra solo.',
        habito: { resultado: 'NO_CUENTA', registroId: null, kilometrosDelDia: null, origenDelDia: null, puntosOtorgados: 0 },
      },
      'c',
    );
    expect(r).toMatchObject({ repetida: true, cuentaParaElHabito: false, porRevisar: true, motivoNoCuenta: 'Más de 60 km no se registra solo.' });
    expect(r.habito?.resultado).toBe('NO_CUENTA');
  });

  it('una respuesta que no se entiende no tumba el éxito (la carrera ya quedó guardada)', () => {
    expect(leerRespuestaDeLaCarrera({ raro: 1 }, 'c')).toMatchObject({ carreraId: 'c', habito: null });
  });
});

describe('la ruta, cada rol por su puerta', () => {
  // spec 042 FR-041
  it('la propia, la del mentor o guía y la del liderazgo con y sin grupo', () => {
    expect(rutaDeLaRuta({ tipo: 'propia' }, 'c1')).toBe('/api/v1/carreras/c1/ruta');
    expect(rutaDeLaRuta({ tipo: 'mentor', grupoId: 'g', aprendizId: 'u' }, 'c1')).toBe('/api/v1/mentor/groups/g/learners/u/carreras/c1/ruta');
    expect(rutaDeLaRuta({ tipo: 'liderazgo', grupoId: 'g', personaId: 'p' }, 'c1')).toBe('/api/v1/leadership/groups/g/people/p/carreras/c1/ruta');
    expect(rutaDeLaRuta({ tipo: 'liderazgo', grupoId: null, personaId: 'p' }, 'c1')).toBe('/api/v1/leadership/people/p/carreras/c1/ruta');
  });
});

describe('las fichas del acompañamiento', () => {
  // spec 042 FR-044
  it('el día con carreras dice «Carrera con GPS» y una línea por carrera; una carrera rota se pierde sola', () => {
    const m = medicionDeLaFichaDe({
      valor: 6.21,
      origen: 'GPS',
      carreras: [
        { carreraId: 'a', kilometros: 6.21, duracionActivaSeg: 2215, ritmoSegPorKm: 357, porRevisar: true, cuentaParaElHabito: true, tieneRuta: true },
        { carreraId: 'b', kilometros: 'x' },
      ],
    })!;
    expect(m.carreras).toHaveLength(1);
    const t = textosDeLaMedicion(m);
    expect(t.principal).toMatch(/Carrera con GPS$/);
    expect(t.carreras[0]).toMatch(/^6,21\skm · 36:55 · 5:57 min\/km · Por revisar$/);
  });
});
