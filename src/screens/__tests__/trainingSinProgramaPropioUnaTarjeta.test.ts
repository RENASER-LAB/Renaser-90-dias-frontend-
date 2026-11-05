/**
 * Issue #136: al personal SIN fila en el programa (`canStartProgram`, la invitación «Hacer mi programa de 90 días») Training le mostraba
 * además el aviso «Todavía no empezaste tu programa · Tu programa empieza mañana», pensado para quien YA tiene la fila sin activar:
 * dos tarjetas con «Empezar mañana» y una de ellas afirmaba algo que no pasó. Sin fila queda solo la invitación, como en Hoy y Yo.
 *
 * Contra el código anterior falla: el aviso solo miraba `programaSinArrancar`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const fuente = fs.readFileSync(path.join(__dirname, '..', 'TrainingScreen.tsx'), 'utf8');

describe('Training sin programa propio (issue #136)', () => {
  it('el aviso «Todavía no empezaste tu programa» no sale junto a la invitación', () => {
    expect(fuente).toMatch(/\{programaSinArrancar && !sinProgramaPropio && \(/);
    expect(fuente).not.toMatch(/\{programaSinArrancar && \(/);
  });
});
