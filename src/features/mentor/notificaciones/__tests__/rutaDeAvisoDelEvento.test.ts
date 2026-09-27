import { beforeEach, describe, expect, it } from '@jest/globals';

import { destinoDeRuta } from '../../api/avisosApi';
import { anotarRutaDeAviso, consumirRutaPendiente, olvidarRutaPendiente } from '../rutaDeAviso';

/**
 * El recordatorio de evento del servidor (`RECORDATORIO_EVENTO`, D-182) y la alarma local de «Voy»
 * llevan la ruta `/eventos/{id}`. Hasta el 26/09 la app no la conocía y el toque solo la abría.
 */
beforeEach(() => olvidarRutaPendiente());

describe('ruta de un evento', () => {
  it('se reconoce, con el id decodificado y la barra final tolerada', () => {
    expect(destinoDeRuta('/eventos/abc-123')).toEqual({ tipo: 'evento', eventoId: 'abc-123' });
    expect(destinoDeRuta('/eventos/a%20b/')).toEqual({ tipo: 'evento', eventoId: 'a b' });
  });

  it('una ruta de eventos mal formada no abre nada', () => {
    expect(destinoDeRuta('/eventos/')).toBeNull();
    expect(destinoDeRuta('/eventos/%')).toBeNull();
    expect(destinoDeRuta('/eventos/a/b')).toBeNull();
  });

  it('las pantallas del mentor y del semáforo no se la llevan: queda para Eventos', () => {
    expect(anotarRutaDeAviso('/eventos/e1')).toBe(true);
    expect(consumirRutaPendiente('alumno')).toBeNull();
    expect(consumirRutaPendiente('semaforo')).toBeNull();
    expect(consumirRutaPendiente('semaforoGrupos')).toBeNull();
    expect(consumirRutaPendiente('evento')).toEqual({ tipo: 'evento', eventoId: 'e1' });
  });
});
