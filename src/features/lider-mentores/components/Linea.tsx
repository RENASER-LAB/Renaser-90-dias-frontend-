import React from 'react';
import { Text } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

/** Un texto de lectura: 16 px (SDD 002, RL-30). Vive aparte para que las hojas lo usen sin traer el marco de la pantalla entera. */
export function Linea({ children, fuerte = false }: { children: React.ReactNode; fuerte?: boolean }) {
  const { c, t } = useTheme();
  return <Text style={[t.body, { color: fuerte ? c.textStrong : c.textSoft, fontSize: 16, lineHeight: 23 }]}>{children}</Text>;
}
