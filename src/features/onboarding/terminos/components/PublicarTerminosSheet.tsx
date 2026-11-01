import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Interruptor } from '../../../../components/Interruptor';
import { BotonPrincipal } from '../../../../components/Legible';
import { useTheme } from '../../../../theme/ThemeContext';
import { MAX_NOTA } from '../utils/borradorDeTerminos';

/**
 * «Publicar» (spec 027, FR-006 y FR-015): confirma («Lo verán las personas que entren desde ahora»), deja escribir una nota del cambio y decide si quienes ya
 * aceptaron deben aceptar de nuevo. Por defecto NO se pide (Q2-A): un cambio de redacción no interrumpe a nadie; uno que cambia derechos u obligaciones, sí.
 */
export function PublicarTerminosSheet({
  visible,
  esLaPrimera,
  enCurso,
  error,
  alCerrar,
  alPublicar,
}: {
  visible: boolean;
  /** La formación no tenía ninguna versión publicada: no hay a quién pedirle aceptar de nuevo. */
  esLaPrimera: boolean;
  enCurso: boolean;
  error: string | null;
  alCerrar: () => void;
  alPublicar: (nota: string, pideNuevaAceptacion: boolean) => void;
}) {
  const { c, t } = useTheme();
  const [nota, setNota] = useState('');
  const [pide, setPide] = useState(false);

  useEffect(() => {
    if (visible) {
      setNota('');
      setPide(false);
    }
  }, [visible]);

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={enCurso ? () => undefined : alCerrar}
      titulo="Publicar los términos"
      subtitulo="Lo verán las personas que entren desde ahora"
      tamano="grande"
      etiquetaCerrar="Cerrar sin publicar"
      pie={
        <View style={estilos.pie}>
          {error ? <Text accessibilityRole="alert" style={[t.small, { color: c.danger, fontSize: 15 }]}>{error}</Text> : null}
          <BotonPrincipal etiqueta="Publicar" onPress={() => alPublicar(nota.trim(), esLaPrimera ? false : pide)} cargando={enCurso} />
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>Nota del cambio (opcional)</Text>
        <TextInput
          value={nota}
          onChangeText={setNota}
          maxLength={MAX_NOTA}
          multiline
          placeholder="Qué cambió, en pocas palabras"
          placeholderTextColor={c.micro}
          accessibilityLabel="Nota del cambio"
          style={[t.body, estilos.nota, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
        />
        {!esLaPrimera ? (
          <View style={estilos.fila}>
            <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
              <Text style={[t.body, { color: c.textStrong, fontSize: 17 }]}>Pedir que acepten de nuevo</Text>
              <Text style={[t.small, { color: c.textSoft, fontSize: 15, lineHeight: 21 }]}>
                {pide
                  ? 'Quienes ya aceptaron verán esta pantalla al abrir la app y no podrán seguir hasta aceptar.'
                  : 'No se interrumpe a nadie: quienes ya aceptaron siguen con la versión que aceptaron.'}
              </Text>
            </View>
            <Interruptor valor={pide} onCambiar={setPide} etiqueta="Pedir que acepten de nuevo" />
          </View>
        ) : (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Es la primera versión de esta formación: la verán quienes entren desde ahora.</Text>
        )}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  nota: { minHeight: 96, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 16, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
});
