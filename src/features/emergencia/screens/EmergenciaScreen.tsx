import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { confirmar } from '../../admin/utils/dialogo';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { pedirAyudaPorEmergencia } from '../api/emergenciaApi';
import type { MiEmergencia } from '../api/emergenciaSchemas';
import {
  LARGO_MAXIMO,
  PRIMER_DIA,
  acotarDiaPedido,
  detalleDelPedido,
  eligeDia,
  mensajeDelErrorDelPedido,
  preguntaDelPedido,
  validarPedido,
} from '../utils/pedidoDeEmergencia';

/**
 * Yo → «Tuve una emergencia» (pedido del dueño del 02/10, backend D-244). Un formulario corto: qué pasó y
 * a qué día del programa quiere volver (de 1 al de hoy). En el Día 0 no hay selector: es solo un pedido de ayuda. Enviarlo NO cambia el día: le llega a soporte,
 * que lo revisa y le escribe. Con un pedido ya abierto, la pantalla solo dice eso.
 */
export function EmergenciaScreen({
  mia,
  onVolver,
  onEnviado,
}: {
  mia: MiEmergencia;
  onVolver: () => void;
  onEnviado: () => Promise<void>;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [texto, setTexto] = useState('');
  const [dia, setDia] = useState(acotarDiaPedido(mia.diaMaximo, mia.diaMaximo));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recibido, setRecibido] = useState(false);

  useSystemBackHandler(() => {
    if (!enviando) onVolver();
    return true;
  });

  const mover = (delta: number) => {
    setDia(actual => acotarDiaPedido(actual + delta, mia.diaMaximo));
    setError(null);
  };

  const conDia = eligeDia(mia);

  const enviar = async () => {
    const revisado = validarPedido({ queOcurrio: texto, diaPedido: dia, diaMaximo: mia.diaMaximo });
    if (!revisado.ok) {
      setError(revisado.error);
      return;
    }
    const pregunta = preguntaDelPedido(conDia ? dia : null);
    if (!(await confirmar(pregunta, detalleDelPedido(mia.diaActual), { ok: 'Sí, enviar' }))) return;
    setEnviando(true);
    try {
      await pedirAyudaPorEmergencia(revisado.cuerpo);
      setRecibido(true);
      await onEnviado();
    } catch (e) {
      setError(mensajeDelErrorDelPedido(e));
    } finally {
      setEnviando(false);
    }
  };

  const pedidoAbierto = recibido ? null : mia.abierta;
  const listo = recibido || !!pedidoAbierto;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Tuve una emergencia" onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        {listo ? (
          <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
            <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
              Recibimos tu pedido
            </Text>
            <Text style={[t.body, estilos.parrafo, { color: c.text }]}>
              {pedidoAbierto?.diaPedido != null
                ? `Pediste volver al día ${pedidoAbierto.diaPedido}. Soporte te va a escribir.`
                : 'Soporte te va a escribir.'}
            </Text>
            <BotonSecundario etiqueta="Volver" onPress={onVolver} />
          </View>
        ) : (
          <>
            <Text style={[t.body, estilos.parrafo, { color: c.text }]}>
              {conDia
                ? 'Si algo grave te impidió seguir, pide volver a un día del programa. Soporte lo revisa.'
                : 'Si algo grave te pasó, cuéntanos. Soporte lo revisa y te escribe.'}
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={[estilos.rotulo, { color: c.textStrong }]}>¿Qué pasó?</Text>
              <TextInput
                value={texto}
                onChangeText={v => {
                  setTexto(v);
                  setError(null);
                }}
                placeholder="Ej.: Tuve un accidente y estuve internado"
                placeholderTextColor={c.micro}
                multiline
                maxLength={LARGO_MAXIMO}
                editable={!enviando}
                accessibilityLabel="Qué pasó"
                style={[t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
              />
              <Text style={[t.small, { color: c.textSoft }]}>
                {texto.trim().length} de {LARGO_MAXIMO}
              </Text>
            </View>

            {conDia ? (
            <View style={{ gap: 10 }}>
              <Text style={[estilos.rotulo, { color: c.textStrong }]}>Volver al día</Text>
              <View style={estilos.fila}>
                <Pressable
                  onPress={() => mover(-1)}
                  disabled={enviando || dia <= PRIMER_DIA}
                  accessibilityRole="button"
                  accessibilityLabel="Un día antes"
                  style={[estilos.paso, { borderColor: c.borderStrong, backgroundColor: c.cardBg, opacity: dia <= PRIMER_DIA ? 0.4 : 1 }]}
                >
                  <Text style={[estilos.signo, { color: c.textStrong }]}>−</Text>
                </Pressable>
                <Text
                  accessibilityLabel={`Día ${dia}`}
                  style={[estilos.numero, { color: c.textStrong, backgroundColor: c.cardBg, borderColor: c.border }]}
                >
                  {dia}
                </Text>
                <Pressable
                  onPress={() => mover(1)}
                  disabled={enviando || dia >= mia.diaMaximo}
                  accessibilityRole="button"
                  accessibilityLabel="Un día después"
                  style={[
                    estilos.paso,
                    { borderColor: c.borderStrong, backgroundColor: c.cardBg, opacity: dia >= mia.diaMaximo ? 0.4 : 1 },
                  ]}
                >
                  <Text style={[estilos.signo, { color: c.textStrong }]}>+</Text>
                </Pressable>
              </View>
              <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Hoy estás en el día {mia.diaActual}.</Text>
            </View>
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
                {error}
              </Text>
            ) : null}

            <BotonPrincipal etiqueta="Enviar a soporte" onPress={enviar} cargando={enviando} />
            <BotonSecundario etiqueta="Cancelar" onPress={onVolver} deshabilitado={enviando} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_700Bold', fontSize: 22, lineHeight: 28 },
  parrafo: { fontSize: 17, lineHeight: 24 },
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 96, fontSize: 17, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paso: { width: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  signo: { fontFamily: 'Jost_500Medium', fontSize: 32, lineHeight: 36 },
  numero: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 64,
    lineHeight: 62,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    textAlign: 'center',
    fontFamily: 'Jost_500Medium',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
  },
});
