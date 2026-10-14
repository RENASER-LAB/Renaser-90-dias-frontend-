import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useReleerFuncionalidades } from '../../plataforma/estado/contexto';
import { cerrarConsola, consolaAbierta } from '../estado/sesionDeConsola';
import { useConsolaSoporteTi } from '../hooks/useConsolaSoporteTi';
import { useRolesConsola } from '../hooks/useRolesConsola';
import { nombreDe } from '../utils/consola';
import { claveDelRol } from '../utils/roles';
import { AuditoriaConsolaScreen } from './AuditoriaConsolaScreen';
import { DesbloqueoConsolaScreen } from './DesbloqueoConsolaScreen';
import { DespliegueConsolaScreen } from './DespliegueConsolaScreen';
import { FuncionalidadConsolaScreen } from './FuncionalidadConsolaScreen';
import { FuncionalidadesConsolaScreen } from './FuncionalidadesConsolaScreen';
import { RolConsolaScreen } from './RolConsolaScreen';
import { RolesConsolaScreen } from './RolesConsolaScreen';
import { VerComoConsolaScreen } from './VerComoConsolaScreen';

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'detalle'; clave: string }
  | { tipo: 'auditoria'; clave: string | null }
  /** Fase 2: el despliegue progresivo de una funcionalidad (desde su detalle). */
  | { tipo: 'despliegue'; clave: string }
  /** Fase 2: los roles personalizados y uno de ellos (`id: null` = nuevo). */
  | { tipo: 'roles' }
  | { tipo: 'rol'; id: string | null }
  /** Fase 2: ver la app como otro rol, en solo lectura. */
  | { tipo: 'verComo' };

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
  const roles = useRolesConsola(abierta && (vista.tipo === 'roles' || vista.tipo === 'rol' || vista.tipo === 'verComo'), bloquear);

  useEffect(() => {
    if (!abierta) return;
    const reloj = setInterval(() => {
      if (!consolaAbierta()) bloquear();
    }, REVISAR_BLOQUEO_MS);
    return () => clearInterval(reloj);
  }, [abierta, bloquear]);

  const nombres = useMemo(() => new Map((estado.funcionalidades ?? []).map(f => [f.clave, nombreDe(f)])), [estado.funcionalidades]);
  /* Con los roles personalizados por su clave (`rp:<id>`), para el filtro de la auditoría de un rol. */
  const nombresConRoles = useMemo(
    () => new Map([...nombres, ...(roles.roles ?? []).map(r => [claveDelRol(r), `Rol «${r.nombre}»`] as [string, string])]),
    [nombres, roles.roles],
  );

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
    // Fase 2: la auditoría de un rol personalizado se filtra por su clave (`rp:<id>`) y vuelve al rol.
    const deUnRol = vista.clave?.startsWith('rp:') ? vista.clave.slice(3) : null;
    const volverA: Vista = deUnRol ? { tipo: 'rol', id: deUnRol } : vista.clave ? { tipo: 'detalle', clave: vista.clave } : { tipo: 'lista' };
    return <AuditoriaConsolaScreen clave={vista.clave} nombres={nombresConRoles} onBloqueada={bloquear} onVolver={() => setVista(volverA)} />;
  }

  if (vista.tipo === 'verComo') {
    return <VerComoConsolaScreen roles={roles.roles} onBloqueada={bloquear} onVolver={() => setVista({ tipo: 'lista' })} />;
  }

  if (vista.tipo === 'rol') {
    const rol = vista.id ? roles.roles?.find(r => r.id === vista.id) ?? null : null;
    if (!vista.id || rol) {
      return (
        <RolConsolaScreen
          key={vista.id ?? 'nuevo'}
          rol={rol}
          roles={roles.roles ?? []}
          catalogo={estado.funcionalidades ?? []}
          onGuardado={guardado => {
            roles.ponerRol(guardado);
            if (!vista.id) setVista({ tipo: 'rol', id: guardado.id });
          }}
          onBorrado={id => {
            roles.quitarRol(id);
            setVista({ tipo: 'roles' });
          }}
          onReleer={roles.recargar}
          onBloqueada={bloquear}
          onAuditoria={clave => setVista({ tipo: 'auditoria', clave })}
          onVolver={() => setVista({ tipo: 'roles' })}
        />
      );
    }
  }

  if (vista.tipo === 'roles' || vista.tipo === 'rol') {
    return (
      <RolesConsolaScreen
        roles={roles.roles}
        cargando={roles.cargando}
        fallo={roles.fallo}
        onRecargar={() => void roles.recargar()}
        onAbrir={id => setVista({ tipo: 'rol', id })}
        onNuevo={() => setVista({ tipo: 'rol', id: null })}
        onVolver={() => setVista({ tipo: 'lista' })}
      />
    );
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
      onRoles={() => setVista({ tipo: 'roles' })}
      onVerComo={() => setVista({ tipo: 'verComo' })}
      onSalir={onSalir}
    />
  );
}
