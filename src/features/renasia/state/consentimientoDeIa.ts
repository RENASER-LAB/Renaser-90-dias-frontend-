import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { guardarConsentimientoDeIa, leerConsentimientoDeIa } from '../utils/almacenDelConsentimientoDeIa';

/**
 * Estado en memoria del consentimiento de IA (spec 060). La verdad está en el teléfono
 * (`utils/consentimientoDeIa.ts`); esto la lee una vez por cuenta y avisa a las pantallas.
 *
 * `pendienteDeVoz` es la conversación por voz que esperó el consentimiento: al aceptar, sigue sola.
 */
type Estado = { porCuenta: Record<string, 'leyendo' | 'si' | 'no'>; pedidoDeVoz: (() => void) | null };

let estado: Estado = { porCuenta: {}, pedidoDeVoz: null };
const oyentes = new Set<() => void>();

function cambiar(siguiente: Estado): void {
  estado = siguiente;
  oyentes.forEach(oyente => oyente());
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

const instantanea = () => estado;

function asegurarLectura(userId: string): void {
  if (estado.porCuenta[userId]) return;
  cambiar({ ...estado, porCuenta: { ...estado.porCuenta, [userId]: 'leyendo' } });
  void leerConsentimientoDeIa(userId).then(si => {
    cambiar({ ...estado, porCuenta: { ...estado.porCuenta, [userId]: si ? 'si' : 'no' } });
  });
}

/**
 * Guarda la aceptación del aviso de IA de esta cuenta, en memoria y en el teléfono. La usa también la casilla del
 * onboarding (`FichaInicialScreen`, spec 060 FR-031): su texto ya nombra a Google y los datos, así que quien la
 * marca no vuelve a ver el aviso al abrir el chat.
 */
export function registrarAceptacionDeIa(userId: string): void {
  cambiar({ ...estado, porCuenta: { ...estado.porCuenta, [userId]: 'si' } });
  void guardarConsentimientoDeIa(userId);
}

/** Solo para las pruebas. */
export function reiniciarConsentimientoDeIa(): void {
  cambiar({ porCuenta: {}, pedidoDeVoz: null });
}

export function useConsentimientoDeIa(): {
  /** Ya se leyó lo guardado: antes de eso no se sabe y no se envía nada. */
  listo: boolean;
  aceptado: boolean;
  aceptar: () => void;
  /** Hay una conversación por voz esperando que la persona acepte. */
  vozEsperando: boolean;
  /** La persona dijo «Ahora no» al aviso de la voz. */
  descartarVoz: () => void;
  /** Pide el consentimiento para la voz; si ya está aceptado, sigue de inmediato. */
  pedirParaVoz: (seguir: () => void) => void;
} {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const actual = useSyncExternalStore(suscribir, instantanea, instantanea);
  useEffect(() => {
    if (userId) asegurarLectura(userId);
  }, [userId]);

  const valor = userId ? actual.porCuenta[userId] : undefined;
  const aceptado = valor === 'si';

  const aceptar = useCallback(() => {
    if (!userId) return;
    const seguir = estado.pedidoDeVoz;
    cambiar({ porCuenta: { ...estado.porCuenta, [userId]: 'si' }, pedidoDeVoz: null });
    void guardarConsentimientoDeIa(userId);
    seguir?.();
  }, [userId]);

  const descartarVoz = useCallback(() => cambiar({ ...estado, pedidoDeVoz: null }), []);

  const pedirParaVoz = useCallback(
    (seguir: () => void) => {
      if (userId && estado.porCuenta[userId] === 'si') {
        seguir();
        return;
      }
      cambiar({ ...estado, pedidoDeVoz: seguir });
    },
    [userId],
  );

  return {
    listo: valor === 'si' || valor === 'no',
    aceptado,
    aceptar,
    vozEsperando: actual.pedidoDeVoz !== null,
    descartarVoz,
    pedirParaVoz,
  };
}
