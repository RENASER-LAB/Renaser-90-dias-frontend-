import { describe, expect, it } from '@jest/globals';

import {
  TEXTO_MIXTO,
  TEXTO_OCULTO,
  TEXTO_VISIBLE,
  confirmacionDelCambio,
  textoDeLoHecho,
  textoDelEstado,
  textoDelUltimoCambio,
} from '../codigoRenaserEnFichas';

describe('los textos de «Código Renaser en las fichas» (spec 034)', () => {
  it('dice el estado vigente, y si Soporte TI los dejó distintos lo dice sin afirmar que «lo ven todos»', () => {
    expect(textoDelEstado({ visible: true, mixto: false })).toBe(TEXTO_VISIBLE);
    expect(textoDelEstado({ visible: false, mixto: false })).toBe(TEXTO_OCULTO);
    expect(textoDelEstado({ visible: false, mixto: true })).toBe(TEXTO_MIXTO);
  });

  it('apagado aclara quién lo sigue viendo: Administración, Alquimista y la propia persona', () => {
    expect(TEXTO_OCULTO).toContain('Alquimista');
    expect(TEXTO_OCULTO).toContain('propia persona');
  });

  it('la confirmación dice qué va a pasar y que no se avisa a nadie; no pide motivo', () => {
    const encender = confirmacionDelCambio(true);
    expect(encender.titulo).toBe('Mostrar el Código Renaser');
    expect(encender.ok).toBe('Mostrar');
    expect(encender.mensaje).toContain('No se avisa a nadie');
    expect(encender.mensaje.toLowerCase()).not.toContain('motivo');

    const apagar = confirmacionDelCambio(false);
    expect(apagar.titulo).toBe('Ocultar el Código Renaser');
    expect(apagar.ok).toBe('Ocultar');
    expect(apagar.mensaje).toContain('dejarán de ver');
    expect(apagar.mensaje).toContain('No se avisa a nadie');
  });

  it('la línea de lo hecho nombra el resultado', () => {
    expect(textoDeLoHecho(true)).toBe('Listo: el mentor y el líder ya ven el Código Renaser.');
    expect(textoDeLoHecho(false)).toBe('Listo: el mentor y el líder ya no ven el Código Renaser.');
  });

  describe('el último cambio', () => {
    it('mientras nadie lo cambió no hay línea', () => {
      expect(textoDelUltimoCambio(null)).toBeNull();
      expect(textoDelUltimoCambio({ porId: null, porNombre: null, en: null })).toBeNull();
    });

    it('una fecha que no se entiende no se inventa', () => {
      expect(textoDelUltimoCambio({ porId: 'u', porNombre: 'Ana', en: 'ayer' })).toBeNull();
    });

    it('lleva quién y cuándo', () => {
      const texto = textoDelUltimoCambio({ porId: 'u', porNombre: 'Ana Pérez', en: '2026-10-31T23:40:00' })!;
      expect(texto).toMatch(/^Último cambio: Ana Pérez, 31 oct 2026, 23:40$/);
    });

    it('sin nombre (la cuenta ya no existe) dice solo cuándo', () => {
      const texto = textoDelUltimoCambio({ porId: 'u', porNombre: null, en: '2026-10-31T09:05:00' })!;
      expect(texto).toBe('Último cambio: 31 oct 2026, 09:05');
    });
  });
});
