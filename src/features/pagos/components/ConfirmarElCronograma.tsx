import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '../../../components/Checkbox';
import { FormField } from '../../../components/FormField';
import { BotonPrincipal } from '../../../components/Legible';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { loQueFaltaParaConfirmar, TEXTO_DE_LA_CASILLA } from '../utils/vistaDeMiIngreso';

/**
 * Al pie de «Mi ingreso» (maqueta): la casilla «Revisé mis fechas y montos.», «Tu nombre» y «Confirmar cronograma ›». Se pide **una sola vez**; si
 * Administración cambia las cuotas, el servidor dice que la confirmación quedó desactualizada y se vuelve a pedir (con `aviso`). **Nunca bloquea nada**:
 * no confirmar no cambia ninguna otra pantalla.
 *
 * Con algo que falta, el botón no se apaga: al tocarlo dice qué falta, con la vibración de error y sin mandar nada (un botón apagado no explica por
 * qué). El doble toque manda un solo pedido.
 */
export function ConfirmarElCronograma({
  aviso,
  alConfirmar,
}: {
  aviso: string | null;
  /** Devuelve cuando el servidor respondió; si falla, lanza (la pantalla lo dice con las palabras del servidor). */
  alConfirmar: (nombre: string) => Promise<void>;
}) {
  const { c, t } = useTheme();
  const [revisado, setRevisado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [falta, setFalta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);

  const confirmar = async () => {
    if (enCurso.current) return;
    const queFalta = loQueFaltaParaConfirmar(revisado, nombre);
    setFalta(queFalta);
    if (queFalta) {
      tacto.error();
      return;
    }
    enCurso.current = true;
    setEnviando(true);
    setError(null);
    try {
      await alConfirmar(nombre);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo confirmar. Revisa tu conexión e inténtalo de nuevo.'));
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.caja}>
      {aviso ? (
        <View accessibilityRole="alert" style={[estilos.aviso, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{aviso}</Text>
        </View>
      ) : null}
      <Checkbox
        checked={revisado}
        onToggle={marcado => {
          tacto.seleccion();
          setRevisado(marcado);
          if (marcado) setFalta(null);
        }}
        title={TEXTO_DE_LA_CASILLA}
        style={{ minHeight: 56 }}
      />
      <FormField
        label="Tu nombre"
        icon="pencil"
        value={nombre}
        onChangeText={texto => {
          setNombre(texto);
          if (texto.trim()) setFalta(null);
        }}
        placeholder="Escribe tu nombre completo…"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={120}
        returnKeyType="done"
        onSubmitEditing={() => void confirmar()}
        accessibilityLabel="Tu nombre"
      />
      {falta ? (
        <Text accessibilityRole="alert" style={[t.small, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
          {falta}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[t.small, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
          {error}
        </Text>
      ) : null}
      <BotonPrincipal etiqueta="Confirmar cronograma" onPress={() => void confirmar()} cargando={enviando} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: 14 },
  aviso: { borderWidth: 1, borderRadius: 14, padding: 14 },
});
