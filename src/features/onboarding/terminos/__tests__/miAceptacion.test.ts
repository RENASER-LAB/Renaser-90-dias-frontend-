/**
 * Spec 039 (Acuerdo de transformación): «Mi aceptación», sin pantalla. El cronograma de pagos ya no se firma con los términos (decisión 2026-11-02 pagos fuera de términos). Lo que el servidor manda se lee tolerante, las líneas salen en el
 * orden del dueño y nada se calcula aquí (las fechas ya vienen resueltas).
 */
import { describe, expect, it } from '@jest/globals';

import { terminosAceptadosSchema, terminosDeMiFormacionSchema } from '../api/terminosSchemas';
import {
  FRASE_DE_LA_DECISION,
  FRASE_DE_LA_DECLARACION,
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
      ...extra,
    },
  });
  return leerAcuerdo(lectura.agreement);
}

// decisión 2026-11-02 pagos fuera de términos
describe('las frases del dueño', () => {
  it('son las que pidió, tal cual', () => {
    expect(FRASE_DE_LA_DECISION).toBe('He decidido formar parte de RENASER, consciente de mi compromiso con este proceso de transformación.');
    expect(FRASE_DE_LA_DECLARACION).toBe('Declaro que he leído, comprendido y aceptado los términos y condiciones del programa al que ingreso.');
  });
});

describe('leer «Mi aceptación» del servidor', () => {
  it('el nombre, el programa y las fechas; nada de cronograma', () => {
    const acuerdo = acuerdoDe();
    expect(acuerdo).toEqual({
      participante: 'Ana María Pérez Soto',
      programa: 'Formación RENASER · 90 días',
      inicio: '2026-11-03',
      fin: '2027-01-31',
      empezado: false,
    });
  });

  // decisión 2026-11-02 pagos fuera de términos
  it('un servidor que todavía mande `schedule` (la 039 de antes): la app lo ignora y «Mi aceptación» sale igual, sin cronograma', () => {
    const acuerdo = acuerdoDe({
      schedule: {
        currency: 'PEN',
        installments: [{ id: 'c-1', dueDate: '2026-11-15', amount: 500, status: 'PENDING' }],
        fingerprint: 'huella-1',
      },
    });
    expect(acuerdo).toEqual({
      participante: 'Ana María Pérez Soto',
      programa: 'Formación RENASER · 90 días',
      inicio: '2026-11-03',
      fin: '2027-01-31',
      empezado: false,
    });
    expect(acuerdo).not.toHaveProperty('cronograma');
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

  // decisión 2026-11-02 pagos fuera de términos
  it('dice el programa y el periodo; un `scheduleSigned` viejo del servidor no dice nada', () => {
    const aceptados = terminosAceptadosSchema.parse({
      ...base,
      agreement: { program: 'Formación RENASER · 90 días', startDate: '2026-11-03', endDate: '2027-01-31', scheduleSigned: true },
    });
    expect(resumenDeLoAceptado(aceptados.agreement)).toEqual({
      programa: 'Formación RENASER · 90 días',
      periodo: 'Del 3 de noviembre de 2026 al 31 de enero de 2027',
    });
  });

  it('lo aceptado antes de la spec 039 no dice nada de eso', () => {
    expect(resumenDeLoAceptado(terminosAceptadosSchema.parse(base).agreement)).toBeNull();
    expect(resumenDeLoAceptado(null)).toBeNull();
    expect(resumenDeLoAceptado({ program: null, startDate: null, endDate: null })).toBeNull();
  });

  it('el personal sin fechas: solo el programa', () => {
    expect(resumenDeLoAceptado({ program: 'Formación RENASER', startDate: null, endDate: null })).toEqual({
      programa: 'Formación RENASER',
      periodo: null,
    });
  });
});
