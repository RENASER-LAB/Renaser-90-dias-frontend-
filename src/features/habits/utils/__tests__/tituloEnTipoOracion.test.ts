import { describe, expect, it, jest } from '@jest/globals';

import { tituloEnTipoOracion, tituloParaMostrar } from '../tituloEnTipoOracion';

/**
 * Los nombres de los hábitos de Training en tipo oración (2026-10-31): un título que llega TODO en mayúsculas se muestra
 * «Agua tibia con limón»; el que ya tiene minúsculas se deja; las siglas se respetan. Solo se muestra: nada se guarda ni se manda.
 */

describe('tituloEnTipoOracion: lo que llega en mayúsculas', () => {
  it.each([
    ['AGUA TIBIA CON LIMÓN', 'Agua tibia con limón'],
    ['JUGO VERDE', 'Jugo verde'],
    ['ÚLTIMA COMIDA DEL DÍA', 'Última comida del día'],
    ['DÍA SIN CELULAR', 'Día sin celular'],
    ['ESCRITURA LIBRE NOCTURNA', 'Escritura libre nocturna'],
    ['POST DIARIO EN COMUNIDAD', 'Post diario en comunidad'],
    ['AUDIOTERAPIA SEMANAL', 'Audioterapia semanal'],
    ['DESCANSO PROFUNDO', 'Descanso profundo'],
  ])('«%s» → «%s»', (entrada, esperado) => {
    expect(tituloEnTipoOracion(entrada)).toBe(esperado);
  });

  it('«RITUAL TIERRA - AGUA - FUEGO (mañana)»: lo de adentro del paréntesis ya viene en minúsculas y no cuenta', () => {
    expect(tituloEnTipoOracion('RITUAL TIERRA - AGUA - FUEGO (mañana)')).toBe('Ritual tierra - agua - fuego (mañana)');
    expect(tituloEnTipoOracion('RITUAL TIERRA - AGUA - FUEGO (mediodía)')).toBe('Ritual tierra - agua - fuego (mediodía)');
    expect(tituloEnTipoOracion('RITUAL TIERRA - AGUA - FUEGO (noche)')).toBe('Ritual tierra - agua - fuego (noche)');
    expect(tituloEnTipoOracion('RITUAL TIERRA - AGUA - FUEGO')).toBe('Ritual tierra - agua - fuego');
    expect(tituloEnTipoOracion('RITUAL DE MAÑANA (domingo)')).toBe('Ritual de mañana (domingo)');
    expect(tituloEnTipoOracion('AGUA E HIDRATACIÓN (domingo)')).toBe('Agua e hidratación (domingo)');
  });

  it('un paréntesis que también viene en mayúsculas se pasa a minúsculas', () => {
    expect(tituloEnTipoOracion('PRIMERA COMIDA (ROMPO EL AYUNO)')).toBe('Primera comida (rompo el ayuno)');
  });

  it('respeta las siglas: «SER» sigue en mayúsculas, y «RENASER» queda «Renaser»', () => {
    expect(tituloEnTipoOracion('SER')).toBe('SER');
    expect(tituloEnTipoOracion('HABLAR CON SER')).toBe('Hablar con SER');
    expect(tituloEnTipoOracion('SER CONSTANTE')).toBe('SER constante');
    expect(tituloEnTipoOracion('RENASER')).toBe('Renaser');
    expect(tituloEnTipoOracion('LEER CON RENASER HOY')).toBe('Leer con Renaser hoy');
    expect(tituloEnTipoOracion('PASTILLA RENACER')).toBe('Pastilla Renacer');
  });

  it('conserva los espacios y los signos; la inicial es la primera letra', () => {
    expect(tituloEnTipoOracion('  1. LEER 10 MIN  ')).toBe('  1. Leer 10 min  ');
    expect(tituloEnTipoOracion('¿QUÉ SENTISTE?')).toBe('¿Qué sentiste?');
  });

  it('es idempotente', () => {
    for (const t of ['AGUA TIBIA CON LIMÓN', 'RITUAL TIERRA - AGUA - FUEGO (mañana)', 'HABLAR CON SER']) {
      expect(tituloEnTipoOracion(tituloEnTipoOracion(t))).toBe(tituloEnTipoOracion(t));
    }
  });
});

describe('tituloEnTipoOracion: lo que se deja tal cual', () => {
  it.each([
    'Clase diaria',
    'Pastilla Renacer',
    'Mi jugo verde',
    'Agua TIBIA con limón',
    'Declaración y desintoxicación digital de 24 horas',
    'agua tibia',
  ])('«%s» ya tiene minúsculas', titulo => {
    expect(tituloEnTipoOracion(titulo)).toBe(titulo);
  });

  it('sin letras, o vacío, o nulo, no hay nada que cambiar', () => {
    expect(tituloEnTipoOracion('')).toBe('');
    expect(tituloEnTipoOracion('123 - 45')).toBe('123 - 45');
    expect(tituloEnTipoOracion(null)).toBeNull();
    expect(tituloEnTipoOracion(undefined)).toBeUndefined();
  });

  it('un título solo entre paréntesis se decide por lo de adentro', () => {
    expect(tituloEnTipoOracion('(MAÑANA)')).toBe('(Mañana)');
    expect(tituloEnTipoOracion('(mañana)')).toBe('(mañana)');
  });
});

describe('tituloParaMostrar: el nombre propio manda y no se toca', () => {
  const habito = { id: 'h1', title: 'AGUA TIBIA CON LIMÓN' };

  it('sin nombre propio, el del catálogo en tipo oración', () => {
    expect(tituloParaMostrar(habito, {})).toBe('Agua tibia con limón');
    expect(tituloParaMostrar(habito, { otro: 'Algo' })).toBe('Agua tibia con limón');
  });

  it('con nombre propio, ese tal cual (aunque lo haya escrito en mayúsculas)', () => {
    expect(tituloParaMostrar(habito, { h1: 'Agua tibia, sin limón' })).toBe('Agua tibia, sin limón');
    expect(tituloParaMostrar(habito, { h1: 'AGUA TIBIA' })).toBe('AGUA TIBIA');
  });

  it('un nombre propio en blanco no cuenta', () => {
    expect(tituloParaMostrar(habito, { h1: '   ' })).toBe('Agua tibia con limón');
  });

  it('no cambia el título del catálogo que se manda al servidor y a las alarmas', () => {
    tituloParaMostrar(habito, {});
    expect(habito.title).toBe('AGUA TIBIA CON LIMÓN');
  });
});

/**
 * Dónde se usa (2026-10-31): solo al DIBUJAR. Lo que se manda al servidor y el texto de las alarmas siguen con el título del
 * catálogo tal cual (`programar(..., h.title, ...)`).
 */
describe('tituloEnTipoOracion: solo al dibujar', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const path = jest.requireActual<typeof import('path')>('path');
  const leer = (relativo: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '..', relativo), 'utf-8');

  it('la lista de hoy y la hoja del hábito, Planificar y el registro con foto lo usan', () => {
    expect(leer('features/training/utils/itemsDelDia.ts')).toContain('tituloParaMostrar(');
    const planificar = leer('features/training/components/PlanificarDimensionModal.tsx');
    expect(planificar).toMatch(/const nombreDe = [\s\S]*?tituloParaMostrar\([\s\S]*?tituloEnTipoOracion\(h\.title\)/);
    const training = leer('screens/TrainingScreen.tsx');
    expect(training).toContain('tituloParaMostrar({ id: habit.habitoId ?? habit.id');
  });

  it('las alarmas siguen con el título del catálogo, sin pasarlo a tipo oración', () => {
    const planificar = leer('features/training/components/PlanificarDimensionModal.tsx');
    expect(planificar).toMatch(/recordatorios\.programar\(claveUsuario, h\.habitoId, h\.title,/);
    expect(planificar).toMatch(/recordatorios\.programarConCambioDiferido\(claveUsuario, h\.habitoId, h\.title,/);
    expect(planificar).toContain('habito={habitoEnEdicion ? { id: habitoEnEdicion.habitoId, titulo: habitoEnEdicion.title } : undefined}');
    expect(leer('features/habits/notificaciones/recordatoriosDeHabito.ts')).not.toContain('tituloEnTipoOracion');
  });
});
