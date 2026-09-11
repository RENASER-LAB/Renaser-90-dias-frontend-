import { test as limpieza } from '@playwright/test';

import { ApiDePruebas } from './soporte/api';
import { ENTORNO } from './soporte/entorno';

/**
 * Borra los grupos que dejaron las ejecuciones ANTERIORES, antes de que empiece esta.
 *
 * <blockquote><b>Por qué hace falta.</b> Varios recorridos crean grupos y les asignan aprendices;
 * ninguno los suelta al terminar. Como los aprendices libres son un recurso finito del entorno, a
 * la quinta o sexta corrida ya no quedaba ninguno y E05 —que necesita once para forzar el rechazo
 * del doceavo— empezaba a saltearse sola. El síntoma engañaba: parecía que faltaba sembrar, y lo
 * que sobraba era basura acumulada.</blockquote>
 *
 * Se limpia AL EMPEZAR y no al terminar, a propósito: si una corrida se interrumpe —y varias se
 * interrumpieron— un `afterAll` nunca llega a ejecutarse y la basura queda igual. Limpiar a la
 * entrada es lo único que se cumple siempre.
 *
 * Solo toca lo que la suite crea: el patrón `[runId]` que pone `nombreDePrueba`. Los escenarios
 * sembrados a mano no lo llevan y sobreviven, que es lo que se quiere — E08 y E13 dependen de
 * ellos. Borrar la célula libera a su gente sola: el puntero del participante es
 * `ON DELETE SET NULL` y el historial, `ON DELETE CASCADE`.
 */
limpieza('limpiar los grupos que dejaron las corridas anteriores', async () => {
  const admin = new ApiDePruebas(ENTORNO.admin);
  const cohortes = await admin.pedir<Array<{ id: string }>>('/api/v1/admin/cohorts');

  let borrados = 0;
  for (const cohorte of cohortes) {
    const grupos = await admin.pedir<Array<{ id: string; name: string }>>(
      `/api/v1/admin/cells?cohortId=${cohorte.id}`,
    );
    for (const grupo of grupos.filter(g => /\[e2e-/.test(g.name))) {
      /* Un borrado que falla no puede tumbar la suite: puede que otra ejecución se haya
         adelantado, y eso no es un problema. Se cuenta lo que sí se pudo. */
      const codigo = await admin.codigoDe(`/api/v1/admin/cells/${grupo.id}`, { method: 'DELETE' });
      if (codigo < 300) borrados += 1;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[limpieza] grupos de corridas anteriores borrados: ${borrados}`);
});
