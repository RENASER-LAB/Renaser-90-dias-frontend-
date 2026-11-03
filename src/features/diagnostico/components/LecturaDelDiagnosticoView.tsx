import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MicroLabel } from '../../../components/ui';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { LecturaDelDiagnostico, PreguntaLeida } from '../types/diagnostico.types';
import { cuentaDeLaLectura, dichoDeLaPregunta, fechaDeLaLectura, renglonesDeLaRespuesta } from '../utils/lecturaLegible';
import { PREGUNTA_RETIRADA, SIN_RESPUESTA } from '../utils/textosDelDiagnostico';

/**
 * El diagnóstico de una persona, en solo lectura (spec 026, §4): por sección, cada pregunta TAL COMO SE LE HIZO y su respuesta
 * legible —un texto, una lista, o una fila por cada fila de la cuadrícula—. Una pregunta que Administración retiró después
 * lleva la marca «Pregunta retirada» y conserva lo que se respondió. Sin scroll propio ni tarjeta: lo dibuja quien lo usa (la
 * pantalla «Mi diagnóstico» o la sección de la ficha de quien acompaña).
 */
export function LecturaDelDiagnosticoView({ lectura }: { lectura: LecturaDelDiagnostico }) {
  const { c, t } = useTheme();
  const { respondidas, total } = cuentaDeLaLectura(lectura);
  const completadoEn = fechaDeLaLectura(lectura.completadoEn);

  return (
    <View style={estilos.columna}>
      <View style={estilos.resumen}>
        {lectura.estado === 'COMPLETADO' && completadoEn ? (
          <Text style={[t.body, estilos.linea, { color: c.text }]}>{`Completado el ${completadoEn}`}</Text>
        ) : null}
        {lectura.formacion ? <Text style={[t.body, estilos.linea, { color: c.textSoft }]}>{lectura.formacion.nombre}</Text> : null}
        {total > 0 ? (
          <Text style={[t.body, estilos.linea, { color: c.textSoft }]}>{`${respondidas} de ${total} preguntas respondidas`}</Text>
        ) : null}
      </View>

      {lectura.secciones.map((seccion, i) => (
        <View key={`${i}-${seccion.titulo}`} style={estilos.seccion}>
          <MicroLabel>{seccion.titulo}</MicroLabel>
          {seccion.preguntas.map(pregunta => (
            <PreguntaLeidaView key={pregunta.id} pregunta={pregunta} />
          ))}
        </View>
      ))}
    </View>
  );
}

function PreguntaLeidaView({ pregunta }: { pregunta: PreguntaLeida }) {
  const { c, t } = useTheme();
  const renglones = renglonesDeLaRespuesta(pregunta);
  return (
    <View accessible accessibilityLabel={dichoDeLaPregunta(pregunta)} style={[estilos.pregunta, { borderTopColor: c.divider }]}>
      <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{pregunta.texto}</Text>
      {pregunta.retirada ? (
        <View style={[estilos.marca, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
          <Text style={[t.body, estilos.textoDeLaMarca, { color: c.textSoft }]}>{PREGUNTA_RETIRADA}</Text>
        </View>
      ) : null}
      {renglones.length > 0 ? (
        renglones.map((renglon, i) => (
          <Text key={i} style={[t.body, estilos.respuesta, { color: c.text }]}>
            {renglon}
          </Text>
        ))
      ) : (
        <Text style={[t.body, estilos.respuesta, { color: c.textSoft }]}>{SIN_RESPUESTA}</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 20 },
  resumen: { gap: 2 },
  linea: { fontSize: 16, lineHeight: 23 },
  seccion: { gap: 4 },
  pregunta: { gap: 4, paddingVertical: 12, borderTopWidth: 1 },
  texto: { fontSize: 16, lineHeight: 23, fontFamily: fuentes.seminegrita },
  respuesta: { fontSize: 16, lineHeight: 23 },
  marca: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 },
  textoDeLaMarca: { fontSize: 14, lineHeight: 20, fontFamily: fuentes.media },
});
