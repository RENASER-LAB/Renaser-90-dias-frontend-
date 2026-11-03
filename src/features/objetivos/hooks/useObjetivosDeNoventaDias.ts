import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import * as objetivosApi from '../api/objetivosApi';
import { estaPorConfirmar } from '../utils/objetivosPorConfirmar';

/**
 * Lo único que Hoy necesita saber de los objetivos de 90 días (spec 026): cuántos tiene la persona y cuántos están «por
 * confirmar» (nacieron del diagnóstico y no los confirmó). Una lectura de `GET /rocks/master` cada vez que Hoy recupera el foco —
 * la persona los pudo escribir o confirmar en Plan—.
 *
 * - `cargando`: todavía no hay primera respuesta (la tarjeta de Hoy no se dibuja a medias).
 * - `listo`: se leyó; `total` y `porConfirmar` son lo que dijo el servidor.
 * - `error`: la primera lectura falló (sin red, servidor anterior…): Hoy no afirma nada de los objetivos. Una relectura que
 *   falla CONSERVA lo último que se leyó, igual que `useAccionesDeHoy`.
 */
export interface ObjetivosParaHoy {
  estado: 'cargando' | 'listo' | 'error';
  total: number;
  porConfirmar: number;
}

export function useObjetivosDeNoventaDias() {
  const [lectura, setLectura] = useState<ObjetivosParaHoy>({ estado: 'cargando', total: 0, porConfirmar: 0 });
  const consulta = useRef(0);

  const recargar = useCallback(async () => {
    const esta = ++consulta.current;
    try {
      const rocas = await objetivosApi.obtenerRocasMaestras();
      if (esta !== consulta.current) return;
      setLectura({ estado: 'listo', total: rocas.length, porConfirmar: rocas.filter(estaPorConfirmar).length });
    } catch {
      if (esta === consulta.current) setLectura(previa => (previa.estado === 'listo' ? previa : { estado: 'error', total: 0, porConfirmar: 0 }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  return { objetivos: lectura, recargar };
}
