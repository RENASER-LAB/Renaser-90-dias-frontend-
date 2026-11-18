import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { IndicadoresApi } from '../api/liderMentoresSchemas';
import { dichoDelMentor, estaSuspendido, noTieneGrupo } from '../utils/misMentores';
import { AnilloDeCupo } from './AnilloDeCupo';
import { BarraDeColores } from './BarraDeColores';
import { ContadoresPorColor } from './ContadoresPorColor';

/**
 * Un mentor en «Mis mentores» (spec 056 FR-003, FR-004): el anillo de su cupo con «n/máx» escrito, su nombre, cuántos aprendices tiene en cada
 * estado —con su forma— y la barra de colores. Toda la fila abre su ficha. Sin grupo dice «Sin grupo»; suspendido se ve apagado, sin anillo y
 * sin abrir nada. Lo que el servidor no mandó (`cupo` o `porColor` en `null`) no se dibuja: nunca un cero falso.
 */
export function FilaDeMentorConCupo({ mentor, onAbrir }: { mentor: IndicadoresApi; onAbrir: () => void }) {
  const { c, t } = useTheme();
  const suspendido = estaSuspendido(mentor);
  const sinGrupo = !suspendido && noTieneGrupo(mentor);
  const colores = !suspendido && !sinGrupo ? mentor.porColor : null;

  return (
    <Presionable
      onPress={onAbrir}
      disabled={suspendido}
      accessibilityRole="button"
      accessibilityLabel={dichoDelMentor(mentor)}
      accessibilityState={{ disabled: suspendido }}
      style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg, opacity: suspendido ? 0.55 : 1 }]}
    >
      {!suspendido && mentor.cupo ? <AnilloDeCupo acompanados={mentor.cupo.acompanados} maximo={mentor.cupo.maximo} /> : null}
      <View style={estilos.cuerpo}>
        <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={2}>
          {mentor.fullName}
        </Text>
        {suspendido ? <Text style={[t.body, estilos.detalle, { color: c.textSoft }]}>Cuenta suspendida</Text> : null}
        {sinGrupo ? <Text style={[t.body, estilos.detalle, { color: c.textSoft }]}>Sin grupo</Text> : null}
        {colores ? (
          <>
            <ContadoresPorColor rojo={colores.rojo} ambar={colores.ambar} verde={colores.verde} sinDatos={colores.sinDatos} />
            <BarraDeColores rojo={colores.rojo} ambar={colores.ambar} verde={colores.verde} sinDatos={colores.sinDatos} />
          </>
        ) : null}
      </View>
      {suspendido ? null : <Icon name="chevron" size={16} color={c.chevron} />}
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12 },
  cuerpo: { flex: 1, minWidth: 0, gap: 6 },
  detalle: { fontFamily: fuentes.regular, fontSize: 15, lineHeight: 20 },
});
