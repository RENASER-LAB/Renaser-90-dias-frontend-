import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { useTheme } from '../../../theme/ThemeContext';
import { useGrabadorDeVoz } from '../../../hooks/useGrabadorDeVoz';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, IconName, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useAltoMaximoDelCuerpo } from '../../../components/hojaDesdeAbajo/altoDelCuerpo';
import { mensajeDeError } from '../../../services/http/apiClient';
import {
  completarRegistro,
  confirmarEvidencia,
  subirEvidenciaDeArchivo,
} from '../api/evidenciaHabitoApi';
import {
  formatoKm,
  leerKilometros,
  PREGUNTA_DE_KILOMETROS,
  totalConHoy,
  type MedicionPedida,
} from '../utils/registroConFoto';
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
 *
 * ## Hoja desde abajo (rediseño de Training, 2026-10-05)
 *
 * Era una ventana centrada con borde dorado, cuatro pestañas hechas a mano en versalitas (con un
 * parlante para «grabar audio» y un ▶ para «subir video») y «CANCELAR». Ahora es la `HojaDesdeAbajo`
 * de la app: Foto / Texto / Audio / Video en un `ControlSegmentado`, las acciones con el ícono de lo
 * que hacen (`camera`, `image`, `mic`, `video`), «Entregar evidencia» fijo abajo y la ✕ arriba.
 *
 * **Cerrar no pierde nada.** Una hoja se cierra con un gesto (arrastrarla, tocar el fondo), así que:
 * lo elegido se conserva si se vuelve a abrir el MISMO registro; y si se cierra mientras se envía,
 * el envío sigue (la respuesta marca la tarjeta igual) y un error, que ya no tiene dónde verse, sale
 * en un diálogo.
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
   * D-226: el registro pide los km del día (KILÓMETROS DIARIOS). Es el camino de la web, donde
   * Training no abre la cámara directa: se pide el número acá, junto a la evidencia.
   */
  medicion?: MedicionPedida | null;
  onCerrar: () => void;
  /** Se llama con los puntos que otorgó el SERVIDOR, ya cerrado el registro. */
  onCompletado: (puntosOtorgados: number) => void | Promise<void>;
}

type Pestania = 'FOTO' | 'TEXTO' | 'AUDIO' | 'VIDEO';

const PESTANIAS: { valor: Pestania; etiqueta: string }[] = [
  { valor: 'FOTO', etiqueta: 'Foto' },
  { valor: 'TEXTO', etiqueta: 'Texto' },
  { valor: 'AUDIO', etiqueta: 'Audio' },
  { valor: 'VIDEO', etiqueta: 'Video' },
];

/** El ícono de lo que ya se cargó: la foto, el audio, el video. */
const ICONO_DEL_ADJUNTO: Record<string, IconName> = { FOTO: 'image', AUDIO: 'audioLines', VIDEO: 'video' };

/** Los botones de la hoja, en tipo oración y a tamaño de lectura. */
const TEXTO_DE_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/** Lo que ocupan la cabecera y el pie de esta hoja: el resto es para el cuerpo desplazable. */
const RESERVA_CABECERA_Y_PIE = 230;


export function EvidenciaHabitoModal({
  registroId,
  sellarPersonalizado,
  titulo,
  contexto,
  notaInicial,
  medicion = null,
  onCerrar,
  onCompletado,
}: EvidenciaHabitoModalProps) {
  const { c, t } = useTheme();
  const altoMaximo = useAltoMaximoDelCuerpo(RESERVA_CABECERA_Y_PIE);

  const [pestania, setPestania] = useState<Pestania>('FOTO');
  const [archivo, setArchivo] = useState<ArchivoEvidencia | null>(null);
  const [nota, setNota] = useState('');
  const [kmTexto, setKmTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se crea al tocar «grabar», no al montar Training (el modal vive montado): mismo riesgo que E-424.
  const grabador = useGrabadorDeVoz();

  const visible = registroId !== null;
  /** Si la hoja está a la vista ahora (lo lee un envío que terminó después de cerrarla). */
  const abierta = useRef(visible);
  abierta.current = visible;
  /** El último registro que se abrió: volver a abrir ese mismo conserva lo elegido. */
  const ultimoRegistro = useRef<string | null>(null);

  // Cada vez que se abre para un registro DISTINTO se arranca de cero: si no, la foto elegida
  // para el hábito anterior quedaba cargada y se subía como evidencia de éste. Reabrir el mismo
  // (se cerró la hoja sin querer, 2026-10-05) conserva la foto, el texto y los km.
  useEffect(() => {
    if (!visible || registroId === ultimoRegistro.current) return;
    ultimoRegistro.current = registroId;
    setPestania('FOTO');
    setArchivo(null);
    setNota(notaInicial ?? '');
    setKmTexto('');
    setError(null);
    setEnviando(false);
  }, [registroId, visible, notaInicial]);

  /*
   * AGENTS.md §6: el gesto lateral del sistema cierra la hoja, nunca la app. Lo cablea la propia
   * `HojaDesdeAbajo` (el atrás de Android cierra su `Modal`). Antes, con una subida en vuelo, el
   * gesto se consumía sin cerrar; ahora la hoja se puede cerrar igual (también arrastrándola) y la
   * subida sigue: ver `sellar`.
   */

  const textoUtil = nota.trim();
  /** D-226: los km escritos, ya como número (coma o punto). `null` = no hay un número válido. */
  const km = medicion ? leerKilometros(kmTexto) : null;
  /** LA regla del pedido: con UNA de las cuatro alcanza. Y si pide km, además un número válido. */
  const puedeSellar = (archivo !== null || textoUtil.length > 0) && (!medicion || km !== null);

  const elegir = async (accion: () => Promise<ArchivoEvidencia | null>) => {
    setError(null);
    const elegido = await accion();
    if (elegido) setArchivo(elegido);
  };

  const alternarGrabacion = async () => {
    setError(null);
    if (grabador.grabando) {
      const grabacion = await grabador.terminar();
      if (!grabacion?.uri) {
        setError('La grabación no dejó ningún archivo. Inténtalo de nuevo.');
        return;
      }
      setArchivo({
        uri: grabacion.uri,
        mimeType: mimeDeAudio(grabacion.uri),
        tipo: 'AUDIO',
        // Solo las FOTO llevan instante de captura (Ley VI); un audio no.
        tomadaEn: null,
        etiqueta: `Audio de ${duracionLegible(grabacion.durationMillis / 1000)}`,
      });
      return;
    }
    const inicio = await grabador.empezar();
    if (inicio === 'sin-permiso') {
      Alert.alert(
        'Permiso de micrófono requerido',
        'Renaser necesita el micrófono para que puedas grabar la evidencia de tu hábito.',
      );
      return;
    }
    if (inicio === 'no-disponible') {
      setError('No se pudo usar el micrófono. Intenta de nuevo en un momento.');
      return;
    }
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
        // Pasos 1-3, compartidos con el registro con foto (`subirEvidenciaDeArchivo`).
        await subirEvidenciaDeArchivo(registroId, archivo);
      }
      if (textoUtil) {
        await confirmarEvidencia(registroId, { tipo: 'TEXTO', contenidoTexto: textoUtil });
      }
      const registro = await completarRegistro(registroId, textoUtil || null, km);
      await onCompletado(registro.puntosOtorgados);
    } catch (e) {
      const mensaje = mensajeDeError(e, 'No se pudo registrar tu evidencia. Intenta de nuevo.');
      setError(mensaje);
      // La hoja ya se cerró: el error no tendría dónde verse. Lo elegido sigue cargado al reabrirla.
      if (!abierta.current) Alert.alert('No se pudo registrar tu evidencia', mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const iconoAdjunto = archivo ? ICONO_DEL_ADJUNTO[archivo.tipo] ?? 'checkCircle' : null;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      titulo={titulo}
      subtitulo={contexto}
      etiquetaCerrar="Cerrar la evidencia"
      pie={
        <View style={{ gap: 8 }}>
          {!puedeSellar && medicion && (archivo !== null || textoUtil.length > 0) ? (
            <Text style={[t.small, { color: c.textSoft, textAlign: 'center' }]}>
              Escribe los km de hoy (más que cero).
            </Text>
          ) : null}
          <GoldButton
            label={enviando ? 'Entregando…' : 'Entregar evidencia'}
            onPress={() => void sellar()}
            loading={enviando}
            disabled={!puedeSellar || enviando}
            textStyle={TEXTO_DE_BOTON}
          />
        </View>
      }
    >
      {/* Un ÚNICO contenedor de scroll (AGENTS.md §2): nada de scrolls anidados adentro. Con tope
          de alto, para que el teclado no empuje el botón fuera de la hoja. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: altoMaximo }}
        contentContainerStyle={estilos.cuerpo}
      >
        {/* «Con uno alcanza» se dice UNA vez, acá (antes, también debajo del botón). */}
        <Text style={[t.small, { color: c.textSoft }]}>
          Con una forma alcanza: foto, texto, audio o video.
        </Text>

        <ControlSegmentado
          opciones={PESTANIAS}
          valor={pestania}
          onCambiar={setPestania}
          accessibilityLabel="Forma de la evidencia"
        />

        {pestania === 'FOTO' ? (
          <View style={{ gap: 8 }}>
            <BotonAccion etiqueta="Tomar foto" icono="camera" onPress={() => elegir(tomarFotoConCamara)} />
            <BotonAccion etiqueta="Elegir de la galería" icono="image" onPress={() => elegir(elegirFotoDeGaleria)} />
          </View>
        ) : null}

        {pestania === 'VIDEO' ? (
          <View style={{ gap: 8 }}>
            <BotonAccion etiqueta="Grabar video" icono="video" onPress={() => elegir(grabarVideoConCamara)} />
            <BotonAccion etiqueta="Elegir de la galería" icono="image" onPress={() => elegir(elegirVideoDeGaleria)} />
          </View>
        ) : null}

        {pestania === 'AUDIO' ? (
          <View style={{ gap: 8 }}>
            {/* Un micrófono para GRABAR (antes, el parlante de «escuchar»). */}
            <BotonAccion
              etiqueta={
                grabador.grabando
                  ? `Terminar · ${duracionLegible(grabador.durationMillis / 1000)}`
                  : 'Grabar audio'
              }
              icono="mic"
              destacado={grabador.grabando}
              onPress={() => void alternarGrabacion()}
            />
            <Text style={[t.small, { color: c.textSoft }]}>
              Cuenta cómo cumpliste hoy. Toca otra vez para terminar.
            </Text>
          </View>
        ) : null}

        {pestania === 'TEXTO' ? (
          <View style={{ gap: 6 }}>
            <Text style={[t.body, estilos.rotulo, { color: c.textStrong }]}>Tu registro</Text>
            <TextInput
              value={nota}
              onChangeText={setNota}
              placeholder="¿Cómo cumpliste tu palabra hoy?"
              placeholderTextColor={c.tabInactive}
              accessibilityLabel="Tu registro"
              multiline
              style={[
                estilos.campo,
                { color: c.textStrong, borderColor: c.border, backgroundColor: c.cardBgAlt },
              ]}
            />
            <Text style={[t.small, { color: c.textSoft }]}>
              Vale solo, o junto a la foto, el audio o el video.
            </Text>
          </View>
        ) : null}

        {/* Lo cargado, con el ícono de lo que es y una papelera para quitarlo. */}
        {archivo && iconoAdjunto ? (
          <View style={[estilos.adjunto, { borderColor: c.success, backgroundColor: c.successWash }]}>
            <Icon name={iconoAdjunto} size={TAMANO_ICONO.normal} color={c.success} />
            <Text style={[t.body, { color: c.textStrong, flexShrink: 1, flex: 1 }]} numberOfLines={2}>
              {archivo.etiqueta}
            </Text>
            <Presionable
              onPress={() => setArchivo(null)}
              accessibilityRole="button"
              accessibilityLabel="Quitar lo que elegiste"
              style={estilos.quitar}
            >
              <Icon name="trash" size={TAMANO_ICONO.normal} color={c.textSoft} />
            </Presionable>
          </View>
        ) : null}

        {medicion ? (
          <View style={{ gap: 6 }}>
            <Text style={[t.body, estilos.rotulo, { color: c.textStrong }]}>{PREGUNTA_DE_KILOMETROS}</Text>
            <TextInput
              value={kmTexto}
              onChangeText={setKmTexto}
              placeholder="0,0 km"
              placeholderTextColor={c.tabInactive}
              keyboardType="decimal-pad"
              inputMode="decimal"
              maxLength={6}
              editable={!enviando}
              accessibilityLabel={PREGUNTA_DE_KILOMETROS}
              style={[
                estilos.campoKm,
                { color: c.textStrong, borderColor: c.border, backgroundColor: c.cardBgAlt },
              ]}
            />
            <Text style={[t.small, { color: c.textSoft }]}>
              Total recorrido: {formatoKm(totalConHoy(medicion, kmTexto))} km
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={[estilos.error, { borderColor: c.danger, backgroundColor: c.dangerWash }]}>
            <Text style={[t.small, { color: c.danger }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

/**
 * Botón de acción de 52px — el mínimo cómodo de una mano que fija AGENTS.md §4. Ícono de 20 y texto
 * a 16 en tipo oración (eran versalitas de 12,5); se hunde al tocarlo.
 */
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
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        estilos.accion,
        {
          borderColor: destacado ? c.danger : c.borderStrong,
          backgroundColor: c.cardBgAlt,
        },
      ]}
    >
      <Icon name={icono} size={TAMANO_ICONO.normal} color={destacado ? c.danger : c.goldInk} />
      <Text style={[t.body, estilos.rotulo, { color: c.textStrong, flexShrink: 1 }]}>{etiqueta}</Text>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  cuerpo: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  rotulo: {
    fontSize: 16,
    fontFamily: 'Jost_500Medium',
  },
  accion: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  campoKm: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 20,
    fontFamily: 'Jost_500Medium',
  },
  campo: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Jost_400Regular',
    textAlignVertical: 'top',
  },
  adjunto: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
    minHeight: 52,
  },
  quitar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
