import { describe, expect, it } from '@jest/globals';

import type { RocaDiariaApi } from '../../types/objetivos.types';
import { diasDeLaAgenda, diaYHoraDeLaAccion, loQueViene, nivelesDeLaRuta, posicionarLosNiveles, type EntradaDeLaRuta } from '../rutaDelPlan';

const HOY = '2026-11-25';

function accion(id: string, fecha: string, hora: string | null, extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi {
  return {
    id, fecha, posicion: 1, titulo: `Acción ${id}`, descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false, eje: 'CUERPO',
    rocaSemanalId: null, horaInicio: hora, horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0, bloqueada: false, acciones: [], ...extra,
  };
}

function entrada(extra: Partial<EntradaDeLaRuta> = {}): EntradaDeLaRuta {
  return {
    acciones: [], hoyIso: HOY, eje: 'CUERPO', estadoDeLaSemana: 'planificada', tituloDeLaSemana: 'Entrenar 4 veces', revisada: null,
    puedeAgendar: true, sinLectura: false, plazo: '90 días', ...extra,
  };
}

describe('la ruta de niveles de Plan', () => {
  // spec 058 FR-004
  it('cada nivel dice su día y su hora; sin hora, solo el día', () => {
    expect(diaYHoraDeLaAccion({ fecha: HOY, horaInicio: '14:00:00' }, HOY)).toBe('Hoy 14:00');
    expect(diaYHoraDeLaAccion({ fecha: '2026-11-24', horaInicio: '07:00:00' }, HOY)).toBe('Mar 07:00');
    expect(diaYHoraDeLaAccion({ fecha: '2026-11-27', horaInicio: null }, HOY)).toBe('Vie');
  });

  // spec 058 FR-004
  it('cumplido lleno, el siguiente grande con el fénix, por hacer y con candado (Ley IV)', () => {
    const niveles = nivelesDeLaRuta(
      entrada({
        acciones: [
          accion('a', HOY, '07:00:00', { completada: true }),
          accion('b', HOY, '14:00:00'),
          accion('c', HOY, '15:00:00', { bloqueada: true, posicion: 2 }),
          accion('d', '2026-11-26', '07:00:00'),
        ],
      }),
    );
    expect(niveles.map(n => n.tipo)).toEqual(['cumplido', 'siguiente', 'candado', 'porHacer', 'mas', 'cofre']);
    expect(niveles[1]).toMatchObject({ grande: true, conFenix: true, detalle: 'Hoy 14:00', alTocar: 'accion' });
    expect(niveles.filter(n => n.conFenix)).toHaveLength(1);
    expect(niveles[2].alTocar).toBeNull();
    expect(niveles[0].alTocar).toBeNull();
    expect(niveles[3].alTocar).toBe('agendarDia');
  });

  // spec 058 FR-006
  it('semana sin objetivo: el primer nivel es «Arma tu semana» y los demás tienen candado', () => {
    const niveles = nivelesDeLaRuta(entrada({ tituloDeLaSemana: null }));
    expect(niveles[0]).toMatchObject({ tipo: 'arma', titulo: 'Arma tu semana', alTocar: 'armar', grande: true });
    expect(niveles.slice(1, -1).every(n => n.tipo === 'candado' && n.alTocar === null)).toBe(true);
    expect(niveles[niveles.length - 1]).toMatchObject({ tipo: 'cofre', abierto: false, alTocar: null });
  });

  // spec 058 FR-006
  it('día 1 sin objetivos: el primer nivel son «Tus metas de <plazo>», con el plazo de la persona', () => {
    const niveles = nivelesDeLaRuta(entrada({ estadoDeLaSemana: 'bloqueada', tituloDeLaSemana: null, plazo: '3 meses' }));
    expect(niveles[0]).toMatchObject({ tipo: 'metas', titulo: 'Tus metas de 3 meses', alTocar: 'metas' });
    expect(niveles[1].tipo).toBe('candado');
  });

  // spec 058 FR-007
  it('el «+» va al final de la semana y solo si se puede agendar', () => {
    const con = nivelesDeLaRuta(entrada({ acciones: [accion('a', HOY, '07:00:00')] }));
    expect(con[con.length - 2]).toMatchObject({ tipo: 'mas', alTocar: 'mas' });
    const sin = nivelesDeLaRuta(entrada({ acciones: [accion('a', HOY, '07:00:00')], puedeAgendar: false }));
    expect(sin.some(n => n.tipo === 'mas')).toBe(false);
  });

  // spec 058 FR-008
  it('el cofre abre la revisión y se ve abierto con la semana revisada', () => {
    const cerrado = nivelesDeLaRuta(entrada({ acciones: [accion('a', HOY, '07:00:00')] })).pop();
    expect(cerrado).toMatchObject({ tipo: 'cofre', abierto: false, alTocar: 'cofre' });
    const abierto = nivelesDeLaRuta(entrada({ estadoDeLaSemana: 'cerrada', revisada: 8, acciones: [accion('a', HOY, '07:00:00', { completada: true })] })).pop();
    expect(abierto).toMatchObject({ tipo: 'cofre', abierto: true, alTocar: null, detalle: 'Revisada · 8 de 10' });
  });

  // spec 058 FR-013
  it('sin lectura (sin señal y sin nada guardado) no se inventa ningún nivel', () => {
    expect(nivelesDeLaRuta(entrada({ sinLectura: true }))).toEqual([]);
    expect(nivelesDeLaRuta(entrada({ estadoDeLaSemana: 'cargando' }))).toEqual([]);
  });

  // spec 058 FR-013
  it('con una acción agendada sin señal se dibuja con lo guardado y dice que se guardará', () => {
    const niveles = nivelesDeLaRuta(entrada({ acciones: [accion('pendiente:1', HOY, '09:00:00', { pendienteDeEnvio: true })] }));
    expect(niveles[0].detalle).toContain('Se guardará al volver la señal');
  });

  // spec 058 FR-003
  it('el zigzag posiciona los niveles de arriba abajo, el grande con más aire, y la etiqueta al lado contrario del centro', () => {
    const niveles = nivelesDeLaRuta(entrada({ acciones: [accion('a', HOY, '07:00:00'), accion('b', HOY, '08:00:00')] }));
    const { items, alto } = posicionarLosNiveles(niveles);
    expect(items.map(i => i.y)).toEqual([...items.map(i => i.y)].sort((a, b) => a - b));
    expect(items[0].nivel.grande).toBe(true);
    expect(items[0].ancho).toBeGreaterThan(items[1].ancho);
    expect(alto).toBeGreaterThan(items[items.length - 1].y);
    for (const i of items) expect(i.etiquetaALaIzquierda).toBe(i.xPorCiento >= 50);
  });

  // spec 058 FR-003
  it('«Lo que viene»: la semana siguiente, los meses que faltan y la meta, con el plazo de la persona', () => {
    const items = loQueViene({
      numeroSemana: 4, numeroMes: 1, diaPrograma: 23, duracionDias: 90, armaLaQueEmpieza: false, queEmpiezaArmada: false,
      hoy: new Date(2026, 10, 25, 12), objetivoDelMes: m => (m === 2 ? 'llegar a 78 kg' : null), meta: 'De 82 a 76 kg',
    });
    expect(items.map(i => i.tipo)).toEqual(['semana', 'mes', 'mes', 'meta']);
    expect(items[0]).toMatchObject({ titulo: expect.stringContaining('Semana 5'), detalle: 'se arma el domingo', alTocar: null });
    expect(items[1]).toMatchObject({ titulo: 'Mes 2 · llegar a 78 kg', detalle: 'semanas 5 a 8' });
    expect(items[2].titulo).toBe('Mes 3');
    expect(items[3]).toMatchObject({ titulo: 'Tu meta: De 82 a 76 kg', detalle: 'día 90' });
  });

  // spec 058 FR-012
  it('«Lo que viene» usa los meses y el día final de la duración de la persona, y el domingo la semana que empieza se puede armar', () => {
    const items = loQueViene({
      numeroSemana: 10, numeroMes: 3, diaPrograma: 60, duracionDias: 365, armaLaQueEmpieza: true, queEmpiezaArmada: false,
      hoy: new Date(2026, 10, 29, 12), objetivoDelMes: () => null, meta: null,
    });
    expect(items[0]).toMatchObject({ detalle: 'se arma hoy', alTocar: 'armar' });
    expect(items.filter(i => i.tipo === 'mes')).toHaveLength(9);
    expect(items[items.length - 1]).toMatchObject({ titulo: 'Tu meta', detalle: 'día 365' });
  });

  // spec 058 FR-010
  it('la agenda del engranaje marca con un punto los días de la semana que tienen acciones', () => {
    const dias = diasDeLaAgenda(new Date(2026, 10, 25, 12), [accion('a', '2026-11-24', null), accion('b', '2026-11-27', null)]);
    expect(dias.map(d => d.numero)).toEqual([23, 24, 25, 26, 27, 28, 29]);
    expect(dias.filter(d => d.tieneAcciones).map(d => d.numero)).toEqual([24, 27]);
    expect(dias.find(d => d.esHoy)?.numero).toBe(25);
  });
});
