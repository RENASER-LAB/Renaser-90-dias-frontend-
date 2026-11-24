import React from 'react';
import { Image, View } from 'react-native';

/**
 * El ícono OFICIAL de Apple Health / Salud (spec 037, D-362; issue #255, norma 2.5.1 de la App Store). Es el PNG que Apple da en
 * Apple Design Resources, sin tocarlo (solo reducido a 40/80/120 px): sin recortarlo en círculo, sin bordes, sombras ni filtros.
 * Reglas de Apple (HIG de HealthKit): el nombre va al lado (lo pone quien lo usa), el ícono nunca es un botón ni va dentro de un
 * texto, y deja un margen libre de 1/10 de su alto (aquí lo pone esta pieza alrededor).
 *
 * Solo iOS: la licencia de Apple permite el ícono únicamente dentro de apps de iOS, así que Android y la web resuelven
 * `LogoSaludDeApple.tsx` (que no dibuja nada y no lleva el archivo).
 */
const ICONO = require('../../../../assets/salud-de-apple/iconoSaludDeApple.png') as number;

export function LogoSaludDeApple({ size = 28 }: { size?: number }) {
  const margen = size / 10;
  return (
    // Decorativo: el nombre «Salud de Apple» ya está escrito al lado, el lector de pantalla no lo repite.
    <View testID="logo-salud-de-apple" aria-hidden style={{ width: size + margen * 2, height: size + margen * 2, padding: margen }}>
      <Image source={ICONO} style={{ width: size, height: size }} resizeMode="contain" accessible={false} />
    </View>
  );
}
