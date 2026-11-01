import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { destinoDeRuta } from '../../features/mentor/api/avisosApi';
import { anotarRutaDeAviso, consumirRutaPendiente, olvidarRutaPendiente, alAbrirAviso } from '../../features/mentor/notificaciones/rutaDeAviso';
import { mantenerAperturaDeAvisos, pestanaDelDestino, TIPOS_QUE_ABREN_UNA_PESTANA, type DependenciasDeApertura } from '../abrirAviso';
import {
  alCambiarLasCapasObligatorias,
  hayCapaObligatoriaAbierta,
  marcarCapaObligatoria,
  olvidarCapasObligatorias,
} from '../capasObligatorias';

/**
 * «Tu análisis está listo» (spec 031): el aviso del teléfono lleva `route: '/plan/80-20?periodo=SEMANA|MES&inicio=…'`. Tocarlo abre Plan
 * con la hoja «Tu 80/20» en esa vista, y espera —como los avisos de hábitos y de la Caja— a que se cierre una capa obligatoria. La ruta
 * no autoriza nada: el servidor lee solo a quien pregunta.
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

describe('la ruta del análisis', () => {
  it('se reconoce con su periodo, con o sin barra final y con o sin `inicio`', () => {
    expect(destinoDeRuta('/plan/80-20?periodo=SEMANA&inicio=2026-10-26')).toEqual({ tipo: 'ochentaVeinte', periodo: 'SEMANA' });
    expect(destinoDeRuta('/plan/80-20?periodo=MES&inicio=2026-10-05')).toEqual({ tipo: 'ochentaVeinte', periodo: 'MES' });
    expect(destinoDeRuta('/plan/80-20/?periodo=MES')).toEqual({ tipo: 'ochentaVeinte', periodo: 'MES' });
  });

  it('sin periodo, o con uno que no se conoce, abre en la semana', () => {
    expect(destinoDeRuta('/plan/80-20')).toEqual({ tipo: 'ochentaVeinte', periodo: 'SEMANA' });
    expect(destinoDeRuta('/plan/80-20?periodo=AÑO')).toEqual({ tipo: 'ochentaVeinte', periodo: 'SEMANA' });
  });

  it('no se confunde con otras rutas', () => {
    expect(destinoDeRuta('/plan/80-20/x')).toBeNull();
    expect(destinoDeRuta('/plan')).toBeNull();
    expect(destinoDeRuta('/plan/80-200')).toBeNull();
  });

  it('abre la pestaña Plan con `abrirOchentaVeinte`', () => {
    expect(TIPOS_QUE_ABREN_UNA_PESTANA).toContain('ochentaVeinte');
    expect(pestanaDelDestino({ tipo: 'ochentaVeinte', periodo: 'MES' })).toEqual({ pestana: 'Plan', params: { abrirOchentaVeinte: 'MES' } });
  });
});

describe('tocar el aviso «Tu análisis está listo»', () => {
  it('abre Plan con la vista del periodo', () => {
    const { irAPestana, soltar } = navegador();
    anotarRutaDeAviso('/plan/80-20?periodo=MES&inicio=2026-10-05');
    expect(irAPestana).toHaveBeenCalledWith('Plan', { abrirOchentaVeinte: 'MES' });
    soltar();
  });

  it('con una capa obligatoria a la vista (el Código Renaser, el Pacto) espera sin navegar, y al cerrarse abre', () => {
    const { irAPestana, soltar } = navegador();
    marcarCapaObligatoria('pacto', true);
    anotarRutaDeAviso('/plan/80-20?periodo=SEMANA&inicio=2026-10-26');
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('pacto', false);
    expect(irAPestana).toHaveBeenCalledWith('Plan', { abrirOchentaVeinte: 'SEMANA' });
    soltar();
  });
});
