import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { BotonElegirDiaUno } from './BotonElegirDiaUno';

/** Lo que dice Plan a quien todavía no tiene programa propio: su plan nace del programa. */
export const TITULO_DE_PLAN_SIN_PROGRAMA = 'Tu plan empieza con tu programa';
export const TEXTO_DE_PLAN_SIN_PROGRAMA = 'Cuando elijas tu Día 1 podrás escribir tus objetivos y agendar tus acciones aquí.';

/**
 * Plan del personal que todavía no tiene programa propio (E2E de las formaciones, 01/11/2026, issues #81 y #82). No hay objetivos que leer —el servidor
 * responde 404 a todo `/rocks/*` sin participación—, pero la pantalla no se deja vacía: un estado con cuerpo, centrado en el espacio que sobra, con su
 * ícono, el título, la explicación y el botón «Elegir mi Día 1» (el mismo selector de siempre, `BotonElegirDiaUno`).
 *
 * Llena el alto disponible (`flexGrow: 1`): sin eso el bloque quedaría pegado arriba y la mitad de abajo en blanco. **Sin movimiento propio**: se ve
 * de vez en cuando y no reemplaza nada que se esté usando.
 */
export function PlanSinPrograma({ alElegirDiaUno }: { alElegirDiaUno: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.cuerpo}>
      <View style={[estilos.medallon, { backgroundColor: c.goldWash }]}>
        <Icon name="calendarRange" size={TAMANO_ICONO.grande} color={c.goldInk} />
      </View>
      <Text accessibilityRole="header" style={[t.cardTitle, estilos.titulo, { color: c.textStrong }]}>
        {TITULO_DE_PLAN_SIN_PROGRAMA}
      </Text>
      <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>{TEXTO_DE_PLAN_SIN_PROGRAMA}</Text>
      <View style={estilos.boton}>
        <BotonElegirDiaUno onActivado={alElegirDiaUno} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 24 },
  medallon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 20, lineHeight: 26, textAlign: 'center' },
  texto: { fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 420 },
  boton: { alignSelf: 'stretch', marginTop: 6 },
});
