/**
 * Ponerle OTRO NOMBRE a un hábito de bebida, para uno solo — la regla pura, sin React ni red.
 *
 * ## El problema que resuelve
 *
 * El catálogo trae dos hábitos de bebida (`AGUA TIBIA CON LIMÓN` y `JUGO VERDE`) que no todo el
 * mundo puede hacer: con gastritis, reflujo o diabetes no aplican. Sin poder cambiarles el rótulo,
 * esa persona los incumple todos los días de su programa. El backend ya resuelve el caso
 * (`PUT/DELETE /api/v1/habits/{habitId}/rename`); acá vive lo que la app tiene que decidir sola.
 *
 * ## Las tres reglas son DEL BACKEND, no de la app. No inventar ninguna.
 *
 * Los tres valores de abajo son espejo literal de `RenombreHabitoService` y `RenombreHabito` del
 * backend (`habits/application/services/RenombreHabitoService.java`). Si el servidor cambia uno,
 * este archivo queda mintiendo y la app ofrece algo que termina en 400 — por eso están juntos y
 * con el nombre del origen al lado, y no repartidos por las pantallas.
 *
 * 1. **Solo dos hábitos.** El emparejamiento es por `systemKey`, NUNCA por título: el título es
 *    justamente lo que esta función deja cambiar, así que compararlo por texto se rompería con el
 *    primer renombre (mismo criterio que `TrainingScreen` documenta para `DAILY_CLASS`).
 * 2. **Cualquier día del programa** (D-127, 2026-09-15).
 *    > **Corregido el 2026-09-15.** Acá decía "solo hasta el día 0, antes de que arranque la
 *    > formación", que es lo que el backend hacía cumplir con
 *    > `RENAME_ALLOWED_UNTIL_PROGRAM_DAY`. La regla del servidor cambió: nadie descubre el día 0
 *    > que el jugo verde le cae mal, y con la ventana cerrada a quien reaccionaba el día 12 le
 *    > quedaban 78 días incumpliendo un hábito que no podía hacer.
 * 3. **60 caracteres el título, 200 el motivo**, los dos obligatorios y sin espacios al borde.
 */

/**
 * Espejo de `RenombreHabitoService.CLAVES_RENOMBRABLES` (backend, SOLO LECTURA).
 *
 * `GREEN_JUICE` = `JUGO VERDE`; `WARM_LEMON_WATER` = `AGUA TIBIA CON LIMÓN` (V4 del esquema).
 */
export const CLAVES_RENOMBRABLES: readonly string[] = ['GREEN_JUICE', 'WARM_LEMON_WATER'];

/** Espejo de `RenombreHabito.requireTitulo` (backend) y de `@Size(max = 60)` del request. */
export const MAXIMO_TITULO_PERSONAL = 60;

/** Espejo de `RenombreHabito.requireMotivo` (backend) y de `@Size(max = 200)` del request. */
export const MAXIMO_MOTIVO = 200;

/**
 * Lo mínimo que hace falta saber de un hábito para decidir si se puede renombrar. Se escribe así
 * y no con `HabitoCatalogoApi` entero para que esta lógica se pueda probar sin construir la
 * respuesta completa del backend, y para que sirva igual desde Plan (`PlanHabit`) que desde el
 * catálogo crudo.
 */
export interface HabitoRenombrable {
  id: string;
  /** El título del CATÁLOGO, el que se ve cuando la persona no puso ninguno propio. */
  title: string;
  systemKey?: string | null;
}

/** `true` si ESTE hábito es uno de los dos que el backend deja renombrar. */
export function esRenombrable(systemKey: string | null | undefined): boolean {
  return typeof systemKey === 'string' && CLAVES_RENOMBRABLES.includes(systemKey);
}


/** Los hábitos del catálogo que se pueden renombrar, en el orden en que vinieron. */
export function soloRenombrables<T extends HabitoRenombrable>(catalogo: readonly T[]): T[] {
  return catalogo.filter(h => esRenombrable(h.systemKey));
}

/**
 * El nombre que hay que MOSTRAR: el que puso la persona si puso alguno, y si no el del catálogo.
 *
 * `titulos` es el espejo local de `tituloPersonal` (ver `storage/renombreDeHabito.ts`): hoy
 * ninguna respuesta que consuma el aprendiz devuelve ese campo, así que el único que lo sabe es
 * el propio teléfono que escribió el renombre.
 */
export function tituloVisible(habito: HabitoRenombrable, titulos: Readonly<Record<string, string>>): string {
  const propio = titulos[habito.id]?.trim();
  return propio ? propio : habito.title;
}

/** Lo que hace falta para decidir si el acompañante ofrece el cambio de nombre. */
export interface ContextoDelOfrecimiento {
  /**
   * `inscrito` de `GET /api/v1/home`: si tiene fila en `participantes_programa`.
   *
   * Sin ella el renombre no es posible —`RenombreHabitoService.requireProgreso` responde
   * `"Participante no encontrado"`— y además no habría programa que acomodar. Es el caso de
   * alguien de staff sin seguimiento personal.
   */
  inscrito: boolean;
  /** ISO del momento en que ya respondió —sí o no—, o `null` si nunca se le preguntó. */
  respondidoEn: string | null;
  /** El catálogo del aprendiz (`GET /api/v1/habits`). */
  catalogo: readonly HabitoRenombrable[];
  /** Espejo local de los títulos propios, por `habitId`. */
  titulos: Readonly<Record<string, string>>;
  /**
   * `role` de `GET /api/v1/users/me`. Solo se le ofrece a un `APRENDIZ` — ver
   * {@link habitoAOfrecerParaRenombrar} para el bug concreto que eso evita.
   */
  rol: string | null;
}

/** El único rol al que se le ofrece: el aviso es parte del programa de 90 días. */
export const ROL_APRENDIZ = 'APRENDIZ';

/**
 * Qué hábito ofrecer renombrar, o `null` si no corresponde preguntar.
 *
 * Se pregunta UNA sola vez en la vida de la cuenta. Las cinco razones para no preguntar:
 *
 *  - **No es un aprendiz.** El aviso flota por encima del navegador (vive en `App.tsx`), así que
 *    se dibuja sobre CUALQUIER pantalla — y para una cuenta de staff eso incluye el panel de
 *    administración, donde termina tapando los botones de sus formularios. Verificado el
 *    2026-09-15 con la prueba E2E `E06`: "Guardar cambios" quedaba visible pero sin recibir el
 *    clic, con la tarjeta del aviso encima (hay captura en `artifacts/e2e/resultados/`). Quien es
 *    staff y además lleva su programa sigue pudiendo renombrar desde Plan: lo que se quita es el
 *    ofrecimiento, no la función.
 *  - **Ya respondió** (aceptó, dijo "ahora no", o cerró el aviso — cerrar cuenta como "no").
 *  - **No está inscrito** en un programa: no hay participante al que renombrarle nada.
 *  - **No hay ningún hábito renombrable** en su catálogo.
 *  - **Todos los renombrables ya tienen nombre propio**: ahí no hay nada que preguntar, la
 *    persona ya tomó la decisión.
 *
 * Cuando queda más de uno sin renombrar se ofrece el PRIMERO del catálogo, que viene ordenado por
 * `habitos.orden` — el orden que curó el dueño del producto. No se ofrecen los dos a la vez: el
 * aviso es de una o dos líneas y encadenar dos preguntas seguidas es exactamente lo que se pidió
 * no hacer.
 */
export function habitoAOfrecerParaRenombrar(ctx: ContextoDelOfrecimiento): HabitoRenombrable | null {
  if (ctx.rol !== ROL_APRENDIZ) return null;
  if (ctx.respondidoEn !== null) return null;
  if (!ctx.inscrito) return null;
  const candidatos = soloRenombrables(ctx.catalogo).filter(h => !tieneTituloPropio(ctx.titulos, h.id));
  return candidatos[0] ?? null;
}

function tieneTituloPropio(titulos: Readonly<Record<string, string>>, habitId: string): boolean {
  return Boolean(titulos[habitId]?.trim());
}

/**
 * `null` = el título sirve. Si no, el texto exacto que hay que mostrarle a la persona.
 *
 * Valida lo MISMO que el backend y con los mismos límites, para que el error se vea al escribir y
 * no después de un viaje de red que termina en 400.
 */
export function errorDeTituloPersonal(valor: string): string | null {
  const recortado = valor.trim();
  if (recortado.length === 0) return 'Escribí el nombre que le vas a poner.';
  if (recortado.length > MAXIMO_TITULO_PERSONAL) {
    return `El nombre no puede pasar de ${MAXIMO_TITULO_PERSONAL} caracteres.`;
  }
  return null;
}

/** `null` = el motivo sirve. Mismo criterio y mismos límites que `errorDeTituloPersonal`. */
export function errorDeMotivo(valor: string): string | null {
  const recortado = valor.trim();
  if (recortado.length === 0) return 'Contanos en una línea por qué te queda mejor así.';
  if (recortado.length > MAXIMO_MOTIVO) {
    return `El motivo no puede pasar de ${MAXIMO_MOTIVO} caracteres.`;
  }
  return null;
}
