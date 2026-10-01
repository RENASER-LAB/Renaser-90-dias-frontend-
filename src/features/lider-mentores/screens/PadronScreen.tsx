import React from 'react';
import { View } from 'react-native';

import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { obtenerPadron } from '../api/liderMentoresApi';
import { FilaDeMentor } from '../components/FilaDeMentor';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useLecturaDelLider } from '../hooks/useLecturaDelLider';
import { corteEnPalabras } from '../utils/lecturaDeMentores';

/** El padrón: una fila por mentor y, arriba, el reporte del mes (SDD 002, RL-04). */
export function PadronScreen({
  onVolver,
  onAbrirMentor,
  onAbrirReporte,
}: {
  onVolver: () => void;
  onAbrirMentor: (mentorId: string) => void;
  onAbrirReporte: () => void;
}) {
  const lectura = useLecturaDelLider(obtenerPadron, 'padron');
  const padron = lectura.datos;

  return (
    <MarcoDelLider titulo="Mis mentores" onVolver={onVolver}>
      <BotonSecundario etiqueta="Reporte del mes" icono="doc" onPress={onAbrirReporte} />
      {padron ? (
        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle={corteEnPalabras(padron.cutoffAt)}>
            {padron.mentors.length === 1 ? '1 mentor' : `${padron.mentors.length} mentores`}
          </TituloDeSeccion>
          {padron.mentors.length === 0 ? <Linea>Todavía no hay mentores activos.</Linea> : null}
          {padron.mentors.map(mentor => (
            <FilaDeMentor
              key={mentor.userId}
              mentor={mentor}
              mes={padron.month}
              onAbrir={() => onAbrirMentor(mentor.userId)}
            />
          ))}
        </View>
      ) : lectura.fallo ? (
        <FalloDeLectura fallo={lectura.fallo} detalle={lectura.detalle} que="tus mentores" onReintentar={lectura.recargar} />
      ) : (
        <CargandoLectura texto="Cargando tus mentores…" />
      )}
    </MarcoDelLider>
  );
}
