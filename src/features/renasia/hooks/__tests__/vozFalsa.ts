import { jest } from '@jest/globals';
import * as React from 'react';

/**
 * Un `expo-speech-recognition` de mentira para probar el dictado sin micrófono: el módulo nativo (con sus llamadas
 * espiables) y un bus de eventos que se comporta como el real —un evento le llega a TODOS los que lo escuchan—, más
 * `__emitir` para disparar `start`, `result`, `error` y `end` desde la prueba. Lo usan las pruebas del dictado del chat y
 * del Código Renaser (spec 030).
 *
 * Se pide dentro de `jest.mock('expo-speech-recognition', () => require('…/vozFalsa').crearVozFalsa())`.
 */
export function crearVozFalsa() {
  const bus = new Map<string, Set<(evento: Record<string, unknown>) => void>>();
  return {
    ExpoSpeechRecognitionModule: {
      isRecognitionAvailable: jest.fn(() => true),
      requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
    },
    useSpeechRecognitionEvent: (nombre: string, manejador: (evento: Record<string, unknown>) => void) => {
      const ultimo = React.useRef(manejador);
      ultimo.current = manejador;
      React.useEffect(() => {
        const propio = (e: Record<string, unknown>) => ultimo.current(e);
        if (!bus.has(nombre)) bus.set(nombre, new Set());
        bus.get(nombre)!.add(propio);
        return () => {
          bus.get(nombre)?.delete(propio);
        };
      }, [nombre]);
    },
    __emitir: (nombre: string, evento: Record<string, unknown> = {}) => bus.get(nombre)?.forEach(m => m(evento)),
  };
}
