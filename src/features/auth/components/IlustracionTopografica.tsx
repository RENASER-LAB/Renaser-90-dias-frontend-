import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../../theme/ThemeContext';
import { curvaDeNivel } from '../utils/cabeceraDelIngreso';

/**
 * Respaldo de la cabecera del login: si la imagen del fénix no se pudo cargar, se dibuja esto en
 * su lugar (2026-10-05). Era la ilustración provisional mientras el dueño generaba la suya; quedó
 * como red, para que una imagen que falla nunca deje un rectángulo vacío arriba del formulario.
 *
 * Fondo liso del color del tema, líneas de contorno topográficas doradas finas (30–60 % de
 * opacidad) y la palabra RENASER en la serif del tema. Vectorial: pesa unos pocos KB, toma los
 * colores del tema y se ve nítida en cualquier pantalla.
 */
const CURVAS_PRINCIPALES = [36, 58, 80, 104, 130, 158, 188];
const CURVAS_SECUNDARIAS = [22, 40, 60, 82];

export function IlustracionTopografica({ ancho, alto }: { ancho: number; alto: number }) {
  const { mode, c, t } = useTheme();
  const oscuro = mode === 'dark';
  const fondo = oscuro ? '#0C0B09' : '#FCFBF9';
  const trazos = oscuro ? ['#C6A45C', '#C6A45C'] : ['#B2924F', '#BC9C58'];
  const escala = Math.max(0.8, ancho / 412);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: fondo }]}>
      <Svg width={ancho} height={alto}>
        <Rect x={0} y={0} width={ancho} height={alto} fill={fondo} />
        <G fill="none" strokeWidth={1}>
          {CURVAS_PRINCIPALES.map((radio, i) => (
            <Path
              key={`p${radio}`}
              d={curvaDeNivel(ancho * 0.7, alto * 0.38, radio * escala, 0.6)}
              stroke={trazos[i % 2]}
              strokeOpacity={0.6 - i * 0.045}
            />
          ))}
          {CURVAS_SECUNDARIAS.map((radio, i) => (
            <Path
              key={`s${radio}`}
              d={curvaDeNivel(ancho * 0.12, alto * 0.72, radio * escala, 2.1)}
              stroke={trazos[(i + 1) % 2]}
              strokeOpacity={0.5 - i * 0.05}
            />
          ))}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centro]}>
        <Text style={[t.hero, { color: c.textStrong, letterSpacing: 2, fontSize: 34, lineHeight: 40 }]}>RENASER</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
});
