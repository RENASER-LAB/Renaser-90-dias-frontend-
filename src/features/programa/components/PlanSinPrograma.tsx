import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { BotonElegirDiaUno } from './BotonElegirDiaUno';

/** Lo que dice Plan a quien todavía no tiene programa propio: su plan nace del programa. */
export const TITULO_DE_PLAN_SIN_PROGRAMA = 'Tu plan empieza con tu programa';
export const TEXTO_DE_PLAN_SIN_PROGRAMA = 'Cuando elijas tu Día 1 podrás escribir tus objetivos y agendar tus acciones aquí.';

/**
 * Plan del personal que todavía no tiene su programa andando (sin programa, o con la fila y sin Día 1; E2E de las formaciones, 01/11/2026, issues #81,
 * #82, #83 y #85). No hay objetivos que leer —el servidor rechaza todo `/rocks/*` hasta que el programa esté activo—, pero la pantalla no se deja vacía:
 * una tarjeta más de Plan, **arriba, pegada a la cabecera** y con el aire de siempre entre secciones (regla del dueño: sin huecos entre la cabecera y lo
 * de abajo), con su ícono, el título, la explicación y el botón «Elegir mi Día 1» (el mismo selector de siempre, `BotonElegirDiaUno`). Es el MISMO estado para
 * todos: el mismo componente, sin variantes según el rol o la fila.
 *
 * **Sin movimiento propio**: se ve de vez en cuando y no reemplaza nada que se esté usando.
 */
export function PlanSinPrograma({ alElegirDiaUno }: { alElegirDiaUno: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.encabezado}>
        <View style={[estilos.medallon, { backgroundColor: c.goldWash }]}>
          <Icon name="calendarRange" size={TAMANO_ICONO.grande} color={c.goldInk} />
        </View>
        <Text accessibilityRole="header" style={[t.cardTitle, estilos.titulo, { color: c.textStrong }]}>
          {TITULO_DE_PLAN_SIN_PROGRAMA}
        </Text>
      </View>
      <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>{TEXTO_DE_PLAN_SIN_PROGRAMA}</Text>
      <View style={estilos.boton}>
        <BotonElegirDiaUno onActivado={alElegirDiaUno} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17, gap: 12 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medallon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 18, lineHeight: 25 },
  texto: { fontSize: 16, lineHeight: 23 },
  boton: { alignSelf: 'stretch', marginTop: 4 },
});
