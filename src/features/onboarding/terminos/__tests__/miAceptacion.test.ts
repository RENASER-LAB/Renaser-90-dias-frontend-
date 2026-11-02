/**
 * Spec 039 (Acuerdo de transformación): «Mi aceptación» y el cronograma que se firma, sin pantalla. Lo que el servidor manda se lee tolerante, las líneas salen en el
 * orden del dueño y nada se calcula aquí (las fechas ya vienen resueltas).
 */
import { describe, expect, it } from '@jest/globals';

import { terminosAceptadosSchema, terminosDeMiFormacionSchema } from '../api/terminosSchemas';
import {
  FRASE_DE_LA_DECISION,
  FRASE_DE_LA_DECLARACION,
  FRASE_DEL_CRONOGRAMA,
  leerAcuerdo,
  lineasDeMiAceptacion,
  resumenDeLoAceptado,
  textoParaElLector,
} from '../utils/miAceptacion';

const VERSION = { id: 'v-2', formation: 'ESCUELA', state: 'PUBLICADA', number: 2, title: 'Términos y condiciones', introduction: 'Intro', clauses: ['Una'], checkboxText: 'Acepto' };
const HOY = { dia: 2, mes: 11, anio: 2026 };

function acuerdoDe(extra: Record<string, unknown> = {}) {
  const lectura = terminosDeMiFormacionSchema.parse({
    formation: { code: 'ESCUELA', name: 'Escuela Renaser' },
    version: VERSION,
    pending: 'FIRST_TIME',
    blocks: false,
    agreement: {
      participantName: 'Ana María Pérez Soto',
      program: 'Formación RENASER · 90 días',
      startDate: '2026-11-03',
      endDate: '2027-01-31',
      started: false,
      schedule: null,
      ...extra,
    },
  });
  return leerAcuerdo(lectura.agreement);
}

describe('las frases del dueño', () => {
  it('son las que pidió, tal cual', () => {
    expect(FRASE_DE_LA_DECISION).toBe('He decidido formar parte de RENASER, consciente de mi compromiso con este proceso de transformación.');
    expect(FRASE_DE_LA_DECLARACION).toBe('Declaro que he leído, comprendido y aceptado los términos y condiciones del programa al que ingreso.');
    expect(FRASE_DEL_CRONOGRAMA).toBe('Acepto el cronograma de pagos registrado en NASER y me comprometo a cumplirlo.');
  });
});

describe('leer «Mi aceptación» del servidor', () => {
  it('sin cronograma: el nombre, el programa, las fechas y ningún cronograma', () => {
    const acuerdo = acuerdoDe();
    expect(acuerdo).toEqual({
      participante: 'Ana María Pérez Soto',
      programa: 'Formación RENASER · 90 días',
      inicio: '2026-11-03',
      fin: '2027-01-31',
      empezado: false,
      cronograma: null,
    });
  });

  it('con cronograma: la moneda, las cuotas leídas como en «Mi ingreso» y la huella', () => {
    const acuerdo = acuerdoDe({
      schedule: {
        currency: 'PEN',
        installments: [
          { id: 'c-1', dueDate: '2026-11-15', amount: 500, status: 'PENDING' },
          { id: 'c-2', dueDate: '2026-12-15', amount: '500.50', status: 'PENDING' },
        ],
        fingerprint: 'huella-1',
      },
    });
    expect(acuerdo?.cronograma?.moneda).toBe('PEN');
    expect(acuerdo?.cronograma?.huella).toBe('huella-1');
    expect(acuerdo?.cronograma?.cuotas).toEqual([
      expect.objectContaining({ id: 'c-1', venceEl: '2026-11-15', monto: 500, pagada: false }),
      expect.objectContaining({ id: 'c-2', venceEl: '2026-12-15', monto: 500.5, pagada: false }),
    ]);
  });

  it('una cuota que no se entiende se pierde ella; sin ninguna cuota, o sin huella, no hay cronograma que firmar', () => {
    const conUnaRota = acuerdoDe({ schedule: { currency: 'PEN', installments: [{ dueDate: '2026-11-15' }, { id: 'c-2', dueDate: '2026-12-15', amount: 100 }], fingerprint: 'h' } });
    expect(conUnaRota?.cronograma?.cuotas).toHaveLength(1);

    expect(acuerdoDe({ schedule: { currency: 'PEN', installments: [], fingerprint: 'h' } })?.cronograma).toBeNull();
    expect(acuerdoDe({ schedule: { currency: 'PEN', installments: [{ id: 'c-1', dueDate: '2026-11-15', amount: 1 }] } })?.cronograma).toBeNull();
  });

  it('una moneda que la app no conoce no tumba el cronograma: las cuotas se leen sin símbolo', () => {
    const acuerdo = acuerdoDe({ schedule: { currency: 'EUR', installments: [{ id: 'c-1', dueDate: '2026-11-15', amount: 10 }], fingerprint: 'h' } });
    expect(acuerdo?.cronograma?.moneda).toBeNull();
  });

  it('un servidor anterior (sin «agreement») o sin programa: no hay bloque que dibujar', () => {
    const sin = terminosDeMiFormacionSchema.parse({ formation: { code: 'ESCUELA', name: 'Escuela' }, version: VERSION, pending: 'NONE', blocks: false });
    expect(leerAcuerdo(sin.agreement)).toBeNull();
    expect(leerAcuerdo(null)).toBeNull();
    expect(acuerdoDe({ program: '  ' })).toBeNull();
  });
});

describe('las líneas de «Mi aceptación»', () => {
  it('el orden del dueño: participante, programa, fecha de inicio, fecha de finalización y fecha de aceptación', () => {
    const lineas = lineasDeMiAceptacion(acuerdoDe()!, HOY);
    expect(lineas.map(l => l.etiqueta)).toEqual(['Participante', 'Programa', 'Fecha de inicio', 'Fecha de finalización', 'Fecha de aceptación']);
    expect(lineas.map(l => l.valor)).toEqual([
      'Ana María Pérez Soto',
      'Formación RENASER · 90 días',
      '3 de noviembre de 2026',
      '31 de enero de 2027',
      '2 de noviembre de 2026',
    ]);
  });

  it('quien ya empezó ve sus fechas reales; el Diplomado dice sus meses o su año', () => {
    const empezado = acuerdoDe({ started: true, startDate: '2026-10-26', endDate: '2027-01-23' })!;
    expect(empezado.empezado).toBe(true);
    expect(lineasDeMiAceptacion(empezado, HOY).map(l => l.valor)).toContain('26 de octubre de 2026');
    expect(lineasDeMiAceptacion(empezado, HOY).map(l => l.valor)).toContain('23 de enero de 2027');
    expect(lineasDeMiAceptacion(acuerdoDe({ program: 'Diplomado RENASER · 1 año', endDate: '2027-11-02' })!, HOY).map(l => l.valor)).toEqual(
      expect.arrayContaining(['Diplomado RENASER · 1 año', '2 de noviembre de 2027']),
    );
  });

  it('sin programa que prometer (personal sin activar) no hay fechas de inicio ni de fin, y sin nombre no hay línea de participante', () => {
    const personal = acuerdoDe({ program: 'Formación RENASER', startDate: null, endDate: null, participantName: null })!;
    expect(lineasDeMiAceptacion(personal, HOY).map(l => l.etiqueta)).toEqual(['Programa', 'Fecha de aceptación']);
  });

  it('el lector de pantalla oye las dos frases y cada línea con su etiqueta', () => {
    const texto = textoParaElLector(acuerdoDe()!, HOY);
    expect(texto).toContain(FRASE_DE_LA_DECISION);
    expect(texto).toContain(FRASE_DE_LA_DECLARACION);
    expect(texto).toContain('Programa: Formación RENASER · 90 días');
    expect(texto).toContain('Fecha de finalización: 31 de enero de 2027');
  });
});

describe('releer lo que acepté', () => {
  const base = { version: VERSION, acceptedAt: '2026-11-02T20:00:00Z' };

  it('dice el programa, el periodo y si firmó el cronograma', () => {
    const aceptados = terminosAceptadosSchema.parse({
      ...base,
      agreement: { program: 'Formación RENASER · 90 días', startDate: '2026-11-03', endDate: '2027-01-31', scheduleSigned: true },
    });
    expect(resumenDeLoAceptado(aceptados.agreement)).toEqual({
      programa: 'Formación RENASER · 90 días',
      periodo: 'Del 3 de noviembre de 2026 al 31 de enero de 2027',
      cronogramaFirmado: true,
    });
  });

  it('lo aceptado antes de la spec 039 no dice nada de eso', () => {
    expect(resumenDeLoAceptado(terminosAceptadosSchema.parse(base).agreement)).toBeNull();
    expect(resumenDeLoAceptado(null)).toBeNull();
    expect(resumenDeLoAceptado({ program: null, startDate: null, endDate: null, scheduleSigned: false })).toBeNull();
  });

  it('el personal sin fechas: solo el programa', () => {
    expect(resumenDeLoAceptado({ program: 'Formación RENASER', startDate: null, endDate: null, scheduleSigned: false })).toEqual({
      programa: 'Formación RENASER',
      periodo: null,
      cronogramaFirmado: false,
    });
  });
});
