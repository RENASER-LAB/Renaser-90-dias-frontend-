import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { ChatMessage } from '../../../screens/ComunidadScreen';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { colorDeRemitente } from '../utils/formatoChat';
import { fuenteDeImagenDelChat } from '../utils/fuenteDeImagenDelChat';
import { llevaDobleMarca } from '../utils/lecturaDelChat';
import { FotoDelPrograma } from './AvatarDeChat';
import { BurbujaAudioChat } from './BurbujaAudioChat';
import { CitaEnLaBurbuja } from './CitaDeRespuesta';
import type { ColoresDelChat } from './coloresDelChat';

/** El fénix al lado de las burbujas del programa: chico, como los avatares de un grupo de WhatsApp. */
const TAM_FOTO_DEL_PROGRAMA = 34;

/** Fundido corto al aparecer una foto que tuvo que bajar; desde la caché no se nota. */
const TRANSICION_MS = 150;

/** Mantener presionado abre el menú del mensaje: un poco antes que el medio segundo del sistema. */
const ESPERA_DEL_MENU_MS = 350;

/** El tinte del renglón resaltado aparece rápido (responde al dedo) y se apaga despacio. */
const TINTE_ENTRA_MS = 120;
const TINTE_SALE_MS = 450;

/** La marca de los propios: el ícono de 16 junto a la hora (`check` / `checkCheck`, 2026-10-05). */
const TAM_MARCA = 16;

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
 * **Las marcas de los propios** (D-208 del backend, decisión del dueño del 2026-09-27): «✓» es que
 * el servidor lo guardó; «✓✓» en dorado, que lo leyeron —en un 1 a 1 el otro, en un grupo y en el
 * soporte TODOS los demás, como WhatsApp—. En la comunidad queda siempre «✓»: «leído por todos»
 * ahí no tiene sentido y el servidor no lo informa. La marca sale de `mensaje.status`
 * (`'read'` = ✓✓), que trae el listado y que el aviso en vivo sube a leído sin recargar
 * (`utils/lecturaDelChat.ts`). Sin marca, o con una que esta versión no conoce, es «✓».
 * > **Corregido 2026-09-27.** Decía: «Una sola marca «✓» en los propios: el servidor confirmó que
 * > lo guardó. Antes se pintaba «✓✓» siempre, que en WhatsApp quiere decir «entregado», y el backend
 * > no informa entrega ni lectura por mensaje: era una promesa que la app no podía cumplir.» Era
 * > cierto hasta D-208: desde entonces el backend informa la lectura (no la entrega, que sigue sin
 * > saber), así que el «✓✓» volvió, pero ahora dice algo verdadero.
 *
 * > **Actualizado 2026-10-05.** «✓» y «✓✓» ya no son caracteres de texto: son los íconos `check` y
 * > `checkCheck` de 16 px, en los mismos colores (la hora / `leido`). Mismo significado.
 *
 * **Responder y copiar** (pedido del dueño, 2026-10-05; D-251 del backend): mantener presionada la
 * burbuja abre el menú del mensaje (`onMantener`); mientras está abierto, el renglón queda teñido
 * (`resaltado`), igual que el mensaje al que se llega tocando una cita. Si el mensaje responde a otro,
 * la cita va arriba (`CitaEnLaBurbuja`) y tocarla lleva al citado (`onTocarCita`).
 *
 * **Mensajes del programa** (`esDelPrograma`, 2026-09-27): los de sistema con texto o imagen, como
 * la bienvenida del soporte. Van a la izquierda con el fénix al lado y firmados «Formación
 * Renaser» en dorado en cualquier conversación, no solo en los grupos: no los manda una persona
 * (aunque el servidor los guarde a nombre de una cuenta) y no son un aviso gris centrado.
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
  onMantener,
  onTocarCita,
  resaltado = false,
}: {
  mensaje: ChatMessage;
  /** En los grupos, los mensajes ajenos llevan el nombre de quien escribe. */
  enGrupo: boolean;
  primeroDeLaTanda: boolean;
  ultimoDeLaTanda: boolean;
  colores: ColoresDelChat;
  audioActivo: boolean;
  alActivarAudio: () => void;
  /** Recibe la misma fuente que la burbuja (con su clave de caché): el visor no vuelve a bajarla. */
  onAbrirFoto: (fuente: ImageSource | number) => void;
  /** Mantener presionada la burbuja: abre el menú del mensaje (Responder, Copiar). */
  onMantener?: (mensaje: ChatMessage) => void;
  /** Tocar la cita: lleva al mensaje citado, si está cargado. */
  onTocarCita?: (id: string) => void;
  /** El renglón va teñido: su menú está abierto, o se llegó a él desde una cita. */
  resaltado?: boolean;
}) {
  const { c, mode } = useTheme();
  const delPrograma = !!mensaje.esDelPrograma;
  const propio = mensaje.isMe && !delPrograma;
  const fondo = propio ? colores.propia : colores.ajena;
  const conNombre = (enGrupo || delPrograma) && !propio && primeroDeLaTanda;
  const sticker = !!mensaje.esSticker;
  // Fotos y stickers por `expo-image` con la ruta como clave de caché (ver `fuenteDeImagenDelChat`).
  const fuente = fuenteDeImagenDelChat(mensaje.mediaUrl, mensaje.mediaPath);
  const conFoto = mensaje.type === 'image_grid' && !!fuente && !sticker;
  const texto = mensaje.text?.trim() ? mensaje.text : null;
  const leido = llevaDobleMarca(mensaje);
  /* El texto de la marca ya no se dibuja (son íconos), pero sigue midiendo el hueco de la hora: un
     ícono de 16 px ocupa lo mismo que «✓✓» a 12,5 px. */
  const pie = `${mensaje.time}${propio ? (leido ? ' ✓✓' : ' ✓') : ''}`;
  const mantener = onMantener ? () => onMantener(mensaje) : undefined;
  const tinte = useSharedValue(resaltado ? 1 : 0);
  useEffect(() => {
    tinte.set(withTiming(resaltado ? 1 : 0, {
      duration: resaltado ? TINTE_ENTRA_MS : TINTE_SALE_MS,
      easing: CURVA_SALIDA,
      // Es un cambio de color que explica algo, no un desplazamiento: queda también con «reducir movimiento».
      reduceMotion: ReduceMotion.Never,
    }));
  }, [resaltado, tinte]);
  const estiloDelTinte = useAnimatedStyle(() => ({ opacity: tinte.get() }));
  const etiquetaDeLaHora = `Enviado a las ${mensaje.time}${leido ? ', leído' : ''}`;
  const colorDelNombre = delPrograma
    ? c.goldInk
    : colorDeRemitente(mensaje.senderId ?? mensaje.sender, mode === 'dark');

  return (
    <View
      style={[
        styles.renglon,
        propio ? styles.renglonPropio : styles.renglonAjeno,
        delPrograma && styles.renglonDelPrograma,
        { marginTop: primeroDeLaTanda ? 8 : 2, marginBottom: ultimoDeLaTanda ? 2 : 0 },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colores.seleccion }, estiloDelTinte]}
      />
      {/* El fénix va en el primero de la tanda; los siguientes dejan su lugar vacío para que las
          burbujas queden alineadas debajo de la primera. */}
      {delPrograma && (
        <View style={styles.columnaDelPrograma}>
          {primeroDeLaTanda && <FotoDelPrograma size={TAM_FOTO_DEL_PROGRAMA} accessibilityLabel={mensaje.sender} />}
        </View>
      )}
      {/* Toda la burbuja escucha el «mantener presionado»; no es accesible como un solo elemento
          para que el lector de pantalla siga llegando al texto, la foto y el audio por separado. */}
      <Pressable
        onLongPress={mantener}
        delayLongPress={ESPERA_DEL_MENU_MS}
        disabled={!mantener}
        accessible={false}
        style={[
          styles.burbuja,
          { backgroundColor: fondo },
          delPrograma && styles.burbujaDelPrograma,
          primeroDeLaTanda && (propio ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }),
          conFoto && styles.burbujaConFoto,
          sticker && styles.burbujaSticker,
          !!mensaje.cita && styles.burbujaConCita,
        ]}
      >
        {primeroDeLaTanda && !sticker && (
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
              delPrograma && styles.firmaDelPrograma,
              conFoto && styles.remitenteSobreFoto,
              { color: colorDelNombre },
            ]}
          >
            {mensaje.sender}
            {!delPrograma && mensaje.senderRole ? ` · ${mensaje.senderRole}` : ''}
          </Text>
        )}

        {mensaje.cita && (
          <CitaEnLaBurbuja
            cita={mensaje.cita}
            propia={propio}
            colores={colores}
            onTocar={onTocarCita}
            onMantener={mantener}
          />
        )}

        {sticker && fuente && (
          <Image
            source={fuente}
            style={styles.sticker}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={TRANSICION_MS}
            accessibilityLabel={mensaje.stickerNombre ?? 'Sticker Renaser'}
          />
        )}

        {conFoto && (
          <Pressable
            onPress={() => onAbrirFoto(fuente)}
            onLongPress={mantener}
            delayLongPress={ESPERA_DEL_MENU_MS}
            accessibilityLabel="Ver la foto en grande"
          >
            {/* El fondo ocupa ya el tamaño final: mientras baja, la burbuja no salta. */}
            <Image
              source={fuente}
              style={[styles.foto, { backgroundColor: c.divider }]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={TRANSICION_MS}
              accessibilityLabel="Foto enviada por chat"
            />
            {!texto && (
              <View style={styles.horaSobreFoto}>
                <View style={styles.filaDeLaHora} accessible accessibilityLabel={etiquetaDeLaHora}>
                  <Text style={styles.horaSobreFotoTexto}>{mensaje.time}</Text>
                  {propio && (
                    <Icon
                      name={leido ? 'checkCheck' : 'check'}
                      size={TAM_MARCA}
                      color={leido ? colores.leidoSobreFoto : '#FFFFFF'}
                    />
                  )}
                </View>
              </View>
            )}
          </Pressable>
        )}

        {/* Una foto vieja sin URL firmada: se rotula el adjunto, como antes. */}
        {mensaje.type === 'image_grid' && !fuente && (
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
                <Icon name="play" size={18} color={colores.hora} />
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
            <Text style={styles.huecoDeHora}>{huecoParaLaHora(pie)}</Text>
          </Text>
        )}

        {(!conFoto || texto) && (
          <View
            style={[styles.hora, styles.filaDeLaHora, sticker && styles.horaSticker]}
            accessible
            accessibilityLabel={etiquetaDeLaHora}
          >
            <Text style={[styles.horaTexto, { color: colores.hora }]}>{mensaje.time}</Text>
            {/* «✓» va en el color de la hora, como antes; «✓✓» en dorado, que es lo que separa «lo
                leyeron» de «se guardó» de un vistazo (en WhatsApp, el azul). */}
            {propio && (
              <Icon
                name={leido ? 'checkCheck' : 'check'}
                size={TAM_MARCA}
                color={leido ? colores.leido : colores.hora}
              />
            )}
          </View>
        )}
      </Pressable>
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
  /* El fénix arriba, a la altura del nombre, y la cola de la burbuja en el hueco del medio. */
  renglonDelPrograma: {
    alignItems: 'flex-start',
    gap: 10,
  },
  columnaDelPrograma: {
    width: TAM_FOTO_DEL_PROGRAMA,
  },
  /* Con el fénix al lado la burbuja se achica si hace falta, en vez de salirse de la pantalla. */
  burbujaDelPrograma: {
    flexShrink: 1,
  },
  /* La firma del programa en 16 px: se lee como el nombre de quien habla. */
  firmaDelPrograma: {
    fontSize: 16,
  },
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
  /* Con cita, la burbuja deja lugar para leerla aunque la respuesta sea un «ok». */
  burbujaConCita: {
    minWidth: 220,
  },
  burbujaSticker: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  sticker: { width: 176, height: 176 },
  horaSticker: { position: 'relative', right: 0, bottom: 0, alignSelf: 'flex-end', marginTop: 3 },
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
  /* Solo reserva el lugar de la hora: son espacios, no dibujan nada. */
  huecoDeHora: {
    fontSize: 12.5,
  },
  hora: {
    position: 'absolute',
    right: 10,
    bottom: 5,
  },
  horaTexto: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  filaDeLaHora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  /* 44: el mínimo de un blanco táctil (2026-10-05; antes 40). */
  audioBoton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * El hueco al final del texto que deja sitio a la hora. Son espacios que no se parten (U+00A0):
 * con el texto de la hora en `color: 'transparent'`, Android dibujaba igual la hora anidada y se
 * veía dos veces, una encima de la otra (e2e del 26/09). Un espacio de Jost a 12,5 px mide cerca
 * de un tercio de un dígito: por eso ~2,2 espacios por carácter de la hora.
 */
export function huecoParaLaHora(pie: string): string {
  return '\u00A0'.repeat(Math.ceil(pie.length * 2.2) + 3);
}
