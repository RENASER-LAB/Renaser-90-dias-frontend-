import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { useFotoConSesion } from '../../chat/hooks/useFotoConSesion';
import { subirImagenAS3 } from '../../community/api/wallApi';
import { confirmarImagen, pedirSubidaDeImagen, type ImagenDeCaja } from '../api/cajaApi';
import type { DetalleDeCaja } from '../api/cajaSchemas';
import { elegirImagen, subirImagen } from '../utils/subirImagen';

const PARA: Record<ImagenDeCaja, string> = {
  foto: 'subir la foto de la caja',
  comprobante: 'subir el comprobante del envío',
};

/**
 * La foto de la caja armada o el comprobante: la imagen (si ya hay) y los botones para subirla. En el
 * teléfono, «Tomar foto» y «Galería»; en web, solo elegir un archivo.
 */
export function ImagenDeLaCaja({
  aprendizId,
  cual,
  titulo,
  url,
  editable,
  onCambio,
}: {
  aprendizId: string;
  cual: ImagenDeCaja;
  titulo: string;
  url: string | null | undefined;
  editable: boolean;
  onCambio: (detalle: DetalleDeCaja) => void;
}) {
  const { c, t } = useTheme();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enWeb = Platform.OS === 'web';

  const subir = async (desde: 'galeria' | 'camara') => {
    setError(null);
    const resultado = await subirImagen({
      elegir: () => elegirImagen(desde, PARA[cual]),
      pedirSubida: tipo => pedirSubidaDeImagen(aprendizId, cual, tipo),
      subir: subirImagenAS3,
      confirmar: ruta => confirmarImagen(aprendizId, cual, ruta),
      alSubir: () => setSubiendo(true),
    });
    setSubiendo(false);
    if (resultado.tipo === 'lista') onCambio(resultado.valor);
    else if (resultado.tipo === 'fallo') setError(resultado.mensaje);
  };

  if (!url && !editable) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
        {titulo}
      </Text>
      {url ? <ImagenRemota url={url} descripcion={titulo} /> : null}
      {subiendo ? (
        <View style={estilos.fila}>
          <ActivityIndicator color={c.goldInk} />
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Subiendo…</Text>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
          {error}
        </Text>
      ) : null}
      {editable && !subiendo ? (
        <View style={estilos.botones}>
          {!enWeb ? (
            <BotonSecundario
              etiqueta={url ? 'Otra foto' : 'Tomar foto'}
              icono="camera"
              onPress={() => void subir('camara')}
              estilo={estilos.boton}
            />
          ) : null}
          <BotonSecundario
            etiqueta={enWeb ? (url ? 'Cambiar' : 'Elegir imagen') : 'Galería'}
            icono="image"
            onPress={() => void subir('galeria')}
            estilo={estilos.boton}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Una imagen de la caja. Si el servidor manda una URL firmada (`https://…`) se muestra tal cual; si
 * manda una ruta propia (`/api/…`), se pide con la sesión como las fotos del chat (en Android, en un
 * arreglo: E-411).
 */
export function ImagenRemota({ url, descripcion }: { url: string; descripcion: string }) {
  const { c, t } = useTheme();
  const esRutaPropia = url.startsWith('/');
  const conSesion = useFotoConSesion(esRutaPropia ? url : null);
  const [fallo, setFallo] = useState(false);
  const fuente = esRutaPropia ? conSesion.fuente : { uri: url };

  return (
    <View style={[estilos.marco, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      {fuente && !fallo ? (
        <Image
          source={fuente}
          style={estilos.imagen}
          resizeMode="contain"
          accessible
          accessibilityLabel={descripcion}
          onError={() => {
            setFallo(true);
            conSesion.alFallar();
          }}
        />
      ) : (
        <View style={[estilos.imagen, estilos.vacia]}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{fallo ? 'No se pudo mostrar.' : '…'}</Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boton: { flexGrow: 1, flexBasis: 140 },
  marco: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 420, alignSelf: 'center' },
  imagen: { width: '100%', aspectRatio: 4 / 3 },
  vacia: { alignItems: 'center', justifyContent: 'center' },
});
