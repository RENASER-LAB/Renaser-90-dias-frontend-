import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { FormField } from '../../../components/FormField';
import { GoldButton } from '../../../components/GoldButton';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useAltoMaximoDelCuerpo } from '../../../components/hojaDesdeAbajo/altoDelCuerpo';
import { mensajeDeError } from '../../../services/http/apiClient';
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
 * ## Hoja desde abajo (rediseño de Training, 2026-10-05)
 *
 * Era una ventana centrada con «SOLO PARA TI» en versalitas y una ✕ de 14. Ahora es la
 * `HojaDesdeAbajo` de la app, con el botón fijo abajo.
 *
 * > **Corregido 2026-10-05.** Acá decía que no se cerraba tocando fuera con texto escrito, para no
 * > perder el motivo a medio escribir. Una hoja se cierra con un gesto (arrastrarla, tocar el fondo)
 * > y no puede negarse, así que el cuidado es otro: lo escrito se GUARDA como borrador de ese hábito
 * > mientras la app está abierta, y vuelve al reabrirla. Se borra al guardar o al quitar el nombre.
 */

/** Lo escrito sin guardar, por hábito (título del catálogo), mientras la app está abierta. */
const borradores = new Map<string, { titulo: string; motivo: string }>();

/** El botón, en tipo oración y a tamaño de lectura. */
const TEXTO_DE_BOTON = { fontSize: 16, letterSpacing: 0 } as const;
const RESERVA_CABECERA_Y_PIE = 260;

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
  const altoMaximo = useAltoMaximoDelCuerpo(RESERVA_CABECERA_Y_PIE);

  const [titulo, setTitulo] = useState('');
  const [motivo, setMotivo] = useState('');
  /** `true` recién cuando intentó guardar: no se le marca en rojo un campo que todavía no tocó. */
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  // Cada apertura arranca del nombre que el hábito tiene HOY, no de lo que quedó de la vez
  // anterior. El motivo sí arranca vacío: es el de ESTE cambio, no el del anterior. Salvo que haya
  // un borrador de este hábito (se cerró la hoja con algo escrito): ahí vuelve lo escrito.
  useEffect(() => {
    if (!visible) return;
    const borrador = borradores.get(tituloCatalogo);
    setTitulo(borrador?.titulo ?? tituloActual ?? '');
    setMotivo(borrador?.motivo ?? '');
    setIntentoGuardar(false);
    setErrorServidor(null);
    setGuardando(false);
  }, [visible, tituloActual, tituloCatalogo]);

  /** Si la hoja sigue a la vista (lo lee un guardado que termina después de cerrarla). */
  const abierta = useRef(visible);
  abierta.current = visible;

  const errorTitulo = intentoGuardar ? errorDeTituloPersonal(titulo) : null;
  const errorMotivo = intentoGuardar ? errorDeMotivo(motivo) : null;
  const hayTextoSinGuardar = titulo.trim() !== (tituloActual ?? '').trim() || motivo.trim().length > 0;

  /** Cerrar siempre se puede (arrastrar no se puede negar): lo escrito queda de borrador. */
  const cerrar = () => {
    if (hayTextoSinGuardar) borradores.set(tituloCatalogo, { titulo, motivo });
    else borradores.delete(tituloCatalogo);
    onCerrar();
  };

  const guardar = async () => {
    setIntentoGuardar(true);
    if (errorDeTituloPersonal(titulo) || errorDeMotivo(motivo)) return;
    setGuardando(true);
    setErrorServidor(null);
    try {
      await onGuardar(titulo, motivo);
      borradores.delete(tituloCatalogo);
      onCerrar();
    } catch (error) {
      // El mensaje del backend gana: dice cosas que la app no sabría decir, como que la ventana
      // para cambiarlo ya se cerró.
      const mensaje = mensajeDeError(error, 'No pudimos guardar el nombre nuevo.');
      setErrorServidor(mensaje);
      if (!abierta.current) Alert.alert('No pudimos cambiar el nombre', mensaje);
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
      borradores.delete(tituloCatalogo);
      onCerrar();
    } catch (error) {
      const mensaje = mensajeDeError(error, 'No pudimos volver al nombre original.');
      setErrorServidor(mensaje);
      if (!abierta.current) Alert.alert('No pudimos volver al nombre original', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={cerrar}
      titulo={tituloCatalogo}
      subtitulo="Cambiar el nombre · solo para ti"
      etiquetaCerrar="Cerrar el cambio de nombre"
      pie={
        <View style={{ gap: 4 }}>
          <GoldButton
            label="Guardar el nombre"
            onPress={() => void guardar()}
            loading={guardando}
            textStyle={TEXTO_DE_BOTON}
            style={{ width: '100%' }}
          />
          {onQuitar && (
            <Presionable
              onPress={() => void quitar()}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityLabel="Volver al nombre original"
              style={styles.botonSecundario}
            >
              <Text style={[t.body, { color: c.textSoft }]}>Volver al nombre original</Text>
            </Presionable>
          )}
        </View>
      }
    >
      {/* UN SOLO contenedor de scroll (AGENTS.md §2): con el teclado abierto en una pantalla
          corta los dos campos no entran. Con tope de alto: el botón queda a la vista. */}
      <ScrollView
        style={{ maxHeight: altoMaximo }}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Más corto (2026-10-05) y «Ponle», no «Ponele». */}
        <Text style={[t.body, { color: c.textSoft }]}>
          Ponle el nombre de lo que sí vas a hacer. Solo cambia el rótulo: la hora, los puntos y la
          evidencia siguen igual.
        </Text>

        <FormField
          label="Cómo lo vas a llamar"
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Mi bebida de la mañana"
          maxLength={MAXIMO_TITULO_PERSONAL}
          error={errorTitulo}
          autoCapitalize="sentences"
        />

        <FormField
          label="¿Por qué te queda mejor así?"
          helperText="Una línea alcanza."
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
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
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
