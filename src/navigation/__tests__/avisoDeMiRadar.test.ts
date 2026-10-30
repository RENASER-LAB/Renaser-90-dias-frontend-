import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { destinoDeRuta } from '../../features/mentor/api/avisosApi';
import { anotarRutaDeAviso, consumirRutaPendiente, olvidarRutaPendiente, alAbrirAviso } from '../../features/mentor/notificaciones/rutaDeAviso';
import { mantenerAperturaDeAvisos, type DependenciasDeApertura } from '../abrirAviso';
import {
  alCambiarLasCapasObligatorias,
  hayCapaObligatoriaAbierta,
  marcarCapaObligatoria,
  olvidarCapasObligatorias,
} from '../capasObligatorias';

/**
 * Mi Radar (spec 012): los avisos del teléfono de cada hora elegida y la invitación del día 8 llevan `route: '/mi-radar'`.
 * Tocarlos abre Yo con `abrirMiRadar`, y esperan —como la Caja— a que se cierre una capa obligatoria.
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

describe('la ruta de Mi Radar', () => {
  it('se reconoce, con o sin barra final', () => {
    expect(destinoDeRuta('/mi-radar')).toEqual({ tipo: 'miRadar' });
    expect(destinoDeRuta('/mi-radar/')).toEqual({ tipo: 'miRadar' });
  });

  it('no se confunde con otras', () => {
    expect(destinoDeRuta('/mi-radar/x')).toBeNull();
    expect(destinoDeRuta('/radar')).toBeNull();
    expect(destinoDeRuta('/mi-radares')).toBeNull();
  });
});

describe('tocar el aviso de Mi Radar', () => {
  it('abre Yo con `abrirMiRadar`', () => {
    const { irAPestana, soltar } = navegador();
    anotarRutaDeAviso('/mi-radar');
    expect(irAPestana).toHaveBeenCalledWith('Yo', { abrirMiRadar: true });
    soltar();
  });

  it('con una capa obligatoria a la vista espera sin navegar, y al cerrarse abre', () => {
    const { irAPestana, soltar } = navegador();
    marcarCapaObligatoria('pacto', true);
    anotarRutaDeAviso('/mi-radar');
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('pacto', false);
    expect(irAPestana).toHaveBeenCalledWith('Yo', { abrirMiRadar: true });
    soltar();
  });
});
