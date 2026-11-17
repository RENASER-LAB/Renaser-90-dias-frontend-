import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import { AvatarConSemaforo } from './AvatarConSemaforo';

/** El alto mínimo de cada toque de la fila (AGENTS.md §4: 48 px). */
export const ALTO_DE_TOQUE = 48;

/**
 * Una fila de «Mi grupo» (spec 055 FR-005 a FR-007): la foto con el color de su semáforo en el borde, el nombre en texto normal,
 * una línea gris con el motivo y, a la derecha, un ícono de chat redondo. Hay DOS toques separados: el chat (abre el 1 a 1 sin
 * enviar nada) y el resto de la fila (abre la ficha). Si la persona ya no está en el padrón del grupo, la fila no abre ficha.
 */
export function FilaDeAprendiz({
  nombre,
  avatarUrl,
  color,
  motivo,
  onAbrirFicha,
  onEscribirle,
  escribiendo = false,
  conSeparador = false,
}: {
  nombre: string | null;
  avatarUrl: string | null;
  color: ColorSemaforo;
  motivo: string;
  /** `undefined` = ya no está en el grupo: la fila se lee pero no abre nada. */
  onAbrirFicha?: () => void;
  onEscribirle: () => void;
  /** Mientras el pedido del chat viaja, el botón queda apagado (un toque, un pedido). */
  escribiendo?: boolean;
  conSeparador?: boolean;
}) {
  const { c, t } = useTheme();
  const quien = nombre?.trim() || 'Aprendiz sin nombre';
  return (
    <View style={[estilos.fila, conSeparador ? { borderTopWidth: 1, borderTopColor: c.border } : null]}>
      <Presionable
        onPress={onAbrirFicha}
        disabled={!onAbrirFicha}
        accessibilityRole="button"
        accessibilityLabel={`Abrir la ficha de ${quien}`}
        contenedorStyle={estilos.zonaDeLaFicha}
        style={estilos.contenidoDeLaFicha}
      >
        <AvatarConSemaforo nombre={nombre} avatarUrl={avatarUrl} color={color} size={40} />
        <View style={estilos.textos}>
          <Text style={[t.body, { color: c.text, fontSize: 16 }]} numberOfLines={1}>
            {quien}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 14, lineHeight: 19 }]} numberOfLines={2}>
            {motivo}
          </Text>
        </View>
      </Presionable>
      <Presionable
        onPress={onEscribirle}
        disabled={escribiendo}
        accessibilityRole="button"
        accessibilityLabel={`Escribirle a ${quien}`}
        accessibilityState={{ disabled: escribiendo, busy: escribiendo }}
        style={[estilos.chat, { borderColor: c.border, opacity: escribiendo ? 0.5 : 1 }]}
      >
        <Icon name="chat" size={20} color={c.goldInk} />
      </Presionable>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingVertical: 8 },
  zonaDeLaFicha: { flex: 1, minWidth: 0, minHeight: ALTO_DE_TOQUE },
  contenidoDeLaFicha: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: ALTO_DE_TOQUE },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  /* Redondo de 48: el toque del chat. */
  chat: { width: ALTO_DE_TOQUE, height: ALTO_DE_TOQUE, borderRadius: ALTO_DE_TOQUE / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
