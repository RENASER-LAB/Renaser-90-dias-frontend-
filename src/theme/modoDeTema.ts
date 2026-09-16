/**
 * La regla de qué tema se muestra, sin almacenamiento a la vista.
 *
 * Está separada de `preferenciaDeTema.ts` —que es la que habla con `AsyncStorage`— por el mismo
 * motivo por el que `habits` tiene `utils/renombreDeHabito.ts` aparte de `storage/renombreDeHabito.ts`:
 * así la decisión se puede probar con una función pura, sin simular el módulo nativo de
 * almacenamiento (que en Jest no está enlazado y revienta al importarse).
 *
 * ## La regla
 *
 * **La elección explícita de la persona le gana al tema del sistema. Si no eligió nada, manda el
 * sistema.**
 *
 * `App.tsx` arranca el proveedor con `useColorScheme()`, así que por defecto la app sigue al
 * teléfono y eso no cambia. Lo único que puede ganarle es haber tocado a mano el interruptor —el
 * botón de luna/sol de la cabecera o la fila "Modo oscuro" de Yo—.
 */

export type ModoDeTema = 'light' | 'dark';

/**
 * Traduce lo que salió del almacenamiento a un modo válido, o a `null` si no hay elección que
 * respetar.
 *
 * No se confía en el texto guardado: en esa clave pudo escribir una versión anterior de la app, o
 * pudo quedar a medias. Cualquier cosa que no sea exactamente `light` o `dark` se trata como
 * "nunca eligió" y la app cae al tema del sistema, que es el comportamiento que ya tenía.
 */
export function modoGuardadoValido(crudo: string | null): ModoDeTema | null {
  return crudo === 'light' || crudo === 'dark' ? crudo : null;
}

/** Con qué modo tiene que arrancar la app, dado lo guardado y el tema del teléfono. */
export function modoDeArranque(crudo: string | null, esquemaDelSistema: ModoDeTema): ModoDeTema {
  return modoGuardadoValido(crudo) ?? esquemaDelSistema;
}
