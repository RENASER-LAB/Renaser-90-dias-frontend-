/**
 * E-402 (emulador, 28/09): «mandar audios falla». El audio llegaba bien al servidor, pero la respuesta
 * de `POST .../messages` viene sin `mediaUrl` (el servidor solo firma la lectura en el listado) y la
 * burbuja de quien lo mandó decía «Audio no disponible» apenas lo enviaba. Con la foto, lo mismo:
 * «📷 Imagen adjunta» en vez de la foto.
 *
 * La prueba corre el hook entero —grabar, cortar, los tres pasos— con la respuesta que da hoy el
 * servidor, y mira lo que le llega a la pantalla. Contra el código anterior falla: llegaba sin URL.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import type { WireMensaje } from '../../types/chat.types';

const mockGrabador = {
  uri: 'file:///cache/Audio/recording-1.m4a' as string | null,
  stop: jest.fn(async () => undefined),
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  getStatus: () => ({ isRecording: true, durationMillis: 5000 }),
  release: jest.fn(),
};
// El grabador se crea al tocar «grabar» (E-424), con el constructor del módulo nativo.
jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: async () => ({ granted: true }),
  setAudioModeAsync: async () => undefined,
  AudioModule: { AudioRecorder: function AudioRecorder() { return mockGrabador; } },
}));

function respuestaDelServidor(tipo: 'AUDIO' | 'IMAGE', mediaUrl: string | null): WireMensaje {
  return {
    id: 'm-1', conversationId: 'c-1', senderId: 'u-yo', senderName: null, senderAvatarUrl: null,
    type: tipo, text: null, mediaBucket: 'renaser', mediaPath: 'chat/c-1/audios/x', mediaMime: 'audio/m4a',
    mediaBytes: null, mediaDurationSeconds: tipo === 'AUDIO' ? 5 : null, mediaUrl, hidden: false,
    replyToId: null, replyTo: null, createdAt: '2026-09-28T15:43:22Z', status: null,
  } as unknown as WireMensaje;
}

const mockEnviarMensajeConMedia = jest.fn<(...a: unknown[]) => Promise<WireMensaje>>();
const mockSubirMedia = jest.fn(async (..._args: unknown[]) => undefined);
const mockUrlSubida = jest.fn(async (..._args: unknown[]) => ({ uploadUrl: 'https://s3.example/firmada', bucket: 'renaser', ruta: 'chat/c-1/audios/x' }));
const mockDescargarSticker = jest.fn(async () => ({ localUri: 'file:///cache/conectate.webp', uri: 'https://assets.example/conectate.webp' }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: () => ({ downloadAsync: () => mockDescargarSticker() }) } }));
jest.mock('../../api/chatApi', () => ({
  almacenamientoSinConfigurar: () => false,
  solicitarUrlSubidaChat: (...args: unknown[]) => mockUrlSubida(...args),
  subirMediaChatAS3: (...args: unknown[]) => mockSubirMedia(...args),
  enviarMensajeConMedia: (...a: unknown[]) => mockEnviarMensajeConMedia(...a),
}));
jest.mock('../../utils/capturarMediaChat', () => ({
  elegirFotoDeGaleriaChat: async () => ({ uri: 'file:///cache/ImagePicker/foto.jpg', mimeType: 'image/jpeg' }),
  tomarFotoConCamaraChat: async () => null,
  mimeDeAudioChat: () => 'audio/m4a',
}));
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

import { useEnvioMediaChat } from '../useEnvioMediaChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Hook = ReturnType<typeof useEnvioMediaChat>;

function montar(alEnviar: (m: WireMensaje) => void): { current: Hook } {
  const hook = {} as { current: Hook };
  function Sonda() {
    hook.current = useEnvioMediaChat('c-1', alEnviar);
    return null;
  }
  act(() => {
    TestRenderer.create(React.createElement(Sonda));
  });
  return hook;
}

/** Primer toque: empieza a grabar. Segundo toque: corta y manda (como en WhatsApp). */
async function grabarYCortar(hook: { current: Hook }) {
  await act(async () => {
    await hook.current.alternarGrabacion();
  });
  await act(async () => {
    await hook.current.alternarGrabacion();
  });
}

beforeEach(() => {
  mockEnviarMensajeConMedia.mockReset();
  mockAlerta.mockReset();
  mockUrlSubida.mockClear();
  mockSubirMedia.mockReset().mockResolvedValue(undefined);
  mockDescargarSticker.mockReset().mockResolvedValue({ localUri: 'file:///cache/conectate.webp', uri: 'https://assets.example/conectate.webp' });
});

describe('enviar un sticker real con el mismo contrato de imágenes', () => {
  const sticker = { id: 'conectate-sesion', nombre: 'Conéctate a tu sesión', imagen: 17 };

  it('sube el WebP original y deja una imagen que el destinatario puede leer del historial', async () => {
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('IMAGE', null));
    const enviados: WireMensaje[] = [];
    const hook = montar(m => enviados.push(m));
    let enviado = false;
    await act(async () => { enviado = await hook.current.enviarSticker(sticker); });

    expect(enviado).toBe(true);
    expect(mockUrlSubida).toHaveBeenCalledWith('c-1', 'image/webp');
    expect(mockSubirMedia).toHaveBeenCalledWith('https://s3.example/firmada', 'file:///cache/conectate.webp', 'image/webp');
    expect(mockEnviarMensajeConMedia).toHaveBeenCalledWith('c-1', expect.objectContaining({
      tipo: 'IMAGE', mime: 'image/webp', text: 'Sticker Renaser: Conéctate a tu sesión',
    }));
    expect(enviados[0].mediaUrl).toBe('file:///cache/conectate.webp');
  });

  it('dos toques seguidos crean un solo mensaje', async () => {
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('IMAGE', null));
    const hook = montar(() => undefined);
    await act(async () => {
      await Promise.all([hook.current.enviarSticker(sticker), hook.current.enviarSticker(sticker)]);
    });
    expect(mockEnviarMensajeConMedia).toHaveBeenCalledTimes(1);
  });

  it('si la subida falla no crea un mensaje vacío y permite reintentar', async () => {
    mockSubirMedia.mockRejectedValueOnce(new Error('Falló la subida'));
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('IMAGE', null));
    const hook = montar(() => undefined);
    await act(async () => { expect(await hook.current.enviarSticker(sticker)).toBe(false); });
    expect(mockEnviarMensajeConMedia).not.toHaveBeenCalled();
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo enviar', 'Falló la subida');
    await act(async () => { expect(await hook.current.enviarSticker(sticker)).toBe(true); });
    expect(mockEnviarMensajeConMedia).toHaveBeenCalledTimes(1);
  });
});

describe('lo que ve quien manda un audio o una foto', () => {
  it('la nota de voz recién enviada se puede escuchar: lleva la grabación del teléfono', async () => {
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('AUDIO', null));
    const enviados: WireMensaje[] = [];
    const hook = montar(m => enviados.push(m));

    await grabarYCortar(hook);

    expect(mockAlerta).not.toHaveBeenCalled();
    expect(enviados).toHaveLength(1);
    expect(enviados[0].mediaUrl).toBe('file:///cache/Audio/recording-1.m4a');
  });

  it('la foto recién enviada se ve: lleva la foto elegida', async () => {
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('IMAGE', null));
    const enviados: WireMensaje[] = [];
    const hook = montar(m => enviados.push(m));

    await act(async () => {
      await hook.current.enviarFoto('galeria');
    });

    expect(enviados[0].mediaUrl).toBe('file:///cache/ImagePicker/foto.jpg');
  });

  it('si el servidor sí manda la URL firmada, se usa la del servidor', async () => {
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('AUDIO', 'https://s3.example/leer'));
    const enviados: WireMensaje[] = [];
    const hook = montar(m => enviados.push(m));

    await grabarYCortar(hook);

    expect(enviados[0].mediaUrl).toBe('https://s3.example/leer');
  });
});
