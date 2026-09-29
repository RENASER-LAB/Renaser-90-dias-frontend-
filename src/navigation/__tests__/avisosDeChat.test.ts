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
 * Aviso de un mensaje de chat (D-221, 2026-09-29): el push lleva `data.route` = `/chat/{id}`. Tocarlo
 * abre Comunidad en esa conversación (`abrirChatConversacionId`, el mismo parámetro de «Escribirle»),
 * y espera como los de hábitos (D-218) a que se cierre una capa obligatoria.
 *
 * Contra el código anterior falla: `destinoDeRuta` no conocía `/chat/…` y el toque solo abría la app.
 */

const PESTANAS = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];
const ID = '5b0f7a52-1c1e-4d0a-9f3e-3a8c2b1d0e11';

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

describe('la ruta del chat', () => {
  it('reconoce /chat/{id}, con o sin barra final', () => {
    expect(destinoDeRuta(`/chat/${ID}`)).toEqual({ tipo: 'chat', conversacionId: ID });
    expect(destinoDeRuta(`/chat/${ID}/`)).toEqual({ tipo: 'chat', conversacionId: ID });
  });

  it('no confunde otras rutas', () => {
    expect(destinoDeRuta('/chat/')).toBeNull();
    expect(destinoDeRuta('/chats/x')).toBeNull();
    expect(destinoDeRuta(`/chat/${ID}/mensajes`)).toBeNull();
    expect(destinoDeRuta('/chat/%')).toBeNull();
  });
});

describe('tocar el aviso de un mensaje', () => {
  it('abre Comunidad en esa conversación', () => {
    const { irAPestana, soltar } = navegador();
    anotarRutaDeAviso(`/chat/${ID}`);
    expect(irAPestana).toHaveBeenCalledWith('Comunidad', { abrirChatConversacionId: ID });
    soltar();
  });

  it('con el Pacto a la vista espera, y al cerrarse abre el chat', () => {
    const { irAPestana, soltar } = navegador();
    marcarCapaObligatoria('pacto', true);
    anotarRutaDeAviso(`/chat/${ID}`);
    expect(irAPestana).not.toHaveBeenCalled();
    marcarCapaObligatoria('pacto', false);
    expect(irAPestana).toHaveBeenCalledWith('Comunidad', { abrirChatConversacionId: ID });
    soltar();
  });
});
