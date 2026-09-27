import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import {
  alDesplazar,
  alLlegarMensajes,
  ESTADO_INICIAL,
  mensajesQueLlegaron,
  type EstadoDeLaBajada,
} from '../utils/bajadaDelChat';

/**
 * La conversación abierta y su final (2026-09-27): baja sola cuando corresponde y dice cuándo
 * mostrar «↓». Las reglas viven en `utils/bajadaDelChat.ts`; acá solo se las conecta con la lista.
 *
 * `conversacionId` en `null` cuando la lista no está a la vista (sin conversación, o con su info
 * abierta encima): al volver, la lista se monta de nuevo en el final y el estado arranca limpio.
 *
 * La lista es invertida, así que «ir al final» es ir al desplazamiento 0.
 */
export function useBajadaDelChat<M extends { id: string; isMe: boolean }>(
  conversacionId: string | null,
  mensajes: readonly M[]
) {
  // `FlatList<any>`: el tipo de cada fila lo decide la pantalla; acá solo se desplaza.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listaRef = useRef<FlatList<any>>(null);
  const [estado, setEstado] = useState<EstadoDeLaBajada>(ESTADO_INICIAL);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const visto = useRef<{ conversacionId: string | null; ultimoId: string | null }>({
    conversacionId: null,
    ultimoId: null,
  });

  const irAlFinal = useCallback(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  useEffect(() => {
    const ultimoId = mensajes.length > 0 ? mensajes[mensajes.length - 1].id : null;
    if (visto.current.conversacionId !== conversacionId) {
      visto.current = { conversacionId, ultimoId };
      setEstado(ESTADO_INICIAL);
      return;
    }
    const llegados = mensajesQueLlegaron(visto.current.ultimoId, mensajes);
    visto.current = { conversacionId, ultimoId: ultimoId ?? visto.current.ultimoId };
    const { estado: siguiente, bajar } = alLlegarMensajes(estadoRef.current, llegados);
    if (siguiente !== estadoRef.current) setEstado(siguiente);
    if (bajar) irAlFinal();
  }, [conversacionId, mensajes, irAlFinal]);

  const alDesplazarse = useCallback((evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = evento.nativeEvent.contentOffset.y;
    setEstado(previo => alDesplazar(previo, y));
  }, []);

  /** El botón «↓»: al final y sin pendientes. */
  const bajarAlFinal = useCallback(() => {
    irAlFinal();
    setEstado(ESTADO_INICIAL);
  }, [irAlFinal]);

  return { listaRef, estado, alDesplazarse, bajarAlFinal };
}
