import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

import { dibujarLaTarjetaDeHabitos } from '../../features/home/utils/dibujarLaTarjetaDeHabitos';

const HOY = fs.readFileSync(path.resolve(__dirname, '../HoyScreen.tsx'), 'utf8');

/**
 * E2E de las formaciones (01/11/2026, issue #86): «Hábitos de hoy» salía con «0/0» y «Lidera tu energía diaria.» a quien no tiene día de programa
 * (el personal sin programa, quien no eligió su Día 1, el día 0): un dato inventado. La regla de la app es «mientras no se sabe, no se dibuja» (la
 * misma de la mitad del Radar y de la tarjeta de la acción de hoy): tampoco mientras `/home` carga, para que no aparezca y desaparezca.
 */
describe('Hoy: cuándo se dibuja la tarjeta «Hábitos de hoy»', () => {
  it('CARGANDO: mientras `/home` no llegó, no se dibuja (nada que parpadee)', () => {
    expect(dibujarLaTarjetaDeHabitos({ resumen: null, error: null })).toBe(false);
    expect(dibujarLaTarjetaDeHabitos({ resumen: undefined, error: undefined })).toBe(false);
  });

  it('SIN DÍA: `/home` llegó sin día de programa (personal sin programa, sin Día 1, día 0), no se dibuja', () => {
    expect(dibujarLaTarjetaDeHabitos({ resumen: { diaPrograma: 0 }, error: null })).toBe(false);
    expect(dibujarLaTarjetaDeHabitos({ resumen: { diaPrograma: null }, error: null })).toBe(false);
    expect(dibujarLaTarjetaDeHabitos({ resumen: {}, error: null })).toBe(false);
  });

  it('CON PROGRAMA: `/home` llegó con día 1 o más, se dibuja', () => {
    expect(dibujarLaTarjetaDeHabitos({ resumen: { diaPrograma: 1 }, error: null })).toBe(true);
    expect(dibujarLaTarjetaDeHabitos({ resumen: { diaPrograma: 57 }, error: null })).toBe(true);
  });

  it('al volver a leer (foco, cumplir un hábito, deslizar) la tarjeta sigue: lo último que llegó manda, aunque la lectura nueva falle', () => {
    expect(dibujarLaTarjetaDeHabitos({ resumen: { diaPrograma: 20 }, error: 'No pudimos cargar tu día.' })).toBe(true);
    expect(dibujarLaTarjetaDeHabitos({ resumen: { diaPrograma: 0 }, error: 'No pudimos cargar tu día.' })).toBe(false);
  });

  it('FALLO: `/home` nunca llegó y falló, no se sabe: queda como antes (se dibuja) y Hoy ofrece reintentar', () => {
    expect(dibujarLaTarjetaDeHabitos({ resumen: null, error: 'No pudimos cargar tu día. Revisa tu conexión.' })).toBe(true);
  });
});

describe('Hoy: el cableado de la tarjeta', () => {
  it('lo decide la regla pura con lo que `useResumenHome` ya devuelve', () => {
    expect(HOY).toContain('const dibujarHabitos = dibujarLaTarjetaDeHabitos({ resumen, error: errorResumen });');
  });

  it('el aviso de programa en otra formación sigue primero; después, la regla; si no, la tarjeta de siempre', () => {
    const aviso = HOY.indexOf('<AvisoDeProgramaEnOtraFormacion nombre={programaEnOtraFormacion.nombre} />');
    const regla = HOY.indexOf(') : !dibujarHabitos ? null : (', aviso);
    const tarjeta = HOY.indexOf('<TarjetaHabitoYRadar', regla);
    expect(aviso).toBeGreaterThan(0);
    expect(regla).toBeGreaterThan(aviso);
    expect(tarjeta).toBeGreaterThan(regla);
  });

  it('no deja margen suelto: el contenedor separa con `gap` y no con márgenes de cada hijo', () => {
    const bloque = HOY.slice(HOY.indexOf('<Aparicion retardo={210}'), HOY.indexOf('<TarjetaDelDiagnosticoPendiente'));
    expect(bloque).toContain('<View style={{ gap: space.gap }}>');
  });
});
