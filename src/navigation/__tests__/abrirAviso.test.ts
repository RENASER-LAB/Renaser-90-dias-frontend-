import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { alAbrirAviso, anotarRutaDeAviso, consumirRutaPendiente, olvidarRutaPendiente } from '../../features/mentor/notificaciones/rutaDeAviso';
import { mantenerAperturaDeAvisos, type DependenciasDeApertura } from '../abrirAviso';
import {
  alCambiarLasCapasObligatorias,
  hayCapaObligatoriaAbierta,
  marcarCapaObligatoria,
  olvidarCapasObligatorias,
} from '../capasObligatorias';

/**
 * D-218 (2026-09-28): tocar el recordatorio de un hábito abre Training en su dimensión, y NO se cruza con
 * lo que la persona tiene que resolver en sus primeros siete días. Pedido del dueño: «que no tenga esta
 * función cruces motivos, ya que en los primeros 7 días aparecen preguntas a resolver…, lo que puede
 * ocasionar un bug».
 *
 * Se prueba la espera entera con las piezas reales (`rutaDeAviso`, `capasObligatorias`) y solo el
 * navegador de mentira: con la capa abierta no se navega y la ruta sigue esperando; al cerrarse, se va.
 *
 * Contra el código viejo falla: no había espera por capas (`AbridorDeEventos` navegaba apenas existía
 * la pestaña, aunque el Código Renaser tapara la app) y la ruta de un hábito no abría nada.
 */

const RUTA_JUGO_VERDE = '/habitos/h-jugo?dimension=BODY';

function navegador(pestanas: string[]) {
  const disponibles = new Set(pestanas);
  const oyentesDeNavegacion = new Set<() => void>();
  const irAPestana = jest.fn((_nombre: string, _params: Record<string, unknown>) => true);
  const deps: DependenciasDeApertura = {
    hayCapaObligatoriaAbierta,
    pestanaDisponible: nombre => disponibles.has(nombre),
    consumir: tipo => consumirRutaPendiente(tipo),
    irAPestana,
  };
  const soltar = mantenerAperturaDeAvisos(deps, {
    alAbrirAviso: oyente => alAbrirAviso(() => oyente()),
    alCambiarLasCapas: alCambiarLasCapasObligatorias,
    alCambiarLaNavegacion: oyente => {
      oyentesDeNavegacion.add(oyente);
      return () => oyentesDeNavegacion.delete(oyente);
    },
  });
  const aparecenLasPestanas = (nombres: string[]) => {
    nombres.forEach(n => disponibles.add(n));
    oyentesDeNavegacion.forEach(o => o());
  };
  return { irAPestana, soltar, aparecenLasPestanas };
}

beforeEach(() => {
  olvidarRutaPendiente();
  olvidarCapasObligatorias();
});

const PESTANAS = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];

describe('tocar el recordatorio de un hábito', () => {
  it('sin nada encima, abre Training en la dimensión del hábito', () => {
    const { irAPestana, soltar } = navegador(PESTANAS);
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    expect(irAPestana).toHaveBeenCalledWith('Training', { abrirHabitoId: 'h-jugo', abrirDimension: 'CUERPO' });
    soltar();
  });

  it('con la app cerrada (arranque en frío): la ruta llega antes que las pestañas y se abre al aparecer', () => {
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    const { irAPestana, aparecenLasPestanas, soltar } = navegador([]);
    expect(irAPestana).not.toHaveBeenCalled();
    aparecenLasPestanas(PESTANAS);
    expect(irAPestana).toHaveBeenCalledTimes(1);
    expect(irAPestana).toHaveBeenCalledWith('Training', { abrirHabitoId: 'h-jugo', abrirDimension: 'CUERPO' });
    soltar();
  });

  it('días 1-7 con el Código Renaser a la vista: espera sin navegar y, al registrarlo, lleva a Training', () => {
    const { irAPestana, soltar } = navegador(PESTANAS);
    marcarCapaObligatoria('codigoRenaser', true);
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    expect(irAPestana).not.toHaveBeenCalled();
    // Otra vuelta de navegación (la persona no puede salir del formulario, pero el estado puede cambiar)
    // tampoco la saltea.
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('codigoRenaser', false);
    expect(irAPestana).toHaveBeenCalledTimes(1);
    expect(irAPestana).toHaveBeenCalledWith('Training', { abrirHabitoId: 'h-jugo', abrirDimension: 'CUERPO' });
    soltar();
  });

  it('día 1 con el arranque guiado o el Pacto a la vista: espera a que se firme', () => {
    const { irAPestana, soltar } = navegador(PESTANAS);
    marcarCapaObligatoria('arranqueGuiado', true);
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('arranqueGuiado', false);
    expect(irAPestana).toHaveBeenCalledWith('Training', { abrirHabitoId: 'h-jugo', abrirDimension: 'CUERPO' });
    soltar();
  });

  it('día 7 con el Mapa de Renacimiento abierto (sin pestañas): espera, y al salir del Mapa lleva a Training', () => {
    const { irAPestana, aparecenLasPestanas, soltar } = navegador([]);
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    expect(irAPestana).not.toHaveBeenCalled();
    aparecenLasPestanas(PESTANAS);
    expect(irAPestana).toHaveBeenCalledWith('Training', { abrirHabitoId: 'h-jugo', abrirDimension: 'CUERPO' });
    soltar();
  });

  it('día 7 con el Mapa cerrado pero el Código Renaser encima: sigue esperando aunque haya pestañas', () => {
    const { irAPestana, aparecenLasPestanas, soltar } = navegador([]);
    marcarCapaObligatoria('codigoRenaser', true);
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    aparecenLasPestanas(PESTANAS);
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('codigoRenaser', false);
    expect(irAPestana).toHaveBeenCalledTimes(1);
    soltar();
  });

  it('se abre una sola vez: volver a Hoy después no reabre Training', () => {
    const { irAPestana, aparecenLasPestanas, soltar } = navegador(PESTANAS);
    anotarRutaDeAviso(RUTA_JUGO_VERDE);
    aparecenLasPestanas([]);
    marcarCapaObligatoria('codigoRenaser', true);
    marcarCapaObligatoria('codigoRenaser', false);
    expect(irAPestana).toHaveBeenCalledTimes(1);
    soltar();
  });
});

describe('las otras rutas que abren una pestaña', () => {
  it('la acción de un objetivo abre Plan → Objetivos en su eje', () => {
    const { irAPestana, soltar } = navegador(PESTANAS);
    anotarRutaDeAviso('/objetivos/2026-10-02?eje=TRABAJO');
    expect(irAPestana).toHaveBeenCalledWith('Plan', { abrirObjetivosFecha: '2026-10-02', abrirObjetivosEje: 'TRABAJO' });
    soltar();
  });

  it('el evento NO espera al Código Renaser: abre el evento directo (dueño, 28/09)', () => {
    const { irAPestana, soltar } = navegador(PESTANAS);
    marcarCapaObligatoria('codigoRenaser', true);
    anotarRutaDeAviso('/eventos/e-1');
    expect(irAPestana).toHaveBeenCalledWith('Comunidad', { abrirEventoId: 'e-1' });
    soltar();
  });

  it('la acción de un objetivo sí espera al Código Renaser', () => {
    const { irAPestana, soltar } = navegador(PESTANAS);
    marcarCapaObligatoria('codigoRenaser', true);
    anotarRutaDeAviso('/objetivos/2026-10-02?eje=TRABAJO');
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('codigoRenaser', false);
    expect(irAPestana).toHaveBeenCalledWith('Plan', { abrirObjetivosFecha: '2026-10-02', abrirObjetivosEje: 'TRABAJO' });
    soltar();
  });

  it('la ruta de un alumno la deja para la pantalla del mentor', () => {
    const { irAPestana, soltar } = navegador(PESTANAS);
    anotarRutaDeAviso('/mentor/groups/g/learners/a');
    expect(irAPestana).not.toHaveBeenCalled();
    expect(consumirRutaPendiente('alumno')).toEqual({ tipo: 'alumno', grupoId: 'g', alumnoId: 'a' });
    soltar();
  });
});

describe('las capas se anotan de verdad', () => {
  const fuente = (ruta: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    return fs.readFileSync(path.join(__dirname, '../..', ruta), 'utf8');
  };

  it('el Código Renaser y el arranque guiado (con el Pacto) se declaran capas obligatorias', () => {
    expect(fuente('features/radar/components/CodigoRenaserOverlay.tsx')).toContain("useCapaObligatoria('codigoRenaser', visible)");
    expect(fuente('features/sparkie/components/SparkieOverlay.tsx')).toMatch(
      /useCapaObligatoria\('arranqueGuiado', habilitado && \(tarjetaVisible \|\| pactoAbierto\)\)/,
    );
  });

  it('App.tsx monta el abridor de avisos', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');
    expect(fs.readFileSync(path.join(__dirname, '../../../App.tsx'), 'utf8')).toContain('<AbridorDeAvisos />');
  });
});
