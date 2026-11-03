import { describe, expect, it } from '@jest/globals';

import {
  MOTIVOS,
  PLANES_DE_MANANA,
  SUBTITULO_DEL_MOTIVO,
  iconoDelMotivo,
  iconoDelPlan,
  planEnFrase,
  textoCortoDelMotivo,
  textoCortoDelPlan,
  textoDelMotivo,
  textoDelPlan,
} from '../../data/textosDelCierre';
import {
  encabezadoDelDia,
  estadoEnPalabras,
  lineaDeUnMotivo,
  lineaDelResumen,
  respuestaEnPalabras,
  respuestaParaElLector,
} from '../textosDeLosCierres';

describe('los textos fijos de las dos preguntas', () => {
  it('son los ocho de la vista previa, en su orden', () => {
    expect(MOTIVOS.map(m => m.texto)).toEqual(['No me alcanzó el tiempo', 'Surgió otra cosa', 'Me faltó energía', 'Lo dejé para después']);
    expect(PLANES_DE_MANANA.map(p => p.texto)).toEqual(['Hacerla a otra hora', 'Hacerla más corta', 'Pedir ayuda', 'Dejarla']);
  });

  it('cada opción tiene su texto corto y su ícono (chips de ícono, 2026-11-03), y lo que viaja al servidor no cambia', () => {
    expect(MOTIVOS.map(m => [m.valor, m.corto, m.icono])).toEqual([
      ['SIN_TIEMPO', 'Tiempo', 'clock'],
      ['SURGIO_OTRA_COSA', 'Imprevisto', 'alertTriangle'],
      ['SIN_ENERGIA', 'Energía', 'batteryLow'],
      ['PARA_DESPUES', 'Lo evité', 'ban'],
    ]);
    expect(PLANES_DE_MANANA.map(p => [p.valor, p.corto, p.icono])).toEqual([
      ['OTRA_HORA', 'Otra hora', 'calendarClock'],
      ['MAS_CORTA', 'Más corta', 'minimize2'],
      ['PEDIR_AYUDA', 'Pedir ayuda', 'handHelping'],
      ['DEJARLA', 'Dejarla', 'x'],
    ]);
    // Los códigos son los del contrato (`MotivoDelCierre` y `PlanDeManana`): el servidor no se entera de nada.
    expect(MOTIVOS.map(m => m.valor)).toEqual(['SIN_TIEMPO', 'SURGIO_OTRA_COSA', 'SIN_ENERGIA', 'PARA_DESPUES']);
    expect(PLANES_DE_MANANA.map(p => p.valor)).toEqual(['OTRA_HORA', 'MAS_CORTA', 'PEDIR_AYUDA', 'DEJARLA']);
  });

  it('los textos cortos y los íconos se buscan por el valor; un valor que no se conoce no tiene ni uno ni otro', () => {
    expect(textoCortoDelMotivo('SURGIO_OTRA_COSA')).toBe('Imprevisto');
    expect(iconoDelMotivo('SIN_ENERGIA')).toBe('batteryLow');
    expect(textoCortoDelPlan('MAS_CORTA')).toBe('Más corta');
    expect(iconoDelPlan('PEDIR_AYUDA')).toBe('handHelping');
    for (const raro of ['NUEVO', null, undefined]) {
      expect(textoCortoDelMotivo(raro)).toBeNull();
      expect(iconoDelMotivo(raro)).toBeNull();
      expect(textoCortoDelPlan(raro)).toBeNull();
      expect(iconoDelPlan(raro)).toBeNull();
    }
  });

  it('el subtítulo de «¿Qué pasó?»', () => {
    expect(SUBTITULO_DEL_MOTIVO).toBe('Selecciona lo que más haya influido.');
  });

  it('un valor que no se conoce no tiene texto', () => {
    expect(textoDelMotivo('SIN_TIEMPO')).toBe('No me alcanzó el tiempo');
    expect(textoDelMotivo('NUEVO')).toBeNull();
    expect(textoDelPlan(null)).toBeNull();
    expect(planEnFrase('OTRA_HORA')).toBe('a otra hora');
  });
});

describe('los textos de la sección de las fichas', () => {
  it('el resumen: «3 cerrados · 1 sin cerrar»', () => {
    expect(lineaDelResumen({ cerrados: 3, sinCerrar: 1 })).toBe('3 cerrados · 1 sin cerrar');
    expect(lineaDelResumen({ cerrados: 1, sinCerrar: 0 })).toBe('1 cerrado · 0 sin cerrar');
    expect(lineaDelResumen({ cerrados: 2, sinCerrar: null })).toBe('2 cerrados');
    expect(lineaDelResumen({ cerrados: null, sinCerrar: null })).toBeNull();
  });

  it('los motivos que más se repiten, con el texto corto: «Tiempo · 4 veces»', () => {
    expect(lineaDeUnMotivo({ motivo: 'SIN_TIEMPO', veces: 4 })).toBe('Tiempo · 4 veces');
    expect(lineaDeUnMotivo({ motivo: 'SIN_ENERGIA', veces: 1 })).toBe('Energía · 1 vez');
    expect(lineaDeUnMotivo({ motivo: 'NUEVO', veces: 3 })).toBeNull();
  });

  it('cada día dice cómo quedó, y «Sin cerrar» no se dice como una falta', () => {
    expect(estadoEnPalabras({ estado: 'CERRADO' })).toBe('Cerrado');
    expect(estadoEnPalabras({ estado: 'SIN_CERRAR' })).toBe('Sin cerrar');
    expect(estadoEnPalabras({ estado: 'ABIERTO' })).toBe('Hoy, todavía sin cerrar');
    expect(estadoEnPalabras({ estado: null })).toBeNull();
    expect(encabezadoDelDia({ fecha: '2026-10-29', estado: 'CERRADO' })).toBe('Jueves 29 · Cerrado');
    expect(encabezadoDelDia({ fecha: '2026-10-29', estado: null })).toBe('Jueves 29');
  });

  it('lo que respondió, con los textos cortos: «Tiempo → Otra hora»', () => {
    expect(respuestaEnPalabras({ motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA' })).toBe('Tiempo → Otra hora');
    expect(respuestaEnPalabras({ motivo: 'PARA_DESPUES', manana: 'DEJARLA' })).toBe('Lo evité → Dejarla');
    expect(respuestaEnPalabras({ motivo: 'SIN_TIEMPO', manana: 'NUEVO' })).toBe('Tiempo');
    expect(respuestaEnPalabras({ motivo: null, manana: null })).toBeNull();
  });

  it('el lector de pantalla oye los textos completos de siempre, no los cortos', () => {
    expect(respuestaParaElLector({ motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA' })).toBe('No me alcanzó el tiempo, Hacerla a otra hora');
    expect(respuestaParaElLector({ motivo: 'NUEVO', manana: 'MAS_CORTA' })).toBe('Hacerla más corta');
    expect(respuestaParaElLector({ motivo: null, manana: 'NUEVO' })).toBeNull();
  });
});
