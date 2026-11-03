import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { PasoVisible } from '../utils/vistaDeMiIngreso';

const DIAMETRO = 28;

/**
 * La cabecera de «Mi ingreso» (maqueta del dueño): Diagnóstico → Acuerdo → Pagos, cada paso con su estado real. Hecho: círculo dorado con ✓; el que
 * toca ahora: aro dorado con punto; los que siguen: círculo vacío. Un paso que no aplica no llega (no se dibuja). Es orientación, no navegación: ningún
 * paso se toca (el diagnóstico y los términos se releen desde Yo → «Mi diagnóstico» y Mi onboarding, sin repetirlos acá).
 *
 * Cada paso es una columna del mismo ancho con su tramo de línea a cada lado, así los nodos quedan parejos con 2 o con 3 pasos y no hay nada
 * posicionado a mano. Estática: se ve de vez en cuando y no reemplaza nada que se esté usando (`animate-expo`, paso 1: no se anima).
 */
export function PasosDelIngreso({ pasos }: { pasos: PasoVisible[] }) {
  const { c, t } = useTheme();
  if (pasos.length === 0) return null;
  return (
    <View accessibilityRole="list" style={estilos.fila}>
      {pasos.map((paso, i) => {
        const lineaDeLaIzquierda = pasos[i - 1]?.estado === 'hecho';
        const lineaDeLaDerecha = paso.estado === 'hecho';
        return (
          <View key={paso.clave} accessible accessibilityLabel={paso.etiqueta} style={estilos.columna}>
            <View style={estilos.nodoConLineas}>
              <View style={[estilos.linea, { backgroundColor: i === 0 ? 'transparent' : lineaDeLaIzquierda ? c.gold : c.border }]} />
              <Nodo estado={paso.estado} />
              <View style={[estilos.linea, { backgroundColor: i === pasos.length - 1 ? 'transparent' : lineaDeLaDerecha ? c.gold : c.border }]} />
            </View>
            <Text
              numberOfLines={1}
              style={[t.body, { color: paso.estado === 'pendiente' ? c.textSoft : c.textStrong, fontSize: 16, fontFamily: paso.estado === 'actual' ? fuentes.negrita : fuentes.regular }]}
            >
              {paso.titulo}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Nodo({ estado }: { estado: PasoVisible['estado'] }) {
  const { c } = useTheme();
  if (estado === 'hecho') {
    return (
      <View style={[estilos.nodo, { backgroundColor: c.gold, borderColor: c.gold }]}>
        <Icon name="check" size={16} color={c.onGold} strokeWidth={2} />
      </View>
    );
  }
  if (estado === 'actual') {
    return (
      <View style={[estilos.nodo, { borderColor: c.gold, borderWidth: 2.5 }]}>
        <View style={[estilos.punto, { backgroundColor: c.gold }]} />
      </View>
    );
  }
  return <View style={[estilos.nodo, { borderColor: c.borderStrong }]} />;
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  columna: { flex: 1, alignItems: 'center', gap: 8 },
  nodoConLineas: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  linea: { flex: 1, height: 2 },
  nodo: { width: DIAMETRO, height: DIAMETRO, borderRadius: DIAMETRO / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  punto: { width: 10, height: 10, borderRadius: 5 },
});
