import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { semanaAlumnoSchema } from '../mentorSchemas';

/**
 * Spec 005 (R-6, T036): el post diario se cumple publicando en el Muro, y las fichas del mentor y de
 * administración ofrecen «Ver publicación» con ese `publicacionId`. Es un campo opcional y aditivo: un
 * backend anterior no lo manda y un valor raro pierde el botón, no la semana.
 */

function semana(obligacion: Record<string, unknown>) {
  return {
    grupoId: 'g1',
    alumnoId: 'a1',
    nombre: 'Ana',
    inicioDeSemana: '2026-10-12',
    finDeSemana: '2026-10-18',
    diaDePrograma: 50,
    zona: 'America/Lima',
    dias: [
      {
        fecha: '2026-10-17',
        diaDePrograma: 49,
        obligaciones: [
          {
            registroId: 'r1',
            titulo: 'Post diario en comunidad',
            estadoHabito: 'COMPLETADO',
            requiereEvidencia: false,
            entrega: 'ENTREGADA',
            entregadaEn: null,
            revision: null,
            evidenciaId: null,
            ...obligacion,
          },
        ],
      },
    ],
    resumen: { obligaciones: 1, cumplidas: 1, conEntrega: 1, pendientes: 0, sinCumplir: 0 },
    cobertura: 'COMPLETA',
    actualizadoEn: '2026-10-18T12:00:00Z',
  };
}

describe('la semana del mentor y de administración con la publicación del post diario', () => {
  it('lee `publicacionId` cuando el servidor lo manda', () => {
    const r = semanaAlumnoSchema.parse(semana({ publicacionId: 'pub1' }));
    expect(r.dias[0].obligaciones[0].publicacionId).toBe('pub1');
  });

  it('un backend anterior no lo manda: la semana se lee igual y no hay botón', () => {
    const r = semanaAlumnoSchema.parse(semana({}));
    expect(r.dias[0].obligaciones[0].publicacionId ?? null).toBeNull();
  });

  it('un valor raro pierde el botón, no la semana', () => {
    const r = semanaAlumnoSchema.parse(semana({ publicacionId: { raro: true } }));
    expect(r.dias[0].obligaciones[0].publicacionId ?? null).toBeNull();
    expect(r.dias).toHaveLength(1);
  });
});

describe('las dos fichas ofrecen «Ver publicación» solo con `publicacionId`', () => {
  const leer = (ruta: string) => readFileSync(join(__dirname, '..', '..', '..', ruta), 'utf8');

  it('la del mentor (AlumnoScreen) y la de administración (FichaAprendizScreen)', () => {
    for (const ruta of ['mentor/screens/AlumnoScreen.tsx', 'admin/screens/FichaAprendizScreen.tsx']) {
      const fuente = leer(ruta);
      expect(fuente).toContain("from '../../lider-mentores/components/VisorDePublicacion'");
      expect(fuente).toMatch(/\{o\.publicacionId \? <VerPublicacion publicacionId=\{o\.publicacionId\} titulo=\{o\.titulo\} \/> : null\}/);
    }
  });
});
