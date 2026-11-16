/**
 * El aviso de «WhatsApp sin saldo» en el panel de Administración (spec 054): la tarjeta aparece con la respuesta que pide avisar,
 * no aparece si no, y solo Administración y Alquimista piden el estado. El día y la hora salen en la zona de Lima.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../api/estadoDeWhatsAppApi', () => ({ leerElEstadoDeWhatsApp: jest.fn() }));

import { leerElEstadoDeWhatsApp } from '../api/estadoDeWhatsAppApi';
import { AvisoDeWhatsAppSinSaldo } from '../components/AvisoDeWhatsAppSinSaldo';
import { useEstadoDeWhatsApp } from '../hooks/useEstadoDeWhatsApp';
import { lineaDeLosEnviosFallidos, TEXTO_SIN_SALDO, veElAvisoDeSaldo } from '../utils/avisoDeWhatsAppSinSaldo';

const leer = leerElEstadoDeWhatsApp as jest.MockedFunction<typeof leerElEstadoDeWhatsApp>;

const textos = (r: ReactTestRenderer): string[] => {
  const salida: string[] = [];
  const recorrer = (n: unknown): void => {
    if (typeof n === 'string') salida.push(n);
    else if (Array.isArray(n)) n.forEach(recorrer);
    else if (n && typeof n === 'object' && 'children' in n) recorrer((n as { children: unknown }).children);
  };
  recorrer(r.toJSON());
  return salida;
};

function Panel({ rol }: { rol: string }) {
  const estado = useEstadoDeWhatsApp({ activo: veElAvisoDeSaldo(rol) });
  return React.createElement(AvisoDeWhatsAppSinSaldo, { estado });
}

async function montar(rol: string): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(Panel, { rol }));
  });
  return r;
}

beforeEach(() => {
  leer.mockReset();
});
afterEach(() => {
  jest.clearAllMocks();
});

describe('aviso de WhatsApp sin saldo (spec 054)', () => {
  // spec 054 FR-006
  it('con la respuesta que pide avisar, dibuja la tarjeta con el texto y la línea de cuántos y desde cuándo', async () => {
    leer.mockResolvedValue({ sinSaldo: true, fallaron: 12, desde: '2026-11-14T15:20:00Z' });

    const r = await montar('ADMIN');

    const t = textos(r);
    expect(t).toContain(TEXTO_SIN_SALDO);
    expect(t).toContain('12 sin enviar desde el sábado 14 a las 10:20');
  });

  // spec 054 FR-006
  it('sin aviso no dibuja nada: ni tarjeta ni hueco', async () => {
    leer.mockResolvedValue({ sinSaldo: false, fallaron: 0, desde: null });

    const r = await montar('ALCHEMIST');

    expect(r.toJSON()).toBeNull();
  });

  // spec 054 FR-007
  it('si la lectura falla (sin red, 403, servidor anterior) no dibuja nada y no bloquea el panel', async () => {
    leer.mockRejectedValue(new Error('404'));

    const r = await montar('ADMIN');

    expect(r.toJSON()).toBeNull();
  });

  // spec 054 FR-007
  it.each(['MENTOR', 'MENTOR_LEAD', 'TRAINEE_GUIDE', 'TRAINEE', 'IT_SUPPORT', ''])('%s no pide el estado ni ve la tarjeta', async rol => {
    leer.mockResolvedValue({ sinSaldo: true, fallaron: 3, desde: '2026-11-14T15:20:00Z' });

    const r = await montar(rol);

    expect(leer).not.toHaveBeenCalled();
    expect(r.toJSON()).toBeNull();
  });

  // spec 054 FR-007
  it('solo ADMIN y ALCHEMIST lo ven', () => {
    expect(veElAvisoDeSaldo('ADMIN')).toBe(true);
    expect(veElAvisoDeSaldo('ALCHEMIST')).toBe(true);
    expect(veElAvisoDeSaldo('MENTOR')).toBe(false);
    expect(veElAvisoDeSaldo(null)).toBe(false);
    expect(veElAvisoDeSaldo(undefined)).toBe(false);
  });

  // spec 054 FR-006
  it('la hora sale en la zona de Lima, aunque el instante sea del día siguiente en UTC', () => {
    expect(lineaDeLosEnviosFallidos(1, '2026-11-15T03:30:00Z')).toBe('1 sin enviar desde el sábado 14 a las 22:30');
    expect(lineaDeLosEnviosFallidos(5, null)).toBe('5 sin enviar');
  });

  // spec 054 FR-006, FR-007
  it('el panel de Administración pone la tarjeta arriba de todo y pide el estado solo con el rol de Administración', () => {
    const fuente = readFileSync(join(__dirname, '../screens/AdminInicioScreen.tsx'), 'utf8');

    expect(fuente).toMatch(/useEstadoDeWhatsApp\(\{ activo: veElAvisoDeSaldo\(user\?\.role\) \}\)/);
    expect(fuente.indexOf('<AvisoDeWhatsAppSinSaldo')).toBeGreaterThan(0);
    expect(fuente.indexOf('<AvisoDeWhatsAppSinSaldo')).toBeLessThan(fuente.indexOf('<AQuienAtiendoHoy'));
  });
});
