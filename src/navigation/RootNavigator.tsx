import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from '../components/TabBar';
import HoyScreen from '../screens/HoyScreen';
import PlanScreen from '../screens/PlanScreen';
import TrainingScreen from '../screens/TrainingScreen';
import ComunidadScreen from '../screens/ComunidadScreen';
import YoScreen from '../screens/YoScreen';
import LoginScreen from '../screens/LoginScreen';
import { OnboardingFlow } from '../features/onboarding/screens/OnboardingFlow';
import { MapaRenacimientoFlow } from '../features/mapa-renacimiento/MapaRenacimientoFlow';
import { useMapaRenacimientoAbierto } from '../features/mapa-renacimiento/MapaRenacimientoContext';
import { useAuth } from '../context/AuthContext';
import { useFormacionDeLaSesion } from '../features/formaciones/context/FormacionContext';
import { useEleccionRecordada } from '../features/formaciones/hooks/useEleccionRecordada';
import { EleccionDeFormacionScreen } from '../features/formaciones/screens/EleccionDeFormacionScreen';
import { SinFormacionScreen } from '../features/formaciones/screens/SinFormacionScreen';
import { hayQueElegirAlEntrar, llaveDeLasVistas, noTieneFormacion } from '../features/formaciones/utils/vistaDeFormacion';
import { atenderPestanaPedida } from './navegacionAlMontar';
import { verPestanaAlMontar } from './pestanaAlMontar';

const Tab = createBottomTabNavigator();

function MainTabs() {
  // Al volver de «ver como», las pestañas nuevas arrancan en Yo con la consola (ver `pestanaAlMontar`). Esto solo MIRA
  // el pedido: React Navigation ignora `initialRouteName` / `initialParams` cuando el contenedor ya traía el estado de
  // las pestañas anteriores (es el mismo `NavigationContainer`), así que el efecto de abajo lo consume y navega.
  const [inicial] = useState(verPestanaAlMontar);
  useEffect(() => atenderPestanaPedida(), []);
  const paramsDe = (nombre: string) => (inicial?.nombre === nombre ? inicial.params : undefined);
  return (
    <Tab.Navigator
      initialRouteName={inicial?.nombre}
      screenOptions={{ headerShown: false }}
      tabBar={props => <TabBar {...props} />}
    >
      <Tab.Screen name="Hoy" component={HoyScreen} initialParams={paramsDe('Hoy')} />
      <Tab.Screen name="Plan" component={PlanScreen} initialParams={paramsDe('Plan')} />
      <Tab.Screen name="Training" component={TrainingScreen} initialParams={paramsDe('Training')} />
      <Tab.Screen name="Comunidad" component={ComunidadScreen} initialParams={paramsDe('Comunidad')} />
      <Tab.Screen name="Yo" component={YoScreen} initialParams={paramsDe('Yo')} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isOnboardingCompleted, sesionCargando, onboardingResuelto, user } = useAuth();
  const mapa = useMapaRenacimientoAbierto();
  /* Las formaciones (spec 022): el personal con varias elige una al entrar (una sola vez por teléfono), el que no tiene ninguna ve
     un aviso, y al cambiar de formación las pestañas se arman de nuevo (ver la `key` de abajo). Para todos los demás no cambia nada. */
  const { formacion } = useFormacionDeLaSesion();
  const eleccion = useEleccionRecordada(isAuthenticated && user ? user.id : null);

  // Mientras se rehidrata la sesión guardada todavía no se sabe si hay usuario: mostrar el login
  // acá haría que parpadee para alguien que ya estaba logueado.
  if (sesionCargando) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // El bug que esto arregla: se decidía entre Ficha Inicial y home ANTES de que llegara la
  // respuesta de `GET /onboarding/state`, tratando "todavía no sé" igual que un valor confirmado.
  // Por eso la Ficha Inicial aparecía un instante y se iba sola al home. Mientras el estado del
  // onboarding no esté resuelto no se decide nada: no se muestra la ficha para sacarla después,
  // ni se manda al home por las dudas.
  if (!onboardingResuelto) {
    return null;
  }

  if (!isOnboardingCompleted) {
    return <OnboardingFlow />;
  }

  // El Mapa de Renacimiento del Día 7 reemplaza a las pestañas mientras está abierto (manual del
  // Día 7, §3 V01 / AC-01: sin navegación general durante el flujo), igual que el onboarding.
  if (mapa.abierto && user) {
    return <MapaRenacimientoFlow userId={user.id} onSalir={mapa.cerrar} />;
  }
  // Personal sin ninguna formación asignada: solo el aviso (nunca una app vacía sin explicación).
  if (noTieneFormacion(formacion)) {
    return <SinFormacionScreen />;
  }
  // Personal con varias: la pregunta de la primera vez. Hasta leer lo recordado de esta cuenta no se decide (sin parpadeo).
  if (formacion?.puedeElegir && !eleccion.cargada) {
    return null;
  }
  if (hayQueElegirAlEntrar(formacion, eleccion.yaEligio)) {
    return <EleccionDeFormacionScreen onElegida={eleccion.recordar} />;
  }
  /* `key` por cuenta (spec 002, fase 2, «ver como»): al cambiarse a la cuenta de prueba, o al volver a la de Soporte TI,
     las pestañas se arman de nuevo, sin estado ni pantallas abiertas de la otra cuenta. Para el login de siempre no
     cambia nada (las pestañas ya se montan de cero). */
  /* Spec 022: la `key` suma la formación activa. Al cambiar de formación (o al notar, al volver al frente, que un traslado la
     cambió) todo se vuelve a armar de cero: no queda a la vista nada de la anterior ni por un instante. Sin formación conocida
     es la `key` de siempre. */
  return <MainTabs key={llaveDeLasVistas(user?.id, formacion)} />;
}