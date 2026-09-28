import { beforeEach, describe, expect, it } from '@jest/globals';

import { destinoDeRuta } from '../../api/avisosApi';
import { anotarRutaDeAviso, consumirRutaPendiente, olvidarRutaPendiente } from '../rutaDeAviso';

/**
 * D-218 (2026-09-28): tocar el recordatorio de un hábito abre Training en su dimensión, y el de una
 * acción abre Plan → Objetivos. El push del servidor (respaldo de D-217) y la alarma local llevan la
 * misma ruta: `/habitos/{habitoId}?dimension={BODY|MIND|CONSCIENCE|SPIRIT}` y `/objetivos/{fecha}?eje=`.
 *
 * Contra el código viejo falla: `destinoDeRuta` no conocía ninguna de las dos y el toque solo abría la
 * app en la pestaña donde estuviera.
 */
beforeEach(() => olvidarRutaPendiente());

describe('ruta del aviso de un hábito', () => {
  it('se reconoce con su id y la dimensión de Training que corresponde a la categoría', () => {
    expect(destinoDeRuta('/habitos/h-1?dimension=BODY')).toEqual({ tipo: 'habito', habitoId: 'h-1', dimension: 'CUERPO' });
    expect(destinoDeRuta('/habitos/h%202?dimension=SPIRIT')).toEqual({
      tipo: 'habito',
      habitoId: 'h 2',
      dimension: 'ESPÍRITU',
    });
  });

  it('sin dimensión o con una desconocida, igual abre: Training la busca por el id', () => {
    expect(destinoDeRuta('/habitos/h-1')).toEqual({ tipo: 'habito', habitoId: 'h-1', dimension: null });
    expect(destinoDeRuta('/habitos/h-1/?dimension=OTRA')).toEqual({ tipo: 'habito', habitoId: 'h-1', dimension: null });
  });

  it('una ruta de hábito mal formada no abre nada', () => {
    expect(destinoDeRuta('/habitos/')).toBeNull();
    expect(destinoDeRuta('/habitos/%')).toBeNull();
    expect(destinoDeRuta('/habitos/a/b')).toBeNull();
  });

  it('queda esperando para Training: las otras escuchas no se la llevan', () => {
    expect(anotarRutaDeAviso('/habitos/h-9?dimension=MIND')).toBe(true);
    expect(consumirRutaPendiente('evento')).toBeNull();
    expect(consumirRutaPendiente('alumno')).toBeNull();
    expect(consumirRutaPendiente('habito')).toEqual({ tipo: 'habito', habitoId: 'h-9', dimension: 'MENTE' });
  });
});

describe('ruta del aviso de una acción de objetivo', () => {
  it('se reconoce con la fecha y el eje', () => {
    expect(destinoDeRuta('/objetivos/2026-10-02?eje=TRABAJO')).toEqual({
      tipo: 'objetivo',
      fecha: '2026-10-02',
      eje: 'TRABAJO',
    });
    expect(destinoDeRuta('/objetivos/2026-10-02')).toEqual({ tipo: 'objetivo', fecha: '2026-10-02', eje: null });
  });

  it('una fecha que no es fecha, o un eje inventado, no se aceptan', () => {
    expect(destinoDeRuta('/objetivos/mañana')).toBeNull();
    expect(destinoDeRuta('/objetivos/2026-10-02?eje=NEGOCIO')).toEqual({
      tipo: 'objetivo',
      fecha: '2026-10-02',
      eje: null,
    });
  });
});
