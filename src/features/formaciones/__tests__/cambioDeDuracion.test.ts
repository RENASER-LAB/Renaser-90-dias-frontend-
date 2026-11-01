import { describe, expect, it } from '@jest/globals';

import type { ResumenDeFormacion } from '../types/formaciones.types';
import { duracionesPosibles, errorDelCambioDeDuracion, textoDelCambioDeDuracion } from '../utils/borradorDeDuracion';
import { leerUltimoAjuste, textoDelUltimoAjuste } from '../../admin/utils/diaDelPrograma';

const DIPLOMADO: ResumenDeFormacion = {
  codigo: 'DIPLOMADO',
  nombre: 'Diplomado Renaser',
  descripcion: '',
  activa: true,
  duracionesDias: [90, 365],
  etiquetasDeDuracion: ['3 meses', '1 año'],
  version: 1,
};

describe('cambiar la duración de quien ya empezó (025-2 A)', () => {
  it('ofrece las duraciones de su formación menos la que ya tiene', () => {
    expect(duracionesPosibles(DIPLOMADO, 90)).toEqual([365]);
    expect(duracionesPosibles(DIPLOMADO, 365)).toEqual([90]);
    expect(duracionesPosibles({ ...DIPLOMADO, duracionesDias: [90] }, 90)).toEqual([]);
    expect(duracionesPosibles(undefined, 90)).toEqual([]);
  });

  it('pide la duración y un motivo de 3 a 280 letras', () => {
    expect(errorDelCambioDeDuracion(null, 'Pidió más tiempo')).toBe('Elige la nueva duración.');
    expect(errorDelCambioDeDuracion(365, '  ')).toBe('Escribe el motivo (al menos 3 letras).');
    expect(errorDelCambioDeDuracion(365, 'x'.repeat(281))).toBe('El motivo puede tener hasta 280 letras.');
    expect(errorDelCambioDeDuracion(365, 'Pidió más tiempo')).toBeNull();
  });

  it('la confirmación dice que conserva su día', () => {
    expect(textoDelCambioDeDuracion('Ana', 90, 365)).toContain('pasa de 3 meses a 1 año');
    expect(textoDelCambioDeDuracion('Ana', 90, 365)).toContain('Sigue en el mismo día');
  });

  it('el último ajuste de su ficha dice que cambió la duración, no que se movió el día', () => {
    const ajuste = leerUltimoAjuste({
      previousDay: 40, newDay: 40, adjustmentDays: 0, motivo: 'Pidió más tiempo', adjustedBy: 'u-1', adjustedAt: '2026-10-31T15:00:00Z',
      previousDuration: 90, newDuration: 365,
    });
    expect(ajuste?.duracionNueva).toBe(365);
    expect(textoDelUltimoAjuste(ajuste!, 'Luis')).toContain('su programa pasó de 3 meses a 1 año por Luis');
    const deDia = leerUltimoAjuste({ previousDay: 40, newDay: 34, motivo: null });
    expect(textoDelUltimoAjuste(deDia!, 'Luis')).toContain('del día 40 al 34');
  });
});
