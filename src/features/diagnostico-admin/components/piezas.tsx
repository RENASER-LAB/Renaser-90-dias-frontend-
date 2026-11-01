import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';

/**
 * Las piezas chicas que comparten el editor de preguntas, el de secciones y el de importar (spec 026): todas con áreas de toque de 48 y
 * letra de 16 o más (los administradores tienen de 30 a 60 años), con `Presionable` y un «tic» al cambiar.
 */

/** Un botón cuadrado de 48 con un ícono, para subir, bajar, quitar. Apagado, queda a la vista pero no responde. */
export function BotonDeIcono({
  icono,
  etiqueta,
  onPress,
  deshabilitado = false,
  girar = 0,
  peligro = false,
}: {
  icono: IconName;
  etiqueta: string;
  onPress: () => void;
  deshabilitado?: boolean;
  /** Grados para girar el ícono (el chevron apunta a la derecha: −90 sube, 90 baja). */
  girar?: number;
  peligro?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={() => {
        tacto.seleccion();
        onPress();
      }}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={[estilos.botonIcono, { opacity: deshabilitado ? 0.35 : 1 }]}
    >
      <View style={{ transform: [{ rotate: `${girar}deg` }] }}>
        <Icon name={icono} size={20} color={peligro ? c.danger : c.textSoft} />
      </View>
    </Presionable>
  );
}

/** Una pastilla de 48 con ícono y texto (Editar, Subir, Bajar, Quitar…). */
export function BotonDeAccion({
  etiqueta,
  icono,
  onPress,
  deshabilitado = false,
  peligro = false,
  accessibilityLabel,
}: {
  etiqueta: string;
  icono?: IconName;
  onPress: () => void;
  deshabilitado?: boolean;
  peligro?: boolean;
  accessibilityLabel?: string;
}) {
  const { c, t } = useTheme();
  const tinta = peligro ? c.danger : c.textStrong;
  return (
    <Presionable
      onPress={() => {
        tacto.seleccion();
        onPress();
      }}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={[estilos.accion, { borderColor: peligro ? c.danger : c.border, backgroundColor: c.cardBg, opacity: deshabilitado ? 0.45 : 1 }]}
    >
      {icono ? <Icon name={icono} size={18} color={tinta} /> : null}
      <Text style={[t.body, { color: tinta, fontSize: 16, fontFamily: fuentes.media }]}>{etiqueta}</Text>
    </Presionable>
  );
}

/** Un campo de texto con su rótulo, su ayuda y su error, todo a 16 px o más. */
export function CampoDeTexto({
  rotulo,
  ayuda,
  error,
  rotuloOculto = false,
  ...entrada
}: TextInputProps & { rotulo: string; ayuda?: string | null; error?: string | null; rotuloOculto?: boolean }) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {rotuloOculto ? null : <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>{rotulo}</Text>}
      {ayuda ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{ayuda}</Text> : null}
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={c.micro}
        {...entrada}
        style={[
          t.body,
          estilos.entrada,
          entrada.multiline ? estilos.multilinea : null,
          { backgroundColor: c.cardBg, borderColor: error ? c.danger : c.border, color: c.text, fontSize: 16 },
          entrada.style,
        ]}
      />
      {error ? <TextoDeError texto={error} /> : null}
    </View>
  );
}

/** Una línea de error o de falta, en rojo y a 16 px; el lector de pantalla la anuncia. */
export function TextoDeError({ texto }: { texto: string }) {
  const { c, t } = useTheme();
  return (
    <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
      {texto}
    </Text>
  );
}

/** Un chip que se marca y se desmarca (varios a la vez), con ✓ cuando está marcado: el estado no depende del color. */
export function ChipMarcable({ etiqueta, marcado, onPress }: { etiqueta: string; marcado: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={() => {
        tacto.seleccion();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      accessibilityLabel={etiqueta}
      style={[estilos.chip, { borderColor: marcado ? c.gold : c.border, backgroundColor: marcado ? c.goldWash : c.cardBg }]}
    >
      <Text style={[t.body, { color: marcado ? c.textStrong : c.textSoft, fontSize: 16, fontFamily: fuentes.media }]}>
        {marcado ? '✓ ' : ''}
        {etiqueta}
      </Text>
    </Presionable>
  );
}

/** «−  3  +»: dos botones redondos de 48 y el valor en grande (el máximo de opciones, los extremos de la escala). */
export function Contador({
  rotulo,
  valor,
  onMenos,
  onMas,
  menosApagado = false,
  masApagado = false,
}: {
  rotulo: string;
  valor: string;
  onMenos: () => void;
  onMas: () => void;
  menosApagado?: boolean;
  masApagado?: boolean;
}) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.contador} accessible accessibilityRole="adjustable" accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media, flexShrink: 1 }]}>{rotulo}</Text>
      <View style={estilos.contadorMando}>
        <Redondo texto="−" etiqueta={`Menos: ${rotulo}`} onPress={onMenos} apagado={menosApagado} />
        <Text style={[t.body, { color: c.textStrong, fontSize: 18, fontFamily: fuentes.negrita, minWidth: 64, textAlign: 'center' }]}>{valor}</Text>
        <Redondo texto="+" etiqueta={`Más: ${rotulo}`} onPress={onMas} apagado={masApagado} />
      </View>
    </View>
  );
}

function Redondo({ texto, etiqueta, onPress, apagado }: { texto: string; etiqueta: string; onPress: () => void; apagado: boolean }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={() => {
        tacto.seleccion();
        onPress();
      }}
      disabled={apagado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: apagado }}
      style={[estilos.redondo, { borderColor: c.gold, backgroundColor: c.cardBg, opacity: apagado ? 0.35 : 1 }]}
    >
      <Text style={[t.body, { color: c.textStrong, fontSize: 22, lineHeight: 26, fontFamily: fuentes.negrita }]}>{texto}</Text>
    </Presionable>
  );
}

/** Una tarjeta con borde, el contenedor de casi todo lo que se agrupa en estas pantallas. */
export function Tarjeta({ children, advertencia = false }: { children: React.ReactNode; advertencia?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: advertencia ? c.gold : c.border }]}>{children}</View>
  );
}

/** Un aviso con fondo dorado suave (otra persona publicó, preguntas que no se muestran). */
export function Aviso({ texto, children }: { texto: string; children?: React.ReactNode }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.aviso, { backgroundColor: c.goldWash, borderColor: c.gold }]} accessibilityRole="alert">
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{texto}</Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  botonIcono: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1 },
  entrada: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, width: '100%' },
  multilinea: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 24, borderWidth: 1 },
  contador: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56 },
  contadorMando: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  redondo: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, width: '100%' },
  aviso: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
});
