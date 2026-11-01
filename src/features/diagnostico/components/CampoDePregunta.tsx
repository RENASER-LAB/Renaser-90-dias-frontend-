import React from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { PreguntaDelDiagnostico } from '../types/diagnostico.types';
import type { RespuestaEnEdicion } from '../utils/respuestasEnEdicion';
import {
  ControlDeArea,
  ControlDeConsentimiento,
  ControlDeCuadricula,
  ControlDeEscala,
  ControlDeFecha,
  ControlDeNumero,
  ControlDeSeleccionUnica,
  ControlDeTexto,
  ControlDeVarias,
} from './ControlesDePregunta';

interface CampoDePreguntaProps {
  pregunta: PreguntaDelDiagnostico;
  valor: RespuestaEnEdicion;
  /** Lo que falta en ESTA pregunta (spec 026, FR-008): se dice debajo de ella. */
  error?: string;
  alCambiar: (preguntaId: number, nuevo: RespuestaEnEdicion) => void;
  /** Avisa dónde quedó la pregunta, para bajar la vista hasta ella cuando falte algo. */
  alMedir: (preguntaId: number, y: number) => void;
  /** El primer campo de texto vacío del paso abre el teclado solo, como en la ficha estándar. */
  enfocarAlLlegar?: boolean;
}

/**
 * Una pregunta del diagnóstico con su texto, su ayuda, su control según el tipo y, si falta algo, el mensaje. El consentimiento
 * es la excepción en la ayuda: su `ayuda` es el texto de la declaración y la dibuja el propio control, encima de la casilla.
 */
export function CampoDePregunta({ pregunta, valor, error, alCambiar, alMedir, enfocarAlLlegar = false }: CampoDePreguntaProps) {
  const { c, t } = useTheme();
  const esConsentimiento = pregunta.tipo === 'CASILLA';
  const cambiar = (nuevo: RespuestaEnEdicion) => alCambiar(pregunta.id, nuevo);
  const props = { pregunta, valor, alCambiar: cambiar, error };

  let control: React.ReactNode;
  switch (pregunta.tipo) {
    case 'TEXTO':
      control = <ControlDeTexto {...props} enfocarAlLlegar={enfocarAlLlegar} />;
      break;
    case 'NUMERO':
      control = <ControlDeNumero {...props} enfocarAlLlegar={enfocarAlLlegar} />;
      break;
    case 'AREA_TEXTO':
      control = <ControlDeArea {...props} />;
      break;
    case 'SELECCION_UNICA':
      control = <ControlDeSeleccionUnica {...props} />;
      break;
    case 'SELECCION_MULTIPLE':
      control = <ControlDeVarias {...props} />;
      break;
    case 'ESCALA':
      control = <ControlDeEscala {...props} />;
      break;
    case 'CUADRICULA':
      control = <ControlDeCuadricula {...props} />;
      break;
    case 'FECHA':
      control = <ControlDeFecha {...props} />;
      break;
    case 'CASILLA':
      control = <ControlDeConsentimiento {...props} />;
      break;
  }

  return (
    <View
      style={estilos.pregunta}
      onLayout={(e: LayoutChangeEvent) => alMedir(pregunta.id, e.nativeEvent.layout.y)}
    >
      <View style={estilos.encabezado}>
        <Text accessibilityRole="header" style={[t.cardTitle, estilos.texto, { color: c.textStrong }]}>
          {pregunta.texto}
        </Text>
        {!pregunta.requerida && !esConsentimiento ? (
          <Text style={[t.body, estilos.opcional, { color: c.textSoft }]}>Opcional</Text>
        ) : null}
        {pregunta.ayuda && !esConsentimiento ? (
          <Text style={[t.body, estilos.ayuda, { color: c.textSoft }]}>{pregunta.ayuda}</Text>
        ) : null}
      </View>

      {control}

      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[t.body, estilos.error, { color: c.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pregunta: { gap: 12 },
  encabezado: { gap: 4 },
  texto: { fontSize: 18, lineHeight: 25 },
  opcional: { fontSize: 14, lineHeight: 20 },
  ayuda: { fontSize: 16, lineHeight: 23 },
  error: { fontSize: 15, lineHeight: 21 },
});
