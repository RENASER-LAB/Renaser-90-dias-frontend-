import { fuentes } from '../../../theme/fuentes';
import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { Flecha } from '../../semaforo/components/NavegacionDeSemanas';
import { cambioAlSoltar, empiezaElDeslizamiento, type CambioDeSemana } from '../utils/semanasDelEditor';

/**
 * Pasar de semana en «Por semana» del editor de Planificar (2026-11-02, pedido del dueño: «¿a qué? debería deslizar hacia la derecha y poder
 * planificar»): arriba «‹  Semana del 9 al 15 nov  ›» y debajo lo que se dibuja de esa semana —la fila de días—. Se cambia con las flechas
 * (48 × 48, las mismas de «Tiempo libre») **y deslizando la fila** de lado: el dedo a la izquierda trae la semana siguiente, a la derecha
 * la anterior, como pasar una página.
 *
 * ## El deslizamiento
 *
 * `PanResponder`, como el arrastre de `HojaDesdeAbajo`: Gesture Handler no está instalado y agregarlo pide un build nativo. Solo toma el
 * gesto cuando el dedo va claramente de lado (`empiezaElDeslizamiento`): un toque en una pastilla y el desplazamiento vertical de la hoja
 * quedan como están. Una vez que lo toma no lo suelta, para que el `ScrollView` de la hoja no lo cancele a mitad (Android/Xiaomi). No
 * sigue al dedo ni anima: es un cambio instantáneo y el háptico lo pone quien cambia la semana (`tacto.seleccion()`), una vez por cambio.
 * Las flechas siguen siendo el camino para quien no desliza o usa lector de pantalla.
 */
export function SelectorDeSemana({
  rotulo,
  puedeAnterior,
  puedeSiguiente,
  alCambiar,
  ocupado = false,
  children,
}: {
  /** «Semana del 9 al 15 nov». */
  rotulo: string;
  puedeAnterior: boolean;
  puedeSiguiente: boolean;
  alCambiar: (cambio: CambioDeSemana) => void;
  /** Se está leyendo la semana: lo de abajo se ve atenuado y no se toca. */
  ocupado?: boolean;
  children: React.ReactNode;
}) {
  const { c } = useTheme();

  /* El gesto se crea una vez; lo que cambia (los límites y quién cambia la semana) se lee de acá en el momento de soltar. */
  const ultimo = useRef({ puedeAnterior, puedeSiguiente, alCambiar });
  ultimo.current = { puedeAnterior, puedeSiguiente, alCambiar };

  const respondedor = useMemo(
    () =>
      PanResponder.create({
        // Un toque sin movimiento es de la pastilla, no nuestro.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => empiezaElDeslizamiento(g.dx, g.dy),
        // En captura: la pastilla ya se quedó con el toque al apoyar el dedo; si el dedo va de lado, el gesto es nuestro.
        onMoveShouldSetPanResponderCapture: (_e, g) => empiezaElDeslizamiento(g.dx, g.dy),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderRelease: (_e, g) => {
          const cambio = cambioAlSoltar({ dx: g.dx, dy: g.dy, vx: g.vx });
          if (cambio === null) return;
          const { puedeAnterior: atras, puedeSiguiente: adelante, alCambiar: cambiar } = ultimo.current;
          if ((cambio === 'anterior' && !atras) || (cambio === 'siguiente' && !adelante)) return;
          cambiar(cambio);
        },
      }),
    [],
  );

  return (
    <View testID="selector-de-semana">
      <View style={estilos.cabecera}>
        <Flecha icono="arrowLeft" etiqueta="Semana anterior" habilitada={puedeAnterior && !ocupado} onPress={() => alCambiar('anterior')} />
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={[estilos.rotulo, { color: c.textStrong }]}
        >
          {rotulo}
        </Text>
        <Flecha icono="arrow" etiqueta="Semana siguiente" habilitada={puedeSiguiente && !ocupado} onPress={() => alCambiar('siguiente')} />
      </View>
      <View
        testID="deslizar-por-semanas"
        {...respondedor.panHandlers}
        accessibilityState={{ busy: ocupado }}
        pointerEvents={ocupado ? 'none' : 'auto'}
        style={{ opacity: ocupado ? 0.4 : 1 }}
      >
        {children}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  // 17 px y negrita media: es lo único que dice dónde estás; con la letra del sistema grande baja a dos renglones y no se corta.
  rotulo: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 17, lineHeight: 23, fontFamily: fuentes.seminegrita, letterSpacing: 0 },
});
