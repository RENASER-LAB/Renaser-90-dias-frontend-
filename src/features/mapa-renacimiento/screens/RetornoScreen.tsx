import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Entrada, Etiqueta, Nota, Pregunta } from '../components/Piezas';
import { LIMITES, esVago, faltantesDelRetorno, retornoValido, sugerenciasDeRetorno } from '../reglas';
import type { PropsPaso } from './props';

/** V09 · Protocolo de retorno (§3 V09): una acción mínima, observable, ejecutable en menos de 24 h. */
export function RetornoScreen({ estado }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, actualizar, siguiente, anterior } = estado;
  const valido = retornoValido(mapa.retorno);
  const vago = mapa.retorno.trim().length > 0 && esVago(mapa.retorno);
  const sugerencias = sugerenciasDeRetorno(mapa);

  return (
    <PantallaPaso paso={9} onAtras={anterior} boton={{ label: 'Definir mi retorno', onPress: siguiente, disabled: !valido, faltan: faltantesDelRetorno(mapa.retorno) }}>
      <Pregunta>Habrá días imperfectos. Lo importante es cuánto tardas en volver.</Pregunta>
      <Apoyo>Cuando pierdas el ritmo, ¿qué acción mínima realizarás para regresar al plan en menos de 24 horas?</Apoyo>

      <Etiqueta>Mi acción de retorno</Etiqueta>
      <Entrada
        valor={mapa.retorno}
        onCambiar={v => actualizar(previo => ({ ...previo, retorno: v }))}
        placeholder="Ej. Revisar mi mapa y completar una acción pendiente en menos de 20 minutos"
        multilinea
        minimo={LIMITES.retorno.min}
        maximo={LIMITES.retorno.max}
      />
      {vago ? <Text style={[t.small, { color: c.danger, marginTop: 4 }]}>"Ponerme las pilas" o "motivarme" no se pueden ejecutar. Elige algo que puedas hacer en 2–30 minutos.</Text> : null}

      <Etiqueta>Sugerencias (según tus acciones)</Etiqueta>
      <View style={styles.sugerencias}>
        {sugerencias.map(s => (
          <Pressable key={s} onPress={() => actualizar(previo => ({ ...previo, retorno: s }))} accessibilityRole="button"
            style={[styles.sugerencia, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Text style={[t.small, { color: c.text }]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Nota>No necesitas volver al 100 %. Solo una acción para retomar el movimiento.</Nota>
    </PantallaPaso>
  );
}

const styles = StyleSheet.create({
  sugerencias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  sugerencia: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center', maxWidth: '100%' },
});
