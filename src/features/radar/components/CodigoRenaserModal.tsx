import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { SliderRating } from '../../../components/SliderRating';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { ahoraConfiable } from '../../../services/http/relojServidor';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import {
  CONFIG_RADAR,
  ENERGIA_MAXIMA,
  ENERGIA_MINIMA,
  MAXIMO_CARACTERES,
  PREGUNTAS_RADAR,
  type CampoRadar,
} from '../config/configRadar';
import { borrarBorrador, guardarBorrador, leerBorrador, limpiarBorradoresViejos } from '../storage/borradorRadar';
import type { CheckInRadarApi } from '../types/radar.types';
import type { SlotRadar } from '../utils/slotsDelRadar';

/**
 * Las cinco preguntas del Código Renaser, a PANTALLA COMPLETA.
 *
 * Las preguntas y sus límites no se inventan acá: salen de `config/configRadar.ts`, que copia los
 * del dominio (`RegistroRadar`: textos de 2 000, energía 1-10). Agregar o quitar una pregunta es
 * tocar el contrato del backend, no este archivo.
 *
 * ## Obligatorio vs. opcional
 *
 * La misma pantalla para todos; cambia la salida:
 *
 *  - **`obligatorio`** (aprendiz) — sin botón de cerrar, el retroceso del sistema no la descarta
 *    y, al vivir por encima del navegador (`CodigoRenaserOverlay`), tampoco se escapa cambiando
 *    de pestaña. La única salida es registrar.
 *  - **opcional** (el resto del staff) — idéntica, con una X arriba a la derecha y el retroceso
 *    funcionando. Se vuelve a ofrecer en el slot siguiente.
 *
 * Bloquear el retroceso es exactamente lo que `useSystemBackHandler` permite: devolver `true` sin
 * hacer nada consume el evento, así que el gesto lateral de Android y el botón físico no sacan a
 * nadie de acá ni cierran la app.
 */
export function CodigoRenaserModal({
  visible,
  slot,
  obligatorio,
  usuarioId,
  enviando,
  error,
  onEnviar,
  onCerrar,
  onLimpiarError,
}: {
  visible: boolean;
  /** El slot que se está respondiendo. `null` mientras no hay ninguno abierto. */
  slot: SlotRadar | null;
  /** `true` = no se puede salir sin registrar. */
  obligatorio: boolean;
  /** De quién es el borrador. Sin sesión no se guarda nada. */
  usuarioId: string | null;
  enviando: boolean;
  error: string | null;
  onEnviar: (checkIn: CheckInRadarApi) => Promise<boolean>;
  onCerrar: () => void;
  onLimpiarError: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isShort } = useResponsive();

  const [respuestas, setRespuestas] = useState<Record<CampoRadar, string>>({
    whatAmIDoing: '',
    whatAmIThinking: '',
    whatAmIFeeling: '',
    whatAmIAvoiding: '',
  });
  const [energia, setEnergia] = useState<number | null>(null);
  const [intentoEnvio, setIntentoEnvio] = useState(false);

  /* Se empieza en blanco AL ABRIR, y sólo al abrir.

     La versión anterior también borraba al cambiar `slot.hora`, y eso era un bug con dientes: a
     las 11:00:00 en punto, a quien estuviera escribiendo desde las 10:55 se le vaciaban los
     cuatro campos de golpe, sin aviso y sin forma de recuperarlos. Con doce formularios al día
     durante siete días, alguien iba a estar tecleando justo en ese segundo.

     Que el texto sobreviva al cambio de hora no falsea nada: el registro se guarda con la hora
     del SERVIDOR, así que lo escrito a las 10:58 y enviado a las 11:00 queda donde de verdad
     pasó. Y la cabecera sí se actualiza sola, porque lee el slot en vivo — la persona ve que ya
     es el registro de las 11:00. `esperandoRespuesta` evita el otro extremo: que reabrir el
     formulario en la hora siguiente muestre lo que se escribió en la anterior. */
  const estabaVisible = useRef(false);
  useEffect(() => {
    const seAcabaDeAbrir = visible && !estabaVisible.current;
    estabaVisible.current = visible;
    if (!seAcabaDeAbrir) return;
    setRespuestas({ whatAmIDoing: '', whatAmIThinking: '', whatAmIFeeling: '', whatAmIAvoiding: '' });
    setEnergia(null);
    setIntentoEnvio(false);
    onLimpiarError();

    /* Y se intenta recuperar lo que hubiera quedado a medias en ESTA misma franja: un envío que
       falló por falta de red, o la app cerrada a la fuerza. El borrador es de esta hora y de nadie
       más, así que si existe es exactamente lo que la persona estaba escribiendo. */
    if (!usuarioId) return;
    let vigente = true;
    const momento = ahoraConfiable();
    void limpiarBorradoresViejos(usuarioId, momento);
    void leerBorrador(usuarioId, momento).then(borrador => {
      if (!vigente || !borrador) return;
      setRespuestas(borrador.respuestas);
      setEnergia(borrador.energia);
    });
    return () => {
      vigente = false;
    };
  }, [visible, usuarioId, onLimpiarError]);

  /* Se guarda con retardo y no en cada tecla: escribir cuatro textos largos serían cientos de
     escrituras a disco por formulario. Un segundo de margen basta para que nada real se pierda. */
  useEffect(() => {
    if (!visible || !usuarioId) return;
    const id = setTimeout(() => {
      void guardarBorrador(usuarioId, ahoraConfiable(), { respuestas, energia });
    }, 1_000);
    return () => clearTimeout(id);
  }, [visible, usuarioId, respuestas, energia]);

  /* Devolver `true` SIN cerrar consume el evento: ni el botón físico ni el gesto lateral sacan de
     acá, y tampoco cierran la app (que es lo que pasaría si devolviéramos `false`). */
  useSystemBackHandler(() => {
    if (!obligatorio) onCerrar();
    return true;
  }, visible);

  const escribir = useCallback((campo: CampoRadar, texto: string) => {
    setRespuestas(previas => ({ ...previas, [campo]: texto.slice(0, MAXIMO_CARACTERES) }));
  }, []);

  const faltantes = useMemo(() => {
    const sinTexto = PREGUNTAS_RADAR.filter(p => respuestas[p.campo].trim().length === 0).length;
    return sinTexto + (energia === null ? 1 : 0);
  }, [respuestas, energia]);

  const completo = faltantes === 0;

  const enviar = useCallback(async () => {
    setIntentoEnvio(true);
    if (!completo || energia === null) return;
    const ok = await onEnviar({
      whatAmIDoing: respuestas.whatAmIDoing.trim(),
      whatAmIThinking: respuestas.whatAmIThinking.trim(),
      whatAmIFeeling: respuestas.whatAmIFeeling.trim(),
      energyLevel: energia,
      whatAmIAvoiding: respuestas.whatAmIAvoiding.trim(),
    });
    if (ok) {
      if (usuarioId) void borrarBorrador(usuarioId, ahoraConfiable());
      onCerrar();
    }
  }, [completo, energia, respuestas, usuarioId, onEnviar, onCerrar]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      // Android dispara esto con el gesto/botón atrás. Cuando es innegociable NO cierra —el
      // manejador de arriba ya consumió el evento— y acá se deja explícito para que nadie
      // "arregle" el modal agregando un cierre por este camino.
      onRequestClose={obligatorio ? () => {} : onCerrar}
    >
      <SafeAreaView style={[styles.pantalla, { backgroundColor: c.bg }]}>
        {/* Cuatro campos de texto largos: en iOS el teclado tapa los de abajo y no hay forma de
            ver lo que se escribe. Mismo patrón que el resto de la app (ImageViewerModal,
            LoginScreen): en Android el ajuste lo hace el sistema, por eso va `undefined`. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.columna, { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding }]}
        >
          <View style={styles.encabezado}>
            <View style={{ flex: 1, gap: 3 }}>
              <MicroLabel>
                {slot ? `CÓDIGO RENASER · ${slot.etiqueta}` : 'CÓDIGO RENASER'}
                {obligatorio ? ' · INNEGOCIABLE' : ''}
              </MicroLabel>
              <Text style={[t.screenTitle, { color: c.text, fontSize: isShort ? 20 : 24 }]}>
                ¿Dónde estás ahora mismo?
              </Text>
            </View>
            {!obligatorio ? (
              <Pressable
                onPress={onCerrar}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={[styles.cerrar, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
              >
                <Icon name="close" size={16} color={c.textSoft} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[t.body, { color: c.textSoft, fontSize: 13.5, lineHeight: 20 }]}>
              {slot
                ? `Responde con lo que hay, no con lo que debería haber. Este registro es el de las ${slot.etiqueta} y se cierra a las ${slot.cierraA}.`
                : 'Responde con lo que hay, no con lo que debería haber.'}
            </Text>

            {PREGUNTAS_RADAR.map(pregunta => {
              const valor = respuestas[pregunta.campo];
              const vacioYMarcado = intentoEnvio && valor.trim().length === 0;
              return (
                <View key={pregunta.campo} style={{ gap: 6 }}>
                  <Text style={[t.cardTitle, { color: c.text, fontSize: 15.5 }]}>{pregunta.titulo}</Text>
                  <Text style={[t.micro, { color: c.micro, fontSize: 11.5 }]}>{pregunta.ayuda}</Text>
                  <TextInput
                    value={valor}
                    onChangeText={texto => escribir(pregunta.campo, texto)}
                    placeholder={pregunta.marcador}
                    placeholderTextColor={c.micro}
                    multiline
                    editable={!enviando}
                    style={[
                      styles.campo,
                      {
                        color: c.text,
                        backgroundColor: c.cardBgAlt,
                        borderColor: vacioYMarcado ? '#E06A66' : c.border,
                      },
                    ]}
                    accessibilityLabel={pregunta.titulo}
                  />
                </View>
              );
            })}

            <SliderRating
              label="NIVEL DE ENERGÍA"
              value={energia}
              onChange={setEnergia}
              minLabel={`En reserva (${ENERGIA_MINIMA})`}
              maxLabel={`A tope (${ENERGIA_MAXIMA})`}
            />

            {error ? (
              <View style={[styles.aviso, { borderColor: '#E06A66', backgroundColor: c.dangerWash }]}>
                <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>{error}</Text>
              </View>
            ) : intentoEnvio && !completo ? (
              <View style={[styles.aviso, { borderColor: '#E06A66', backgroundColor: c.dangerWash }]}>
                <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>
                  {faltantes === 1
                    ? 'Falta 1 respuesta. Las cinco son obligatorias.'
                    : `Faltan ${faltantes} respuestas. Las cinco son obligatorias.`}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.pie}>
            <GoldButton
              label={enviando ? 'Guardando…' : 'Registrar'}
              onPress={() => void enviar()}
              loading={enviando}
              disabled={enviando}
            />
            <Text style={[t.micro, { color: c.micro, fontSize: 11, textAlign: 'center' }]}>
              {obligatorio
                ? `Se pide una vez por hora durante los primeros ${CONFIG_RADAR.ultimoDia} días.`
                : 'Puedes cerrarlo; vuelve a ofrecerse la hora que viene.'}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  columna: { flex: 1, width: '100%', alignSelf: 'center', paddingTop: 10, paddingBottom: 14 },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  cerrar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  contenido: { gap: 18, paddingBottom: 24 },
  campo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    minHeight: 76,
    fontFamily: 'Jost_400Regular',
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  aviso: { borderWidth: 1, borderRadius: 12, padding: 12 },
  pie: { gap: 8, paddingTop: 10 },
});
