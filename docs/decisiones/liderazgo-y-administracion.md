# Mentor, líder de mentores, Administración, Alquimista y sus fichas

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Hoy`, tarjetas del mentor y de administración (retroalimentación del 26/09, spec `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, S-1, S-6 y A-1)

* **Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Hoy`, tarjetas del mentor
  y de administración (retroalimentación del 26/09, spec `docs/specs/RETROALIMENTACION_2026-09-26.md`
  del backend, S-1, S-6 y A-1).** Lo único que cambia en `Hoy`:
  > **Corregido 2026-10-31 (pedido del dueño, punto 16).** Las dos tarjetas ya no están en Hoy (`TarjetaMentorHoy` y `TarjetaAdminHoy` se
  > borraron): «Mi grupo» (mentor o guía que acompaña un grupo) y «Administración» son filas de **Yo**, junto a «Mis mentores» del líder.
  > Las reglas de cuándo salen no cambian (el rol, si acompaña un grupo y las entradas de Soporte TI). Los rótulos «MI GRUPO» y
  > «OPERACIÓN» de abajo ya no existen. El semáforo del grupo sigue dentro de «Mi grupo». Ver la entrada del 2026-10-31.
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

## Excepción autorizada por el dueño del producto — 2026-10-01 — tab `Hoy`, «Mis mentores» del Líder de Mentores

* **Excepción autorizada por el dueño del producto — 2026-10-01 — tab `Hoy`, «Mis mentores» del Líder de
  Mentores** (backend D-241, SDD 002 en `specs/002-lider-de-mentores/`). Pedido del dueño: construir la gestión del
  Líder siguiendo las dos pantallas que ese rol ya tiene en Hoy (bandeja de tickets y semáforo por grupos). Lo que
  cambia y nada más:
  * Para una cuenta **Líder de Mentores** (`esLiderDeMentores`), una tarjeta «Mis mentores» en Hoy, antes de la de
    tickets, que abre `LiderMentoresScreen` como estado de Hoy (sin sexta pestaña). Para cualquier otro rol Hoy no
    cambia.
    > **Corregido 2026-10-29 (spec 018).** La tarjeta suelta se fue: «Mis mentores» es ahora una opción del control de arriba
    > de Hoy (con «Mi programa» y «Mi grupo») y `LiderMentoresScreen` se abre desde la fila «Mentores y reporte del mes».
    > **Corregido 2026-10-31 (punto 16).** «Mis mentores» ya no está en Hoy: es una fila de Yo (ver la entrada del 2026-10-31).
    > `LiderMentoresScreen` se abre desde la fila «Mentores y reporte del mes» de esa pantalla.
  * Todo vive en `src/features/lider-mentores/`: padrón (un mentor por fila: grupo y aprendices, semáforo de sus
    aprendices, consultas sin responder y evaluación del mes), ficha (grupos, consultas, evaluación, «Lo que le
    dijiste», «Escribirle» y Reconocer / Sugerir / Alertar), la pantalla para escribir una observación (con la casilla
    «Enviárselo también por el chat», apagada) y el reporte del mes con flechas entre meses. **Ningún aprendiz por su
    nombre** (decisión del dueño, 01/10).
  * **Hace falta un APK nuevo**: el APK de producción no tiene estas pantallas (la app no se actualiza por aire).
  Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar
  autorización explícita.

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
  > **Corregido 2026-10-29 (spec 018).** «Cada tarjeta de grupo» ya no está en una tarjeta de Hoy: son las filas de «Resultado
  > por grupo» en «Mis mentores», y tocar una abre `CumplimientoDelLiderScreen` directo en la lista de ese grupo (`grupoInicial`).
  > Sin `puedeAbrirse` la fila no se abre y dice «Sin mentor asignado».
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

## Cambio por pedido del dueño — 2026-10-29 — fichas del mentor, del líder y de Administración: tiempo libre de la semana (spec 015)

* **Cambio por pedido del dueño — 2026-10-29 — fichas del mentor, del líder y de Administración: tiempo libre de la
  semana (spec 015)** (spec 015 del backend, `specs/015-huecos-de-horario/`; pedido: buscar los huecos de horario que dejan
  los hábitos, acciones y eventos que la persona planifica, para recapitular. Decisión del dueño del 2026-10-29: en esta
  primera versión **la persona no lo ve**; lo ve solo su acompañamiento, en su ficha y en solo lectura —«no lo ve todavía;
  solo en su ficha lo ven los mentores, y también los líderes, alquimista y administrador»—, y solo se calcula y se muestra,
  sin sugerencias). Lo que cambia y nada más:
  * **Una sección nueva «Tiempo libre de la semana»** (`features/huecos/components/TiempoLibreDeLaSemana`), **debajo de la del
    Radar** (`CodigoRenaserDelAlumno`) en `AlumnoScreen` (mentor o guía), `FichaAprendizScreen` (administrador y alquimista,
    solo si la persona tiene grupo) y `PersonaDelLiderScreen` (líder; Administración la usa igual). Recibe `cargar(semana)`, como
    la del Radar, y no sabe de rutas ni de roles: el mentor pide `GET /api/v1/mentor/groups/{g}/learners/{u}/huecos?semana=` y
    los otros tres `GET /api/v1/leadership/groups/{g}/people/{p}/huecos?semana=` (`huecos/api/huecosApi`; `semana` es el
    lunes). **Nada para la propia persona**: ni Yo, ni Training, ni Plan, ni Hoy.
  * **Qué se lee**: arriba, la semana de lunes a domingo con ‹ › («Semana en curso» o «Semana cerrada» cuando el servidor dice
    `cerrada`, y «Del 26 de octubre al 1 de noviembre»); el resumen —«Tiempo ocupado» y «Tiempo libre» en horas y minutos, «Lo
    real de la semana»: `32 a tiempo · 6 tarde · 4 sin cumplir` (no se escribe si no hay nada que contar) y «Huecos que se
    repiten»: `Lun, mié y jue · 15:00–17:00`, o «Ningún hueco se repite esta semana.»—; y los siete días, cada uno con su
    ventana (`De 05:30 a 22:30`, o «Sin Despertar ni Dormir: todo el día» si es `null`) y sus huecos de 30 minutos o más
    (`15:00–17:00 · 2 h`; un día sin ninguno dice «Sin huecos de 30 min o más»). **Si la semana trae 8 huecos o más, cada día
    se pliega** (botón de 48 con chevron y una línea «2 huecos»); con menos se lee de corrido. Abrir un día es instantáneo, sin
    animación, y al cambiar de semana vuelven a quedar plegados. Todo calculado por el servidor: la app no suma ni cuenta.
    > **Corregido 2026-10-29 (el dueño, sobre la versión de arriba: «debe de estar mejor diseño como por día, ni un junior hace
    > eso, más intuitivo»; diseño aprobado en la vista previa, pestaña «2 · Tiempo libre por día»).** Lo de arriba —el resumen en
    > dos cifras, «Lo real de la semana», «Huecos que se repiten» y los siete días plegables con su lista de huecos— **ya no es
    > cierto**; `FilaDelDia` y `ResumenDeLaSemana` se borraron. Ahora se lee **por día**. Lo que cambia y nada más:
    > * **Arriba**, la semana con sus flechas (como antes) y una línea «**72 h 20 min** libres esta semana, de Despertar a Dormir»:
    >   la suma de los días que tienen ventana. Un día sin ventana no suma (contaría el sueño como tiempo libre); si ningún día
    >   la tiene, el total dice «—».
    > * **Siete columnas de lunes a domingo** (`ColumnasDeLaSemana`): letra del día, una barra vertical cuyo dorado es la proporción
    >   libre de la ventana de ese día (`minutosLibres` / ventana), las horas libres debajo («4.5 h», «13 h»; «—» sin ventana o
    >   sin dato) y un punto en hoy. La columna entera es el botón («Jueves 29, 4 horas 30 minutos libres, hoy», con estado
    >   elegido); ~43 dp de ancho en un teléfono de 360 y más de 110 de alto: siete columnas no dan 48 de ancho, el alto compensa.
    >   La tarjeta de la sección baja su relleno lateral de 17 a 12 para eso. Tocar una columna vibra con `tacto.seleccion()`.
    > * **El día elegido** (`AgendaDelDia`, abre en hoy; si hoy no cae en la semana, en el primer día con ventana): «Jueves 29 ·
    >   hoy» con su ventana («05:30 a 22:30»); etiquetas «5 a tiempo · 1 tarde · 0 sin cumplir» (verde / dorado / rojo, siempre con
    >   número y palabra) o «Todavía no llega» en un día por venir, y «10 h 20 min libres» con borde dorado. Tres ceros no se
    >   escriben (un día sin registros no tiene resultado). Y la **agenda en una línea de tiempo vertical**
    >   (`LineaDeTiempoDelDia`, con vistas posicionadas, sin SVG): de Despertar a Dormir, con marca cada 2 horas; lo ocupado en
    >   bloques grises con el nombre del hábito, la acción o el evento (la agenda personal, solo «Ocupado»); cada hueco de 30
    >   minutos o más en dorado con su duración y su rango. **Los bloques que se cruzan** van lado a lado, en columnas
    >   (`acomodarEnCarriles`): dos cosas a la misma hora se ven las dos. Un bloque más corto que una línea de texto va sin
    >   texto (su nombre lo lee el lector de pantalla: «Despertar, de 05:30 a 06:00»).
    > * **Al final «Se repite»** (`SeRepite`): tres filas como máximo («Lunes a viernes · 08:00–09:00», «Casi todos los días»,
    >   «Fin de semana»…), las que se apoyan en más días primero; sin ninguna, no se dibuja.
    > * **Sin la hora de Despertar o de Dormir** (`TarjetaDeHoraQueFalta`): si NINGÚN día de la semana tiene ventana, una sola
    >   tarjeta arriba dice «Falta su hora de Despertar» (o de Dormir, o las dos, o «Su hora de Dormir va antes que la de
    >   Despertar») y pide elegirla en Training → Planificar; no hay columnas ni agenda, no se dibuja el sueño como tiempo libre y
    >   el total dice «—». Si solo faltan en algunos días, esos días lo dicen en su agenda y no suman al total.
    > * **Movimiento** (`emil-design-eng`, `animate-expo`): elegir un día se hace decenas de veces por visita, así que es
    >   **instantáneo** (el cambio de fondo y de borde, la escala 0.97 de `Presionable` y el «tic»); nada se anima en la línea de
    >   tiempo, y nunca la altura. Con «reducir movimiento» no hay nada que quitar.
    > * **Letra grande**: la línea de tiempo mide `0,66 dp × minuto × la escala de la letra del sistema` (hasta 1,6): un bloque
    >   de 30 minutos siempre tiene el alto de una línea de texto, también al 130 %. La cifra bajo cada barra se achica en vez de
    >   cortarse.
    > * **Lo que llega del servidor** (aditivo, spec 015 `FR-028`; el backend con esta corrección va primero): por día `ocupados`
    >   (bloques con `desde`, `hasta`, `tipo` —`HABITO`, `ACCION`, `EVENTO`, `AGENDA`— y `titulo`), `cumplidosATiempo`,
    >   `cumplidosTarde`, `noCumplidos` y `sinVentanaPor`; y por semana `hoy` (el día de hoy en la zona de la persona: la app no
    >   usa el reloj del teléfono de quien acompaña para decir cuál es hoy). El esquema es tolerante: un tipo desconocido se dibuja
    >   como un bloque más, un bloque roto se pierde solo él, y la agenda personal nunca lleva nombre aunque el servidor lo mande.
    > * **Una semana cerrada no trae `ocupados` ni lo cumplido de cada día** (la foto semanal guarda tiempo, no nombres): ahí se
    >   dibujan los huecos dorados sobre un fondo liso con la nota «De una semana cerrada solo queda guardado el tiempo libre.», no
    >   hay etiquetas de lo cumplido por día y «32 a tiempo · 6 tarde · 4 sin cumplir en la semana» sale del resumen. Contra un
    >   servidor sin esta corrección, la semana en curso dice «Todavía no hay detalle de lo que ocupa este día.».
    > * **No cambian**: quién lo ve (solo el acompañamiento), las rutas, las flechas y sus topes, la lectura por semana, el 403 y el
    >   404 que esconden la sección, los fallos con «Reintentar», ni las tres fichas que la usan. Sin dependencias nuevas.
    >   **Hace falta un APK nuevo** y el backend con esta corrección.
  * **Semanas**: la primera lectura es la semana en curso de la persona (sin `semana`: el servidor sabe su zona). ‹ llega
    hasta `primeraSemana` y › hasta la semana en curso; nunca se pide el futuro ni antes de su primera semana (el servidor
    respondería 400). Sin `primeraSemana` no se inventa un tope: ‹ queda apagado. Las flechas dicen «Tiempo libre: semana
    anterior» / «…siguiente» y no «Semana anterior», que ya son las del semáforo en la ficha del líder (`Flecha` de
    `semaforo/components/NavegacionDeSemanas` pasó a exportarse, sin otro cambio).
  * **Un pedido por semana**: `huecos/hooks/useHuecosDeLaSemana` guarda cada semana leída mientras la ficha está abierta (un
    almacén por función `cargar`, que cada ficha arma con `useMemo` por persona y se libera con ella): ir y volver, volver a
    dibujar, volver a montar la sección (la ficha del líder pasa por «Avisar a su mentor» y regresa) o que dos secciones pidan
    lo mismo a la vez no repite ningún pedido. No hay lectura al enfocar ni sondeo. Un fallo se recuerda y no se reintenta
    solo; «Reintentar» lo pide otra vez.
  * **Cuándo no aparece**: un 403 (otro rol, cuenta suspendida o ya no la acompaña) o un 404 (backend sin la ruta) esconden la
    sección, sin error; sin grupo no hay a quién preguntarle. **Mientras llega la primera lectura tampoco se dibuja nada**
    (un marco con «Cargando…» que se retira con un 404 sería un parpadeo; la sección va al final de la ficha). Los demás
    fallos se dicen («No se pudo cargar el tiempo libre de esta semana.» y, sin red, «Revisa tu conexión.») con «Reintentar» de
    48. Al cambiar a una semana no leída, la tarjeta conserva las flechas y el rango y dice «Cargando el tiempo libre…» sin
    mostrar los datos de otra semana.
  * **Esquema tolerante** (`huecos/api/huecosSchemas`): lo único indispensable es `semana`; un día, un hueco, un hueco repetido
    o el resumen que no se entienden se pierden ELLOS y no la sección; `ventana` ausente o rota cuenta el día entero; los
    minutos que no llegan salen de las dos horas; una cifra que falta es «—», no «0 min». Acepta `HH:mm:ss` y `24:00`.
  * **Textos**: tipo oración, 16–17 px, tuteo donde hable la app; áreas de 48 en flechas, días y «Reintentar»; el lector de
    pantalla oye cada hueco como «De 15:00 a 17:00, 2 horas». Sin íconos nuevos ni colores de estado: es texto de lectura.
    Entra con `Aparicion` como las otras secciones de la ficha.
  * **No cambian**: el Radar, el semáforo, los 7 días de la ficha del líder, Hoy, Plan, Training, Yo ni los otros tabs. Sin
    dependencias nuevas.
  * **Hace falta el backend con la spec 015 antes y un APK nuevo** (la app no se actualiza por aire). Contra un backend anterior
    la sección no aparece (404) y las fichas quedan como hoy.

## Cambio por pedido del dueño — 2026-10-29 — tab `Hoy` (personal con más de un papel) y la ficha del líder (spec 018)

* **Cambio por pedido del dueño — 2026-10-29 — tab `Hoy` (personal con más de un papel) y la ficha del líder
  (spec 018)** (spec, plan y vista previa aprobada en `Renaser-90-dias-backend/specs/018-lider-limpio/`; decisión D-291 del
  backend). Comentario del equipo que el dueño pegó: «[la líder] tiene mucho para ingresar, debería de verse por aprender,
  ingreso y como mentora abre y aprendices, mentores y resultado por grupos» y «cuando le hago clic en persona ver si
  programaron, si subieron evidencias»; del dueño: «falta que esté un poco más limpio y no mucho texto». **Se ignora, por
  decisión del dueño, «por el momento no debería haber grupos»** (hoy son pocos alumnos y están decidiendo quién será el
  mentor). Lo que cambia y nada más:
  * **Hoy — el papel se elige con un control** (`features/hoy-por-papel/`; `ControlSegmentado` con «Mi programa» · «Mi
    grupo» · «Mis mentores», bajo la línea de fase y día): **solo para quien lidera mentores** (`papelesDeHoy`, pura) y con al
    menos dos papeles disponibles. «Mi programa» si hace su programa; «Mi grupo» si el servidor dice que acompaña un grupo (o
    falló al decirlo, para poder reintentar) y su entrada está prendida; «Mis mentores» si alguna de sus tres entradas
    (`lider`, `tickets`, `semaforo`) está prendida. **El aprendiz, el mentor, la guía, Administración y Alquimista ven Hoy
    exactamente como hoy, sin control.** Cambiar de opción es instantáneo y **sin animación** (`ControlSegmentado` suma la
    prop `sinAnimacion`, apagada por defecto: ningún otro control cambia), y la última opción se recuerda **por cuenta**
    (`renaser.hoy.papel.<id>` en AsyncStorage; un almacenamiento roto no tumba Hoy). La primera vez abre en «Mi programa»; si
    lo recordado ya no le corresponde, también. Quien se quedó en «Mi grupo» espera a que el servidor diga si acompaña uno, en
    vez de dibujar «Mi programa» y saltar al grupo.
    > **Corregido 2026-10-31 (pedido del dueño, punto 16: «debe ir dentro de Administración, lo mismo de cada uno, no en Hoy de cada
    > rol; se ve feo»).** El control «Mi programa · Mi grupo · Mis mentores» **ya no existe**: Hoy es SOLO el programa propio, para todos
    > los roles. Se borraron `ControlDePapelDeHoy`, `usePapelDeHoy`, `papelesDeHoy` y `papelRecordado` (la memoria por cuenta
    > `renaser.hoy.papel.<id>` queda sin leer en el teléfono), `MiGrupoEnHoy`, `TarjetaMentorHoy` y `TarjetaAdminHoy`, y la carpeta
    > `features/hoy-por-papel/` pasó a `features/paneles-de-rol/`. «Mi grupo» y «Mis mentores» son filas de **Yo**, junto a
    > «Administración». Ver la entrada del 2026-10-31.
  * **«Mi programa»** es el Hoy de siempre. Con otro papel a la vista, lo del programa propio (la frase del día,
    coherencia y racha, el orbe y todas sus tarjetas) queda **oculto pero montado** (`display: 'none'`): volver es
    instantáneo y no pierde la conversación del orbe. La línea de fase, día y puntos queda siempre.
    > **Corregido 2026-10-31 (pedido del dueño).** Ya no hay frase del día ni Coherencia / Racha en Hoy (están en Yo); lo del
    > programa que se oculta es la raya dorada, la tarjeta de acciones, el orbe y las demás tarjetas. Ver la entrada del 2026-10-31.
    > **Corregido 2026-10-31 (punto 16).** Lo de «Mi programa» oculto pero montado ya no aplica: no hay otro papel que mostrar en Hoy.
  * **«Mi grupo»** (`MiGrupoEnHoy`): el rótulo «Grupo Octubre · 6 aprendices» (abre el grupo entero, `MiCelulaScreen`) y una
    fila por aprendiz con su foto, su punto de color y su % del semáforo del grupo (`GET /mentor/groups/{g}/semaforo`, en el
    orden del servidor; sin número dice «—», nunca un 0 %). Tocar a uno abre su ficha de siempre (`AlumnoScreen`) y **volver
    regresa a Hoy**; abierta desde la pantalla del grupo o desde un aviso, vuelve a esa pantalla, como antes. Sin el semáforo
    (404, 403, sin red) la lista sale igual, con los nombres y sin color.
    > **Corregido 2026-10-31 (punto 16).** «Mi grupo» ya no es una lista en Hoy: es la fila «Mi grupo» de Yo, que abre `MiCelulaScreen`
    > (que ya lista a los aprendices con su semáforo) a pantalla completa con la cabecera «‹ Mi grupo». Tocar a un aprendiz abre su
    > ficha de siempre y volver regresa a «Mi grupo»; la flecha y el atrás del sistema suben un nivel por vez hasta Yo.
  * **«Mis mentores»** (`MisMentoresEnHoy`, solo el líder): **Resultado por grupo · Últimos 7 días**, una fila por grupo con
    su nombre, su mentor (o «Sin mentor asignado» en rojo), el punto de color y el % del promedio —los del servidor, sin
    recalcular—; abajo, «Consultas de mentores» con «N sin responder» (abre la bandeja de tickets de siempre) y «Mentores y
    reporte del mes» (abre `LiderMentoresScreen`; **no está en la vista previa**: sin esa fila el padrón, la ficha del
    mentor, las observaciones y el reporte quedaban sin entrada). Un grupo con `puedeAbrirse` abre `CumplimientoDelLiderScreen`
    **directo en ese grupo**, en los mismos 7 días de la fila (prop nueva `grupoInicial`); volver sale a Hoy. El aviso del
    sábado `/semaforo/grupos` sigue abriendo el resumen por grupos de siempre, con sus totales. Al abrirse la lista vuelve a
    los últimos 7 días y relee. La cifra de consultas sale de la primera página de la bandeja (30): si hay más páginas dice
    «N+», y no afirma «nada sin responder» si no vio todas. Cada lista es independiente: sin una, las otras siguen.
    > **Corregido 2026-10-31 (punto 16).** «Mis mentores» es la fila «Mis mentores» de Yo (`MisMentoresEnYo`, con la cabecera «‹ Mis
    > mentores»; la lista es la misma, `ListaDeMisMentores`): Resultado por grupo, Consultas de mentores, Mentores y reporte del mes y
    > Todos los aprendices, con las mismas reglas. Cada pantalla que cuelga de ella vuelve a «Mis mentores» y esta, a Yo (un nivel por
    > vez, `vistaDeRegreso`). Las rutas del aviso `/semaforo/grupos` no cambian: abre el mismo resumen, ahora desde Yo.
  * **Se borraron las tres tarjetas sueltas del líder** en Hoy (`TarjetaMentoresHoy`, `TarjetaBandejaHoy` y
    `TarjetaSemaforoGruposHoy`): sus pantallas se abren desde las filas de arriba. Deslizar para recargar relee la lista que
    está a la vista.
  * **La ficha de la persona abre con dos respuestas** (`PersonaDelLiderScreen`, que usa también Administración con el mismo
    endpoint; `RespuestasDeLaPersona`, dos tarjetas iguales arriba de los 7 días): **«¿Programó?»** —«Sí» / «No» con «5 de 17
    hábitos con su hora · 0 de 2 acciones agendadas»— y **«¿Subió evidencias?»** —«4 de 12», «Estos 7 días»—. El «Sí» y el
    «No» llevan ícono además del color; en un teléfono angosto la segunda baja debajo de la primera.
    * **El «Sí» lo decide el servidor** (campo opcional `programacion` en `GET /leadership/groups/{g}/people/{p}/week`; la
      app no lo recalcula). El umbral es **un supuesto del equipo a confirmar con el dueño**: al menos la mitad de los hábitos
      de HOY con la hora que ella eligió (no la del catálogo) **y** todas las acciones de hoy con hora; sin acciones hoy
      decide lo que sí tiene. Es de hoy en su zona, no de los 7 días. Sin el campo —servidor anterior, programa sin activar,
      ningún hábito que le toque hoy— **no hay tarjeta**: nunca un «No» por falta de datos.
    * **Las evidencias se cuentan de la ficha** (`utils/respuestasDeLaPersona`, sin backend): de los hábitos de los días
      cerrados que piden evidencia, cuántos tienen entrega, archivo o publicación del Muro. Hoy y los días que no llegaron no
      cuentan. Sin hábitos que la pidan no hay tarjeta (nunca un «0 de 0»).
  * **Menos texto** en las pantallas del líder: se quitaron los párrafos de ayuda que repetían lo que ya se ve, sin quitar
    datos ni funciones —la tabla completa, con el porqué de cada uno, está en la spec 018—: la ayuda de «Por grupo»
    (`SemaforoGruposScreen`) y la de la lista del grupo, lo que explicaba «Avisar a su mentor», el párrafo del mentor que no
    se mide, «De mayor a menor evaluación.» del reporte, y en `ObservarScreen` la línea de ayuda (ahora es el texto de relleno
    del campo) y el subtítulo de la casilla. La línea de resumen de la semana ya no termina en «· N con evidencia»: esa cifra
    es la de la tarjeta. `SemaforoAdminScreen` conserva su propia línea (no es del líder).
  * **No cambian**: los otros tabs, el recorrido de Administración y Alquimista, la sección de tiempo libre de la ficha, los
    permisos (el servidor autoriza cada lectura), ni los endpoints (solo suma un campo opcional).
  * **Hace falta el backend con la spec 018 antes, solo para ver «¿Programó?»**, y un APK nuevo (la app no se actualiza por
    aire). Un APK nuevo contra el backend anterior funciona sin esa tarjeta.

## Cambio por pedido del dueño — 2026-10-31 — Hoy → «Mis mentores»: el líder ve la ficha de todos los aprendices, estén o no en un grupo

Textual: «el líder de mentores puede ver la ficha de todos los aprendices sin necesidad de estar en grupo, solo para este rol».
Hasta hoy el líder llegaba a una persona solo por Hoy → «Mis mentores» → «Resultado por grupo» → un grupo con mentor → la persona
(`PersonaDelLiderScreen`, specs 005 y 018): quien no tenía grupo, o cuyo grupo no tenía mentor, no se veía. Lo que cambia y nada más:
* **Una fila nueva «Todos los aprendices»** en `MisMentoresEnHoy`, la última de las tres que van bajo «Resultado por grupo» (junto
  a «Consultas de mentores» y «Mentores y reporte del mes»), con su misma forma (`FilaDeLista`: título y chevron; sin ícono propio,
  porque las otras dos no lo llevan). **Solo existe si el servidor la ofrece**: Hoy pregunta con la primera página del listado
  (`useAprendicesDisponibles`, `size=1`) y la fila se dibuja únicamente con un 200; con 404 o 403 (backend anterior u otro rol), con
  cualquier otro fallo o mientras no se sabe, no se dibuja. Se pregunta solo si la cuenta lidera mentores y tiene prendida la entrada
  `lider`. **Para otros roles, Hoy no cambia.**
* **`AprendicesDelLiderScreen`** (estado de Hoy, como las otras pantallas del líder: sin pestaña nueva): el buscador «Buscar por
  nombre» (pide al servidor, `GET /api/v1/leadership/people?q=&page=&size=30`, sin tildes lo resuelve el servidor, 300 ms después de la
  última tecla; cada lectura toma un turno y solo la última escribe), la lista de a 30 (la página siguiente al acercarse al final, sin
  repetir a nadie; si esa página falla, lo leído se queda y hay «Reintentar»), y por fila la foto o las iniciales, el nombre y una
  línea «Grupo Fénix · Día 12» o «Sin grupo · Día 3». Estados: cargando, vacío («Todavía no hay aprendices.»), sin coincidencias
  («Sin resultados para «…».») y error con «Reintentar» de 48. Un único scroll (la lista); sin animaciones nuevas más que `Presionable`
  en las filas. El esquema es tolerante (`aprendicesDelLiderSchemas`): una fila rota se pierde sola, no la lista; un nombre vacío no
  esconde a la persona («Persona sin nombre»); el día 0 no se dice. La foto (`photoPath`) es una URL completa o una ruta del servidor
  que se pide con la sesión como las del chat (`AvatarDeLaLista`); si no carga, quedan las iniciales.
* **Tocar a una persona abre `PersonaDelLiderScreen`** —la de siempre: sus días, evidencias, Radar, tiempo libre y cierres— con la prop
  nueva `desdeTodos`: las cuatro lecturas salen por la puerta sin grupo, `/leadership/people/{p}/week`, `/radar`, `/huecos?semana=` y
  `/cierres?semana=`, **aunque la persona tenga grupo** (los cuatro `obtener…DePersona` aceptan `grupoId: null`). El rótulo es el
  nombre de su grupo o «Sin grupo». **«Avisar a su mentor» solo si la persona tiene grupo, el grupo tiene mentor y el servidor no dice
  que no** (`puedeAvisarAlMentor`, campo opcional de la semana —también de la del grupo—: con `false` no se ofrece; si el campo falta,
  vale la regla de siempre). `ObservarScreen` no usa el grupo: el mentor sale del cuerpo de la semana. «Escribirle» como siempre. Un
  404 de la ficha dice «Esta persona ya no está disponible para ver.». **Desde un grupo o desde Administración la pantalla no
  cambia en nada**: sigue pidiendo las rutas del grupo.
* **La fecha de la semana por la puerta sin grupo** viaja con los dos nombres (`semanaHasta` y `hasta`): la ruta del grupo la lee como
  `semanaHasta` y el contrato de la ruta nueva decía `hasta`; si el servidor lee solo uno, el otro sobra, y una fecha que se perdiera en
  silencio mostraría la ventana vigente diciendo que es otra. Por las rutas del grupo viaja solo `semanaHasta`, como siempre.
* **El atrás** (sistema y flecha) sube un nivel: persona → lista → Hoy. La lista queda montada, oculta, mientras se mira a la persona
  (como lo del programa propio en Hoy): al volver conserva la búsqueda, lo leído y la posición, sin releer. `MarcoDelLider` suma
  `BarraDelLider` (la misma barra «VOLVER» + título) para la lista, que lleva su propio scroll.
* **No cambian**: los demás tabs y papeles de Hoy, el resultado por grupo, el semáforo, las fichas del mentor y de Administración, los
  permisos (los decide el servidor: 403 para otros roles, 404 si la persona no se muestra o el backend es anterior), ni la barra de
  pestañas (la fila no suma ícono). Sin dependencias nuevas ni código nativo.
* **Pruebas:** Jest `aprendicesDelLider` (rutas, esquema, `puedeAvisarAlMentor`), `useAprendicesDisponibles`, `todosLosAprendices`
  (buscador, páginas, ficha sin grupo y con grupo, «Avisar a su mentor», el atrás, el grupo sigue con sus rutas), `hoyPorPapel`
  («Todos los aprendices» en «Mis mentores») y `hoyTodosLosAprendices` (cableado de Hoy). Maestro, escrito y sin correr:
  `.maestro/lider-ve-a-todos/01-persona-sin-grupo.yaml`.
* **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se actualiza por aire) y
  **el backend con `/leadership/people` antes**: contra uno anterior la fila no se dibuja y Hoy queda como estaba.

> **Corregido 2026-10-31 (punto 16, más tarde el mismo día).** «Mis mentores» ya no está en Hoy: es una fila de **Yo**, y «Todos los
> aprendices» sigue siendo una de sus filas. Donde esta entrada dice «Hoy → Mis mentores» o «estado de Hoy», léase Yo → Mis mentores. El
> atrás sube un nivel: persona → lista → «Mis mentores» → Yo. El flujo de Maestro `lider-ve-a-todos/01` entra ahora por Yo.

## Cambio por pedido del dueño — 2026-10-31 — Yo → «Mis mentores» → «Hábitos de todos»: el líder ve, hábito por hábito, quién cumplió y quién no (spec 029)

Pedido del dueño del 31/10 (decisiones en `~/.config/renaser-e2e/formaciones/decisiones-del-dueno-2026-10-31.md`; spec, plan y contrato en el backend,
`specs/029-lider-ve-todos-los-habitos/`, D-305): «que el líder de mentores vea todos los hábitos». Eligió todo A: por hábito, quién lo cumplió y quién no, con
su hora; **un día a la vez** (hoy y hasta 7 atrás); **solo aprendices**; y **los que menos cumplen, primero**. **Solo lectura y todo del servidor**
(`GET /leadership/habits`): la app no suma ni cuenta nada. Lo que cambia y nada más:
* **Una fila nueva «Hábitos de todos»** en `ListaDeMisMentores` (Yo → «Mis mentores»), la última de las cuatro bajo «Resultado por grupo», con la forma de las
  otras (`FilaDeLista`, sin ícono propio). **Solo existe si el servidor la ofrece**: Yo pregunta con la lectura de hoy (`useHabitosDeTodosDisponibles`, la misma
  puerta que «Todos los aprendices») y la fila se dibuja únicamente con un 200; con 404 o 403 (backend anterior u otro rol), con cualquier otro fallo o mientras
  no se sabe, no se dibuja. Se pregunta solo si la cuenta lidera mentores y tiene prendida la entrada `lider`. **Para otros roles, Yo no cambia.**
* **`HabitosDeTodosScreen`** (estado de Yo, como las otras pantallas del líder: sin pestaña nueva; cabecera `BarraDelLider` «‹ Hábitos de todos»): ‹ día › con
  «Hoy», «Ayer» o «Mar 27 oct» y el día completo debajo (`EncabezadoDelDia`; las flechas de 48 llegan hasta donde dice el servidor y se apagan en el límite sin
  desaparecer; cambiar de día es instantáneo y vibra con el «tic» de selección), el resumen en una frase («118 de 120 alumnos con hábitos · 940 de 1 500
  cumplidos»), los filtros (`FiltrosDeLosHabitos`: dimensión —con las categorías que el servidor manda, las de la formación—, **formación solo para quien ve más
  de una a la vez**, y grupo con «Sin grupo») y una fila por hábito (`FilaDeHabito`: nombre en tipo oración, dimensión, «41 de 100 cumplidos» y su barra), del
  que menos se cumple al que más. Deslizar hacia abajo recarga. Estados: cargando, sin hábitos («Ese día nadie tenía hábitos por cumplir.»), sin coincidencias
  con filtros («Ningún alumno coincide con estos filtros.» y «Quitar los filtros») y error con «Reintentar» de 48. Cada lectura toma un turno y al cambiar de
  día o de filtro no queda a la vista el dato del anterior ni por un instante.
* **`PersonasDeUnHabitoScreen`**: las personas de ese hábito en ese día, por secciones y en este orden —«No cumplieron», «Pendientes», «Cumplieron» y, plegada,
  «No les tocaba o en pausa»—, con buscador «Buscar por nombre» (el servidor, 300 ms después de la última tecla), páginas de 30 (la siguiente al acercarse al
  final; si falla, lo leído se queda y hay «Reintentar») y por fila la foto o las iniciales, el nombre, el grupo, la hora planificada y, si cumplió, **a qué hora**
  (`FilaDePersonaEnHabito`). Una persona sin datos dice **por qué** («Todavía no empezaba», «No le tocaba o en pausa») y nunca como una falta. Si cumplió con
  evidencia, un botón de 48 abre la hoja de siempre (`EvidenciaDeObligacion`, que sí deja constancia en el servidor).
* **Tocar a una persona abre `PersonaDelLiderScreen`** —la ficha de siempre— **en ese mismo día**, por la puerta sin grupo (`desdeTodos`, como «Todos los
  aprendices»; «Avisar a su mentor» solo si el servidor lo permite). El rótulo es el nombre de su grupo o «Sin grupo».
* **El atrás (sistema y flecha) sube un nivel por vez**: ficha → personas del hábito → hábitos del día → «Mis mentores» → Yo. Los niveles de abajo quedan
  montados y ocultos (como «Todos los aprendices»): al volver conservan el día, los filtros, la búsqueda, lo leído y la posición, sin releer.
* **Esquemas tolerantes** (`habitosDeTodosSchemas`): una fila rota se pierde sola, no la lista; un nombre vacío no esconde a la persona; un estado
  desconocido cuenta como «sin datos». **Sin animaciones nuevas** más que `Presionable` en las filas (se toca decenas de veces por visita).
* **Aislamiento entre formaciones**: lo decide el servidor (el líder ve a los alumnos de la formación o formaciones que tiene activas; Administración y
  Alquimista, todas). La app no filtra ni recuerda nada entre formaciones: el filtro «formación» solo acota, y las vistas se arman de nuevo si cambia la formación
  activa (`llaveDeLasVistas`), así que no queda a la vista nada de la anterior.
* **No cambian**: los demás tabs y papeles, el resultado por grupo, el semáforo, «Todos los aprendices», «Mi grupo», los permisos (los decide el servidor: 403
  para mentor, guía, aprendiz y cuenta suspendida; 404 con un backend anterior) ni la barra de pestañas. Sin dependencias nuevas ni código nativo.
* **Pruebas:** Jest `habitosDeTodos` (la API y los esquemas, y las reglas puras: días, orden, secciones, textos), `hooksDeHabitosDeTodos` (un turno por
  lectura, filtros, páginas, la puerta de la fila), `habitosDeTodosPantalla` (el día, los filtros, las secciones, la ficha en ese día y el atrás nivel por
  nivel), `panelesDeRol` / `vistasDeLosPaneles` / `panelesDeRolEnYo` (la fila y el atrás). Maestro, **escritos y sin correr**: `.maestro/habitos-de-todos/`
  (hábito → personas → ficha → atrás; ayer y los límites; un mentor no ve la fila).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y **el backend con la spec 029 antes** (que a su vez pide la 023): contra uno
  anterior la fila no se dibuja y Yo queda como estaba.

## Decisión del dueño — 2026-11-01 — Administración: la cabecera en dos renglones, y el espacio libre de las pantallas cortas

Del E2E de la segunda jornada. Con la letra del sistema grande, la cabecera de la ficha cortaba con «…» el nombre («Diana Diplomado T…») y
el correo, junto a «Escribirle». El dueño respondió: «cambia la cabecera a dos líneas». Lo que cambia y nada más:
* **`CabeceraAdmin`** (la de toda Administración, del líder y de las sub-vistas de Yo): el título y el subtítulo llegan a **dos renglones**
  (`numberOfLines={2}`), y ya no a uno. Con nombres cortos se ve igual que antes.
* **No cambian:** el botón de volver, la acción de la derecha ni las medidas.
* **Prueba:** `admin/components/__tests__/cabeceraAdminEnDosLineas.test.ts`.
* **También decidido, sin cambios en el código.** En «Mi ingreso» sin cronograma y en Plan sin programa propio, la tarjeta va arriba y
  debajo queda la pantalla libre. **Se deja así**: es donde termina el contenido, no un hueco entre bloques, y rellenarlo sería inventar
  información. El dueño respondió: «sí, déjalas así».
* **Hace falta un APK nuevo** (solo JavaScript).

## Corrección — 2026-11-02 — «Aceptada el …» en la ficha de Administración sale en la zona del teléfono, no en UTC (issue #108)

E2E final del 2026-11-02: la ficha de la persona y la lista de «Aceptadas» de Administración decían «Aceptada por … el 3 de noviembre» para una aceptación de las 21:30 de Lima del
2 (`2026-11-03T02:30:00Z`): entre las 19:00 y las 24:00 de Lima salía el día siguiente. Causa: `admin/utils/fechas.fechaCorta` partía el texto ISO a mano —bien para una fecha de
calendario, mal para un INSTANTE—, así que el día era el de UTC. Lo que cambia y nada más:
* **`fechaCorta` distingue las dos formas:** una fecha sola (`2026-11-03`, `LocalDate`) se sigue partiendo a mano, sin `Date` (que la correría un día); un instante (con hora: `…T02:30:00Z`,
  con desfase o con espacio) se lee en la zona del TELÉFONO, como el resto de la app (`fechaDeFirma`, `fechaCortaDe` de la Caja, `fechaDeVersion`, `fechaLegible`). Arregla
  `textoDeLaAceptada` (ficha y lista de «Aceptadas») y «Rechazada por … el …» (`SolicitudesAdminScreen`).
* **Otros lugares revisados** (fechas de aceptación, firma, confirmación y versiones): los términos (`fechaDeVersion`, `fechaDeFirma`, «Aceptó los términos… el»), el Pacto, «Mi aceptación», «Confirmaste
  tu cronograma el …» (`diaDeUnInstante`), la cuenta que se borra, la publicación del diagnóstico y la foto del grupo ya leían el instante en la zona del teléfono: no se tocaron. **Uno más
  tenía el mismo fallo y se arregló:** «Nueva cohorte» proponía como fecha de inicio `new Date().toISOString().slice(0, 10)` (UTC: a las 21:30 de Lima, mañana); ahora es `hoyIso()`, el día del teléfono.
  La bienvenida de Administración (`bienvenida.ts`) lee el instante en una zona fija de Lima a propósito.
* **Pruebas:** `fechaDeLaAceptacionEnLima.test.ts` (con el instante de las 21:30 de Lima y el reloj fijado a esa hora: los límites 18:59, 19:00, 23:59:59 y 00:00, desfase y cruces de mes y año, la fecha
  de calendario que no se corre, la ficha dibujada y la cohorte). Jest corre con `TZ = America/Lima`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Cambio por pedido del dueño — 2026-11-03 — el líder ve los días de sus mentores (D-318, backend #74)

Textual: «¿De los mentores puede ver qué hábitos hace o no, como con los aprendices? … Sí, procede.» Hasta hoy el líder de mentores (y
Administración y Alquimista) veía de un **aprendiz** sus 7 días con cada hábito, su evidencia y lo que escribió (`PersonaDelLiderScreen`), y de
un **mentor** solo sus grupos, consultas, evaluación y observaciones. Lo que cambia y nada más (solo JavaScript; el servidor lo decide, la app no
calcula nada):
* **La ficha del mentor** (`FichaMentorScreen`, «Mis mentores» → un mentor) suma arriba, bajo el subtítulo, **una fila «Sus días y evidencias ›»**
  (`FilaDeLista` de 56, igual que las de «Mis mentores»): **solo si el servidor dice `haceSuPrograma`** en `GET /leadership/mentors/{id}` (el mentor
  o la guía lleva su programa y ya lo activó). Con `false`, `null`, sin el campo (un servidor anterior) o con la cuenta suspendida, la fila no se
  dibuja y la ficha queda como estaba (`fichaSchema.haceSuPrograma`, opcional).
* **Al tocarla** se abre `PersonaDelLiderScreen` con `grupoId = null` y `desdeTodos`: la semana, el Radar, el tiempo libre, los cierres, el 80/20 y
  el diagnóstico se piden por **`/leadership/people/{id}/…`**, la puerta sin grupo que ya usaba «Todos los aprendices». Es la misma pantalla de un
  aprendiz: «¿Programó?», «¿Subió evidencias?», los 7 días con sus hábitos hechos y pendientes, sus evidencias, lo que escribió, sus acciones y las
  flechas de semana. Cambia solo el encabezado: en lugar del grupo dice **«Su propio programa»**, y debajo «Mentor · No se mide en el semáforo» con
  su % (el mentor **no cuenta para el semáforo** de ningún grupo; el servidor lo manda con `color: NO_SE_MIDE`). Ese encabezado ahora no dibuja el
  renglón del grupo si no hay nada que decir (nada de líneas vacías).
* **Sin «Avisar a su mentor»** (prop nueva `avisarAlMentor`, por defecto `true`: él es el mentor). «Escribirle» sí. Un 404 al abrir sus días (dejó su
  programa entre la ficha y el toque) dice «Sus días ya no están disponibles para ver.».
* **El atrás del sistema y la flecha suben un nivel:** sus días → ficha del mentor → padrón. La ficha queda montada, oculta (`display: none`), bajo
  los días, como la lista de «Todos los aprendices» bajo la persona: al volver conserva su lugar y no se relee. Para eso `MarcoDelLider` suma la prop
  `atrasActivo` (por defecto `true`): la ficha oculta apaga su retroceso para que no vuelva a registrarse por encima del de los días al redibujarse.
  `LiderMentoresScreen` suma la vista `dias` y conserva al ir y volver el aviso de la última observación guardada.
* **La lista de un grupo no cambia:** el mentor o la guía de ese grupo sigue saliendo con «No se mide en el semáforo» y su %, sin barras de colores.
  **Tocarlo abre sus 7 días de verdad** por la ruta del grupo (`/groups/{g}/people/{p}/week`), con el mismo armado que un aprendiz. Por eso la línea de
  la semana («N cumplidos · N sin cumplir · N pendientes») ya no se esconde para quien «no se mide» cuando la semana trae días (con un servidor
  anterior que los mandara vacíos, sigue sin dibujarse: ceros que parecerían incumplimiento).
* **No cambian:** los demás papeles ni pantallas del líder, Administración, los cinco tabs, el semáforo del grupo, los permisos (los decide el
  servidor: un MENTOR nunca ve los días de otro, 403) ni ningún texto fuera de los dichos. Sin dependencias, animaciones ni código nativo.
* **Pruebas:** Jest `diasDelMentor` (la fila solo con `haceSuPrograma`, 56 de alto, lo que entrega al tocarla, la semana por la puerta sin grupo y
  sus lecturas hermanas, los días y su resumen, sin «Avisar a su mentor» aunque el servidor mandara un mentor, el 404, el atrás un nivel por vez sin
  releer la ficha, el contrato) y `delGrupoALaPersona` (el mentor del grupo abre sus días por la ruta del grupo); `tsc` limpio.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) **y el backend con D-318 antes**: contra uno anterior la ficha no
  trae `haceSuPrograma` y la fila no se dibuja; todo queda como estaba.
