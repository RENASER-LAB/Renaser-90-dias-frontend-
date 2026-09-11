import React, { useState } from 'react';

import type { AprendizAdminApi } from '../api/adminSchemas';
import { AdminInicioScreen } from './AdminInicioScreen';
import { FichaAprendizScreen } from './FichaAprendizScreen';
import { GrupoDetalleScreen } from './GrupoDetalleScreen';
import { GrupoFormScreen } from './GrupoFormScreen';
import { GruposAdminScreen } from './GruposAdminScreen';
import { MasOpcionesScreen } from './MasOpcionesScreen';
import { PersonasAdminScreen } from './PersonasAdminScreen';
import { SolicitudesAdminScreen } from './SolicitudesAdminScreen';
import { StaffRolesScreen } from './StaffRolesScreen';

/**
 * Administración entera, como una pila de vistas dentro de Hoy.
 *
 * **No es un sexto tab ni un navegador nuevo.** Los cinco tabs no se tocan (AGENTS.md §1), y el
 * rol Mentor ya resolvió esto mismo así: sus pantallas son estado de `HoyScreen`. Repetir ese
 * patrón deja una sola forma de entrar y salir en toda la app.
 *
 * La pila se lleva en una variable y no con un router: son ocho vistas con un solo camino de ida
 * y vuelta. Cada una registra su `useSystemBackHandler`, así que el gesto lateral sube un nivel —
 * ficha → personas → inicio → Mi programa— en vez de cerrar la app (AGENTS.md §6).
 */
type Vista =
  | { nombre: 'inicio' }
  | { nombre: 'grupos' }
  | { nombre: 'grupo'; grupoId: string }
  | { nombre: 'grupo-form'; grupoId: string | null }
  | { nombre: 'personas'; soloSinGrupo: boolean }
  | { nombre: 'ficha'; aprendiz: AprendizAdminApi }
  | { nombre: 'solicitudes' }
  | { nombre: 'staff' }
  | { nombre: 'mas' };

export function AdminScreen({ onSalir }: { onSalir: () => void }) {
  const [pila, setPila] = useState<Vista[]>([{ nombre: 'inicio' }]);
  const vista = pila[pila.length - 1];

  const entrar = (siguiente: Vista) => setPila(p => [...p, siguiente]);
  /* Volver desde la raíz sale a Mi programa. Sin este caso, el gesto en la primera pantalla no
     haría nada y el administrador quedaría encerrado en Administración. */
  const volver = () => setPila(p => (p.length > 1 ? p.slice(0, -1) : p));

  switch (vista.nombre) {
    case 'grupos':
      return (
        <GruposAdminScreen
          onVolver={volver}
          onAbrirGrupo={grupoId => entrar({ nombre: 'grupo', grupoId })}
          onCrear={() => entrar({ nombre: 'grupo-form', grupoId: null })}
        />
      );
    case 'grupo':
      return (
        <GrupoDetalleScreen
          grupoId={vista.grupoId}
          onVolver={volver}
          onEditar={grupoId => entrar({ nombre: 'grupo-form', grupoId })}
        />
      );
    case 'grupo-form':
      return (
        <GrupoFormScreen
          grupoId={vista.grupoId}
          onVolver={volver}
          onGuardado={grupoId => {
            /* Después de guardar se REEMPLAZA el formulario por el detalle en vez de apilarlo:
               si no, volver desde el detalle traería otra vez el formulario ya enviado. */
            setPila(p => [...p.slice(0, -1), { nombre: 'grupo', grupoId }]);
          }}
        />
      );
    case 'personas':
      return (
        <PersonasAdminScreen
          onVolver={volver}
          soloSinGrupoAlEntrar={vista.soloSinGrupo}
          onAbrirFicha={aprendiz => entrar({ nombre: 'ficha', aprendiz })}
        />
      );
    case 'ficha':
      return <FichaAprendizScreen aprendiz={vista.aprendiz} onVolver={volver} />;
    case 'solicitudes':
      return (
        <SolicitudesAdminScreen onVolver={volver} onIrAGrupos={() => entrar({ nombre: 'grupos' })} />
      );
    case 'staff':
      return <StaffRolesScreen onVolver={volver} />;
    case 'mas':
      return <MasOpcionesScreen onVolver={volver} onAbrirStaff={() => entrar({ nombre: 'staff' })} />;
    default:
      return (
        <AdminInicioScreen
          onSalir={onSalir}
          onAbrir={seccion => {
            if (seccion === 'grupos') entrar({ nombre: 'grupos' });
            else if (seccion === 'personas') entrar({ nombre: 'personas', soloSinGrupo: false });
            else if (seccion === 'solicitudes') entrar({ nombre: 'solicitudes' });
            else if (seccion === 'mas') entrar({ nombre: 'mas' });
          }}
        />
      );
  }
}
