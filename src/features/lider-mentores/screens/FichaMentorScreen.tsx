import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { CantidadesPorColor } from '../../semaforo/components/CantidadesPorColor';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { obtenerFicha } from '../api/liderMentoresApi';
import type { FichaApi, TipoObservacion } from '../api/liderMentoresSchemas';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { SemaforoDelMentor } from '../components/SemaforoDelMentor';
import { useLecturaDelLider } from '../hooks/useLecturaDelLider';
import {
  NOMBRE_DE_OBSERVACION,
  VERBO_DE_OBSERVACION,
  evaluacionEnPalabras,
  fechaCorta,
  gruposEnPalabras,
  nombreDelMes,
  pendientesEnPalabras,
  respuestasEnPalabras,
} from '../utils/lecturaDeMentores';
import { escribirleAlMentor } from '../utils/irAlChat';

const TIPOS: TipoObservacion[] = ['RECONOCIMIENTO', 'SUGERENCIA', 'ALERTA'];

/**
 * La ficha de un mentor (SDD 002, RL-06): sus grupos con el semáforo, sus consultas, su evaluación y
 * lo que el líder ya le dijo. Ningún aprendiz por su nombre (decisión del dueño, 01/10): el líder no
 * entra al detalle de un grupo.
 *
 * Una acción principal, «Escribirle» (abre el chat directo, no manda nada solo); las tres de
 * observación debajo, con borde.
 */
export function FichaMentorScreen({
  mentorId,
  aviso,
  onVolver,
  onObservar,
}: {
  mentorId: string;
  /** Lo que pasó con la última observación guardada, para decirlo al volver. */
  aviso: string | null;
  onVolver: () => void;
  onObservar: (tipo: TipoObservacion, nombre: string) => void;
}) {
  const pedir = useCallback(() => obtenerFicha(mentorId), [mentorId]);
  const lectura = useLecturaDelLider(pedir, `${mentorId}|${aviso ?? ''}`);
  const ficha = lectura.datos;

  return (
    <MarcoDelLider titulo={ficha?.mentor.fullName ?? 'Mentor'} onVolver={onVolver}>
      {aviso ? <Linea fuerte>{aviso}</Linea> : null}
      {ficha ? (
        <Ficha ficha={ficha} onObservar={tipo => onObservar(tipo, ficha.mentor.fullName)} />
      ) : lectura.fallo ? (
        <FalloDeLectura fallo={lectura.fallo} detalle={lectura.detalle} que="la ficha del mentor" onReintentar={lectura.recargar} />
      ) : (
        <CargandoLectura texto="Cargando la ficha…" />
      )}
    </MarcoDelLider>
  );
}

function Ficha({ ficha, onObservar }: { ficha: FichaApi; onObservar: (tipo: TipoObservacion) => void }) {
  const { c } = useTheme();
  const mentor = ficha.mentor;
  const pendientes = pendientesEnPalabras(mentor);
  const [abriendoChat, setAbriendoChat] = useState(false);

  const escribirle = async () => {
    setAbriendoChat(true);
    await escribirleAlMentor(mentor.userId, mentor.fullName);
    setAbriendoChat(false);
  };

  return (
    <>
      <Linea>{subtitulo(ficha)}</Linea>
      {!ficha.accountActive ? <Linea fuerte>Su cuenta está suspendida.</Linea> : null}

      <View style={estilos.seccion}>
        <TituloDeSeccion detalle={gruposEnPalabras(mentor)}>Sus grupos</TituloDeSeccion>
        <SemaforoDelMentor mentor={mentor} />
        {(mentor.groups.items ?? []).length > 1
          ? mentor.groups.items!.map(grupo => (
              <View key={grupo.id} style={[estilos.grupo, { borderColor: c.border }]}>
                <Linea fuerte>{`${grupo.name ?? 'Grupo'} · ${grupo.trainees} ${grupo.trainees === 1 ? 'aprendiz' : 'aprendices'}`}</Linea>
                {grupo.semaforo ? <CantidadesPorColor resumen={grupo.semaforo} /> : null}
              </View>
            ))
          : mentor.semaforo.summary ? <CantidadesPorColor resumen={mentor.semaforo.summary} /> : null}
      </View>

      <View style={estilos.seccion}>
        <TituloDeSeccion>Consultas</TituloDeSeccion>
        {pendientes ? <Linea>{pendientes}</Linea> : null}
        <Linea>{respuestasEnPalabras(mentor, ficha.month)}</Linea>
      </View>

      <View style={estilos.seccion}>
        <TituloDeSeccion>Evaluación</TituloDeSeccion>
        <Linea>{evaluacionEnPalabras(mentor, ficha.month)}</Linea>
      </View>

      <View style={estilos.seccion}>
        <TituloDeSeccion>Lo que le dijiste</TituloDeSeccion>
        {ficha.recentObservations.length === 0 ? (
          <Linea>{`Todavía nada en ${nombreDelMes(ficha.month)}.`}</Linea>
        ) : (
          ficha.recentObservations.map(o => (
            <Text key={o.id} style={[estilos.observacion, { color: c.textSoft }]}>
              <Text style={{ color: c.textStrong, fontFamily: 'Jost_500Medium' }}>
                {`${fechaCorta(o.createdAt)} · ${NOMBRE_DE_OBSERVACION[o.type]}${o.sentByChat ? ' · enviada' : ''}`}
              </Text>
              {`\n${o.text}`}
            </Text>
          ))
        )}
      </View>

      <BotonPrincipal etiqueta={abriendoChat ? 'Abriendo…' : 'Escribirle'} icono="chat" onPress={escribirle} cargando={abriendoChat} />
      <View style={estilos.acciones}>
        {TIPOS.map(tipo => (
          <BotonSecundario key={tipo} etiqueta={VERBO_DE_OBSERVACION[tipo]} onPress={() => onObservar(tipo)} estilo={estilos.accion} />
        ))}
      </View>
    </>
  );
}

function subtitulo(ficha: FichaApi): string {
  const nivel = ficha.profile?.level ? `Mentor ${ficha.profile.level}` : 'Mentor';
  if (!ficha.profile?.since) return nivel;
  const desde = new Date(ficha.profile.since);
  return Number.isNaN(desde.getTime())
    ? nivel
    : `${nivel} · desde ${nombreDelMes(`${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}`, true)}`;
}

const estilos = StyleSheet.create({
  seccion: { gap: 6 },
  grupo: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  observacion: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 23 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accion: { flexGrow: 1, flexBasis: 100 },
});
