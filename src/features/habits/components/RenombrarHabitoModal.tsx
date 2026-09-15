import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../../../components/FormField';
import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { VeloModal } from '../../../components/VeloModal';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import {
  errorDeMotivo,
  errorDeTituloPersonal,
  MAXIMO_MOTIVO,
  MAXIMO_TITULO_PERSONAL,
} from '../utils/renombreDeHabito';

/**
 * Ponerle otro nombre a un hábito de bebida. Es de UNO SOLO: nadie más ve el cambio.
 *
 * ## Por qué el motivo se pide así y no como un formulario
 *
 * El backend lo exige (`@NotBlank`), pero para quien lo escribe no es un campo de trámite: es
 * "¿por qué te queda mejor así?". Por eso la etiqueta está en esa forma y el texto de ayuda dice
 * en una línea para qué sirve, en vez de un asterisco de obligatorio. Son dos campos, no seis.
 *
 * ## Los límites se validan acá Y allá
 *
 * 60 y 200 caracteres son los del backend (`RenombreHabito`). Validarlos mientras se escribe evita
 * el viaje de red que termina en 400 con el texto ya tipeado. `maxLength` además impide pasarse.
 *
 * ## El botón de quitar
 *
 * Solo aparece si el hábito YA tiene un nombre propio. Devuelve el título del catálogo
 * (`DELETE .../rename`), y pasada la ventana de renombre el backend lo rechaza igual que al
 * cambio — por eso este modal no se abre fuera de esa ventana (lo decide quien lo monta).
 *
 * No se cierra tocando fuera **cuando hay texto escrito**: perder el motivo a medio escribir por
 * un toque al borde es justo lo que advierte `VeloModal` en su propia documentación.
 */

interface RenombrarHabitoModalProps {
  visible: boolean;
  /** El título del CATÁLOGO — el que la persona está reemplazando. */
  tituloCatalogo: string;
  /** El nombre propio que ya tenía, o `null` si nunca renombró este hábito. */
  tituloActual: string | null;
  /** Renombra en el backend. Rechaza con el mensaje del servidor si no se pudo. */
  onGuardar: (tituloPersonal: string, motivo: string) => Promise<void>;
  /** Vuelve al título del catálogo. `undefined` = no se ofrece quitar (nunca lo renombró). */
  onQuitar?: () => Promise<void>;
  onCerrar: () => void;
}

export function RenombrarHabitoModal({
  visible,
  tituloCatalogo,
  tituloActual,
  onGuardar,
  onQuitar,
  onCerrar,
}: RenombrarHabitoModalProps) {
  const { c, t } = useTheme();
  const { horizontalPadding } = useResponsive();

  const [titulo, setTitulo] = useState('');
  const [motivo, setMotivo] = useState('');
  /** `true` recién cuando intentó guardar: no se le marca en rojo un campo que todavía no tocó. */
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  // Cada apertura arranca del nombre que el hábito tiene HOY, no de lo que quedó de la vez
  // anterior. El motivo sí arranca vacío: es el de ESTE cambio, no el del anterior.
  useEffect(() => {
    if (!visible) return;
    setTitulo(tituloActual ?? '');
    setMotivo('');
    setIntentoGuardar(false);
    setErrorServidor(null);
    setGuardando(false);
  }, [visible, tituloActual]);

  const errorTitulo = intentoGuardar ? errorDeTituloPersonal(titulo) : null;
  const errorMotivo = intentoGuardar ? errorDeMotivo(motivo) : null;
  const hayTextoSinGuardar = titulo.trim() !== (tituloActual ?? '').trim() || motivo.trim().length > 0;

  const cerrarSiSePuede = useCallback(() => {
    if (guardando) return;
    onCerrar();
  }, [guardando, onCerrar]);

  useSystemBackHandler(() => {
    cerrarSiSePuede();
    return true;
  }, visible);

  const guardar = async () => {
    setIntentoGuardar(true);
    if (errorDeTituloPersonal(titulo) || errorDeMotivo(motivo)) return;
    setGuardando(true);
    setErrorServidor(null);
    try {
      await onGuardar(titulo, motivo);
      onCerrar();
    } catch (error) {
      // El mensaje del backend gana: dice cosas que la app no sabría decir, como que la ventana
      // para cambiarlo ya se cerró.
      setErrorServidor(mensajeDeError(error, 'No pudimos guardar el nombre nuevo.'));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (!onQuitar) return;
    setGuardando(true);
    setErrorServidor(null);
    try {
      await onQuitar();
      onCerrar();
    } catch (error) {
      setErrorServidor(mensajeDeError(error, 'No pudimos volver al nombre original.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrarSiSePuede}>
      <VeloModal
        // Con texto a medio escribir, tocar fuera NO cierra: se perdería lo tipeado.
        onCerrar={hayTextoSinGuardar ? () => {} : cerrarSiSePuede}
        style={styles.velo}
        etiqueta="Cerrar el cambio de nombre"
      >
        <View
          style={[
            styles.tarjeta,
            { backgroundColor: c.bg, borderColor: c.borderStrong, paddingHorizontal: horizontalPadding },
          ]}
        >
          {/* UN SOLO contenedor de scroll (AGENTS.md §2): con el teclado abierto en una pantalla
              corta los dos campos y los botones no entran. */}
          <ScrollView
            contentContainerStyle={styles.contenido}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.encabezado}>
              <View style={{ flex: 1 }}>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                  SOLO PARA VOS
                </Text>
                <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 3 }]} numberOfLines={2}>
                  {tituloCatalogo}
                </Text>
              </View>
              <Pressable
                onPress={cerrarSiSePuede}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={12}
                style={styles.cerrar}
              >
                <Icon name="close" size={14} color={c.goldInk} />
              </Pressable>
            </View>

            <Text style={[t.small, { color: c.textSoft }]}>
              Ponele el nombre de lo que sí vas a hacer. Cambia el rótulo y nada más: la hora, los
              puntos y la evidencia siguen siendo los mismos, y nadie más lo ve.
            </Text>

            <FormField
              label="CÓMO LO VAS A LLAMAR"
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Mi bebida de la mañana"
              maxLength={MAXIMO_TITULO_PERSONAL}
              error={errorTitulo}
              autoCapitalize="sentences"
              containerStyle={{ marginTop: 4 }}
            />

            <FormField
              label="¿POR QUÉ TE QUEDA MEJOR ASÍ?"
              helperText="Una línea alcanza. Queda guardado con el cambio."
              value={motivo}
              onChangeText={setMotivo}
              placeholder="El limón en ayunas me cae mal"
              maxLength={MAXIMO_MOTIVO}
              error={errorMotivo}
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
            />

            {errorServidor !== null && (
              <View style={[styles.errorCaja, { backgroundColor: c.dangerWash, borderColor: c.danger }]}>
                <Text style={[t.small, { color: c.danger, flexShrink: 1 }]}>{errorServidor}</Text>
              </View>
            )}

            <GoldButton
              label="GUARDAR EL NOMBRE"
              onPress={() => void guardar()}
              loading={guardando}
              style={{ width: '100%', marginTop: 4 }}
            />

            {onQuitar && (
              <Pressable
                onPress={() => void quitar()}
                disabled={guardando}
                accessibilityRole="button"
                accessibilityLabel="Volver al nombre original"
                style={styles.botonSecundario}
                hitSlop={8}
              >
                <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
                  Volver al nombre original
                </Text>
              </Pressable>
            )}

            {guardando && <ActivityIndicator color={c.gold} />}
          </ScrollView>
        </View>
      </VeloModal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
    flexShrink: 1,
    borderWidth: 1.5,
    borderRadius: 22,
    overflow: 'hidden',
  },
  contenido: {
    flexGrow: 1,
    gap: 12,
    paddingTop: 18,
    paddingBottom: 28,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  /** 48 px de lado: pulsación cómoda con una sola mano (AGENTS.md §4). */
  cerrar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCaja: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  botonSecundario: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
