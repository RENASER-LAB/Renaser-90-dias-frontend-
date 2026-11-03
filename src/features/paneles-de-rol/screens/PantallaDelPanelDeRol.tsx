import React from 'react';

import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { AprendicesDelLiderScreen } from '../../lider-mentores/screens/AprendicesDelLiderScreen';
import { HabitosDeTodosScreen } from '../../lider-mentores/screens/HabitosDeTodosScreen';
import { CumplimientoDelLiderScreen } from '../../lider-mentores/screens/CumplimientoDelLiderScreen';
import { LiderMentoresScreen } from '../../lider-mentores/screens/LiderMentoresScreen';
import { AlumnoScreen } from '../../mentor/screens/AlumnoScreen';
import { MiCelulaScreen } from '../../mentor/screens/MiCelulaScreen';
import { BandejaTicketsScreen } from '../../tickets/screens/BandejaTicketsScreen';
import type { PanelesDeRol } from '../hooks/usePanelesDeRol';
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

    case 'miGrupo':
      return (
        <MiCelulaScreen
          rotuloDeVolver="Mi grupo"
          onSalir={volver}
          enfocarSemaforo={vista.enfocarSemaforo}
          onAbrirAlumno={alumno => ir({ tipo: 'alumno', alumno })}
          vista={celula.vista}
          cargando={celula.cargando}
          fallo={celula.fallo}
          detalle={celula.detalle}
          recargar={celula.recargar}
          onElegirGrupo={celula.elegirGrupo}
        />
      );

    case 'alumno':
      return <AlumnoScreen alumno={vista.alumno} grupoId={celula.vista?.celula.id ?? null} onVolver={volver} />;

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
