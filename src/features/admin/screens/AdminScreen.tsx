import React, { useState } from 'react';

import type { InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import type { PersonaDeFicha } from '../types/admin.types';
import { CajaContenidoScreen } from '../../caja/screens/CajaContenidoScreen';
import { CajaDetalleScreen } from '../../caja/screens/CajaDetalleScreen';
import { CajaListaScreen } from '../../caja/screens/CajaListaScreen';
import { AdminInicioScreen } from './AdminInicioScreen';
import { BienvenidaAdminScreen } from './BienvenidaAdminScreen';
import { FichaAprendizScreen } from './FichaAprendizScreen';
import { GrupoDetalleScreen } from './GrupoDetalleScreen';
import { GrupoFormScreen } from './GrupoFormScreen';
import { GruposAdminScreen } from './GruposAdminScreen';
import { MasOpcionesScreen } from './MasOpcionesScreen';
import { PersonasAdminScreen } from './PersonasAdminScreen';
import { SemaforoAdminScreen } from './SemaforoAdminScreen';
import { SemaforoGrupoAdminScreen } from './SemaforoGrupoAdminScreen';
import { SolicitudesAdminScreen } from './SolicitudesAdminScreen';
import { StaffRolesScreen } from './StaffRolesScreen';

/**
 * Administración entera, como una pila de vistas dentro de Hoy.
 *
 * **No es un sexto tab ni un navegador nuevo.** Los cinco tabs no se tocan (AGENTS.md §1), y el
 * rol Mentor ya resolvió esto mismo así: sus pantallas son estado de `HoyScreen`. Repetir ese
 * patrón deja una sola forma de entrar y salir en toda la app.
 *
 * La pila se lleva en una variable y no con un router: son una decena de vistas con un solo
 * camino de ida y vuelta. Cada una registra su `useSystemBackHandler`, así que el gesto lateral sube un nivel —
 * ficha → personas → inicio → Mi programa— en vez de cerrar la app (AGENTS.md §6).
 */
type Vista =
  | { nombre: 'inicio' }
  | { nombre: 'grupos' }
  | { nombre: 'grupo'; grupoId: string }
  | { nombre: 'grupo-form'; grupoId: string | null }
  | { nombre: 'personas'; soloSinGrupo: boolean }
  | { nombre: 'ficha'; aprendiz: PersonaDeFicha }
  | { nombre: 'solicitudes' }
  | { nombre: 'semaforo' }
  | { nombre: 'semaforo-grupo'; grupoId: string; grupoNombre: string | null; inicio: InicioSemanal }
  | { nombre: 'staff' }
  | { nombre: 'bienvenida' }
  | { nombre: 'mas' }
  | { nombre: 'caja' }
  | { nombre: 'caja-detalle'; aprendizId: string }
  | { nombre: 'caja-contenido' };

/** Por dónde entra Administración: la raíz, el semáforo (aviso del sábado) o una caja (aviso de la Caja). */
export type EntradaDeAdmin = 'inicio' | 'semaforo' | { caja: string } | { ficha: PersonaDeFicha };

/** La pila con la que abre: la raíz siempre debajo, para que volver suba y no salga de golpe. */
export function pilaInicial(abrirEn: EntradaDeAdmin): Vista[] {
  if (abrirEn === 'semaforo') return [{ nombre: 'inicio' }, { nombre: 'semaforo' }];
  if (typeof abrirEn === 'object' && 'ficha' in abrirEn) {
    // D-222: desde la info de un chat, «Ver ficha» de un aprendiz (Admin/Alquimista).
    return [{ nombre: 'inicio' }, { nombre: 'ficha', aprendiz: abrirEn.ficha }];
  }
  if (typeof abrirEn === 'object') {
    return [{ nombre: 'inicio' }, { nombre: 'caja' }, { nombre: 'caja-detalle', aprendizId: abrirEn.caja }];
  }
  return [{ nombre: 'inicio' }];
}

/**
 * `abrirEn`: por dónde entra. El aviso del sábado (`/semaforo/grupos`) entra directo al semáforo,
 * con la raíz debajo: volver desde ahí sube a Administración, no sale de golpe a Mi programa. El de la
 * Caja Renaser (`/admin/caja/{aprendizId}`, D-219) entra a esa caja, con la lista y la raíz debajo.
 */
export function AdminScreen({ onSalir, abrirEn = 'inicio' }: { onSalir: () => void; abrirEn?: EntradaDeAdmin }) {
  const [pila, setPila] = useState<Vista[]>(() => pilaInicial(abrirEn));
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
      return (
        <FichaAprendizScreen
          aprendiz={vista.aprendiz}
          onVolver={volver}
          onAbrirCaja={aprendizId => entrar({ nombre: 'caja-detalle', aprendizId })}
        />
      );
    case 'caja':
      return (
        <CajaListaScreen
          onVolver={volver}
          onAbrirCaja={aprendizId => entrar({ nombre: 'caja-detalle', aprendizId })}
          onEditarContenido={() => entrar({ nombre: 'caja-contenido' })}
        />
      );
    case 'caja-detalle':
      return <CajaDetalleScreen key={vista.aprendizId} aprendizId={vista.aprendizId} onVolver={volver} />;
    case 'caja-contenido':
      return <CajaContenidoScreen onVolver={volver} />;
    case 'solicitudes':
      return (
        <SolicitudesAdminScreen onVolver={volver} onIrAGrupos={() => entrar({ nombre: 'grupos' })} />
      );
    case 'semaforo':
      return (
        <SemaforoAdminScreen
          onVolver={volver}
          onAbrirGrupo={(grupo, inicio) =>
            entrar({ nombre: 'semaforo-grupo', grupoId: grupo.grupoId, grupoNombre: grupo.grupoNombre, inicio })
          }
        />
      );
    case 'semaforo-grupo':
      return (
        <SemaforoGrupoAdminScreen
          grupoId={vista.grupoId}
          grupoNombre={vista.grupoNombre}
          inicio={vista.inicio}
          onVolver={volver}
          onAbrirAprendiz={aprendiz => entrar({ nombre: 'ficha', aprendiz })}
        />
      );
    case 'staff':
      return <StaffRolesScreen onVolver={volver} />;
    case 'bienvenida':
      return <BienvenidaAdminScreen onVolver={volver} />;
    case 'mas':
      return (
        <MasOpcionesScreen
          onVolver={volver}
          onAbrirStaff={() => entrar({ nombre: 'staff' })}
          onAbrirBienvenida={() => entrar({ nombre: 'bienvenida' })}
        />
      );
    default:
      return (
        <AdminInicioScreen
          onSalir={onSalir}
          onAbrirFicha={aprendiz => entrar({ nombre: 'ficha', aprendiz })}
          onAbrir={seccion => {
            if (seccion === 'grupos') entrar({ nombre: 'grupos' });
            else if (seccion === 'personas') entrar({ nombre: 'personas', soloSinGrupo: false });
            else if (seccion === 'solicitudes') entrar({ nombre: 'solicitudes' });
            else if (seccion === 'semaforo') entrar({ nombre: 'semaforo' });
            else if (seccion === 'mas') entrar({ nombre: 'mas' });
            else if (seccion === 'caja') entrar({ nombre: 'caja' });
          }}
        />
      );
  }
}
