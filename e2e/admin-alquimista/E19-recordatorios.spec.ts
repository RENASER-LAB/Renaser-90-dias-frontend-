import { expect, test, cerrarGuiaDelAsistente } from './soporte/fixtures';
import { ENTORNO } from './soporte/entorno';

/**
 * E19 — antelaciones de recordatorio elegidas en la rueda de "Otra".
 *
 * **Qué se comprueba, y por qué no basta con "el chip aparece".** El conjunto de avisos vive en
 * DOS sitios que no se hablan: el dispositivo guarda la lista completa (`number[]`) y el backend
 * guarda UN solo número, `minutos_recordatorio`, que es el MÁXIMO de esa lista. Esa asimetría es
 * deliberada y está documentada en `recordatoriosDeHabito.ts`, pero es exactamente el tipo de
 * invariante que se rompe en silencio: si alguien "simplificara" el guardado mandando el primero
 * de la lista en vez del mayor, la pantalla seguiría viéndose bien, los avisos locales seguirían
 * sonando, y solo se notaría al reinstalar — cuando la persona recupera el aviso equivocado.
 *
 * Por eso el caso va de punta a punta: se elige una antelación propia, se guarda, se comprueba
 * que el SERVIDOR se quedó con la mayor, y se vuelve a abrir para ver que la lista completa
 * sobrevivió.
 *
 * **Cambió el control, no el invariante (2026-09-21).** "Otra" era un campo de texto con teclado
 * numérico —que en el teléfono se abría ENCIMA del propio campo— y ahora es una rueda de 1 a 60
 * minutos, la misma que la de la hora. Por eso aquí ya no se comprueba que el campo rechace `0`
 * ni `9999`: en una rueda de 1 a 60 esos valores no existen, no hay nada que rechazar. Lo que se
 * comprueba en su lugar es que la rueda abre en el aviso que ya rige y que el botón de al lado
 * dice cuál se va a añadir.
 *
 * **Por qué la cuenta ADMIN y no la de aprendiz.** `e2e-aprendiz` tiene el onboarding sin
 * completar, así que al entrar por la interfaz cae en la Ficha Inicial y nunca llega a las
 * pestañas — el caso moría en el primer clic con un "no aparece TRAINING" que no dice nada de eso.
 * La cuenta ADMIN tiene su programa de 90 días activo (día 14) y sus mismos hábitos, que es todo
 * lo que este caso necesita. El hábito se deja como estaba al terminar.
 */

const HABITO = /despertar/i;
/** Una antelación que NO está entre las sugeridas (30 y 10): si apareciera sin elegirla, el caso
 *  estaría probando el atajo en vez de la rueda. Y mayor que las dos, que es lo que hace medible
 *  la regla de "el servidor se queda con la mayor". */
const PROPIA_MINUTOS = 45;

/**
 * Gira la rueda hasta un minuto concreto.
 *
 * En web la rueda es un contenedor con scroll, así que mover `scrollTop` es exactamente lo que
 * hace el dedo; el `onScroll` del componente traduce la posición a un valor.
 *
 * **El alto de fila se deduce de la propia rueda y no se copia del diseño.** El recorrido que se
 * puede scrollear dividido por los saltos que hay entre el primer valor y el último da el alto de
 * una fila, sea el que sea: si mañana cambia, el caso sigue apuntando al minuto correcto en vez de
 * fallar por un número mágico desactualizado.
 */
async function girarLaRuedaHasta(
  rueda: import('@playwright/test').Locator,
  minutos: number,
  minimo: number,
  maximo: number,
) {
  await rueda.evaluate((el, [m, min, max]) => {
    const altoDeFila = (el.scrollHeight - el.clientHeight) / (max - min);
    el.scrollTop = (m - min) * altoDeFila;
  }, [minutos, minimo, maximo]);
}

/** El rango que ofrece la rueda de "Otra" — `MINIMO_MINUTOS_ANTELACION` y
 *  `MAXIMO_MINUTOS_RUEDA_ANTELACION` en `etiquetaDeAntelacion.ts`. */
const RUEDA_MINIMO = 1;
const RUEDA_MAXIMO = 60;

type Preferencia = {
  habitId: string;
  title: string | null;
  triggerTime: string | null;
  limitTime: string | null;
  reminderEnabled: boolean;
  reminderMinutesBefore: number | null;
};
type Preferencias = { habits: Preferencia[] };

async function abrirPlanificadorDe(page: import('@playwright/test').Page, habito: RegExp) {
  /* Dos cosas pueden estar tapando la barra de pestañas, y las dos dan el MISMO síntoma —el
     elemento se encuentra y el clic nunca llega a "visible, enabled and stable"—:
       1. La hoja del planificador, si quedó abierta de una vuelta anterior. Guardar no la cierra.
       2. La guía de SER, un overlay a pantalla completa que puede re-montarse al cargar los datos.
     Se quitan las dos antes de pulsar, igual que hacen `abrirSeccion` y `abrirAdministracion`. */
  const cerrarHoja = page.getByText(/^cerrar$/i).first();
  if (await cerrarHoja.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await cerrarHoja.click();
    await expect(cerrarHoja).toBeHidden({ timeout: 10_000 });
  }
  await cerrarGuiaDelAsistente(page);
  await page.getByRole('tab', { name: /^training$/i }).click();
  const dimension = page.getByText(/^cuerpo$/i).first();
  await dimension.scrollIntoViewIfNeeded();
  await dimension.click();
  const planificar = page.getByText(/planificar cuerpo/i).first();
  await planificar.scrollIntoViewIfNeeded();
  await planificar.click();
  const fila = page.getByText(habito).last();
  await fila.scrollIntoViewIfNeeded();
  await fila.click();
}

test('E19 · una antelación escrita a mano se guarda, y el servidor se queda con la mayor', async ({
  entrarComo,
  api,
}) => {
  const dueno = api(ENTORNO.admin);
  /* `entrarComo` y no el `page` suelto: la sesión la abre el fixture, que reutiliza el estado
     guardado por correo. Con `page` a secas la pestaña arranca en el login y el primer clic
     —la pestaña TRAINING— caduca sin decir por qué. */
  const page = await entrarComo(ENTORNO.admin);

  // Estado de partida, para poder dejarlo como estaba.
  const antes = await dueno.pedir<Preferencias>('/api/v1/habit-preferences');
  const original = antes.habits.find(h => (h.title ?? '').match(HABITO));
  expect(original, 'la cuenta de pruebas tiene que tener el hábito DESPERTAR').toBeTruthy();

  try {
    await abrirPlanificadorDe(page, HABITO);

    /* "Otra" no escribe: DESPLIEGA la rueda. Sin tocarla no hay rueda en pantalla, que es lo que
       mantiene el botón de guardar dentro de la hoja. */
    const otra = page.getByRole('button', { name: 'Otra antelación, elegir los minutos en una rueda' });
    await expect(otra).toBeVisible({ timeout: 15_000 });
    const rueda = page.getByLabel('Minutos de antelación');
    await expect(rueda, 'la rueda solo existe tras tocar "Otra"').toBeHidden();
    await otra.click();
    await expect(rueda).toBeVisible({ timeout: 10_000 });

    /* El botón de al lado dice qué se va a añadir, igual que el de guardar dice la hora. Es
       también la forma de comprobar que la rueda llegó donde se la mandó: si el giro no hubiera
       entrado, este nombre diría otro número. */
    const anadir = page.getByRole('button', { name: /^Añadir .+ antes$/ });
    await girarLaRuedaHasta(rueda, PROPIA_MINUTOS, RUEDA_MINIMO, RUEDA_MAXIMO);
    await expect(anadir, 'la rueda tiene que quedar en el minuto al que se la giró')
      .toHaveAccessibleName(`Añadir ${PROPIA_MINUTOS} min antes`, { timeout: 10_000 });
    await anadir.click();

    // La propia entra, y entra ENCENDIDA: elegir un número ya es elegirlo.
    const pastillaPropia = page.getByRole('button', { name: new RegExp(`^${PROPIA_MINUTOS} min antes`) });
    await expect(pastillaPropia).toBeVisible();
    await expect(rueda, 'la rueda se pliega al añadir: la pastilla nueva es la confirmación')
      .toBeHidden();

    await page.getByRole('button', { name: /guardar/i }).first().click();

    /* Guardar PUEDE abrir un diálogo de confirmación ("DESPERTAR queda a las 06:00…"), y si lo
       hace se queda encima de todo: el siguiente clic —la pestaña TRAINING— caduca sin decir por
       qué. Lo delató la captura del fallo; el mensaje de Playwright solo decía "no llega a
       estable".

       Se comprueba si está en vez de exigirlo porque el diálogo no es lo que este caso mide, y su
       texto cambia según si el horario se difiere al día siguiente o no. Exigirlo convertiría un
       cambio de copy en un fallo de los recordatorios. */
    const ok = page.getByRole('button', { name: /^ok$/i }).first();
    await expect(ok).toBeVisible({ timeout: 15_000 });
    await ok.click();
    await expect(ok).toBeHidden({ timeout: 10_000 });

    /* El servidor se queda con la MAYOR de las antelaciones. 45 es mayor que las sugeridas, así
       que si el guardado mandara otra cosa —la primera, la última, la que se tocó— este número
       sería distinto y el caso lo diría. */
    await expect
      .poll(async () => {
        const ahora = await dueno.pedir<Preferencias>('/api/v1/habit-preferences');
        return ahora.habits.find(h => h.habitId === original!.habitId)?.reminderMinutesBefore ?? null;
      }, { timeout: 20_000, message: 'el backend tiene que guardar la antelación mayor' })
      .toBe(PROPIA_MINUTOS);

    // Y al reabrir, la lista completa sigue ahí: es el viaje de vuelta desde el dispositivo.
    await abrirPlanificadorDe(page, HABITO);
    await expect(
      page.getByRole('button', { name: new RegExp(`^${PROPIA_MINUTOS} min antes, activado`) }),
      'la antelación propia tiene que sobrevivir a cerrar y volver a abrir',
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    /* Se deja como estaba, pase lo que pase: otros casos miran este mismo hábito.
     *
     * `triggerTime` va con el valor ORIGINAL y no en `null`: el endpoint lo exige y responde 400
     * sin él. La primera versión mandaba null, y como esto vive en un `finally`, ese 400 tapaba el
     * resultado verdadero del caso — la prueba decía "falló el PATCH" cuando lo que se estaba
     * probando había pasado o fallado por otro motivo. Por eso además se traga el error: una
     * limpieza que rompe no debe disfrazarse de fallo de la prueba. */
    try {
      // Sin `triggerTime` previo no hay nada que restaurar: el hábito usaba la hora del catálogo
      // y el endpoint exige una hora, así que mandar null da 400.
      if (!original!.triggerTime) throw new Error('el hábito no tenía hora propia: nada que restaurar');
      await dueno.pedir(`/api/v1/habit-preferences/${original!.habitId}`, {
        method: 'PATCH',
        body: {
          triggerTime: original!.triggerTime,
          limitTime: original!.limitTime,
          reminderEnabled: original!.reminderEnabled,
          reminderMinutesBefore: original!.reminderMinutesBefore,
        },
      });
    } catch (e) {
      console.warn(`[E19] no se pudo restaurar el hábito: ${String(e)}`);
    }
  }
});
