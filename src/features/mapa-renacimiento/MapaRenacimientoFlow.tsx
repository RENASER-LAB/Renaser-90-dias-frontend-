import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSystemBackHandler } from '../../hooks/useSystemBackHandler';
import { useTheme } from '../../theme/ThemeContext';
import { useMapaRenacimiento } from './hooks/useMapaRenacimiento';
import { conPrincipalPrimero } from '../objetivos/hooks/usePrioridadPrincipal';
import { AREAS, type Area } from './tipos';
import type { PropsPaso } from './screens/props';
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
/** Qué pantalla llena cada área. El ORDEN no vive acá: lo decide la prioridad del paso 2. */
const PANTALLA_DEL_AREA: Record<Area, (props: PropsPaso) => React.JSX.Element> = {
  salud: ObjetivoSaludScreen,
  negocio_dinero: ObjetivoNegocioScreen,
  relaciones: ObjetivoRelacionesScreen,
};

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
        <ActivityIndicator color={c.goldInk} />
      </View>
    );
  }

  const props = { estado, onSalir };
  // Un mapa ya activo no vuelve a recorrerse: abre directo en el cierre, que es su estado real.
  const paso = mapa.estado === 'activo' ? 11 : mapa.pasoActual;
  switch (paso) {
    case 1: return <AperturaScreen {...props} />;
    case 2: return <PrioridadScreen {...props} />;
    /*
     * Los tres objetivos, EMPEZANDO POR EL ÁREA QUE ELIGIÓ EN EL PASO 2.
     *
     * > **Corregido el 2026-09-23.** Acá había tres `case` fijos: 3 = salud, 4 = negocio,
     * > 5 = relaciones. Elegías "Negocio y dinero" como prioridad y el paso siguiente te pedía
     * > *"¿qué cambio concreto quieres demostrar en tu cuerpo o salud?"*. El dueño lo reportó
     * > probando el Mapa: *"¿por qué me sale, si es negocios? el usuario se marea"*.
     * >
     * > Se siguen llenando las tres —el paso 2 lo dice: *"Trabajarás las tres"*— pero la que la
     * > persona acaba de señalar como prioridad va primero. Es el mismo criterio que Plan y el
     * > asistente semanal ya usan, y de hecho la misma función: `conPrincipalPrimero`.
     */
    case 3:
    case 4:
    case 5: {
      const Pantalla = PANTALLA_DEL_AREA[conPrincipalPrimero(AREAS, mapa.prioridad)[paso - 3]];
      return <Pantalla {...props} numeroDePaso={paso} />;
    }
    case 6: return <SistemaEjecucionScreen {...props} />;
    case 7: return <ReemplazosScreen {...props} />;
    case 8: return <HitosScreen {...props} />;
    case 9: return <RetornoScreen {...props} />;
    case 10: return <ActivacionScreen {...props} />;
    default: return <CierreScreen {...props} />;
  }
}
