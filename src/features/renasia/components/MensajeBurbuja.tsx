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
 * de "escribiendo…" y de error (con reintentar). Separada de `RenasiaPanel` para no repetir esta
 * lógica visual por cada mensaje de la lista. No sabe qué agente es: recibe el nombre por props,
 * así la burbuja es la misma para los dos.
 *
 * NO SE MUESTRAN LAS FUENTES CITADAS (2026-09-06, E-141). Acá había un bloque "LECCIONES CITADAS"
 * que dibujaba un chip por cada id de lección recuperado, tanto para el acompañante como para
 * Sparkie. Pedido del dueño, textual: "no citar las referencias mejor, por seguridad. solo quita
 * eso en los 2 chats". Lo que se exponía era el id interno de cada lección de la base de
 * conocimiento — un identificador del backend, no algo que le sirva al aprendiz.
 *
 * El backend NO se tocó: sigue mandando `sourceLessonIds` en el historial y el evento
 * `{"tipo":"fuentes"}` en el stream. Se ignoran del lado del cliente a propósito (ver
 * `renasiaStream.ts`). La atribución que el prompt de sistema sí exige ("en esta lección...",
 * "esto no es parte del curso") viaja dentro del TEXTO de la respuesta y se sigue mostrando
 * entera: quitar los chips no deja al modelo hablando de fuentes invisibles.
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
              colorAcento={c.goldInk}
            />
          )
        ) : null}

        {mensaje.enProgreso && (
          <View style={styles.filaEscribiendo}>
            <ActivityIndicator size="small" color={esPersona ? c.onGold : c.goldInk} />
            <Text style={[t.small, { color: esPersona ? c.onGold : c.textSoft, fontSize: 12.5 }]}>
              {nombreAsistente} está escribiendo…
            </Text>
          </View>
        )}

        {mensaje.error && (
          <View style={styles.errorBox}>
            <Text style={[t.small, { color: c.danger, fontSize: 12.5 }]}>{mensaje.error}</Text>
            {!mensaje.cuotaAgotada && (
              <Pressable
                onPress={() => onReintentar(mensaje.id)}
                hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
                style={styles.reintentarBtn}
              >
                <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
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
  errorBox: { gap: 2, marginTop: 2 },
  reintentarBtn: { alignSelf: 'flex-start', justifyContent: 'center' },
});
