import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import type { IconName } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { LeccionVideoPlayer } from '../../academy/components/LeccionVideoPlayer';
import { claveDeCacheDeLaFoto } from '../../evidence/utils/fotoDeEvidencia';
import { EvidenciaNoSeAbrio, leerEvidencia, type EvidenciaLeida, type MotivoSinEvidencia } from '../api/cumplimientoDelLiderApi';
import type { EvidenciaDeLaObligacion } from '../types/cumplimientoDelLider.types';
import { textoDelFalloDeEvidencia, tipoDeEvidenciaEnPalabras } from '../utils/palabrasDeLaPersona';
import { respuestaYaLeidaComoEvidencia } from '../utils/respuestaRepetida';
import { BotonDeEvidencia } from './BotonDeEvidencia';
import { ReproductorDeAudio } from './ReproductorDeAudio';

/**
 * Abrir lo que respalda un cumplimiento (spec 005, US2): el botón «Ver evidencia» de un hábito o de una
 * acción del día, y la hoja desde abajo con la foto, el texto, el audio o el video y, debajo, lo que la
 * persona escribió (el «¿Qué sentiste?» o las respuestas de la Pastilla).
 *
 * - **El enlace de un archivo se pide AL ABRIR la hoja**, no antes (FR-012): vence a los diez minutos.
 *   La hoja monta sus evidencias recién al abrirse, y cada una pide la suya.
 * - **No se descarga nada a mano**: la foto se ve en la hoja, el audio suena con su reproductor y el video
 *   corre en el mismo reproductor de las lecciones.
 * - **Una evidencia que ya no existe** dice «Ya no está disponible» y el resto sigue (la ficha no se cae).
 * - Solo se monta lo que se ve: una semana trae decenas de hábitos y cada uno solo sabe cómo abrirse.
 */
export function EvidenciaDeObligacion({
  titulo,
  evidencias,
  respuestaTexto = null,
  etiqueta = 'Ver evidencia',
  icono = 'image',
}: {
  /** El hábito o la acción: título de la hoja y nombre de lo que se abre. */
  titulo: string;
  evidencias: EvidenciaDeLaObligacion[];
  /** Lo que la persona escribió al cumplir; se lee debajo de las evidencias. */
  respuestaTexto?: string | null;
  etiqueta?: string;
  icono?: IconName;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <BotonDeEvidencia etiqueta={etiqueta} icono={icono} accessibilityLabel={`${etiqueta} de ${titulo}`} onPress={() => setAbierta(true)} />
      <HojaDesdeAbajo
        visible={abierta}
        alCerrar={() => setAbierta(false)}
        titulo={titulo}
        subtitulo="Evidencia"
        tamano="grande"
        etiquetaCerrar="Cerrar la evidencia"
      >
        <CuerpoDeLaEvidencia titulo={titulo} evidencias={evidencias} respuestaTexto={respuestaTexto} />
      </HojaDesdeAbajo>
    </>
  );
}

function CuerpoDeLaEvidencia({
  titulo,
  evidencias,
  respuestaTexto,
}: {
  titulo: string;
  evidencias: EvidenciaDeLaObligacion[];
  respuestaTexto: string | null;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const variasEvidencias = evidencias.length > 1;
  // Los textos que ya se leyeron como evidencia: si «Lo que escribió» dice lo mismo, no se repite (E-629 (b)).
  const [textosLeidos, setTextosLeidos] = useState<string[]>([]);
  const alLeerTexto = useCallback((texto: string) => setTextosLeidos(previos => [...previos, texto]), []);

  return (
    <ScrollView
      contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {evidencias.map((evidencia, i) => (
        <View key={evidencia.id} style={{ gap: 8 }}>
          {variasEvidencias ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
              {`${tipoDeEvidenciaEnPalabras(evidencia.tipo)} ${i + 1} de ${evidencias.length}`}
            </Text>
          ) : null}
          <VistaDeEvidencia evidencia={evidencia} titulo={titulo} alLeerTexto={alLeerTexto} />
        </View>
      ))}
      {respuestaTexto && !respuestaYaLeidaComoEvidencia(respuestaTexto, textosLeidos) ? (
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_700Bold' }]}>
            Lo que escribió
          </Text>
          <Text selectable style={[t.body, { color: c.text, fontSize: 16, lineHeight: 24 }]}>
            {respuestaTexto}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

type Lectura =
  | { estado: 'cargando' }
  | { estado: 'lista'; evidencia: EvidenciaLeida }
  | { estado: 'fallo'; motivo: MotivoSinEvidencia };

/** Una evidencia: pide su enlace (o su texto) al montarse y la dibuja según su tipo. */
function VistaDeEvidencia({
  evidencia,
  titulo,
  alLeerTexto,
}: {
  evidencia: EvidenciaDeLaObligacion;
  titulo: string;
  alLeerTexto: (texto: string) => void;
}) {
  const { c, t } = useTheme();
  const [lectura, setLectura] = useState<Lectura>({ estado: 'cargando' });
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vigente = true;
    setLectura({ estado: 'cargando' });
    leerEvidencia(evidencia.id, evidencia.tipo).then(
      leida => {
        if (!vigente) return;
        setLectura({ estado: 'lista', evidencia: leida });
        if (leida.tipo === 'TEXTO') alLeerTexto(leida.texto);
      },
      (e: unknown) => {
        if (vigente) setLectura({ estado: 'fallo', motivo: e instanceof EvidenciaNoSeAbrio ? e.motivo : 'error' });
      },
    );
    return () => {
      vigente = false;
    };
  }, [evidencia.id, evidencia.tipo, vuelta, alLeerTexto]);

  if (lectura.estado === 'cargando') {
    return (
      <View style={estilos.cargando} accessible accessibilityLabel="Abriendo la evidencia">
        <ActivityIndicator color={c.goldInk} />
        <Aviso texto="Abriendo…" />
      </View>
    );
  }
  if (lectura.estado === 'fallo') {
    const { texto, reintentar } = textoDelFalloDeEvidencia(lectura.motivo);
    return (
      <View style={{ gap: 10 }}>
        <Aviso texto={texto} />
        {reintentar ? <BotonSecundario etiqueta="Reintentar" onPress={() => setVuelta(v => v + 1)} /> : null}
      </View>
    );
  }

  const leida = lectura.evidencia;
  switch (leida.tipo) {
    case 'TEXTO':
      return (
        <Text selectable style={[t.body, { color: c.text, fontSize: 16, lineHeight: 24 }]}>
          {leida.texto.trim() || 'No escribió nada.'}
        </Text>
      );
    case 'FOTO':
      return <FotoDeLaEvidencia url={leida.url} titulo={titulo} />;
    case 'AUDIO':
      return <ReproductorDeAudio uri={leida.url} etiqueta={`el audio de ${titulo}`} />;
    case 'VIDEO':
      return <LeccionVideoPlayer videoTipo="storage" videoUrl={leida.url} videoMiniaturaUrl={null} videoDuracionMs={null} />;
    default:
      return (
        <BotonSecundario
          etiqueta="Abrir el archivo"
          icono="link"
          onPress={() => {
            void Linking.openURL(leida.url).catch(() => undefined);
          }}
        />
      );
  }
}

function Aviso({ texto }: { texto: string }) {
  const { c, t } = useTheme();
  return <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, flexShrink: 1 }]}>{texto}</Text>;
}

/** La foto entera dentro de la hoja. Si no carga (la firma venció, el archivo no está) lo dice. */
function FotoDeLaEvidencia({ url, titulo }: { url: string; titulo: string }) {
  const { c, t } = useTheme();
  const { height } = useWindowDimensions();
  const [fallo, setFallo] = useState(false);
  if (fallo) return <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Ya no está disponible.</Text>;
  return (
    <Image
      source={{ uri: url, cacheKey: claveDeCacheDeLaFoto(url) }}
      style={{ width: '100%', height: Math.min(440, Math.round(height * 0.5)), borderRadius: 14, backgroundColor: c.cardBgAlt }}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={160}
      onError={() => setFallo(true)}
      accessibilityLabel={`Foto de ${titulo}`}
    />
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingTop: 4, gap: 18 },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
});
