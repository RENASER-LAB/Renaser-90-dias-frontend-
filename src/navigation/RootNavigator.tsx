import React from 'react';
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

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <TabBar {...props} />}>
      <Tab.Screen name="Hoy" component={HoyScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Training" component={TrainingScreen} />
      <Tab.Screen name="Comunidad" component={ComunidadScreen} />
      <Tab.Screen name="Yo" component={YoScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isOnboardingCompleted, sesionCargando, onboardingResuelto, user } = useAuth();
  const mapa = useMapaRenacimientoAbierto();

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
  return <MainTabs />;
}