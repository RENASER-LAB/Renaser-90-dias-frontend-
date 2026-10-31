import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useAltoMaximoDelCuerpo } from '../../../components/hojaDesdeAbajo/altoDelCuerpo';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useTheme } from '../../../theme/ThemeContext';
import { completarRegistro, confirmarEvidencia } from '../../habits/api/evidenciaHabitoApi';
import { obtenerTracksDeHoy } from '../../habits/api/habitsApi';
import { DiaDeHabitosCambiadoError } from '../../habits/api/registroVigente';
import {
  MAXIMO_RESPUESTA_DEL_REGISTRO,
  PREGUNTA_DEL_RITUAL,
  registrarConTexto,
  type ResultadoDelRegistro,
} from '../../habits/utils/registroConFoto';

/**
 * El registro de un ritual (Ritual Tierra - Agua - Fuego, mañana / mediodía / noche): SOLO TEXTO, sin cámara (2026-10-31, pedido
 * del dueño). Una hoja con la pregunta «¿Cómo te sientes después de realizar el ritual?», obligatoria, y «Enviar» fijo abajo.
 *
 * Al enviar se registra la respuesta como evidencia de TEXTO y se cierra el registro con esa misma respuesta, por los mismos
 * pasos de siempre (`confirmarEvidencia` y `completarRegistro`, que emite `habitoCumplido`): lo que cambia es que no hay foto.
 * Los dos pasos comprueban que el registro siga siendo de HOY antes de escribir (`ejecutarEnRegistroVigente`, spec 002): si pasó
 * la medianoche no se manda nada, se avisa y se recarga.
 *
 * - **No se pierde lo escrito:** cerrar la hoja (arrastrar, ✕, atrás) guarda el borrador en memoria por registro; se borra al enviar.
 * - **No se duplica la evidencia:** si el texto ya se guardó y el cierre falló, reintentar solo vuelve a cerrar.
 * - **Un doble toque** en «Enviar» manda un solo pedido.
 * - **Movimiento:** ninguno propio (la hoja trae el suyo). El campo no se anima.
 */

/** Lo escrito de cada registro que se cerró sin enviar: vive mientras la app esté abierta. */
const borradores = new Map<string, string>();
/** Registros cuyo texto ya quedó guardado en el servidor pero cuyo cierre falló: no se vuelve a subir. */
const conEvidenciaYaGuardada = new Set<string>();

const TEXTO_DEL_BOTON = { fontSize: 16, letterSpacing: 0 } as const;
const RESERVA_CABECERA_Y_PIE = 230;
/** Desde cuántos caracteres se muestra el contador («3 600 de 4 000»). */
const DESDE_DONDE_SE_CUENTA = Math.floor(MAXIMO_RESPUESTA_DEL_REGISTRO * 0.85);

export function RegistroDeRitualConTexto({
  visible,
  registroId,
  titulo,
  alCerrar,
  alTerminarDeCerrar,
  alCompletado,
  alCambiarElDia,
}: {
  visible: boolean;
  registroId: string | null;
  titulo: string;
  alCerrar: () => void;
  alTerminarDeCerrar?: () => void;
  /** El servidor cerró el registro: quien monta marca la tarjeta y avisa. */
  alCompletado: (registroId: string, resultado: ResultadoDelRegistro) => void;
  /** Pasó la medianoche con la hoja abierta: nada se mandó; quien monta recarga los hábitos. */
  alCambiarElDia: () => void;
}) {
  const { c, t } = useTheme();
  const altoMaximo = useAltoMaximoDelCuerpo(RESERVA_CABECERA_Y_PIE);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);

  // Al abrir (o al cambiar de registro): lo que se había escrito de ESE registro, y sin el error de antes.
  useEffect(() => {
    if (!visible || !registroId) return;
    setTexto(borradores.get(registroId) ?? '');
    setError(null);
  }, [visible, registroId]);

  const escrito = texto.trim();
  const puedeEnviar = registroId !== null && escrito.length > 0 && !enviando;

  const cambiar = (nuevo: string) => {
    setTexto(nuevo);
    if (error) setError(null);
    if (registroId) {
      if (nuevo.trim()) borradores.set(registroId, nuevo);
      else borradores.delete(registroId);
    }
  };

  const enviar = async () => {
    if (!registroId || enCurso.current || !escrito) return;
    enCurso.current = true;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await registrarConTexto(
        { registroId, respuesta: texto, evidenciaYaSubida: conEvidenciaYaGuardada.has(registroId) },
        () => conEvidenciaYaGuardada.add(registroId),
        {
          subirTexto: (id, respuesta) => confirmarEvidencia(id, { tipo: 'TEXTO', contenidoTexto: respuesta }),
          completar: (id, respuesta) => completarRegistro(id, respuesta),
          tracksDeHoy: obtenerTracksDeHoy,
        },
      );
      borradores.delete(registroId);
      conEvidenciaYaGuardada.delete(registroId);
      alCompletado(registroId, resultado);
    } catch (e) {
      if (e instanceof DiaDeHabitosCambiadoError) {
        borradores.delete(registroId);
        conEvidenciaYaGuardada.delete(registroId);
        setError(e.message);
        alCambiarElDia();
      } else {
        setError(mensajeDeError(e, 'No pudimos registrar tu ritual. Intenta de nuevo en un momento.'));
      }
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      alTerminarDeCerrar={alTerminarDeCerrar}
      titulo={titulo}
      etiquetaCerrar="Cerrar el registro del ritual"
      pie={
        <GoldButton
          label={enviando ? 'Enviando…' : 'Enviar'}
          onPress={() => void enviar()}
          loading={enviando}
          disabled={!puedeEnviar}
          textStyle={TEXTO_DEL_BOTON}
        />
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: altoMaximo }}
        contentContainerStyle={estilos.cuerpo}
      >
        <Text accessibilityRole="header" style={[t.cardTitle, estilos.pregunta, { color: c.textStrong }]}>
          {PREGUNTA_DEL_RITUAL}
        </Text>
        <TextInput
          value={texto}
          onChangeText={cambiar}
          placeholder="Cuéntalo con tus palabras"
          placeholderTextColor={c.tabInactive}
          accessibilityLabel={PREGUNTA_DEL_RITUAL}
          multiline
          maxLength={MAXIMO_RESPUESTA_DEL_REGISTRO}
          editable={!enviando}
          style={[estilos.campo, { color: c.textStrong, borderColor: error ? c.danger : c.border, backgroundColor: c.cardBgAlt }]}
        />
        {texto.length >= DESDE_DONDE_SE_CUENTA ? (
          <Text style={[t.small, estilos.contador, { color: c.textSoft }]} accessibilityLiveRegion="polite">
            {texto.length} de {MAXIMO_RESPUESTA_DEL_REGISTRO} caracteres
          </Text>
        ) : null}
        {error ? (
          <View accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Text style={[t.body, { color: c.danger }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  pregunta: { fontSize: 18, lineHeight: 25, fontFamily: fuentes.negrita },
  campo: {
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fuentes.regular,
    textAlignVertical: 'top',
  },
  contador: { textAlign: 'right', fontVariant: ['tabular-nums'] },
});
