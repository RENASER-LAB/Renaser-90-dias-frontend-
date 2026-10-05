/**
 * Cómo se vuelve de cada vista de Yo, y la fecha de la firma del Pacto (rediseño del 2026-10-05).
 *
 * Contra el código anterior falla lo de «volver»: toda sub-vista volvía a Ajustes (`hub`), aunque se
 * hubiera abierto desde Yo («Mi ficha y Pacto», las miniaturas de evidencias).
 *
 * > **2026-10-05.** La fila «Mi ficha y Pacto» de Yo ya no existe (pedido del dueño): «Mi onboarding»
 * > se abre solo desde Ajustes. Lo que se sigue abriendo desde Yo son las miniaturas de evidencias.
 *
 * Las pruebas corren en `America/Lima` (jest.config.js): la firma de las 03:00 UTC del 29 cae el 28
 * en Lima, el caso que un reloj fijo a mediodía UTC escondería.
 */
import { describe, expect, it } from '@jest/globals';

import { fechaDeFirma, origenTrasCambio, TITULO_DE_VISTA, vistaDeRegreso, type OrigenDeYo, type VistaDeYo } from '../navegacionDeYo';

/** Recorre una secuencia de vistas como lo hace YoScreen y devuelve el origen al final. */
function recorrer(vistas: VistaDeYo[]): OrigenDeYo {
  let origen: OrigenDeYo = 'hub';
  for (let i = 1; i < vistas.length; i++) origen = origenTrasCambio(vistas[i - 1], origen);
  return origen;
}

describe('volver en Yo', () => {
  it('Yo es la raíz y Ajustes vuelve a Yo', () => {
    expect(vistaDeRegreso('main', 'hub')).toBeNull();
    expect(vistaDeRegreso('hub', 'hub')).toBe('main');
  });

  it('una sub-vista abierta desde Yo vuelve a Yo, y abierta desde Ajustes vuelve a Ajustes', () => {
    expect(vistaDeRegreso('evidencias', recorrer(['main', 'evidencias']))).toBe('main');
    expect(vistaDeRegreso('evidencias', recorrer(['main', 'hub', 'evidencias']))).toBe('hub');
    expect(vistaDeRegreso('onboarding', recorrer(['main', 'hub', 'onboarding']))).toBe('hub');
    expect(vistaDeRegreso('notificaciones', recorrer(['main', 'hub', 'notificaciones']))).toBe('hub');
  });

  it('el Pacto y el Mapa vuelven a la lista de etapas, y la lista no pierde de dónde se vino', () => {
    expect(vistaDeRegreso('pacto', 'hub')).toBe('onboarding');
    expect(vistaDeRegreso('mapa_renacimiento', 'hub')).toBe('onboarding');
    // Ajustes → Mi onboarding → el Pacto → la lista → el Mapa → la lista: «volver» lleva a Ajustes.
    const origen = recorrer(['main', 'hub', 'onboarding', 'pacto', 'onboarding', 'mapa_renacimiento', 'onboarding']);
    expect(vistaDeRegreso('onboarding', origen)).toBe('hub');
  });

  it('cada sub-vista tiene su título, en tipo oración', () => {
    for (const titulo of Object.values(TITULO_DE_VISTA)) {
      expect(titulo).not.toBe(titulo.toUpperCase());
      expect(titulo).not.toMatch(/VOLVER/i);
    }
    expect(TITULO_DE_VISTA.hub).toBe('Ajustes');
    expect(TITULO_DE_VISTA.memoria_renasia).toBe('Lo que SER recuerda');
  });
});

describe('la fecha de la firma del Pacto', () => {
  it('se dice en palabras, en la zona del teléfono', () => {
    expect(fechaDeFirma('2026-09-29T17:10:00Z')).toBe('29 de septiembre de 2026');
    // 03:00 UTC del 29 = 22:00 del 28 en Lima.
    expect(fechaDeFirma('2026-09-29T03:00:00Z')).toBe('28 de septiembre de 2026');
    expect(fechaDeFirma('2026-01-01T04:59:00Z')).toBe('31 de diciembre de 2025');
  });

  it('sin fecha, o con una que no se puede leer, no inventa un día', () => {
    expect(fechaDeFirma(null)).toBeNull();
    expect(fechaDeFirma(undefined)).toBeNull();
    expect(fechaDeFirma('')).toBeNull();
    expect(fechaDeFirma('no-es-fecha')).toBeNull();
  });
});
