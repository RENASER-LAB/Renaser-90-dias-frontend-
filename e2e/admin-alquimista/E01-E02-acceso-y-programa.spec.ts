import { abrirAdministracion, cerrarSesion, expect, test } from './soporte/fixtures';
import { ENTORNO, rolesAdministrativos } from './soporte/entorno';

/**
 * E01 — Entrar a Administración y volver, sin que se toquen los cinco tabs.
 * E02 — "Ahora no", cambio de cuenta y programa personal opcional.
 *
 * Los dos recorridos se ejecutan con ADMIN y con ALQUIMISTA. No es duplicar por duplicar: el SDD
 * dice que comparten las vistas, y esa afirmación solo vale si alguien la comprueba con las dos
 * identidades — si mañana un guard distingue entre ellas, esto lo encuentra.
 */
for (const rol of rolesAdministrativos()) {
  test.describe(`${rol.nombre}`, () => {
    test('E01 · abre Administración y vuelve a Mi programa con los cinco tabs intactos', async ({
      entrarComo,
      api,
    }) => {
      const page = await entrarComo(rol.actor());

      // Los cinco tabs siguen siendo cinco: la regla que este alcance no puede romper.
      for (const tab of ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo']) {
        await expect(page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).first()).toBeVisible();
      }

      expect(await abrirAdministracion(page)).toBe(true);
      await expect(page.getByText(/grupos por vencer/i)).toBeVisible();

      await page.getByRole('button', { name: /mi programa/i }).click();
      await expect(page.getByRole('button', { name: /^hoy$/i }).first()).toBeVisible();

      /* Entrar a Administración NO crea un programa personal. Se comprueba en el servidor, no en
         la pantalla: la pantalla podría no mostrarlo y el programa existir igual. */
      const contexto = await api(rol.actor()).pedir<{ personalProgram: { enrolled: boolean } }>(
        '/api/v1/mentor/context',
      );
      expect(contexto.personalProgram.enrolled).toBe(false);
    });

    test('E02 · "Ahora no" es de esta cuenta y no esconde la invitación a la otra', async ({
      entrarComo,
    }) => {
      const page = await entrarComo(rol.actor());

      const invitacion = page.getByText(/hacer mi programa de 90 días/i);
      await expect(invitacion).toBeVisible();
      await page.getByRole('button', { name: /ahora no/i }).click();
      await expect(invitacion).toBeHidden();

      await cerrarSesion(page);
      // Otra cuenta con la misma capacidad: la invitación tiene que volver a aparecer. Con la
      // clave global anterior, esta aserción fallaba.
      const otro = rol.nombre === 'ADMIN' ? ENTORNO.alquimista : ENTORNO.admin;
      await page.getByLabel(/correo|email/i).fill(otro.email);
      await page.getByLabel(/contraseñ|password/i).fill(otro.password);
      await page.getByRole('button', { name: /entrar|iniciar sesión|ingresar/i }).click();

      await expect(page.getByText(/hacer mi programa de 90 días/i)).toBeVisible({ timeout: 30_000 });
    });
  });
}

test('E02b · el programa propio se inicia sin cambiar de rol y sobrevive a recargar', async ({
  entrarComo,
  api,
}) => {
  const actor = ENTORNO.admin;
  const page = await entrarComo(actor);

  await page.getByRole('button', { name: /^empezar|iniciar mi programa|comenzar$/i }).first().click();
  await expect(page.getByText(/hacer mi programa de 90 días/i)).toBeHidden();

  await page.reload();
  const contexto = await api(actor).pedir<{
    personalProgram: { enrolled: boolean };
    capabilities: { canAdminister: boolean };
  }>('/api/v1/mentor/context');

  expect(contexto.personalProgram.enrolled).toBe(true);
  /* Y sigue siendo administrador: cursar el programa NO convierte la cuenta en aprendiz. Si esto
     falla, alguien ató la participación al rol y el administrador perdió su panel. */
  expect(contexto.capabilities.canAdminister).toBe(true);
});
