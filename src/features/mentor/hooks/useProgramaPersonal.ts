import { useCallback, useEffect, useState } from 'react';

import { activarProgramaPersonal, capacidadesDePrograma } from '../api/mentorApi';

const PREFIJO_POSPUESTO = 'renaser.programa-personal.pospuesto.v2';

/**
 * "Ahora no" se guarda POR CUENTA, no por dispositivo.
 *
 * La versión anterior usaba una clave única (`…pospuesto.v1`). En un teléfono donde entran dos
 * personas —o donde alguien cambia de cuenta— el "ahora no" de la primera le escondía la
 * invitación a la segunda, que nunca la había visto. La clave lleva el id de usuario y `v2` deja
 * la vieja huérfana a propósito: recuperar esa preferencia obligaría a adivinar de quién era.
 */
function clavePospuesto(usuarioId: string): string {
  return `${PREFIJO_POSPUESTO}.${usuarioId}`;
}

/**
 * El programa de 90 días propio: opcional para todo el que no sea aprendiz (D-07).
 *
 * `activo` ya NO es "es mentor". Lo decide una capacidad del servidor —`canStartProgram`—, que es
 * verdadera también para ADMIN y ALQUIMISTA. Atarlo a `useEsMentor` dejaba a esos dos roles sin
 * poder empezar su programa aunque el backend se lo permitiera desde el principio: el bloqueo
 * estaba en el teléfono, no en el permiso (SDD 003, ARF-16).
 *
 * `pospuesto` se guarda en el dispositivo y no en el servidor a propósito. "Ahora no" es una
 * preferencia de esta pantalla, no un hecho del programa; mandarlo al backend obligaría a inventar
 * un estado ("rechazó la invitación") que nadie más consume.
 */
export function useProgramaPersonal(activo: boolean, usuarioId?: string | null) {
  const [puedeActivar, setPuedeActivar] = useState(false);
  const [pospuesto, setPospuesto] = useState(true);
  const [activando, setActivando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!activo) return;
    const capacidades = await capacidadesDePrograma();
    setPuedeActivar(capacidades?.canStartProgram === true);
    if (!usuarioId) {
      // Sin saber de quién es la sesión no se puede leer una preferencia por cuenta. Se ofrece:
      // mostrar de más es reversible con un toque; esconder de más no se nota nunca.
      setPospuesto(false);
      return;
    }
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      setPospuesto((await AsyncStorage.getItem(clavePospuesto(usuarioId))) === 'si');
    } catch {
      // Sin almacenamiento la invitación se muestra: mejor ofrecerla de más que esconderla.
      setPospuesto(false);
    }
  }, [activo, usuarioId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const activar = useCallback(async () => {
    setActivando(true);
    setError(null);
    try {
      await activarProgramaPersonal();
      setPuedeActivar(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar tu programa.');
      return false;
    } finally {
      setActivando(false);
    }
  }, []);

  /** No borra nada: solo deja de ofrecerlo a ESTA cuenta en este dispositivo. */
  const posponer = useCallback(async () => {
    setPospuesto(true);
    if (!usuarioId) return;
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(clavePospuesto(usuarioId), 'si');
    } catch {
      // Que no se pueda recordar la decisión no es motivo para molestar con un error.
    }
  }, [usuarioId]);

  return { visible: puedeActivar && !pospuesto, activando, error, activar, posponer };
}
