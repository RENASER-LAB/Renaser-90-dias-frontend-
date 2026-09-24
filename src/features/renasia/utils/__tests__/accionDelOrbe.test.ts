import { describe, expect, it } from '@jest/globals';

import type { PropuestaUI } from '../../types/renasia.types';
import { elegirAccionVisible, PERMANENCIA_RESUELTA_MS } from '../accionDelOrbe';

const AHORA = 1_000_000;
const propuesta = (id: string, extra: Partial<PropuestaUI> = {}): PropuestaUI => ({
  id,
  resumen: `Propuesta ${id}`,
  venceEn: new Date(AHORA + 600_000).toISOString(),
  estado: 'pendiente',
  ...extra,
});

describe('elegirAccionVisible', () => {
  it('sin propuestas no muestra nada', () => {
    expect(elegirAccionVisible([], AHORA)).toBeNull();
  });

  it('muestra la pendiente más reciente y cuenta las demás para el chat', () => {
    const accion = elegirAccionVisible([propuesta('a'), propuesta('b'), propuesta('c')], AHORA);

    expect(accion?.propuesta.id).toBe('c');
    expect(accion?.otrasPendientes).toBe(2);
    expect(accion?.seVaEnMs).toBeNull();
  });

  it('una que se está confirmando sigue a la vista', () => {
    expect(elegirAccionVisible([propuesta('a', { estado: 'confirmando' })], AHORA)?.propuesta.id).toBe('a');
  });

  it('una resuelta se ve unos segundos, con lo que le queda, y después se va sola', () => {
    const hecha = propuesta('a', { estado: 'confirmada', mensaje: 'Listo', resueltaEnMs: AHORA - 1000 });

    const visible = elegirAccionVisible([hecha], AHORA);
    expect(visible?.propuesta.id).toBe('a');
    expect(visible?.seVaEnMs).toBe(PERMANENCIA_RESUELTA_MS - 1000);
    expect(elegirAccionVisible([hecha], AHORA + PERMANENCIA_RESUELTA_MS)).toBeNull();
  });

  it('una pendiente vencida ya no se muestra (queda en el chat)', () => {
    const vencida = propuesta('a', { venceEn: new Date(AHORA - 1).toISOString() });

    expect(elegirAccionVisible([vencida], AHORA)).toBeNull();
  });
});
