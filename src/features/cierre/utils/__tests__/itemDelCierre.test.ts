import { describe, expect, it } from '@jest/globals';

import type { AccionDelCierre, CierreDelDia } from '../../types/cierre.types';
import { itemDelCierreDeHoy, itemDelCierreDeUnDiaAnterior, lineaDeManana } from '../itemDelCierre';

const accion = (id: string, titulo: string, manana: string | null, extra: Partial<AccionDelCierre> = {}): AccionDelCierre => ({
  id,
  titulo,
  horaInicio: null,
  cumplida: false,
  cumplidaEn: null,
  cierre: manana ? { motivo: 'SIN_TIEMPO', manana, nota: null } : null,
  ...extra,
});
const cierre = (acciones: AccionDelCierre[], extra: Partial<CierreDelDia> = {}): CierreDelDia => ({
  fecha: '2026-10-29',
  estado: 'CERRADO',
  cerradoEn: '2026-10-29T22:02:00',
  nota: null,
  acciones,
  puedeCerrar: true,
  semana: null,
  ...extra,
});

describe('lo que dijo para mañana, en una línea', () => {
  it('«Mañana: «Revisar las facturas» a otra hora»', () => {
    expect(lineaDeManana(cierre([accion('b', 'Revisar las facturas', 'OTRA_HORA')]))).toBe('Mañana: «Revisar las facturas» a otra hora');
  });

  it('cada plan se dice en una frase corta', () => {
    const frase = (plan: string) => lineaDeManana(cierre([accion('b', 'X', plan)]));
    expect(frase('MAS_CORTA')).toBe('Mañana: «X» más corta');
    expect(frase('PEDIR_AYUDA')).toBe('Mañana: «X» con ayuda');
    expect(frase('DEJARLA')).toBe('Mañana: «X» la dejas');
  });

  it('con varias, la primera y cuántas más', () => {
    expect(lineaDeManana(cierre([accion('b', 'A', 'OTRA_HORA'), accion('c', 'B', 'DEJARLA'), accion('d', 'C', 'MAS_CORTA')]))).toBe(
      'Mañana: «A» a otra hora y 2 más',
    );
  });

  it('lo cumplido no entra, ni una respuesta que no se entiende; sin nada, null', () => {
    expect(lineaDeManana(cierre([accion('a', 'Hecha', 'OTRA_HORA', { cumplida: true })]))).toBeNull();
    expect(lineaDeManana(cierre([accion('b', 'X', 'NUEVO')]))).toBeNull();
    expect(lineaDeManana(cierre([]))).toBeNull();
  });
});

describe('el ítem de hoy', () => {
  it('sin cerrar: «Cierra tu día», a su hora, sin puntos, sin guía, ni hecho', () => {
    const item = itemDelCierreDeHoy('2026-10-29', '22:00', cierre([], { estado: 'ABIERTO', cerradoEn: null }));
    expect(item).toMatchObject({
      clave: 'cierre-2026-10-29',
      tipo: 'cierre',
      titulo: 'Cierra tu día',
      hora: '22:00',
      hecho: false,
      icono: 'moon',
      puntos: null,
      guia: null,
      cierre: { estado: 'ABIERTO', lineaDeManana: null, cerradoA: null },
    });
  });

  it('cerrado: «Día cerrado», hecho, con lo de mañana y la hora en que cerró', () => {
    const item = itemDelCierreDeHoy('2026-10-29', '22:00', cierre([accion('b', 'Revisar las facturas', 'OTRA_HORA')]));
    expect(item.titulo).toBe('Día cerrado');
    expect(item.hecho).toBe(true);
    expect(item.cierre?.estado).toBe('CERRADO');
    expect(item.cierre?.lineaDeManana).toBe('Mañana: «Revisar las facturas» a otra hora');
    expect(item.cierre?.cerradoA).toBe('22:02');
  });
});

describe('el ítem de un día anterior', () => {
  it('«Cerrado» con la hora del cierre', () => {
    const item = itemDelCierreDeUnDiaAnterior('2026-10-28', cierre([], { fecha: '2026-10-28' }));
    expect(item).toMatchObject({ clave: 'cierre-2026-10-28', hecho: true, hora: '22:02', cierre: { estado: 'CERRADO' } });
  });

  it('«Sin cerrar» no tiene hora (no se inventa una)', () => {
    const item = itemDelCierreDeUnDiaAnterior('2026-10-28', cierre([], { fecha: '2026-10-28', estado: 'SIN_CERRAR', cerradoEn: null }));
    expect(item).toMatchObject({ hecho: false, hora: null, titulo: 'Cierra tu día', cierre: { estado: 'SIN_CERRAR' } });
  });

  it('si el servidor no dijo cómo quedó ese día, o dijo que sigue abierto, no hay fila', () => {
    expect(itemDelCierreDeUnDiaAnterior('2026-10-28', cierre([], { estado: null }))).toBeNull();
    expect(itemDelCierreDeUnDiaAnterior('2026-10-28', cierre([], { estado: 'ABIERTO' }))).toBeNull();
  });
});
