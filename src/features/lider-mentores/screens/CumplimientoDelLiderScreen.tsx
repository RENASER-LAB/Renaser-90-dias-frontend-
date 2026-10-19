import React, { useRef, useState } from 'react';

import type { InicioSemanal, LecturaDeGrupos } from '../../semaforo/hooks/useLecturaPorSemana';
import { SemaforoGruposScreen } from '../../semaforo/screens/SemaforoGruposScreen';
import type { AprendizDelSemaforo, GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { useGrupoDelLider } from '../hooks/useGrupoDelLider';
import { GrupoDelLiderScreen } from './GrupoDelLiderScreen';
import { PersonaDelLiderScreen } from './PersonaDelLiderScreen';

/**
 * Del semáforo por grupos a la semana de una persona (spec 005): resumen por grupos → los grupos → una
 * persona. Tres toques desde Hoy (SC-001).
 *
 * Es estado de Hoy, como la bandeja de tickets y «Mis mentores» (sin sexta pestaña): `HoyScreen` solo
 * cambia `SemaforoGruposScreen` por esta, que lo envuelve. Cada nivel registra su retroceso del sistema y
 * vuelve al anterior: persona ← grupo ← resumen ← Hoy.
 *
 * El resumen por grupos conserva la semana en que estaba al volver de un grupo (`conservarSemana`).
 */
export function CumplimientoDelLiderScreen({
  lectura,
  onSalir,
}: {
  /** La MISMA lectura con la que Hoy decide si mostrar la entrada. */
  lectura: LecturaDeGrupos;
  onSalir: () => void;
}) {
  const [grupo, setGrupo] = useState<{ grupoId: string; nombre: string; inicio: InicioSemanal } | null>(null);
  /* Una vez abierto un grupo, el resumen ya no vuelve a la ventana vigente al reaparecer. */
  const yaAbrioUnGrupo = useRef(false);

  if (!grupo) {
    return (
      <SemaforoGruposScreen
        lectura={lectura}
        onVolver={onSalir}
        conservarSemana={yaAbrioUnGrupo.current}
        onAbrirGrupo={(abierto: GrupoDelResumen, inicio) => {
          yaAbrioUnGrupo.current = true;
          setGrupo({ grupoId: abierto.grupoId, nombre: abierto.grupoNombre?.trim() || 'Grupo sin nombre', inicio });
        }}
      />
    );
  }
  /* `key`: otro grupo es otra cosa que mirar, con su lista y sus personas desde cero. */
  return <FlujoDelGrupo key={grupo.grupoId} grupo={grupo} onVolver={() => setGrupo(null)} />;
}

/**
 * Un grupo y las personas que se abren desde él. La lista del grupo vive acá, un nivel arriba de la persona:
 * al volver de una persona la lista sigue ahí, en la semana en que estaba, sin releerse.
 */
function FlujoDelGrupo({
  grupo,
  onVolver,
}: {
  grupo: { grupoId: string; nombre: string; inicio: InicioSemanal };
  onVolver: () => void;
}) {
  const lista = useGrupoDelLider(grupo.grupoId, grupo.inicio);
  const [persona, setPersona] = useState<{ fila: AprendizDelSemaforo; semanaHasta: string | null } | null>(null);

  if (persona) {
    return (
      <PersonaDelLiderScreen
        key={persona.fila.aprendizId}
        grupoId={grupo.grupoId}
        grupoNombre={lista.datos?.grupoNombre?.trim() || grupo.nombre}
        personaId={persona.fila.aprendizId}
        nombre={persona.fila.nombre?.trim() || 'Persona sin nombre'}
        avatarUrl={persona.fila.avatarUrl}
        semanaHasta={persona.semanaHasta}
        onVolver={() => setPersona(null)}
      />
    );
  }
  return (
    <GrupoDelLiderScreen
      nombre={grupo.nombre}
      lectura={lista}
      onVolver={onVolver}
      onAbrirPersona={fila =>
        /* La ficha se abre en la semana que la lista estaba mirando; en la ventana vigente, la en curso. */
        setPersona({ fila, semanaHasta: lista.posicion.modo === 'semana' ? lista.posicion.semanaHasta : null })
      }
    />
  );
}
