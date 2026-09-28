import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { getTokenSesion, notificarSesionVencida } from '../../../services/http/apiClient';
import { useTheme } from '../../../theme/ThemeContext';
import { avisar } from '../../admin/utils/dialogo';
import { rutaDeLaCarta } from '../api/cajaApi';
import { descargarConSesion, entornoDeLaPlataforma, traerImagenConSesion } from '../utils/archivosConSesion';

/** «Carta-Ana-Torres.png»: sin tildes ni signos, que algunos teléfonos no aceptan en un archivo. */
export function nombreDelArchivoDeLaCarta(nombre: string | null | undefined): string {
  const limpio = (nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `Carta-${limpio || 'Renaser'}.png`;
}

/**
 * La carta con el nombre del aprendiz, lista para imprimir (spec §7): «Ver carta» la muestra y
 * «Descargar» la baja (web) o la comparte (teléfono). Se pide recién al tocar: es una imagen grande.
 */
export function CartaDeLaCaja({ aprendizId, nombre }: { aprendizId: string; nombre: string | null | undefined }) {
  const { c, t } = useTheme();
  const entorno = useMemo(() => entornoDeLaPlataforma(), []);
  const [uri, setUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const uriActual = useRef<string | null>(null);
  uriActual.current = uri;

  // Al salir, se libera la imagen (en web es un object URL que ocupa memoria).
  useEffect(
    () => () => {
      if (uriActual.current) entorno.liberar(uriActual.current);
    },
    [entorno],
  );

  const ver = async () => {
    setCargando(true);
    setError(null);
    const resultado = await traerImagenConSesion(rutaDeLaCarta(aprendizId), getTokenSesion(), entorno);
    setCargando(false);
    if (resultado.ok) {
      if (uri) entorno.liberar(uri);
      setUri(resultado.valor);
    } else {
      if (resultado.status === 401) notificarSesionVencida();
      setError(resultado.mensaje);
    }
  };

  const descargar = async () => {
    setDescargando(true);
    const resultado = await descargarConSesion(
      { ruta: rutaDeLaCarta(aprendizId), nombre: nombreDelArchivoDeLaCarta(nombre), tipo: 'image/png', titulo: 'Carta' },
      getTokenSesion(),
      entorno,
    );
    setDescargando(false);
    if (!resultado.ok) avisar('No se pudo descargar', resultado.mensaje);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
        Carta
      </Text>
      {uri ? (
        <View style={[estilos.marco, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <Image source={{ uri }} style={estilos.imagen} resizeMode="contain" accessible accessibilityLabel="Carta" />
        </View>
      ) : null}
      {cargando ? <ActivityIndicator color={c.goldInk} /> : null}
      {error ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
          {error}
        </Text>
      ) : null}
      <View style={estilos.botones}>
        {!uri ? (
          <BotonSecundario etiqueta="Ver carta" icono="eye" onPress={() => void ver()} deshabilitado={cargando} estilo={estilos.boton} />
        ) : null}
        <BotonSecundario
          etiqueta="Descargar"
          icono="share"
          onPress={() => void descargar()}
          cargando={descargando}
          estilo={estilos.boton}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boton: { flexGrow: 1, flexBasis: 140 },
  marco: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 420, alignSelf: 'center' },
  // Una hoja A4 en vertical; `contain` la muestra entera si la del servidor tiene otra proporción.
  imagen: { width: '100%', aspectRatio: 210 / 297 },
});
