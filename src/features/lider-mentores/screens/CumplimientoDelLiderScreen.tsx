import React, { useRef, useState } from 'react';

import type { InicioSemanal, LecturaDeGrupos } from '../../semaforo/hooks/useLecturaPorSemana';
import { SemaforoGruposScreen } from '../../semaforo/screens/SemaforoGruposScreen';
import type { AprendizDelSemaforo, GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { FichaDelAprendizDelLider } from './FichaDelAprendizDelLider';
import { GrupoDelLiderScreen } from './GrupoDelLiderScreen';

/**
 * Del semáforo por grupos a la semana de una persona (spec 005): resumen por grupos → los grupos → una
 * persona. Tres toques desde Hoy (SC-001).
 *
 * Es estado de Hoy, como la bandeja de tickets y «Mis mentores» (sin sexta pestaña): `HoyScreen` solo
 * cambia `SemaforoGruposScreen` por esta, que lo envuelve. Cada nivel registra su retroceso del sistema y
 * vuelve al anterior: persona ← grupo ← resumen ← Hoy.
 *
 * **La ventana del resumen manda en todo** (decisión del dueño del 2026-10-19): al tocar un grupo, la lista abre en los
 * MISMOS 7 días que mostraba el resumen (`inicio`: posición y ancla), y al tocar una persona, la ficha abre en la ventana
 * que la lista tenía en ese momento. Las tres se rotulan con el mismo texto (`NavegacionDeSemanas`) y sus flechas ‹ ›
 * mueven la ventana igual, de 7 en 7 días, sin llegar nunca al futuro. Es lo que ya hace Administración.
 *
 * El resumen por grupos conserva la semana en que estaba al volver de un grupo (`conservarSemana`).
 *
 * **Abierta desde la fila de un grupo** (spec 018: «Mis mentores» de Hoy lista los grupos con su resultado) llega con
 * `grupoInicial` y arranca en la lista de ese grupo, en los mismos 7 días que mostraba la fila; volver sale a Hoy. Sin
 * `grupoInicial` —el aviso del sábado, `/semaforo/grupos`— es el recorrido de siempre, desde el resumen.
 */
export function CumplimientoDelLiderScreen({
  lectura,
  onSalir,
  grupoInicial,
}: {
  /** La MISMA lectura con la que Hoy decide si mostrar la entrada. */
  lectura: LecturaDeGrupos;
  onSalir: () => void;
  grupoInicial?: GrupoAbierto;
}) {
  const [grupo, setGrupo] = useState<GrupoAbierto | null>(grupoInicial ?? null);
  /* Una vez abierto un grupo, el resumen ya no vuelve a la ventana vigente al reaparecer. */
  const yaAbrioUnGrupo = useRef(grupoInicial !== undefined);

  if (!grupo) {
    return (
      <SemaforoGruposScreen
        lectura={lectura}
        onVolver={onSalir}
        conservarSemana={yaAbrioUnGrupo.current}
        onAbrirGrupo={(abierto: GrupoDelResumen, inicio) => {
          yaAbrioUnGrupo.current = true;
          setGrupo({
            grupoId: abierto.grupoId,
            nombre: abierto.grupoNombre?.trim() || 'Grupo sin nombre',
            /* La lista abre en LA MISMA ventana que el resumen: la posición y el ancla con que se estaba mirando. */
            inicio,
          });
        }}
      />
    );
  }
  /* `key`: otro grupo es otra cosa que mirar, con su lista y sus personas desde cero. */
  return (
    <FlujoDelGrupo
      key={grupo.grupoId}
      grupo={grupo}
      resumen={lectura.datos?.grupos.find(g => g.grupoId === grupo.grupoId) ?? null}
      onVolver={grupoInicial ? onSalir : () => setGrupo(null)}
    />
  );
}

/** El grupo que se está mirando: el de la tarjeta que se tocó y los 7 días con que se estaba mirando. */
export interface GrupoAbierto {
  grupoId: string;
  nombre: string;
  inicio: InicioSemanal;
}

/**
 * Un grupo y las personas que se abren desde él. Desde la spec 056 es el grupo del líder (cabecera con su estado, contadores y aprendices por riesgo) y la
 * ficha de la 055 de cada persona. El grupo abre en los mismos 7 días que mostraba el resumen; al volver de una persona, la lista sigue ahí.
 */
function FlujoDelGrupo({ grupo, resumen, onVolver }: { grupo: GrupoAbierto; resumen: GrupoDelResumen | null; onVolver: () => void }) {
  const [persona, setPersona] = useState<AprendizDelSemaforo | null>(null);
  const mentorNombre = resumen && !resumen.sinMentor ? resumen.mentorNombre : null;

  if (persona) {
    return (
      <FichaDelAprendizDelLider
        key={persona.aprendizId}
        personaId={persona.aprendizId}
        nombre={persona.nombre?.trim() || 'Aprendiz sin nombre'}
        grupoId={grupo.grupoId}
        mentorNombre={mentorNombre}
        rotuloDeVolver={grupo.nombre}
        onVolver={() => setPersona(null)}
      />
    );
  }
  return (
    <GrupoDelLiderScreen
      grupoId={grupo.grupoId}
      nombre={grupo.nombre}
      mentorId={null}
      mentorNombre={mentorNombre}
      resumen={resumen}
      inicio={grupo.inicio}
      onVolver={onVolver}
      onAbrirPersona={setPersona}
    />
  );
}
