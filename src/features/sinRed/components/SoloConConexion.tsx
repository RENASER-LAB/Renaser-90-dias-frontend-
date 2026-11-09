import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { alVolverLaConexion, sinConexionDesdeMs, suscribirConexion } from '../estadoDeConexion';

export const TEXTO_NECESITAS_CONEXION = 'Necesitas conexión para usar esto';
export const AYUDA_NECESITAS_CONEXION = 'Se cargará solo cuando vuelva la señal.';

/**
 * Spec 048 (FR-005, D3): lo que solo funciona con internet (SER, chat, Pagos, Eventos, Código Renaser, videos). Sin señal muestra
 * un mensaje claro en vez de un hueco en blanco o un error raro; al volver la señal vuelve a montar lo de adentro, que carga solo.
 * Envuelve el CUERPO de la pantalla, nunca la cabecera: el botón de volver o cerrar sigue a mano.
 */
export function SoloConConexion({ children }: { children: React.ReactNode }) {
  const { c, t } = useTheme();
  const [sinRed, setSinRed] = useState(sinConexionDesdeMs() !== null);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    const quitar = suscribirConexion(() => setSinRed(sinConexionDesdeMs() !== null));
    const alVolver = alVolverLaConexion(() => setVuelta(v => v + 1));
    return () => {
      quitar();
      alVolver();
    };
  }, []);

  if (!sinRed) return <React.Fragment key={vuelta}>{children}</React.Fragment>;
  return (
    <View style={estilos.caja} accessibilityRole="summary">
      <Icon name="cloudOff" size={24} color={c.textSoft} />
      <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center' }]}>{TEXTO_NECESITAS_CONEXION}</Text>
      <Text style={[t.small, { color: c.textSoft, textAlign: 'center' }]}>{AYUDA_NECESITAS_CONEXION}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 48 },
});
