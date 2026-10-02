import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { cambiarDiaDelPrograma } from '../api/adminApi';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import {
  DIA_MAXIMO,
  DIA_MINIMO,
  MOTIVO_MAXIMO,
  detalleDelCambioDeDia,
  leerDiaEscrito,
  mensajeDelErrorDeCambio,
  moverDia,
  preguntaDelCambioDeDia,
  validarCambioDeDia,
} from '../utils/diaDelPrograma';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * Adelantar o retroceder el día del programa de una persona (pedido del dueño, 26/09; backend D-82).
 *
 * Es una vista de la ficha y no un modal: en web, un diálogo encima de otro `Modal` no siempre queda
 * arriba, y la confirmación tiene que verse sí o sí. La confirmación usa `Alert` de
 * `components/Alerta` —el del sistema en el teléfono, uno propio en web—, nunca `window.confirm`.
 *
 * Qué pasa en el servidor: no escribe el número, corre el reloj para que HOY (en la zona del
 * aprendiz) caiga en el día elegido, y desde mañana sigue contando desde ahí. Lo ya hecho no se borra.
 */
export function CambiarDiaScreen({
  aprendizId,
  nombre,
  diaActual,
  onVolver,
  onCambiado,
}: {
  aprendizId: string;
  nombre: string;
  diaActual: number;
  onVolver: () => void;
  onCambiado: (diaNuevo: number) => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [texto, setTexto] = useState(String(diaActual));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useSystemBackHandler(() => {
    if (!enviando) onVolver();
    return true;
  });

  const diaEscrito = leerDiaEscrito(texto);
  const fueraDeRango = diaEscrito !== null && (diaEscrito < DIA_MINIMO || diaEscrito > DIA_MAXIMO);
  const base = diaEscrito ?? diaActual;
  const mover = (delta: number) => {
    setTexto(String(moverDia(base, delta)));
    setError(null);
  };

  const enviar = async (cuerpo: { programDay: number; motivo: string }) => {
    setEnviando(true);
    try {
      await cambiarDiaDelPrograma(aprendizId, cuerpo);
      onCambiado(cuerpo.programDay);
    } catch (e) {
      setError(mensajeDelErrorDeCambio(e));
    } finally {
      setEnviando(false);
    }
  };

  const pedirConfirmacion = () => {
    const revisado = validarCambioDeDia({ diaActual, diaNuevo: diaEscrito, motivo });
    if (!revisado.ok) {
      setError(revisado.error);
      return;
    }
    setError(null);
    const hasta = revisado.cuerpo.programDay;
    Alert.alert(preguntaDelCambioDeDia(nombre, diaActual, hasta), detalleDelCambioDeDia(diaActual, hasta), [
      { text: 'Cancelar', style: 'cancel' },
      { text: `Sí, pasar al día ${hasta}`, onPress: () => void enviar(revisado.cuerpo) },
    ]);
  };

  const campo = [t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text, fontSize: 18 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Cambiar día del programa" subtitulo={nombre} onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        <Text style={[t.body, { color: c.textStrong, fontSize: 20, lineHeight: 28 }]}>
          Hoy está en el día {diaActual} de 90.
        </Text>

        <View style={{ gap: 10 }}>
          <Text style={[estilos.rotulo, { color: c.textStrong }]}>Pasar al día</Text>
          <View style={estilos.fila}>
            <Pressable
              onPress={() => mover(-1)}
              disabled={enviando}
              accessibilityRole="button"
              accessibilityLabel="Un día menos"
              style={[estilos.paso, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
            >
              <Text style={[estilos.signo, { color: c.textStrong }]}>−</Text>
            </Pressable>
            <TextInput
              value={texto}
              onChangeText={v => {
                setTexto(v.replace(/[^\d]/g, '').slice(0, 3));
                setError(null);
              }}
              keyboardType="number-pad"
              maxLength={3}
              editable={!enviando}
              accessibilityLabel={`Día nuevo, de ${DIA_MINIMO} a ${DIA_MAXIMO}`}
              style={[...campo, estilos.numero]}
            />
            <Pressable
              onPress={() => mover(1)}
              disabled={enviando}
              accessibilityRole="button"
              accessibilityLabel="Un día más"
              style={[estilos.paso, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
            >
              <Text style={[estilos.signo, { color: c.textStrong }]}>+</Text>
            </Pressable>
          </View>
          <View style={estilos.fila}>
            <BotonSecundario
              etiqueta="−1 día"
              accessibilityLabel={`Retroceder un día: al día ${moverDia(diaActual, -1)}`}
              onPress={() => {
                setTexto(String(moverDia(diaActual, -1)));
                setError(null);
              }}
              deshabilitado={enviando}
              estilo={{ flex: 1 }}
            />
            <BotonSecundario
              etiqueta="+1 día"
              accessibilityLabel={`Adelantar un día: al día ${moverDia(diaActual, 1)}`}
              onPress={() => {
                setTexto(String(moverDia(diaActual, 1)));
                setError(null);
              }}
              deshabilitado={enviando}
              estilo={{ flex: 1 }}
            />
          </View>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
            Los atajos cuentan desde el día de hoy ({diaActual}).
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[estilos.rotulo, { color: c.textStrong }]}>Motivo (obligatorio)</Text>
          <TextInput
            value={motivo}
            onChangeText={v => {
              setMotivo(v);
              setError(null);
            }}
            placeholder="Ej.: Viajó y pidió volver al día 34"
            placeholderTextColor={c.micro}
            multiline
            maxLength={MOTIVO_MAXIMO}
            editable={!enviando}
            accessibilityLabel="Motivo del cambio"
            style={[...campo, estilos.motivo]}
          />
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
            {motivo.trim().length} de {MOTIVO_MAXIMO} caracteres · queda guardado con el ajuste
          </Text>
        </View>

        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          Desde mañana su reloj sigue contando desde el día nuevo. Lo que ya hizo (hábitos, evidencias,
          puntos) no se borra.
        </Text>

        {error || fueraDeRango ? (
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
            {error ?? `Escribe un día entre ${DIA_MINIMO} y ${DIA_MAXIMO}.`}
          </Text>
        ) : null}

        <BotonPrincipal
          etiqueta={
            diaEscrito !== null && diaEscrito !== diaActual && !fueraDeRango ? `Pasar al día ${diaEscrito}` : 'Cambiar el día'
          }
          onPress={pedirConfirmacion}
          cargando={enviando}
        />
        <BotonSecundario etiqueta="Cancelar" onPress={onVolver} deshabilitado={enviando} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paso: { width: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  signo: { fontFamily: 'Jost_500Medium', fontSize: 32, lineHeight: 36 },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 18 },
  // minWidth/flexBasis 0: en web el <input> trae un ancho propio y empujaba el «+» fuera de la
  // pantalla a 360 px (e2e del 26/09).
  numero: { flex: 1, flexBasis: 0, minWidth: 0, height: 64, textAlign: 'center', fontSize: 28 },
  motivo: { minHeight: 96, paddingVertical: 12, textAlignVertical: 'top' },
});
