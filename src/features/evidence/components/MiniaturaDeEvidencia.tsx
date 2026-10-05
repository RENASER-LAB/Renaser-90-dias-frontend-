import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { DURACION_MS } from '../../../theme/movimiento';
import { ImageViewerModal } from '../../community/components/ImageViewerModal';
import { iconoDeTipo, type EvidenciaApi } from '../api/evidenceSchemas';
import { fuenteDeFotoDeEvidencia } from '../utils/fotoDeEvidencia';

/**
 * La miniatura de una evidencia en Yo: la foto real, o el ícono de su tipo si no hay foto que mostrar
 * (2026-10-05, pedido del dueño; backend D-252).
 *
 * - **El ícono es la capa de abajo, siempre.** La foto se pinta encima con un fundido corto
 *   (`DURACION_MS.fundido`): mientras baja se ve el ícono de siempre, no una caja vacía, y desde la
 *   caché el fundido no se nota. Es la única animación: un cambio de opacidad que explica que llegó
 *   la foto, así que queda también con «reducir movimiento».
 * - **Si la foto no carga** (sin red, o una firma ya vencida que quedó en pantalla), la foto se saca y
 *   queda el ícono, como antes de D-252. Se recuerda QUÉ URL falló, no que «falló»: cuando la lista se
 *   recarga con una firma nueva, se vuelve a intentar.
 * - **`ampliable`**: tocarla abre la foto grande en el visor que ya existe (`ImageViewerModal`, el del
 *   Muro, sin reacciones ni comentarios porque no recibe `postId`). Con la misma clave de caché que la
 *   miniatura, así que no la vuelve a bajar. Sin foto no hay nada que ampliar y no es tocable.
 *
 * La caja (tamaño, borde, radio, fondo) la pone quien la usa en `style`; acá solo se recorta la foto a
 * ese radio.
 */
export function MiniaturaDeEvidencia({
  evidencia,
  style,
  tamanoIcono,
  colorIcono,
  ampliable = false,
}: {
  evidencia: Pick<EvidenciaApi, 'id' | 'tipo' | 'fotoUrl'>;
  style?: StyleProp<ViewStyle>;
  tamanoIcono: number;
  colorIcono: string;
  ampliable?: boolean;
}) {
  const [urlQueFallo, setUrlQueFallo] = useState<string | null>(null);
  const [abierta, setAbierta] = useState(false);
  const encontrada = fuenteDeFotoDeEvidencia(evidencia);
  const fuente = encontrada && encontrada.uri !== urlQueFallo ? encontrada : null;

  const contenido = (
    <>
      <Icon name={iconoDeTipo(evidencia.tipo)} size={tamanoIcono} color={colorIcono} />
      {fuente && (
        <Image
          source={fuente}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={evidencia.id}
          transition={DURACION_MS.fundido}
          onError={() => setUrlQueFallo(fuente.uri)}
          accessible={false}
        />
      )}
    </>
  );

  if (!fuente || !ampliable) {
    return <View style={[style, styles.recorte]}>{contenido}</View>;
  }
  return (
    <>
      <Presionable
        style={[style, styles.recorte]}
        onPress={() => setAbierta(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel="Ver la foto en grande"
      >
        {contenido}
      </Presionable>
      {/* Se monta solo abierto: veinte visores cerrados serían veinte modales con sus gestos. */}
      {abierta && (
        <ImageViewerModal visible onClose={() => setAbierta(false)} images={[{ url: fuente.uri }]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  recorte: { overflow: 'hidden' },
});
