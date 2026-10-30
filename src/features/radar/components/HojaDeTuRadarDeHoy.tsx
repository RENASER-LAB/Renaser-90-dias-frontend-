import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonPrincipal } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import { textoDeLaFilaDeHoy, type FilaDeHoraDeHoy } from '../utils/mitadDelRadar';

/**
 * «Tu Radar de hoy» (spec 016): las horas en que Mi Radar pregunta hoy (con su Despertar y su Dormir) con su estado,
 * «Registrar ahora» si se puede y «Abrir Mi Radar» (Yo → Mi Radar). Se abre al tocar la mitad del Radar de Hoy cuando Mi Radar está encendido y la hora
 * en curso no es una de las elegidas pendientes (esa abre el formulario directo).
 *
 * Las horas son las de HOY (`horasDelDia`): un día con horas propias no usa las de todos. Una hora que pasó sin respuesta
 * dice «Sin registro» a secas, sin palabras de falta ni de culpa, como «Hoy» de Yo → Mi Radar. «Registrar ahora» es el mismo
 * del de Yo y solo aparece cuando el servidor lo aceptaría; si no, se dice por qué (`motivoSinRegistrar`).
 *
 * El estado nunca es solo color: la hora respondida lleva ✓ y el texto; las demás, un círculo vacío y el texto.
 *
 * Es la `HojaDesdeAbajo` de la app: se cierra arrastrándola, tocando fuera, con la ✕ y con el atrás del sistema.
 */
export function HojaDeTuRadarDeHoy({
  visible,
  filas,
  resumen = null,
  leyendo,
  motivoSinRegistrar,
  onRegistrarAhora,
  onCambiarHoras,
  onCerrar,
  alTerminarDeCerrar,
}: {
  visible: boolean;
  filas: readonly FilaDeHoraDeHoy[];
  /** `05:30 a 22:30 · 17 veces`: lo que pregunta hoy, o `null` si no se sabe. */
  resumen?: string | null;
  /** Todavía se leen las respuestas de hoy: las horas se ven, su estado llega enseguida. */
  leyendo: boolean;
  /** Por qué no se puede registrar ahora (`null` = sí se puede y aparece «Registrar ahora»). */
  motivoSinRegistrar: string | null;
  onRegistrarAhora: () => void;
  onCambiarHoras: () => void;
  onCerrar: () => void;
  alTerminarDeCerrar?: () => void;
}) {
  const { c, t } = useTheme();
  const { height } = useWindowDimensions();

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      alTerminarDeCerrar={alTerminarDeCerrar}
      titulo="Tu Radar de hoy"
      subtitulo={resumen ? `Mi Radar · Encendido · ${resumen}` : 'Mi Radar · Encendido'}
      tamano="contenido"
      pie={
        <View style={{ gap: 4 }}>
          {motivoSinRegistrar === null ? (
            <BotonPrincipal etiqueta="Registrar ahora" icono="compass" onPress={onRegistrarAhora} />
          ) : (
            <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>{motivoSinRegistrar}</Text>
          )}
          <Presionable
            onPress={onCambiarHoras}
            accessibilityRole="button"
            accessibilityLabel="Abrir Mi Radar"
            style={estilos.enlace}
          >
            <Text style={[t.body, estilos.texto, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 16 }]}>
              Abrir Mi Radar
            </Text>
            <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.goldInk} />
          </Presionable>
        </View>
      }
    >
      <ScrollView
        style={{ maxHeight: Math.round(height * 0.5) }}
        contentContainerStyle={estilos.cuerpo}
        showsVerticalScrollIndicator
      >
        {filas.map(fila => {
          const texto = leyendo ? '' : textoDeLaFilaDeHoy(fila);
          return (
            <View
              key={fila.hora}
              accessible
              accessibilityLabel={leyendo ? fila.etiqueta : `${fila.etiqueta}, ${texto}`}
              style={[estilos.hora, { borderTopColor: c.divider }]}
            >
              <Text style={[t.body, estilos.texto, estilos.etiqueta, { color: c.textStrong }]}>{fila.etiqueta}</Text>
              <Text style={[t.body, estilos.texto, { color: c.text, flex: 1 }]}>{texto}</Text>
              {leyendo ? null : fila.estado === 'respondida' ? (
                <Icon name="checkCircle" size={TAMANO_ICONO.grande} color={c.success} />
              ) : (
                <View style={[estilos.circulo, { borderColor: fila.estado === 'ahora' ? c.goldInk : c.chevron }]} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingBottom: 8 },
  hora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /* Ancho de dígito fijo (AGENTS.md §4): las horas se alinean en columna. */
  etiqueta: { width: 56, fontFamily: 'Jost_700Bold', fontVariant: ['tabular-nums'] },
  /** El círculo vacío del estado pendiente, del tamaño del ✓ (24) para que las filas no cambien de alto. */
  circulo: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.75, marginHorizontal: 1 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, alignSelf: 'flex-start' },
  texto: { paddingHorizontal: 1 },
});
