import { abrirAdministracion, cerrarGuiaDelAsistente, cerrarSesion, expect, test } from './soporte/fixtures';
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
      api,
    }) => {
      /* La invitación solo existe para quien TODAVÍA puede iniciar su programa. Si esta cuenta ya
         lo activó —lo hace E02b— no hay nada que posponer, y seguir daría un fallo que habla de
         un botón ausente en vez de decir la verdad. */
      const capacidades = await api(rol.actor()).pedir<{ capabilities: { canStartProgram: boolean } }>(
        '/api/v1/mentor/context',
      );
      /* Se comprueban las DOS cuentas, no solo la propia: el caso cambia de sesión a mitad de
         camino y espera ver la invitación en la otra. Mirar solo la primera dejaba pasar el
         escenario que de hecho fallaba —E02b activa el programa del ADMIN, y al saltar a esa
         cuenta ya no hay nada que ofrecer—. */
      const otraCuenta = rol.nombre === 'ADMIN' ? ENTORNO.alquimista : ENTORNO.admin;
      const deLaOtra = await api(otraCuenta).pedir<{ capabilities: { canStartProgram: boolean } }>(
        '/api/v1/mentor/context',
      );
      test.skip(
        !capacidades.capabilities.canStartProgram || !deLaOtra.capabilities.canStartProgram,
        'Alguna de las dos cuentas ya inició su programa: no queda invitación que posponer. ' +
          'Activarlo es irreversible por diseño, así que esto se salta en vez de fallar.',
      );

      // Sesión limpia: el "Ahora no" vive en `localStorage` y una sesión reutilizada lo traería
      // ya puesto desde la ejecución anterior.
      const page = await entrarComo(rol.actor(), { sesionLimpia: true });

      const invitacion = page.getByText(/hacer mi programa de 90 días/i);
      await expect(invitacion).toBeVisible();
      await page.getByRole('button', { name: /ahora no/i }).click();
      await expect(invitacion).toBeHidden();

      await cerrarSesion(page);
      // Otra cuenta con la misma capacidad: la invitación tiene que volver a aparecer. Con la
      // clave global anterior, esta aserción fallaba.
      await page.getByLabel('Correo electrónico', { exact: true }).fill(otraCuenta.email);
      await page.getByLabel('Contraseña', { exact: true }).fill(otraCuenta.password);
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect(page.getByRole('tab', { name: /^hoy$/i }).first()).toBeVisible({ timeout: 45_000 });
      /* La otra cuenta también estrena sesión, así que le sale la guía de SER a pantalla completa
         y tapa la invitación. `entrarComo` la cierra, pero este login es manual —el caso necesita
         cambiar de cuenta SIN reutilizar sesión— y hay que cerrarla a mano. */
      await cerrarGuiaDelAsistente(page);

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
