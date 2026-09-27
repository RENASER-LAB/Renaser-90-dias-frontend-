import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ChatMessage } from '../../../screens/ComunidadScreen';
import { useTheme } from '../../../theme/ThemeContext';
import { colorDeRemitente } from '../utils/formatoChat';
import { BurbujaAudioChat } from './BurbujaAudioChat';
import type { ColoresDelChat } from './coloresDelChat';

/**
 * Un mensaje, con la gramática de WhatsApp (2026-09-26): los propios a la derecha en dorado suave,
 * los ajenos a la izquierda en blanco; cola en el primero de cada tanda; en los grupos, el nombre
 * de quien escribe en su color, dentro de la burbuja; la hora chica en la esquina de abajo; la
 * foto dentro de la burbuja.
 *
 * Reúsa lo que ya funcionaba: `BurbujaAudioChat` para las notas de voz (un reproductor por nota,
 * y una sola sonando a la vez) y el mismo visor de fotos de la pantalla (`onAbrirFoto`). La tarjeta
 * de bienvenida que manda el servidor es una foto seguida de un texto, así que sale sola por acá.
 *
 * Una sola marca «✓» en los propios: el servidor confirmó que lo guardó. Antes se pintaba «✓✓»
 * siempre, que en WhatsApp quiere decir «entregado», y el backend no informa entrega ni lectura
 * por mensaje: era una promesa que la app no podía cumplir.
 */
export function BurbujaDeMensaje({
  mensaje,
  enGrupo,
  primeroDeLaTanda,
  ultimoDeLaTanda,
  colores,
  audioActivo,
  alActivarAudio,
  onAbrirFoto,
}: {
  mensaje: ChatMessage;
  /** En los grupos, los mensajes ajenos llevan el nombre de quien escribe. */
  enGrupo: boolean;
  primeroDeLaTanda: boolean;
  ultimoDeLaTanda: boolean;
  colores: ColoresDelChat;
  audioActivo: boolean;
  alActivarAudio: () => void;
  onAbrirFoto: (url: string) => void;
}) {
  const { c, mode } = useTheme();
  const propio = mensaje.isMe;
  const fondo = propio ? colores.propia : colores.ajena;
  const conNombre = enGrupo && !propio && primeroDeLaTanda;
  const conFoto = mensaje.type === 'image_grid' && !!mensaje.mediaUrl;
  const texto = mensaje.text?.trim() ? mensaje.text : null;
  const pie = `${mensaje.time}${propio ? ' ✓' : ''}`;

  return (
    <View
      style={[
        styles.renglon,
        propio ? styles.renglonPropio : styles.renglonAjeno,
        { marginTop: primeroDeLaTanda ? 8 : 2, marginBottom: ultimoDeLaTanda ? 2 : 0 },
      ]}
    >
      <View
        style={[
          styles.burbuja,
          { backgroundColor: fondo },
          primeroDeLaTanda && (propio ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }),
          conFoto && styles.burbujaConFoto,
        ]}
      >
        {primeroDeLaTanda && (
          <View
            style={[
              styles.cola,
              propio
                ? { right: -8, borderTopColor: fondo, borderRightColor: 'transparent', borderRightWidth: 9 }
                : { left: -8, borderTopColor: fondo, borderLeftColor: 'transparent', borderLeftWidth: 9 },
            ]}
          />
        )}

        {conNombre && (
          <Text
            numberOfLines={1}
            style={[
              styles.remitente,
              conFoto && styles.remitenteSobreFoto,
              { color: colorDeRemitente(mensaje.senderId ?? mensaje.sender, mode === 'dark') },
            ]}
          >
            {mensaje.sender}
            {mensaje.senderRole ? ` · ${mensaje.senderRole}` : ''}
          </Text>
        )}

        {conFoto && (
          <Pressable onPress={() => onAbrirFoto(mensaje.mediaUrl!)} accessibilityLabel="Ver la foto en grande">
            <Image
              source={{ uri: mensaje.mediaUrl }}
              style={styles.foto}
              resizeMode="cover"
              accessibilityLabel="Foto enviada por chat"
            />
            {!texto && (
              <View style={styles.horaSobreFoto}>
                <Text style={styles.horaSobreFotoTexto}>{pie}</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Una foto vieja sin URL firmada: se rotula el adjunto, como antes. */}
        {mensaje.type === 'image_grid' && !mensaje.mediaUrl && (
          <View style={styles.adjuntosSinUrl}>
            {mensaje.mediaList?.map((rotulo, i) => (
              <View key={i} style={[styles.adjuntoSinUrl, { backgroundColor: c.divider }]}>
                <Text style={[styles.textoChico, { color: c.goldInk }]}>{rotulo}</Text>
              </View>
            ))}
          </View>
        )}

        {mensaje.type === 'audio' && (
          mensaje.mediaUrl ? (
            <BurbujaAudioChat
              uri={mensaje.mediaUrl}
              duracion={mensaje.audioDuration}
              esMio={propio}
              colores={{ gold: c.gold, border: c.border, textSoft: colores.hora, cardBg: fondo, cardBgAlt: fondo }}
              estilos={{ caja: styles.audioCaja, boton: styles.audioBoton }}
              activo={audioActivo}
              alActivar={alActivarAudio}
            />
          ) : (
            <View style={styles.audioCaja}>
              <View style={[styles.audioBoton, { backgroundColor: c.border }]}>
                <Text style={{ fontSize: 13, color: colores.hora }}>▶</Text>
              </View>
              <Text style={[styles.texto, { color: colores.hora }]}>Audio no disponible</Text>
            </View>
          )
        )}

        {/* El texto lleva al final un hueco invisible del ancho de la hora: así la hora se sienta
            en la esquina de abajo sin tapar la última palabra, como en WhatsApp. */}
        {texto && mensaje.type !== 'audio' && (
          <Text style={[styles.texto, { color: colores.texto }, conFoto && styles.pieDeFoto]}>
            {texto}
            <Text style={styles.huecoDeHora}>{`   ${pie}`}</Text>
          </Text>
        )}

        {(!conFoto || texto) && (
          <Text style={[styles.hora, { color: colores.hora }]} accessibilityLabel={`Enviado a las ${mensaje.time}`}>
            {pie}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  renglon: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  renglonPropio: { justifyContent: 'flex-end' },
  renglonAjeno: { justifyContent: 'flex-start' },
  burbuja: {
    maxWidth: '82%',
    minWidth: 84,
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingTop: 7,
    paddingBottom: 7,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
  },
  burbujaConFoto: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  cola: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 12,
  },
  remitente: {
    fontFamily: 'Jost_700Bold',
    fontSize: 15,
    marginBottom: 2,
  },
  remitenteSobreFoto: {
    paddingHorizontal: 7,
    paddingTop: 3,
  },
  texto: {
    fontFamily: 'Jost_400Regular',
    fontSize: 17,
    lineHeight: 24,
  },
  pieDeFoto: {
    paddingHorizontal: 7,
    paddingTop: 5,
  },
  /* Mismo tamaño que la hora y transparente: solo reserva el lugar. */
  huecoDeHora: {
    fontSize: 12.5,
    color: 'transparent',
  },
  hora: {
    position: 'absolute',
    right: 10,
    bottom: 5,
    fontFamily: 'Jost_400Regular',
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  foto: {
    width: 240,
    height: 240,
    borderRadius: 11,
  },
  horaSobreFoto: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  horaSobreFotoTexto: {
    color: '#FFFFFF',
    fontFamily: 'Jost_500Medium',
    fontSize: 12.5,
  },
  adjuntosSinUrl: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  adjuntoSinUrl: {
    borderRadius: 10,
    padding: 10,
  },
  textoChico: {
    fontFamily: 'Jost_700Bold',
    fontSize: 14,
  },
  /* La nota de voz vive dentro de la burbuja: la caja no pone fondo ni borde propios y deja
     abajo el lugar de la hora. */
  audioCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
    paddingTop: 2,
    paddingBottom: 18,
    borderWidth: 0,
  },
  audioBoton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
