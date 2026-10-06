import React, { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useAuth } from '../../auth/context/AuthContext';
import { alCumplirUnHabito } from '../../habits/eventos/habitoCumplido';
import { tieneSemaforoPropio, useColorDelSemaforoVigente } from '../../semaforo/estado/useSemaforoVigente';
import { useEstadoDeSer } from '../estado/estadoDeSer';
import type { PhoenixMascotHandle } from '../rive/PhoenixMascot';
import type { PhoenixDirector } from '../rive/phoenixMaster';
import { animoDelBotonDeSer } from '../utils/animoDelFenix';
import { asentir } from '../utils/asentir';
import { planDelEstado, type EstadoDeSer } from '../utils/conversacionDeSer';
import { FenixVivo } from './FenixVivo';

/**
 * El fénix como cara de SER (2026-10-06, pedido del dueño: reemplaza al orbe del botón flotante y del panel).
 *
 * - **Ánimo**: el del semáforo propio (`semaforoVigente`); neutral para quien no se mide (staff).
 * - **Conversación**: refleja el estado del chat (`estadoDeSer`): escuchando, pensando, hablando, error. Al volver a
 *   reposo queda el ánimo del semáforo.
 * - **`lugar="boton"`**: asiente 700 ms cada vez que se cumple un hábito (`asentir`).
 * - **`lugar="panel"`**: saluda al abrirse el panel (`trgWelcome` vía `react('welcome')`).
 * - Con «reducir movimiento»: ni saludo ni asentir; de la conversación, solo la cara.
 */
export function FenixDeSer({
  size,
  lugar,
  etiqueta,
  style,
}: {
  size: number;
  lugar: 'boton' | 'panel';
  etiqueta: string;
  style?: StyleProp<ViewStyle>;
}) {
  const fenix = useRef<PhoenixMascotHandle>(null);
  const { user } = useAuth();
  const color = useColorDelSemaforoVigente();
  const animo = animoDelBotonDeSer(tieneSemaforoPropio(user?.role), color);
  const estado = useEstadoDeSer();
  const reducido = useReducedMotion();

  /* Saluda solo si el panel se abre en reposo: el fénix del encabezado aparece también con la primera pregunta, y
     ahí ya está pensando — un saludo encima sería un gesto sin motivo. */
  const enReposoAlMontar = useRef(estado === 'reposo').current;

  useEstadoReflejado(fenix, estado, reducido);
  useMomentoPropio(fenix, lugar === 'panel' && !enReposoAlMontar ? null : lugar, reducido);

  return (
    <FenixVivo
      ref={fenix}
      size={size}
      animo={animo}
      life={lugar === 'boton' ? 0.5 : 0.8}
      etiqueta={etiqueta}
      style={style}
      testID={`fenix-de-ser-${lugar}`}
    />
  );
}

function directorDe(fenix: React.RefObject<PhoenixMascotHandle | null>): PhoenixDirector | null {
  return fenix.current?.director() ?? null;
}

/** Aplica el plan del estado cada vez que cambia (no al montarse en reposo: no hay nada que deshacer). */
function useEstadoReflejado(fenix: React.RefObject<PhoenixMascotHandle | null>, estado: EstadoDeSer, reducido: boolean) {
  const anterior = useRef<EstadoDeSer>('reposo');
  useEffect(() => {
    if (estado === anterior.current) return;
    anterior.current = estado;
    const director = directorDe(fenix);
    if (!director) return;
    const plan = planDelEstado(estado, reducido);
    director.expression(plan.expresion);
    director.talk(plan.hablar);
    if (plan.disparo === 'think') director.trigger('think');
    if (plan.disparo === 'retry') void director.react('retry');
  }, [fenix, estado, reducido]);
}

function useMomentoPropio(fenix: React.RefObject<PhoenixMascotHandle | null>, lugar: 'boton' | 'panel' | null, reducido: boolean) {
  useEffect(() => {
    if (reducido || lugar === null) return;
    if (lugar === 'panel') {
      void fenix.current?.react('welcome');
      return;
    }
    return alCumplirUnHabito(() => {
      const director = directorDe(fenix);
      if (director) asentir(director);
    });
  }, [fenix, lugar, reducido]);
}
