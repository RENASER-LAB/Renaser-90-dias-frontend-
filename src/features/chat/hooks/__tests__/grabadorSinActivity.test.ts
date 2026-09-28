/**
 * E-424 (emulador, 28/09): «atrás» en la pantalla principal cierra la Activity de Android pero no el
 * JS, y al volver Comunidad quedaba en blanco con
 * `Call to function 'AudioRecorder.constructor' has been rejected. → Caused by: The current activity
 * is no longer available`. `useAudioRecorder` creaba el grabador nativo AL MONTAR la pantalla, y sin
 * Activity el constructor rechaza desde el render: se caía la pantalla entera.
 *
 * Acá el módulo nativo se comporta como sin Activity: tanto `useAudioRecorder` como el constructor
 * rechazan igual que en el teléfono. Contra el código anterior, montar el hook ya tira el error.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import type { WireMensaje } from '../../types/chat.types';

function mockSinActivity(): Error {
  return Object.assign(
    new Error("Call to function 'AudioRecorder.constructor' has been rejected.\n"
      + '→ Caused by: The current activity is no longer available'),
    { code: 'ERR_MISSING_ACTIVITY' },
  );
}

const mockGrabador = {
  uri: 'file:///cache/Audio/recording-2.m4a' as string | null,
  stop: jest.fn(async () => undefined),
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  getStatus: () => ({ isRecording: true, durationMillis: 3000 }),
  release: jest.fn(),
};
const mockConstructor = jest.fn<() => typeof mockGrabador>();
jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: async () => ({ granted: true }),
  setAudioModeAsync: async () => undefined,
  // El hook de expo-audio, tal como se porta sin Activity: rechaza en el render.
  useAudioRecorder: () => { throw mockSinActivity(); },
  useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0 }),
  AudioModule: { AudioRecorder: function AudioRecorder() { return mockConstructor(); } },
}));

const mockEnviarMensajeConMedia = jest.fn<(...a: unknown[]) => Promise<WireMensaje>>();
jest.mock('../../api/chatApi', () => ({
  almacenamientoSinConfigurar: () => false,
  solicitarUrlSubidaChat: async () => ({ uploadUrl: 'https://s3.example/firmada', bucket: 'renaser', ruta: 'chat/c-1/audios/y' }),
  subirMediaChatAS3: async () => undefined,
  enviarMensajeConMedia: (...a: unknown[]) => mockEnviarMensajeConMedia(...a),
}));
jest.mock('../../utils/capturarMediaChat', () => ({
  elegirFotoDeGaleriaChat: async () => null,
  tomarFotoConCamaraChat: async () => null,
  mimeDeAudioChat: () => 'audio/m4a',
}));
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

import { useEnvioMediaChat } from '../useEnvioMediaChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Hook = ReturnType<typeof useEnvioMediaChat>;

function montar(alEnviar: (m: WireMensaje) => void = () => undefined): { current: Hook } {
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

async function tocarMicrofono(hook: { current: Hook }) {
  await act(async () => {
    await hook.current.alternarGrabacion();
  });
}

beforeEach(() => {
  mockConstructor.mockReset();
  mockConstructor.mockImplementation(() => { throw mockSinActivity(); });
  mockEnviarMensajeConMedia.mockReset();
  mockAlerta.mockReset();
});

describe('Comunidad sin Activity (E-424)', () => {
  it('la pantalla se monta aunque el micrófono no se pueda crear, y no crea ningún grabador', () => {
    const hook = montar();

    expect(hook.current.grabando).toBe(false);
    expect(mockConstructor).not.toHaveBeenCalled();
  });

  it('si al tocar el micrófono el grabador no se puede crear, solo avisa el botón', async () => {
    const hook = montar();

    await tocarMicrofono(hook);

    expect(mockAlerta).toHaveBeenCalledWith('No se pudo usar el micrófono', 'Intenta de nuevo en un momento.');
    expect(hook.current.grabando).toBe(false);
  });

  it('con la Activity de vuelta, grabar y cortar manda la nota con un grabador nuevo, y lo suelta', async () => {
    mockConstructor.mockImplementation(() => mockGrabador);
    mockEnviarMensajeConMedia.mockImplementation(async () => ({ id: 'm-2', mediaUrl: null } as unknown as WireMensaje));
    const enviados: WireMensaje[] = [];
    const hook = montar(m => enviados.push(m));

    await tocarMicrofono(hook);
    expect(hook.current.grabando).toBe(true);
    await tocarMicrofono(hook);

    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockEnviarMensajeConMedia).toHaveBeenCalledWith('c-1', expect.objectContaining({ tipo: 'AUDIO', durationSeconds: 3 }));
    expect(enviados[0].mediaUrl).toBe('file:///cache/Audio/recording-2.m4a');
    expect(mockGrabador.release).toHaveBeenCalled();
    expect(hook.current.grabando).toBe(false);
  });
});
