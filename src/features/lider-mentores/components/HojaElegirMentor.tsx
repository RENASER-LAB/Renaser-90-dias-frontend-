import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { mensajeDeError } from '../../../services/http/apiClient';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { obtenerPadron } from '../api/liderMentoresApi';
import type { IndicadoresApi } from '../api/liderMentoresSchemas';
import { asignarMentorDelLider } from '../api/gruposDelLiderApi';
import { useLecturaDelLider } from '../hooks/useLecturaDelLider';
import { ListaDeMentoresParaElegir } from './ListaDeMentoresParaElegir';
import { Linea } from './Linea';

export interface GrupoParaAsignar {
  id: string;
  nombre: string;
  /** Lo que se sabe del mentor actual al abrir la hoja; el padrón que la hoja lee lo confirma (es quien lista el grupo entre los suyos). */
  mentorId: string | null;
}

/**
 * Elegir el mentor de un grupo (spec 056 FR-009): «Asignar» a un grupo sin mentor y «Cambiar mentor» en uno que ya lo tiene. La hoja lista a los mentores
 * con su cupo (los de cupo lleno, apagados) y el botón dice el cambio que se va a guardar —«Asignar a Ana»—: ese toque es la confirmación. **Un toque, un
 * pedido.** Si el servidor lo rechaza (otro líder asignó antes, el grupo es de otra formación) se dice su motivo y la lista se relee.
 */
export function HojaElegirMentor({
  grupo,
  alCerrar,
  onAsignado,
}: {
  grupo: GrupoParaAsignar | null;
  alCerrar: () => void;
  /** El servidor aceptó el cambio: el mentor que el grupo tiene ahora, para que quien abrió la hoja lo diga sin esperar a releer. */
  onAsignado: (mentor: { id: string; nombre: string }) => void;
}) {
  const insets = useSafeAreaInsets();
  const visible = grupo !== null;
  const pedir = useCallback(async () => (visible ? await obtenerPadron() : null), [visible]);
  const lectura = useLecturaDelLider(pedir, `${grupo?.id ?? 'ninguno'}`);
  const [elegido, setElegido] = useState<IndicadoresApi | null>(null);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    if (visible) setElegido(null);
  }, [grupo?.id, visible]);

  /* El mentor que tiene hoy el grupo: el padrón lo dice (es quien lo lista entre sus grupos); si todavía no cargó, lo que dijo quien abrió la hoja. */
  const mentores = lectura.datos?.mentors ?? null;
  const mentorActualId = grupo ? mentores?.find(m => m.groups.items?.some(g => g.id === grupo.id))?.userId ?? grupo.mentorId : null;

  const asignar = async () => {
    if (!grupo || !elegido || enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    try {
      const grupos = (elegido.groups.items ?? []).map(g => g.id);
      const resultado = await asignarMentorDelLider({ ...grupo, mentorId: mentorActualId }, { userId: elegido.userId, fullName: elegido.fullName, grupos });
      if (resultado === 'nada') Alert.alert('Ya es su mentor', `${elegido.fullName} ya acompaña a ${grupo.nombre}.`);
      onAsignado({ id: elegido.userId, nombre: elegido.fullName });
      alCerrar();
    } catch (e) {
      Alert.alert('No se pudo asignar', e instanceof Error && !('status' in e) ? e.message : mensajeDeError(e, 'Revisa tu conexión e inténtalo de nuevo.'));
      void lectura.recargar();
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo={mentorActualId ? 'Cambiar mentor' : 'Asignar mentor'} subtitulo={grupo?.nombre} tamano="grande" etiquetaCerrar="Cerrar elegir mentor">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
        {mentores ? (
          mentores.length === 0 ? (
            <Linea>Todavía no hay mentores activos.</Linea>
          ) : (
            <ListaDeMentoresParaElegir mentores={mentores} elegidoId={elegido?.userId ?? null} onElegir={setElegido} yaEsMentorId={mentorActualId} />
          )
        ) : lectura.fallo ? (
          <FalloDeLectura fallo={lectura.fallo} detalle={lectura.detalle} que="los mentores" onReintentar={lectura.recargar} />
        ) : (
          <CargandoLectura texto="Cargando los mentores…" />
        )}
        <BotonPrincipal etiqueta={elegido ? `Asignar a ${elegido.fullName}` : 'Asignar'} onPress={() => void asignar()} cargando={guardando} deshabilitado={!elegido || guardando} />
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, gap: 14 },
});
