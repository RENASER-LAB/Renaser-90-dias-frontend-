import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { DiaDeLaSemana } from '../utils/semanaDeTraining';

/**
 * La semana de Training, de lunes a domingo (spec 014): una pastilla por día con su inicial y su número. El día
 * elegido va en dorado; hoy, con el número en dorado oscuro aunque no esté elegido.
 *
 * No reutiliza `FilaDeDiasDelPlan`: esa es la fila de PLANIFICAR —salta a la semana siguiente el domingo, lleva
 * candado en los días que no se pueden cambiar y escribe la hora de cada uno—; esta es la semana que se VIVE, sin
 * candados ni horas, y cualquier día se puede mirar.
 *
 * Cambiar de día es una acción de decenas de veces al día: cambio instantáneo, `Presionable` de 54 de alto y el
 * «tic» de selección. Sin animación de la pastilla.
 */
export function FilaDeSemana({
  dias,
  elegido,
  onElegir,
}: {
  dias: DiaDeLaSemana[];
  /** `YYYY-MM-DD` del día elegido. */
  elegido: string;
  onElegir: (iso: string) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.fila} accessibilityRole="radiogroup" accessibilityLabel="Días de la semana">
      {dias.map(dia => {
        const activo = dia.iso === elegido;
        const esHoy = dia.relacion === 'hoy';
        return (
          <Presionable
            key={dia.iso}
            onPress={() => {
              if (!activo) tacto.seleccion();
              onElegir(dia.iso);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${dia.nombre} ${dia.numero}${esHoy ? ', hoy' : ''}`}
            contenedorStyle={{ flex: 1 }}
            style={[estilos.pastilla, activo && { backgroundColor: c.gold }]}
          >
            <Text style={[t.small, estilos.letra, { color: activo ? c.onGold : c.textSoft }]}>{dia.letra}</Text>
            <Text
              style={[
                t.body,
                estilos.numero,
                { color: activo ? c.onGold : esHoy ? c.goldInk : c.textStrong },
              ]}
            >
              {dia.numero}
            </Text>
          </Presionable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 4, marginTop: 12 },
  pastilla: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  letra: { fontFamily: fuentes.media, fontSize: 13 },
  numero: { fontFamily: fuentes.negrita, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
