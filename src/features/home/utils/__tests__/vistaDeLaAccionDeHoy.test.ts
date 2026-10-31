import { describe, expect, it } from '@jest/globals';

import type { RocaDiariaApi } from '../../../objetivos/types/objetivos.types';
import { vistaDeLaAccionDeHoy, type LecturaDelMapaParaHoy } from '../vistaDeLaAccionDeHoy';

/**
 * La tarjeta de acciones de Hoy (2026-10-31): qué muestra en cada estado. `null` = todavía no se sabe, y la tarjeta no se dibuja
 * (sin parpadeo).
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
const MAPA_ACTIVO: LecturaDelMapaParaHoy = { habilitado: true, estado: 'activo', confirmado: true };
const SIN_MAPA: LecturaDelMapaParaHoy = { habilitado: true, estado: 'no_iniciado', confirmado: true };
const AHORA = 8 * 60;

describe('vistaDeLaAccionDeHoy', () => {
  it('mientras no se leyeron las acciones, nada (cargando)', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: null, mapa: SIN_MAPA, ahoraMin: AHORA })).toBeNull();
  });

  it('con acciones sin cumplir muestra la que sigue, aunque el Mapa no esté activo', () => {
    const a = roca({ titulo: 'Caminar 40 minutos', horaInicio: '08:30:00' });
    const b = roca({ titulo: 'Facturar', horaInicio: '10:00:00', eje: 'TRABAJO' });
    expect(vistaDeLaAccionDeHoy({ rocas: [b, a], mapa: SIN_MAPA, ahoraMin: AHORA })).toEqual({ tipo: 'accion', accion: a });
  });

  it('con todo cumplido dice que cumplió', () => {
    const rocas = [roca({ completada: true }), roca({ completada: true })];
    expect(vistaDeLaAccionDeHoy({ rocas, mapa: MAPA_ACTIVO, ahoraMin: AHORA })).toEqual({ tipo: 'todo-cumplido' });
  });

  it('sin acciones hoy y con el Mapa activo: «sin acciones»', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], mapa: MAPA_ACTIVO, ahoraMin: AHORA })).toEqual({ tipo: 'sin-acciones' });
  });

  it('sin acciones y sin Mapa activo (confirmado): el objetivo nace del Mapa', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], mapa: SIN_MAPA, ahoraMin: AHORA })).toEqual({ tipo: 'mapa' });
    for (const estado of ['en_progreso', 'listo_para_revision'] as const) {
      expect(vistaDeLaAccionDeHoy({ rocas: [], mapa: { habilitado: true, estado, confirmado: true }, ahoraMin: AHORA })).toEqual({ tipo: 'mapa' });
    }
  });

  it('no afirma «sin Mapa» mientras el servidor no lo confirmó (un teléfono nuevo dice «no iniciado» de quien ya lo hizo)', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], mapa: { habilitado: true, estado: 'no_iniciado', confirmado: false }, ahoraMin: AHORA })).toBeNull();
    expect(vistaDeLaAccionDeHoy({ rocas: [], mapa: { habilitado: true, estado: null, confirmado: false }, ahoraMin: AHORA })).toBeNull();
  });

  it('en un build sin el Mapa no se lo pide a nadie: «sin acciones»', () => {
    expect(vistaDeLaAccionDeHoy({ rocas: [], mapa: { habilitado: false, estado: null, confirmado: false }, ahoraMin: AHORA })).toEqual({ tipo: 'sin-acciones' });
  });
});
