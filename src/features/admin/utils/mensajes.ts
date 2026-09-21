import { ApiError } from '../../../services/http/apiClient';

/**
 * El texto que se le muestra a una persona cuando algo falla.
 *
 * <blockquote><b>Por qué existe.</b> El idiom habitual —`e instanceof Error ? e.message : 'algo
 * amable'`— no funciona: {@link ApiError} extiende `Error`, así que la rama amable NUNCA se
 * ejecuta y en pantalla termina apareciendo el mensaje crudo de la excepción. Con la red caída se
 * leía literalmente el error de `fetch`, que no le dice nada a nadie y menos al público de esta
 * app.</blockquote>
 *
 * La regla: el mensaje explica QUÉ pasó y QUÉ hacer, y no expone detalles del transporte
 * (AGENTS.md §5).
 */
export function mensajeDeFallo(error: unknown, alFallar: string): string {
  if (error instanceof ApiError) {
    if (error.esDeRed) return 'Sin conexión con el servidor. Revisa tu red y vuelve a intentar.';
    if (error.esNoAutenticado) return 'Tu sesión venció. Vuelve a entrar.';
    if (error.esProhibido) return 'Tu cuenta no tiene permiso para esto.';
    return alFallar;
  }
  // Un error que no es de la API sí puede traer algo útil (validación local, por ejemplo).
  return error instanceof Error && error.message ? error.message : alFallar;
}

/**
 * Qué se le dice al administrador justo después de aprobar una cuenta.
 *
 * Aprobar crea el usuario y, aparte, intenta meterlo en el grupo de bienvenida vigente. Saber si
 * entró no es parte de la respuesta de aprobar: se deduce comparando cuántas personas había sin
 * grupo **antes** y **después**. Por eso hay TRES desenlaces y no dos.
 *
 * <blockquote><b>Corregido 2026-09-15.</b> Esto vivía dentro de la pantalla como
 * `const entroSolo = sinGrupo !== null && despues.total <= sinGrupo`, un booleano para tres
 * estados: cuando la consulta previa fallaba (`sinGrupo === null`) `entroSolo` quedaba en
 * `false` y el aviso afirmaba «quedó SIN grupo» sin tener con qué compararlo — mandando a crear
 * una bienvenida que quizá ya existía y que quizá ya lo había recibido.</blockquote>
 *
 * `null` en cualquiera de los dos conteos significa «no se pudo averiguar», y entonces el
 * mensaje no afirma nada sobre el grupo: dice qué sí pasó (la cuenta existe) y dónde mirar.
 */
export function mensajeDeAltaAprobada(
  nombre: string | null | undefined,
  sinGrupoAntes: number | null,
  sinGrupoDespues: number | null,
): string {
  const quien = nombre ?? 'La persona';

  if (sinGrupoAntes === null || sinGrupoDespues === null) {
    return `${quien} ya tiene su cuenta. No pudimos comprobar si entró a un grupo de bienvenida: `
      + 'míralo en Grupos antes de dar por hecho que quedó ubicada.';
  }

  /* La cola de "sin grupo" BAJÓ ⇒ el alta entró en una bienvenida.
     >  **Corregido 2026-09-15.** Acá decía `sinGrupoDespues <= sinGrupoAntes`, razonando que "no
     >  crece ⇒ entró" para tolerar que entre las dos consultas se ubicara a alguien más a mano.
     >  Con ese `<=` la tercera rama era **inalcanzable** y el aviso afirmaba SIEMPRE que la
     >  persona entró a un grupo. El motivo: quien se aprueba **ya contaba** como "sin grupo"
     >  antes de aprobarla — el usuario se crea al registrarse, no al aprobar
     >  (`AccountRequestService.approve`: "El usuario YA existe desde el alta, en estado
     >  INACTIVE"), y el conteo incluye a los aprendices sin fila de `participantes_programa`.
     >  Aprobar a alguien nunca puede hacer crecer esa cola, así que `> ` no pasaba jamás.
     >  Con `<` los dos casos reales quedan bien: si se la ubicó, la cola baja; si no, queda igual
     >  y ahora sí se avisa. Queda la carrera que el comentario viejo temía —otro ubicado a mano
     >  entre las dos consultas— y ahí se sigue diciendo "entró", que es el mismo lado optimista
     >  de antes. */
  if (sinGrupoDespues < sinGrupoAntes) {
    return `${quien} ya tiene su cuenta y entró al grupo de bienvenida.`;
  }

  return `${quien} ya tiene su cuenta, pero quedó SIN grupo: no hay una bienvenida abierta hoy. `
    + 'Crea una o ubícala a mano.';
}

/** Lo que una sección dice debajo de su rótulo cuando no tiene filas que mostrar, y cómo se lee. */
export type MensajeDeSeccion = {
  texto: string;
  /**
   * `aviso` = algo no se pudo averiguar; va en gris chico, como el resto de las advertencias de la
   * pantalla. `vacio` = se averiguó todo y no hay nadie; va en cuerpo normal, porque no es una
   * advertencia sino el contenido de la sección.
   */
  tono: 'aviso' | 'vacio';
};

/**
 * Qué dice la sección «Mentores» de «Staff y roles» cuando no hay filas —o cuando las hay pero
 * están incompletas.
 *
 * La sección se arma con DOS consultas independientes, y cada una sabe algo que la otra no:
 *
 * | Consulta | Qué trae | Qué NO trae |
 * |---|---|---|
 * | `GET /admin/cells/mentores` | Los mentores activos, con el grupo que acompañan | Los suspendidos |
 * | `GET /admin/staff?role=MENTOR` | Los mentores de cualquier estado | El grupo de cada uno |
 *
 * De ahí salen tres avisos distintos y no uno solo: cada fallo deja un hueco distinto, y decirlos
 * todos igual —«no se pudo cargar»— haría desconfiar de las filas que sí son correctas.
 *
 * <blockquote><b>Corregido 2026-09-15.</b> Esta decisión vivía dentro de la pantalla como
 * <code>mentoresVisibles.length === 0 && !cargando && !cargandoStaff</code>, sin mirar ningún
 * error. Si la carga fallaba, la lista quedaba vacía y la pantalla afirmaba <i>«Todavía no hay
 * mentores. Haz mentor a alguien de la lista de abajo»</i> — mandando a nombrar un mentor nuevo a
 * quien quizá ya tenía varios. Es el mismo defecto que arreglamos en {@link mensajeDeAltaAprobada}:
 * afirmar lo que no se pudo averiguar. La sección «Staff», en esa misma pantalla, ya condicionaba
 * su vacío a que no hubiera error; ahora las dos siguen el mismo criterio, y la parte que se puede
 * equivocar está acá afuera, donde se prueba.</blockquote>
 *
 * `null` = no hay nada que decir: la sección muestra sus filas y punto.
 */
export function mensajeDeLaSeccionMentores({
  falloElListadoDeGrupos,
  falloElListadoDeStaff,
  cargando,
  hayFilas,
}: {
  /** Falló la consulta de los mentores de los grupos: no se sabe quiénes están activos. */
  falloElListadoDeGrupos: boolean;
  /** Falló la consulta de staff: no se sabe si hay mentores con la cuenta suspendida. */
  falloElListadoDeStaff: boolean;
  /** Alguna de las dos sigue en vuelo: todavía no se sabe si va a haber filas. */
  cargando: boolean;
  /** Hay al menos una fila a la vista. */
  hayFilas: boolean;
}): MensajeDeSeccion | null {
  // Las dos caídas: no se sabe nada de nadie, y eso es justo lo que hay que decir.
  if (falloElListadoDeGrupos && falloElListadoDeStaff) {
    return {
      tono: 'aviso',
      texto:
        'No se pudo cargar la lista de mentores. Puede haber mentores y no estarse viendo: '
        + 'vuelve a entrar a esta pantalla.',
    };
  }
  if (falloElListadoDeStaff) {
    return {
      tono: 'aviso',
      texto: 'No se pudo comprobar si hay mentores con la cuenta suspendida: estos son los activos.',
    };
  }
  /* Acá no falta NADIE: `/admin/staff?role=MENTOR` trae a los mentores de cualquier estado. Lo
     que falta es el grupo de cada uno, y se dice «puede» en vez de «ninguno tiene el suyo» porque
     la consulta caída pudo haber dejado en pantalla lo de una carga anterior, que sí traía grupos
     — decir que no se ve ninguno, con grupos a la vista en las filas, es la clase de contradicción
     que hace desconfiar de toda la pantalla. */
  if (falloElListadoDeGrupos) {
    return {
      tono: 'aviso',
      texto: 'No se pudo cargar quién acompaña cada grupo: puede que a algún mentor no se le vea el suyo.',
    };
  }
  // Recién acá se puede afirmar que no hay: las dos consultas terminaron y ninguna falló.
  if (cargando || hayFilas) return null;
  return {
    tono: 'vacio',
    texto: 'Todavía no hay mentores. Haz mentor a alguien de la lista de abajo.',
  };
}

/** El botón que va al pie de la lista de aprendices: qué hace al tocarlo y qué dice. */
export type BotonDeMasAprendices = {
  /** `reintentar` vuelve a pedir la MISMA página; `siguiente-pagina` avanza a la que sigue. */
  accion: 'reintentar' | 'siguiente-pagina';
  etiqueta: string;
  etiquetaAccesible: string;
};

/**
 * Qué botón cierra la lista de aprendices de «Staff y roles», o `null` si no va ninguno.
 *
 * La lista se trae de a páginas y se ACUMULA (`[...previos, ...nuevos]`), así que una página que
 * no llega deja un hueco que ya nadie vuelve a tapar: lo que sigue se apila encima como si
 * estuviera completo.
 *
 * <blockquote><b>Corregido 2026-09-15.</b> Esto vivía en la pantalla como
 * <code>hayMas && !cargando</code> con <code>onPress={() => setPagina(p => p + 1)}</code>, y el
 * contador subía aunque la página anterior se hubiera caído: un fallo en la página 2 y otro toque
 * pedía la 3, y esas veinte filas no se traían nunca. Sin aviso, además, porque el total del
 * servidor seguía diciendo «hay más» y el botón seguía ahí, idéntico. Al revés pasaba lo mismo por
 * omisión: con la PRIMERA carga caída, <code>total</code> quedaba en <code>null</code>,
 * <code>hayMas</code> daba falso y no aparecía botón alguno — la única manera de reintentar era
 * salir de la pantalla y volver a entrar.</blockquote>
 *
 * El orden de las ramas es el arreglo: mientras haya un fallo sin resolver, el botón **reintenta**;
 * nunca avanza sobre un hueco.
 */
export function botonDeMasAprendices({
  cargando,
  falloLaCarga,
  cargados,
  total,
}: {
  /** La consulta está en vuelo: el indicador de carga ya lo dice, un botón al lado sobra. */
  cargando: boolean;
  /** La última consulta terminó mal, así que la página que pidió NO está en la lista. */
  falloLaCarga: boolean;
  /** Cuántos aprendices hay traídos, sumando todas las páginas que sí llegaron. */
  cargados: number;
  /** Cuántos dice el servidor que hay. `null` = todavía no se sabe. */
  total: number | null;
}): BotonDeMasAprendices | null {
  if (cargando) return null;
  if (falloLaCarga) {
    return {
      accion: 'reintentar',
      etiqueta: 'Volver a intentar',
      etiquetaAccesible: 'Volver a intentar cargar los aprendices',
    };
  }
  // Sin total no se puede afirmar que falten: se calla, que es lo que hacía bien la versión vieja.
  if (total === null || cargados >= total) return null;
  return {
    accion: 'siguiente-pagina',
    etiqueta: `Ver más (${cargados} de ${total})`,
    etiquetaAccesible: 'Ver más aprendices',
  };
}
