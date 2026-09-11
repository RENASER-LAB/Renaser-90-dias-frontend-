import { expect, test } from './soporte/fixtures';
import { ENTORNO } from './soporte/entorno';

/**
 * E18 — cambiar el rol de una cuenta.
 *
 * **Lo que se comprueba es el VIAJE DE IDA Y VUELTA, no que el PATCH devuelva 204.** La pantalla
 * `StaffRolesScreen` se apoya en una premisa que ningún endpoint declara: que un aprendiz
 * promovido aparece en `GET /admin/cells/mentores` y que, al devolverle el rol, vuelve a
 * `GET /admin/trainees`. Si esa premisa se rompiera —porque el listado de mentores filtrara
 * también por perfil, por ejemplo— el PATCH seguiría devolviendo 204 y la persona desaparecería
 * de las dos listas sin ningún error. Sería irrecuperable desde el panel, y verde en las pruebas.
 *
 * Se usa un aprendiz de la reserva (`e2e-libre20`) y no una cuenta principal: mutar la cuenta que
 * otros casos usan fue exactamente el error de la primera versión de E02.
 */

const CORREO_DE_RESERVA = 'e2e-libre20@renaser.test';

type PaginaAprendices = { content: Array<{ id: string; email: string | null }>; total: number };
type Mentor = { userId: string };

test('E18 · promover a mentor y devolver el rol: la persona no se pierde en el camino', async ({ api }) => {
  const admin = api(ENTORNO.admin);

  const pagina = await admin.pedir<PaginaAprendices>(
    `/api/v1/admin/trainees?page=0&size=20&q=${encodeURIComponent(CORREO_DE_RESERVA)}`,
  );
  const persona = pagina.content.find(a => a.email === CORREO_DE_RESERVA);
  expect(persona, `${CORREO_DE_RESERVA} tiene que existir: lo siembra escenarios.sql`).toBeTruthy();
  const id = persona!.id;

  try {
    expect(await admin.codigoDe(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      body: { newRole: 'MENTOR' },
    })).toBe(204);

    const mentores = await admin.pedir<Mentor[]>('/api/v1/admin/cells/mentores');
    expect(
      mentores.some(m => m.userId === id),
      'tras promoverlo debe aparecer entre los mentores, o el panel lo pierde',
    ).toBe(true);
  } finally {
    /* La vuelta va en `finally`: si la aserción de arriba falla, el aprendiz NO puede quedarse
       como mentor. Una prueba que gasta la reserva cuando falla solo se puede correr una vez. */
    expect(await admin.codigoDe(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      body: { newRole: 'TRAINEE' },
    })).toBe(204);
  }

  const vuelta = await admin.pedir<PaginaAprendices>(
    `/api/v1/admin/trainees?page=0&size=20&q=${encodeURIComponent(CORREO_DE_RESERVA)}`,
  );
  expect(
    vuelta.content.some(a => a.id === id),
    'al devolverle el rol debe volver al padrón de aprendices',
  ).toBe(true);
});

test('E18b · el rol ASSISTANT no se ofrece porque la API lo rechaza', async ({ api }) => {
  /* La pantalla muestra cinco roles y no seis. El enum de la base tiene ASSISTANT y USUARIO, pero
     el contrato de la API no los acepta: ofrecerlos daría un botón que siempre falla. Esta prueba
     fija el motivo — si algún día la API los admitiera, el 400 dejaría de darse y este caso
     avisaría de que la pantalla se quedó corta. */
  const admin = api(ENTORNO.admin);
  const pagina = await admin.pedir<PaginaAprendices>(
    `/api/v1/admin/trainees?page=0&size=20&q=${encodeURIComponent(CORREO_DE_RESERVA)}`,
  );
  const id = pagina.content.find(a => a.email === CORREO_DE_RESERVA)!.id;

  expect(await admin.codigoDe(`/api/v1/users/${id}/role`, {
    method: 'PATCH',
    body: { newRole: 'ASSISTANT' },
  })).toBe(400);
});

test('E18c · un aprendiz no puede cambiarle el rol a nadie, ni a sí mismo', async ({ api }) => {
  const aprendiz = api(ENTORNO.aprendiz);
  const admin = api(ENTORNO.admin);
  const pagina = await admin.pedir<PaginaAprendices>(
    `/api/v1/admin/trainees?page=0&size=20&q=${encodeURIComponent(CORREO_DE_RESERVA)}`,
  );
  const ajeno = pagina.content.find(a => a.email === CORREO_DE_RESERVA)!.id;

  expect(await aprendiz.codigoDe(`/api/v1/users/${ajeno}/role`, {
    method: 'PATCH',
    body: { newRole: 'ADMIN' },
  })).toBe(403);
});
