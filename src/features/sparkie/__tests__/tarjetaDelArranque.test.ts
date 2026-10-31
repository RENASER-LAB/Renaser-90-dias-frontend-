/**
 * Cuándo la guía de arranque se presenta, se reabre o se esconde (issue #50): reglas puras.
 *
 * Contra el código anterior fallan: cualquier cambio de `estado.paso` —también pasar por «ninguno» tras una
 * lectura fallida— reabría la guía minimizada, y la tarjeta no sabía nada del panel de SER.
 */
import { describe, expect, it } from '@jest/globals';

import { esPasoAccionable, reabreLaGuia, tarjetaPendiente, tarjetaVisible } from '../utils/tarjetaDelArranque';

describe('qué pasos tienen algo que contar', () => {
  it('publicar el primer post y firmar el Pacto sí; «cargando» y «ninguno» no', () => {
    expect(esPasoAccionable('PUBLICAR_PRIMER_POST')).toBe(true);
    expect(esPasoAccionable('FIRMAR_PACTO')).toBe(true);
    expect(esPasoAccionable('CARGANDO')).toBe(false);
    expect(esPasoAccionable('NINGUNO')).toBe(false);
  });
});

describe('cuándo se vuelve a abrir una guía minimizada', () => {
  it('avanzar de «publicar» a «firmar el Pacto» la reabre: es el paso que de verdad hay que cerrar', () => {
    expect(reabreLaGuia('PUBLICAR_PRIMER_POST', 'FIRMAR_PACTO')).toBe(true);
  });

  it('pasar por «ninguno» o «cargando» no la reabre', () => {
    expect(reabreLaGuia('PUBLICAR_PRIMER_POST', 'NINGUNO')).toBe(false);
    expect(reabreLaGuia('PUBLICAR_PRIMER_POST', 'CARGANDO')).toBe(false);
    expect(reabreLaGuia('FIRMAR_PACTO', 'NINGUNO')).toBe(false);
  });

  it('volver al MISMO paso después de pasar por «ninguno» (lectura fallida al volver de la cámara) no la reabre', () => {
    // El último paso accionable que se vio sigue siendo «publicar»: no hubo avance.
    expect(reabreLaGuia('PUBLICAR_PRIMER_POST', 'PUBLICAR_PRIMER_POST')).toBe(false);
    expect(reabreLaGuia('FIRMAR_PACTO', 'FIRMAR_PACTO')).toBe(false);
  });

  it('el primer paso que se ve no necesita reabrir nada: la guía nace abierta', () => {
    expect(reabreLaGuia(null, 'PUBLICAR_PRIMER_POST')).toBe(false);
    expect(reabreLaGuia(null, 'FIRMAR_PACTO')).toBe(false);
  });
});

const base = { habilitado: true, minimizado: false, pactoAbierto: false, paso: 'PUBLICAR_PRIMER_POST' as const };

describe('cuándo la tarjeta le toca a la persona', () => {
  it('con sesión, sin minimizar y con un paso que contar', () => {
    expect(tarjetaPendiente(base)).toBe(true);
    expect(tarjetaPendiente({ ...base, paso: 'FIRMAR_PACTO' })).toBe(true);
  });

  it('no si la minimizó, si está firmando el Pacto, si no hay sesión o si no hay paso', () => {
    expect(tarjetaPendiente({ ...base, minimizado: true })).toBe(false);
    expect(tarjetaPendiente({ ...base, pactoAbierto: true })).toBe(false);
    expect(tarjetaPendiente({ ...base, habilitado: false })).toBe(false);
    expect(tarjetaPendiente({ ...base, paso: 'NINGUNO' })).toBe(false);
    expect(tarjetaPendiente({ ...base, paso: 'CARGANDO' })).toBe(false);
  });
});

describe('cuándo la tarjeta se dibuja', () => {
  it('sin panel de SER abierto, es la que le toca', () => {
    expect(tarjetaVisible({ ...base, panelDeSerAbierto: false })).toBe(true);
  });

  it('con el panel de SER abierto NO se monta encima, aunque le toque', () => {
    expect(tarjetaPendiente(base)).toBe(true);
    expect(tarjetaVisible({ ...base, panelDeSerAbierto: true })).toBe(false);
  });

  it('lo que no le toca no se dibuja, con panel o sin él', () => {
    expect(tarjetaVisible({ ...base, minimizado: true, panelDeSerAbierto: false })).toBe(false);
    expect(tarjetaVisible({ ...base, paso: 'NINGUNO', panelDeSerAbierto: false })).toBe(false);
  });
});
