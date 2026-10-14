import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useReleerFuncionalidades } from '../../plataforma/estado/contexto';
import { cerrarConsola, consolaAbierta } from '../estado/sesionDeConsola';
import { useConsolaSoporteTi } from '../hooks/useConsolaSoporteTi';
import { nombreDe } from '../utils/consola';
import { AuditoriaConsolaScreen } from './AuditoriaConsolaScreen';
import { DesbloqueoConsolaScreen } from './DesbloqueoConsolaScreen';
import { DespliegueConsolaScreen } from './DespliegueConsolaScreen';
import { FuncionalidadConsolaScreen } from './FuncionalidadConsolaScreen';
import { FuncionalidadesConsolaScreen } from './FuncionalidadesConsolaScreen';

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'detalle'; clave: string }
  | { tipo: 'auditoria'; clave: string | null }
  /** Fase 2: el despliegue progresivo de una funcionalidad (desde su detalle). */
  | { tipo: 'despliegue'; clave: string };

/** Cada cuánto se mira si la consola ya pasó sus 15 minutos sin uso (con la pantalla abierta). */
const REVISAR_BLOQUEO_MS = 30_000;

export const AVISO_DE_BLOQUEO = 'La consola se bloqueó por seguridad. Vuelve a escribir tu contraseña.';

/**
 * La consola Soporte TI (spec 002, US3), a pantalla completa desde Yo como Administración. Solo la ve una cuenta
 * `IT_SUPPORT` (la entrada se esconde a los demás; el servidor igual responde 403 a cualquier otro rol).
 *
 * Coordina: la puerta (contraseña, 15 min sin uso), la lista por área, el detalle de cada funcionalidad y la
 * auditoría. Un 423 en cualquier pedido vuelve a la puerta con el aviso. Al guardar un cambio se relee también el
 * estado de los interruptores de la propia sesión, para que la app de quien lo cambió lo vea en el acto.
 */
export function ConsolaSoporteTiScreen({ onSalir }: { onSalir: () => void }) {
  const [abierta, setAbierta] = useState(consolaAbierta);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const releerInterruptores = useReleerFuncionalidades();

  const bloquear = useCallback(() => {
    cerrarConsola();
    setAbierta(false);
    setAviso(AVISO_DE_BLOQUEO);
  }, []);
  const estado = useConsolaSoporteTi(abierta, bloquear);

  useEffect(() => {
    if (!abierta) return;
    const reloj = setInterval(() => {
      if (!consolaAbierta()) bloquear();
    }, REVISAR_BLOQUEO_MS);
    return () => clearInterval(reloj);
  }, [abierta, bloquear]);

  const nombres = useMemo(() => new Map((estado.funcionalidades ?? []).map(f => [f.clave, nombreDe(f)])), [estado.funcionalidades]);

  if (!abierta) {
    return (
      <DesbloqueoConsolaScreen
        aviso={aviso}
        onDesbloqueada={() => {
          setAviso(null);
          setAbierta(true);
        }}
        onSalir={onSalir}
      />
    );
  }

  if (vista.tipo === 'auditoria') {
    const volverA: Vista = vista.clave ? { tipo: 'detalle', clave: vista.clave } : { tipo: 'lista' };
    return <AuditoriaConsolaScreen clave={vista.clave} nombres={nombres} onBloqueada={bloquear} onVolver={() => setVista(volverA)} />;
  }

  if (vista.tipo === 'despliegue') {
    const funcionalidad = estado.funcionalidades?.find(f => f.clave === vista.clave);
    if (funcionalidad) {
      return (
        <DespliegueConsolaScreen
          key={funcionalidad.clave}
          funcionalidad={funcionalidad}
          onCambiado={resumen => {
            estado.cambiarDespliegueDeLaFila(funcionalidad.clave, resumen);
            void releerInterruptores();
          }}
          onBloqueada={bloquear}
          onVolver={() => setVista({ tipo: 'detalle', clave: funcionalidad.clave })}
        />
      );
    }
  }

  if (vista.tipo === 'detalle') {
    const funcionalidad = estado.funcionalidades?.find(f => f.clave === vista.clave);
    if (funcionalidad) {
      return (
        <FuncionalidadConsolaScreen
          key={funcionalidad.clave}
          funcionalidad={funcionalidad}
          todas={estado.funcionalidades ?? []}
          onGuardada={nueva => {
            estado.reemplazar(nueva);
            void releerInterruptores();
          }}
          onReleer={estado.recargar}
          onBloqueada={bloquear}
          onAuditoria={clave => setVista({ tipo: 'auditoria', clave })}
          onDespliegue={clave => setVista({ tipo: 'despliegue', clave })}
          onVolver={() => setVista({ tipo: 'lista' })}
        />
      );
    }
  }

  return (
    <FuncionalidadesConsolaScreen
      estado={estado}
      onAbrir={clave => setVista({ tipo: 'detalle', clave })}
      onAuditoria={() => setVista({ tipo: 'auditoria', clave: null })}
      onSalir={onSalir}
    />
  );
}
