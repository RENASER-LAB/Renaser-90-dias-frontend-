import { describe, expect, it } from '@jest/globals';

import type { PropuestaUI } from '../../types/renasia.types';
import { elegirAccionVisible, PERMANENCIA_RESUELTA_MS, primeraFrase, resumenCorto } from '../accionDelOrbe';

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

describe('resumenCorto', () => {
  it('deja la acción y corta el detalle entre paréntesis o tras la coma', () => {
    expect(
      resumenCorto(
        "Cambiar 'Genera 10 km' de 07:00 a 10:00 (sin hora limite propia) como horario general, desde el viernes 2026-09-25 (hoy sigue igual). Usa 1 de sus 3 cambios."
      )
    ).toBe("Cambiar 'Genera 10 km' de 07:00 a 10:00");
    expect(resumenCorto('Recordar que estas ocupado/a lunes, martes de 09:00-18:00 (reemplaza lo guardado)')).toBe(
      'Recordar que estas ocupado/a lunes'
    );
  });

  it('si no hay dónde cortar, acorta con puntos suspensivos', () => {
    const largo = 'a'.repeat(100);
    expect(resumenCorto(largo)).toHaveLength(64);
    expect(resumenCorto(largo).endsWith('…')).toBe(true);
    expect(resumenCorto("Marcar 'Meditar' como hecho")).toBe("Marcar 'Meditar' como hecho");
  });
});

describe('primeraFrase', () => {
  it('se queda con la primera frase del mensaje del servidor', () => {
    expect(primeraFrase('Horario cambiado: 10:00 desde el viernes 2026-09-25. Le quedan 1 de 3 cambios.')).toBe(
      'Horario cambiado: 10:00 desde el viernes 2026-09-25'
    );
    expect(primeraFrase('Habito apagado el 2026-09-25.')).toBe('Habito apagado el 2026-09-25');
    expect(primeraFrase(null)).toBeNull();
  });
});
