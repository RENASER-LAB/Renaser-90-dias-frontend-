/**
 * Los enlaces dentro del texto de una lección.
 *
 * Reporte del dueño (2026-09-18): una lección decía "Link del formulario: https://forms.gle/…" y el
 * enlace era texto plano — se veía, no se podía tocar. Falla contra el código anterior, que no
 * tenía forma de distinguir un enlace del resto del párrafo.
 */
import { describe, expect, it } from '@jest/globals';

import { partirEnEnlaces } from '../enlacesEnTexto';

const enlaces = (texto: string) =>
  partirEnEnlaces(texto).filter(s => s.tipo === 'enlace').map(s => (s as { url: string }).url);

describe('partirEnEnlaces', () => {
  it('un texto sin enlaces queda entero, en un solo trozo', () => {
    expect(partirEnEnlaces('Respóndela con honestidad.')).toEqual([
      { tipo: 'texto', valor: 'Respóndela con honestidad.' },
    ]);
  });

  it('encuentra el enlace en medio de la frase y conserva lo que lo rodea', () => {
    const partes = partirEnEnlaces('Link del formulario: https://forms.gle/abc123 y listo');
    expect(partes).toEqual([
      { tipo: 'texto', valor: 'Link del formulario: ' },
      { tipo: 'enlace', valor: 'https://forms.gle/abc123', url: 'https://forms.gle/abc123' },
      { tipo: 'texto', valor: ' y listo' },
    ]);
  });

  it('no se traga el punto final de la oración', () => {
    // Sin esto, el enlace sería "https://forms.gle/abc." y Google devolvería 404.
    expect(enlaces('Entra a https://forms.gle/abc.')).toEqual(['https://forms.gle/abc']);
    expect(partirEnEnlaces('Entra a https://forms.gle/abc.').at(-1)).toEqual({ tipo: 'texto', valor: '.' });
  });

  it('tampoco el paréntesis que lo cierra', () => {
    expect(enlaces('(ver https://renaser.com/guia)')).toEqual(['https://renaser.com/guia']);
  });

  it('encuentra varios en el mismo texto', () => {
    expect(enlaces('uno https://a.com dos http://b.com tres')).toEqual(['https://a.com', 'http://b.com']);
  });

  it('SOLO http y https: nada de tel, mailto, javascript o intent', () => {
    /* Esto es lo que impide que el texto de una lección dispare algo que no sea abrir una web.
       `Linking.openURL` abre lo que le den, así que el filtro tiene que estar acá. */
    expect(enlaces('llamá a tel:+5115551234')).toEqual([]);
    expect(enlaces('escribí a mailto:alguien@renaser.com')).toEqual([]);
    expect(enlaces('javascript:alert(1)')).toEqual([]);
    expect(enlaces('intent://ejecutar#Intent;scheme=algo;end')).toEqual([]);
    expect(enlaces('file:///etc/passwd')).toEqual([]);
  });

  it('un enlace pegado a un javascript: no arrastra al otro', () => {
    expect(enlaces('https://ok.com javascript:alert(1)')).toEqual(['https://ok.com']);
  });
});
