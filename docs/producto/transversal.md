# Transversal (varios tabs a la vez) — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

## Cambio por pedido del dueño — 2026-10-05 — barra de pestañas (`TabBar`, los cinco tabs): íconos y pastilla de la pestaña abierta

* **Cambio por pedido del dueño — 2026-10-05 — barra de pestañas (`TabBar`, los cinco tabs): íconos y pastilla de
  la pestaña abierta** (pedido: «la parte de abajo, íconos que le correspondan»; el dueño aprobó «todo lo
  recomendado» del mosaico `barra-iconos-opciones.png`: el juego 2 y la opción 5). Lo que cambia y nada más:
  * **Íconos**: Hoy `house` (era `sun`), Plan `clipboardList` (era `doc`), Training `bicepsFlexed` en el botón
    dorado (era `diamond`, fijo fuera del mapa), Comunidad `usersThree` (era `users`) y Yo `circleUser` (era
    `user`). Los cinco viejos ya significaban otra cosa en la app (modo claro y ritual del mediodía, recurso de
    lección, fase 2, Tribu, «Editar perfil»). Van todos en el mapa `ICONS` de `TabBar.tsx` —también el del
    centro—: cambiar uno es una línea. Bloque `/* Barra de pestañas */` de `Icon.tsx` (Lucide, caja de 24, `s24`;
    `usersThree` es dibujo propio con piezas de `users`, porque Lucide no trae un grupo de tres y el de dos es la
    Tribu). `barraDePestanasIconos.test.ts` frena que un ícono de la barra se use para otra cosa.
  * **Pastilla `goldWash` detrás del ícono de la pestaña abierta**, sin rellenar el ícono: solo el color no
    alcanzaba (en claro el dorado y el gris de las demás están a 1,04 : 1 de brillo). Va fuera del flujo: no
    cambia el alto de la barra ni corre los nombres. No en TRAINING (ya es el círculo dorado). **Sin animación**:
    se cambia de pestaña decenas de veces al día y la pantalla cambia en el acto
    (`barraDePestanasPastilla.test.ts`).
  * **No cambian**: los cinco nombres siempre visibles (decisión del 2026-09-15), el dorado de la abierta, la
    barra que se esconde al desplazar, el botón central y sus medidas, las pantallas.
  * **Hace falta un APK nuevo** (la app no se actualiza por aire).

## Excepción autorizada por el dueño del producto — 2026-10-02 — los cinco tabs: la barra de pestañas se esconde al desplazar

* **Excepción autorizada por el dueño del producto — 2026-10-02 — los cinco tabs: la barra de pestañas se
  esconde al desplazar** (backend D-246). Pedido del dueño: «como en X o Facebook: al bajar se esconde la
  barra de abajo y al subir aparece, en toda la app». Lo que cambia y nada más:
  * `navigation/barraAlDesplazar/`: la decisión pura (`logicaDeLaBarra.ts`: 10 px seguidos en una
    dirección, visible a menos de 24 px del tope y en listas cortas, sin decidir cuando cambia el alto de
    la vista) y el proveedor con el hook `useOcultarBarraAlDesplazar({ vista?, onScroll? })`, que devuelve
    `{ onScroll, scrollEventThrottle }` para cualquier lista vertical.
  * `TabBar` no se desmonta: la barra **se desliza** hacia abajo con `transform` (Reanimated, 200 ms, hilo
    de UI) y su caja, que reserva el lugar, pasa de una vez al alto del borde seguro de abajo; la pantalla
    crece en lo mismo, así que ningún contenido queda tapado en ningún estado. (No animar el ALTO cuadro a
    cuadro: en el emulador la barra quedaba a medio salir; ver el comentario en `TabBar`.) Vuelve sola al cambiar de pestaña, de sub-vista o de sección, al salir de una
    sub-pantalla, al volver a la app y al abrir o cerrar una conversación.
  * El botón del acompañante baja con la barra. **Fija a la vista** con lector de pantalla, y no se toca
    con el teclado abierto. **Ampliación autorizada el 2026-10-03:** «activa las animaciones y genera
    el nuevo APK». Aunque Android tenga las animaciones desactivadas, este gesto conserva la
    transición de 200 ms (`ReduceMotion.Never` en la barra y el encabezado de Comunidad).
  * Pantallas con el comportamiento: las fija `barraAlDesplazar/__tests__/pantallasConBarraAlDesplazar.test.ts`.
    Sin él: la conversación abierta, los modales y las listas horizontales.
  * **Hace falta un APK nuevo** (la app no se actualiza por aire).
  Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a
  necesitar autorización explícita.

## Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Training`, `Comunidad` y `Hoy`, velocidad (V-1..V-4 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend).

* **Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Training`, `Comunidad`
  y `Hoy`, velocidad (V-1..V-4 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend).**
  Pedido del dueño con la retroalimentación de ese día: Muro y Training tardaban ~3 s. **No cambia
  nada visual**; cambia cuándo y cuántas veces se pide al backend:
  * **`Training`** abre con UNA ronda de seis pedidos (`features/training/api/cargarEntrenamiento.ts`);
    antes eran diez en dos rondas en serie, con `GET /api/v1/habits` tres veces. Después de
    completar o sellar, la tarjeta se marca en cuanto el servidor confirma y el refresco es
    silencioso: el esqueleto solo aparece en la primera carga.
  * **`Comunidad`** abre con `GET /api/v1/wall` y `/home`; cursos, ranking, conversaciones,
    directorio, célula, grupos y categorías se piden la primera vez que se abre su sección, el
    compositor o la hoja de compartir (`features/community/utils/cargaPorSeccion.ts`). El Muro es
    una `FlatList` y la tarjeta salió a `features/community/components/TarjetaPublicacionMuro.tsx`
    (mismo JSX, en `memo`); ya no existe `setPostOffsets`: llegar a la publicación desde Hoy usa
    `scrollToIndex`.
  * **`Hoy`** reusa la última lectura del Muro durante 2 minutos en vez de repedir la página
    entera en cada foco (`useUltimaPublicacionMuro`); publicar la invalida.
  Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
  vuelve a necesitar autorización explícita.

## Arreglos del e2e web del 2026-09-27 — tabs `Comunidad` (Classroom) y `Training`, onboarding y Administración (pedido del coordinador sobre los hallazgos TRB-04, TRN-02, PLN-02, PLN-03, ONB-02 y ADM-01).

* **Arreglos del e2e web del 2026-09-27 — tabs `Comunidad` (Classroom) y `Training`, onboarding y
  Administración (pedido del coordinador sobre los hallazgos TRB-04, TRN-02, PLN-02, PLN-03, ONB-02
  y ADM-01).** Lo que cambia y nada más:
  * **Classroom (TRB-04).** Al marcar una lección como completada ya no sale «Lección no disponible
    🔒» nombrando la lección recién completada, y la siguiente se abre de verdad (antes no se abría,
    aunque el aviso decía «Avanzando a: …»). La regla secuencial es la misma
    (`academy/utils/progresionDeLecciones.ts`): solo cuenta como completada la lección que el
    servidor acaba de dar por completada, aunque la pantalla todavía no se haya enterado.
  * **`Training` (TRN-02).** Un doble toque en Despertar/Dormir o en un hábito sin evidencia manda un
    solo cierre, y un 409 «Este registro no puede completarse: COMPLETADO» se toma como ya registrado,
    sin alerta (`habits/utils/cierreDeRegistro.ts`). Tocar la tarjeta o «VER» de un Despertar ya
    cumplido dice «Ya está cumplido / Este hábito ya quedó registrado hoy.» en vez de pedir el cierre
    otra vez. Los demás errores se avisan igual.
  * **`Training` → «PLANIFICAR» (PLN-03 y PLN-02).** El interruptor de pausa y el candado van al lado
    de la parte de la fila que abre el editor, no adentro: en la web, tocar el interruptor abría
    también el editor. Se ve igual. El editor de un hábito con un cambio de hora ya guardado que rige
    desde mañana (D-91) muestra, bajo «Ahora: 09:00», «Desde el lunes 28 de septiembre: 09:30» (la
    frase de la tarjeta de Plan, a 16 px, solo cuando hay un cambio pendiente), y la rueda arranca en
    la hora que va a regir: arrancar en la de hoy y guardar sin moverla deshacía el cambio
    (`training/utils/horaDelEditor.ts`).
  * **Onboarding → Términos (ONB-02).** «CONTINUAR» ya no queda apagado hasta tener la casilla y la
    firma: al tocarlo dice cuál falta, con las alertas que ya existían y nunca salían.
  * **Administración → «¿A quién atiendo hoy?» (ADM-01).** La etiqueta del lector de pantalla ya no
    repite «Grupo» («Grupo Grupo Plan E2E», «Grupo Sin grupo»); lo que se ve no cambia
    (`admin/utils/etiquetaDeAtencion.ts`).
  Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
  vuelve a necesitar autorización explícita.

## Arreglos del e2e del 2026-09-27 (pedidos del coordinador; hallazgos ADM-12, ADM-13, ADM-14 y CHT-06).

* **Arreglos del e2e del 2026-09-27 (pedidos del coordinador; hallazgos ADM-12, ADM-13, ADM-14 y
  CHT-06).** Lo que cambia y nada más:
  * **Administración (estado de `Hoy`), pantalla del grupo — «Asignar mentor» SUMA por defecto**
    (E-372, ADM-13, P0). Antes llamaba siempre al traslado (`PUT …/mentor`): un mentor con otros
    grupos quedaba afuera de ellos, que se quedaban sin mentor, y el diálogo solo decía «Hoy ya
    acompaña otro grupo.». Ahora (`admin/utils/asignarMentor.ts`): si el mentor no lidera otros
    grupos, «Asignar» como siempre; si lidera otros, «Sumar» (`POST …/additional-mentor`, D-141) y la
    pregunta dice cuáles conserva. Si el grupo ya tiene otro mentor, antes se lo quita
    (`DELETE …/mentor`): dos operaciones, y si la segunda falla se avisa que el grupo quedó sin mentor.
    El traslado queda como botón aparte, «Trasladar aquí», con un aviso que nombra los grupos que se
    quedan sin mentor (los nombres salen de `GET /admin/cells/dashboard`; si esa lectura falla, se
    cuentan). La fila dice «también acompaña a …» con `cellIds`, no con `cellId`.
  * **Administración — el motivo del servidor** (E-373, ADM-12 y ADM-14). `admin/utils/mensajes.mensajeDeFallo`
    muestra el texto del servidor en 400, 409, 413, 415 y 422 («El nombre de la celula no puede pasar de
    200 caracteres», el cupo lleno), salvo que parezca interno o sea el relleno «Error NNN»; un 404 y un
    5xx siguen con el genérico.
  * **`Comunidad`, barra de escribir del chat — tope de 6.000 caracteres** (E-374, CHT-06; D-215 del
    backend). El campo corta en el mismo número que el servidor (`chat/utils/largoDelMensaje.ts`) y,
    desde los 5.500, dice «N de 6000 caracteres» encima de la barra. Nada más del chat cambia.

## Excepciones autorizadas por el dueño del producto — 2026-09-21 — tabs `Plan`, `Comunidad` y `Yo`.

* **Excepciones autorizadas por el dueño del producto — 2026-09-21 — tabs `Plan`, `Comunidad` y `Yo`.**
  Autorizadas expresamente ese día, sobre capturas de la app:
  * **`Plan`** — acortar la intro de *Objetivos (3 niveles)* dejando el detalle tras un "Más
    detalles", y en el *Plan de la semana* llamar **objetivo semanal** a lo que la app decía
    "roca" y dejar de exigir que se llenen los cuatro pasos para poder navegarlos. Ojo: el
    backend sigue exigiendo tres ejes completos para GUARDAR, así que el formulario avisa qué
    falta en vez de bloquear el botón.
  * **`Comunidad`** — juntar las pestañas *Grupo* y *Miembros* en una sola llamada **Tribu**.
  * **`Yo`** — cablear la firma del Pacto, que era una maqueta: el recuadro mostraba el nombre
    del perfil con el rótulo "FIRMA DIGITAL REGISTRADA & SELLADA" sin que se guardara nada.
  El alcance autorizado fue ese y no abre los tabs: cualquier otro cambio sobre los cinco
  principales vuelve a necesitar autorización explícita.

## Cambio por pedido del dueño — 2026-10-13 — los cinco tabs: aviso de mantenimiento cuando una funcionalidad está apagada (spec 002)

* **Cambio por pedido del dueño — 2026-10-13 — los cinco tabs: aviso de mantenimiento cuando una funcionalidad está
  apagada (spec 002)** (interruptores de Soporte TI, fase 1; spec, plan §D8 y contrato en
  `Renaser-90-dias-backend/specs/002-soporte-ti-interruptores/`, aprobados por el dueño el 2026-10-13). Lo que cambia y
  nada más:
  * **La app lee qué está apagado para su sesión** (`features/plataforma/`): `GET /api/v1/funcionalidades/mias` con
    `ETag` / `If-None-Match` (304), al entrar, al volver al frente, cada 60 s y cuando el servidor responde 503
    `FUNCIONALIDAD_APAGADA` (lo detecta `apiFetch`, y el SSE de SER). Guarda la última lectura por cuenta; sin datos
    ni red, todo prendido (el servidor igual bloquea). `useFuncionalidad(clave) → { prendida, aviso }`; una hija de
    una madre apagada se ve apagada. `apiFetch` suma `cabeceras` y `apiFetchConRespuesta` (código, cabeceras, 304).
  * **`AvisoDeMantenimiento`** (ícono `wrench` nuevo, Lucide en caja de 24, solo para esto): el aviso que escribió
    Soporte TI en texto de 16 —o «Esta función está en mantenimiento. Vuelve a intentarlo en un rato.»— y
    «Reintentar», que relee. Se anuncia al lector de pantalla. Entra con fundido y 6 px en 260 ms (con «reducir
    movimiento», solo fundido). Va EN EL LUGAR de la funcionalidad: no desaparece nada.
  * **Dónde se tapa** (lo crítico; el resto ya lo protege el servidor con su 503 y el aviso como mensaje):
    * **SER**: el panel abre con el aviso en lugar de la conversación (`ia.chat`, y `ia` por ser su madre) y no pide
      el historial; el botón «Pregúntale a SER» del curso pasa a ser el aviso; el botón flotante sigue y dice «En
      mantenimiento» al lector; el orbe de Hoy queda quieto y apagado, el rótulo dice «En mantenimiento» y el aviso va
      debajo del hero; con solo `ia.voz` apagada no se abre la voz en vivo y el orbe sigue con la voz del teléfono;
      con `ia.propuestas` apagada, el aviso en lugar de «Cancelar» / «Confirmar» (tarjeta del chat y hoja de Hoy).
    * **Comunidad**: Muro (`muro`), Eventos (`eventos`), Cursos (`cursos`: catálogo, curso y lección) y Ranking
      (`ranking`) muestran el aviso en lugar de la sección; «Publicar» (`muro.publicar`) pone el aviso en el lugar de
      la barra de crear publicación; en Tribu, el aviso reemplaza la lista de chats (`chat`) y la tarjeta del grupo
      queda; en la sala, según el tipo (`chat.grupos`, `chat.global`, `chat.soporte`, `chat.directos`), el aviso
      reemplaza mensajes y barra de escribir (la cabecera queda para volver); el micrófono (`chat.audio`) y stickers,
      galería y cámara (`chat.fotos`) avisan en un diálogo en vez de empezar.
    * **Training**: con `habitos` apagado, el aviso ocupa la pestaña (la cabecera queda).
    * Al volver a prenderse, Muro, Cursos, chats, Ranking y Training vuelven a pedir sus datos.
  * **`Yo` → «Soporte TI»** (`features/soporte-ti/`): una fila más en la lista de Yo, con el ícono `toggleRight`
    (nuevo, Lucide), visible SOLO para el rol `IT_SUPPORT` / `SOPORTE_TI` (lo asigna el dueño por script en la base;
    no está en `ROLES_ASIGNABLES` y se nombra «Soporte TI» en Administración, chat y muro). Abre la consola a pantalla
    completa, como Administración: la contraseña la desbloquea (token en memoria, 15 min sin uso; un 423 vuelve a
    pedirla); lista por área con buscador y filtro (Todas / Apagadas / Críticas), estado de cada una y el circuito
    automático de la IA; el detalle con `Interruptor` general y por rol, aviso (≤ 200) y motivo obligatorio; lo
    crítico pide la contraseña otra vez (`X-Reautenticacion`, también si el servidor responde 428); versión optimista
    (un 409 relee y avisa); auditoría de a 20. Errores en diálogo, lo guardado con `ConfirmacionEnLinea`. El atrás del
    sistema sube un nivel en cada vista.
  * **Cambio por pedido del dueño — 2026-10-21: la consola usa su propio interruptor con ✕ / ✓ en el pulgar**
    (`features/soporte-ti/components/InterruptorDeConsola`: mismo riel y mismas medidas que `Interruptor`, ✕ con el pulgar a la
    izquierda cuando está apagado y ✓ a la derecha cuando está prendido; el pulgar viaja 180 ms con ease-out fuerte y las marcas
    se cruzan con un fundido, al instante con «reducir movimiento»). Solo en las pantallas de la consola (detalle de la
    funcionalidad y del rol): el resto de la app, y el componente `Interruptor`, siguen igual; `interruptorDeConsola.test.ts`
    frena que la consola vuelva a importar `Interruptor`. **Hace falta un APK nuevo** (la app no se actualiza por aire).
  * **No se tocaron**: Plan, la barra de pestañas, la forma de ninguna sección cuando está prendida, los textos de
    error de siempre, el login ni el onboarding.
  * **Hace falta un APK nuevo** (la app no se actualiza por aire). El APK publicado (1.5.0) no lee los interruptores:
    ve el aviso como el mensaje de error del 503.

## Cambio por pedido del dueño — 2026-10-14 — los cinco tabs y Administración: lo no disponible se esconde, y la consola Soporte TI suma despliegue, roles personalizados y «ver como» (spec 002, fase 2)

* **Cambio por pedido del dueño — 2026-10-14 — los cinco tabs y Administración: lo no disponible se esconde, y la
  consola Soporte TI suma despliegue, roles personalizados y «ver como» (spec 002, fase 2)** (contrato
  `Renaser-90-dias-backend/specs/002-soporte-ti-interruptores/contracts/fase-2.md`, con las decisiones del dueño del
  2026-10-14: P1 esconder, P2 cuentas de prueba en solo lectura, P3 hábitos solo con los seis roles base, P4 «ver como»
  incluye los personalizados, P5 métricas de 24 h). Lo que cambia y nada más:
  * **Lo que a una cuenta todavía no le toca se esconde** (`features/plataforma/`): `GET /funcionalidades/mias` suma
    `noDisponibles` (sin el campo, todo disponible; se guarda por cuenta como lo apagado) y `useFuncionalidad` dice
    `disponible`. No es el aviso de mantenimiento (ese es para lo apagado): la entrada **no se dibuja**. Dónde: los
    medallones de Comunidad (si la abierta se esconde, se muestra la primera que quede, sin parpadeo), «Crear una
    publicación», «Me gusta» y «Comentar» del Muro, los chats por tipo en Tribu y la sala abierta (se cierra sola), los
    botones de fotos y stickers y el de grabar (queda «Enviar»), el botón flotante de SER, su panel y el del curso, los
    botones de las propuestas, la voz en vivo, «Crear evento» y la asistencia; en Hoy las tarjetas de Administración,
    Mi grupo, Mis mentores, tickets, semáforo y próximo evento; en Yo la Evidencia, la Caja, Administración, la
    emergencia, Perfil, Mis evidencias, Notificaciones y «Lo que SER recuerda»; y las filas de Administración (raíz y
    «Más opciones»). El fénix de Hoy, sin SER, queda como imagen (su ánimo a la vista). **«Eliminar mi cuenta» nunca se
    esconde** (Google Play exige que se encuentre): con `cuenta.eliminar` no disponible, la fila abre la página pública
    `/eliminar-cuenta` en el navegador (`abrirEliminarCuentaEnLaWeb`, `features/legal/enlacesLegales.ts`).
  * **Pestaña sin nada disponible**: Training, o Comunidad sin ninguna sección con interruptor (Testimonios sola no la
    sostiene), quedan con «Esta sección todavía no está disponible para tu cuenta.» (`SeccionNoDisponible`), sin el
    ícono de mantenimiento ni «Reintentar». Las pestañas nunca desaparecen.
  * **Sin diálogo**: un 404 `FUNCIONALIDAD_NO_DISPONIBLE` (lo detecta `apiFetch`, y el SSE de SER) marca la clave y
    relee `/mias`; un 403 `MODO_SOLO_LECTURA` se dice en la franja de «ver como». El aviso con que la pantalla responde a
    cualquiera de los dos no se abre (`services/http/erroresSinDialogo.ts`, que consultan `components/Alerta` y
    `admin/utils/dialogo`): solo se omite un aviso sin botones que llega enseguida del error o repite su texto; una
    confirmación nunca se traga.
  * **Yo → Soporte TI → detalle → «Despliegue»**: el escalón de ahora, los escalones 5 / 25 / 50 % y «Para todos» (bajar
    uno es tocar el de al lado), motivo obligatorio, versión optimista; empezar uno, empezarlo «Solo probadores» o
    bajarle el porcentaje a algo crítico pide la contraseña (también ante un 428). Probadores: buscar
    (`GET /soporte-ti/personas`), sumar y quitar. Últimas 24 h: cifras dentro / fuera y dos gráficos de líneas (pedidos y
    errores 5xx, dorado y azul pizarra validados con la skill `dataviz` en claro y oscuro; tocar elige la hora) más la
    tabla por hora. Lo que se usa sin cuenta (`desplegable: false`, hoy el alta pública) no se ofrece desplegar. La lista
    dice «En despliegue · 25 %» y suma el filtro «Despliegue».
  * **Soporte TI → «Roles»**: los roles personalizados, activos e inactivos («N activos de 20»); crear o editar con
    nombre (hasta 60), descripción (hasta 280), de qué rol hereda (los seis, nunca Soporte TI; al editar, solo sin
    personas) y el árbol de funcionalidades de esa base (marcar una madre marca a sus hijas); «Activo», «Pasar sus
    personas a otro rol» y «Borrar rol» (los dos piden la contraseña; un 409 con personas ofrece pasarlas antes) y «Ver
    su historial» (la auditoría con la clave `rp:<id>`). Motivo obligatorio en todo. Los rechazos van por su `codigo`:
    `VERSION_CAMBIADA` relee y avisa, `ROL_CON_PERSONAS` muestra el mensaje y ofrece «Pasar personas»,
    `NOMBRE_REPETIDO` va bajo el campo del nombre y `MAXIMO_DE_ROLES` muestra el mensaje (sin `codigo`, se relee la
    versión). El aviso «Soporte TI cambió un rol» (`OPERACION_PLATAFORMA`, sin ruta) no tiene pantalla: tocarlo solo
    abre la app.
  * **Soporte TI → «Ver como»**: los seis roles base (sin Soporte TI) y los personalizados activos. Entrar guarda aparte
    la sesión de Soporte TI y su perfil (memoria y almacenamiento seguro) y la app se arma de nuevo como la ve ese rol
    (`MainTabs` lleva `key` por cuenta). **En los cinco tabs**, mientras dura, una franja fija arriba, en el flujo,
    «Viendo como Mentor · Salir» (`FranjaVerComo`, en `App.tsx`; la app queda debajo sin borde seguro de arriba).
    Salir funciona sin red, cierra la sesión de prueba si puede y vuelve a Yo con la consola abierta (parámetro
    `abrirSoporteTi`). Un 401 (también `VER_COMO_VENCIDO`, sin diálogo) o el vencimiento de la sesión de prueba vuelven
    a Soporte TI, no al login; abrir la app con «ver como» guardado vuelve a Soporte TI. En solo lectura (D-273) no sale
    ninguna escritura de fondo (`deFondo` en `apiFetch`: token de push, marcar leído un chat o un aviso, confirmar
    alarmas) y, si alguna recibe 403, es silenciosa; el orbe no intenta la voz en vivo; un ERROR `MODO_SOLO_LECTURA:`
    del WebSocket no cierra ni reconecta la conexión.
  * **Auditoría de la consola**: «Despliegue 5 % → 25 %», «Probadores 3 → 4», «Rol “Mentor junior” creado» (y borrado,
    desactivado, renombrado, funcionalidades) y «Vio la app como Mentor».
  * **Administración**: Equipo y roles y Solicitudes ofrecen los roles de `GET /admin/roles-asignables` (los seis y,
    debajo, «Mentor junior · hereda de Mentor»; sin el endpoint, los seis) y mandan `rolPersonalizadoId` al asignar o
    aprobar. Donde se lee el rol de alguien (Equipo y roles, la info de integrantes del chat, quién reaccionó en el
    Muro) va el nombre del personalizado si viene. **Hábitos del programa no cambia** (P3).
  * Movimiento (`emil-design-eng`, `animate-expo`): nada nuevo se anima salvo el texto de solo lectura de la franja
    (fundido de 180 ms; con «reducir movimiento», al instante). Chips, escalones, filtros y casillas cambian en el acto;
    las filas usan `Presionable`; lo guardado, `ConfirmacionEnLinea` y `tacto.logro`.
  * **No se tocaron**: Plan, la forma de la barra de pestañas, el login, el onboarding ni la forma de ninguna sección
    que esté disponible.
  * **Hace falta un APK nuevo** y el backend de la fase 2 (A2 despliegue, B2 roles, B3 «ver como»). Contra el backend de
    la fase 1 todo se ve disponible, la consola no tiene despliegue ni roles (sus lecturas fallan con su error en el
    lugar) y «Ver como» avisa que el servidor todavía no lo tiene. Maestro: `.maestro/interruptores/34–40`.
