import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { ResumenDeHuecos } from '../types/huecos.types';
import { lineaDeLoReal, lineaDelHuecoQueSeRepite, tiempoDelResumen } from '../utils/textosDeHuecos';

/**
 * El resumen de la semana: cuánto tiempo tuvo ocupado y cuánto libre, lo real (cuántos hábitos cumplió a tiempo, tarde
 * o dejó sin cumplir) y los huecos que se le repiten en varios días. Todo viene calculado del servidor: la app no suma
 * ni cuenta nada.
 *
 * Lo real solo se escribe si hay algo que contar (una semana por venir no tiene «0 a tiempo · 0 tarde…», que parecería un
 * resultado). Sin huecos repetidos se dice y se termina en una línea.
 */
export function ResumenDeLaSemana({ resumen }: { resumen: ResumenDeHuecos }) {
  const { c, t } = useTheme();
  const real = lineaDeLoReal(resumen);

  return (
    <View style={estilos.resumen}>
      <View style={estilos.cifras}>
        <Cifra etiqueta="Tiempo ocupado" valor={tiempoDelResumen(resumen.minutosOcupados)} />
        <Cifra etiqueta="Tiempo libre" valor={tiempoDelResumen(resumen.minutosLibres)} />
      </View>

      {real ? (
        <View style={estilos.bloque}>
          <Text style={[t.micro, estilos.rotulo, { color: c.micro, fontSize: 14 /* metadato */ }]}>Lo real de la semana</Text>
          <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{real}</Text>
        </View>
      ) : null}

      <View style={estilos.bloque}>
        <Text style={[t.micro, estilos.rotulo, { color: c.micro, fontSize: 14 /* metadato */ }]}>Huecos que se repiten</Text>
        {resumen.huecosQueSeRepiten.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>Ningún hueco se repite esta semana.</Text>
        ) : (
          resumen.huecosQueSeRepiten.map(hueco => (
            <Text
              key={`${hueco.desde}-${hueco.hasta}-${hueco.dias.join('')}`}
              style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}
            >
              {lineaDelHuecoQueSeRepite(hueco)}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.cifra}>
      <Text style={[t.micro, estilos.rotulo, { color: c.micro, fontSize: 14 /* metadato */ }]}>{etiqueta}</Text>
      <Text style={[t.metric, { color: c.textStrong, fontSize: 21, letterSpacing: -0.2, fontFamily: 'Jost_700Bold' }]}>
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  resumen: { gap: 14 },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cifra: { flexGrow: 1, flexBasis: 130, minWidth: 0, gap: 2 },
  bloque: { gap: 3 },
  /* Rótulo en tipo oración: sin el espaciado de las versalitas (decisión del dueño, 2026-10-05) y en negrita. */
  rotulo: { letterSpacing: 0, fontFamily: 'Jost_700Bold' },
});
