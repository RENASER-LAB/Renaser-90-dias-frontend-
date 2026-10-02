import { describe, expect, it } from '@jest/globals';

import {
  baseWebPublica,
  destinoDePoliticaDePrivacidad,
  urlDePoliticaDePrivacidad,
  WEB_PUBLICA_POR_DEFECTO,
} from '../enlacesLegales';

describe('enlaces legales (D-245)', () => {
  it('sin configuración usa el dominio de producción de Vercel', () => {
    expect(baseWebPublica('')).toBe(WEB_PUBLICA_POR_DEFECTO);
    expect(baseWebPublica('   ')).toBe(WEB_PUBLICA_POR_DEFECTO);
    expect(urlDePoliticaDePrivacidad('')).toBe(
      'https://renaser-90-dias-frontend-livid.vercel.app/privacidad/',
    );
  });

  it('quita las barras finales de una base configurada', () => {
    expect(urlDePoliticaDePrivacidad('https://renaser.pe///')).toBe('https://renaser.pe/privacidad/');
  });

  it('en web abre la ruta del propio sitio y en nativo la URL absoluta', () => {
    expect(destinoDePoliticaDePrivacidad('web', 'https://x.test')).toBe('/privacidad/');
    expect(destinoDePoliticaDePrivacidad('android', 'https://x.test')).toBe('https://x.test/privacidad/');
    expect(destinoDePoliticaDePrivacidad('ios', '')).toBe(
      'https://renaser-90-dias-frontend-livid.vercel.app/privacidad/',
    );
  });
});
