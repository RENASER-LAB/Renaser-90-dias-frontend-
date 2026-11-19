import React, { useEffect, useRef, useState } from 'react';

import type { GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import type { EntradasDelLider } from '../utils/misMentores';
import { PILA_INICIAL, abrir, alCambiarElMentorDelGrupo, alCrearUnGrupo, rotuloDeVolver, volver, type VistaDelLider } from '../utils/pilaDelLider';
import { ConsultasDelLiderScreen } from './ConsultasDelLiderScreen';
import { CrearGrupoScreen } from './CrearGrupoScreen';
import { FichaDelAprendizDelLider } from './FichaDelAprendizDelLider';
import { FichaDelMentorScreen } from './FichaDelMentorScreen';
import { GrupoDelLiderScreen } from './GrupoDelLiderScreen';
import { GruposDelLiderScreen } from './GruposDelLiderScreen';
import { MisMentoresScreen } from './MisMentoresScreen';
import { ReporteScreen } from './ReporteScreen';

/**
 * «Mis mentores» y todo lo que cuelga de él (spec 056): Mis mentores → ficha del mentor → grupo → ficha del aprendiz, y Grupos, Crear grupo, Consultas y
 * el reporte del mes. Es una pila (`pilaDelLider`): solo la pantalla de arriba está montada, y cada una pone su flecha y su gesto de volver, que suben un
 * nivel por vez hasta «Mis mentores» y de ahí a Yo (`onSalir`). Al volver, la pantalla de abajo se relee: lo que se cambió arriba se ve.
 *
 * «Todos los aprendices» y «Hábitos de todos» siguen siendo de Yo (`onAbrirTodos`, `onAbrirHabitos`): solo existen si el servidor los ofrece.
 */
export function LiderMentoresScreen({
  resumenPorGrupos,
  onSalir,
  onAbrirTodos,
  onAbrirHabitos,
  entradas,
  volverAVigente,
}: {
  /** Al abrirse, el resumen por grupos vuelve a los últimos 7 días: las cifras de los grupos dicen «en 7 días» y no deben ser de otra semana. */
  volverAVigente?: () => void;
  /** Qué entradas le tocan a la cuenta (interruptores de Soporte TI de siempre); sin decirlo, todas. */
  entradas?: EntradasDelLider;
  /** Lo que el resumen por grupos dice de cada grupo (el color de su promedio y sus aprendices por estado). Vacío si no se pudo leer. */
  resumenPorGrupos: readonly GrupoDelResumen[];
  onSalir: () => void;
  onAbrirTodos?: () => void;
  onAbrirHabitos?: () => void;
}) {
  const [pila, setPila] = useState<VistaDelLider[]>([...PILA_INICIAL]);
  /* Solo al abrir: la función cambia en cada render y no tiene que volver a correr. */
  const volver$ = useRef(volverAVigente);
  volver$.current = volverAVigente;
  useEffect(() => {
    volver$.current?.();
  }, []);
  const vista = pila[pila.length - 1];
  const ir = (siguiente: VistaDelLider) => setPila(actual => abrir(actual, siguiente));
  const atras = () => {
    const anterior = volver(pila);
    if (anterior) setPila(anterior);
    else onSalir();
  };
  const rotulo = rotuloDeVolver(pila);

  switch (vista.tipo) {
    case 'misMentores':
      return (
        <MisMentoresScreen
          onVolver={onSalir}
          onAbrirMentor={(mentorId, nombre) => ir({ tipo: 'fichaMentor', mentorId, nombre })}
          onAbrirGrupos={filtro => ir({ tipo: 'grupos', filtro })}
          onAbrirConsultas={() => ir({ tipo: 'consultas' })}
          onAbrirReporte={() => ir({ tipo: 'reporte' })}
          onAbrirTodos={onAbrirTodos}
          onAbrirHabitos={onAbrirHabitos}
          entradas={entradas}
        />
      );

    case 'fichaMentor':
      return (
        <FichaDelMentorScreen
          key={vista.mentorId}
          mentorId={vista.mentorId}
          nombre={vista.nombre}
          rotuloDeVolver={rotulo}
          onVolver={atras}
          onAbrirGrupo={(grupoId, nombre) => ir({ tipo: 'grupo', grupoId, nombre, mentorNombre: vista.nombre })}
          onAbrirConsultas={mentor => ir({ tipo: 'consultas', mentor })}
        />
      );

    case 'grupos':
      return (
        <GruposDelLiderScreen
          key={`grupos-${vista.filtro ?? ''}-${pila.length}`}
          filtroInicial={vista.filtro}
          resumenes={resumenPorGrupos}
          onVolver={atras}
          onAbrirGrupo={g => ir({ tipo: 'grupo', grupoId: g.id, nombre: g.nombre, mentorNombre: g.mentorNombre })}
          onCrear={() => ir({ tipo: 'crearGrupo' })}
        />
      );

    case 'crearGrupo':
      return <CrearGrupoScreen onVolver={atras} onCreado={() => setPila(actual => alCrearUnGrupo(actual))} />;

    case 'grupo':
      return (
        <GrupoDelLiderScreen
          key={vista.grupoId}
          grupoId={vista.grupoId}
          nombre={vista.nombre}
          mentorId={null}
          mentorNombre={vista.mentorNombre}
          resumen={resumenPorGrupos.find(g => g.grupoId === vista.grupoId) ?? null}
          onVolver={atras}
          onMentorCambiado={mentor => setPila(actual => alCambiarElMentorDelGrupo(actual, vista.grupoId, mentor.nombre))}
          onAbrirPersona={persona =>
            ir({ tipo: 'fichaAprendiz', personaId: persona.aprendizId, nombre: persona.nombre?.trim() || 'Aprendiz sin nombre', grupoId: vista.grupoId, mentorNombre: vista.mentorNombre })
          }
        />
      );

    case 'fichaAprendiz':
      return (
        <FichaDelAprendizDelLider
          key={vista.personaId}
          personaId={vista.personaId}
          nombre={vista.nombre}
          grupoId={vista.grupoId}
          mentorNombre={vista.mentorNombre}
          rotuloDeVolver={rotulo}
          onVolver={atras}
        />
      );

    case 'consultas':
      return <ConsultasDelLiderScreen onVolver={atras} mentor={vista.mentor} />;

    case 'reporte':
      return <ReporteScreen onVolver={atras} />;
  }
}
