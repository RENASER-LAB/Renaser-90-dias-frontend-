import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../../components/Alerta';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, IconName } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { mensajeDeError } from '../../../services/http/apiClient';
import {
  ALMACENAMIENTO_SIN_CONFIGURAR,
  almacenamientoSinConfigurar,
  completarRegistro,
  confirmarEvidencia,
  solicitarUrlSubidaEvidencia,
  subirArchivoAS3,
} from '../api/evidenciaHabitoApi';
import {
  ArchivoEvidencia,
  duracionLegible,
  elegirFotoDeGaleria,
  elegirVideoDeGaleria,
  grabarVideoConCamara,
  mimeDeAudio,
  tomarFotoConCamara,
} from '../utils/capturarEvidencia';

/**
 * Modal GENÉRICO de evidencia: el de los hábitos que no tienen flujo propio. El pedido del
 * dueño (2026-09-04) es literal — "debe poder subir evidencia en foto, o texto, o audio, o
 * videos; con que cumpla con uno funciona".
 *
 * De ahí sale la regla de habilitación del botón: alcanza con UNA de las cuatro. No se exigen
 * dos, no se exige la foto, y el texto por sí solo vale.
 *
 * Componente propio y no una edición del modal viejo de `TrainingScreen`: ese modal era una
 * maqueta (el recuadro de foto solo hacía `setEvidencePhotoUploaded(true)`, sin picker ni
 * backend) y hay otros flujos de evidencia construyéndose en paralelo sobre esa misma pantalla.
 */

/**
 * Camino de subida alternativo. Devuelve los puntos que otorgó el servidor.
 *
 * **Por qué una función y no un `destino: 'habito' | 'roca'`.** Las acciones del día (rocas) usan
 * otros endpoints —`/rocks/{id}/...`, y con tres pasos en vez de cuatro, porque ahí `/evidence`
 * cierra y premia de una— pero conocerlos sería atar `habits` a `objetivos`. Este archivo se queda
 * sabiendo de hábitos; quien compone las dos cosas es la pantalla de Training, que ya importa las
 * dos. Mismo criterio con el que este módulo evita depender de `community`.
 */
export type SellarEvidencia = (datos: {
  archivo: ArchivoEvidencia | null;
  texto: string;
}) => Promise<number>;

export interface EvidenciaHabitoModalProps {
  /** `null` = cerrado. Es el id del REGISTRO del día (`habit-tracks`), no el del hábito. */
  registroId: string | null;
  /** Cuando viene, reemplaza el camino de hábitos entero. Ver {@link SellarEvidencia}. */
  sellarPersonalizado?: SellarEvidencia;
  titulo: string;
  /** Línea chica de contexto: "CUERPO · INNEGOCIABLE". */
  contexto?: string;
  /** Nota previa del registro, si ya había una. */
  notaInicial?: string;
  /**
   * El audio que hay que escuchar ANTES de completar, cuando el hábito tiene uno: hoy solo la
   * Audioterapia Semanal (`AUDIO_THERAPY_WEEKLY`).
   *
   * Cuando viene, este modal deja de ser "subí una prueba de que lo hiciste" y pasa a ser
   * "escuchá esto y contá qué te pasó", que es el flujo que D-97 pidió para la Audioterapia y que
   * hasta hoy solo tenía la Pastilla Renacer. Lo que NO cambia es el cierre: sigue siendo el
   * camino genérico de evidencia, que completa el hábito correcto y deja que el servidor otorgue
   * los puntos. (Entregarlo por `/spirit-audio/submit` habría completado la PASTILLA: ese endpoint
   * resuelve el hábito por una constante y no recibe cuál cerrar.)
   */
  audioDeLaSemana?: { titulo: string; url: string } | null;
  /** Las preguntas a responder cuando hay audio. Fijas, de `spirit/data/preguntasPastilla`. */
  preguntas?: readonly string[];
  onCerrar: () => void;
  /** Se llama con los puntos que otorgó el SERVIDOR, ya cerrado el registro. */
  onCompletado: (puntosOtorgados: number) => void | Promise<void>;
}

type Pestania = 'FOTO' | 'TEXTO' | 'AUDIO' | 'VIDEO';

const PESTANIAS: { clave: Pestania; etiqueta: string; icono: IconName }[] = [
  { clave: 'FOTO', etiqueta: 'FOTO', icono: 'camera' },
  { clave: 'TEXTO', etiqueta: 'TEXTO', icono: 'doc' },
  { clave: 'AUDIO', etiqueta: 'AUDIO', icono: 'volume' },
  { clave: 'VIDEO', etiqueta: 'VIDEO', icono: 'play' },
];


export function EvidenciaHabitoModal({
  registroId,
  sellarPersonalizado,
  titulo,
  contexto,
  audioDeLaSemana,
  preguntas,
  notaInicial,
  onCerrar,
  onCompletado,
}: EvidenciaHabitoModalProps) {
  const { c, t } = useTheme();
  const { rs, horizontalPadding, isTablet, contentMaxWidth } = useResponsive();

  const [pestania, setPestania] = useState<Pestania>('FOTO');
  const [archivo, setArchivo] = useState<ArchivoEvidencia | null>(null);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grabador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estadoGrabador = useAudioRecorderState(grabador);

  /* El reproductor del audio de la semana. Se crea SIEMPRE, con `null` de fuente cuando el hábito
     no tiene audio: los hooks no pueden ir dentro de un `if`, y `expo-audio` acepta `null` como
     fuente válida —el player existe y no carga nada—. Mismo criterio que `PastillaRenacerModal`. */
  const reproductor = useAudioPlayer(audioDeLaSemana?.url ?? null, { updateInterval: 250 });
  const estadoReproductor = useAudioPlayerStatus(reproductor);

  const visible = registroId !== null;

  // Cada vez que se abre para un registro distinto se arranca de cero: si no, la foto elegida
  // para el hábito anterior quedaba cargada y se subía como evidencia de éste.
  useEffect(() => {
    if (!visible) return;
    /* Con audio, la evidencia que se espera es lo que la persona ESCRIBA después de escuchar, no
       una foto: abrir en FOTO la mandaba a buscar una prueba que este hábito no necesita. */
    setPestania(audioDeLaSemana ? 'TEXTO' : 'FOTO');
    setArchivo(null);
    setNota(notaInicial ?? '');
    setError(null);
    setEnviando(false);
  }, [registroId, visible, notaInicial, audioDeLaSemana]);

  /**
   * AGENTS.md §6: el gesto lateral del sistema cierra ESTE modal, nunca la app. Mientras hay
   * una subida en vuelo se consume el gesto sin cerrar — cerrar a mitad de camino dejaría el
   * archivo en S3 y el registro sin completar, que es el peor de los dos estados posibles.
   */
  useSystemBackHandler(
    useCallback(() => {
      if (enviando) return true;
      onCerrar();
      return true;
    }, [enviando, onCerrar]),
    visible,
  );

  const textoUtil = nota.trim();
  /** LA regla del pedido: con UNA de las cuatro alcanza. */
  const puedeSellar = archivo !== null || textoUtil.length > 0;

  const elegir = async (accion: () => Promise<ArchivoEvidencia | null>) => {
    setError(null);
    const elegido = await accion();
    if (elegido) setArchivo(elegido);
  };

  const alternarGrabacion = async () => {
    setError(null);
    if (estadoGrabador.isRecording) {
      await grabador.stop();
      const uri = grabador.uri;
      if (!uri) {
        setError('La grabación no dejó ningún archivo. Inténtalo de nuevo.');
        return;
      }
      setArchivo({
        uri,
        mimeType: mimeDeAudio(uri),
        tipo: 'AUDIO',
        // Solo las FOTO llevan instante de captura (Ley VI); un audio no.
        tomadaEn: null,
        etiqueta: `Audio de ${duracionLegible(estadoGrabador.durationMillis / 1000)}`,
      });
      return;
    }
    const permiso = await requestRecordingPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        'Permiso de micrófono requerido',
        'Renaser necesita el micrófono para que puedas grabar la evidencia de tu hábito.',
      );
      return;
    }
    // `allowsRecording` es obligatorio en iOS: sin él, `record()` no captura nada y el archivo
    // sale mudo sin que ninguna API avise.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await grabador.prepareToRecordAsync();
    grabador.record();
    setArchivo(null);
  };

  /**
   * Los cuatro pasos del camino genérico, en orden. Si el archivo se sube pero falla el
   * `complete`, se avisa y NO se cierra el modal: el aprendiz reintenta sin volver a elegir la
   * foto (el registro ya tiene su evidencia; lo que falta es el cierre, y repetirlo es
   * inofensivo — el backend rechaza completar dos veces).
   */
  const sellar = async () => {
    if (!registroId || !puedeSellar || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      if (sellarPersonalizado) {
        await onCompletado(await sellarPersonalizado({ archivo, texto: textoUtil }));
        return;
      }
      if (archivo) {
        const url = await solicitarUrlSubidaEvidencia(registroId, archivo.mimeType);
        if (almacenamientoSinConfigurar(url.uploadUrl)) {
          throw new Error(ALMACENAMIENTO_SIN_CONFIGURAR);
        }
        await subirArchivoAS3(url.uploadUrl, archivo.uri, archivo.mimeType);
        await confirmarEvidencia(registroId, {
          tipo: archivo.tipo,
          bucket: url.bucket,
          rutaStorage: url.ruta,
        });
      }
      if (textoUtil) {
        await confirmarEvidencia(registroId, { tipo: 'TEXTO', contenidoTexto: textoUtil });
      }
      const registro = await completarRegistro(registroId, textoUtil || null);
      await onCompletado(registro.puntosOtorgados);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo registrar tu evidencia. Intenta de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  const anchoTarjeta = contentMaxWidth;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!enviando) onCerrar();
      }}
    >
      <View style={[estilos.fondo, { paddingHorizontal: horizontalPadding }]}>
        <View
          style={[
            estilos.tarjeta,
            {
              backgroundColor: c.cardBg,
              borderColor: c.gold,
              maxWidth: anchoTarjeta,
              alignSelf: isTablet ? 'center' : 'stretch',
            },
          ]}
        >
          {/* Un ÚNICO contenedor de scroll (AGENTS.md §2): nada de scrolls anidados adentro. */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: rs(12), gap: rs(12) }}
          >
            <View style={{ alignItems: 'center', gap: 2 }}>
              {contexto ? (
                <View style={[estilos.insignia, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 10.5 }]}>
                    {contexto}
                  </Text>
                </View>
              ) : null}
              <Text
                style={[
                  t.screenTitle,
                  { color: c.textStrong, fontSize: rs(17), textAlign: 'center', marginTop: 2 },
                ]}
              >
                {titulo}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 12, textAlign: 'center' }]}>
                {audioDeLaSemana
                  ? 'Escucha el audio y responde las dos preguntas. Con eso queda completado.'
                  : 'Con una sola forma de evidencia alcanza: foto, texto, audio o video.'}
              </Text>
            </View>

            {/* EL AUDIO DE LA SEMANA (2026-09-22). Antes este modal no lo mostraba: le pedía a la
                persona una foto o un video para demostrar que había escuchado un audio que la app
                nunca le decía cuál era. Ahora se reproduce acá mismo, antes de responder. */}
            {audioDeLaSemana ? (
              <View style={[estilos.audioSemana, { borderColor: c.goldInk, backgroundColor: c.goldWash }]}>
                <Pressable
                  onPress={() => (estadoReproductor.playing ? reproductor.pause() : reproductor.play())}
                  accessibilityRole="button"
                  accessibilityLabel={estadoReproductor.playing ? 'Pausar el audio' : 'Reproducir el audio'}
                  style={[estilos.audioBoton, { borderColor: c.goldInk }]}
                >
                  <Icon name={estadoReproductor.playing ? 'pause' : 'play'} size={18} color={c.goldInk} />
                </Pressable>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]}>
                    {audioDeLaSemana.titulo}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 12, marginTop: 2 }]}>
                    {estadoReproductor.isLoaded ? 'Tu audioterapia de esta semana' : 'Cargando el audio…'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Selector de forma de evidencia */}
            <View style={estilos.pestanias}>
              {PESTANIAS.map(p => {
                const activa = pestania === p.clave;
                const cumplida =
                  (p.clave === 'TEXTO' && textoUtil.length > 0) ||
                  (p.clave !== 'TEXTO' && archivo?.tipo === (p.clave === 'FOTO' ? 'FOTO' : p.clave));
                return (
                  <Pressable
                    key={p.clave}
                    onPress={() => setPestania(p.clave)}
                    style={[
                      estilos.pestania,
                      {
                        borderColor: cumplida ? c.success : activa ? c.gold : c.border,
                        backgroundColor: activa ? c.cardBgAlt : 'transparent',
                      },
                    ]}
                  >
                    <Icon name={p.icono} size={16} color={cumplida ? c.success : activa ? c.goldInk : c.textSoft} />
                    <Text
                      style={[
                        t.micro,
                        {
                          color: cumplida ? c.success : activa ? c.textStrong : c.textSoft,
                          fontFamily: 'Jost_700Bold',
                          fontSize: 10.5,
                        },
                      ]}
                    >
                      {cumplida ? `✓ ${p.etiqueta}` : p.etiqueta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {pestania === 'FOTO' ? (
              <View style={{ gap: rs(8) }}>
                <BotonAccion
                  etiqueta="TOMAR FOTO CON LA CÁMARA"
                  icono="camera"
                  onPress={() => elegir(tomarFotoConCamara)}
                />
                <BotonAccion
                  etiqueta="ELEGIR FOTO DE LA GALERÍA"
                  icono="image"
                  onPress={() => elegir(elegirFotoDeGaleria)}
                />
              </View>
            ) : null}

            {pestania === 'VIDEO' ? (
              <View style={{ gap: rs(8) }}>
                <BotonAccion
                  etiqueta="GRABAR VIDEO"
                  icono="play"
                  onPress={() => elegir(grabarVideoConCamara)}
                />
                <BotonAccion
                  etiqueta="ELEGIR VIDEO DE LA GALERÍA"
                  icono="stack"
                  onPress={() => elegir(elegirVideoDeGaleria)}
                />
              </View>
            ) : null}

            {pestania === 'AUDIO' ? (
              <View style={{ gap: rs(8) }}>
                <BotonAccion
                  etiqueta={
                    estadoGrabador.isRecording
                      ? `DETENER  ·  ${duracionLegible(estadoGrabador.durationMillis / 1000)}`
                      : 'GRABAR AUDIO'
                  }
                  icono="volume"
                  destacado={estadoGrabador.isRecording}
                  onPress={() => void alternarGrabacion()}
                />
                <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>
                  Cuenta con tus palabras cómo cumpliste hoy. Toca otra vez para detener.
                </Text>
              </View>
            ) : null}

            {pestania === 'TEXTO' ? (
              <View style={{ gap: 4 }}>
                <MicroLabel>{audioDeLaSemana ? 'Después de escuchar' : 'Registro de verdad'}</MicroLabel>
                {/* Las dos preguntas fijas de D-97, las mismas de la Pastilla Renacer. Se muestran
                    como guía y no como dos campos: la respuesta viaja junta, igual que el
                    `resumen_texto` de Espíritu. */}
                {audioDeLaSemana && preguntas?.length
                  ? preguntas.map(pregunta => (
                      <Text key={pregunta} style={[t.body, { color: c.textSoft, fontSize: 13.5, lineHeight: 19 }]}>
                        · {pregunta}
                      </Text>
                    ))
                  : null}
                <TextInput
                  value={nota}
                  onChangeText={setNota}
                  placeholder={
                    audioDeLaSemana
                      ? 'Responde las dos, en tus palabras.'
                      : '¿Cómo cumpliste tu palabra hoy?'
                  }
                  placeholderTextColor={c.tabInactive}
                  multiline
                  style={[
                    estilos.campo,
                    { color: c.textStrong, borderColor: c.border, backgroundColor: c.cardBgAlt },
                  ]}
                />
                <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>
                  Tu texto vale como evidencia por sí solo. También acompaña a la foto, el audio o
                  el video si subiste alguno.
                </Text>
              </View>
            ) : null}

            {/* Resumen de lo cargado */}
            {archivo ? (
              <View style={[estilos.adjunto, { borderColor: c.success, backgroundColor: c.cardBgAlt }]}>
                <Icon name="checkCircle" size={20} color={c.success} />
                <Text
                  style={[t.micro, { color: c.textStrong, fontSize: 12.5, flexShrink: 1 }]}
                  numberOfLines={2}
                >
                  {archivo.etiqueta}
                </Text>
                <Pressable
                  onPress={() => setArchivo(null)}
                  hitSlop={10}
                  style={[estilos.quitar, { borderColor: c.border }]}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 10.5 }]}>
                    QUITAR
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {error ? (
              <View style={[estilos.error, { borderColor: c.danger }]}>
                <Text style={[t.micro, { color: c.danger, fontSize: 12.5 }]}>{error}</Text>
              </View>
            ) : null}

            <GoldButton
              label={enviando ? 'REGISTRANDO…' : '✓ SELLAR EVIDENCIA Y COMPLETAR'}
              onPress={() => void sellar()}
              loading={enviando}
              disabled={!puedeSellar || enviando}
              style={{ marginTop: 4 }}
            />
            {!puedeSellar ? (
              <Text style={[t.micro, { color: c.textSoft, fontSize: 12, textAlign: 'center' }]}>
                Sube una foto, un audio o un video — o escribe tu registro. Con uno alcanza.
              </Text>
            ) : null}

            <Pressable
              onPress={() => {
                if (!enviando) onCerrar();
              }}
              disabled={enviando}
              style={[estilos.cerrar, { borderColor: c.border, opacity: enviando ? 0.4 : 1 }]}
            >
              {enviando ? (
                <ActivityIndicator size="small" color={c.textSoft} />
              ) : (
                <Text
                  style={[
                    t.micro,
                    { color: c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 11.5, textAlign: 'center' },
                  ]}
                >
                  CANCELAR
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Botón de acción de 52px — el mínimo cómodo de una mano que fija AGENTS.md §4. */
function BotonAccion({
  etiqueta,
  icono,
  onPress,
  destacado,
}: {
  etiqueta: string;
  icono: IconName;
  onPress: () => void;
  destacado?: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        estilos.accion,
        {
          borderColor: destacado ? c.danger : c.borderStrong,
          backgroundColor: c.cardBgAlt,
        },
      ]}
    >
      <Icon name={icono} size={18} color={destacado ? c.danger : c.goldInk} />
      <Text
        style={[
          t.micro,
          { color: c.textStrong, fontFamily: 'Jost_700Bold', fontSize: 12.5, flexShrink: 1 },
        ]}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tarjeta: {
    width: '100%',
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  /** La fila del audio de la semana: botón redondo de play + título. */
  audioSemana: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  audioBoton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insignia: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pestanias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pestania: {
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  accion: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  campo: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    textAlignVertical: 'top',
  },
  adjunto: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quitar: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  error: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cerrar: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
