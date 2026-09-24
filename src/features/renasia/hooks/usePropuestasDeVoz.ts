import { useCallback, useState } from 'react';

import { cancelarPropuestaRenasia, confirmarPropuestaRenasia } from '../api/renasiaApi';
import type { PropuestaUI, RenasiaEventoPropuesta } from '../types/renasia.types';
import { cambioPorError, estadoTrasConfirmar, estadoVisible, propuestaDesdeEvento } from '../utils/propuestas';

export type PropuestasDeVoz = {
  propuestas: PropuestaUI[];
  agregar: (evento: RenasiaEventoPropuesta) => void;
  /** Saca las ya resueltas o vencidas. Las pendientes siguen a la vista aunque empiece otro turno. */
  podarResueltas: () => void;
  confirmar: (id: string) => Promise<void>;
  cancelar: (id: string) => Promise<void>;
};

/**
 * Las propuestas que el acompañante deja durante una conversación por voz, para confirmarlas con el
 * botón ahí mismo, sobre el orbe (D-163): la persona ve qué propuso el acompañante y qué pasó al
 * confirmar, sin tener que ir al chat. Es el mismo ciclo que en el chat (`useRenasiaChat`), sobre
 * una lista plana en vez de por mensaje. **La voz nunca confirma nada**: solo estos botones.
 */
export function usePropuestasDeVoz(): PropuestasDeVoz {
  const [propuestas, setPropuestas] = useState<PropuestaUI[]>([]);

  const cambiar = useCallback((id: string, cambio: Partial<PropuestaUI>) => {
    // Al dejar de estar pendiente se anota cuándo: la hoja de acción la muestra unos segundos y se va.
    const resuelta = cambio.estado && !['pendiente', 'confirmando', 'cancelando'].includes(cambio.estado);
    const conMarca = resuelta ? { ...cambio, resueltaEnMs: Date.now() } : cambio;
    setPropuestas(prev => prev.map(p => (p.id === id ? { ...p, ...conMarca } : p)));
  }, []);

  const agregar = useCallback((evento: RenasiaEventoPropuesta) => {
    setPropuestas(prev => (prev.some(p => p.id === evento.id) ? prev : [...prev, propuestaDesdeEvento(evento)]));
  }, []);

  const podarResueltas = useCallback(() => {
    setPropuestas(prev => prev.filter(p => estadoVisible(p, Date.now()) === 'pendiente'));
  }, []);

  const confirmar = useCallback(
    async (id: string) => {
      cambiar(id, { estado: 'confirmando', mensaje: null });
      try {
        const resultado = await confirmarPropuestaRenasia(id);
        cambiar(id, { estado: estadoTrasConfirmar(resultado), mensaje: resultado.mensaje });
      } catch (e) {
        cambiar(id, cambioPorError(e));
      }
    },
    [cambiar]
  );

  const cancelar = useCallback(
    async (id: string) => {
      cambiar(id, { estado: 'cancelando', mensaje: null });
      try {
        await cancelarPropuestaRenasia(id);
        cambiar(id, { estado: 'cancelada' });
      } catch (e) {
        cambiar(id, cambioPorError(e));
      }
    },
    [cambiar]
  );

  return { propuestas, agregar, podarResueltas, confirmar, cancelar };
}
