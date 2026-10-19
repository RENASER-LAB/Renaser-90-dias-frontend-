/**
 * Lo que dice la imagen del podio que se comparte (spec 006 del backend, T036): los 10 primeros de la tabla
 * que se está mirando, con la unidad de cada tabla, el nombre completo (recortado con «…» solo si no cabe)
 * y la fecha en español de Perú. Las mismas filas que ve la pantalla: sin reordenar ni filtrar.
 */
import { describe, expect, it } from '@jest/globals';

import type { EntradaRankingDto, RankingAgregadoDto } from '../../api/rankingApi';
import {
  fechaDeLaImagen,
  MAX_CARACTERES_FILA,
  MAX_CARACTERES_PODIO,
  PUESTOS_EN_LA_IMAGEN,
  podioParaCompartir,
  recortarNombre,
} from '../podioParaCompartir';
import { entradasDeLaTabla, textoDelPuntaje } from '../tablasDeRanking';

const entrada = (n: number, fullName = `Persona ${n}`, puntaje = 100 - n): EntradaRankingDto => ({
  participanteId: `p-${n}`,
  fullName,
  posicion: n,
  puntaje,
});

const DOCE = Array.from({ length: 12 }, (_, i) => entrada(i + 1));
const HOY = new Date(2026, 9, 19, 23, 30); // 19 de octubre de 2026, de noche en el teléfono

describe('los puestos', () => {
  it('toma los 10 primeros de la tabla: tres al podio y del 4.º al 10.º a la lista', () => {
    const p = podioParaCompartir(DOCE, 'general', '2026-10-19', HOY);
    expect(PUESTOS_EN_LA_IMAGEN).toBe(10);
    expect(p.total).toBe(10);
    expect(p.podio.map(x => x?.posicion)).toEqual([1, 2, 3]);
    expect(p.lista.map(x => x.posicion)).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(p.lista.map(x => x.nombre)).not.toContain('Persona 11');
  });

  it('no reordena: la imagen dice lo mismo que la tabla en pantalla, en su orden', () => {
    const desordenadas = [entrada(2, 'Beto'), entrada(1, 'Ana'), entrada(3, 'Carla')];
    const p = podioParaCompartir(desordenadas, 'general', '2026-10-19', HOY);
    expect(p.podio.map(x => x?.nombre)).toEqual(['Beto', 'Ana', 'Carla']);
  });

  it('con menos de 10 personas salen solo las que hay y el podio sin nadie queda libre (`null`)', () => {
    const solo2 = podioParaCompartir(DOCE.slice(0, 2), 'general', '2026-10-19', HOY);
    expect(solo2.podio.map(x => x?.nombre ?? null)).toEqual(['Persona 1', 'Persona 2', null]);
    expect(solo2.lista).toEqual([]);
    expect(solo2.total).toBe(2);

    const cinco = podioParaCompartir(DOCE.slice(0, 5), 'general', '2026-10-19', HOY);
    expect(cinco.podio.every(x => x !== null)).toBe(true);
    expect(cinco.lista.map(x => x.posicion)).toEqual([4, 5]);

    const nadie = podioParaCompartir([], 'general', '2026-10-19', HOY);
    expect(nadie.podio).toEqual([null, null, null]);
    expect(nadie.lista).toEqual([]);
    expect(nadie.total).toBe(0);
  });

  it('con una tabla de kilómetros que ya no trae a quien tiene 0, toma las filas de la pestaña', () => {
    const datos: RankingAgregadoDto = {
      fecha: '2026-10-19', celula: null, liga: [], coherenciaIndividual: [], general: [],
      kilometros: [entrada(1, 'Ana', 42.2), entrada(2, 'Beto', 7.5), entrada(3, 'Carla', 0)],
    };
    const p = podioParaCompartir(entradasDeLaTabla(datos, 'kilometros'), 'kilometros', datos.fecha, HOY);
    expect(p.total).toBe(2);
    expect(p.podio.map(x => x?.nombre ?? null)).toEqual(['Ana', 'Beto', null]);
  });
});

describe('el puntaje y el título de cada tabla', () => {
  it('usa el texto del puntaje de la tabla (pts, km, días)', () => {
    const e = [entrada(1, 'Ana', 91.5)];
    expect(podioParaCompartir(e, 'general', null, HOY).podio[0]?.puntaje).toBe(textoDelPuntaje('general', 91.5));
    expect(podioParaCompartir(e, 'general', null, HOY).podio[0]?.puntaje).toBe('91.5 pts');
    expect(podioParaCompartir([entrada(1, 'Ana', 12.5)], 'kilometros', null, HOY).podio[0]?.puntaje).toBe(
      textoDelPuntaje('kilometros', 12.5),
    );
    expect(podioParaCompartir([entrada(1, 'Ana', 12.5)], 'kilometros', null, HOY).podio[0]?.puntaje).toMatch(/km$/);
    expect(podioParaCompartir([entrada(1, 'Ana', 1)], 'gimnasio', null, HOY).podio[0]?.puntaje).toBe('1 día');
    expect(podioParaCompartir([entrada(1, 'Ana', 12)], 'gimnasio', null, HOY).podio[0]?.puntaje).toBe('12 días');
  });

  it('cada tabla lleva su nombre y su línea; la línea no habla «de ti» (la ve gente de afuera)', () => {
    const titulos = (['general', 'coherencia', 'kilometros', 'gimnasio'] as const).map(t => {
      const p = podioParaCompartir([], t, null, HOY);
      expect(p.detalle).not.toMatch(/\btu\b|\btus\b/i);
      expect(p.nombreDelArchivo).toBe(`podio-${t}-2026-10-19.png`);
      return p.titulo;
    });
    expect(titulos).toEqual(['Ranking general', 'Ranking de coherencia', 'Ranking de kilómetros', 'Ranking de gimnasio']);
  });
});

describe('los nombres', () => {
  it('un nombre que cabe queda completo, sin «…» y con los espacios limpios', () => {
    expect(recortarNombre('  María   Fernanda  Quispe ', 40)).toBe('María Fernanda Quispe');
  });

  it('uno largo se corta en una palabra entera y termina en «…», sin pasar del máximo', () => {
    const largo = 'María Fernanda de los Ángeles Quispe Huamán de la Cruz';
    const corto = recortarNombre(largo, MAX_CARACTERES_PODIO);
    expect(corto.endsWith('…')).toBe(true);
    expect(Array.from(corto).length).toBeLessThanOrEqual(MAX_CARACTERES_PODIO);
    expect(largo.startsWith(corto.slice(0, -1))).toBe(true);
    expect(corto.slice(0, -1).endsWith(' ')).toBe(false);
    expect(corto).toBe('María Fernanda de los…');
  });

  it('una sola palabra enorme se corta dura', () => {
    const corto = recortarNombre('Supercalifragilisticoespialidosoextraordinario', 20);
    expect(Array.from(corto)).toHaveLength(20);
    expect(corto.endsWith('…')).toBe(true);
  });

  it('el máximo exacto cabe; uno más se corta', () => {
    const justo = 'a'.repeat(MAX_CARACTERES_FILA);
    expect(recortarNombre(justo, MAX_CARACTERES_FILA)).toBe(justo);
    expect(recortarNombre(`${justo}b`, MAX_CARACTERES_FILA).endsWith('…')).toBe(true);
  });

  it('no parte un emoji ni una letra con tilde por la mitad', () => {
    const conEmoji = recortarNombre('🦅🦅🦅🦅🦅🦅🦅🦅🦅🦅🦅🦅', 6);
    expect(Array.from(conEmoji)).toHaveLength(6);
    expect(conEmoji).toBe('🦅🦅🦅🦅🦅…');
    expect(conEmoji).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    /* Y con una palabra normal delante, la palabra del emoji se va entera. */
    expect(recortarNombre('Ana 🦅🦅🦅🦅🦅🦅🦅🦅🦅🦅🦅🦅', 8)).toBe('Ana…');
  });

  it('sin nombre dice «Participante», no queda en blanco', () => {
    expect(recortarNombre('   ', 20)).toBe('Participante');
    expect(recortarNombre(null, 20)).toBe('Participante');
    expect(recortarNombre(undefined, 20)).toBe('Participante');
  });

  it('el podio recorta a su máximo y la lista al suyo', () => {
    const largo = 'Juan Carlos Fernández Rodríguez de la Torre y Sánchez';
    const p = podioParaCompartir(
      [entrada(1, largo), entrada(2, largo), entrada(3, largo), entrada(4, largo)],
      'general',
      null,
      HOY,
    );
    expect(Array.from(p.podio[0]!.nombre).length).toBeLessThanOrEqual(MAX_CARACTERES_PODIO);
    expect(Array.from(p.lista[0].nombre).length).toBeLessThanOrEqual(MAX_CARACTERES_FILA);
    expect(p.lista[0].nombre.endsWith('…')).toBe(true);
  });

  it('usa el nombre del servidor, nunca el «TÚ (…)» de la pantalla', () => {
    const p = podioParaCompartir([entrada(1, 'Ricardo Palomino')], 'general', null, HOY);
    expect(p.podio[0]?.nombre).toBe('Ricardo Palomino');
  });
});

describe('la fecha, en español de Perú', () => {
  it('la del corte, escrita tal cual aunque el teléfono esté en otra zona', () => {
    expect(fechaDeLaImagen('2026-10-19', HOY)).toEqual({ texto: '19 de octubre de 2026', archivo: '2026-10-19' });
    expect(fechaDeLaImagen('2026-01-05T03:00:00Z', HOY)).toEqual({ texto: '5 de enero de 2026', archivo: '2026-01-05' });
    expect(fechaDeLaImagen('2026-09-30', HOY).texto).toBe('30 de septiembre de 2026');
  });

  it('sin fecha del servidor, o con una que no existe, la de hoy en el teléfono', () => {
    for (const mala of [null, undefined, '', 'ayer', '2026-02-31', '2026-13-01']) {
      expect(fechaDeLaImagen(mala, HOY)).toEqual({ texto: '19 de octubre de 2026', archivo: '2026-10-19' });
    }
  });

  it('va en la imagen y en el nombre del archivo', () => {
    const p = podioParaCompartir(DOCE, 'coherencia', '2026-12-03', HOY);
    expect(p.fecha).toBe('3 de diciembre de 2026');
    expect(p.fechaDeArchivo).toBe('2026-12-03');
    expect(p.nombreDelArchivo).toBe('podio-coherencia-2026-12-03.png');
  });
});
