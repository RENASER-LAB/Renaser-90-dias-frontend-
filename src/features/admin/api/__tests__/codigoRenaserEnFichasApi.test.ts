import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import {
  RUTA_DEL_CODIGO_RENASER_EN_FICHAS,
  cambiarCodigoRenaserEnFichas,
  codigoRenaserEnFichasSchema,
  leerCodigoRenaserEnFichas,
} from '../codigoRenaserEnFichasApi';

/**
 * El contrato de `/api/v1/admin/codigo-renaser-en-fichas` (backend D-299, spec 034): ruta, verbo y cuerpo, y un esquema que
 * aguanta campos nuevos y un servidor que manda menos. Contrato en `specs/034-codigo-renaser-visible-por-admin/contracts/api.md`.
 */

const APAGADO = {
  visible: false,
  mixto: false,
  porRol: { MENTOR: false, TRAINEE_GUIDE: false, MENTOR_LEAD: false },
  ultimoCambio: null,
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(APAGADO);
});

describe('la ruta y los verbos', () => {
  it('leer es un GET a la ruta del contrato, sin cuerpo', async () => {
    const estado = await leerCodigoRenaserEnFichas();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/codigo-renaser-en-fichas', undefined);
    expect(RUTA_DEL_CODIGO_RENASER_EN_FICHAS).toBe('/api/v1/admin/codigo-renaser-en-fichas');
    expect(estado.visible).toBe(false);
  });

  it('encender es un PUT con solo { visible: true }: sin motivo, como decidió el dueño', async () => {
    mockApiFetch.mockResolvedValue({ ...APAGADO, visible: true });
    const estado = await cambiarCodigoRenaserEnFichas(true);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/codigo-renaser-en-fichas', { method: 'PUT', body: { visible: true } });
    expect(estado.visible).toBe(true);
  });

  it('apagar manda { visible: false }', async () => {
    await cambiarCodigoRenaserEnFichas(false);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/codigo-renaser-en-fichas', { method: 'PUT', body: { visible: false } });
  });
});

describe('el esquema tolerante', () => {
  it('lee el cuerpo del contrato con el último cambio', () => {
    const r = codigoRenaserEnFichasSchema.safeParse({
      ...APAGADO,
      visible: true,
      porRol: { MENTOR: true, TRAINEE_GUIDE: true, MENTOR_LEAD: true },
      ultimoCambio: { porId: 'u-1', porNombre: 'Ana Pérez', en: '2026-10-31T23:40:12Z' },
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.ultimoCambio?.porNombre).toBe('Ana Pérez');
  });

  it('un campo de más no lo rompe', () => {
    expect(codigoRenaserEnFichasSchema.safeParse({ ...APAGADO, campoDeMañana: 42 }).success).toBe(true);
  });

  it('lo único indispensable es `visible`: sin `mixto`, `porRol` ni `ultimoCambio` se rellena con lo neutro', () => {
    const r = codigoRenaserEnFichasSchema.safeParse({ visible: true });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.mixto).toBe(false);
    expect(r.data.porRol).toEqual({});
    expect(r.data.ultimoCambio).toBeNull();
  });

  it('`mixto` se lee como booleano', () => {
    const r = codigoRenaserEnFichasSchema.safeParse({ ...APAGADO, mixto: true });
    expect(r.success && r.data.mixto).toBe(true);
  });

  it('el nombre de quien lo cambió puede ser null (la cuenta ya no existe)', () => {
    const r = codigoRenaserEnFichasSchema.safeParse({ ...APAGADO, ultimoCambio: { porId: 'u-1', porNombre: null, en: '2026-10-31T23:40:12Z' } });
    expect(r.success).toBe(true);
  });

  it('sin `visible` no hay estado: la respuesta no calza', () => {
    expect(codigoRenaserEnFichasSchema.safeParse({ mixto: false }).success).toBe(false);
  });
});
