import { describe, expect, it } from '@jest/globals';

/**
 * «Tus acciones de hoy» de Plan (spec 016, opción B): las filas por eje con su conteo, la que sigue y los estados con forma.
 * El ejemplo es el de la vista previa aprobada: jueves 29, 15:40, día 20, seis acciones en tres ejes.
 */

import type { EjeObjetivo, RocaDiariaApi } from '../../types/objetivos.types';
import {
  estadoDeLaAccion,
  etiquetaDeLaFila,
  filasPorEje,
  fraseDeLaFila,
  horaCortaDeLaAccion,
  ordenarAcciones,
  subtituloDelDia,
  textoDelAvance,
  textoDelEstado,
} from '../accionesDeHoy';

const min = (h: number, m = 0) => h * 60 + m;

let contador = 0;
function roca(titulo: string, eje: EjeObjetivo, hora: string | null, extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi {
  contador += 1;
  return {
    id: `r${contador}`,
    fecha: '2026-10-29',
    posicion: 1,
    titulo,
    descripcion: null,
    color: 'VERDE',
    puntajeImpacto: 5,
    esDelegable: false,
    eje,
    rocaSemanalId: null,
    horaInicio: hora ? `${hora}:00` : null,
    horaFin: null,
    completada: false,
    completadaEn: null,
    puntosOtorgados: 0,
    bloqueada: false,
    acciones: [],
    ...extra,
  };
}

/** La vista previa: 2 de 6 cumplidas a las 15:40. */
const DEL_EJEMPLO = [
  roca('Caminar 40 minutos', 'CUERPO', '08:30', { completada: true }),
  roca('Llamar a 5 prospectos', 'TRABAJO', '10:00', { completada: true }),
  roca('Llamar a mi hijo', 'RELACIONES', '13:00'),
  roca('Enviar 3 propuestas', 'TRABAJO', '16:00'),
  roca('Estirar 15 minutos', 'CUERPO', '18:30'),
  roca('Confirmar 2 reuniones', 'TRABAJO', null),
];
const EJES: EjeObjetivo[] = ['TRABAJO', 'CUERPO', 'RELACIONES'];

describe('el estado de cada acción', () => {
  it('cumplida manda sobre todo', () => {
    expect(estadoDeLaAccion(roca('a', 'CUERPO', '08:00', { completada: true, bloqueada: true }), min(15, 40))).toBe('cumplida');
  });

  it('espera a la verde por Pareto, tenga la hora que tenga', () => {
    expect(estadoDeLaAccion(roca('a', 'CUERPO', '08:00', { bloqueada: true }), min(15, 40))).toBe('esperaALaVerde');
  });

  it('se te pasó la hora: pendiente y su hora ya pasó; en el minuto exacto o después, todavía no', () => {
    expect(estadoDeLaAccion(roca('a', 'CUERPO', '13:00'), min(15, 40))).toBe('sePaso');
    expect(estadoDeLaAccion(roca('a', 'CUERPO', '15:40'), min(15, 40))).toBe('pendiente');
    expect(estadoDeLaAccion(roca('a', 'CUERPO', '16:00'), min(15, 40))).toBe('pendiente');
  });

  it('sin hora nunca se pasa', () => {
    expect(estadoDeLaAccion(roca('a', 'CUERPO', null), min(23, 59))).toBe('pendiente');
  });
});

describe('el orden y la hora', () => {
  it('por hora, las sin hora al final y a igual hora la verde primero', () => {
    const rojas = roca('rojo', 'TRABAJO', '10:00', { posicion: 3 });
    const verde = roca('verde', 'TRABAJO', '10:00', { posicion: 1 });
    const sin = roca('sin', 'TRABAJO', null);
    const temprano = roca('temprano', 'TRABAJO', '07:15');
    expect(ordenarAcciones([sin, rojas, verde, temprano]).map(r => r.titulo)).toEqual(['temprano', 'verde', 'rojo', 'sin']);
  });

  it('la hora se dice HH:mm y sin hora es null', () => {
    expect(horaCortaDeLaAccion(roca('a', 'CUERPO', '16:00'))).toBe('16:00');
    expect(horaCortaDeLaAccion(roca('a', 'CUERPO', null))).toBeNull();
  });
});

describe('una fila por eje', () => {
  const filas = filasPorEje(DEL_EJEMPLO, EJES, min(15, 40));

  it('en el orden de las prioridades, con «n de m» y el total que suma «2 de 6»', () => {
    expect(filas.map(f => [f.nombre, textoDelAvance(f.cumplidas, f.total)])).toEqual([
      ['Negocio', '1 de 3'],
      ['Cuerpo', '1 de 2'],
      ['Relaciones', '0 de 1'],
    ]);
    expect(filas.reduce((s, f) => s + f.cumplidas, 0)).toBe(2);
    expect(filas.reduce((s, f) => s + f.total, 0)).toBe(DEL_EJEMPLO.length);
  });

  it('un símbolo por acción, en orden de hora', () => {
    expect(filas[0].acciones.map(a => [a.accion.titulo, a.estado])).toEqual([
      ['Llamar a 5 prospectos', 'cumplida'],
      ['Enviar 3 propuestas', 'pendiente'],
      ['Confirmar 2 reuniones', 'pendiente'],
    ]);
    expect(filas[2].acciones.map(a => a.estado)).toEqual(['sePaso']);
  });

  it('«Sigue: X · HH:MM», «Se te pasó: X»', () => {
    expect(filas.map(fraseDeLaFila)).toEqual([
      'Sigue: Enviar 3 propuestas · 16:00',
      'Sigue: Estirar 15 minutos · 18:30',
      'Se te pasó: Llamar a mi hijo',
    ]);
  });

  it('la que sigue sin hora se dice sin hora', () => {
    const f = filasPorEje([roca('Confirmar', 'TRABAJO', null)], EJES, min(9));
    expect(fraseDeLaFila(f[0])).toBe('Sigue: Confirmar');
  });

  it('con el principal primero, ese eje abre la lista', () => {
    const f = filasPorEje(DEL_EJEMPLO, ['RELACIONES', 'CUERPO', 'TRABAJO'], min(15, 40));
    expect(f.map(x => x.nombre)).toEqual(['Relaciones', 'Cuerpo', 'Negocio']);
  });

  it('un eje sin acciones hoy no tiene fila', () => {
    const f = filasPorEje([roca('Solo cuerpo', 'CUERPO', '09:00')], EJES, min(8));
    expect(f.map(x => x.nombre)).toEqual(['Cuerpo']);
  });

  it('sin acciones hoy no hay filas', () => {
    expect(filasPorEje([], EJES, min(8))).toEqual([]);
  });

  it('todo cumplido: no hay «la que sigue» y lo dice', () => {
    const f = filasPorEje([roca('a', 'CUERPO', '08:00', { completada: true }), roca('b', 'CUERPO', '09:00', { completada: true })], EJES, min(12));
    expect(f[0].sigue).toBeNull();
    expect(textoDelAvance(f[0].cumplidas, f[0].total)).toBe('2 de 2');
    expect(fraseDeLaFila(f[0])).toBe('Todo cumplido');
  });

  describe('la regla de Pareto (la verde va primero)', () => {
    it('la verde pendiente y las otras dos con candado', () => {
      const f = filasPorEje(
        [
          roca('verde', 'TRABAJO', '09:00', { posicion: 1, color: 'VERDE' }),
          roca('amarilla', 'TRABAJO', '10:00', { posicion: 2, color: 'AMARILLA', bloqueada: true }),
          roca('roja', 'TRABAJO', '11:00', { posicion: 3, color: 'ROJA', bloqueada: true }),
        ],
        EJES,
        min(8),
      );
      expect(f[0].acciones.map(a => a.estado)).toEqual(['pendiente', 'esperaALaVerde', 'esperaALaVerde']);
      expect(f[0].sigue?.accion.titulo).toBe('verde');
    });

    it('una bloqueada más temprana que la verde no es «la que sigue»', () => {
      const f = filasPorEje(
        [
          roca('amarilla', 'TRABAJO', '08:00', { posicion: 2, bloqueada: true }),
          roca('verde', 'TRABAJO', '18:00', { posicion: 1 }),
        ],
        EJES,
        min(7),
      );
      expect(f[0].sigue?.accion.titulo).toBe('verde');
      expect(fraseDeLaFila(f[0])).toBe('Sigue: verde · 18:00');
    });
  });
});

describe('el subtítulo', () => {
  it('«Jueves 29 · día 20 de 90»', () => {
    expect(subtituloDelDia('2026-10-29', 20)).toBe('Jueves 29 · día 20 de 90');
  });

  it('lo que no se sabe no se inventa', () => {
    expect(subtituloDelDia('2026-10-29', null)).toBe('Jueves 29');
    expect(subtituloDelDia('2026-10-29', 0)).toBe('Jueves 29');
    expect(subtituloDelDia(null, 20)).toBe('Día 20 de 90');
    expect(subtituloDelDia(null, null)).toBe('');
    expect(subtituloDelDia('no-es-fecha', null)).toBe('');
  });
});

describe('los textos', () => {
  it('lo que dice cada estado en la hoja de su eje', () => {
    expect(textoDelEstado('cumplida', '08:52')).toBe('Cumplida 08:52');
    expect(textoDelEstado('cumplida', null)).toBe('Cumplida');
    expect(textoDelEstado('esperaALaVerde', null)).toBe('Se abre al completar la primera');
    expect(textoDelEstado('sePaso', null)).toBe('Se te pasó la hora · todavía puedes registrarla hoy');
    expect(textoDelEstado('pendiente', null)).toBe('Pendiente');
  });

  it('la etiqueta de la fila para el lector de pantalla', () => {
    const [negocio] = filasPorEje(DEL_EJEMPLO, EJES, min(15, 40));
    expect(etiquetaDeLaFila(negocio)).toBe('Negocio, 1 de 3 cumplidas. Sigue: Enviar 3 propuestas · 16:00. Abre sus acciones');
  });
});
