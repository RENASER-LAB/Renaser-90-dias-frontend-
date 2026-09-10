import { abrirAdministracion, cerrarGuiaDelAsistente, cerrarSesion, expect, test } from './soporte/fixtures';
import { ENTORNO, rolesAdministrativos, type Actor } from './soporte/entorno';

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
      const inscritoAntes = (
        await api(rol.actor()).pedir<{ personalProgram: { enrolled: boolean } }>('/api/v1/mentor/context')
      ).personalProgram.enrolled;

      const page = await entrarComo(rol.actor());

      // Los cinco tabs siguen siendo cinco: la regla que este alcance no puede romper.
      for (const tab of ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo']) {
        await expect(page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') }).first()).toBeVisible();
      }

      expect(await abrirAdministracion(page)).toBe(true);
      await expect(page.getByText(/grupos por vencer/i)).toBeVisible();

      await page.getByRole('button', { name: /mi programa/i }).click();
      await expect(page.getByRole('tab', { name: /^hoy$/i }).first()).toBeVisible();

      /* Entrar a Administración NO crea un programa personal. Se comprueba en el servidor, no en
         la pantalla: la pantalla podría no mostrarlo y el programa existir igual.
​
         Se compara ANTES contra DESPUÉS en vez de afirmar `enrolled === false`. Esa versión
         absoluta funcionó una sola vez: E02b activa el programa del administrador a propósito, y
         desde la ejecución siguiente esta prueba fallaba por un dato que otra prueba había dejado
         —no por lo que dice medir—. El requisito es que ENTRAR no cree nada, y eso se sostiene
         igual con el programa ya activo. */
      const despues = await api(rol.actor()).pedir<{ personalProgram: { enrolled: boolean } }>(
        '/api/v1/mentor/context',
      );
      expect(despues.personalProgram.enrolled).toBe(inscritoAntes);
    });

    test('E02 · "Ahora no" es de esta cuenta y no esconde la invitación a la otra', async ({
      entrarComo,
    }) => {
      /* Este caso usa cuentas PROPIAS, no las principales.
​
         La invitación al programa solo existe para quien todavía puede iniciarlo, y E02b activa
         el de la cuenta principal a propósito. La primera versión resolvía eso borrándole la
         participación a `e2e-admin` en cada siembra: la prueba pasaba, pero esa cuenta quedaba
         sin programa y cada carga de Hoy pedía datos inexistentes, llenando el log del backend de
         404 que no eran un fallo de nada. Un caso que necesita un estado particular se trae sus
         propias cuentas. */
      const propia = rol.nombre === 'ADMIN' ? ENTORNO.adminSinPrograma : ENTORNO.alquimistaSinPrograma;
      const otraCuenta = rol.nombre === 'ADMIN' ? ENTORNO.alquimistaSinPrograma : ENTORNO.adminSinPrograma;
      test.skip(
        !propia || !otraCuenta,
        'Faltan E2E_FRESH_ADMIN_* y E2E_FRESH_ALCHEMIST_*: son dos cuentas administrativas que ' +
          'nunca iniciaron su programa, y sin ellas no hay invitación que posponer.',
      );

      // Sesión limpia: el "Ahora no" vive en `localStorage` y una sesión reutilizada lo traería
      // ya puesto desde la ejecución anterior.
      const page = await entrarComo(propia as Actor, { sesionLimpia: true });

      const invitacion = page.getByText(/hacer mi programa de 90 días/i);
      await expect(invitacion).toBeVisible();
      await page.getByRole('button', { name: /ahora no/i }).click();
      await expect(invitacion).toBeHidden();

      await cerrarSesion(page);
      // La otra cuenta tiene la misma capacidad: la invitación TIENE que volver a aparecer. Con la
      // clave global anterior —una sola para todo el dispositivo— esta aserción fallaba.
      await page.getByLabel('Correo electrónico', { exact: true }).fill((otraCuenta as Actor).email);
      await page.getByLabel('Contraseña', { exact: true }).fill((otraCuenta as Actor).password);
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();

      await expect(page.getByText(/hacer mi programa de 90 días/i)).toBeVisible({ timeout: 30_000 });
    });
  });
}

test('E02b · el programa propio se inicia sin cambiar de rol y sobrevive a recargar', async ({
  entrarComo,
  api,
}) => {
  const actor = ENTORNO.admin;
  /* Activar el programa es IRREVERSIBLE por diseño: la contraparte sería un DELETE que borra el
     progreso, y el propio cliente se niega a usarlo. Así que en la segunda ejecución ya está
     activo y lo único honesto es comprobar el estado final, sin volver a pulsar "Empezar". */
  const yaInscrito = (
    await api(actor).pedir<{ personalProgram: { enrolled: boolean } }>('/api/v1/mentor/context')
  ).personalProgram.enrolled;

  const page = await entrarComo(actor);

  if (!yaInscrito) {
    await page.getByRole('button', { name: /^empezar|iniciar mi programa|comenzar$/i }).first().click();
    await expect(page.getByText(/hacer mi programa de 90 días/i)).toBeHidden();
  }

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
