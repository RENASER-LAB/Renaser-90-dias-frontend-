import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Referencia al navegador, para poder navegar desde afuera del árbol de navegación.
 *
 * La necesita el arranque guiado (`features/sparkie`): igual que `RenasiaLauncher`, se monta por
 * ENCIMA de `RootNavigator` — así puede aparecer sobre cualquier pestaña sin tocar ninguna de las
 * cinco pantallas principales (AGENTS.md §1, "Integridad del Core"). El precio de estar afuera es
 * que `useNavigation()` no funciona ahí: fuera de un navegador, ese hook lanza. Esta referencia es
 * la salida que la propia librería documenta para el caso.
 *
 * `isReady()` antes de navegar no es opcional: durante el primer render el contenedor todavía no
 * montó y navegar ahí no hace nada, en silencio.
 */
export const navegacionRef = createNavigationContainerRef();

/**
 * Lleva a una pestaña principal, con parámetros opcionales. Devuelve `false` si el navegador
 * todavía no estaba listo, para que quien llama pueda decidir qué hacer en vez de creer que
 * navegó.
 */
export function irAPestana(nombre: string, params?: Record<string, unknown>): boolean {
  if (!navegacionRef.isReady()) return false;
  // `navigate` con un nombre de pestaña sobre un tab navigator plano es exactamente lo que ya hace
  // Training para abrir la Clase Diaria en Comunidad: no se inventa ningún mecanismo nuevo.
  //
  // El cast es el mismo que ya usan `HoyScreen` y `ComunidadScreen` para navegar entre pestañas:
  // este tab navigator no declara un `ParamList`, así que sin tipos de rutas TypeScript reduce la
  // firma de `navigate` a `never` y no hay forma de llamarla. El día que se tipen las rutas, este
  // cast se cae solo.
  (navegacionRef.navigate as (nombre: string, params?: Record<string, unknown>) => void)(nombre, params);
  return true;
}
