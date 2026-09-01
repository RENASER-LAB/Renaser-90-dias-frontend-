import type { User } from '../types/auth.types';

/**
 * Usuarios de demostración: sirven para recorrer la app sin backend (presentaciones, QA de UI).
 * Viven acá y no en el contexto para que quede evidente que son datos fijos, no una sesión real
 * — el día que se retire el modo demo se borra este archivo y nada más.
 */

/** Usuario existente, con el onboarding ya culminado: entra directo a Home. */
export const USUARIO_DEMO_EXISTENTE: User = {
  id: 'demo-1',
  name: 'Sebastián Arango',
  email: 'sebastian@renaser.com',
  role: 'TRAINEE',
  status: 'ACTIVE',
  avatarUrl: null,
};

/** Usuario recién llegado: arranca el Onboarding desde cero. */
export const USUARIO_DEMO_NUEVO: User = {
  id: 'demo-2',
  name: 'Nuevo Guerrero Renaser',
  email: 'guerrero@renaser.com',
  role: 'TRAINEE',
  status: 'ACTIVE',
  avatarUrl: null,
};

/** Resultado simulado del login con Google, hasta que se conecte el flujo OAuth real. */
export const USUARIO_DEMO_GOOGLE: User = {
  id: 'demo-google',
  name: 'Usuario Google',
  email: 'usuario.google@gmail.com',
  role: 'TRAINEE',
  status: 'ACTIVE',
  avatarUrl: null,
};

/** Resultado simulado del login con Apple, hasta que se conecte el flujo real. */
export const USUARIO_DEMO_APPLE: User = {
  id: 'demo-apple',
  name: 'Usuario Apple',
  email: 'usuario.apple@icloud.com',
  role: 'TRAINEE',
  status: 'ACTIVE',
  avatarUrl: null,
};

/** Espera artificial de los mocks, para que la UI muestre su estado de carga como con red real. */
export function esperaSimulada(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
