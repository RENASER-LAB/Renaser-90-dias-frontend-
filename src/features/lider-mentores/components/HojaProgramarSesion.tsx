import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useAuth } from '../../../context/AuthContext';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as eventosApi from '../../eventos/api/eventosApi';
import { FormularioDelEvento } from '../../eventos/components/FormularioDelEvento';
import { useOpcionesDeAudiencia } from '../../eventos/hooks/useOpcionesDeAudiencia';
import type { PersonaConvocable } from '../../eventos/types/audiencia.types';
import type { AudienciaDelFormulario } from '../../eventos/utils/audienciaDelFormulario';
import { armarCuerpo, formularioVacio, type FormularioDeEvento } from '../../eventos/utils/formularioDeEvento';
import { subirPortada, type PortadaElegida } from '../../eventos/utils/portadaDelEvento';
import { CargandoLectura } from '../../semaforo/components/EstadoDeLectura';
import { Linea } from './Linea';

/**
 * «Programar sesión» desde la ficha de un mentor (spec 056 historia 6, FR-033 y FR-034): una hoja con el formulario de Eventos y **ese mentor ya elegido
 * como audiencia** (`audienciaPrevia`), que se puede cambiar a su grupo o a todos los mentores. Con fecha, hora, duración y Meet automático. La sesión se
 * crea igual que una sesión personalizada de Eventos (`POST /calendar/events`) y aparece en el calendario de sus invitados con su enlace.
 *
 * El formulario se monta cuando ya se sabe qué puede elegir esta cuenta (`useOpcionesDeAudiencia`): su audiencia previa se toma al montarse. Si el
 * servidor no deja crear sesiones a esta cuenta, la hoja lo dice en una línea.
 */
export function HojaProgramarSesion({
  visible,
  alCerrar,
  mentor,
  onProgramada,
}: {
  visible: boolean;
  alCerrar: () => void;
  mentor: { id: string; nombre: string };
  /** La sesión quedó creada: quien abre la hoja lo dice en su pantalla. */
  onProgramada?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { sabido, opciones } = useOpcionesDeAudiencia(visible && !!userId, userId, null);
  const [guardando, setGuardando] = useState(false);
  /* Un toque, un pedido: dos guardados en el mismo cuadro ven el mismo estado viejo, así que lo decide un `ref`. */
  const enCurso = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const previa = useMemo<Partial<AudienciaDelFormulario>>(() => {
    const persona: PersonaConvocable = { id: mentor.id, nombre: mentor.nombre, fotoUrl: null, rol: 'Mentor', grupo: null };
    return { personas: [persona] };
  }, [mentor.id, mentor.nombre]);

  const guardar = async (form: FormularioDeEvento, portada: PortadaElegida | null, audiencia: AudienciaDelFormulario | null) => {
    if (enCurso.current) return;
    const armado = armarCuerpo(form, Date.now(), null, audiencia);
    if (!armado.ok) {
      setError(armado.error);
      return;
    }
    setError(null);
    enCurso.current = true;
    setGuardando(true);
    try {
      const creado = await eventosApi.crearEvento(armado.cuerpo);
      if (portada) {
        /* La sesión ya quedó guardada: si la portada falla, la sesión sigue en pie. */
        try {
          await subirPortada(creado.id, portada);
        } catch {
          /* Se puede cambiar editando el evento desde Eventos. */
        }
      }
      onProgramada?.();
      alCerrar();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403 && /FUERA_DE_TU_ALCANCE|FUERA_DE_SU_ALCANCE/.test(JSON.stringify(e.body ?? ''))
          ? 'Hay personas que no puedes invitar. Revisa a quién elegiste.'
          : e instanceof ApiError && e.status === 400 && /AUDIENCIA_VACIA/.test(JSON.stringify(e.body ?? ''))
            ? 'Hoy no hay nadie en lo que elegiste. Elige otra opción o suma personas.'
            : e instanceof ApiError && e.status === 403
              ? 'Tu cuenta no puede programar sesiones.'
              : mensajeDeError(e, 'No se pudo programar la sesión. Intenta de nuevo.'),
      );
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo="Programar sesión" subtitulo={`Con ${mentor.nombre}`} tamano="completa" etiquetaCerrar="Cerrar programar sesión">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
        {!sabido ? (
          <CargandoLectura texto="Preparando la sesión…" />
        ) : !opciones.puedeCrear ? (
          <Linea>Tu cuenta no puede programar sesiones.</Linea>
        ) : (
          <FormularioDelEvento
            inicial={formularioVacio(Date.now())}
            original={null}
            error={error}
            guardando={guardando}
            onVolver={alCerrar}
            onGuardar={(form, portada, audiencia) => void guardar(form, portada, audiencia)}
            opciones={opciones}
            audienciaPrevia={previa}
            sinCabecera
          />
        )}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, gap: 14 },
});
