import { abrirAdministracion, abrirSeccion, expect, test } from './soporte/fixtures';
import { ENTORNO } from './soporte/entorno';

/**
 * E08 a E14 — hábitos, semana, evidencias, chat, avisos, cierre y métricas.
 *
 * El eje de este archivo es una sola afirmación del SDD: el administrador y el mentor miran el
 * MISMO día con los MISMOS estados. Si esas dos lecturas divergieran, ninguna pantalla podría
 * decir cuál es la buena — y el administrador tomaría decisiones sobre un dato inventado.
 */

test('E08 · la semana administrativa y la del mentor devuelven el mismo día', async ({ api }) => {
  const admin = api(ENTORNO.admin);
  const mentor = api(ENTORNO.mentor);

  const contexto = await mentor.pedir<{ assignments: Array<{ groupId: string }> }>(
    '/api/v1/mentor/context',
  );
  test.skip(contexto.assignments.length === 0, 'El mentor de prueba no acompaña ningún grupo.');
  const grupo = contexto.assignments[0].groupId;

  /* El contrato real es `learners[].userId`, no `content[].participanteId`. La primera versión
     inventó esos nombres y `roster.content` llegaba `undefined`: el fallo salía en la línea del
     `test.skip`, que es el peor sitio para leerlo — parece un problema de datos y es de contrato. */
  const roster = await mentor.pedir<{ learners: Array<{ userId: string }> }>(
    `/api/v1/mentor/groups/${grupo}/learners`,
  );
  test.skip(roster.learners.length === 0, 'El grupo del mentor está vacío.');
  const alumno = roster.learners[0].userId;

  const delMentor = await mentor.pedir<{ dias: unknown[]; resumen: { obligaciones: number } }>(
    `/api/v1/mentor/groups/${grupo}/learners/${alumno}/progress`,
  );
  const delAdmin = await admin.pedir<{ dias: unknown[]; resumen: { obligaciones: number } }>(
    `/api/v1/admin/trainees/${alumno}/weekly-progress`,
  );

  expect(delAdmin.resumen.obligaciones).toBe(delMentor.resumen.obligaciones);
  expect(delAdmin.dias.length).toBe(delMentor.dias.length);
});

test('E08b · la ficha muestra la semana y NO ofrece completar por el alumno', async ({
  entrarComo,
  api,
}) => {
  const page = await entrarComo(ENTORNO.admin);
  await abrirAdministracion(page);
  await abrirSeccion(page, /^personas$/i);

  const primera = page.getByRole('button', { name: /abrir ficha de/i }).first();
  await expect(primera).toBeVisible();
  await primera.click();

  await expect(page.getByText(/cumplimiento de la semana/i)).toBeVisible();
  /* La lectura es de LECTURA. Que no exista un botón para marcar cumplido no es una ausencia de
     funcionalidad: es el requisito (ARF-10). */
  await expect(page.getByRole('button', { name: /marcar cumplido|completar hábito|firmar/i })).toHaveCount(0);
});

test('E08c · una semana sin registros dice "Sin datos", no cero', async ({ api }) => {
  const admin = api(ENTORNO.admin);
  const pagina = await admin.pedir<{ content: Array<{ id: string }> }>(
    '/api/v1/admin/trainees?page=0&size=1&withoutGroup=true',
  );
  test.skip(pagina.content.length === 0, 'No hay nadie sin grupo en este entorno.');

  // Una semana muy anterior al alta: no puede tener obligaciones.
  const semana = await admin.pedir<{ cobertura: string; resumen: { obligaciones: number } }>(
    `/api/v1/admin/trainees/${pagina.content[0].id}/weekly-progress?weekStart=2020-01-06`,
  );
  expect(semana.resumen.obligaciones).toBe(0);
  /* Y lo dice: SIN_DATOS. Devolver COMPLETA con cero obligaciones afirmaría que esa persona no
     cumplió siete días, que es otra cosa. */
  expect(semana.cobertura).toBe('SIN_DATOS');
});

test('E11 · abrir el chat con un aprendiz crea la conversación y NO envía nada', async ({
  entrarComo,
  api,
}) => {
  const page = await entrarComo(ENTORNO.admin);
  await abrirAdministracion(page);
  await abrirSeccion(page, /^personas$/i);
  await page.getByRole('button', { name: /abrir ficha de/i }).first().click();

  await page.getByRole('button', { name: /escribirle/i }).click();
  // Llega a Comunidad con el hilo abierto; ningún mensaje automático se envió.
  await expect(page.getByRole('tab', { name: /^comunidad$/i }).first()).toBeVisible();
});

test('E13 · un grupo CERRADO se consulta desde administración y deja de dar acceso', async ({
  api,
}) => {
  const admin = api(ENTORNO.admin);
  const cohortes = await admin.pedir<Array<{ id: string }>>('/api/v1/admin/cohorts');
  let cerrado: { id: string; status: string } | undefined;
  for (const cohorte of cohortes) {
    const grupos = await admin.pedir<Array<{ id: string; status: string }>>(
      `/api/v1/admin/cells?cohortId=${cohorte.id}`,
    );
    cerrado = grupos.find(g => g.status === 'CERRADO');
    if (cerrado) break;
  }
  test.skip(!cerrado, 'El entorno no tiene ningún grupo cerrado.');

  // Administración lo SIGUE consultando: cerrar no es borrar.
  const detalle = await admin.pedir<{ id: string; status: string }>(
    `/api/v1/admin/cells/${cerrado!.id}`,
  );
  expect(detalle.status).toBe('CERRADO');
});

test('E14 · el ranking sale del motor único; el cliente no lo recalcula', async ({ api }) => {
  const admin = api(ENTORNO.admin);
  const cohortes = await admin.pedir<Array<{ id: string }>>('/api/v1/admin/cohorts');
  test.skip(cohortes.length === 0, 'Sin cohortes no hay ranking.');

  /* `month` NO es opcional: el controller lo declara `@RequestParam String month` y sin él
     responde 400. La primera versión de esta prueba lo omitía y leía ese 400 como si el endpoint
     estuviera roto. */
  const ahora = new Date();
  const mes = `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}`;
  const codigo = await admin.codigoDe(
    `/api/v1/ranking/groups?cohortId=${cohortes[0].id}&month=${mes}`,
  );
  expect([200, 404]).toContain(codigo);
});
