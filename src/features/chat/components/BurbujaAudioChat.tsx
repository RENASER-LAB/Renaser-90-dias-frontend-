import React, { useCallback, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

/**
 * La burbuja de una nota de voz, con reproducción real.
 *
 * <p>Es un componente y no un bloque más dentro del `.map` de mensajes por una razón concreta:
 * `useAudioPlayer` es un hook y no se puede llamar dentro de un bucle. Cada nota de voz necesita
 * su propio reproductor —si no, arrancar una cortaría la otra a mitad—, así que cada una tiene
 * que ser su propio componente.
 *
 * <p>Antes esto era una animación falsa: un botón que solo alternaba un `useState` y nueve barritas
 * de altura fija que se pintaban doradas al tocar. No sonaba nada, porque no había ningún audio
 * que reproducir — el backend devolvía la clave del objeto en S3, no una URL abrible.
 */
export function BurbujaAudioChat({
  uri,
  duracion,
  esMio,
  colores,
  estilos,
  activo,
  alActivar,
}: {
  /** URL de lectura ya firmada (`MensajeResponse.mediaUrl`). */
  uri: string;
  /** "0:28" — la duración que informó quien lo grabó, para mostrarla antes de cargar el audio. */
  duracion?: string;
  esMio: boolean;
  colores: { gold: string; border: string; textSoft: string; cardBg: string; cardBgAlt: string };
  estilos: { caja: object; boton: object };
  /** `true` si esta es la nota que el chat está reproduciendo ahora. */
  activo: boolean;
  /** Avisa al chat que esta nota pasó a ser la activa, para que pause cualquier otra. */
  alActivar: () => void;
}) {
  const player = useAudioPlayer({ uri }, { updateInterval: 250 });
  const estado = useAudioPlayerStatus(player);

  // Una sola nota suena a la vez: si el chat marcó otra como activa, esta se pausa sola. Es lo
  // que evita el amontonamiento de dos audios sonando encima si se tocan dos seguidos.
  useEffect(() => {
    if (!activo && estado.playing) {
      player.pause();
    }
  }, [activo, estado.playing, player]);

  const alternar = useCallback(() => {
    if (estado.playing) {
      player.pause();
      return;
    }
    // Terminada, `play()` no reanuda: hay que volver al principio primero.
    if (estado.didJustFinish || (estado.duration > 0 && estado.currentTime >= estado.duration)) {
      player.seekTo(0);
    }
    alActivar();
    player.play();
  }, [estado.playing, estado.didJustFinish, estado.duration, estado.currentTime, player, alActivar]);

  const total = estado.duration > 0 ? estado.duration : 0;
  const avance = total > 0 ? Math.min(1, estado.currentTime / total) : 0;

  return (
    <View
      style={[
        estilos.caja,
        { backgroundColor: esMio ? colores.cardBgAlt : colores.cardBg, borderColor: colores.gold },
      ]}
    >
      <Pressable
        onPress={alternar}
        style={[estilos.boton, { backgroundColor: colores.gold }]}
        accessibilityLabel={estado.playing ? 'Pausar la nota de voz' : 'Reproducir la nota de voz'}
      >
        <Text style={{ fontSize: 11, color: '#1E1B18', fontWeight: 'bold' }}>
          {estado.playing ? '⏸' : '▶'}
        </Text>
      </Pressable>

      <View style={{ flex: 1, gap: 2 }}>
        {/*
          Las nueve barritas ya no son decoración: se doran las que quedaron atrás del punto de
          reproducción, así la onda funciona como barra de progreso.
        */}
        <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
          {[8, 14, 10, 16, 12, 14, 8, 12, 10].map((alto, i, todas) => (
            <View
              key={i}
              style={{
                width: 3,
                height: alto,
                backgroundColor: i / todas.length < avance ? colores.gold : colores.border,
                borderRadius: 1.5,
              }}
            />
          ))}
        </View>
        <Text style={{ color: colores.textSoft, fontSize: 9 }}>
          {estado.playing || avance > 0 ? formatear(estado.currentTime) : duracion ?? formatear(total)}
        </Text>
      </View>
    </View>
  );
}

function formatear(segundos: number): string {
  const enteros = Math.max(0, Math.floor(segundos));
  return `${Math.floor(enteros / 60)}:${(enteros % 60).toString().padStart(2, '0')}`;
}
