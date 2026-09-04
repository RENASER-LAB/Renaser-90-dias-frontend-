import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as onboardingApi from '../../onboarding/api/onboardingApi';
import * as wallApi from '../../community/api/wallApi';
import { escucharPostPublicado } from '../events/avisoPrimerPost';

/**
 * En qué punto del arranque guiado está el aprendiz, apenas eligió su Día 1.
 *
 * Secuencia pedida por el dueño (2026-09-04): elegir Día 1 → el asistente saluda → lo guía a
 * publicar su primer post en el Muro → aparece el Pacto para firmar → la app queda libre.
 *
 * **Los tres estados salen del SERVIDOR, no del teléfono**, porque son hechos del participante:
 * alguien puede cerrar la app a mitad del arranque o cambiar de celular, y "ya publicó" / "ya
 * firmó" tienen que seguir siendo ciertos.
 *
 *  - "ya eligió su Día 1"  → `GET /onboarding/activate-program` (`activated`).
 *  - "ya publicó su primer post" → `GET /wall/mine` (`count > 0`).
 *  - "ya firmó el Pacto"   → `GET /onboarding/state` (`pactSignedAt`).
 *
 * NINGUNO de los tres necesitó una migración: las tres fuentes ya existían. El "ya saludé" no se
 * guarda en ningún lado a propósito — no es un hecho que haya que recordar, es simplemente lo que
 * se muestra mientras todavía no publicó. Si alguien cierra la app durante el saludo y vuelve, que
 * lo salude de nuevo es lo correcto, no un defecto.
 */
export type PasoArranque =
  /** Todavía no se sabe: no se dibuja nada. Nunca mostrar UI sobre una duda. */
  | { paso: 'CARGANDO' }
  /** No corresponde acompañar (no eligió su Día 1 todavía, o ya terminó todo el arranque). */
  | { paso: 'NINGUNO' }
  /** Saludo + guía para publicar el primer post. */
  | { paso: 'PUBLICAR_PRIMER_POST' }
  /** Ya publicó y todavía no firmó: toca el Pacto. */
  | { paso: 'FIRMAR_PACTO' };

/** Cada cuánto se vuelve a preguntar si ya publicó, mientras el paso es `PUBLICAR_PRIMER_POST`. */
const MS_ENTRE_SONDEOS = 8000;

export function useArranqueGuiado(habilitado: boolean) {
  const [estado, setEstado] = useState<PasoArranque>({ paso: 'CARGANDO' });

  /**
   * Se recuerda si el Pacto ya se dio por firmado en esta sesión para no volver a preguntarle al
   * backend en cada revisión: una vez firmado, el arranque terminó y no vuelve atrás.
   */
  const terminadoRef = useRef(false);

  const revisar = useCallback(async () => {
    if (!habilitado || terminadoRef.current) {
      setEstado({ paso: 'NINGUNO' });
      return;
    }
    try {
      // El Pacto firmado se pregunta PRIMERO y solo, aunque encadenar cueste un viaje de red más
      // en el caso guiado: quien ya lo firmó es la enorme mayoría y para siempre, y no hay por qué
      // cobrarle tres llamadas en cada arranque de la app para dibujar algo que nunca va a ver.
      const estadoOnboarding = await onboardingApi.obtenerEstado();
      if (estadoOnboarding.pactSignedAt) {
        terminadoRef.current = true;
        setEstado({ paso: 'NINGUNO' });
        return;
      }

      // Las dos que quedan sí van juntas: son independientes y quien está en el arranque está
      // mirando la pantalla.
      const [activacion, conteoPosts] = await Promise.all([
        onboardingApi.consultarActivacionPrograma(),
        wallApi.contarMisPublicaciones(),
      ]);

      // Sin Día 1 elegido no hay nada que acompañar: el aprendiz todavía está en el paso anterior
      // (`ActivarProgramaScreen`), y el saludo llegaría antes de tiempo.
      if (!activacion.activated) {
        setEstado({ paso: 'NINGUNO' });
        return;
      }

      setEstado({ paso: conteoPosts > 0 ? 'FIRMAR_PACTO' : 'PUBLICAR_PRIMER_POST' });
    } catch (error) {
      // Acompañar es decoración: si no se pudo averiguar en qué punto está, la app se usa como
      // siempre. Nunca bloquear ni tapar la pantalla por no saber (mismo criterio que
      // `useArranqueDelPrograma`).
      console.warn('No se pudo resolver el arranque guiado:', error);
      setEstado({ paso: 'NINGUNO' });
    }
  }, [habilitado]);

  useEffect(() => {
    revisar();
  }, [revisar]);

  // El aviso instantáneo desde `ComunidadScreen`: publicar y ver aparecer el Pacto tiene que ser
  // un solo gesto, no "publicar y esperar al próximo sondeo".
  useEffect(() => {
    if (!habilitado) return;
    return escucharPostPublicado(() => {
      void revisar();
    });
  }, [habilitado, revisar]);

  // Red de seguridad del aviso de arriba: cubre publicar desde otro dispositivo, o que la app se
  // haya reabierto justo después de publicar. Solo mientras se está esperando ese post — ni antes
  // ni después se gasta una llamada de red.
  useEffect(() => {
    if (!habilitado || estado.paso !== 'PUBLICAR_PRIMER_POST') return;
    const intervalo = setInterval(() => {
      void revisar();
    }, MS_ENTRE_SONDEOS);
    return () => clearInterval(intervalo);
  }, [habilitado, estado.paso, revisar]);

  // Volver de segundo plano es el otro momento en que el estado pudo cambiar por fuera de la app.
  useEffect(() => {
    if (!habilitado) return;
    const suscripcion = AppState.addEventListener('change', siguiente => {
      if (siguiente === 'active') void revisar();
    });
    return () => suscripcion.remove();
  }, [habilitado, revisar]);

  /** La firma del Pacto ya quedó guardada: se cierra el arranque sin esperar otra vuelta de red. */
  const marcarPactoFirmado = useCallback(() => {
    terminadoRef.current = true;
    setEstado({ paso: 'NINGUNO' });
  }, []);

  return { estado, revisar, marcarPactoFirmado };
}
