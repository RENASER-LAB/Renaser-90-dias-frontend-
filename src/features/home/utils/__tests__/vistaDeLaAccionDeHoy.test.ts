import { describe, expect, it } from '@jest/globals';

import type { ObjetivosParaHoy } from '../../../objetivos/hooks/useObjetivosDeNoventaDias';
import type { RocaDiariaApi } from '../../../objetivos/types/objetivos.types';
import { vistaDeLaAccionDeHoy } from '../vistaDeLaAccionDeHoy';

/**
 * La tarjeta de acciones de Hoy (2026-10-31; spec 026 cambió lo que decía cuando no hay acciones): qué muestra en cada estado.
 * `null` = todavía no se sabe, y la tarjeta no se dibuja (sin parpadeo).
 */

let n = 0;
function roca(extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi {
  n += 1;
  return {
    id: `r${n}`, fecha: '2026-10-31', posicion: 1, titulo: `Acción ${n}`, descripcion: null, color: 'VERDE', puntajeImpacto: 5,
    esDelegable: false, eje: 'CUERPO', rocaSemanalId: null, horaInicio: '09:00:00', horaFin: null, completada: false, completadaEn: null,
    puntosOtorgados: 0, bloqueada: false, acciones: [], ...extra,
  };
}
const CON_TODOS: ObjetivosParaHoy = { estado: 'listo', total: 3, porConfirmar: 0 };
const SIN_NINGUNO: ObjetivosParaHoy = { estado: 'listo', total: 0, porConfirmar: 0 };
const AHORA = 8 * 60;

describe('vistaDeLaAccionDeHoy', () => {
  it('mientras no se leyeron las acciones, nada (cargando)', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: null, objetivos: SIN_NINGUNO, ahoraMin: AHORA })).toBeNull();
  });

  it('con acciones sin cumplir muestra la que sigue, aunque no haya objetivos o estén por confirmar', () => {
    const a = roca({ titulo: 'Caminar 40 minutos', horaInicio: '08:30:00' });
    const b = roca({ titulo: 'Facturar', horaInicio: '10:00:00', eje: 'TRABAJO' });
    for (const objetivos of [SIN_NINGUNO, { estado: 'listo', total: 3, porConfirmar: 3 } as const, { estado: 'cargando', total: 0, porConfirmar: 0 } as const]) {
      expect(vistaDeLaAccionDeHoy({ rocas: [b, a], objetivos, ahoraMin: AHORA })).toEqual({ tipo: 'accion', accion: a });
    }
  });

  it('con todo cumplido dice que cumplió', () => {
    const rocas = [roca({ completada: true }), roca({ completada: true })];
    expect(vistaDeLaAccionDeHoy({ rocas, objetivos: CON_TODOS, ahoraMin: AHORA })).toEqual({ tipo: 'todo-cumplido' });
  });

  it('sin acciones hoy y con sus tres objetivos: «sin acciones» (agendar en Plan)', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: CON_TODOS, ahoraMin: AHORA })).toEqual({ tipo: 'sin-acciones' });
  });

  it('sin acciones y sin objetivos de 90 días: «define tu objetivo en Plan» (sin Mapa ni diagnóstico se escriben ahí)', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: SIN_NINGUNO, ahoraMin: AHORA })).toEqual({ tipo: 'sin-objetivos' });
  });

  it('con objetivos a medias (la semana espera a los tres) también pide definirlos', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: { estado: 'listo', total: 2, porConfirmar: 0 }, ahoraMin: AHORA })).toEqual({ tipo: 'sin-objetivos' });
  });

  it('sin acciones y con objetivos del diagnóstico por confirmar: «confirma tus objetivos», con cuántos', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: { estado: 'listo', total: 3, porConfirmar: 3 }, ahoraMin: AHORA })).toEqual({ tipo: 'por-confirmar', cantidad: 3 });
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: { estado: 'listo', total: 3, porConfirmar: 1 }, ahoraMin: AHORA })).toEqual({ tipo: 'por-confirmar', cantidad: 1 });
  });

  it('por confirmar manda sobre «sin objetivos» (lo que falta confirmar es lo primero)', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: { estado: 'listo', total: 1, porConfirmar: 1 }, ahoraMin: AHORA })).toEqual({ tipo: 'por-confirmar', cantidad: 1 });
  });

  it('no afirma nada de los objetivos mientras no se leyeron (sin parpadeo)', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: { estado: 'cargando', total: 0, porConfirmar: 0 }, ahoraMin: AHORA })).toBeNull();
  });

  it('si la lectura de los objetivos falló (sin red, servidor anterior) no afirma nada: «sin acciones»', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], objetivos: { estado: 'error', total: 0, porConfirmar: 0 }, ahoraMin: AHORA })).toEqual({ tipo: 'sin-acciones' });
  });
});
