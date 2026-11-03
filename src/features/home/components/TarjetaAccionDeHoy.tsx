import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { FilaCompacta } from '../../../components/FilaCompacta';
import { useTheme } from '../../../theme/ThemeContext';
import { rangoDeHoraDeLaAccion } from '../../objetivos/utils/accionesDeHoy';
import type { VistaDeLaAccionDeHoy } from '../utils/vistaDeLaAccionDeHoy';
import { usePlazoDelObjetivo } from '../../objetivos/context/PlazoDelObjetivo';

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
  alIrAPlan,
  alAgendar,
}: {
  vista: VistaDeLaAccionDeHoy;
  /** El objetivo al que pertenece la acción (`useMetaDeLaAccion`); sin él la línea no se dibuja. */
  meta: string | null;
  alEmpezar: (accionId: string) => void;
  /** «Escribir mi objetivo» / «Confirmar»: lleva a Plan, donde se escriben y se confirman los objetivos de 90 días. */
  alIrAPlan: () => void;
  alAgendar: () => void;
}) {
  const { c, t } = useTheme();
  const plazo = usePlazoDelObjetivo();

  /* Sin objetivos de 90 días, o con los del diagnóstico por confirmar (spec 026; antes aquí iba «Haz tu Mapa de Renacimiento»):
     una fila compacta, toda tocable, del alto que tenía Coherencia / Racha (corregido 2026-10-31, el dueño: «no tan grande»),
     en lugar de la tarjeta con botón dorado. Lleva a Plan. Es `FilaCompacta`, la misma de la entrada al programa propio. */
  if (vista.tipo === 'sin-objetivos' || vista.tipo === 'por-confirmar') {
    const titulo = vista.tipo === 'sin-objetivos' ? `Define tu objetivo de ${plazo} en Plan` : `Confirma tus objetivos de ${plazo}`;
    const accion = vista.tipo === 'sin-objetivos' ? 'Escribir mi objetivo' : 'Confirmar';
    return (
      <FilaCompacta
        icono="flag"
        titulo={titulo}
        linea={accion}
        onPress={alIrAPlan}
        accessibilityLabel={`${titulo}. ${accion}.`}
      />
    );
  }

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
  hora: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.negrita, fontVariant: ['tabular-nums'], flexShrink: 1 },
  titulo: { fontSize: 18, lineHeight: 25, fontFamily: fuentes.negrita, marginTop: 10 },
  meta: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  boton: { marginTop: 16, alignSelf: 'stretch' },
  /** El botón de siempre trae versalitas espaciadas de 11 px: acá es una frase en tipo oración de 16. */
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
});
