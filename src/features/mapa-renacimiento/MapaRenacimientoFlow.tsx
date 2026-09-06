import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSystemBackHandler } from '../../hooks/useSystemBackHandler';
import { useTheme } from '../../theme/ThemeContext';
import { useMapaRenacimiento } from './hooks/useMapaRenacimiento';
import { ActivacionScreen } from './screens/ActivacionScreen';
import { AperturaScreen } from './screens/AperturaScreen';
import { CierreScreen } from './screens/CierreScreen';
import { HitosScreen } from './screens/HitosScreen';
import { ObjetivoNegocioScreen } from './screens/ObjetivoNegocioScreen';
import { ObjetivoRelacionesScreen } from './screens/ObjetivoRelacionesScreen';
import { ObjetivoSaludScreen } from './screens/ObjetivoSaludScreen';
import { PrioridadScreen } from './screens/PrioridadScreen';
import { ReemplazosScreen } from './screens/ReemplazosScreen';
import { RetornoScreen } from './screens/RetornoScreen';
import { SistemaEjecucionScreen } from './screens/SistemaEjecucionScreen';

/**
 * El Mapa de Renacimiento del Día 7, a pantalla completa. Reanuda en el paso donde quedó
 * (manual §2.1 "Reanudación"): el hook carga el borrador y `pasoActual` decide qué vista se ve.
 * Atrás del sistema (Android) vuelve un paso; en la apertura, cierra el mapa.
 */
export function MapaRenacimientoFlow({ userId, onSalir }: { userId: string; onSalir: () => void }) {
  const { c } = useTheme();
  const estado = useMapaRenacimiento(userId);
  const { mapa, cargando, anterior } = estado;

  useSystemBackHandler(() => {
    if (mapa.pasoActual <= 1 || mapa.pasoActual === 11) {
      onSalir();
      return true;
    }
    anterior();
    return true;
  });

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }

  const props = { estado, onSalir };
  // Un mapa ya activo no vuelve a recorrerse: abre directo en el cierre, que es su estado real.
  const paso = mapa.estado === 'activo' ? 11 : mapa.pasoActual;
  switch (paso) {
    case 1: return <AperturaScreen {...props} />;
    case 2: return <PrioridadScreen {...props} />;
    case 3: return <ObjetivoSaludScreen {...props} />;
    case 4: return <ObjetivoNegocioScreen {...props} />;
    case 5: return <ObjetivoRelacionesScreen {...props} />;
    case 6: return <SistemaEjecucionScreen {...props} />;
    case 7: return <ReemplazosScreen {...props} />;
    case 8: return <HitosScreen {...props} />;
    case 9: return <RetornoScreen {...props} />;
    case 10: return <ActivacionScreen {...props} />;
    default: return <CierreScreen {...props} />;
  }
}
