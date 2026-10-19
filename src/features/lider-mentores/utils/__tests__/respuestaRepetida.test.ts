import { describe, expect, it } from '@jest/globals';

import { respuestaYaLeidaComoEvidencia } from '../respuestaRepetida';

/*
 * E2E de la spec 005 (E-629 (b)): al entregar un texto, la app manda lo escrito dos veces —como evidencia de tipo TEXTO y como
 * `respuestaTexto` del registro (EvidenciaHabitoModal: confirmarEvidencia + completarRegistro con el mismo `textoUtil`)—
 * y la hoja del líder lo mostraba dos veces: el texto y, debajo, «Lo que escribió» con las mismas palabras.
 */
describe('respuestaYaLeidaComoEvidencia', () => {
  it('es repetida si una evidencia de texto ya trae lo mismo, sin importar espacios ni saltos al borde', () => {
    expect(respuestaYaLeidaComoEvidencia('Escuché la audioterapia', ['  Escuché la audioterapia\n'])).toBe(true);
  });

  it('no es repetida si el texto de la evidencia dice otra cosa: se muestran las dos', () => {
    expect(respuestaYaLeidaComoEvidencia('Me sentí tranquila', ['Resumen de la clase'])).toBe(false);
  });

  it('no es repetida si todavía no se leyó ningún texto (foto, audio o video no cuentan)', () => {
    expect(respuestaYaLeidaComoEvidencia('Tranquila y enfocada', [])).toBe(false);
  });

  it('sin respuesta escrita no hay nada que repetir', () => {
    expect(respuestaYaLeidaComoEvidencia('', ['algo'])).toBe(false);
    expect(respuestaYaLeidaComoEvidencia(null, ['algo'])).toBe(false);
  });
});
