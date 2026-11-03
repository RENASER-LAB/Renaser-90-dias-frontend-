import { describe, expect, it } from '@jest/globals';

import type { RespuestasAgrupadasApi } from '../../../onboarding/types/onboarding.types';
import { validarPaso, validarWhatsapp } from '../../../onboarding/data/pasosFicha';
import { CODIGO_POR_DEFECTO, decidirWhatsapp, tieneNumeroLocal, valorInicialDelCampo, whatsappDeLasRespuestas } from '../whatsappDelPerfil';

/**
 * El WhatsApp de Editar perfil (Yo → Ajustes → Perfil): sale de la respuesta «WhatsApp principal» de la Ficha Inicial, se guarda en esa misma
 * respuesta, no se puede dejar vacío y cumple la regla de la ficha.
 */

function respuestas(...answers: Array<{ questionKey: string; textValue: string | null }>): RespuestasAgrupadasApi {
  return {
    flow: 'ficha_inicial',
    sections: [
      {
        sectionKey: 'identidad_operativa',
        title: 'Identidad',
        answers: answers.map((a, i) => ({
          questionId: i + 1,
          questionKey: a.questionKey,
          type: 'TEXTO',
          textValue: a.textValue,
          numberValue: null,
          booleanValue: null,
          scaleValue: null,
          jsonValue: null,
          mediaId: null,
          acceptedAt: null,
          answeredAt: null,
          updatedAt: null,
        })),
      },
    ],
  };
}

describe('de dónde sale el número', () => {
  it('es la respuesta «whatsapp» de la ficha, tal como la guardó la persona', () => {
    const r = respuestas({ questionKey: 'full_name', textValue: 'Ana Pérez' }, { questionKey: 'whatsapp', textValue: '+51 987654321' });
    expect(whatsappDeLasRespuestas(r)).toBe('+51 987654321');
  });

  it('sin respuesta, o con una vacía, no hay número', () => {
    expect(whatsappDeLasRespuestas(respuestas({ questionKey: 'full_name', textValue: 'Ana' }))).toBeNull();
    expect(whatsappDeLasRespuestas(respuestas({ questionKey: 'whatsapp', textValue: '   ' }))).toBeNull();
    expect(whatsappDeLasRespuestas(respuestas({ questionKey: 'whatsapp', textValue: null }))).toBeNull();
    expect(whatsappDeLasRespuestas({ flow: 'ficha_inicial', sections: [] })).toBeNull();
  });
});

describe('lo que se le pone al campo al abrir', () => {
  it('el número guardado, con su código de país', () => {
    expect(valorInicialDelCampo('+591 71234567')).toBe('+591 71234567');
    expect(valorInicialDelCampo('  +51 987654321 ')).toBe('+51 987654321');
  });

  it('sin número, el código de Perú vacío (como el paso de la ficha)', () => {
    expect(valorInicialDelCampo(null)).toBe(CODIGO_POR_DEFECTO);
    expect(valorInicialDelCampo('   ')).toBe('+51 ');
  });
});

describe('¿hay número después del código?', () => {
  it.each([
    ['+51 987654321', true],
    ['+591 7', true],
    ['+1 5551234567', true],
    ['987654321', true], // una ficha vieja, sin código
    ['+51 ', false],
    ['+51', false],
    ['+591 ', false],
    ['', false],
    ['   ', false],
  ])('«%s» → %s', (valor, esperado) => {
    expect(tieneNumeroLocal(valor)).toBe(esperado);
  });
});

describe('la validación es la de la ficha', () => {
  it('la ficha y Perfil usan la misma función', () => {
    const ficha = { identidad: { whatsapp: '+51 98' }, salud: {}, consentimiento: {} } as never;
    expect(validarPaso('whatsapp', ficha)).toEqual(validarWhatsapp('+51 98'));
    expect(validarWhatsapp('+51 98')).toBeNull();
    expect(validarWhatsapp('+51 9')?.titulo).toBe('WhatsApp requerido');
    expect(validarWhatsapp('')?.titulo).toBe('WhatsApp requerido');
  });
});

describe('qué se hace al guardar', () => {
  it('un número nuevo se guarda, recortado', () => {
    expect(decidirWhatsapp('+51 987654321', '+51 912345678 ')).toEqual({ tipo: 'guardar', valor: '+51 912345678' });
  });

  it('cambiar solo el país también es un cambio', () => {
    expect(decidirWhatsapp('+51 987654321', '+52 987654321')).toEqual({ tipo: 'guardar', valor: '+52 987654321' });
  });

  it('el mismo número no se vuelve a mandar', () => {
    expect(decidirWhatsapp('+51 987654321', '+51 987654321')).toEqual({ tipo: 'sin-cambio' });
    expect(decidirWhatsapp('+51 987654321', ' +51 987654321 ')).toEqual({ tipo: 'sin-cambio' });
  });

  it('vaciarlo NO se guarda: en la ficha es obligatorio', () => {
    const d = decidirWhatsapp('+51 987654321', '+51 ');
    expect(d.tipo).toBe('rechazar');
    expect(d.tipo === 'rechazar' && d.aviso.titulo).toBe('WhatsApp requerido');
    expect(decidirWhatsapp('+51 987654321', '').tipo).toBe('rechazar');
    expect(decidirWhatsapp('+591 71234567', '+591 ').tipo).toBe('rechazar');
  });

  it('un número demasiado corto para la regla de la ficha tampoco se guarda', () => {
    const d = decidirWhatsapp('+51 987654321', '+51 9');
    expect(d.tipo).toBe('rechazar');
    expect(d.tipo === 'rechazar' && d.aviso.mensaje).toContain('WhatsApp');
  });

  it('quien nunca puso un número y lo deja vacío no tiene nada que guardar (cambiar su nombre no se le traba)', () => {
    expect(decidirWhatsapp(null, '+51 ')).toEqual({ tipo: 'sin-cambio' });
    expect(decidirWhatsapp(null, '')).toEqual({ tipo: 'sin-cambio' });
  });

  it('quien nunca puso un número y escribe uno, lo guarda', () => {
    expect(decidirWhatsapp(null, '+51 987654321')).toEqual({ tipo: 'guardar', valor: '+51 987654321' });
  });
});
