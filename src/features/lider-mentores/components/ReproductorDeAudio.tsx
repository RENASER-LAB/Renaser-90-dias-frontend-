import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Escucha el audio de una evidencia sin descargarlo a mano (spec 005, US2). Un solo reproductor por
 * audio —`useAudioPlayer` es un hook, por eso es un componente— con ▶ / ⏸ de `Icon` en un botón de 48 px
 * y la barra de avance. Se monta recién cuando ya hay un enlace: el enlace vence a los diez minutos y se
 * pidió al abrir la evidencia, no antes.
 */
export function ReproductorDeAudio({ uri, etiqueta }: { uri: string; etiqueta: string }) {
  const { c, t } = useTheme();
  const player = useAudioPlayer({ uri }, { updateInterval: 250 });
  const estado = useAudioPlayerStatus(player);

  const alternar = useCallback(() => {
    if (estado.playing) {
      player.pause();
      return;
    }
    /* Terminado, `play()` no reanuda: hay que volver al principio primero. */
    if (estado.didJustFinish || (estado.duration > 0 && estado.currentTime >= estado.duration)) {
      player.seekTo(0);
    }
    player.play();
  }, [estado.playing, estado.didJustFinish, estado.duration, estado.currentTime, player]);

  const total = estado.duration > 0 ? estado.duration : 0;
  const avance = total > 0 ? Math.min(1, estado.currentTime / total) : 0;

  return (
    <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
      <Presionable
        onPress={alternar}
        style={[estilos.boton, { backgroundColor: c.gold }]}
        accessibilityRole="button"
        accessibilityLabel={estado.playing ? `Pausar ${etiqueta}` : `Escuchar ${etiqueta}`}
      >
        {/* El triángulo se corre 1 px a la derecha: centrado por su caja se ve corrido a la izquierda. */}
        <View style={estado.playing ? null : { marginLeft: 1 }}>
          <Icon name={estado.playing ? 'pause' : 'play'} size={20} color={c.onGold} />
        </View>
      </Presionable>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[estilos.pista, { backgroundColor: c.divider }]}>
          <View style={[estilos.relleno, { backgroundColor: c.gold, width: `${Math.round(avance * 100)}%` }]} />
        </View>
        <Text style={[t.small, { color: c.textSoft, fontSize: 14, fontVariant: ['tabular-nums'] }]}>
          {formatear(estado.currentTime)}
          {total > 0 ? ` / ${formatear(total)}` : ''}
        </Text>
      </View>
    </View>
  );
}

/** `83` → `1:23`. */
function formatear(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 14, padding: 12 },
  /* 48 px: se toca con el pulgar sin apuntar. */
  boton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: 3 },
});
