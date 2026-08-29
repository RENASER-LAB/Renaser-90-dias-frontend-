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
  const { isAuthenticated, isOnboardingCompleted } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (!isOnboardingCompleted) {
    return <OnboardingFlow />;
  }

  return <MainTabs />;
}