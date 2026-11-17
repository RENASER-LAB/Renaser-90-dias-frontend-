import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

/**
 * Las evidencias de la ficha del mentor (2026-10-27): se abren DENTRO de la app, en la misma hoja del líder; antes se salía al
 * navegador con `Linking.openURL` y una evidencia de texto decía «no hay archivo que abrir» sin mostrar lo escrito. Vale para «Mi grupo» y
 * para la ficha que se abre desde la info del chat del grupo: es la misma pantalla.
 *
 * Con el rediseño del 17/11 (spec 055) el botón «Ver evidencia» de «Detalle de hábitos» pasó a ser el ojo de cada hábito cumplido; lo que
 * se prueba montando la hoja (foto, texto, fallos, anterior/siguiente) vive en `components/__tests__/evidenciaDelHabito.test.ts`. Acá quedan
 * las guardas de que la ficha no vuelve a sacar la evidencia al navegador.
 */
describe('la ficha del mentor no vuelve a sacar la evidencia al navegador', () => {
  const fuente = readFileSync(join(__dirname, '..', 'AlumnoScreen.tsx'), 'utf8');

  it('no usa Linking ni pide el enlace por su cuenta: lo hace la hoja de la evidencia', () => {
    expect(fuente).not.toMatch(/Linking/);
    expect(fuente).not.toMatch(/import[^;]*urlDeEvidencia/);
    expect(fuente).toMatch(/<EvidenciaDeObligacion/);
  });

  it('abre la hoja del líder (la misma de Administración), con el id de cada evidencia del hábito', () => {
    expect(fuente).toMatch(/import \{ EvidenciaDeObligacion \} from '\.\.\/\.\.\/lider-mentores\/components\/EvidenciaDeObligacion'/);
    expect(fuente).toContain('evidencias={habitoConEvidencia.obligacion.evidencias}');
  });
});
