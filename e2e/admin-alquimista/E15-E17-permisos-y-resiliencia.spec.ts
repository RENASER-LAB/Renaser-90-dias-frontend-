import { abrirAdministracion, expect, test } from './soporte/fixtures';
import { ENTORNO } from './soporte/entorno';

/**
 * E15 a E17 — autorización, responsive y resiliencia.
 *
 * **Falsear la interfaz no concede acceso.** Los casos negativos se comprueban en la API además
 * de en la pantalla: una prueba que solo mira que el botón no aparezca pasaría igual el día que
 * alguien deje el endpoint abierto.
 */

test('E15 · un aprendiz no ve Administración y tampoco la alcanza por API', async ({
  entrarComo,
  api,
}) => {
  const page = await entrarComo(ENTORNO.aprendiz);
  expect(await abrirAdministracion(page)).toBe(false);

  const aprendiz = api(ENTORNO.aprendiz);
  for (const ruta of [
    '/api/v1/admin/cells/dashboard',
    '/api/v1/admin/trainees?page=0&size=1',
    '/api/v1/account-requests?status=PENDING&page=0&size=1',
  ]) {
    expect(await aprendiz.codigoDe(ruta), `${ruta} debe negar a un aprendiz`).toBe(403);
  }
});

test('E15b · una cuenta suspendida no entra a Administración', async ({ api }) => {
  const suspendido = api(ENTORNO.suspendido);
  const codigo = await suspendido.codigoDe('/api/v1/admin/cells/dashboard');
  expect([401, 403]).toContain(codigo);
});

test('E15c · el guard del mentor sigue negando fuera de su relación vigente', async ({ api }) => {
  const mentor = api(ENTORNO.mentor);
  const admin = api(ENTORNO.admin);

  const pagina = await admin.pedir<{ content: Array<{ id: string; cellId: string | null }> }>(
    '/api/v1/admin/trainees?page=0&size=50',
  );
  const contexto = await mentor.pedir<{ assignments: Array<{ groupId: string }> }>(
    '/api/v1/mentor/context',
  );
  const susGrupos = new Set(contexto.assignments.map(a => a.groupId));
  const ajeno = pagina.content.find(t => t.cellId && !susGrupos.has(t.cellId));
  test.skip(!ajeno, 'No hay un aprendiz de otro grupo para probar el guard.');

  /* El mentor NO puede leer la semana de un alumno ajeno pasando el id de SU grupo: la lectura
     administrativa nueva no relajó este guard, que es lo que este caso protege. */
  const grupoPropio = contexto.assignments[0]?.groupId;
  test.skip(!grupoPropio, 'El mentor de prueba no acompaña ningún grupo.');
  const codigo = await mentor.codigoDe(
    `/api/v1/mentor/groups/${grupoPropio}/learners/${ajeno!.id}/progress`,
  );
  expect(codigo).toBe(403);

  // Y tampoco por la puerta administrativa: esa exige rol, no relación.
  expect(await mentor.codigoDe(`/api/v1/admin/trainees/${ajeno!.id}/weekly-progress`)).toBe(403);
});

test('E16 · la lista pagina de verdad y la búsqueda encuentra fuera de la primera página', async ({
  entrarComo,
  api,
}) => {
  const admin = api(ENTORNO.admin);
  const primera = await admin.pedir<{ content: Array<{ fullName: string | null }>; total: number }>(
    '/api/v1/admin/trainees?page=0&size=5',
  );
  test.skip(primera.total <= 5, 'El entorno tiene una sola página de aprendices.');

  const segunda = await admin.pedir<{ content: Array<{ fullName: string | null }> }>(
    '/api/v1/admin/trainees?page=1&size=5',
  );
  const objetivo = segunda.content.find(p => p.fullName && p.fullName.trim().length > 3);
  test.skip(!objetivo, 'La segunda página no trae un nombre utilizable.');

  const page = await entrarComo(ENTORNO.admin);
  await abrirAdministracion(page);
  await page.getByRole('button', { name: /^personas$/i }).click();
  await page.getByLabel(/buscar personas/i).fill(objetivo!.fullName as string);

  /* La aserción entera: alguien que NO estaba en la primera página aparece. Con un filtro sobre
     lo ya descargado, esto falla. */
  await expect(page.getByText(objetivo!.fullName as string)).toBeVisible({ timeout: 20_000 });
});

test('E16b · un solo scroll: el cuerpo no se desplaza en horizontal a 360 px', async ({
  entrarComo,
}) => {
  const page = await entrarComo(ENTORNO.admin);
  await abrirAdministracion(page);
  await page.getByRole('button', { name: /^grupos$/i }).click();

  const desbordamiento = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  // Un par de píxeles son redondeo del navegador; treinta son una tarjeta que se sale.
  expect(desbordamiento).toBeLessThan(4);
});

test('E17 · sin red, la pantalla dice qué pasó y no convierte el error en cero', async ({
  entrarComo,
}) => {
  const page = await entrarComo(ENTORNO.admin);
  await abrirAdministracion(page);

  // Inyección de fallo ETIQUETADA: solo para el caso de resiliencia, nunca en los de aceptación.
  await page.route('**/api/v1/admin/trainees**', ruta => ruta.abort());
  await page.getByRole('button', { name: /^personas$/i }).click();

  /* Lo que NO puede pasar: mostrar "0 en total" como si el padrón estuviera vacío. Un error de
     red no es un dato medido. */
  await expect(page.getByText(/no se pudo cargar el padrón/i)).toBeVisible({ timeout: 20_000 });
});
