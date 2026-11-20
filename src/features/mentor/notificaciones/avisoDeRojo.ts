import type * as TipoNotificaciones from 'expo-notifications';

/**
 * El aviso de «Aprendices en rojo» (spec 057 FR-033, FR-035, boceto D). Aparte y sin dependencias de pantallas, para que
 * `rutaDeAviso.ts` lo use sin ciclos y se pruebe sin montar nada.
 *
 * El servidor manda `categoryId: 'rojo-del-dia'` y, en `data`, `route` (`/mentor/groups/{g}/learners/{u}`), `grupoId` y `aprendizId`.
 * La app registra la categoría al empezar a escuchar avisos, con dos botones: «Escribirle» y «Ver ficha». Es **solo JavaScript**
 * (`setNotificationCategoryAsync` es el mismo API que ya usa la carrera): no hace falta un build nativo nuevo. Una app que no registró
 * la categoría ignora los botones y abre la ficha por `route`, como con cualquier aviso.
 */
export const CATEGORIA_ROJO_DEL_DIA = 'rojo-del-dia';
export const ACCION_ESCRIBIR = 'escribir';
export const ACCION_VER_FICHA = 'ver';

export const TEXTOS_DEL_AVISO_DE_ROJO = { escribir: 'Escribirle', ver: 'Ver ficha' } as const;

/** Qué se pidió al tocar: «Escribirle» abre el chat 1 a 1; todo lo demás (el cuerpo, «Ver ficha») abre la ficha. */
export function queSePidioEnElAviso(actionIdentifier: unknown): 'escribir' | 'ficha' {
  return actionIdentifier === ACCION_ESCRIBIR ? 'escribir' : 'ficha';
}

/** El aprendiz del aviso: `data.aprendizId` y, si no viene, el de la ruta de la ficha. `null` si no hay. */
export function aprendizDelAviso(datos: unknown, aprendizDeLaRuta: string | null): string | null {
  const id = (datos as { aprendizId?: unknown } | null)?.aprendizId;
  return typeof id === 'string' && id.trim() ? id.trim() : aprendizDeLaRuta;
}

/** Registra la categoría con sus dos botones; los dos abren la app. Nunca lanza: sin ella los avisos se abren igual por `route`. */
export function registrarLaCategoriaDeRojo(N: Pick<typeof TipoNotificaciones, 'setNotificationCategoryAsync'>): void {
  void Promise.resolve()
    .then(() =>
      N.setNotificationCategoryAsync(CATEGORIA_ROJO_DEL_DIA, [
        { identifier: ACCION_ESCRIBIR, buttonTitle: TEXTOS_DEL_AVISO_DE_ROJO.escribir, options: { opensAppToForeground: true } },
        { identifier: ACCION_VER_FICHA, buttonTitle: TEXTOS_DEL_AVISO_DE_ROJO.ver, options: { opensAppToForeground: true } },
      ]),
    )
    .catch(() => undefined);
}
