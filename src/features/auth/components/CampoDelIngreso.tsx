import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Icon, type IconName } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';

/**
 * Un campo del login y de «Solicitar acceso» (2026-10-05).
 *
 * **Por qué recuadro y no línea inferior**, aunque la referencia que mandó el dueño usaba línea:
 *
 * 1. **Coherencia del recorrido.** Lo que sigue al login —el código de 6 dígitos, la recuperación
 *    de contraseña y toda la Ficha Inicial (`FormField`)— usa este mismo recuadro de 52 px que se
 *    vuelve dorado al enfocar. Un login con línea y un onboarding con recuadro serían dos idiomas
 *    de campo en el mismo primer minuto de uso («Cohesion matters», `emil-design-eng`).
 * 2. **Se entiende que se toca.** Para un público de 40–60 años, un recuadro entero se reconoce
 *    como campo sin pensar; una línea suelta sobre fondo liso se confunde con un separador. Y el
 *    área táctil es el recuadro entero, no una franja de texto.
 * 3. **El error se ve.** El borde que pasa a rojo con el mensaje justo debajo dice qué campo falló
 *    sin depender del color de una raya de 1 px.
 *
 * Lo que sí se tomó de la referencia: nada de cajas alrededor del formulario (sin tarjeta), mucho
 * aire, y el dorado sólo donde está la atención (el campo enfocado, el subrayado del título).
 *
 * El borde cambia de color al instante, sin transición: se enfoca un campo decenas de veces por
 * sesión y eso no se anima (`emil-design-eng`, «Should this animate at all?»).
 */
export function CampoDelIngreso({
  etiqueta,
  icono,
  enfocado,
  conError = false,
  accesorio,
  debajo,
  ref,
  editable = true,
  ...propsDelCampo
}: TextInputProps & {
  etiqueta: string;
  icono: IconName;
  enfocado: boolean;
  conError?: boolean;
  /** Lo que va a la derecha dentro del recuadro (el ojo de la contraseña). */
  accesorio?: React.ReactNode;
  /** Lo que va debajo: el mensaje de error, el aviso de disponibilidad del correo. */
  debajo?: React.ReactNode;
  /** El campo de verdad, para pasar al siguiente con la tecla del teclado. */
  ref?: React.Ref<TextInput>;
}) {
  const { c } = useTheme();
  const colorDelBorde = conError ? c.danger : enfocado ? c.gold : c.border;

  return (
    <View style={styles.grupo}>
      <MicroLabel>{etiqueta}</MicroLabel>
      <View
        style={[
          styles.recuadro,
          { borderColor: colorDelBorde, backgroundColor: c.cardBgAlt, opacity: editable ? 1 : 0.65 },
        ]}
      >
        <Icon name={icono} size={17} color={enfocado ? c.goldInk : c.tabInactive} />
        <TextInput
          ref={ref}
          accessibilityLabel={etiqueta}
          placeholderTextColor={c.tabInactive}
          editable={editable}
          {...propsDelCampo}
          style={[styles.texto, { color: editable ? c.text : c.textSoft }]}
        />
        {accesorio}
      </View>
      {debajo}
    </View>
  );
}

/** El mensaje de error bajo un campo. Se anuncia solo al lector de pantalla cuando aparece. */
export function MensajeBajoElCampo({ texto }: { texto: string }) {
  const { c, t } = useTheme();
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[t.small, styles.mensaje, { color: c.danger }]}
    >
      {texto}
    </Text>
  );
}

const styles = StyleSheet.create({
  grupo: {
    gap: 8,
  },
  recuadro: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 4,
    height: 52,
    gap: 10,
  },
  texto: {
    flex: 1,
    fontSize: 15.5,
    fontFamily: 'Jost_400Regular',
    height: '100%',
    paddingVertical: 0,
    paddingRight: 10,
  },
  mensaje: {
    lineHeight: 19,
  },
});
