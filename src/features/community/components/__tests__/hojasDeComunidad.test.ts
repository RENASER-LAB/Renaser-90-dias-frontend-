import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Image as ImagenRN, Modal, StyleSheet } from 'react-native';
import { Path } from 'react-native-svg';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Comunidad · tanda 2 (2026-10-05): las ventanas del Muro y del chat pasan a la hoja desde abajo de
 * la app (`HojaDesdeAbajo`), con los colores del tema, y la de publicar a una cabecera de sistema.
 *
 * Contra el código de antes estas pruebas fallan: la hoja de compartir era una caja con colores
 * fijos (`#1E1B18`, oscura también en el tema claro) dentro de un `Modal` con fundido que ponía
 * ComunidadScreen, el chat global llevaba el ícono `share` y cada destino un «Enviar ↗»; las
 * reacciones eran una ventana centrada «REACCIONES DEL POST»; los stickers, un `Modal` con
 * `animationType="slide"`; «PUBLICAR» se veía listo con el formulario vacío y no vibraba; el ranking
 * tenía tres botones hechos a mano; y los íconos `forward` e `imagePlus` no existían (el `switch`
 * caía en el chevron).
 */

let mockModo: 'light' | 'dark' = 'light';
const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({
      mode: mockModo,
      c: mockModo === 'dark' ? tokens.dark : tokens.light,
      t: tokens.type,
      space: tokens.space,
      toggle: () => undefined,
      setMode: () => undefined,
    }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
  };
});
jest.mock('../../../../utils/tacto', () => ({
  tacto: {
    seleccion: () => mockTacto.seleccion(),
    error: () => mockTacto.error(),
    logro: () => mockTacto.logro(),
  },
}));

import { light, dark } from '../../../../theme/tokens';
import { Icon } from '../../../../components/Icon';
import { SharePostSheet, type SharePostSheetProps } from '../SharePostSheet';
import { HojaDeReacciones } from '../HojaDeReacciones';
import { NuevaPublicacion, LADO_FOTO_NUEVA, type NuevaPublicacionProps } from '../NuevaPublicacion';
import { SelectorDeStickers } from '../../../chat/components/SelectorDeStickers';
import { AvatarDeChat } from '../../../chat/components/AvatarDeChat';
import { mapearReaccion } from '../../api/wallMappers';
import type { ChatConversation, ReactionUser } from '../../../../screens/ComunidadScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

function montar(elemento: React.ReactElement): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz!;
}

function tocable(r: ReactTestRenderer, etiqueta: string): ReactTestInstance {
  const [nodo] = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta);
  if (!nodo) throw new Error(`No hay nada tocable con la etiqueta «${etiqueta}»`);
  return nodo;
}

async function tocar(r: ReactTestRenderer, etiqueta: string) {
  const nodo = tocable(r, etiqueta);
  await act(async () => {
    nodo.props.onPress();
  });
}

const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => typeof n.type === 'string' && (typeof n.props.children === 'string' || Array.isArray(n.props.children)))
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string').join(''));

const hojaAbierta = (r: ReactTestRenderer) => r.root.findAll(n => n.props.testID === 'hoja-fondo').length > 0;

/** Todos los colores de fondo que se dibujan (de los nodos nativos, con los estilos aplanados). */
const fondos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => typeof n.type === 'string' && n.props.style !== undefined)
    .map(n => (StyleSheet.flatten(n.props.style) as { backgroundColor?: string } | undefined)?.backgroundColor)
    .filter((color): color is string => typeof color === 'string');

beforeEach(() => {
  mockModo = 'light';
  mockTacto.seleccion.mockReset();
  mockTacto.error.mockReset();
  mockTacto.logro.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

function conversacion(parcial: Partial<ChatConversation> & Pick<ChatConversation, 'id' | 'type' | 'title' | 'subtitle'>): ChatConversation {
  return {
    celulaId: null,
    avatar: '👤',
    lastMessage: '',
    lastTime: '',
    unreadCount: 0,
    messages: [],
    ...parcial,
  };
}

const CONVERSACIONES: ChatConversation[] = [
  conversacion({ id: 'g', type: 'global', title: 'Formación Renaser Global', subtitle: 'Comunidad completa RENASER' }),
  conversacion({ id: 'c', type: 'celula', title: 'Luisa y sus aprendices', subtitle: 'Chat de tu grupo', celulaId: 'cel-1' }),
  conversacion({ id: 'd', type: 'direct', title: 'Ana Pérez', subtitle: 'Aprendiz · 1 a 1', avatarUrl: 'https://s3/ana.jpg' }),
];

function compartir(props: Partial<SharePostSheetProps> = {}): React.ReactElement {
  return React.createElement(SharePostSheet, {
    post: { id: 'p1', author: 'Emu Aprendiz', text: 'Hoy cumplí mis km', media: [{ url: 'https://s3/foto.jpg' }] },
    conversations: CONVERSACIONES,
    tieneCelula: true,
    onClose: () => undefined,
    onShareExternal: () => undefined,
    onShareToConversation: () => undefined,
    ...props,
  });
}

describe('Compartir publicación, en una hoja desde abajo', () => {
  it('en el tema claro la hoja es clara (antes salía oscura, con #1E1B18 fijo)', () => {
    const r = montar(compartir());
    expect(hojaAbierta(r)).toBe(true);
    expect(fondos(r)).toContain(light.cardBg);
    expect(fondos(r)).not.toContain('#1E1B18');
  });

  it('en el tema oscuro toma los colores oscuros del tema', () => {
    mockModo = 'dark';
    const r = montar(compartir());
    expect(fondos(r)).toContain(dark.cardBg);
    expect(fondos(r)).not.toContain('#1E1B18');
  });

  it('cada destino lleva su avatar de chat y un botón de enviar; sin «Enviar ↗» ni mayúsculas espaciadas', () => {
    const r = montar(compartir());
    const avatares = r.root.findAllByType(AvatarDeChat).map(a => a.props.tipo);
    expect(avatares).toEqual(['global', 'celula', 'direct']);
    expect(textos(r)).toEqual(expect.arrayContaining(['Directos', 'Formación Renaser Global', 'Ana Pérez']));
    expect(textos(r).join(' ')).not.toMatch(/Enviar ↗|CHAT DIRECTO|COMPARTIR PUBLICACIÓN/);
    for (const nombre of ['Formación Renaser Global', 'Luisa y sus aprendices', 'Ana Pérez']) {
      expect(tocable(r, `Enviar a ${nombre}`)).toBeTruthy();
    }
  });

  it('el botón redondo manda a ESA conversación; tocar la fila no manda nada', async () => {
    const enviar = jest.fn<(conv: ChatConversation) => void>();
    const r = montar(compartir({ onShareToConversation: enviar }));
    // Ninguna fila es tocable por sí misma: lo único con onPress y nombre de persona es el botón.
    expect(r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Ana Pérez')).toHaveLength(0);
    await tocar(r, 'Enviar a Ana Pérez');
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0][0].id).toBe('d');
  });

  it('sin publicación no hay hoja, y la ✕ pide cerrarla', async () => {
    const cerrar = jest.fn();
    const r = montar(compartir({ post: null, onClose: cerrar }));
    expect(hojaAbierta(r)).toBe(false);
    act(() => r.update(compartir({ onClose: cerrar })));
    await tocar(r, 'Cerrar compartir');
    expect(cerrar).toHaveBeenCalledTimes(1);
  });
});

describe('Quién reaccionó, en una hoja desde abajo', () => {
  const personas: ReactionUser[] = [
    { id: 'u1', name: 'Ana Pérez', role: 'Aprendiz', avatar: '👤', avatarUrl: 'https://s3/ana.jpg', type: 'like' },
    { id: 'u2', name: 'Luis Rojas', role: 'Mentor', avatar: '👤', avatarUrl: null, type: 'like' },
  ];

  it('lista a cada persona con su foto o sus iniciales, sin «REACCIONES DEL POST»', () => {
    const r = montar(React.createElement(HojaDeReacciones, { visible: true, alCerrar: () => undefined, reacciones: personas, cargando: false, error: null }));
    expect(hojaAbierta(r)).toBe(true);
    expect(fondos(r)).toContain(light.cardBg);
    const todo = textos(r);
    expect(todo).toEqual(expect.arrayContaining(['Reacciones', '2 me gusta', 'Ana Pérez', 'Luis Rojas', 'LR']));
    expect(todo.join(' ')).not.toMatch(/REACCIONES DEL POST/);
    expect(r.root.findAllByType(ImagenRN).map(i => (i.props.source as { uri?: string }).uri)).toContain('https://s3/ana.jpg');
  });

  it('sin nadie, lo dice; y la ✕ pide cerrarla', async () => {
    const cerrar = jest.fn();
    const r = montar(React.createElement(HojaDeReacciones, { visible: true, alCerrar: cerrar, reacciones: [], cargando: false, error: null }));
    expect(textos(r)).toContain('Todavía nadie reaccionó a esta publicación.');
    await tocar(r, 'Cerrar reacciones');
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('la foto llega desde el servidor (el mapper ya no la descarta)', () => {
    const fila = mapearReaccion({ userId: 'u1', name: 'Ana', avatarUrl: 'https://s3/ana.jpg', role: 'TRAINEE', type: 'LIKE' });
    expect(fila.avatarUrl).toBe('https://s3/ana.jpg');
  });
});

describe('Stickers, en la hoja desde abajo', () => {
  it('ya no es un Modal con la animación «slide» del sistema: sube la hoja de la app, con el tema', () => {
    const r = montar(React.createElement(SelectorDeStickers, { visible: true, enviando: false, onCerrar: () => undefined, onElegir: () => undefined }));
    expect(hojaAbierta(r)).toBe(true);
    expect(r.root.findAllByType(Modal).map(m => m.props.animationType)).toEqual(['none']);
    expect(fondos(r)).toContain(light.cardBg);
  });

  it('tocar un sticker lo elige', async () => {
    const elegir = jest.fn();
    const r = montar(React.createElement(SelectorDeStickers, { visible: true, enviando: false, onCerrar: () => undefined, onElegir: elegir }));
    const [primero] = r.root.findAll(n => typeof n.props.onPress === 'function' && /^Enviar sticker: /.test(n.props.accessibilityLabel ?? ''));
    await act(async () => {
      primero.props.onPress();
    });
    expect(elegir).toHaveBeenCalledTimes(1);
  });
});

describe('Nueva publicación', () => {
  const FOTO = { uri: 'file:///foto-1.jpg', mimeType: 'image/jpeg', nombre: 'foto-1.jpg', width: 1440, height: 1080 };

  function nueva(props: Partial<NuevaPublicacionProps> = {}): React.ReactElement {
    return React.createElement(NuevaPublicacion, {
      visible: true,
      alCancelar: () => undefined,
      alPublicar: () => undefined,
      publicando: false,
      autor: { nombre: 'Emu Aprendiz', firma: 'Grupo Plan E2E · Día 15' },
      texto: '',
      alCambiarTexto: () => undefined,
      categorias: {
        lista: [{ key: 'REVELACIONES', label: 'Revelaciones', emoji: '✨', order: 1 }],
        cargando: false,
        error: null,
        recargar: () => undefined,
        elegida: null,
        alElegir: () => undefined,
      },
      fotos: { lista: [], agregando: false, alAgregar: () => undefined, alQuitar: () => undefined },
      ...props,
    });
  }

  it('la cabecera es la de una hoja de sistema: ✕, «Nueva publicación» y «Publicar», sin mayúsculas', () => {
    const r = montar(nueva());
    const todo = textos(r);
    expect(todo).toEqual(expect.arrayContaining(['Nueva publicación', 'Publicar', '✨ Revelaciones']));
    expect(todo.join(' ')).not.toMatch(/CANCELAR|PUBLICAR|NUEVA PUBLICACIÓN|FOTOS ADJUNTAS|REVELACIONES/);
    expect(tocable(r, 'Cancelar')).toBeTruthy();
  });

  it('«Publicar» se ve apagado sin foto; tocarlo vibra con el «no» y deja que la alerta diga qué falta', async () => {
    const publicar = jest.fn();
    const r = montar(nueva({ texto: 'Hoy corrí', alPublicar: publicar }));
    expect(tocable(r, 'Publicar').props.accessibilityState).toMatchObject({ disabled: true });
    await tocar(r, 'Publicar');
    expect(mockTacto.error).toHaveBeenCalledTimes(1);
    expect(mockTacto.logro).not.toHaveBeenCalled();
    expect(publicar).toHaveBeenCalledTimes(1);
  });

  it('con texto y una foto se puede publicar, y publicar vibra como logro', async () => {
    const publicar = jest.fn();
    const r = montar(nueva({ texto: 'Hoy corrí', alPublicar: publicar, fotos: { lista: [FOTO], agregando: false, alAgregar: () => undefined, alQuitar: () => undefined } }));
    expect(tocable(r, 'Publicar').props.accessibilityState).toMatchObject({ disabled: false });
    await tocar(r, 'Publicar');
    expect(mockTacto.logro).toHaveBeenCalledTimes(1);
    expect(mockTacto.error).not.toHaveBeenCalled();
    expect(publicar).toHaveBeenCalledTimes(1);
  });

  it('las fotos se ven en un mosaico de 88 y el recuadro para agregar lleva el ícono imagePlus', async () => {
    const quitar = jest.fn<(indice: number) => void>();
    const agregar = jest.fn();
    const r = montar(nueva({ fotos: { lista: [FOTO], agregando: false, alAgregar: agregar, alQuitar: quitar } }));
    expect(r.root.findAllByType(ImagenRN).map(i => (i.props.source as { uri?: string }).uri)).toContain(FOTO.uri);
    expect(r.root.findAllByType(Icon).map(i => i.props.name)).toContain('imagePlus');
    const recuadro = tocable(r, 'Agregar otra foto');
    const lados = r.root
      .findAll(n => typeof n.type === 'string' && n.props.style !== undefined)
      .map(n => StyleSheet.flatten(n.props.style) as { width?: number; height?: number })
      .filter(e => e.width === LADO_FOTO_NUEVA && e.height === LADO_FOTO_NUEVA);
    expect(lados.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      recuadro.props.onPress();
    });
    expect(agregar).toHaveBeenCalledTimes(1);
    await tocar(r, 'Quitar la foto 1');
    expect(quitar).toHaveBeenCalledWith(0);
  });
});

describe('los íconos nuevos', () => {
  const trazos = (nombre: 'forward' | 'imagePlus') => {
    const r = montar(React.createElement(Icon, { name: nombre, color: '#000' }));
    return r.root.findAllByType(Path).map(p => p.props.d as string);
  };

  it('forward es la flecha curva de reenviar (Lucide), no el chevron por defecto', () => {
    expect(trazos('forward')).toEqual(['m15 17 5-5-5-5', 'M4 18v-2a4 4 0 0 1 4-4h12']);
  });

  it('imagePlus es el marco de foto con el «+» (Lucide image-plus)', () => {
    expect(trazos('imagePlus')).toContain('M16 5h6M19 2v6');
  });
});

describe('dónde se usan', () => {
  const leer = (...partes: string[]) => fs.readFileSync(path.resolve(__dirname, ...partes), 'utf-8');

  it('compartir usa forward en la tarjeta del Muro y en el visor (antes share de 3 nodos y el emoji ↗️)', () => {
    const tarjeta = leer('..', 'TarjetaPublicacionMuro.tsx');
    const visor = leer('..', 'ImageViewerModal.tsx');
    expect(tarjeta).toMatch(/<Icon name="forward"/);
    expect(tarjeta).not.toMatch(/<Icon name="share"/);
    expect(visor).toMatch(/<Icon name="forward"/);
    expect(visor).not.toMatch(/>↗️</);
  });

  it('Comunidad monta las hojas nuevas y el ranking usa el control segmentado', () => {
    const comunidad = leer('..', '..', '..', '..', 'screens', 'ComunidadScreen.tsx');
    expect(comunidad).toMatch(/<NuevaPublicacion\b/);
    expect(comunidad).toMatch(/<HojaDeReacciones\b/);
    expect(comunidad).toMatch(/<SharePostSheet\s+post=\{shareSheetPost\}/);
    expect(comunidad).not.toMatch(/REACCIONES DEL POST|NUEVA PUBLICACIÓN|FOTOS ADJUNTAS/);
    expect(comunidad).toMatch(/<ControlSegmentado\s+opciones=\{TABLAS_DE_RANKING\.map/);
    expect(comunidad).not.toMatch(/onPress=\{\(\) => setTipoRanking\(tabla\.clave\)\}/);
  });
});
