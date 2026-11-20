import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * El aviso de «Aprendices en rojo» (spec 057 FR-033, FR-034, FR-035): la bandeja lo incluye y abrir la ficha lo marca leído; la app
 * registra la categoría `rojo-del-dia` con «Escribirle» y «Ver ficha»; y al tocar, «Escribirle» abre el 1 a 1 y todo lo demás abre la ficha.
 */
type Respuesta = {
  actionIdentifier?: string;
  notification: { date: number; request: { identifier: string; content: { title?: string; data: Record<string, unknown> | null } } };
};
type Oyente = (respuesta: Respuesta) => void;

const mockOyentes: Oyente[] = [];
const mockCategoria = jest.fn<(id: string, acciones: Array<{ identifier: string; buttonTitle: string; options?: { opensAppToForeground?: boolean } }>) => Promise<unknown>>(async () => null);
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn((oyente: Oyente) => {
    mockOyentes.push(oyente);
    return { remove: () => undefined };
  }),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: (id: string, acciones: never) => mockCategoria(id, acciones),
}));
jest.mock('../pushNativo', () => ({ HAY_PUSH_NATIVO: true }));
const mockAbrirChat = jest.fn<(id: string) => Promise<{ id: string }>>();
jest.mock('../../../chat/api/chatApi', () => ({ abrirConversacionDirecta: (id: string) => mockAbrirChat(id) }));
const mockIrAPestana = jest.fn<(p: string, params?: object) => boolean>().mockReturnValue(true);
jest.mock('../../../../navigation/navegacionRef', () => ({ irAPestana: (p: string, params?: object) => mockIrAPestana(p, params) }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { TEMAS, temasVisibles } from '../../../alarmas/api/preferenciasDeNotificacion';
import { obtenerAvisosDeAcompanamiento } from '../../api/avisosApi';
import { avisoVigenteDe, motivoCorto } from '../../utils/motivoDeLaFila';
import { ACCION_ESCRIBIR, ACCION_VER_FICHA, CATEGORIA_ROJO_DEL_DIA, nombreDelTituloDelAviso, queSePidioEnElAviso } from '../avisoDeRojo';
import { consumirRutaPendiente, escucharAperturaDeAviso, olvidarRutaPendiente } from '../rutaDeAviso';

const RUTA = '/mentor/groups/g-1/learners/u-ana';
let siguiente = 1;
const tocar = (actionIdentifier: string | undefined, data: Record<string, unknown> | null = { route: RUTA, grupoId: 'g-1', aprendizId: 'u-ana' }, title = 'Ana Quispe está en rojo hoy') => {
  for (const oyente of mockOyentes) {
    oyente({ actionIdentifier, notification: { date: 1, request: { identifier: `rojo-${siguiente++}`, content: { title, data } } } });
  }
};
const esperar = () => new Promise<void>(r => setTimeout(r, 0));

beforeEach(() => {
  mockOyentes.length = 0;
  mockCategoria.mockClear();
  mockAbrirChat.mockReset();
  mockIrAPestana.mockClear().mockReturnValue(true);
  mockApiFetch.mockReset();
  olvidarRutaPendiente();
});

describe('el interruptor y la bandeja', () => {
  it('«Aprendices en rojo» está en Yo → Notificaciones solo para quien acompaña, con su texto, y solo si el servidor lista el tipo', () => { // spec 057 FR-034
    const tema = TEMAS.find(t => t.clave === 'rojo-del-dia');
    expect(tema).toMatchObject({
      nombre: 'Aprendices en rojo',
      detalle: 'Te avisamos a las 19:00 si alguien de tu grupo cae a rojo ese día',
      tipos: ['ROJO_DEL_DIA'],
      soloParaQuienAcompana: true,
    });
    expect(temasVisibles({ ROJO_DEL_DIA: true }, { acompanaUnGrupo: true }).map(t => t.clave)).toEqual(['rojo-del-dia']);
    expect(temasVisibles({ ROJO_DEL_DIA: true }, { acompanaUnGrupo: false })).toEqual([]);
    expect(temasVisibles({ MENSAJE_CHAT: true }, { acompanaUnGrupo: true }).map(t => t.clave)).not.toContain('rojo-del-dia');
  });

  it('la bandeja del mentor incluye ROJO_DEL_DIA junto a ACOMPANAMIENTO_ALUMNO y deja fuera lo demás', async () => { // spec 057 FR-034
    const item = (id: number, type: string) => ({ id, type, title: 't', body: 'b', createdAt: '2026-11-20T00:00:00Z', readAt: null, route: RUTA });
    mockApiFetch.mockResolvedValue({ items: [item(1, 'ROJO_DEL_DIA'), item(2, 'ACOMPANAMIENTO_ALUMNO'), item(3, 'MENSAJE_CHAT')] });
    expect((await obtenerAvisosDeAcompanamiento()).map(a => a.id)).toEqual([1, 2]);
  });

  it('abrir la ficha del aprendiz lo reconoce como aviso vigente suyo (el que se marca leído) y la fila no repite la invitación del push', () => { // spec 057 FR-034
    const aviso = { id: 1, type: 'ROJO_DEL_DIA', title: 'Ana está en rojo hoy', body: 'Lleva 35 % de sus hábitos. Toca para ver su ficha y escribirle.', createdAt: '2026-11-20T00:00:00Z', readAt: null, route: RUTA };
    expect(avisoVigenteDe('u-ana', [aviso])?.id).toBe(1);
    expect(avisoVigenteDe('u-otro', [aviso])).toBeNull();
    expect(motivoCorto(aviso.body, 'Ana')).toBe('Lleva 35 % de sus hábitos');
  });
});

describe('los botones del aviso', () => {
  it('al escuchar avisos se registra la categoría `rojo-del-dia` con «Escribirle» y «Ver ficha», que abren la app', async () => { // spec 057 FR-035
    const dejar = escucharAperturaDeAviso();
    await esperar();
    expect(mockCategoria).toHaveBeenCalledTimes(1);
    const [id, acciones] = mockCategoria.mock.calls[0];
    expect(id).toBe(CATEGORIA_ROJO_DEL_DIA);
    expect(id).toBe('rojo-del-dia');
    expect(acciones.map(a => [a.identifier, a.buttonTitle])).toEqual([
      [ACCION_ESCRIBIR, 'Escribirle'],
      [ACCION_VER_FICHA, 'Ver ficha'],
    ]);
    expect(acciones.every(a => a.options?.opensAppToForeground === true)).toBe(true);
    dejar();
  });

  it('«Escribirle» abre la conversación 1 a 1 con ese aprendiz y lleva al chat, sin abrir la ficha', async () => { // spec 057 FR-035
    mockAbrirChat.mockResolvedValue({ id: 'conv-5' });
    const dejar = escucharAperturaDeAviso();
    tocar('escribir');
    await esperar();
    expect(mockAbrirChat).toHaveBeenCalledWith('u-ana');
    expect(mockIrAPestana).toHaveBeenCalledWith('Comunidad', { abrirChatConversacionId: 'conv-5', abrirChatTitulo: 'Ana Quispe' });
    expect(consumirRutaPendiente('alumno')).toBeNull();
    dejar();
  });

  it('sin `aprendizId` en los datos lo toma de la ruta de la ficha', async () => { // spec 057 FR-035
    mockAbrirChat.mockResolvedValue({ id: 'conv-6' });
    const dejar = escucharAperturaDeAviso();
    tocar('escribir', { route: RUTA });
    await esperar();
    expect(mockAbrirChat).toHaveBeenCalledWith('u-ana');
    dejar();
  });

  it('«Ver ficha» y tocar el cuerpo abren la ficha del aprendiz por la ruta, sin abrir el chat', () => { // spec 057 FR-035
    const dejar = escucharAperturaDeAviso();
    tocar('ver');
    expect(consumirRutaPendiente('alumno')).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-ana' });
    tocar('expo.modules.notifications.actions.DEFAULT');
    expect(consumirRutaPendiente('alumno')).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-ana' });
    tocar(undefined);
    expect(consumirRutaPendiente('alumno')).not.toBeNull();
    expect(mockAbrirChat).not.toHaveBeenCalled();
    dejar();
  });

  it('si el chat no se pudo abrir (sin sesión o sin red), el toque abre la ficha: nunca queda sin respuesta', async () => { // spec 057 FR-035
    mockAbrirChat.mockRejectedValue(new Error('sin red'));
    const dejar = escucharAperturaDeAviso();
    tocar('escribir');
    await esperar();
    expect(consumirRutaPendiente('alumno')).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-ana' });
    dejar();
  });

  it('«Escribirle» sin aprendiz que identificar abre la ficha por la ruta (o solo la app)', () => { // spec 057 FR-035
    const dejar = escucharAperturaDeAviso();
    tocar('escribir', { route: '/semaforo' });
    expect(mockAbrirChat).not.toHaveBeenCalled();
    expect(consumirRutaPendiente('semaforo')).toEqual({ tipo: 'semaforo' });
    dejar();
  });

  it('el chat abre con el nombre que trae el título del push; con otro título, sin nombre', () => { // spec 057 FR-035
    expect(nombreDelTituloDelAviso('Ana Quispe está en rojo hoy')).toBe('Ana Quispe');
    expect(nombreDelTituloDelAviso('Otro aviso')).toBeNull();
    expect(nombreDelTituloDelAviso(undefined)).toBeNull();
  });

  it('qué se pidió: solo «escribir» escribe; todo lo demás es la ficha', () => { // spec 057 FR-035
    expect(queSePidioEnElAviso('escribir')).toBe('escribir');
    for (const otro of ['ver', undefined, 'expo.modules.notifications.actions.DEFAULT', 'otra']) expect(queSePidioEnElAviso(otro)).toBe('ficha');
  });

  it('una app donde el registro de la categoría falla igual abre los avisos', async () => { // spec 057 FR-035
    mockCategoria.mockRejectedValueOnce(new Error('sin categorías'));
    const dejar = escucharAperturaDeAviso();
    await esperar();
    tocar('ver');
    expect(consumirRutaPendiente('alumno')).not.toBeNull();
    dejar();
  });
});
