/**
 * Responder con una foto, un sticker o una nota de voz (D-251 del backend), y la papelera mientras se
 * graba (pedido del dueño, 2026-10-05: «cortar = enviar sí o sí»). Corre el hook entero con los mismos
 * dobles que `envioMediaConCopiaLocal.test.ts`.
 *
 * Contra el código anterior falla la de la cita (`replyToId` no viajaba con la media). La del
 * descarte cuida que tirar la nota no la mande: es el camino que ahora usa la papelera.
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

function montar(alEnviar: (m: WireMensaje) => void, respondiendoA: { id: string } | null = null): { current: Hook } {
  const hook = {} as { current: Hook };
  function Sonda() {
    hook.current = useEnvioMediaChat('c-1', alEnviar, respondiendoA);
    return null;
  }
  act(() => {
    TestRenderer.create(React.createElement(Sonda));
  });
  return hook;
}


beforeEach(() => {
  mockEnviarMensajeConMedia.mockReset();
  mockAlerta.mockReset();
  mockUrlSubida.mockClear();
  mockSubirMedia.mockReset().mockResolvedValue(undefined);
  mockGrabador.stop.mockClear();
});

describe('responder con media', () => {
  it('la foto, el sticker y la nota de voz llevan replyToId cuando hay cita', async () => {
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('IMAGE', null));
    const hook = montar(() => undefined, { id: 'm-citado' });

    await act(async () => {
      await hook.current.enviarFoto('galeria');
    });
    await act(async () => {
      await hook.current.enviarSticker({ id: 'muy-bien', nombre: '¡Muy bien!', imagen: 17 });
    });
    await act(async () => {
      await hook.current.alternarGrabacion();
    });
    await act(async () => {
      await hook.current.alternarGrabacion();
    });

    expect(mockEnviarMensajeConMedia).toHaveBeenCalledTimes(3);
    for (const [, params] of mockEnviarMensajeConMedia.mock.calls) {
      expect(params).toEqual(expect.objectContaining({ replyToId: 'm-citado' }));
    }
  });

  it('sin cita, replyToId no va', async () => {
    mockEnviarMensajeConMedia.mockResolvedValue(respuestaDelServidor('IMAGE', null));
    const hook = montar(() => undefined);

    await act(async () => {
      await hook.current.enviarFoto('galeria');
    });

    expect((mockEnviarMensajeConMedia.mock.calls[0][1] as { replyToId?: string }).replyToId).toBeUndefined();
  });
});

describe('la papelera mientras se graba', () => {
  it('descartar corta la grabación y no manda nada', async () => {
    const enviados: WireMensaje[] = [];
    const hook = montar(m => enviados.push(m), { id: 'm-citado' });

    await act(async () => {
      await hook.current.alternarGrabacion();
    });
    expect(hook.current.grabando).toBe(true);
    await act(async () => {
      await hook.current.cancelarGrabacion();
    });

    expect(hook.current.grabando).toBe(false);
    expect(mockGrabador.stop).toHaveBeenCalled();
    expect(mockUrlSubida).not.toHaveBeenCalled();
    expect(mockEnviarMensajeConMedia).not.toHaveBeenCalled();
    expect(enviados).toEqual([]);
    expect(mockAlerta).not.toHaveBeenCalled();
  });
});
