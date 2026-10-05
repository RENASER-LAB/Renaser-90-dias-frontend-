import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { PasoCabecera } from './Piezas';

/**
 * Modo recorrido libre: deja avanzar sin completar los campos.
 *
 * Cada vista calcula su propio `valido` con las reglas del manual (§3, §4) y con eso apaga el
 * botón. Eso es correcto para el aprendiz, pero impide **recorrer** el flujo para ver qué pide
 * cada paso — que es justo lo que hace falta mientras el mapa se está revisando.
 *
 * Mismo criterio que `MAPA_DIA7_HABILITADO` en `HoyScreen`: suelto en desarrollo, y en un build
 * publicado solo si alguien lo enciende a propósito con `EXPO_PUBLIC_MAPA_LIBRE=on`. Por defecto,
 * en producción, las reglas siguen exigiéndose igual que antes.
 *
 * Las reglas **no se tocaron**: `objetivoValido`, `definicionDeTerminado` y las demás siguen
 * calculándose y los avisos de calidad se siguen mostrando. Lo único que cambia es que el botón
 * deja de estar bloqueado — se ve lo que falta, pero no frena.
 */
const RECORRIDO_LIBRE = __DEV__ || process.env.EXPO_PUBLIC_MAPA_LIBRE === 'on';

/**
 * El texto del botón principal del Mapa, sin espaciar y legible (2026-10-05), como el resto del
 * rediseño (`TEXTO_DE_BOTON` de Plan, Training…). El `GoldButton` global sigue igual: se ajusta acá.
 */
const TEXTO_DE_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/**
 * Esqueleto común de V01–V10: cabecera con el paso, contenido que se desplaza, y la acción
 * principal FUERA del scroll — fija abajo, así queda visible cuando se abre el teclado
 * (manual §2.1 "Teclado"). `onAtras` conserva los datos; nunca reinicia nada.
 */
export function PantallaPaso({
  paso,
  onAtras,
  etiquetaAtras = 'Anterior',
  boton,
  children,
}: {
  paso: number | null;
  onAtras?: () => void;
  etiquetaAtras?: string;
  boton: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    /**
     * Qué falta para poder seguir. Se muestra **arriba del botón** cuando está bloqueado.
     *
     * > **Por qué existe (2026-09-09).** Probando el Mapa entero, el botón se quedó mudo dos veces:
     * > en el paso 6 faltaba elegir la evidencia de cada acción, y en el paso 10 marcar el
     * > compromiso. En los dos casos no pasaba nada al tocarlo —sin mensaje, sin señalar el campo—
     * > y solo se descubría por prueba y error. Con 50-60 años, de ahí no se sale pensando "me
     * > falta un campo": se sale pensando que la app está rota.
     *
     * Va acá y no en cada pantalla para que ninguna se olvide, y para que las diez se vean igual.
     */
    faltan?: string[];
  };
  children: React.ReactNode;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding } = useResponsive();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: 12, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* La flecha de volver del rediseño: 24 en un área de 48, con el texto en tipo oración
              (2026-10-05, decisión del dueño). Decía «← ANTERIOR» en versalitas de 10,5 espaciadas,
              con una flecha de texto. */}
          {onAtras ? (
            <Presionable
              onPress={onAtras}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={etiquetaAtras}
              contenedorStyle={styles.atrasArea}
              style={styles.atras}
            >
              <Icon name="arrowLeft" size={TAMANO_ICONO.grande} color={c.goldInk} />
              <Text style={[styles.atrasTexto, { color: c.goldInk }]}>{etiquetaAtras}</Text>
            </Presionable>
          ) : null}
          {paso !== null ? <PasoCabecera paso={paso} /> : null}
          {children}
        </ScrollView>
        <View style={[styles.pie, { paddingHorizontal: horizontalPadding, borderTopColor: c.divider, backgroundColor: c.bg }]}>
          {/* El aviso se muestra aunque el recorrido libre desbloquee el botón: ahí sirve para ver
              qué le va a pedir el mapa a un aprendiz de verdad. */}
          {boton.disabled && boton.faltan && boton.faltan.length > 0 ? (
            <View style={[styles.faltan, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.small, { color: c.text, fontSize: 15, lineHeight: 21 }]}>
                {boton.faltan.length === 1
                  ? `Para seguir falta ${boton.faltan[0]}.`
                  : `Para seguir falta: ${boton.faltan.join('; ')}.`}
              </Text>
            </View>
          ) : null}
          {/* En recorrido libre el botón nunca se bloquea por campos incompletos. `loading` sí
              se respeta siempre: eso no es una regla de negocio, es que hay algo en vuelo. */}
          <GoldButton
            label={boton.label}
            onPress={boton.onPress}
            disabled={RECORRIDO_LIBRE ? false : boton.disabled}
            loading={boton.loading}
            icon="arrow"
            textStyle={TEXTO_DE_BOTON}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  atrasArea: { alignSelf: 'flex-start', marginBottom: 4 },
  atras: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  atrasTexto: { fontFamily: 'Jost_500Medium', fontSize: 16 },
  pie: { paddingTop: 12, paddingBottom: 14, borderTopWidth: 1 },
  faltan: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
});
