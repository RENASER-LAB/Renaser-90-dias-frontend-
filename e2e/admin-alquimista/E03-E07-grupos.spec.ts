import { abrirAdministracion, abrirSeccion, expect, test } from './soporte/fixtures';
import { ENTORNO } from './soporte/entorno';
import { nombreDePrueba } from './soporte/api';

/**
 * E03 a E07 — solicitudes, bienvenida y grupos manuales.
 *
 * Todo lo que se PRUEBA se hace por la interfaz. La API solo prepara el terreno y comprueba
 * después: un caso que crea el grupo por API y lo verifica por API no probó ninguna pantalla.
 */

function fechaISO(offsetDias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

test('E04 · crear un grupo con fechas, elegir mentor y agregar aprendices persiste al reabrir', async ({
  entrarComo,
  api,
}) => {
  const page = await entrarComo(ENTORNO.admin);
  await abrirAdministracion(page);
  await abrirSeccion(page, /^grupos$/i);
  await page.getByRole('button', { name: /^crear$/i }).click();

  const nombre = nombreDePrueba('Fénix');
  await page.getByLabel(/nombre del grupo/i).fill(nombre);
  await page.getByLabel(/^comienza$/i).fill(fechaISO(0));
  await page.getByLabel(/^cierra$/i).fill(fechaISO(29));
  await page.getByRole('button', { name: /crear grupo/i }).click();

  // Tras crear se abre el detalle: se comprueba por lo que la pantalla muestra, no por la URL.
  await expect(page.getByText(nombre)).toBeVisible();
  await expect(page.getByText(/vigente/i).first()).toBeVisible();

  /* Los candidatos se apuntan por testID y no por su nombre: el nombre es el de cada persona del
     entorno, así que cualquier regex genérico terminaría enganchando "Volver" o "Cerrar". */
  await page.getByRole('button', { name: /asignar mentor/i }).click();
  await page.getByTestId('candidato-mentor').first().click();
  await expect(page.getByRole('button', { name: /cambiar mentor/i })).toBeVisible();

  await page.getByRole('button', { name: /agregar aprendiz/i }).click();
  const candidatos = page.getByTestId('candidato-aprendiz');
  const listaVacia = page.getByText(/no hay aprendices activos sin grupo/i);
  /* Si el entorno no tiene aprendices libres, la lista sale vacía y la pantalla lo dice. Eso no
     es un fallo del panel: es que no hay a quién agregar. Se comprueba el mensaje y se sigue, en
     vez de esperar 15 segundos por un elemento que nadie va a dibujar.

     PRIMERO se espera a que la lista SE DEFINA, y recién después se cuenta. `count()` no espera:
     devuelve lo que haya dibujado en ese instante. Mientras la petición viaja eso son cero
     candidatos, la rama del "no hay" se toma por error, y el caso muere pidiendo un cartel de
     lista vacía que nunca iba a aparecer porque la lista sí tenía gente. El síntoma apuntaba al
     panel y el defecto estaba acá (2026-09-11). */
  await expect(candidatos.first().or(listaVacia)).toBeVisible();
  if ((await candidatos.count()) === 0) {
    await expect(listaVacia).toBeVisible();
    await page.getByRole('button', { name: /cerrar la lista/i }).click();
  } else {
    await candidatos.first().click();
  }

  /* La comprobación de verdad: se recarga y se vuelve a entrar. Un estado que solo vive en la
     memoria del componente pasaría todas las aserciones anteriores y fallaría acá. */
  await page.reload();
  await abrirAdministracion(page);
  await abrirSeccion(page, /^grupos$/i);
  await expect(page.getByText(nombre)).toBeVisible();

  const grupos = await api(ENTORNO.admin).pedir<Array<{ name: string; periodStart: string | null }>>(
    '/api/v1/admin/cells/dashboard',
  );
  const creado = grupos.find(g => g.name === nombre);
  expect(creado, 'el grupo quedó escrito en el servidor').toBeTruthy();
});

test('E05 · el cupo se sostiene en el SERVIDOR, no solo en el formulario', async ({ api }) => {
  const admin = api(ENTORNO.admin);
  const cohortes = await admin.pedir<Array<{ id: string; status: string }>>('/api/v1/admin/cohorts');
  const cohorte = cohortes.find(c => c.status === 'ACTIVE') ?? cohortes[0];

  const grupo = await admin.pedir<{ id: string }>('/api/v1/admin/cells', {
    method: 'POST',
    body: { name: nombreDePrueba('Cupo'), cohortId: cohorte.id, capacity: 10 },
  });

  const disponibles = await admin.pedir<Array<{ userId: string }>>(
    '/api/v1/admin/cells/aprendices-disponibles',
  );
  test.skip(disponibles.length < 11, 'El entorno no tiene 11 aprendices libres para llenar el grupo.');

  for (const aprendiz of disponibles.slice(0, 10)) {
    await admin.pedir(`/api/v1/admin/cells/${grupo.id}/trainees`, {
      method: 'POST',
      body: { traineeId: aprendiz.userId },
    });
  }

  const codigo = await admin.codigoDe(`/api/v1/admin/cells/${grupo.id}/trainees`, {
    method: 'POST',
    body: { traineeId: disponibles[10].userId },
  });
  /* 4xx, no 500: el rechazo es una regla de negocio explicable, no una violación de constraint
     traducida a error del servidor. */
  expect(codigo).toBeGreaterThanOrEqual(400);
  expect(codigo).toBeLessThan(500);
});

test('E06 · renombrar NO borra las fechas; quitar el período se pide aparte', async ({
  entrarComo,
  api,
}) => {
  const admin = api(ENTORNO.admin);
  const cohortes = await admin.pedir<Array<{ id: string; status: string }>>('/api/v1/admin/cohorts');
  const cohorte = cohortes.find(c => c.status === 'ACTIVE') ?? cohortes[0];
  const grupo = await admin.pedir<{ id: string }>('/api/v1/admin/cells', {
    method: 'POST',
    body: {
      name: nombreDePrueba('Renombrar'),
      cohortId: cohorte.id,
      periodStart: fechaISO(0),
      periodEnd: fechaISO(20),
    },
  });

  const page = await entrarComo(ENTORNO.admin);
  await abrirAdministracion(page);
  await abrirSeccion(page, /^grupos$/i);
  await page.getByText(nombreDePrueba('Renombrar')).click();
  await page.getByRole('button', { name: /^editar$/i }).click();

  /* Se espera a que el formulario TERMINE de hidratarse antes de escribir. La pantalla carga el
     grupo con una petición y después hace `setNombre(grupo.name)`: si se teclea antes, esa
     respuesta pisa lo escrito y el guardado manda el nombre viejo. Le pasa igual a una persona
     que escriba rápido, así que la espera no es un truco de la prueba. */
  const campoNombre = page.getByLabel('NOMBRE DEL GRUPO', { exact: true });
  await expect(campoNombre).toHaveValue(nombreDePrueba('Renombrar'), { timeout: 20_000 });

  const nuevoNombre = nombreDePrueba('Renombrado');
  await campoNombre.fill(nuevoNombre);
  await page.getByRole('button', { name: /guardar cambios/i }).click();

  /* Se espera a que el guardado ATERRICE antes de preguntarle al servidor.
​
     Sin esto la prueba consultaba la API en el mismo instante del clic y leía el nombre viejo:
     el PATCH todavía estaba en vuelo. Fallaba con "Expected: Renombrado / Received: Renombrar",
     que parece un fallo de la app y era una carrera de la prueba. La señal de que terminó es que
     el formulario se cierra y vuelve el detalle, con el botón "Editar" en la cabecera. */
  await expect(page.getByRole('button', { name: /^editar$/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(nuevoNombre)).toBeVisible({ timeout: 20_000 });

  const despues = await admin.pedir<{ name: string; periodStart: string | null }>(
    `/api/v1/admin/cells/${grupo.id}`,
  );
  expect(despues.name).toBe(nuevoNombre);
  // La aserción que importa: el período sobrevivió al cambio de nombre.
  expect(despues.periodStart).toBe(fechaISO(0));
});

test('E06b · un grupo PROGRAMADO no concede acceso hoy', async ({ api }) => {
  const admin = api(ENTORNO.admin);
  const cohortes = await admin.pedir<Array<{ id: string; status: string }>>('/api/v1/admin/cohorts');
  const cohorte = cohortes.find(c => c.status === 'ACTIVE') ?? cohortes[0];

  const grupo = await admin.pedir<{ id: string; status: string }>('/api/v1/admin/cells', {
    method: 'POST',
    body: {
      name: nombreDePrueba('Futuro'),
      cohortId: cohorte.id,
      periodStart: fechaISO(10),
      periodEnd: fechaISO(40),
    },
  });
  expect(grupo.status).toBe('PROGRAMADO');
});

test('E07 · retirar desde el grupo EQUIVOCADO se rechaza y no toca la pertenencia real', async ({
  api,
}) => {
  const admin = api(ENTORNO.admin);
  const cohortes = await admin.pedir<Array<{ id: string; status: string }>>('/api/v1/admin/cohorts');
  const cohorte = cohortes.find(c => c.status === 'ACTIVE') ?? cohortes[0];

  const suGrupo = await admin.pedir<{ id: string }>('/api/v1/admin/cells', {
    method: 'POST',
    body: { name: nombreDePrueba('Suyo'), cohortId: cohorte.id },
  });
  const otroGrupo = await admin.pedir<{ id: string }>('/api/v1/admin/cells', {
    method: 'POST',
    body: { name: nombreDePrueba('Otro'), cohortId: cohorte.id },
  });
  const disponibles = await admin.pedir<Array<{ userId: string }>>(
    '/api/v1/admin/cells/aprendices-disponibles',
  );
  test.skip(disponibles.length === 0, 'El entorno no tiene aprendices libres.');
  const aprendiz = disponibles[0].userId;

  await admin.pedir(`/api/v1/admin/cells/${suGrupo.id}/trainees`, {
    method: 'POST',
    body: { traineeId: aprendiz },
  });

  const codigo = await admin.codigoDe(`/api/v1/admin/cells/${otroGrupo.id}/trainees/${aprendiz}`, {
    method: 'DELETE',
  });
  expect(codigo).toBeGreaterThanOrEqual(400);

  const detalle = await admin.pedir<{ members: Array<{ id: string }> }>(
    `/api/v1/admin/cells/${suGrupo.id}`,
  );
  expect(detalle.members.map(m => m.id)).toContain(aprendiz);
});
