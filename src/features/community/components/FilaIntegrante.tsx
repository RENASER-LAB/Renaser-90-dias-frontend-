import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import { AvatarPersona } from '../../../components/ui';

/**
 * Una fila de la lista de integrantes de un grupo: avatar, nombre, una insignia opcional
 * (`MENTOR`, `TÚ`) y el botón de abrir el 1 a 1 cuando corresponde.
 *
 * Vive acá y no dentro de `ComunidadScreen` porque el mismo renglón se pinta en DOS lugares desde
 * el rediseño de la pestaña Tribu (2026-09-21): en la ficha "INFO DEL GRUPO" que se abre desde una
 * sala de chat, y en el desplegable de integrantes de la tarjeta de la tribu. Eran el mismo JSX
 * copiado dos veces hasta que se extrajo: la próxima corrección de este renglón —un tamaño, un
 * contraste, un `numberOfLines`— ahora toca los dos lados a la vez en vez de uno solo.
 */
export type IntegranteDeGrupo = {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  /** `MENTOR`, `TÚ`… o `null` si es un integrante sin distintivo. */
  badge: string | null;
  /** `false` para el mentor (el grupo no trae su id de usuario) y para uno mismo. */
  chateable: boolean;
};

export function FilaIntegrante({
  integrante,
  onChatear,
}: {
  integrante: IntegranteDeGrupo;
  onChatear: (usuarioId: string) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[styles.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={styles.identidad}>
        <AvatarPersona nombre={integrante.nombre} avatarUrl={integrante.avatarUrl} size={38} />
        <View style={{ flexShrink: 1 }}>
          <View style={styles.nombreYBadge}>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]} numberOfLines={1}>
              {integrante.nombre}
            </Text>
            {integrante.badge && (
              <View style={[styles.badge, { backgroundColor: c.goldWash }]}>
                <Text style={[t.micro, { color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
                  {integrante.badge}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {integrante.chateable && (
        <Pressable
          onPress={() => onChatear(integrante.id)}
          accessibilityRole="button"
          accessibilityLabel={`Chatear con ${integrante.nombre}`}
          style={[styles.botonChat, { backgroundColor: c.gold }]}
        >
          <Text style={[t.small, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>💬 Chatear</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 14,
    minHeight: 48,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    flexShrink: 1,
  },
  nombreYBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  /** 48 px de alto: se pulsa con el pulgar, no se apunta (AGENTS.md §4). */
  botonChat: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
