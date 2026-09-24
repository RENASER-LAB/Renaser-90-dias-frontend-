import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { GoldButton } from '../../../components/GoldButton';
import { useTheme } from '../../../theme/ThemeContext';
import type { PropuestaUI } from '../types/renasia.types';
import { elegirAccionVisible } from '../utils/accionDelOrbe';
import { estadoVisible } from '../utils/propuestas';
import { ESPACIO_PARA_LANZADOR } from './RenasiaLauncher';
import { textoDeCierre } from './TarjetaPropuesta';

type Props = {
  propuestas: PropuestaUI[];
  onConfirmar: (id: string) => void;
  onCancelar: (id: string) => void;
};

/**
 * La hoja de acción del orbe (D-163): una sola tarjeta flotante, abajo y siempre a la vista, con lo
 * que el acompañante propone y los botones para decidir. Al confirmar se convierte en "Hecho" con el
 * resultado y se va sola; cancelada o fallida, igual. Es lo que hace un asistente de voz: muestra la
 * acción, pide la confirmación y se retira. No se apila nada en la conversación.
 *
 * Nada cambia hasta que la persona toca Confirmar: la voz nunca confirma (D-132, D-153).
 */
export function AccionDelAcompanante({ propuestas, onConfirmar, onCancelar }: Props) {
  const { c, t } = useTheme();
  const [, volverAEvaluar] = useState(0);
  const accion = elegirAccionVisible(propuestas, Date.now());

  // Una acción ya resuelta se queda unos segundos y después la hoja se retira sola.
  useEffect(() => {
    const ahora = elegirAccionVisible(propuestas, Date.now());
    if (!ahora?.seVaEnMs) return;
    const reloj = setTimeout(() => volverAEvaluar(n => n + 1), ahora.seVaEnMs + 50);
    return () => clearTimeout(reloj);
  }, [propuestas]);

  if (!accion) return null;
  const { propuesta, otrasPendientes } = accion;
  const estado = estadoVisible(propuesta, Date.now());
  const enCurso = estado === 'confirmando' || estado === 'cancelando';
  const pendiente = estado === 'pendiente' || enCurso;
  const cierre = pendiente ? null : textoDeCierre(estado, propuesta.mensaje);
  const colorCierre = estado === 'confirmada' ? c.success : estado === 'fallida' ? c.danger : c.textSoft;

  return (
    <View
      style={[styles.hoja, { bottom: ESPACIO_PARA_LANZADOR, backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Aparicion desplazamiento={12} style={styles.contenido}>
        <View style={styles.cabecera}>
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
            {pendiente ? 'TU ACOMPAÑANTE PROPONE' : 'TU ACOMPAÑANTE'}
          </Text>
          {otrasPendientes > 0 ? (
            <Text style={[t.micro, { color: c.textSoft }]}>
              +{otrasPendientes} en el chat
            </Text>
          ) : null}
        </View>
        <Text style={[t.body, { color: c.text }]} numberOfLines={3}>
          {propuesta.resumen}
        </Text>
        {pendiente ? (
          <>
            <View style={styles.botones}>
              <GoldButton
                label="CANCELAR"
                variant="outline"
                onPress={() => onCancelar(propuesta.id)}
                disabled={enCurso}
                loading={estado === 'cancelando'}
                style={styles.boton}
              />
              <GoldButton
                label="CONFIRMAR"
                onPress={() => onConfirmar(propuesta.id)}
                disabled={enCurso}
                loading={estado === 'confirmando'}
                style={styles.boton}
              />
            </View>
            <Text style={[t.micro, { color: c.textSoft }]}>Nada cambia hasta que confirmes.</Text>
          </>
        ) : (
          <Text style={[t.small, { color: colorCierre }]}>{cierre}</Text>
        )}
      </Aparicion>
    </View>
  );
}

const styles = StyleSheet.create({
  hoja: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  contenido: { gap: 8 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botones: { flexDirection: 'row', gap: 8 },
  boton: { flex: 1, minHeight: 48 },
});
