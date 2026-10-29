import { describe, expect, it } from '@jest/globals';

import {
  diaCorto,
  diasEnPalabras,
  duracionEnPalabras,
  duracionHablada,
  huecoHablado,
  lineaDeLoReal,
  lineaDelHueco,
  lineaDelHuecoQueSeRepite,
  rangoDeLaSemana,
  resumenDelDia,
  tiempoDelResumen,
  tituloDeLaSemana,
  ventanaEnPalabras,
} from '../textosDeHuecos';

describe('duraciones', () => {
  it.each([
    [30, '30 min'],
    [45, '45 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [120, '2 h'],
    [2870, '47 h 50 min'],
    [0, '0 min'],
  ])('%i minutos → «%s»', (minutos, texto) => {
    expect(duracionEnPalabras(minutos)).toBe(texto);
  });

  it.each([
    [30, '30 minutos'],
    [60, '1 hora'],
    [61, '1 hora 1 minuto'],
    [90, '1 hora 30 minutos'],
    [120, '2 horas'],
  ])('para el lector de pantalla, %i minutos → «%s»', (minutos, texto) => {
    expect(duracionHablada(minutos)).toBe(texto);
  });
});

describe('los huecos', () => {
  it('«15:00–17:00 · 2 h»', () => {
    expect(lineaDelHueco({ desde: '15:00', hasta: '17:00', minutos: 120 })).toBe('15:00–17:00 · 2 h');
    expect(lineaDelHueco({ desde: '08:00', hasta: '08:45', minutos: 45 })).toBe('08:00–08:45 · 45 min');
  });

  it('el lector de pantalla lo oye sin símbolos', () => {
    expect(huecoHablado({ desde: '15:00', hasta: '17:00', minutos: 120 })).toBe('De 15:00 a 17:00, 2 horas');
  });

  it('un día dice cuántos huecos tiene, o que no tiene', () => {
    expect(resumenDelDia({ huecos: [] })).toBe('Sin huecos de 30 min o más');
    expect(resumenDelDia({ huecos: [{ desde: '15:00', hasta: '17:00', minutos: 120 }] })).toBe('1 hueco');
    expect(
      resumenDelDia({
        huecos: [
          { desde: '10:00', hasta: '11:00', minutos: 60 },
          { desde: '15:00', hasta: '17:00', minutos: 120 },
        ],
      }),
    ).toBe('2 huecos');
  });
});

describe('los días que se repiten', () => {
  it.each([
    [[1, 3, 4], 'Lun, mié y jue'],
    [[6, 7], 'Sáb y dom'],
    [[2], 'Mar'],
    [[1, 2, 3, 4, 5], 'Lun, mar, mié, jue y vie'],
    [[1, 2, 3, 4, 5, 6, 7], 'Todos los días'],
    [[], ''],
  ])('%j → «%s»', (dias, texto) => {
    expect(diasEnPalabras(dias)).toBe(texto);
  });

  it('«Lun, mié y jue · 15:00–17:00»', () => {
    expect(lineaDelHuecoQueSeRepite({ desde: '15:00', hasta: '17:00', dias: [1, 3, 4] })).toBe('Lun, mié y jue · 15:00–17:00');
  });
});

describe('la ventana del día', () => {
  it('«De 05:30 a 22:30»', () => {
    expect(ventanaEnPalabras({ desde: '05:30', hasta: '22:30' })).toBe('De 05:30 a 22:30');
  });

  it('sin Despertar ni Dormir (`null`) cuenta el día entero y lo dice', () => {
    expect(ventanaEnPalabras(null)).toBe('Sin Despertar ni Dormir: todo el día');
  });
});

describe('lo real de la semana', () => {
  it('«32 a tiempo · 6 tarde · 4 sin cumplir»', () => {
    expect(lineaDeLoReal({ cumplidosATiempo: 32, cumplidosTarde: 6, noCumplidos: 4 })).toBe('32 a tiempo · 6 tarde · 4 sin cumplir');
  });

  it('lo que no llegó cuenta como cero, pero con algo contado se escribe', () => {
    expect(lineaDeLoReal({ cumplidosATiempo: 5, cumplidosTarde: null, noCumplidos: null })).toBe('5 a tiempo · 0 tarde · 0 sin cumplir');
  });

  it('sin nada que contar (todo en cero o sin dato) no se escribe: una semana por venir no tiene resultado', () => {
    expect(lineaDeLoReal({ cumplidosATiempo: 0, cumplidosTarde: 0, noCumplidos: 0 })).toBeNull();
    expect(lineaDeLoReal({ cumplidosATiempo: null, cumplidosTarde: null, noCumplidos: null })).toBeNull();
  });

  it('el tiempo del resumen, sin dato, es un guion y no un «0 min» inventado', () => {
    expect(tiempoDelResumen(2870)).toBe('47 h 50 min');
    expect(tiempoDelResumen(0)).toBe('0 min');
    expect(tiempoDelResumen(null)).toBe('—');
  });
});

describe('la semana y los días', () => {
  it('el rango sale del lunes, con los dos meses cuando cruza', () => {
    expect(rangoDeLaSemana('2026-10-26')).toBe('Del 26 de octubre al 1 de noviembre');
    expect(rangoDeLaSemana('2026-10-12')).toBe('Del 12 de octubre al 18 de octubre');
    expect(rangoDeLaSemana('2026-12-28')).toBe('Del 28 de diciembre al 3 de enero');
    expect(rangoDeLaSemana('no es fecha')).toBe('');
  });

  it('«Semana cerrada» cuando cerró; la que corre es «Semana en curso»; cualquier otra, solo «Semana»', () => {
    expect(tituloDeLaSemana({ cerrada: true, esLaEnCurso: false })).toBe('Semana cerrada');
    expect(tituloDeLaSemana({ cerrada: false, esLaEnCurso: true })).toBe('Semana en curso');
    expect(tituloDeLaSemana({ cerrada: false, esLaEnCurso: false })).toBe('Semana');
  });

  it('el día, sin interpretar la fecha en la zona del teléfono', () => {
    expect(diaCorto('2026-10-26')).toBe('Lunes 26');
    expect(diaCorto('2026-11-01')).toBe('Domingo 1');
    expect(diaCorto('2026-10-28')).toBe('Miércoles 28');
    expect(diaCorto('x')).toBe('x');
  });
});
