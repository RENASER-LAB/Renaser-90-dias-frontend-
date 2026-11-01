import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const HOJA = fs.readFileSync(path.resolve(__dirname, '../AceptarSolicitudSheet.tsx'), 'utf8');

/**
 * E2E de las formaciones (01/11/2026, issue #87, BLOQUEANTE): al elegir «Pago → Con cronograma» la hoja «Aceptar solicitud» no cabía y no se
 * desplazaba: el pie fijo caía encima de «Armar cuotas mensuales» y no había forma de llegar a las cuotas. `HojaDesdeAbajo` de tamaño grande solo
 * reserva el alto; el cuerpo tiene que traer su propio `ScrollView`.
 */
describe('la hoja «Aceptar solicitud» se desplaza por encima de su pie fijo', () => {
  it('todo el cuerpo (formación, rol, ficha, pago y sus cuotas) va dentro de un ScrollView', () => {
    const abre = HOJA.indexOf('<ScrollView keyboardShouldPersistTaps="handled"');
    const cierra = HOJA.indexOf('</ScrollView>');
    expect(abre).toBeGreaterThan(0);
    expect(cierra).toBeGreaterThan(abre);
    for (const pieza of ['estilos.resumen', '<EditorDeCronograma', 'La misma que la última', 'Sin cronograma (pagó completo)']) {
      const donde = HOJA.indexOf(pieza);
      expect(donde).toBeGreaterThan(abre);
      expect(donde).toBeLessThan(cierra);
    }
  });

  it('el pie sigue fuera del cuerpo que se desliza (es la prop `pie` de la hoja, no un hijo)', () => {
    const pie = HOJA.indexOf('pie={');
    const abre = HOJA.indexOf('<ScrollView keyboardShouldPersistTaps="handled"');
    expect(pie).toBeGreaterThan(0);
    expect(pie).toBeLessThan(abre);
  });

  it('toca los chips con el teclado abierto sin cerrarlo antes (`keyboardShouldPersistTaps="handled"`) y conserva el relleno de siempre', () => {
    expect(HOJA).toContain('contentContainerStyle={estilos.cuerpo}');
    expect(HOJA).toMatch(/cuerpo: \{ gap: 12, paddingHorizontal: 20, paddingBottom: 24 \}/);
  });
});

const HOJA_DEL_CRONOGRAMA = fs.readFileSync(path.resolve(__dirname, '../../../pagos/components/HojaDelCronograma.tsx'), 'utf8');

describe('la hoja «Cronograma de pagos» de la ficha (issue #88, el mismo defecto)', () => {
  it('el editor de cuotas va dentro de un ScrollView, por encima del pie «Guardar cronograma»', () => {
    const abre = HOJA_DEL_CRONOGRAMA.indexOf('<ScrollView keyboardShouldPersistTaps="handled"');
    const editor = HOJA_DEL_CRONOGRAMA.indexOf('<EditorDeCronograma');
    const cierra = HOJA_DEL_CRONOGRAMA.indexOf('</ScrollView>');
    expect(abre).toBeGreaterThan(0);
    expect(editor).toBeGreaterThan(abre);
    expect(cierra).toBeGreaterThan(editor);
    expect(HOJA_DEL_CRONOGRAMA.indexOf('pie={')).toBeLessThan(abre);
  });
});
