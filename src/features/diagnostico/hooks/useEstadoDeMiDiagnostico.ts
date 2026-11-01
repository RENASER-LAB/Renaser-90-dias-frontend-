import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../auth/context/AuthContext';
import { obtenerEstadoDeMiDiagnostico } from '../api/diagnosticoApi';
import { escucharDiagnosticoTerminado } from '../events/avisoDiagnosticoTerminado';
import type { EstadoDeMiDiagnostico } from '../types/diagnostico.types';

/** Al volver a la app no se pregunta si la última lectura es de hace menos de esto (no se golpea al servidor por nada). */
const MS_ENTRE_LECTURAS = 60_000;

/**
 * Lo que se sabe del diagnóstico de la propia persona (`GET /api/v1/diagnostico/mio/estado`, spec 026), para que Hoy y Yo ofrezcan
 * «Completa tu diagnóstico» a quien ya estaba dentro y lo recibió (FR-026-9).
 *
 * - **Sin lectura no hay oferta**: un backend anterior (404), sin red o un cuerpo raro dejan `estado` en `null` y nadie ofrece
 *   nada. Mientras llega la primera lectura, `cargando` y `estado: null` (sin parpadeo: Hoy no dibuja nada).
 * - **Se relee** al cambiar de cuenta (sin dejar ver ni un render lo de la anterior), con `recargar()`, al volver la app al
 *   primer plano (con 60 s de por medio) y cuando la persona termina el diagnóstico (`avisarDiagnosticoTerminado`), para que la
 *   tarjeta se vaya en el acto.
 * - Una respuesta vieja nunca pisa a una más nueva.
 */
export function useEstadoDeMiDiagnostico(): { estado: EstadoDeMiDiagnostico | null; cargando: boolean; recargar: () => void } {
  const { user } = useAuth();
  const usuarioId = user?.id ?? null;
  const [lectura, setLectura] = useState<{ usuarioId: string | null; estado: EstadoDeMiDiagnostico | null; cargando: boolean }>({
    usuarioId,
    estado: null,
    cargando: usuarioId !== null,
  });
  const turno = useRef(0);
  const ultimaLectura = useRef(0);

  const leer = useCallback(() => {
    if (!usuarioId) return;
    const mio = ++turno.current;
    ultimaLectura.current = Date.now();
    obtenerEstadoDeMiDiagnostico().then(
      estado => {
        if (mio === turno.current) setLectura({ usuarioId, estado, cargando: false });
      },
      () => {
        if (mio === turno.current) setLectura(previa => ({ usuarioId, estado: previa.usuarioId === usuarioId ? previa.estado : null, cargando: false }));
      },
    );
  }, [usuarioId]);

  useEffect(() => {
    turno.current += 1;
    if (!usuarioId) {
      setLectura({ usuarioId: null, estado: null, cargando: false });
      return;
    }
    setLectura({ usuarioId, estado: null, cargando: true });
    leer();
  }, [usuarioId, leer]);

  useEffect(() => escucharDiagnosticoTerminado(leer), [leer]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active' && Date.now() - ultimaLectura.current >= MS_ENTRE_LECTURAS) leer();
    });
    return () => suscripcion.remove();
  }, [leer]);

  /* Entre el cambio de cuenta y la lectura nueva, lo de la cuenta anterior no se ve ni un render. */
  const delUsuario = lectura.usuarioId === usuarioId;
  return {
    estado: delUsuario ? lectura.estado : null,
    cargando: delUsuario ? lectura.cargando : usuarioId !== null,
    recargar: leer,
  };
}
