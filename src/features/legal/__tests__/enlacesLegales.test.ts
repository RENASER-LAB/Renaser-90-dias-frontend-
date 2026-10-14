import { describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';

import {
  abrirEliminarCuentaEnLaWeb,
  baseWebPublica,
  destinoDeEliminarCuenta,
  urlDeEliminarCuenta,
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

  it('la página pública para eliminar la cuenta (D-243), con la misma regla', () => {
    expect(urlDeEliminarCuenta('')).toBe('https://renaser-90-dias-frontend-livid.vercel.app/eliminar-cuenta');
    expect(destinoDeEliminarCuenta('web', 'https://x.test')).toBe('/eliminar-cuenta');
    expect(destinoDeEliminarCuenta('android', 'https://x.test/')).toBe('https://x.test/eliminar-cuenta');
  });

  it('en el teléfono, abre la página pública en el navegador (spec 002, fase 2: la fila nunca se esconde)', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await abrirEliminarCuentaEnLaWeb();
    expect(abrir).toHaveBeenCalledWith('https://renaser-90-dias-frontend-livid.vercel.app/eliminar-cuenta');
    abrir.mockRestore();
  });

  it('en web abre la ruta del propio sitio y en nativo la URL absoluta', () => {
    expect(destinoDePoliticaDePrivacidad('web', 'https://x.test')).toBe('/privacidad/');
    expect(destinoDePoliticaDePrivacidad('android', 'https://x.test')).toBe('https://x.test/privacidad/');
    expect(destinoDePoliticaDePrivacidad('ios', '')).toBe(
      'https://renaser-90-dias-frontend-livid.vercel.app/privacidad/',
    );
  });
});
