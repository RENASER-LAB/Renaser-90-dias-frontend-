import { describe, expect, it, jest } from '@jest/globals';
import type { ItemDelDia } from '../itemsDelDia';
import type { LecturaDelDia } from '../lecturaDeDiasCerrados';
import { TEXTO_SIN_HABITOS_REGISTRADOS, vistaDeOtroDia } from '../vistaDeOtroDia';

const it_ = (clave: string, hecho: boolean, tipo: ItemDelDia['tipo'] = 'habito'): ItemDelDia => ({
  clave,
  tipo,
  titulo: clave,
  hora: '06:00',
  hecho,
  cerrado: !hecho && tipo === 'habito',
  icono: null,
  dimension: null,
  puntos: null,
  guia: null,
});
const leidos = [it_('a', true), it_('b', false)];
const plan = [it_('plan-a', false)];

function vista(relacion: 'pasado' | 'futuro', lectura: LecturaDelDia | undefined, extra: { leible?: boolean; previoAlPrograma?: boolean } = {}) {
  const itemsLeidos = jest.fn(() => leidos);
  const itemsPlanificados = jest.fn(() => plan);
  const v = vistaDeOtroDia({ relacion, leible: extra.leible ?? true, previoAlPrograma: extra.previoAlPrograma, lectura, itemsLeidos, itemsPlanificados });
  return { v, itemsLeidos, itemsPlanificados };
}

describe('qué se ve en un día que no es hoy', () => {
  it('un día que viene: lo planificado, sin lectura ni botones', () => {
    const { v, itemsLeidos } = vista('futuro', undefined, { leible: false });
    expect(v.items).toBe(plan);
    expect(v.conLectura).toBe(false);
    expect(v.resumen).toBe('Así quedó planificado. Se registra ese día.');
    expect(v.nota).toBe('Es tu planificación. Para cambiar una hora, toca el engranaje.');
    expect(itemsLeidos).not.toHaveBeenCalled();
  });

  it('un día anterior con datos: ✓ y candado reales, y cuántos se hicieron', () => {
    const { v, itemsPlanificados } = vista('pasado', { estado: 'datos', tracks: [] });
    expect(v.items).toBe(leidos);
    expect(v.conLectura).toBe(true);
    expect(v.resumen).toBe('1 de 2 hechos · ese día ya cerró');
    expect(v.nota).toBe('Lo que no registraste ese día queda con candado: ya no se puede subir.');
    expect(itemsPlanificados).not.toHaveBeenCalled();
  });

  it('un día anterior con datos vacíos: «Ese día no tuviste hábitos registrados.», sin ✓ ni candados', () => {
    const vacio = vistaDeOtroDia({ relacion: 'pasado', leible: true, lectura: { estado: 'datos', tracks: [] }, itemsLeidos: () => [], itemsPlanificados: () => plan });
    expect(vacio.resumen).toBe(TEXTO_SIN_HABITOS_REGISTRADOS);
    expect(vacio.resumen).toBe('Ese día no tuviste hábitos registrados.');
    expect(vacio.items).toEqual([]);
    expect(vacio.nota).toBeNull();
  });

  it('un evento ese día no cuenta como hábito registrado', () => {
    const v = vistaDeOtroDia({ relacion: 'pasado', leible: true, lectura: { estado: 'datos', tracks: [] }, itemsLeidos: () => [it_('e', false, 'evento')], itemsPlanificados: () => [] });
    expect(v.resumen).toBe(TEXTO_SIN_HABITOS_REGISTRADOS);
  });

  it('mientras se lee: cargando, sin lista', () => {
    for (const lectura of [undefined, { estado: 'cargando' } as const]) {
      const { v } = vista('pasado', lectura);
      expect(v.estado).toBe('cargando');
      expect(v.items).toEqual([]);
    }
  });

  for (const estado of ['sin-datos', 'error'] as const) {
    it(`con ${estado}: lo planificado y «Lo que hiciste ese día está en Yo → Mis evidencias.»`, () => {
      const { v } = vista('pasado', { estado });
      expect(v.items).toBe(plan);
      expect(v.conLectura).toBe(false);
      expect(v.nota).toContain('Lo que hiciste ese día está en Yo → Mis evidencias.');
    });
  }

  it('solo el error ofrece «Reintentar»', () => {
    expect(vista('pasado', { estado: 'error' }).v.puedeReintentar).toBe(true);
    expect(vista('pasado', { estado: 'sin-datos' }).v.puedeReintentar).toBe(false);
    expect(vista('pasado', { estado: 'datos', tracks: [] }).v.puedeReintentar).toBe(false);
  });

  it('un día que no se pudo pedir (fuera de la semana o del programa): lo planificado, sin esperar una lectura', () => {
    const { v } = vista('pasado', undefined, { leible: false });
    expect(v.estado).toBe('listo');
    expect(v.items).toBe(plan);
    expect(v.puedeReintentar).toBe(false);
  });

  it('antes del Día 1 no hay nada planificado ni que mostrar', () => {
    const { v, itemsPlanificados } = vista('pasado', undefined, { leible: false, previoAlPrograma: true });
    expect(v.items).toEqual([]);
    expect(v.resumen).toBe('Tu programa empezó después de este día.');
    expect(itemsPlanificados).not.toHaveBeenCalled();
  });
});
