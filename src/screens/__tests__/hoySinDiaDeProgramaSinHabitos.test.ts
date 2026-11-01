import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const HOY = fs.readFileSync(path.resolve(__dirname, '../HoyScreen.tsx'), 'utf8');

/**
 * E2E de las formaciones (01/11/2026, issue #86): «Hábitos de hoy» salía con «0/0» y «Lidera tu energía diaria.» a quien no tiene día de programa
 * (el personal sin programa, quien no eligió su Día 1, el día 0): un dato inventado. Sin día de programa la tarjeta no se dibuja; con el programa en
 * curso nada cambia. Se espera a que `/home` llegue para no hacer saltar la pantalla de todos.
 */
describe('Hoy: la tarjeta «Hábitos de hoy» necesita un día de programa', () => {
  it('se oculta solo cuando `/home` ya llegó y no trae un día mayor que 0', () => {
    expect(HOY).toContain('const sinDiaDePrograma = !cargandoResumen && resumen !== null && (resumen.diaPrograma ?? 0) <= 0;');
  });

  it('el aviso de programa en otra formación sigue primero; después, sin día no hay tarjeta; si no, la tarjeta de siempre', () => {
    const aviso = HOY.indexOf('<AvisoDeProgramaEnOtraFormacion nombre={programaEnOtraFormacion.nombre} />');
    const sinDia = HOY.indexOf(') : sinDiaDePrograma ? null : (', aviso);
    const tarjeta = HOY.indexOf('<TarjetaHabitoYRadar', sinDia);
    expect(aviso).toBeGreaterThan(0);
    expect(sinDia).toBeGreaterThan(aviso);
    expect(tarjeta).toBeGreaterThan(sinDia);
  });

  it('no deja margen suelto: el contenedor separa con `gap` y no con márgenes de cada hijo', () => {
    const bloque = HOY.slice(HOY.indexOf('<Aparicion retardo={210}'), HOY.indexOf('<TarjetaDelDiagnosticoPendiente'));
    expect(bloque).toContain('<View style={{ gap: space.gap }}>');
  });
});
