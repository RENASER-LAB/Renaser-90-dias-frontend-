/**
 * Fase 1 de la spec 002: lo crítico se tapa en la interfaz con el aviso de mantenimiento cuando Soporte TI lo apaga
 * (SER, chat, muro, Training, eventos, cursos, ranking). Se montan los componentes chicos (la propuesta de SER, el
 * botón de SER del curso) con el proveedor de verdad; las pantallas grandes se revisan leyendo su código, como el
 * resto de las pruebas de pantallas de este proyecto.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { AccessibilityInfo, Alert as AlertNativo, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', isDark: false, c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children?: unknown }) => children ?? null }));
// El panel de SER y el fénix no hacen falta para saber qué muestra el botón del curso.
jest.mock('../../renasia/screens/RenasiaPanel', () => ({ RenasiaPanel: () => null }));
jest.mock('../../fenix/components/FenixDeSerQuieto', () => ({ FenixDeSerQuieto: () => null }));

import { ChatDelCurso } from '../../renasia/components/ChatDelCurso';
import { TarjetaPropuesta } from '../../renasia/components/TarjetaPropuesta';
import type { FuncionalidadApagada } from '../api/funcionalidadesApi';
import { crearAlmacenDeFuncionalidades } from '../estado/almacenDeFuncionalidades';
import { ProveedorDeFuncionalidades } from '../estado/FuncionalidadesProvider';
import { avisarSiEstaApagada } from '../utils/avisarSiEstaApagada';
import { claveDeLaConversacion, claveDeLaSeccionDeComunidad } from '../utils/clavesDeLaApp';
import { AVISO_GENERICO } from '../components/AvisoDeMantenimiento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

async function montarCon(apagadas: FuncionalidadApagada[], elemento: React.ReactElement) {
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  const almacen = crearAlmacenDeFuncionalidades({
    leer: async () => ({ tipo: 'nueva', version: 1, etag: null, apagadas }),
    recuperar: async () => null,
    guardar: async () => undefined,
  });
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(ProveedorDeFuncionalidades, { cuenta: 'u-1', almacen }, elemento));
  });
}

const textos = () => raiz!.root.findAll(n => n.type === Text).map(n => String(n.props.children));
const hayAviso = () => raiz!.root.findAll(n => n.props.testID === 'aviso-de-mantenimiento').length > 0;

describe('qué interruptor tapa cada lugar', () => {
  it('las secciones de Comunidad', () => {
    expect(claveDeLaSeccionDeComunidad('muro')).toBe('muro');
    expect(claveDeLaSeccionDeComunidad('eventos')).toBe('eventos');
    expect(claveDeLaSeccionDeComunidad('classroom')).toBe('cursos');
    expect(claveDeLaSeccionDeComunidad('tribu')).toBe('chat');
    expect(claveDeLaSeccionDeComunidad('ranking')).toBe('ranking');
    expect(claveDeLaSeccionDeComunidad('testimonios')).toBeNull();
  });

  it('cada conversación según su tipo; lo desconocido cae en el chat entero', () => {
    expect(claveDeLaConversacion('celula')).toBe('chat.grupos');
    expect(claveDeLaConversacion('global')).toBe('chat.global');
    expect(claveDeLaConversacion('soporte')).toBe('chat.soporte');
    expect(claveDeLaConversacion('direct')).toBe('chat.directos');
    expect(claveDeLaConversacion('otro')).toBe('chat');
    expect(claveDeLaConversacion(undefined)).toBe('chat');
  });
});

describe('SER', () => {
  const propuesta = { id: 'p-1', resumen: 'Marcar «Agua» como hecho', venceEn: '2999-01-01T00:00:00Z', estado: 'pendiente' as const };

  it('con las propuestas apagadas, el aviso en lugar de «Confirmar» y «Cancelar»', async () => {
    await montarCon(
      [{ clave: 'ia.propuestas', aviso: 'Las acciones de SER vuelven pronto.' }],
      React.createElement(TarjetaPropuesta, { propuesta, onConfirmar: jest.fn(), onCancelar: jest.fn() }),
    );
    expect(hayAviso()).toBe(true);
    expect(textos()).toContain('Las acciones de SER vuelven pronto.');
    expect(textos()).not.toContain('Confirmar');
  });

  it('con las propuestas prendidas, los botones de siempre', async () => {
    await montarCon([], React.createElement(TarjetaPropuesta, { propuesta, onConfirmar: jest.fn(), onCancelar: jest.fn() }));
    expect(hayAviso()).toBe(false);
    expect(textos()).toContain('Confirmar');
  });

  it('el botón del curso pasa a ser el aviso con el chat de SER apagado, y también con SER entera apagada', async () => {
    await montarCon([{ clave: 'ia.chat', aviso: null }], React.createElement(ChatDelCurso, { cursoTitulo: 'Respiración' }));
    expect(hayAviso()).toBe(true);
    expect(textos()).toContain(AVISO_GENERICO);
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Preguntarle a SER sobre este curso')).toHaveLength(0);
    act(() => raiz?.unmount());

    await montarCon([{ clave: 'ia', aviso: 'SER está en pausa.' }], React.createElement(ChatDelCurso, { cursoTitulo: 'Respiración' }));
    expect(textos()).toContain('SER está en pausa.');
    act(() => raiz?.unmount());

    await montarCon([], React.createElement(ChatDelCurso, { cursoTitulo: 'Respiración' }));
    expect(hayAviso()).toBe(false);
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Preguntarle a SER sobre este curso').length).toBeGreaterThan(0);
  });
});

describe('un botón que dispara algo apagado avisa antes', () => {
  it('prendida: no avisa y deja seguir; apagada: diálogo con el aviso (o el genérico)', () => {
    const alerta = jest.spyOn(AlertNativo, 'alert').mockImplementation(() => undefined);
    expect(avisarSiEstaApagada({ prendida: true, aviso: null })).toBe(false);
    expect(alerta).not.toHaveBeenCalled();
    expect(avisarSiEstaApagada({ prendida: false, aviso: 'Las notas de voz vuelven mañana.' })).toBe(true);
    expect(alerta.mock.calls.at(-1)?.slice(0, 2)).toEqual(['En mantenimiento', 'Las notas de voz vuelven mañana.']);
    avisarSiEstaApagada({ prendida: false, aviso: null });
    expect(alerta.mock.calls.at(-1)?.slice(0, 2)).toEqual(['En mantenimiento', AVISO_GENERICO]);
  });
});

describe('las pantallas grandes tapan con el aviso (código)', () => {
  const RAIZ = path.resolve(__dirname, '../../../..');
  const leer = (archivo: string) => fs.readFileSync(path.join(RAIZ, archivo), 'utf8');

  it('el panel de SER: aviso en lugar de la conversación y sin pedir el historial', () => {
    const panel = leer('src/features/renasia/screens/RenasiaPanel.tsx');
    expect(panel).toMatch(/const chatDeSer = useFuncionalidad\(CLAVES\.iaChat\);/);
    expect(panel).toMatch(/if \(visible && chatDeSer\.prendida\) \{\s*void cargarHistorialInicial\(\);/);
    expect(panel).toMatch(/\{chatDeSer\.prendida \? \(\s*<KeyboardAvoidingView/);
    expect(panel).toMatch(/<AvisoDeMantenimiento aviso=\{chatDeSer\.aviso\} \/>/);
  });

  it('el orbe de Hoy: quieto con SER apagada, y sin voz en vivo con «IA → voz» apagada', () => {
    expect(leer('src/features/renasia/components/OrbeAcompanante.tsx')).toMatch(/const apagado = deshabilitado \|\| !chatDeSer\.prendida;/);
    expect(leer('src/features/renasia/hooks/useVozDelOrbe.ts')).toMatch(/const usarEnVivo = enVivo\.disponible && !enPausa && vozDeSer\.prendida;/);
    const hoy = leer('src/screens/HoyScreen.tsx');
    expect(hoy).toMatch(/\{!chatDeSer\.prendida \? <AvisoDeMantenimiento aviso=\{chatDeSer\.aviso\} \/> : null\}/);
  });

  it('Comunidad: el Muro, «Publicar», las secciones, la lista de chats, la sala y sus adjuntos', () => {
    const comunidad = leer('src/screens/ComunidadScreen.tsx');
    expect(comunidad).toMatch(/useFuncionalidad\(claveDeLaSeccionDeComunidad\(seccionActiva\)\)/);
    expect(comunidad).toMatch(/\{seccionActiva === 'muro' && seccionEnMantenimiento && \(\s*<SeccionEnMantenimiento/);
    expect(comunidad).toMatch(/\{seccionActiva === 'muro' && !seccionEnMantenimiento && \(\s*<FlatList/);
    expect(comunidad).toMatch(/\{!publicarEnElMuro\.prendida \? <AvisoDeMantenimiento aviso=\{publicarEnElMuro\.aviso\} \/> : null\}/);
    expect(comunidad).toMatch(/\{seccionActiva === 'eventos' && !seccionEnMantenimiento && \(\s*<SeccionEventos/);
    expect(comunidad).toMatch(/\{seccionActiva === 'ranking' && !seccionEnMantenimiento && \(/);
    expect(comunidad).toMatch(/\{inExclusiveResources && seccionEnMantenimiento && \(/);
    expect(comunidad.match(/inExclusiveResources && !seccionEnMantenimiento &&/g)).toHaveLength(3);
    expect(comunidad).toMatch(/const chatDeLaSala = useFuncionalidad\(claveDeLaConversacion\(activeChat\?\.type\)\);/);
    expect(comunidad).toMatch(/<AvisoDeMantenimiento aviso=\{chatDeLaSala\.aviso\} \/>/);
    expect(comunidad).toMatch(/\{chatDeLaSala\.prendida && \(\s*<View style=\{\[styles\.chatInputBar/);
    expect(comunidad).toMatch(/avisarSiEstaApagada\(audioDelChat\) \|\| void alternarGrabacion\(\)/);
    expect(comunidad).toMatch(/if \(avisarSiEstaApagada\(fotosDelChat\)\) return; Keyboard\.dismiss\(\); setStickersVisible\(true\);/);
    for (const clave of ['muro', 'cursos', 'chat', 'ranking']) {
      expect(comunidad).toMatch(new RegExp(`useAlVolverAPrenderse\\(CLAVES\\.${clave}, `));
    }
  });

  it('Training: el aviso ocupa la pestaña con «Hábitos» apagado y relee al volver', () => {
    const training = leer('src/screens/TrainingScreen.tsx');
    expect(training).toMatch(/const habitosPrendidos = useFuncionalidad\(CLAVES\.habitos\);/);
    expect(training).toMatch(/if \(!habitosPrendidos\.prendida\) \{\s*return \(/);
    expect(training).toMatch(/useAlVolverAPrenderse\(CLAVES\.habitos, \(\) => void recargarEntrenamiento\(\)\);/);
  });
});
