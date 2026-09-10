import { useCallback, useEffect, useState } from 'react';

import { activarProgramaPersonal, capacidadesDePrograma } from '../api/mentorApi';

const CLAVE_POSPUESTO = 'renaser.mentor.programa-personal.pospuesto.v1';

/**
 * El programa de 90 días propio de quien acompaña: opcional (D-07).
 *
 * `pospuesto` se guarda en el dispositivo y no en el servidor a propósito. "Ahora no" es una
 * preferencia de esta pantalla, no un hecho del programa; mandarlo al backend obligaría a
 * inventar un estado ("rechazó la invitación") que nadie más consume. Reinstalar la app vuelve
 * a mostrar la invitación, que es un costo aceptable frente a persistir un dato sin dueño.
 */
export function useProgramaPersonal(activo: boolean) {
  const [puedeActivar, setPuedeActivar] = useState(false);
  const [pospuesto, setPospuesto] = useState(true);
  const [activando, setActivando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!activo) return;
    const capacidades = await capacidadesDePrograma();
    setPuedeActivar(capacidades?.canStartProgram === true);
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      setPospuesto((await AsyncStorage.getItem(CLAVE_POSPUESTO)) === 'si');
    } catch {
      // Sin almacenamiento la invitación se muestra: mejor ofrecerla de más que esconderla.
      setPospuesto(false);
    }
  }, [activo]);

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

  /** No borra nada: solo deja de ofrecerlo en este dispositivo. */
  const posponer = useCallback(async () => {
    setPospuesto(true);
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(CLAVE_POSPUESTO, 'si');
    } catch {
      // Que no se pueda recordar la decisión no es motivo para molestar con un error.
    }
  }, []);

  return { visible: puedeActivar && !pospuesto, activando, error, activar, posponer };
}
