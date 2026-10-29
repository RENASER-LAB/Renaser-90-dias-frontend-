# Liderazgo y Administración (mentor, líder, admin, alquimista) — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

## Cambio por pedido del dueño — 2026-10-12 — Administración (estado de `Hoy`): «Hábitos del programa», con audiencia por rol

* **Cambio por pedido del dueño — 2026-10-12 — Administración (estado de `Hoy`): «Hábitos del programa», con
  audiencia por rol** (backend D-264; spec y plan en `Renaser-90-dias-backend/specs/001-habitos-por-rol/`, flujo
  spec-kit con las decisiones del dueño). Lo que cambia y nada más:
  * **Más opciones → «Hábitos del programa»** (solo ADMIN y ALQUIMISTA: Administración ya se muestra por
    `canAdminister`): la lista del catálogo global con a quién llega cada hábito («Para todos» o «Mentor · Líder de
    mentores»), filtro por rol con los roles y nombres que manda el servidor (`GET /api/v1/admin/habits/roles`),
    Activos / Inactivos y «Rige desde mañana» solo cuando el servidor lo dice (`targetRolesStartTomorrow`: un cambio
    de roles guardado hoy; un hábito recién creado rige desde ya y no lo lleva, E-601). «Nuevo» y cada fila abren el formulario
    (`HabitoProgramaFormScreen`): nombre y tipo (solo al crear), descripción, dimensión, evidencia, «Es opcional»,
    «Obligatorio en intoxicación» y **«¿Para quién es?»**: `Interruptor` «Para todos los roles» (encendido por
    defecto) y, apagado, una `Checkbox` por rol (al menos una; marcar los cinco se guarda como cinco, no como «para
    todos»). Activar / Desactivar y Eliminar (con registros, el 409 ofrece «Desactivar»). Aviso en los hábitos con
    reglas propias. Salir con cambios pregunta. `ConfirmacionEnLinea` + `tacto.logro()` al guardar.
  * **La fila «Catálogo de hábitos» de «Desde el panel web» pasa a «Horarios, guías y audioterapias»**: eso sigue
    fuera de la app.
  * **Ningún tab cambia de forma.** Training, Plan y Hoy muestran menos hábitos solo si el servidor ya no le manda a
    esa persona un hábito de otro rol (el filtro es 100 % del servidor, desde el día siguiente al cambio).
  * Movimiento (`emil-design-eng`): el filtro y las opciones cambian al instante; las casillas de rol entran con un
    fundido de 180 ms (con «reducir movimiento», al instante); `Presionable` en filas y chips.
  * **Hace falta un APK nuevo** y el backend con V96. Contra un backend anterior la pantalla muestra todo «Para
    todos», sin filtro de rol.
  * **Probado de punta a punta en el emulador** contra el backend local con base clonada (nunca producción): los
    casos T040–T054 y sus capturas están en `specs/001-habitos-por-rol/e2e.md` del backend.

## Excepción autorizada por el dueño del producto — 2026-10-01 — tab `Hoy`, «Mis mentores» del Líder de Mentores

* **Excepción autorizada por el dueño del producto — 2026-10-01 — tab `Hoy`, «Mis mentores» del Líder de
  Mentores** (backend D-241, SDD 002 en `specs/002-lider-de-mentores/`). Pedido del dueño: construir la gestión del
  Líder siguiendo las dos pantallas que ese rol ya tiene en Hoy (bandeja de tickets y semáforo por grupos). Lo que
  cambia y nada más:
  * Para una cuenta **Líder de Mentores** (`esLiderDeMentores`), una tarjeta «Mis mentores» en Hoy, antes de la de
    tickets, que abre `LiderMentoresScreen` como estado de Hoy (sin sexta pestaña). Para cualquier otro rol Hoy no
    cambia.
  * Todo vive en `src/features/lider-mentores/`: padrón (un mentor por fila: grupo y aprendices, semáforo de sus
    aprendices, consultas sin responder y evaluación del mes), ficha (grupos, consultas, evaluación, «Lo que le
    dijiste», «Escribirle» y Reconocer / Sugerir / Alertar), la pantalla para escribir una observación (con la casilla
    «Enviárselo también por el chat», apagada) y el reporte del mes con flechas entre meses. **Ningún aprendiz por su
    nombre** (decisión del dueño, 01/10).
  * **Hace falta un APK nuevo**: el APK de producción no tiene estas pantallas (la app no se actualiza por aire).
  Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar
  autorización explícita.

## Excepción autorizada por el dueño del producto — 2026-09-27 — Administración (estado de `Hoy`), «Bienvenida»

* **Excepción autorizada por el dueño del producto — 2026-09-27 — Administración (estado de `Hoy`),
  «Bienvenida»** (pedido del dueño: que Administración y Alquimista cambien desde la app la portada
  de la tarjeta de bienvenida y los mensajes; backend D-210, `/api/v1/admin/bienvenida`). En «Más
  opciones» → «Desde acá» hay una entrada nueva, «Bienvenida», que abre `BienvenidaAdminScreen`
  (vista de la pila de Administración, no modal): un nombre de ejemplo (por defecto «María»); la
  tarjeta vigente con ese nombre (la dibuja el servidor); «Cambiar la portada» con una imagen del
  teléfono —el mismo selector cuadrado de la foto de perfil (`elegirFotoCuadrada`, 1200 px), subida
  directa al almacenamiento y vista previa ya revisada por el servidor antes de «Usar esta
  portada»— y «Volver a la portada original»; y los tres mensajes (el que acompaña la tarjeta, el
  formal y el del grupo) con su estado (original / cambiado por quién y cuándo), vista previa con
  los marcadores reemplazados, un editor con la misma revisión que el servidor (`{nombre}`, y
  `{mentor}` en el del grupo; hasta 1000 caracteres) y «Volver al texto original». Con el
  almacenamiento de marcador (local) la portada no se puede cambiar y la pantalla lo dice. La raíz
  de Administración no suma secciones (A-3): solo el detalle de «Más opciones» la nombra. Lógica en
  `admin/utils/bienvenida.ts`, `portadaCandidata.ts` y `tarjetaDeMuestra.ts`. Nada más de `Hoy`
  cambia.

## Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Hoy`, tarjetas del mentor y de administración (retroalimentación del 26/09, spec `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, S-1, S-6 y A-1).

* **Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Hoy`, tarjetas del mentor
  y de administración (retroalimentación del 26/09, spec `docs/specs/RETROALIMENTACION_2026-09-26.md`
  del backend, S-1, S-6 y A-1).** Lo único que cambia en `Hoy`:
  * **Tarjeta «Mi grupo» (solo mentores):** su línea la dice el semáforo del grupo
    (`GET /api/v1/mentor/groups/{g}/semaforo`): «N necesitan tu ayuda esta semana» (rojo + amarillo),
    «Nadie necesita ayuda esta semana» o «N aprendices · todavía sin actividad para medir». Antes
    decía siempre «sin avance registrado todavía», con campos que el servidor nunca mandaba. Sin
    semáforo (404/403) dice solo cuántos son. La tarjeta pide esa lectura por su cuenta:
    `HoyScreen.tsx` no se tocó.
  * **Rótulos «MI GRUPO» y «OPERACIÓN»** de esas dos tarjetas pasan de 10,5 a 14 px.
  * **El detalle del semáforo** (`SemaforoScreen`, estado de Hoy) suma una línea fija bajo
    «Semanas cerradas»: *«La semana del sábado X al viernes Y ya cerró; lo que completes después no
    la cambia.»* (S-6). Nada más del detalle cambia; las palabras y los colores del semáforo quedan
    exactamente como estaban (decisión del dueño del mismo día).
  * **Mismo día, ampliación posterior pedida por el dueño — Administración (estado de `Hoy`), ficha
    del aprendiz: «Cambiar día del programa»** (backend D-82, `PUT /api/v1/admin/trainees/{id}/program-day`).
    La ficha pide `GET /api/v1/admin/trainees/{id}` al abrir; si el servidor lo entrega (mismo
    permiso `MANAGE_TRAINEES` que el PUT) y su Día 1 ya llegó, muestra el botón y, si existe,
    «Último ajuste: del día X al Y por <quién>, el <fecha>. Motivo: …» (`lastDayAdjustment`,
    opcional: un backend viejo no lo manda). El botón abre `CambiarDiaScreen` (vista de la ficha,
    no modal): − / + de 64 px, campo numérico 0–90, «−1 día» / «+1 día», motivo obligatorio
    (≤ 280, aunque el backend lo acepta vacío) y confirmación «¿Pasar a <nombre> del día N al día
    M?» con `Alert` de `components/Alerta` (nunca `window.confirm`). Lógica en
    `admin/utils/diaDelPrograma.ts`. Nada más de la ficha ni de `Hoy` cambia; la ficha deja de ser
    solo lectura únicamente en esto (el cumplimiento sigue sin poder marcarse por nadie).
  Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
  vuelve a necesitar autorización explícita.

## Cambio por pedido del dueño — 2026-10-13 — Administración (estado de `Hoy`) y `Comunidad` (info del chat): el rol «Guía de aprendiz», el rol al aprobar y dos arreglos

* **Cambio por pedido del dueño — 2026-10-13 — Administración (estado de `Hoy`) y `Comunidad` (info del chat): el
  rol «Guía de aprendiz», el rol al aprobar y dos arreglos** (backend D-265, E-605, E-606). Textual: «cuando llega
  una solicitud el sistema debe mostrar todos los roles… los guía de aprendiz es lo mismo para el tema de mentor, lo
  mismo grupos, y simplemente que así lo clasifica la persona». El dueño eligió rol propio y elegirlo al aprobar. Lo
  que cambia y nada más:
  * **Seis roles** (`admin/utils/rolesAsignables.ts`, una sola lista para las dos pantallas): Aprendiz, **Guía de
    aprendiz** (`TRAINEE_GUIDE`; `GUIA_APRENDIZ` en la base), Mentor, Líder de mentores, Administrador, Alquimista. El
    guía ve todo lo del mentor (`ROL_MENTOR`, «Mi grupo», sus aprendices); no es el guía del grupo inicial (D-242).
  * **Solicitudes**: cada una ofrece los seis roles en chips (`ChipDeOpcion`, sin animación al elegir) con Aprendiz
    marcado. Aprobar como aprendiz sigue siendo un toque y el mismo pedido sin cuerpo; con otro rol pide confirmación
    («¿Aprobar a … como …?», da más acceso) y el aviso dice con qué rol entró. El botón dice siempre «Aprobar»: con
    el rol adentro crecía a tres renglones y la tarjeta cambiaba de alto con cada chip.
  * **Equipo y roles**: el guía entre los roles, la sección «Mentores y guías» con el rol de cada uno (`role` de
    `/admin/cells/mentores`; sin él, Mentor) y los suspendidos de los dos roles, y el aviso del grupo inicial dice que
    no es el rol Guía de aprendiz. **E-605:** «Aprendices» pide `role=TRAINEE` y ya no rotula «Aprendiz» al personal
    con programa propio (ni lo repite, y el total cuadra).
  * **Chat**: en la info, un guía fuera del grupo que acompaña se lee «Guía de aprendiz» (en su grupo, «Mentor»).
  * **«Mi grupo»** (`MiCelulaScreen`): el sello de la cabecera dice «GUÍA DE APRENDIZ» a la guía y «MENTOR» a cualquier
    otro que acompañe (`mentor/utils/insigniaDeQuienAcompana`). «Más opciones» nombra los seis roles.
  * **E2E en el emulador** (backend `docs/informes/e2e-guia-de-aprendiz-2026-10-13.md`): aprobar con cada rol, el atrás
    en las confirmaciones, Equipo y roles, hábitos por rol, la guía al frente de un grupo y entrando con su cuenta.
  * **E-606:** el atrás de Android cierra los diálogos nativos como «Cancelar» (`opcionesNativasDeDescarte` en
    `components/Alerta.tsx`, que usan `Alert` y `admin/utils/dialogo.ts`); una elección obligada no se cierra.
  * **Hace falta el backend con D-265 antes que el APK** (un backend anterior ignora el rol al aprobar) y un APK nuevo.

## Cambio por pedido del dueño — 2026-10-19 — tab `Hoy` (semáforo por grupos del líder), las fichas del mentor y de administración, y `Yo` → Notificaciones: el líder de mentores ve el cumplimiento de cada persona por grupo

* **Cambio por pedido del dueño — 2026-10-19 — tab `Hoy` (semáforo por grupos del líder), las fichas del mentor y de
  administración, y `Yo` → Notificaciones: el líder de mentores ve el cumplimiento de cada persona por grupo** (spec 005,
  en el backend: `specs/005-lider-cumplimiento-por-persona/`; decisiones del dueño del 19/10: baja del grupo a la persona,
  ve nombre y todas las evidencias, la semana del semáforo de sábado a viernes, avisa a su mentor o le escribe a la
  persona, y el mentor se entera con un resumen al día). Amplía el límite de alcance RL-07 de `specs/002-lider-de-mentores/`
  («ningún aprendiz por su nombre»), que era de alcance y no una prohibición. Lo que cambia y nada más:
  > **Corregido 2026-10-19.** «La semana del semáforo de sábado a viernes» de la presentación ya no es el período por
  > defecto: tras el E2E el dueño decidió que **la ventana del resumen manda en todo** (el resumen, la lista y la ficha
  > leen los mismos 7 días). Ver «La lista del grupo» y «Los 7 días de la persona».
  * **Hoy → «Semáforo por grupos» (solo líder)**: cada tarjeta de grupo se abre a la lista de sus personas **solo si el
    servidor manda `puedeAbrirse`** (el grupo tiene mentor y la funcionalidad está prendida). Con un backend anterior el
    campo falta, las tarjetas no se abren y el texto es el de siempre (FR-021). `HoyScreen` solo cambia
    `SemaforoGruposScreen` por `CumplimientoDelLiderScreen`, que lo envuelve y maneja por dentro persona ← grupo ←
    resumen ← Hoy (cada nivel con su retroceso del sistema); no hay otra vista de Hoy ni pestaña nueva. Las tarjetas del
    resumen pasan a `Presionable`. **El recorrido de Administración y Alquimista (Semáforo → grupo → persona) no
    cambia**: sigue abriendo todos sus grupos como siempre.
  * **La lista del grupo** (`GrupoDelLiderScreen`, `VistaSemaforoDelGrupo` de siempre): nombre, color y % de la semana, en
    el orden del servidor (rojo primero; la app no reordena). El mentor o la guía con programa propio salen con su % y
    «No se mide en el semáforo» (`AprendizDelSemaforo.noSeMide`; el orden del servidor es rojo, amarillo, sin datos,
    verde y «no se mide» al final). Un grupo sin nadie dice «Este grupo todavía no tiene personas». **La ventana es la
    del resumen por grupos**: al tocar un grupo la lista abre en los MISMOS 7 días que mostraba el resumen (la posición y
    el ancla con que se estaba mirando), con el mismo rótulo («Últimos 7 días · Del lunes 12 al domingo 18 de octubre»,
    o «Semana cerrada · Del sábado 10 al viernes 16») y las mismas flechas ‹ ›; al tocar una persona, la ficha abre en
    la ventana que la lista tenía en ese momento. Es lo que ya hace Administración (`SemaforoGrupoAdminScreen`).
    > **Corregido 2026-10-19 (decisión del dueño tras el E2E: «la ventana del resumen manda en todo»; E-629 (d) del
    > backend).** Esta línea decía que la lista sin fecha traía la **última semana cerrada** (sábado→viernes, «Semana
    > cerrada», no «Últimos 7 días») y la ficha la **semana en curso**, y que por eso la app le pasaba a la ficha el `hasta`
    > de la lista (`utils/inicioDeLaLista`, `viernesParaLaFicha`, `comoSemana`, que se borraron). Eran dos ventanas
    > distintas a la vista: el resumen decía «lunes 12 al domingo 18» y la lista «sábado 10 al viernes 16», y la misma
    > persona salía con 50 % y con 47,6 %. Ahora el servidor lee las tres con la misma regla y la app reutiliza la
    > mecánica del resumen: `useLecturaPorSemana` y `NavegacionDeSemanas`, de 7 en 7 días, sin llegar al futuro.
  * **Los 7 días de la persona** (`PersonaDelLiderScreen`): los mismos de la lista y del resumen, un día por cabecera que
    se abre (el más reciente con hábitos viene abierto; sin animación), con lo que tenía ESE día, cada hábito con su
    estado en palabras y con forma, y la falta de datos (pausa, antes del Día 1, nada programado) con su motivo y nunca
    como incumplimiento. ‹ lleva a la última semana cerrada y de ahí de 7 en 7 días, hasta el inicio del programa
    (`primeraSemana`, el sábado de la semana del Día 1; `null` mientras no eligió su Día 1: la app no inventa un tope);
    › vuelve a «Últimos 7 días», y nunca hay un día futuro. Hoy (`motivo` `EN_CURSO`) solo aparece si se pide el viernes
    de hoy, y dice «Hoy, todavía sin cerrar». El mentor o la guía con
    programa propio (`NO_SE_MIDE`) llega sin días: su rol, «No se mide en el semáforo» y su %, sin contar hábitos.
    > **Corregido 2026-10-19 (misma decisión del dueño).** Decía «de sábado a viernes … hasta el inicio del programa; sin
    > semanas futuras. En la semana en curso, … los días que vienen (`FUTURO`) son tarjetas quietas … «Este día todavía no
    > llega», y la cabecera avisa que el porcentaje puede cambiar mientras la semana no cierre». Con la ventana del
    > resumen no hay semana en curso ni días por venir, así que se fueron el aviso del porcentaje y el atajo «Volver a
    > esta semana» (las flechas son las del resumen); la app sigue leyendo `FUTURO` sin romperse por si un servidor lo
    > mandara. «Avisar a su mentor» ya no dice «esta semana» sino «los días que estás viendo», y una ventana sin días
    > dice «No hay nada que mostrar de estos días».
    Las acciones de los objetivos son `COMPLETADA` (con su foto) o `PENDIENTE`. Cargando, vacío y error con «Reintentar»; al
    cambiar de persona o de semana no queda a la vista el dato anterior ni por un instante. **Cada lectura de una ficha deja
    un registro de consulta en el servidor** (FR-016); la app la hace al abrir y al cambiar de semana, no en cada foco.
  * **Evidencias** (hoja desde abajo, `EvidenciaDeObligacion`): foto, texto, audio (`expo-audio`, que ya estaba) y video
    (el reproductor de las lecciones), con lo que la persona escribió («¿Qué sentiste?», respuestas de la Pastilla) debajo;
    la foto de las acciones de los objetivos; y «Ver publicación» para el post diario (`VisorDePublicacion`). **El
    enlace de un archivo se pide al abrir la hoja** (vence a los diez minutos). Una evidencia que ya no existe dice «Ya no
    está disponible» y la ficha sigue. Un hábito cumplido sin evidencia dice «Cumplido · sin evidencia» y no ofrece un botón
    que no abre nada.
  * **Dos acciones en la ficha**: «Escribirle» abre o reutiliza el 1 a 1 con la persona y **no envía nada**; «Avisar a su
    mentor» reutiliza `ObservarScreen` (la observación de siempre, con tipo, texto y envío opcional por chat) y suma la
    persona y la semana (`personId`, `weekStart`); el mensaje del chat empieza con el nombre de la persona. No aparece si
    el grupo no tiene mentor ni cuando la persona es el propio mentor. «Lo que le dijiste», en la ficha del mentor
    (`FichaMentorScreen`), nombra a la persona de las observaciones nuevas.
  * **Fichas del mentor (`AlumnoScreen`) y de administración (`FichaAprendizScreen`)**: el post diario muestra «Ver
    publicación» cuando el servidor manda `publicacionId` (campo opcional; antes decían «sin evidencia»). La publicación se
    lee en `GET /api/v1/wall/{id}` (es del Muro, no de `/leadership/`): la abren su autor, el liderazgo y el mentor o la guía
    que acompaña HOY al autor. Un 403 dice «No puedes ver esta publicación…» y un 404 «Ya no está disponible»; no hay
    respaldo «Abrir en el Muro» (el mentor ya la lee desde su ficha).
    La ficha del mentor dice «Publicado en el Muro» —y no «pendiente de revisión»— del post diario cumplido, y la hoja de
    evidencia del líder no repite el texto que ya leyó como evidencia (hallazgos del E2E del 2026-10-19: E-629 (b) y (c) del
    backend).
  * **`Yo` → Notificaciones**: un interruptor nuevo, «Revisiones de tu líder» (`REVISION_DEL_LIDER`), **solo para quien
    acompaña un grupo** y solo si el servidor lo lista. Es el aviso de las 20:00 con las personas de su grupo que su líder
    revisó ese día; tocarlo abre «Mi grupo» en su semáforo con la ruta que ya existía. Los demás interruptores no cambian.
  * **No se tocan**: las formas de los cinco tabs, Training ni Plan; el semáforo propio del aprendiz; ni los permisos (los
    decide el servidor y vuelve a autorizar cada lectura; el líder solo lee a la persona). Sin dependencias nuevas.
  * **Hace falta publicar el backend primero** (V109 y las lecturas `/leadership/…`) y un APK nuevo. Con el APK nuevo
    contra el backend anterior no se rompe nada: las tarjetas no se abren.
  Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar
  autorización explícita.

## Cambio por pedido del dueño — 2026-10-27 — Administración (estado de `Hoy`): Administración y Alquimista ven las evidencias como el líder

* **Cambio por pedido del dueño — 2026-10-27 — Administración (estado de `Hoy`): Administración y Alquimista ven las
  evidencias como el líder** (sin backend nuevo; el servidor ya les da a los tres roles —MENTOR_LEAD, ADMIN y ALCHEMIST—
  `GET /leadership/groups/{g}/people/{p}/week`, `GET /evidence/{id}` y `/evidence/{id}/url`). Pedido: Administración y
  Alquimista «no encuentran todas las evidencias» de los hábitos de un aprendiz; el dueño aprobó la opción 1, que usen la
  misma vista que ya tiene el líder (spec 005, más arriba). Lo que cambia y nada más:
  * **«Ver evidencia» de la ficha** (`FichaAprendizScreen`, «Detalle de hábitos (lunes a domingo)») abre la hoja del líder
    (`EvidenciaDeObligacion`): foto, audio, video y **texto** dentro de la app. Antes salía al navegador con
    `Linking.openURL`, y una evidencia de texto decía «no hay archivo que abrir» sin mostrar lo escrito. Vale para cualquier
    aprendiz, con o sin grupo; el enlace se sigue pidiendo al abrir la hoja. `evidenciasEnLaFicha.test.ts` frena volver a
    `Linking` o a `urlDeEvidencia` en la ficha.
  * **Semáforo → grupo → persona** (`SemaforoGrupoAdminScreen`): si el resumen por grupos dice que el grupo se abre
    (`puedeAbrirse`: tiene mentor y la funcionalidad está prendida), tocar a la persona abre sus **días y evidencias**
    (`PersonaDelLiderScreen`, vista nueva `persona-semaforo` de la pila de `AdminScreen`) en la MISMA ventana que se miraba,
    como el líder (que va directo a la persona): los 7 días, el «¿Qué sentiste?», las fotos de las acciones de los objetivos,
    «Ver publicación», «Escribirle» y «Avisar a su mentor». Con un grupo sin mentor abre su ficha, como siempre. **Desde sus
    días, «Ver su ficha» lleva a la ficha** (cambiar día, Caja, eliminar cuenta, semáforo propio), que así sigue a un toque;
    no se ofrece el camino de vuelta ficha → días → ficha. El atrás del sistema y la flecha suben un nivel cada vez.
  * **Ficha → «Ver sus días y evidencias»** (botón nuevo sobre «Detalle de hábitos», solo si la persona tiene grupo, `cellId`):
    abre la misma vista con el grupo de la persona, en la ventana vigente y con «Su grupo» de rótulo. **El servidor responde
    404** si el grupo no es regular con mentor vigente (la recepción, un grupo sin mentor), si la persona hoy no está en ese
    grupo o si no se muestra (sin participación en el programa, cuenta suspendida o de prueba; `PersonasDelGrupo` del
    backend): la pantalla lo dice —«No se pueden mostrar sus días desde acá: su grupo todavía no tiene mentor o la persona no
    figura hoy en él. Sus evidencias se ven en su ficha…»— en lugar del «todavía no está disponible» genérico (que promete
    que aparecerá solo), y se vuelve a la ficha. Un fallo de red o un 5xx siguen con su «Reintentar». La ficha por sí sola
    sigue sirviendo a cualquier aprendiz.
  * **`PersonaDelLiderScreen`** suma dos props opcionales, `avisoSiNoSeAbre` y `alAbrirFicha`: sin ellas es exactamente la
    pantalla del líder, que no cambia en nada. Las decisiones puras (a dónde lleva tocar a la persona, si la ficha ofrece sus
    días, el texto del 404) viven en `admin/utils/susDiasYEvidencias.ts`. Tras «Eliminar cuenta» en una ficha abierta desde sus
    días, la pila tampoco vuelve a los días de esa persona (`pilaTrasEliminarCuenta`).
  * **Permisos, sin cambios**: «Avisar a su mentor» lo pueden registrar ADMIN y ALCHEMIST (`AccesoDeLiderazgo` y el permiso
    `FOLLOW_UP_MENTOR` del backend), así que no se oculta; la observación queda a nombre de quien avisa. **Cada lectura de
    una persona deja un registro de consulta en el servidor** (FR-016) con el rol con el que se miró, también la de un ADMIN.
  * **No se tocan**: el recorrido del líder, los cinco tabs, el semáforo propio del aprendiz ni la ficha del mentor
    (`AlumnoScreen`), que sigue abriendo el archivo en el navegador y diciendo «no hay archivo que abrir» ante un texto: el
    mismo cambio le serviría, pero no estaba en el pedido.
    > **Corregido 2026-10-27 (mismo día).** La ficha del mentor sí cambió: ver «la ficha del mentor abre las evidencias dentro
    > de la app», más abajo.
  * **Compatibilidad**: contra un backend sin `puedeAbrirse` (anterior a la spec 005) las tarjetas de grupo siguen abriendo la
    tabla y la persona abre su ficha, como antes; el botón «Ver sus días y evidencias» de la ficha se ve y, si el servidor
    responde 404, lo dice. **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se
    actualiza por aire); backend nuevo, ninguno.
  * **Pruebas**: Jest (`diasYEvidenciasDesdeAdministracion`, `evidenciasEnLaFicha`, `personaDelLiderDesdeAdministracion`,
    `susDiasYEvidencias`, `pilaDeAdministracion`) y Maestro `regresion/23-admin-semaforo-persona-evidencias.yaml` y
    `24-admin-ficha-ver-sus-dias.yaml` (necesitan un grupo con mentor y una persona con evidencias; `E2E_PERSONA` elige a quién).
  Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar
  autorización explícita.

## Corrección — 2026-10-27 — la ficha del mentor abre las evidencias dentro de la app

* **Corrección — 2026-10-27 — la ficha del mentor abre las evidencias dentro de la app** (issue #34; seguimiento del cambio de
  Administración de arriba; sin backend nuevo). La ficha de un aprendiz que ve el MENTOR o la GUÍA de aprendiz
  (`AlumnoScreen`, desde «Mi grupo» o desde la info del chat del grupo con `alumnoDesdeLaInfo`: es la misma pantalla)
  abría cada evidencia con `Linking.openURL` en el navegador y, ante una de texto, decía «no hay archivo que abrir» sin
  mostrar lo escrito. Si el dueño no la quiere acá, se revierte solo el commit de este cambio. Lo que cambia y nada más:
  * **«Ver evidencia»** (en «Detalle de hábitos (lunes a domingo)») abre la hoja del líder (`EvidenciaDeObligacion`): foto,
    audio, video y **texto** dentro de la app. El enlace se sigue pidiendo al abrir la hoja (vence a los diez minutos).
    Se quitaron de la ficha `Linking`, `urlDeEvidencia` y su estado de «Abriendo…». «Ver publicación» del post diario queda.
  * **El servidor ya lo permite**: `GET /evidence/{id}` y `/evidence/{id}/url` responden al dueño, a quien actúa como mentor
    (`MENTOR` y `TRAINEE_GUIDE`) **si es el asignado a esa persona** (`participantes_programa.mentor_id`), al líder y a
    Administración (`EvidenciaService.requireDuenoOAdmin`). Un mentor que ya no acompaña a esa persona recibe 403 y la hoja
    dice «Tu cuenta no puede abrir esta evidencia.», sin romper la ficha. El javadoc de clase de `EvidenciaController` quedó
    atrás y habla solo del dueño y ADMIN; mandan el código del servicio y el `scope` de cada método.
  * **Cambia el nombre accesible** del botón: «Ver evidencia de <hábito>» (antes «Ver la evidencia de <hábito>»), el mismo
    de la ficha de Administración y la del líder. Mismas medidas (48 px de alto, 16 px).
  * **No se tocan**: el resto de la ficha, `EvidenciaDeObligacion` (ninguna prop nueva), el líder ni Administración.
  * **Pruebas**: Jest `evidenciasEnLaFichaDelMentor` (la hoja recibe el id de la evidencia, el texto se ve, un 403 no rompe la
    ficha, no se llama a `Linking.openURL`, vale con la ficha abierta desde la info del grupo).
  * **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por aire); backend
    nuevo, ninguno.
