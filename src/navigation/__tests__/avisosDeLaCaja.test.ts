import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { destinoDeRuta } from '../../features/mentor/api/avisosApi';
import { alAbrirAviso, anotarRutaDeAviso, consumirRutaPendiente, olvidarRutaPendiente } from '../../features/mentor/notificaciones/rutaDeAviso';
import { mantenerAperturaDeAvisos, type DependenciasDeApertura } from '../abrirAviso';
import {
  alCambiarLasCapasObligatorias,
  hayCapaObligatoriaAbierta,
  marcarCapaObligatoria,
  olvidarCapasObligatorias,
} from '../capasObligatorias';

/**
 * Caja Renaser (D-219, 2026-09-28): los avisos del servidor llevan `ruta_app` `/caja` (aprendiz) y
 * `/admin/caja/{aprendizId}` (Admin). Tocarlos abre Yo → «Tu Caja Renaser» o Administración en esa
 * caja, y esperan como los de hábitos (D-218) a que se cierre el Código Renaser o el Pacto.
 *
 * Contra el código anterior falla: `destinoDeRuta` no conocía esas rutas y el toque solo abría la app.
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

describe('las rutas de la Caja', () => {
  it('reconoce la del aprendiz y la del Admin', () => {
    expect(destinoDeRuta('/caja')).toEqual({ tipo: 'caja' });
    expect(destinoDeRuta('/caja/')).toEqual({ tipo: 'caja' });
    expect(destinoDeRuta('/admin/caja/a-1')).toEqual({ tipo: 'cajaAdmin', aprendizId: 'a-1' });
    expect(destinoDeRuta('/admin/caja/a%201')).toEqual({ tipo: 'cajaAdmin', aprendizId: 'a 1' });
  });

  it('no confunde otras rutas', () => {
    expect(destinoDeRuta('/cajas')).toBeNull();
    expect(destinoDeRuta('/admin/caja/')).toBeNull();
    expect(destinoDeRuta('/admin/caja/a-1/carta')).toBeNull();
    expect(destinoDeRuta('/admin/caja/%')).toBeNull();
  });
});

describe('tocar el aviso de la Caja', () => {
  it('el del aprendiz abre Yo con su caja', () => {
    const { irAPestana, soltar } = navegador();
    anotarRutaDeAviso('/caja');
    expect(irAPestana).toHaveBeenCalledWith('Yo', { abrirCaja: true });
    soltar();
  });

  it('el del Admin abre Hoy (donde vive Administración) con esa caja', () => {
    const { irAPestana, soltar } = navegador();
    anotarRutaDeAviso('/admin/caja/a-7');
    expect(irAPestana).toHaveBeenCalledWith('Hoy', { abrirCajaAprendizId: 'a-7' });
    soltar();
  });

  it('con el Código Renaser a la vista espera sin navegar, y al cerrarse abre', () => {
    const { irAPestana, soltar } = navegador();
    marcarCapaObligatoria('codigoRenaser', true);
    anotarRutaDeAviso('/caja');
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('codigoRenaser', false);
    expect(irAPestana).toHaveBeenCalledWith('Yo', { abrirCaja: true });
    soltar();
  });

  it('el del Admin también espera al Pacto', () => {
    const { irAPestana, soltar } = navegador();
    marcarCapaObligatoria('pacto', true);
    anotarRutaDeAviso('/admin/caja/a-7');
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('pacto', false);
    expect(irAPestana).toHaveBeenCalledTimes(1);
    soltar();
  });
});
