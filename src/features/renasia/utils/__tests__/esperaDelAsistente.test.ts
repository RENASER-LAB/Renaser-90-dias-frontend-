/**
 * Lo que se le dice a la persona mientras el asistente no contesta.
 *
 * Existe porque el indicador quieto de "está escribiendo…" se leyó como una app trabada durante
 * una espera real de 38 segundos (medida contra el backend el 2026-09-15).
 */
import { describe, expect, it } from '@jest/globals';

import {
  avisoDeEspera,
  SEGUNDOS_PARA_PENSANDO,
  SEGUNDOS_PARA_TRANQUILIZAR,
} from '../esperaDelAsistente';

const SER = 'SER';

describe('aviso de espera', () => {
  it('al principio no cambia nada: una espera corta es normal', () => {
    expect(avisoDeEspera(0, SER, false)).toBe('SER está escribiendo…');
    expect(avisoDeEspera(SEGUNDOS_PARA_PENSANDO - 1, SER, false)).toBe('SER está escribiendo…');
  });

  it('pasada la espera normal muestra los segundos, para que se vea que avanza', () => {
    expect(avisoDeEspera(SEGUNDOS_PARA_PENSANDO, SER, false)).toBe('SER está pensando… (8 s)');
    expect(avisoDeEspera(15, SER, false)).toBe('SER está pensando… (15 s)');
  });

  it('en una espera larga avisa que puede tardar, en vez de dejar dudando', () => {
    const aviso = avisoDeEspera(SEGUNDOS_PARA_TRANQUILIZAR, SER, false);
    expect(aviso).toContain('Sigue trabajando (25 s)');
    expect(aviso).toContain('puede tardar hasta un minuto');
  });

  it('con texto ya llegando vuelve al aviso simple: ahí nadie duda de que está viva', () => {
    // 38 s fue la espera real medida, y aun así: si la respuesta ya se está viendo aparecer,
    // escalar el aviso sería ruido.
    expect(avisoDeEspera(38, SER, true)).toBe('SER está escribiendo…');
  });

  it('usa el nombre del asistente de ESTE panel (D-102), no uno fijo', () => {
    expect(avisoDeEspera(10, 'SPARKIE', false)).toBe('SPARKIE está pensando… (10 s)');
  });
});
