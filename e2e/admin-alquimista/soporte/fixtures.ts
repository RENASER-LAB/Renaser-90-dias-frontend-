import { test as base, expect, type Page } from '@playwright/test';

import { ApiDePruebas } from './api';
import { ENTORNO, type Actor } from './entorno';

/**
 * Una sesión por actor, nunca compartida.
 *
 * Playwright permite reutilizar `storageState` entre casos, y para un solo usuario es cómodo.
 * Acá está prohibido a propósito: la mitad de lo que esta suite comprueba es QUIÉN puede ver qué,
 * y un estado compartido entre un administrador y un aprendiz haría pasar exactamente los casos
 * que tienen que fallar.
 */
type Fixtures = {
  entrarComo: (actor: Actor) => Promise<Page>;
  api: (actor: Actor) => ApiDePruebas;
};

export const test = base.extend<Fixtures>({
  entrarComo: async ({ page }, usar) => {
    await usar(async (actor: Actor) => {
      await page.goto('/');
      await iniciarSesion(page, actor);
      return page;
    });
  },
  api: async ({}, usar) => {
    await usar((actor: Actor) => new ApiDePruebas(actor));
  },
});

export { expect };

/**
 * Login REAL por la interfaz. No se inyecta el token en `localStorage`: hacerlo saltearía el
 * único lugar donde se comprueba que la app guarda y reenvía el `X-Auth-Token` como el backend
 * espera, que es la parte frágil en React Native Web.
 */
export async function iniciarSesion(page: Page, actor: Actor): Promise<void> {
  await page.getByLabel(/correo|email/i).fill(actor.email);
  await page.getByLabel(/contraseñ|password/i).fill(actor.password);
  await page.getByRole('button', { name: /entrar|iniciar sesión|ingresar/i }).click();
  // Se espera por un estado observable de la app, no por un tiempo fijo: un `waitForTimeout`
  // pasa en una máquina rápida y falla en la lenta, que es la definición de prueba inestable.
  await expect(page.getByRole('button', { name: /hoy/i }).first()).toBeVisible({ timeout: 30_000 });
}

export async function cerrarSesion(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^yo$/i }).click();
  await page.getByRole('button', { name: /cerrar sesión/i }).click();
  await expect(page.getByLabel(/correo|email/i)).toBeVisible({ timeout: 20_000 });
}

/** Entra a Administración desde Hoy. Devuelve `false` si la cuenta no tiene la entrada. */
export async function abrirAdministracion(page: Page): Promise<boolean> {
  const entrada = page.getByRole('button', { name: /abrir administración/i });
  if ((await entrada.count()) === 0) return false;
  await entrada.first().click();
  await expect(page.getByText(/pendientes/i).first()).toBeVisible();
  return true;
}

export { ENTORNO };
