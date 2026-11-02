/**
 * Spec 038 (SER al día): un ritual que pide SER no se registra con la cámara sino ESCRIBIENDO, como en Training (31/10, punto 7).
 * El servidor manda la tarjeta de un ritual con `conPregunta`; la app lo lee como «se escribe». Contra el código anterior fallan todas:
 * `seRegistraEscribiendoElPedido` y `textoDeRegistrado` no existían y `cambioAlRegistrar` decía siempre «Listo, quedó registrado.».
 */
import { describe, expect, it } from '@jest/globals';

import {
  cambioAlRegistrar,
  pedidoDesdeEvento,
  seRegistraEscribiendoElPedido,
  TEXTO_ACCION_REGISTRADA,
  TEXTO_REGISTRADO,
  TEXTO_RITUAL_REGISTRADO,
  textoDeRegistrado,
} from '../pedidosDeFoto';

const EVENTO = { tipo: 'evidencia' as const, registroId: 'r-1', titulo: 'RITUAL TIERRA - AGUA - FUEGO (mañana)', venceEn: '2026-11-02T23:00:00Z' };

describe('seRegistraEscribiendoElPedido', () => {
  it('un hábito con conPregunta (los tres rituales) se escribe; sin conPregunta, foto', () => {
    expect(seRegistraEscribiendoElPedido(pedidoDesdeEvento({ ...EVENTO, conPregunta: true }))).toBe(true);
    expect(seRegistraEscribiendoElPedido(pedidoDesdeEvento({ ...EVENTO, conPregunta: false }))).toBe(false);
    expect(seRegistraEscribiendoElPedido(pedidoDesdeEvento(EVENTO))).toBe(false);
  });

  it('una acción del día nunca es un ritual, aunque el servidor mande conPregunta', () => {
    expect(seRegistraEscribiendoElPedido(pedidoDesdeEvento({ ...EVENTO, conPregunta: true, destino: 'roca' }))).toBe(false);
  });
});

describe('lo que dice la tarjeta al registrarse', () => {
  it('el ritual, el hábito con foto y la acción dicen cada uno lo suyo', () => {
    expect(textoDeRegistrado({ destino: 'habito', conPregunta: true })).toBe(TEXTO_RITUAL_REGISTRADO);
    expect(textoDeRegistrado({ destino: 'habito', conPregunta: false })).toBe(TEXTO_REGISTRADO);
    expect(textoDeRegistrado({ destino: 'roca', conPregunta: false })).toBe(TEXTO_ACCION_REGISTRADA);
    expect(TEXTO_RITUAL_REGISTRADO).toBe('Listo, quedó registrado tu ritual.');
  });

  it('cambioAlRegistrar: lo de siempre sin ritual; con ritual, su texto', () => {
    expect(cambioAlRegistrar()).toEqual({ estado: 'registrado', mensaje: TEXTO_REGISTRADO });
    expect(cambioAlRegistrar('roca')).toEqual({ estado: 'registrado', mensaje: TEXTO_ACCION_REGISTRADA });
    expect(cambioAlRegistrar('habito', true)).toEqual({ estado: 'registrado', mensaje: TEXTO_RITUAL_REGISTRADO });
  });
});
