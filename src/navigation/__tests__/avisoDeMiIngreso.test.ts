import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { destinoDeRuta } from '../../features/mentor/api/avisosApi';
import { anotarRutaDeAviso, consumirRutaPendiente, olvidarRutaPendiente, alAbrirAviso } from '../../features/mentor/notificaciones/rutaDeAviso';
import { RUTA_DEL_AVISO_DE_PAGO } from '../../features/pagos/notificaciones/alarmasDePagos';
import { mantenerAperturaDeAvisos, type DependenciasDeApertura } from '../abrirAviso';
import {
  alCambiarLasCapasObligatorias,
  hayCapaObligatoriaAbierta,
  marcarCapaObligatoria,
  olvidarCapasObligatorias,
} from '../capasObligatorias';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * Mi ingreso (spec 032): el recordatorio de pago que programa el teléfono lleva `route: '/mi-ingreso'`. Tocarlo abre Yo con `abrirMiIngreso` y, como la Caja
 * y Mi Radar, espera a que se cierre una capa obligatoria (nada tapa el Código Renaser ni el Pacto).
 */

const PESTANAS = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];

function navegador() {
  const irAPestana = jest.fn((_nombre: string, _params: Record<string, unknown>) => true);
  const deps: DependenciasDeApertura = {
    hayCapaObligatoriaAbierta,
    pestanaDisponible: nombre => PESTANAS.includes(nombre),
    consumir: tipo => consumirRutaPendiente(tipo),
    irAPestana,
  };
  const soltar = mantenerAperturaDeAvisos(deps, {
    alAbrirAviso: oyente => alAbrirAviso(() => oyente()),
    alCambiarLasCapas: alCambiarLasCapasObligatorias,
    alCambiarLaNavegacion: () => () => undefined,
  });
  return { irAPestana, soltar };
}

beforeEach(() => {
  olvidarRutaPendiente();
  olvidarCapasObligatorias();
});

describe('la ruta de Mi ingreso', () => {
  it('se reconoce, con o sin barra final, y es la misma que programa el teléfono', () => {
    expect(destinoDeRuta('/mi-ingreso')).toEqual({ tipo: 'miIngreso' });
    expect(destinoDeRuta('/mi-ingreso/')).toEqual({ tipo: 'miIngreso' });
    expect(destinoDeRuta(RUTA_DEL_AVISO_DE_PAGO)).toEqual({ tipo: 'miIngreso' });
  });

  it('no se confunde con otras', () => {
    expect(destinoDeRuta('/mi-ingreso/x')).toBeNull();
    expect(destinoDeRuta('/ingreso')).toBeNull();
    expect(destinoDeRuta('/mi-ingresos')).toBeNull();
    expect(destinoDeRuta('/mi-radar')).toEqual({ tipo: 'miRadar' });
  });
});

describe('tocar el aviso de un pago', () => {
  it('abre Yo con `abrirMiIngreso`', () => {
    const { irAPestana, soltar } = navegador();
    anotarRutaDeAviso('/mi-ingreso');
    expect(irAPestana).toHaveBeenCalledWith('Yo', { abrirMiIngreso: true });
    soltar();
  });

  it('con una capa obligatoria a la vista espera sin navegar, y al cerrarse abre', () => {
    const { irAPestana, soltar } = navegador();
    marcarCapaObligatoria('pacto', true);
    anotarRutaDeAviso('/mi-ingreso');
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('pacto', false);
    expect(irAPestana).toHaveBeenCalledWith('Yo', { abrirMiIngreso: true });
    soltar();
  });
});
