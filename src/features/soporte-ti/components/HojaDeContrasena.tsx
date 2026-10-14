import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { FormField } from '../../../components/FormField';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La contraseña otra vez, para confirmar un cambio crítico (spec 002, FR-008): apagar para todos o tocar algo marcado
 * crítico. Hoja desde abajo de la app (arrastre, fondo, ✕ y atrás del sistema la cierran). La contraseña se borra al
 * cerrar y nunca se guarda.
 */
export function HojaDeContrasena({
  visible,
  nombre,
  error,
  enviando,
  onConfirmar,
  onCerrar,
}: {
  visible: boolean;
  /** El nombre de la funcionalidad que se cambia. */
  nombre: string;
  error: string | null;
  enviando: boolean;
  onConfirmar: (contrasena: string) => void;
  onCerrar: () => void;
}) {
  const { c, t } = useTheme();
  const [contrasena, setContrasena] = useState('');

  useEffect(() => {
    if (!visible) setContrasena('');
  }, [visible]);

  const confirmar = () => {
    if (!enviando && contrasena) onConfirmar(contrasena);
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      titulo="Confirma con tu contraseña"
      subtitulo={nombre}
      pie={<BotonPrincipal etiqueta="Confirmar cambio" onPress={confirmar} cargando={enviando} deshabilitado={!contrasena} />}
    >
      <View style={{ gap: 14, paddingBottom: 8 }}>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          Es un cambio crítico: apaga algo para todos o toca una función marcada como crítica. Se avisa a Administración y al
          Alquimista.
        </Text>
        <FormField
          label="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={confirmar}
          icon="lock"
          error={error}
        />
      </View>
    </HojaDesdeAbajo>
  );
}
