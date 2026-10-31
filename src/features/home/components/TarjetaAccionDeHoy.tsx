import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { rangoDeHoraDeLaAccion } from '../../objetivos/utils/accionesDeHoy';
import type { VistaDeLaAccionDeHoy } from '../utils/vistaDeLaAccionDeHoy';

/**
 * La tarjeta de acciones de Hoy (2026-10-31, pedido del dueño con una referencia: «mismo diseño, no las mismas palabras»).
 * Va arriba, antes de «Tu acompañante», donde estaban la frase del día y Coherencia / Racha.
 *
 * Un solo esqueleto: una tarjeta con el fondo y el borde del tema; arriba un ícono de 16 con la hora (o con la etiqueta del
 * estado); el título en negrita; si hay meta, «Meta: …»; y abajo un botón dorado a todo el ancho con su chevron. Sin los «…»
 * de la referencia: no harían nada. Qué muestra cada caso lo decide `vistaDeLaAccionDeHoy` (lógica pura); acá solo se dibuja.
 *
 * **Movimiento:** ninguno propio. La tarjeta aparece con el resto de Hoy y el botón responde con la escala de siempre.
 */
export function TarjetaAccionDeHoy({
  vista,
  meta,
  alEmpezar,
  alHacerElMapa,
  alAgendar,
}: {
  vista: VistaDeLaAccionDeHoy;
  /** El objetivo al que pertenece la acción (`useMetaDeLaAccion`); sin él la línea no se dibuja. */
  meta: string | null;
  alEmpezar: (accionId: string) => void;
  alHacerElMapa: () => void;
  alAgendar: () => void;
}) {
  const { c, t } = useTheme();

  let icono: IconName = 'calendar';
  let arriba: string;
  let titulo: string;
  let boton: { texto: string; alPulsar: () => void } | null;
  switch (vista.tipo) {
    case 'accion':
      arriba = rangoDeHoraDeLaAccion(vista.accion);
      titulo = vista.accion.titulo;
      boton = { texto: 'Empezar ahora', alPulsar: () => alEmpezar(vista.accion.id) };
      break;
    case 'mapa':
      icono = 'map';
      arriba = 'Tu Mapa de Renacimiento';
      titulo = 'Tu objetivo de 90 días nace de tu Mapa de Renacimiento.';
      boton = { texto: 'Hacer mi Mapa', alPulsar: alHacerElMapa };
      break;
    case 'sin-acciones':
      arriba = 'Hoy';
      titulo = 'Hoy no tienes acciones agendadas';
      boton = { texto: 'Agendar en Plan', alPulsar: alAgendar };
      break;
    case 'todo-cumplido':
      icono = 'checkCircle';
      arriba = 'Hoy';
      titulo = 'Cumpliste tus acciones de hoy';
      boton = null;
      break;
  }
  const metaVisible = vista.tipo === 'accion' && meta ? meta : null;

  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.fila}>
        <Icon name={icono} size={TAMANO_ICONO.chico} color={c.goldInk} />
        <Text style={[t.small, estilos.hora, { color: c.goldInk }]} numberOfLines={1}>
          {arriba}
        </Text>
      </View>
      <Text style={[t.cardTitle, estilos.titulo, { color: c.textStrong }]} numberOfLines={3}>
        {titulo}
      </Text>
      {metaVisible ? (
        <Text style={[t.body, estilos.meta, { color: c.textSoft }]} numberOfLines={2}>
          Meta: {metaVisible}
        </Text>
      ) : null}
      {boton ? (
        <GoldButton
          label={boton.texto}
          onPress={boton.alPulsar}
          icon="chevron"
          style={estilos.boton}
          textStyle={estilos.textoDelBoton}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /** Cifras que cambian: ancho de dígito fijo (AGENTS.md §4). */
  hora: { fontSize: 16, lineHeight: 22, fontFamily: 'Jost_700Bold', fontVariant: ['tabular-nums'], flexShrink: 1 },
  titulo: { fontSize: 18, lineHeight: 25, fontFamily: 'Jost_700Bold', marginTop: 10 },
  meta: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  boton: { marginTop: 16, alignSelf: 'stretch' },
  /** El botón de siempre trae versalitas espaciadas de 11 px: acá es una frase en tipo oración de 16. */
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
});
