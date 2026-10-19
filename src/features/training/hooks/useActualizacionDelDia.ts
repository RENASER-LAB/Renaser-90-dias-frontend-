import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { milisegundosDelDia, type ContextoDelDia } from '../../habits/api/diaDeHabitosApi';

type Opciones = {
  activa: boolean;
  contexto: ContextoDelDia | null | undefined;
  actualizar: (invalidar?: boolean) => Promise<void>;
};

/** El foco lo entrega la pantalla. Los timers y oyentes solo viven mientras Training está activo. */
export function useActualizacionDelDia({ activa, contexto, actualizar }: Opciones): void {
  const contextoRef = useRef(contexto);
  contextoRef.current = contexto;

  useEffect(() => {
    if (!activa) return;
    void actualizar(true);
  }, [activa, actualizar]);

  useEffect(() => {
    if (!activa) return;
    let enPrimerPlano = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    const visible = () => enPrimerPlano && (Platform.OS !== 'web' || document.visibilityState !== 'hidden');
    const alVolver = () => { if (visible()) void actualizar(true); };
    const suscripcion = AppState.addEventListener('change', estado => {
      const estabaActivo = enPrimerPlano;
      enPrimerPlano = estado === 'active';
      if (enPrimerPlano && !estabaActivo) alVolver();
    });
    // También recupera si el sistema suspendió un timer o no llegó un evento de actividad.
    const revision = setInterval(() => {
      if (!visible()) return;
      const dia = contextoRef.current;
      if (!dia || milisegundosDelDia(dia) <= 0) void actualizar(true);
    }, 60_000);
    if (Platform.OS === 'web') {
      window.addEventListener('focus', alVolver);
      document.addEventListener('visibilitychange', alVolver);
    }
    return () => {
      suscripcion.remove(); clearInterval(revision);
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', alVolver);
        document.removeEventListener('visibilitychange', alVolver);
      }
    };
  }, [activa, actualizar]);

  useEffect(() => {
    if (!activa || !contexto) return;
    const timer = setTimeout(() => { void actualizar(true); }, Math.max(0, milisegundosDelDia(contexto)));
    return () => clearTimeout(timer);
  }, [activa, contexto, actualizar]);
}
