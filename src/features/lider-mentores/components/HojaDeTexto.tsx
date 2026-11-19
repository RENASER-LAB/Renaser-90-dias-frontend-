import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../../../components/FormField';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Una hoja con un campo de texto y UN botón (spec 056): «Avisar a su mentor», «Alertar» y «Responder yo» son la misma hoja con otro título.
 *
 * - Se abre con `textoInicial` (el mensaje sugerido, editable) y vuelve a él cada vez que se abre.
 * - Vacío no se envía y dice qué falta; el botón queda apagado mientras el pedido viaja (`enviando`): un toque, un pedido.
 * - `onEnviar` dice si salió: con `true` el campo se limpia y quien llama cierra la hoja; con `false` el texto sigue en el campo.
 * - `arriba` es lo propio de cada uso (el selector de Reconocer, Sugerir o Alertar). Se cierra deslizando, con el atrás del sistema o con la ✕.
 */
export function HojaDeTexto({
  visible,
  alCerrar,
  titulo,
  subtitulo,
  textoInicial = '',
  etiquetaDelCampo,
  placeholder,
  etiquetaDelBoton,
  enviando,
  onEnviar,
  arriba,
  largoMaximo = 1000,
}: {
  visible: boolean;
  alCerrar: () => void;
  titulo: string;
  subtitulo?: string;
  textoInicial?: string;
  etiquetaDelCampo: string;
  placeholder?: string;
  etiquetaDelBoton: string;
  enviando: boolean;
  onEnviar: (texto: string) => Promise<boolean>;
  arriba?: React.ReactNode;
  largoMaximo?: number;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState(textoInicial);
  const [falta, setFalta] = useState<string | null>(null);

  /* Cada vez que se abre arranca con el texto sugerido y sin avisos viejos. */
  useEffect(() => {
    if (visible) {
      setTexto(textoInicial);
      setFalta(null);
    }
  }, [visible, textoInicial]);

  const enviar = async () => {
    if (enviando) return;
    if (texto.trim().length === 0) {
      setFalta('Escribe lo que quieres decir.');
      return;
    }
    setFalta(null);
    if (await onEnviar(texto.trim())) setTexto('');
  };

  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo={titulo} subtitulo={subtitulo} tamano="grande" etiquetaCerrar={`Cerrar ${titulo.toLowerCase()}`}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
        {arriba}
        <FormField
          label={etiquetaDelCampo}
          value={texto}
          onChangeText={valor => {
            setTexto(valor);
            if (falta) setFalta(null);
          }}
          placeholder={placeholder}
          multiline
          numberOfLines={5}
          maxLength={largoMaximo}
          error={falta}
          mensajeDeErrorAparte
          accessibilityLabel={etiquetaDelCampo}
        />
        {falta ? <Text style={[t.body, { color: c.danger, fontSize: 15 }]}>{falta}</Text> : null}
        <BotonPrincipal etiqueta={etiquetaDelBoton} onPress={() => void enviar()} cargando={enviando} deshabilitado={enviando} />
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, gap: 14 },
});
