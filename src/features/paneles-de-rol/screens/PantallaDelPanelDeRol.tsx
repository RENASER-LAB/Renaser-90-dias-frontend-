import React from 'react';

import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { AprendicesDelLiderScreen } from '../../lider-mentores/screens/AprendicesDelLiderScreen';
import { HabitosDeTodosScreen } from '../../lider-mentores/screens/HabitosDeTodosScreen';
import { CumplimientoDelLiderScreen } from '../../lider-mentores/screens/CumplimientoDelLiderScreen';
import { LiderMentoresScreen } from '../../lider-mentores/screens/LiderMentoresScreen';
import { AlumnoScreen } from '../../mentor/screens/AlumnoScreen';
import { MiCelulaScreen } from '../../mentor/screens/MiCelulaScreen';
import { MisGruposScreen } from '../../mentor/screens/MisGruposScreen';
import { Alert } from '../../../components/Alerta';
import { BandejaTicketsScreen } from '../../tickets/screens/BandejaTicketsScreen';
import type { PanelesDeRol } from '../hooks/usePanelesDeRol';
import { vistaDeEntradaAlGrupo } from '../utils/vistasDeLosPaneles';
import { MisMentoresEnYo } from './MisMentoresEnYo';

/**
 * La pantalla del panel de rol que está abierto (2026-10-31). Yo la devuelve a pantalla completa, como la Caja y Administración,
 * mientras `paneles.abierto`. Cada vista es la pantalla de siempre; lo único nuevo es de dónde se llega (la lista de Yo) y que
 * «volver» sube un nivel por vez (`vistaDeRegreso`) hasta Yo.
 */
export function PantallaDelPanelDeRol({ paneles }: { paneles: PanelesDeRol }) {
  const { vista, celula, semaforoGrupos, esDisponible, volver, ir } = paneles;

  switch (vista.tipo) {
    case 'ninguna':
      return null;

    case 'misGrupos':
      return (
        <MisGruposScreen
          rotuloDeVolver="Yo"
          onSalir={volver}
          onAbrirGrupo={grupoId => {
            void celula.elegirGrupo(grupoId);
            ir({ tipo: 'miGrupo', enfocarSemaforo: false });
          }}
          vista={celula.vista}
          cargando={celula.cargando}
          fallo={celula.fallo}
          detalle={celula.detalle}
          recargar={celula.recargar}
        />
      );

    case 'miGrupo':
      return (
        <MiCelulaScreen
          rotuloDeVolver={(celula.vista?.grupos.length ?? 0) > 1 ? 'Mis grupos' : 'Mi grupo'}
          onSalir={volver}
          onAbrirAlumno={alumno => ir({ tipo: 'alumno', alumno })}
          vista={celula.vista}
          cargando={celula.cargando}
          fallo={celula.fallo}
          detalle={celula.detalle}
          recargar={celula.recargar}
        />
      );

    case 'alumno':
      return (
        <AlumnoScreen
          alumno={vista.alumno}
          grupoId={celula.vista?.celula.id ?? null}
          onVolver={volver}
          onYaNoAcompana={motivo => {
            /* El servidor dijo que ya no lo acompaña (FR-017, FR-028): se dice por qué y se vuelve a la lista, releída y sin datos viejos. */
            Alert.alert('Ya no acompañas a este aprendiz', motivo);
            celula.recargar();
            ir(vistaDeEntradaAlGrupo(celula.vista?.grupos.length ?? 0));
          }}
        />
      );

    case 'misMentores':
      return (
        <MisMentoresEnYo
          lectura={semaforoGrupos}
          verGrupos={esDisponible(CLAVES.semaforo)}
          verConsultas={esDisponible(CLAVES.tickets)}
          verMentores={esDisponible(CLAVES.lider)}
          verTodos={paneles.aprendicesDisponibles === true}
          verHabitos={paneles.habitosDisponibles === true}
          onVolver={volver}
          onAbrirGrupo={(grupo, inicio) =>
            ir({ tipo: 'cumplimiento', grupo: { grupoId: grupo.grupoId, nombre: grupo.grupoNombre?.trim() || 'Grupo sin nombre', inicio } })
          }
          onAbrirConsultas={() => ir({ tipo: 'consultas' })}
          onAbrirMentores={() => ir({ tipo: 'mentores' })}
          onAbrirTodos={() => ir({ tipo: 'todos' })}
          onAbrirHabitos={() => ir({ tipo: 'habitosDeTodos' })}
        />
      );

    case 'consultas':
      return <BandejaTicketsScreen onVolver={volver} />;

    case 'mentores':
      return <LiderMentoresScreen onSalir={volver} />;

    case 'todos':
      return <AprendicesDelLiderScreen onSalir={volver} />;

    case 'habitosDeTodos':
      return <HabitosDeTodosScreen grupos={semaforoGrupos.datos?.grupos ?? []} onSalir={volver} />;

    case 'cumplimiento':
      return <CumplimientoDelLiderScreen lectura={semaforoGrupos} grupoInicial={vista.grupo ?? undefined} onSalir={volver} />;
  }
}
