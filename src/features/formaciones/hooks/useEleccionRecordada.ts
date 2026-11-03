import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** La llave de lo que recuerda este teléfono: que esta cuenta ya eligió en qué formación trabaja. */
export function llaveDeLaEleccion(cuenta: string): string {
  return `renaser.formacion.eligio.${cuenta}`;
}

/**
 * ¿Esta cuenta ya eligió su formación en este teléfono? Sirve para preguntarle UNA sola vez al entrar al personal con varias
 * formaciones (spec 022, historia 5): después el servidor recuerda la última que usó. Si el almacenamiento falla se dice que ya
 * eligió: es mejor no preguntar de más que dejar a alguien sin poder entrar.
 */
export function useEleccionRecordada(cuenta: string | null): { cargada: boolean; yaEligio: boolean; recordar: () => void } {
  const [estado, setEstado] = useState<{ cuenta: string | null; yaEligio: boolean } | null>(null);

  useEffect(() => {
    let vigente = true;
    if (!cuenta) {
      setEstado({ cuenta, yaEligio: true });
      return undefined;
    }
    setEstado(null);
    AsyncStorage.getItem(llaveDeLaEleccion(cuenta)).then(
      valor => vigente && setEstado({ cuenta, yaEligio: valor === '1' }),
      () => vigente && setEstado({ cuenta, yaEligio: true }),
    );
    return () => {
      vigente = false;
    };
  }, [cuenta]);

  const recordar = useCallback(() => {
    if (!cuenta) return;
    setEstado({ cuenta, yaEligio: true });
    AsyncStorage.setItem(llaveDeLaEleccion(cuenta), '1').catch(() => undefined);
  }, [cuenta]);

  return {
    /* Hasta leer lo guardado de ESTA cuenta no se decide nada (sin parpadeo de la pregunta). */
    cargada: estado !== null && estado.cuenta === cuenta,
    yaEligio: estado?.yaEligio ?? true,
    recordar,
  };
}
