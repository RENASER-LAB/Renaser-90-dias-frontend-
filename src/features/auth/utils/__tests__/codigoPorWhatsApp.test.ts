import { describe, expect, it } from '@jest/globals';

import { validarWhatsapp } from '../../../onboarding/data/pasosFicha';
import {
  avisoDelWhatsappDelRegistro,
  enmascararWhatsapp,
  lineaAntesDeEnviar,
  numeroInternacional,
  seOfreceElWhatsapp,
  SEGUNDOS_PARA_OFRECER_WHATSAPP,
  TEXTO_DEL_ENLACE,
  textoDeEnviado,
} from '../codigoPorWhatsApp';

describe('el código por WhatsApp, sin pantalla (spec 043)', () => {
  // spec 043 FR-012
  it('se ofrece recién a los 60 segundos de mandar el código al correo', () => {
    expect(SEGUNDOS_PARA_OFRECER_WHATSAPP).toBe(60);
    expect(seOfreceElWhatsapp(59)).toBe(false);
    expect(seOfreceElWhatsapp(60)).toBe(true);
    expect(TEXTO_DEL_ENLACE).toBe('¿No te llegó? Envíamelo por WhatsApp');
  });

  // spec 043 FR-012, SC-003
  it('enmascara igual que el servidor: +51 9•• ••• •21', () => {
    expect(enmascararWhatsapp('+51 987654321')).toBe('+51 9•• ••• •21');
    expect(enmascararWhatsapp('+51 987 654 321')).toBe('+51 9•• ••• •21');
    expect(enmascararWhatsapp('+1 2025550123')).toBe('+12 0•• ••• •23');
    expect(enmascararWhatsapp('+51 98')).toBeNull();
  });

  // spec 043 FR-003
  it('la forma internacional: «+», código de país y de 8 a 15 dígitos', () => {
    expect(numeroInternacional('+51 987654321')).toBe('+51987654321');
    expect(numeroInternacional('987654321')).toBeNull();
    expect(numeroInternacional('+51 ')).toBeNull();
  });

  // spec 043 FR-003
  it('«Solicitar acceso» usa la regla de la ficha y además pide la forma que el servidor puede usar', () => {
    expect(avisoDelWhatsappDelRegistro('+51 ', validarWhatsapp)).toMatch(/WhatsApp/);
    expect(avisoDelWhatsappDelRegistro('+51 98765', validarWhatsapp)).toMatch(/número completo/);
    expect(avisoDelWhatsappDelRegistro('+51 987654321', validarWhatsapp)).toBeNull();
  });

  // spec 043 FR-009, FR-012, FR-015
  it('en el alta dice a qué número va; en la recuperación nunca muestra un número ni da a entender que la cuenta tiene uno', () => {
    expect(lineaAntesDeEnviar('registro', '+51 9•• ••• •21')).toBe('Te lo enviamos a +51 9•• ••• •21.');
    expect(lineaAntesDeEnviar('recuperacion', '+51 9•• ••• •21')).toBeNull();
    expect(textoDeEnviado('registro', '+51 9•• ••• •21')).toBe('Te enviamos el código por WhatsApp a +51 9•• ••• •21.');
    expect(textoDeEnviado('recuperacion', '+51 9•• ••• •21')).toBe('Si tu cuenta tiene un WhatsApp guardado, te enviamos el código ahí.');
    expect(textoDeEnviado('recuperacion', null)).toBe(textoDeEnviado('recuperacion', '+51 9•• ••• •21'));
  });
});
