// Primero de todo: el tope de la letra del sistema (ver src/theme/topeDeLetra.ts).
import './src/theme/topeDeLetraGlobal';

import { registerRootComponent } from 'expo';

import App from './App';
import { definirTareaDeLaCarrera } from './src/features/carrera/servicios/tareaDeUbicacion';

// Spec 042: la tarea del GPS de la carrera se define al cargar la app (regla de expo-task-manager): Android la vuelve a llamar
// aunque la pantalla de la carrera no esté abierta. Solo Android; en la web no hace nada.
definirTareaDeLaCarrera();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
