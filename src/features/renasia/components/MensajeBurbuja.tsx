import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

import { TextoAsistente } from './TextoAsistente';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import type { RenasiaMensajeUI } from '../types/renasia.types';

type Props = {
  mensaje: RenasiaMensajeUI;
  /** D-102: el nombre del asistente de ESTE panel (RENASIA o SPARKIE), para "X está escribiendo…". */
  nombreAsistente: string;
  onReintentar: (idMensajeAsistente: string) => void;
};

/**
 * Una burbuja del panel de un asistente — de la persona o del asistente, con sus propios estados
 * de "escribiendo…", error (con reintentar) y lecciones citadas. Separada de `RenasiaPanel` para
 * no repetir esta lógica visual por cada mensaje de la lista. No sabe qué agente es: recibe el
 * nombre por props, así la burbuja es la misma para los dos.
 */
export function MensajeBurbuja({ mensaje, nombreAsistente, onReintentar }: Props) {
  const { c, t } = useTheme();
  const { rs, isSmall } = useResponsive();
  const esPersona = mensaje.autor === 'persona';

  return (
    <View style={[styles.fila, { justifyContent: esPersona ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.burbuja,
          {
            backgroundColor: esPersona ? c.gold : c.cardBg,
            borderColor: esPersona ? c.gold : c.border,
            borderTopRightRadius: esPersona ? 4 : 16,
            borderTopLeftRadius: esPersona ? 16 : 4,
            paddingHorizontal: isSmall ? 12 : 14,
          },
        ]}
      >
        {mensaje.texto ? (
          esPersona ? (
            // Lo que escribe la persona se muestra literal: si tecleó asteriscos, quiso asteriscos.
            <Text
              style={[
                t.body,
                { color: c.onGold, fontSize: rs(14.5), lineHeight: rs(21) },
              ]}
            >
              {mensaje.texto}
            </Text>
          ) : (
            // La respuesta del asistente viene con markdown básico (negritas, listas numeradas):
            // sin esto se leían los `**` en pantalla. Ver `TextoAsistente`.
            <TextoAsistente
              texto={mensaje.texto}
              estilo={[t.body, { color: c.text, fontSize: rs(14.5), lineHeight: rs(21) }]}
              colorAcento={c.gold}
            />
          )
        ) : null}

        {mensaje.enProgreso && (
          <View style={styles.filaEscribiendo}>
            <ActivityIndicator size="small" color={esPersona ? c.onGold : c.gold} />
            <Text style={[t.small, { color: esPersona ? c.onGold : c.textSoft, fontSize: 12.5 }]}>
              {nombreAsistente} está escribiendo…
            </Text>
          </View>
        )}

        {!!mensaje.lecciones?.length && !mensaje.enProgreso && (
          <View style={[styles.fuentesBox, { borderTopColor: c.divider }]}>
            <Text style={[t.micro, { color: c.micro, fontSize: 10 }]}>LECCIONES CITADAS</Text>
            <View style={styles.fuentesLista}>
              {mensaje.lecciones.map(id => (
                <View
                  key={id}
                  style={[styles.fuenteChip, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={[t.small, { color: c.textSoft, fontSize: 11.5 }]} numberOfLines={1}>
                    {id}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {mensaje.error && (
          <View style={styles.errorBox}>
            <Text style={[t.small, { color: '#E06A66', fontSize: 12.5 }]}>{mensaje.error}</Text>
            {!mensaje.cuotaAgotada && (
              <Pressable
                onPress={() => onReintentar(mensaje.id)}
                hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
                style={styles.reintentarBtn}
              >
                <Text style={[t.micro, { color: c.gold, fontSize: 11, fontWeight: '700' }]}>
                  REINTENTAR
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', width: '100%', marginTop: 10 },
  burbuja: { maxWidth: '86%', borderWidth: 1, borderRadius: 16, paddingVertical: 10, gap: 6 },
  filaEscribiendo: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 },
  fuentesBox: { borderTopWidth: 1, paddingTop: 8, marginTop: 2, gap: 6 },
  fuentesLista: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fuenteChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 160 },
  errorBox: { gap: 2, marginTop: 2 },
  reintentarBtn: { alignSelf: 'flex-start', justifyContent: 'center' },
});
