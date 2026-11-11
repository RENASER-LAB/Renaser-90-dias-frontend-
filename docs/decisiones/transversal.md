# Lo que tocó varios tabs a la vez: diseño, fuentes, barra de pestañas, velocidad, CI y arreglos de E2E

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepciones autorizadas por el dueño del producto — 2026-09-21 — tabs `Plan`, `Comunidad` y `Yo`

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

## Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Training`, `Comunidad` y `Hoy`, velocidad (V-1..V-4 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend)

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

## Arreglos del e2e web del 2026-09-27 — tabs `Comunidad` (Classroom) y `Training`, onboarding y Administración (pedido del coordinador sobre los hallazgos TRB-04, TRN-02, PLN-02, PLN-03, ONB-02 y ADM-01)

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
    > **Corregido 2026-11-02.** El botón dice «Continuar», en tipo oración (ver la entrada del 2026-11-02 sobre los botones dorados).
  * **Administración → «¿A quién atiendo hoy?» (ADM-01).** La etiqueta del lector de pantalla ya no
    repite «Grupo» («Grupo Grupo Plan E2E», «Grupo Sin grupo»); lo que se ve no cambia
    (`admin/utils/etiquetaDeAtencion.ts`).
  Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
  vuelve a necesitar autorización explícita.

## Arreglos del e2e del 2026-09-27 (pedidos del coordinador; hallazgos ADM-12, ADM-13, ADM-14 y CHT-06)

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

## Cambio por pedido del dueño — 2026-10-05 — tabs `Hoy` y `Yo`: ajustes al rediseño

* **Cambio por pedido del dueño — 2026-10-05 — tabs `Hoy` y `Yo`: ajustes al rediseño** (decisiones del dueño del
  mismo día sobre lo ya integrado en `rediseno-junto`). Lo que cambia y nada más:
  * **Una sola entrada a «Mi onboarding»**: se quitó la fila «Mi ficha y Pacto» de Yo, que abría la misma vista. Se
    llega por Ajustes → Tu proceso → «Mi onboarding» → El Pacto / Mapa de Renacimiento.
  * **Tipo oración, en negrita y sin espaciar** (13 px, `Jost_700Bold`, como «Coherencia» y «Racha» de Hoy) en los
    rótulos que habían quedado en versales: en Yo «Tu evolución», la fase, «Día n de 90», «Coherencia», «Puntos de
    liga» (decía «PUNTOS LIGA»), «Racha» (decía «RACHA DÍAS»; la cifra lleva «días» como en Hoy, era una «d») y
    los estados de «Mis evidencias» («Verificada», «En revisión»…); en Hoy, «Mi grupo» y «Operación» de las
    tarjetas de mentor y de administración. El «%» de coherencia de Yo aparece solo con cifra (decía «—%»).
  * **El Mapa dice los días que de verdad quedan** en todos sus pasos, no solo en la apertura: la prioridad (V02),
    Relaciones (V05), el aviso de carga (V06) y el cierre (V11, también su botón) decían «83 días» escrito a mano.
    El flujo lee el día una vez (`useProgramaDia`) y arma los textos con la cuenta de Hoy
    (`textosConLosDiasQueQuedan`, `home/utils/diasQueQuedan`); mientras no se sabe el día dicen «lo que queda del
    programa» y el botón «Comenzar mi ruta»; con un día por delante, «el día que queda».
  * **Hoy no inventa datos**: sin `/home` (o sin el dato) los puntos dicen «— pts» (era `?? 100`: «100 pts»), la
    racha «—» y el récord «—» (eran `?? 0`), y la tarjeta del Mapa «lo que queda del programa» (con `diaConocido ??
    0` decía «los próximos 90 días»). Con el Mapa activo dice «para los próximos N días» (decía «para los N días»).
    > **Corregido 2026-10-31.** Hoy solo dice ahora los puntos («— pts» sin dato); la racha y el récord se fueron con el bloque
    > Coherencia / Racha.
  * **Área táctil del botón de la cabecera** (`ScreenHeader`, el engranaje de Yo y el de tu grupo en Comunidad):
    caja de 44 × 44 (era 38) con márgenes de −3, así que el ícono (24) y la altura de la cabecera (46) no cambian.
  * No se tocaron Plan, Training, la vista del Pacto firmado, las miniaturas de evidencias ni los íconos del Mapa.
    **Hace falta un APK nuevo** (la app no se actualiza por aire).

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

## Cambio por pedido del dueño — 2026-10-05 — tab `Hoy` (y los rótulos de toda la app): la fase sin inventar, el rótulo de sección sin espaciado y el cierre del Mapa

* **Cambio por pedido del dueño — 2026-10-05 — tab `Hoy` (y los rótulos de toda la app): la fase sin inventar, el
  rótulo de sección sin espaciado y el cierre del Mapa** (tres decisiones del dueño del mismo día, las tres «sí»). Lo
  que cambia y nada más:
  * **La fase no se inventa**: sin `/home`, o con una fase que la app no conoce, Hoy dice «—» donde decía «Programa
    activo» (el lector de pantalla dice «Fase del programa: sin datos»).
  * **`MicroLabel` sin espaciado, en toda la app** (`components/ui.tsx`): 13 px, `Jost_700Bold`, `letterSpacing: 0`
    (era `t.micro`: 10,5 px, `Jost_500Medium`, 1,1, y en tipo oración se leía «H á b i t o s»). Cambian así todos
    sus rótulos: Hoy, Plan, el semáforo, Yo, Comunidad (Tribu), el ingreso y el rótulo de cada campo
    (`FormField`, `DatePickerField`, `SliderRating`, `SignatureCanvas`…). En las tarjetas de Hoy la cifra de la
    cabecera («0/15», «0/0», «Hace 6 días») va con la misma letra. El token `t.micro` no cambió.
  * **Rótulos que seguían en MAYÚSCULAS sobre `MicroLabel`, a tipo oración** (solo la caja): la Ficha Inicial
    («Fecha de nacimiento», «Ocupación / profesión actual», «Empresa / negocio actual (si aplica)» y el número de
    documento), la firma de Términos y el formulario del Código Renaser («Nivel de energía», «Código Renaser · …
    · Innegociable»). `rotulosEnTipoOracion.test.ts` frena uno nuevo; quedan fuera, a la vista, los capítulos
    viejos que nadie importa y el formulario de grupo de Administración (sus rótulos son selectores de e2e).
  * **Cierre del Mapa** (`CierreScreen`): «Felicidades» y «Próximamente · Reafirma tu compromiso» en tipo oración
    (eran versalitas espaciadas). En todos los pasos del Mapa (`PantallaPaso`) volver es la flecha de 24 con
    «Anterior» (o «Volver» en la apertura) en un área de 48 con `Presionable` (era «← ANTERIOR» de 10,5), y el
    botón principal va sin espaciar a 16 px. Los textos de los días no cambian.
  * No se tocaron `TabBar`, Training ni la racha. **Hace falta un APK nuevo** (la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-10-05 — tab `Training` (y Plan, Yo y Comunidad → Eventos): pulido final tras la prueba en Android

* **Cambio por pedido del dueño — 2026-10-05 — tab `Training` (y Plan, Yo y Comunidad → Eventos): pulido final tras
  la prueba en Android** (dos detalles del rediseño ya aprobado). Lo que cambia y nada más:
  * **Los `Switch` que quedaban son `Interruptor`** (`components/Interruptor.tsx`, el de Yo: colores del tema y
    `tacto.seleccion()`): «Arma tu semana los domingos» (Training), el de cada hábito en la hoja Planificar,
    «Recordarme mis acciones del día» (`RecordatorioDeAcciones`: Plan y Yo → Alarmas) y «Avisar a todos al
    guardarlo» (formulario de eventos). Eran el `Switch` del sistema con `'#332C20'`, `'#1E1B18'` y `'#888'` a mano:
    en oscuro el pulgar encendido casi desaparecía y el riel apagado no se veía. Mismo valor, misma acción y mismo
    «deshabilitado»; cada uno tiene ahora nombre para el lector de pantalla. `interruptoresDeLaApp.test.ts` frena
    un `Switch` nuevo con colores a mano.
  * **El Método (Yo → Ajustes)**: «Siguiente fase» entra de los dos lados lo justo para no quedar debajo del botón
    flotante de SER (`entradaParaElLanzador`), y sigue centrado bajo los puntos; la frase «Desliza para pasar de
    fase…» corta antes de esa misma franja. El hueco de abajo
    (`ESPACIO_PARA_LANZADOR`) ya estaba, pero solo despeja lo último al llegar al final; en reposo el botón quedaba a
    la altura del orbe. Las medidas del botón flotante pasan a `renasia/components/lugarDelLanzador.ts` con los
    mismos números: `RenasiaLauncher` no se movió y sigue exportando `ESPACIO_PARA_LANZADOR`.
  * **Hace falta un APK nuevo** (la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-10-31 — diseño de Hoy, Plan y Training, y la fuente Inter en toda la app

Pedidos del dueño del 31/10 con capturas; **todo es de la app, sin backend**. Cada punto es un commit aparte de la rama
`diseno-31-inter`. Lo que cambia y nada más:

### Hoy: sin la frase del día ni Coherencia / Racha, y la tarjeta de acciones arriba (puntos 1 a 3)
* **Se quita la frase del día** (la frase en serif bajo la cabecera). La cabecera queda: fase, «Día N de 90», los puntos y **la raya
  dorada corta** (el dueño: «la cabecera queda: fase, día, puntos y la raya»), que ahora es de la pantalla y no de la frase. Lo de
  abajo sube. `TarjetaConfrontacion` ya no se monta; su contenido (`confrontacion/data`, `fraseDelDia`) queda en el repo, sin uso.
  > **Corregido 2026-10-31 (el dueño, al verlo en el emulador: «entendiste mal: la frase sí debe ir; esta parte se debería quitar»).**
  > Era al revés: **la frase del día se queda** (`TarjetaConfrontacion`, con su raya dorada) y lo que se quita es **la cabecera** (la
  > fase, «Día N de 90» y los puntos, que ya están en Yo). Hoy es ahora «HOY», la frase y lo demás. Y la tarjeta de acciones **sin Mapa**
  > es una fila compacta («Haz tu Mapa de Renacimiento · De ahí nace tu objetivo de 90 días ›», toda tocable, del alto que tenía
  > Coherencia / Racha: «no tan grande»), sin botón dorado. Los otros estados de la tarjeta no cambian. Hace falta APK nuevo.
  > Y sin Mapa **no se repite la tarjeta «Mapa de renacimiento · Diseña tu mapa»** de más abajo (el dueño: «sí, quita la de abajo»):
  > la invitación ya está arriba. Con el Mapa empezado o activo esa tarjeta sigue, porque es la entrada para verlo (`mostrarTarjetaDelMapa`).
  > **Corregido 2026-11-01.** La frase **sale siempre**, también sin día de programa (personal sin programa, Día 0, sin Día 1 elegido): ver la
  > entrada «Hoy (y Plan): la frase siempre, el programa propio en una fila y la fecha de inicio» del 2026-11-01.
* **Se quita el bloque Coherencia / Racha** («Coherencia 0 %», «Consistencia del día», «Racha 2 días», «Récord histórico»): **Yo ya
  los muestra** (Coherencia con su %, Puntos de liga y Racha con «días»). Comprobado en `YoScreen`. Lo único que Hoy mostraba y Yo no
  es el «Récord histórico» (`rachaMaxima`) y las dos líneas de apoyo («Consistencia del día», «Nivel de excelencia»): se van con el
  bloque, sin pasarlas a Yo.
  > **Corregido el mismo día (punto 14):** el récord sí pasó a Yo, como una línea bajo la Racha. Las dos líneas de apoyo se quedaron afuera.
* **En su lugar, la tarjeta de «Acciones y objetivos»**, antes de «Tu acompañante» (`home/components/TarjetaAccionDeHoy`), con el
  diseño de la referencia del dueño y nuestras palabras: tarjeta con el fondo y el borde del tema; arriba el ícono `calendar` de 16 y
  la hora de la acción («09:00 – 09:45» con inicio y fin; «09:00» con solo inicio; «Sin hora»); el título en negrita (18); «Meta: …»
  (el objetivo de la semana de esa acción o, sin semana, la primera cláusula del de 90 días; sin meta la línea no se dibuja,
  `objetivos/utils/metaDeLaAccion`); y un botón dorado de 52 a todo el ancho, «**Empezar ahora** ›», que lleva a Training con
  `abrirAccionId` (lo mismo que «Registrar en Training» de Plan). Sin los «…» de la referencia (no harían nada) y sin «Iniciar
  enfoque» (el dueño: «mismo diseño, no las mismas palabras»).
* **Qué acción muestra:** la que sigue hoy con la regla de `objetivos/utils/accionesDeHoy` (`accionQueSigueHoy`: la primera sin
  cumplir en orden de hora, sin contar las que esperan a la verde). Usa la lectura de `/rocks/today` que Hoy ya hacía
  (`useAccionesDeHoy`, una vez por foco: **sin pedidos nuevos** para las acciones). **La meta sí lee:** `GET /rocks/weekly` y, solo si
  la semana no la resuelve, `GET /rocks/master`, **una vez por acción y por sesión** (`useMetaDeLaAccion` guarda lo leído en
  memoria; un fallo no se guarda). La tarjeta espera a saber la meta para dibujarse una sola vez, ya completa.
* **Estados**, mismo esqueleto (`home/utils/vistaDeLaAccionDeHoy`, pura): sin Mapa activo → «Tu objetivo de 90 días nace de tu Mapa
  de Renacimiento.» con «Hacer mi Mapa ›» (solo con el estado del Mapa **confirmado**: `useLecturaDelEstadoDelMapa`, un teléfono
  nuevo dice «no iniciado» de quien ya lo hizo); sin acciones hoy → «Hoy no tienes acciones agendadas» con «Agendar en Plan ›»; todo
  cumplido → «Cumpliste tus acciones de hoy» (sin botón); mientras carga, nada (sin parpadeo). Con acciones por hacer, la acción
  manda sobre el Mapa. **Se quitó la tarjeta vieja de abajo** (no se duplica).
* **No cambian** el resto de Hoy, los papeles del líder, el orbe ni los demás tabs. Sin animaciones nuevas.
  > **Corregido el mismo día (punto 16):** los papeles del líder ya no están en Hoy; ver «Los paneles de rol viven en Yo» más abajo.
* **Pruebas:** Jest `vistaDeLaAccionDeHoy`, `tarjetaAccionDeHoy`, `metaDeLaAccion`, `useMetaDeLaAccion`,
  `useLecturaDelEstadoDelMapa` y `accionesDeHoy` (la que sigue y la hora); se ajustaron las que leían el código de Hoy.

### Plan: sin «Arquitectura de tiempo» (punto 4)
* **Se quita la sección «Arquitectura de tiempo»** (las cuatro fases con su barra y su lista) de la pantalla principal de Plan: ya
  está en Yo (la tarjeta de fase, «Fase 2 de 4 · Días 8–34» con su avance). «Fase actual» y lo demás quedan. Se borró lo que
  quedó sin uso: `objetivos/utils/arquitecturaDeTiempo` (y su prueba) y los estilos del riel de fases. `faseEnCurso` sigue siendo la
  única cuenta de la fase (Plan, Yo y la vista previa de Administración).

### Training: la cabecera sin la línea de fase y día (punto 5)
* **Se quita «El Maestro Interno · Día 55 de 90»** de la cabecera de `TrainingPorHora`. Quedan el día elegido en grande («Sábado
  31») y su resumen («0 de 17 hechos · 0 pts»). Se borró `lineaDelPrograma` y la prop `fase` de `TrainingPorHora` (nada más la
  leía); `diaPrograma` se queda (decide qué días se pueden leer). El día y la fase del programa siguen en Hoy y en Yo.

### Training: los nombres de los hábitos «no tan mayúsculas» (punto 6)
* **Un título que llega del servidor TODO en mayúsculas se muestra en tipo oración**: «AGUA TIBIA CON LIMÓN» → «Agua tibia con
  limón»; «RITUAL TIERRA - AGUA - FUEGO (mañana)» → «Ritual tierra - agua - fuego (mañana)». Lo hace una sola función pura,
  `habits/utils/tituloEnTipoOracion` (con pruebas), y se usa al DIBUJAR en Training: la lista de hoy y la de otro día, la hoja
  del hábito (`itemsDelDia` → `tituloParaMostrar`), «Tus prácticas» → Planificar (la lista, el título del editor, la pausa y
  «Cambiar nombre»), y los títulos del registro con foto y de la hoja de evidencia.
* **Reglas:** (1) solo cambia si el título «llega todo en mayúsculas», y lo que va entre paréntesis **no cuenta** para decidirlo
  (el catálogo escribe «(mañana)» en minúsculas, y por eso «RITUAL … (mañana)» tiene minúsculas aunque lo demás grite); (2) un
  título que ya tiene minúsculas —el que la persona puso con «Cambiar nombre», «Clase diaria», «Pastilla Renacer»— se deja tal
  cual, aunque el nombre propio lo haya escrito en mayúsculas; (3) **siglas y nombres propios:** «SER» (y «IA», «TV», «USD») siguen
  en mayúsculas, «RENASER» queda «Renaser» y «RENACER» (la «Pastilla Renacer») «Renacer»; para sumar una sigla, es una línea en
  `SIGLAS`. Los títulos de las **acciones de los objetivos** (los escribe la persona) no se tocan.
* **Solo cambia lo que se muestra.** No cambia lo que se guarda ni lo que se manda al servidor, ni el texto de las alarmas
  (`recordatorios.programar(…, h.title, …)` sigue con el título del catálogo), ni cómo se empareja la voz de la alarma (por id y
  por título del catálogo). Hoy (la tarjeta de hábitos) y Yo no cambian: el pedido era de Training.

### Training: los rituales piden solo texto (punto 7)
* **Los tres «Ritual Tierra - Agua - Fuego» (mañana, mediodía y noche; claves `RITUAL_MORNING`, `RITUAL_MIDDAY`, `RITUAL_NIGHT`)
  se registran escribiendo, sin cámara.** En la hoja, en lugar de «Tomar foto», el botón **«Escribir cómo me siento»** (ícono
  `pencil`; en la fila, la píldora «Escribir» en lugar de «Subir»). Abre `RegistroDeRitualConTexto` (una `HojaDesdeAbajo`) con la
  pregunta **«¿Cómo te sientes después de realizar el ritual?»**, obligatoria, y «Enviar» fijo abajo; el campo llega a 4000
  caracteres, que es lo que acepta el servidor (`respuestaTexto` de `/complete` es `@Size(max = 4000)`; «¿Qué sentiste?» no pone
  tope en la app).
* **Por los mismos caminos de siempre:** `confirmarEvidencia` con evidencia `TEXTO` y `completarRegistro` con esa misma respuesta
  (`respuestaTexto`), que emite `habitoCumplido` (alarmas, celebraciones, puntos). La regla es `registrarConTexto`
  (`habits/utils/registroConFoto`, con pruebas): el mismo orden que el registro con foto, sin subida a S3; si el texto ya quedó
  guardado y el cierre falla, reintentar solo cierra (no duplica la evidencia); un rechazo de un registro que ya figura
  completado se da por bueno. Ambos pasos comprueban que el registro siga siendo de HOY (spec 002): si pasó la medianoche no se
  manda nada, se avisa («Tu día cambió…») y se recarga. Lo escrito se guarda como borrador en memoria por registro y se pierde al
  enviar; un doble toque manda un solo pedido. El aviso al terminar es el de «Evidencia entregada» de siempre.
* **El servidor lo acepta** (comprobado leyendo el backend, solo lectura): el catálogo dice evidencia `OBLIGATORIA` sin tipo, y
  `RegistroService.requireEvidenciaSiLaExige` solo pide que el registro tenga **alguna** evidencia (`registrosHabitoConEvidencia`
  no mira el tipo); `POST /habit-tracks/{id}/evidence` acepta `TEXTO` con `contenidoTexto`, sin restricción por hábito. Es el mismo
  camino de la Audioterapia. El texto del servidor «Este hábito pide una foto: súbela…» solo sale si no hay ninguna evidencia.
* **«RITUAL DE MAÑANA (domingo)» no cambia:** es de evidencia **opcional** y no tiene clave de sistema (V69 solo se la dio a los tres
  de Tierra - Agua - Fuego), así que sigue con «Subir» y las cuatro formas. SER, desde el orbe o el chat, todavía puede pedir la
  foto de un ritual y se registra con el camino de la foto y «¿Qué sentiste?» (`preguntaQueSintio`); Yo → «+ Subir foto» ya no
  ofrece los rituales (`habitosParaFotoDeHoy`, porque `seRegistraConFoto` es falso para ellos).

### Training: «Última comida del día» vuelve a llevar el círculo (punto 8)
* **Es opcional y se marca con el círculo**, como Despertar y Dormir: su fila lleva el ✓ para marcarla hecha de un toque
  (`completarHabitoSimple`, el mismo cierre sin evidencia) en lugar de «Subir». Es la corrección del ajuste del 2026-10-30 («en la
  evidencia opcional la fila lleva solo «Subir»») **solo para esta**: los demás opcionales (Día sin celular, Meditar, Escritura
  libre…) siguen con «Subir».
* **Se reconoce por el id de su plantilla de catálogo** (`ID_DE_LA_PLANTILLA_ULTIMA_COMIDA` = `3a8a82a0-787d-46bc-a69e-b29c110a37bc`,
  el `habitos.id` de producción, igual en todos los entornos), **nunca por el título**: no tiene `clave_sistema` y su título se
  muestra en tipo oración y se puede cambiar. En un entorno donde el id no coincida, queda con «Subir» (lo seguro). Si en algún
  entorno su evidencia fuera obligatoria, no se cierra con el círculo: pide su registro.
* La hoja del hábito no cambia: sigue con «Subir evidencia» y «Marcar como hecho». Lo hecho, lo cerrado y los otros días, igual.

### Plan: la pantalla principal con el formato de la referencia (punto 10)
Pedido del dueño: «en Plan replica este formato de acuerdo a lo que tenemos». La maqueta se tradujo con **nuestros datos y nombres**
(sin sus textos de ejemplo). Plan pasa a ser **una sola pantalla**, de arriba abajo:
* **a. Cabecera:** «Plan» grande y, debajo y en dorado, «Tu dirección en 90 días». La diana de la maqueta no se dibuja (no tiene acción).
* **b. Selector de eje:** el `ControlSegmentado` de Objetivos, con el principal primero y el ícono de cada eje (`iconoDelEje`):
  **Cuerpo**, **Negocio**, **Relaciones**. `ControlSegmentado` suma la opción `icono` (16, opcional; sin ella no cambia nada). Todo lo de
  abajo es del eje elegido.
* **c. Tarjeta del objetivo de 90 días** (`TarjetaDelObjetivo`): el objetivo en negrita; «Inicio 82 · Actual 81 · Meta 80 kg» (la
  línea base, el avance y la meta, que ya teníamos: `lineaDelObjetivo`); el % a la derecha en dorado; la barra; y, si existe, «Este mes:
  81.6 kg» como una línea chica (tocarla la corrige, como antes). Los **tres puntos** de la derecha abren la hoja de siempre
  —**escribir el objetivo** si falta, o **anotar el avance** si ya nació del Mapa y quedó fijo (D-234)—: «Editar» y «Anotar avance»
  son la misma hoja, porque el objetivo fijo solo admite el avance. Sin avance que anotar (Relaciones fijo, sin meta) no se dibujan.
* **d. «Esta semana»** (`TarjetaEstaSemana`): el ícono `calendar`, el objetivo semanal del eje, «2 de 6» a la derecha y la barra.
  **Honestidad del dato:** el servidor no manda los días que ya pasaron (`/rocks/today` y `/rocks/upcoming` van de hoy hacia
  adelante), así que la cuenta es de hoy a fin de semana y la tarjeta lo dice («acciones cumplidas, de hoy a fin de semana»). Sin
  semana armada: «Todavía no armaste esta semana» con **«Arma tu semana ›»**. Conserva «Cerrar este objetivo con mi revisión»
  (`RevisionSemanalModal`), «Ir al Mapa» si faltan los tres objetivos y, el domingo, «La que empieza el lunes» con «Armar la semana
  que empieza» (D-203).
* **e. «Acciones que mueven la meta»** (`AccionesQueMuevenLaMeta`): las agendadas del eje, de hoy y las que vienen (`today`, `tomorrow`
  y `upcoming`, una vez por foco, ahora con `useRocasDiarias`); cada fila con su ícono (el del eje, el ✓ de línea si está cumplida, el
  candado si espera a la verde), el título, «Mar 27 oct · 09:00» y su chevron. **Tocar una de hoy lleva a Training con
  `abrirAccionId`** (ahí se sellan, como siempre); **una que viene abre «Agendar»**. Sin acciones: una línea con «Agendar mis
  acciones»; con acciones, «Agendar otro día». Debajo van **los recordatorios de las acciones** (`RecordatorioDeAcciones`, sin cambios).
  > **Corregido 2026-10-31 (punto 21, ajustes tras el E2E).** Los recordatorios ya no van a la vista debajo de la lista: son la fila «Recordatorios de tus
  > acciones ›», que abre una hoja con el mismo control. Ver «Ajustes tras el E2E del rediseño», al final de esta entrada.
* **f. «Tu 80/20»** (ícono nuevo `chartNoAxesColumn`, Lucide): «Prioriza lo que más acerca tu meta.»; abre una hoja con la regla de
  Pareto de siempre —la acción verde va primero, las otras esperan con candado— y las acciones de HOY del eje con su color en
  palabras (Verde / Amarilla / Roja) y su estado (los mismos textos de `textoDelEstado`).
* **g. «Organizar mi semana ›»**, botón dorado a todo el ancho: abre el **asistente de la semana** (`PlanSemanalModal`) si el eje no tiene
  objetivo semanal (o el domingo, si falta el de la que empieza) y, con el eje ya armado, **«Agendar»**: organizar la semana es repartir
  sus acciones. Bloqueada, lleva al Mapa.
* **Sin Mapa activo:** `PuertaDelMapa` («Primero tu Mapa de Renacimiento») en lugar de todo lo del eje, como desde el 2026-10-27.
* **Lo que salió de la pantalla** (se integró arriba o se quitó): «Fase actual» (ya está en Yo), «Arquitectura de tiempo» (punto 4),
  las **«Prioridades clave»** en lista (las reemplaza el selector de eje), **«Tus acciones de hoy · por eje»** de la spec 016 (la
  reemplaza «Acciones que mueven la meta») y **la sub-vista de Objetivos con su flecha de volver** (`activeSubView`). Se borraron
  `NivelesDelPlan`, `TarjetaPlanSemanal`, `TarjetaAccionesDelDia` y `TarjetaAccionesDeHoyPorEje`, que `PlanDelEje` y `TarjetasDelPlan`
  reemplazan sin perder funciones: editar el objetivo, anotar el avance, la cifra del mes, armar la semana, agendar, revisar la
  semana, los recordatorios y el sellado de acciones (en Training, desde la fila) siguen teniendo entrada. La alarma de una acción
  con hora (`abrirObjetivosEje`) abre Plan en ese eje.
* **No cambian:** la barra de pestañas, los asistentes y hojas (`PlanSemanalModal`, `RevisionSemanalModal`, `AgendarAccionesModal`,
  `EditarObjetivoDelMesModal`), las reglas del servidor ni los demás tabs. Sin animaciones nuevas (`Presionable` en filas y tarjetas).
* **Pruebas:** `planDelEje` (con todo, sin semana, sin acciones, el domingo, bloqueada y errores), `planPrincipal` (la lógica pura),
  `controlSegmentadoConIcono`, `planRediseno` y `planEsperaAlMapa` (el Mapa y el selector) reescritas.

### Yo: sin la tira «Evidencia» (punto 11)
* **Se quita de Yo la tira «Evidencia»** (las tres miniaturas con `MiniaturaDeEvidencia`, debajo de Coherencia, Puntos de liga y
  Racha, con su «Todavía no subiste evidencias.» y el «+N»). **«Mis evidencias» sigue en Ajustes → Tu proceso**, sin tocar (su grilla
  con la foto real y el visor en grande). Se borró lo que quedó sin uso: la medida de la miniatura y los estilos `more` y `rowCard`.

### El semáforo pasa de Hoy a Yo (punto 12)
* **En Yo**, el gráfico de línea «Tu cumplimiento · últimos 7 días» (debajo de la tarjeta de fase) **se quita** (se borró
  `curvaDeEvolucion`), y en su lugar va **la tarjeta del semáforo tal cual estaba en Hoy** (`TarjetaSemaforoHoy`): «Tu semáforo · últimos 7
  días», el estado, el %, «5 de 7 días con datos», el mensaje del día con el búho (spec 006) y las siete barras. **En Hoy esa tarjeta
  desaparece.**
* **Mismas reglas que tenía en Hoy:** aparece solo si `/home` trae `semaforo` distinto de `null` (y la entrada `semaforo` no está apagada
  por Soporte TI); sin él no hay tarjeta y el gráfico viejo tampoco vuelve; las barras salen de `semaforo.dias` o de `/me/semaforo`
  (`useMiSemaforo` + `hayQuePedirMiSemaforo` + `diasParaLaTarjeta`); el mensaje sale como en la spec 006. **Sin pedidos de más:** Yo ya
  leía `/home` (`useResumenHome`); la lectura de `/me/semaforo` se movió de Hoy a Yo.
* **Tocarla abre el detalle** (`SemaforoScreen`) a pantalla completa desde Yo, con su flecha de volver y el atrás del sistema de vuelta a
  Yo (`enSemaforo`, como la Caja).
* **El aviso del sábado `/semaforo`** (`rutaDeAviso`, sin cambios) lo sigue recibiendo **Hoy**, que siempre está montada, y trae a Yo con
  el parámetro `abrirSemaforo`; Yo abre el detalle y lo olvida. Se eligió esto por ser lo más simple: Yo no siempre está montada cuando
  llega el aviso, Hoy sí (es el mismo camino de `abrirCaja` y `abrirMiRadar`).
* **El fénix de Hoy sigue recibiendo el color del semáforo:** Hoy sigue publicando el color de `/home` (`usePublicarSemaforoDeHoy(…, null)`, sin
  pedir nada), y Yo publica además el del detalle cuando lo lee. Lo demás del fénix (`useMantenerSemaforoVigente` al volver al frente y
  tras cumplir un hábito) no cambia.
* **No cambia** lo del mentor, el líder y Administración en Hoy («Mi grupo», «Mis mentores», el resumen por grupos y sus avisos): esto es solo
  la tarjeta del semáforo propio del aprendiz.

### Hoy: «Hábitos de hoy» y el Radar sin la línea de detalle (punto 13)
Textual del dueño: «desaparece la información no relevante en Hábitos de hoy, y en Mi Radar esa información no aporta».
* **En `TarjetaHabitoYRadar` se quita la línea de detalle de abajo de cada mitad.** Hábitos: «Te toca ahora · 11:00 · quedan 17 pendientes» y
  sus variantes. Radar: «Cinco preguntas, un minuto. Responde hasta las 13:00.» y las de los demás estados («Cierra a las…», «Se abre en
  2 min…», «La siguiente a las…», «05:30 a 22:30 · 17 veces», «Cada hora entre tu Despertar y tu Dormir…», «Toca para ver tu horario.»).
* **Quedan:** el ícono con el rótulo y su chevron, la línea de estado y el título de cada mitad (la cifra o el hábito de esta hora;
  «Código Renaser · 13:00 · Innegociable», «Registrado», «Próxima a las 20:00»…). Las dos mitades siguen alineadas a la izquierda y arriba,
  con el mismo alto mínimo de 48 y sin renglón vacío abajo.
* **Lo que hace cada mitad al tocarla no cambia**; la hoja «Tu Radar de hoy» (sigue diciendo el horario y las veces), la hoja de lo
  respondido (`siguiente`) y Training conservan su detalle. `MitadDelRadar` ya no tiene `detalle`, y `DatosDeLaMitadDeHabitos` tampoco.
* **La lectura de pantalla queda con lo que se ve:** `etiquetaDeLaMitad` dice el rótulo, la hora, el estado y el título («Código Renaser
  13:00, Registrado»). Pruebas: `mitadDelRadar` y `tarjetaHabitoYRadar` (que el detalle no aparece ni en pantalla ni en voz).

### La fuente de toda la app: Inter, en un solo archivo (punto 9)
Pedido del dueño: SF Pro. **Su licencia no permite usarla en Android, así que el dueño eligió Inter.** Y una regla de él: la fuente tiene que
ser **global, como un CSS global**.
* **Inter reemplaza a Jost (texto) y a Fraunces (display) en toda la app.** Paquete: `@expo-google-fonts/inter@0.4.2` (se fue
  `@expo-google-fonts/jost` y `@expo-google-fonts/fraunces`). **Revisado antes de instalar** (`npm view` y el tarball, sin instalarlo):
  autor `Expo Team <team@expo.io>`; repositorio `github.com/expo/google-fonts` (`font-packages/inter`); mantenedores `brentvatne`,
  `ccheever`, `kadikraman`, `jake7`; licencia MIT y OFL-1.1; **sin `preinstall`, `install` ni `postinstall`** (el `package.json` solo tiene
  `name`, `version`, `main`, `repository`, `author`, `license`); **sin dependencias**; el código son 18 `index.js` de una línea cada uno (un
  `require` del `.ttf`) y `useFonts.js` (un `loadAsync` de `expo-font`); ningún `fetch`, `eval`, `child_process`, `process.env`, `atob` ni red;
  el `integrity` del `package-lock.json` coincide con el del tarball revisado. Se instaló con `--ignore-scripts`.
* **Qué trae y qué no:** las 9 pesas estáticas con el corte óptico de texto; **no trae «Inter Display»** (el corte óptico grande). Por eso
  los títulos grandes (`t.hero`, `t.screenTitle`) usan la **Bold** y ganan el aire de display con el espaciado negativo que ya tenían. Si
  algún día se suma un corte Display, es cambiar un nombre en `fuentes.ts`. Se cargan cuatro pesas (400, 500, 600 y 700), no las 18.
* **Un solo archivo: `src/theme/fuentes.ts`.** Exporta **roles**, no nombres de archivo: `fuentes.regular` (400), `fuentes.media` (500),
  `fuentes.seminegrita` (600), `fuentes.negrita` (700) y `fuentes.display` (hoy la 700), y `FUENTES_A_CARGAR` (los cuatro `.ttf` que
  `App.tsx` le pasa a `useFonts`). **Ningún otro archivo de `src/` escribe un nombre de fuente**: piden el rol o usan los tokens `t.*`
  (`hero` y `screenTitle` → `display`; `cardTitle` → `seminegrita`; `body` y `small` → `regular`; `micro`, `metric`, `tab` → `media`).
  `src/theme/__tests__/fuenteUnica.test.ts` falla si un archivo de `src/` o `App.tsx` escribe `Inter_…`, `Jost_…` o `Fraunces_…`, o un
  `fontFamily` con un texto. **Cambiar la fuente de toda la app es tocar ese archivo.** Equivalencias para leer lo anterior: donde este
  documento dice `Jost_400Regular`, `Jost_500Medium` o `Jost_700Bold`, hoy es `fuentes.regular`, `.media` o `.negrita`; donde dice
  `Fraunces_600SemiBold` o `Fraunces_700Bold`, `fuentes.display`.
* **Más ancha que Jost:** Inter mide 6 a 14 % más en texto corrido (medido con las pesas reales: «Comunidad» 1,08×, «Relaciones» 1,11×,
  títulos de hábito 1,11×); las cifras, ±2 % (siguen tabulares). Los títulos display miden lo mismo que con Fraunces (±5 %). Se revisaron los
  lugares con ancho justo: la barra de pestañas (cabe: «Comunidad» a 11 px mide ~60 en un cuarto de 72), los chips de los días (la hora
  mide igual), la columna de la hora de Training (46), la tarjeta de fase de Yo (`medidasDeLaTarjetaDeFase` reserva por ancho, no por
  fuente; el nombre de fase mide igual que con Fraunces) y los segmentados: `ControlSegmentado` con `achicarTexto` (el de cuatro
  opciones del Ranking y el selector de eje de Plan, que lleva ícono) pasa a relleno lateral de 4 y a achicarse hasta el 80 % en vez del 85 %.
  **Sin emulador en esta corrida:** el aspecto en pantalla se confirma con las capturas en claro y oscuro.
* **No se tocó** `public/privacidad` ni `public/eliminar-cuenta` (páginas web estáticas con su propia fuente de Google Fonts, no son la app).

### Yo: el récord de racha bajo la Racha (punto 14)
* Debajo de la **Racha** de Yo va una línea chica, «**Récord: 3 días**» (o «Récord: 1 día»), con `rachaMaxima` de `/home`, lo mismo que Hoy
  mostraba como «Récord histórico» antes de quitarse (punto 2). **Sin dato** (`/home` caído o sin el campo) **no se dibuja** (un récord
  de 0 sí se dice: «Récord: 0 días»). 13 px, el gris secundario (`textSoft`) y `tabular-nums`. El texto sale de `home/utils/textoDelRecord`.

### Los nombres de los hábitos en tipo oración en TODA la app (punto 15)
El dueño pidió que lo del punto 6 no sea solo de Training. Se usa la misma `habits/utils/tituloEnTipoOracion` (o `tituloParaMostrar`, que
respeta el nombre propio) **en el punto donde se pinta el nombre**:
* **Hoy:** la tarjeta «Hábitos de hoy» (el hábito de esta hora) y lo que oye el lector de pantalla.
* **SER:** la tarjeta y la hoja del pedido de foto del acompañante (`tituloDelPedido`: el hábito en tipo oración; una **acción del día** —`destino:
  'roca'— la escribió la persona y no se toca) y el título del registro con foto que abre.
* **Yo:** «+ Subir foto» (el elegir hábito y el título del registro). «Mis evidencias» no nombra hábitos.
* **Fichas:** del mentor o la guía (los 7 días, la rejilla semanal, el visor de evidencia y de publicación), del líder (`DiaDeLaPersona` y lo que dice el
  lector, `dichoDeLaObligacion`) y de Administración («Detalle de hábitos»).
* **Tiempo libre de la ficha:** los bloques de HÁBITO de la agenda del día (`nombreDelBloque`); las acciones, los eventos y la agenda personal, tal cual.
* **«Mi agenda»** (Comunidad → Eventos), el selector de hora y el aviso de cambiar el nombre de una bebida.
* **No nombran hábitos** y no se tocaron: el semáforo, el cierre, el Radar y «Mis evidencias».
* **No cambia** lo que se guarda, lo que se manda al servidor ni **el texto de las alarmas**; los esquemas de lo que llega no transforman el título.
  Prueba: `tituloEnTodaLaApp.test.ts` (dónde se usa, la lógica pura y lo que no cambia).

### Los paneles de rol viven en Yo; Hoy es solo el programa propio (punto 16)
Textual: «¿qué fue eso? Debe ir dentro de Administración, lo mismo de cada uno, no en Hoy de cada rol; se ve feo, respeta pues». Deshace
la spec 018 en Hoy (el control «Mi programa · Mi grupo · Mis mentores») y las tarjetas de rol que Hoy tenía desde septiembre. Lo que
cambia y nada más:
* **Hoy es SOLO el programa propio de la persona, para todos los roles.** Se quitaron: el control de papel (`ControlDePapelDeHoy`,
  `usePapelDeHoy`, `papelesDeHoy`, `papelRecordado` y la memoria `renaser.hoy.papel.<id>`), «Mi grupo» y «Mis mentores» como listas de Hoy
  (`MiGrupoEnHoy`, `MisMentoresEnHoy`), las tarjetas de rol (`TarjetaMentorHoy`, `TarjetaAdminHoy`), las pantallas de rol que Hoy abría como
  estado propio (grupo, ficha del aprendiz, tickets, mentores, todos los aprendices, resumen del líder, Administración) y **todas sus
  escuchas de avisos** y de `abrirCajaAprendizId` / `abrirFichaAprendiz`. La raya dorada ya no depende de ningún papel y nada queda
  «oculto pero montado». **Se conserva** la invitación «Elegir mi Día 1» para el personal que no hace su programa
  (`EntradaAlProgramaPropio`) y el color del semáforo que recibe el fénix (`usePublicarSemaforoDeHoy(resumen?.semaforo, …, null)`).
  > **Corregido 2026-11-01.** Esa invitación ya no es la tarjeta grande `EntradaAlProgramaPropio` bajo el fénix: en Hoy es una fila compacta
  > (`FilaDelProgramaPropio`) justo debajo de la frase. La tarjeta grande se conserva solo en Yo.
* **Yo suma una fila por panel de rol, con la misma forma que «Administración»** (`FilaDeAjuste`, en la misma lista, entre
  «Administración» y «Tuve una emergencia»): **«Mi grupo»** (ícono `users`, «Tus aprendices») y **«Mis mentores»** (ícono `award`,
  «Grupos, consultas y reporte del mes»; no `usersThree`, que es el de la pestaña Comunidad y `barraDePestanasIconos.test.ts` no deja usar en otra parte). **Las reglas de quién las ve son las de siempre, sin inventar ninguna** (`paneles-de-rol/utils/
  filasDeRol`, pura): «Mi grupo» para el mentor o la guía que acompaña un grupo (un mentor sin grupo la conserva, todavía no se lo
  asignaron; el líder solo si de verdad acompaña uno, y no antes de saberlo, para no dibujarla un instante), con la entrada `mentor.mi_grupo`
  prendida; «Mis mentores» solo para el líder de mentores y con alguna de sus tres entradas (`lider`, `tickets`, `semaforo`) prendida;
  «Administración» no cambia (`canAdminister`). **El aprendiz no ve ninguna** y su Yo queda como estaba.
* **Cada fila abre una pantalla completa de Yo** (como la Caja y Administración; `PantallaDelPanelDeRol`): «Mi grupo» abre `MiCelulaScreen`
  con la cabecera «‹ Mi grupo» (prop nueva y opcional `rotuloDeVolver`, por defecto «Volver»); «Mis mentores» abre `MisMentoresEnYo`, con
  la cabecera «‹ Mis mentores» y el contenido de la spec 018 (`ListaDeMisMentores`): Resultado por grupo, Consultas de mentores, Mentores y
  reporte del mes y Todos los aprendices. **El atrás (la flecha y el del sistema) sube un nivel por vez hasta Yo**
  (`vistaDeRegreso`): ficha → «Mi grupo» → Yo; consultas / mentores / todos / resultado de un grupo → «Mis mentores» → Yo. Una fila de grupo
  sigue abriendo la pantalla del líder directo en ese grupo. Lo que Hoy mostraba como lista de aprendices con su % en «Mi grupo» lo muestra
  ahora `MiCelulaScreen`, que ya listaba a los aprendices con su semáforo (es la pantalla del grupo que pidió el dueño).
* **Los avisos del teléfono que abrían esas vistas desde Hoy abren lo mismo, ahora desde Yo** (`navigation/abrirAviso.ts` los lleva a Yo
  con un parámetro; `usePanelesDeRol` y `YoScreen` los consumen una sola vez y limpian la ruta, para que volver no los reabra):
  | Aviso | Ruta | Abre |
  |---|---|---|
  | Resumen del sábado del mentor / revisión del líder | `/mentor/groups/{g}/semaforo` | Yo → «Mi grupo» con la sección del semáforo a la vista (de otro de sus grupos: pasa a ese grupo) |
  | Un aprendiz del grupo | `/mentor/groups/{g}/learners/{a}` | Yo → «Mi grupo» → la ficha de ese aprendiz (si ya no está en el padrón, abre el grupo y nada más) |
  | Resumen por grupos del sábado | `/semaforo/grupos` | Líder: Yo → «Mis mentores» → resultado por grupo. Administración y Alquimista: Yo → Administración → Semáforo |
  | Semáforo propio del sábado | `/semaforo` | Yo → el detalle de su semáforo |
  | Caja de un aprendiz | `/admin/caja/{id}` | Yo → Administración → Caja Renaser → esa caja (solo si la cuenta administra) |
  | «Ver ficha» desde la info de un chat | `abrirFichaAprendiz` | Yo → Administración → la ficha (Comunidad ahora navega a Yo, no a Hoy) |
  Como antes, los de rol **no esperan** a las capas obligatorias (el de la caja del Admin sí) y quien no puede abrirlos (otro rol, sin
  grupo, sin permiso) no ve nada: el aviso se descarta. No hay una ruta de aviso de tickets en la app: no había nada que mover.
* **Dónde vive el código:** `features/paneles-de-rol/` (la carpeta `hoy-por-papel` renombrada): `utils/filasDeRol`, `vistasDeLosPaneles`,
  `avisosDeLosPaneles` (puras), `hooks/usePanelesDeRol` (UNA lectura de su grupo, UNA del resumen por grupos del líder, la vista abierta y
  el aviso pendiente; solo pide lo que le toca a la cuenta), `screens/PantallaDelPanelDeRol` y `MisMentoresEnYo`, `components/ListaDeMisMentores`
  y `FilaDeLista`. **Donde esta guía dice «Administración (estado de `Hoy`)» o «Hoy → Administración», léase Yo → Administración.**
* **No cambian:** las pantallas de rol por dentro (`MiCelulaScreen`, `AlumnoScreen`, bandeja de tickets, mentores, todos los aprendices,
  resumen del líder, Administración y su raíz, incluido su botón «Mi programa», que ahora sale a Yo), los permisos (los decide el servidor),
  las entradas de Soporte TI, «Mi grupo» de Comunidad → Tribu, los demás tabs ni la barra. Sin animaciones, íconos ni dependencias nuevas.
* **Pruebas:** Jest `filasDeRol` (el líder ve «Mis mentores»; el mentor y la guía, «Mi grupo»; el aprendiz, ninguna; el líder espera al grupo y
  la esconde con `sin_celula`; las tres entradas de Soporte TI), `vistasDeLosPaneles` (el atrás un nivel por vez), `avisosDeLosPaneles`
  (parámetros, ficha, otro grupo, padrón que falta, resumen general), `panelesDeRol` (las filas montadas de «Mis mentores»),
  `panelesDeRolEnYo` (Hoy sin control ni tarjetas ni escuchas; Yo con las filas y el panel; el hook; la pantalla) y `abrirAviso` /
  `avisosDeLaCaja` (cada aviso lleva a Yo con su parámetro, sin esperar a las capas los de rol). Se actualizaron `semaforoEnYo`, `cajaEnLaApp`,
  `loNoDisponible` e `infoDelChatIntegrantes`. Maestro, escrito y sin correr: `.maestro/diseno-31/06-roles-en-yo.yaml`; los flujos que
  entraban a Administración, «Mis mentores» o «Todos los aprendices» desde Hoy (`regresion/20–24`, `mi-radar/11–12`, `15`, `lider-ve-a-todos/01`)
  y el `abrirAdministracion` de `e2e/admin-alquimista` entran ahora por Yo (sin correr).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

### Ajustes tras el E2E del rediseño (puntos 17 a 21)
Cinco arreglos visuales que salieron de las capturas del E2E del 31/10 (`e2e-rediseno/`). Todo es de la app, solo JavaScript, sin backend, sin
animaciones, íconos ni dependencias nuevas. Cada punto es un commit aparte de la rama `app-31-rediseno-y-moderacion`.
* **17. Login: «¿Olvidaste tu contraseña?» ya no queda bajo el botón.** La cabecera mide ~54 % de la pantalla y lo de debajo (título, dos campos
  y el enlace) más el pie fijo (botón, «Solicitar acceso», privacidad) pasaban de lo que se ve en un teléfono de 360 × 780 o en el Pixel 6: el
  enlace quedaba en el borde de abajo del scroll, tapado por el fundido sobre el pie. Ahora la cabecera **cede alto** lo justo para que el
  formulario quepa sin desplazar con el teclado cerrado (`topeDeAltoParaElFormulario` en `auth/utils/cabeceraDelIngreso`; `CabeceraDelIngreso`
  recibe `altoMaximo`): `alto ≤ lo que se ve del scroll − lo que mide el cuerpo − 16 de aire + 36 de solape`, con un mínimo de 176 (cabeza y
  alas; la cola ya se funde). Se mide lo real (`onLayout` del scroll, el mayor alto visto con el pie y sin teclado, y del cuerpo sin avisos de
  error), así que también sirve con la letra grande del sistema; el teclado nunca la cambia (con teclado, el campo se lleva a la vista como
  antes). Sin medidas todavía la cabecera es la de siempre (la primera pasada no se ve: la imagen entra con su fundido). El enlace mide 48 de
  alto táctil (era 44). **No cambia** el diseño aprobado del 2026-10-05: mismos textos, orden, degradado y animaciones; solo el fénix se ve algo
  más corto en teléfonos que no entraban (según la cuenta con las medidas de diseño: ~37 dp en el Pixel 6 y ~90 en 360 × 780; a confirmar en pantalla).
* **18. Training: el título de una línea se centra en la fila.** Quedaba ~7 dp más arriba que la hora y que el botón o el círculo. La cuenta
  lo explica: el área del nombre mide 48 como mínimo con 6 de relleno (36 útiles) y el texto 22, y (36 − 22) / 2 = 7; con dos líneas (44) no
  sobraba nada y se veía centrado. La caja del título (`TituloQueSeTacha`) llevaba `flex: 1` dentro de una columna, crecía hacia abajo y dejaba
  el texto en su borde de arriba. Ahora mide lo que mide el texto (`flexShrink: 1`) y la columna del nombre (`FilaDelDia`) centra lo que tiene. Por
  qué NO se tocó el `lineHeight` de `theme/fuentes.ts` ni de los tokens: no es la métrica de Inter, y cambiarlo habría movido todas las pantallas.
  Hallazgo hecho por geometría y pruebas, **sin emulador**: falta confirmarlo en pantalla.
* **19. Pantallas del líder, una sola cabecera.** «Mentores y reporte del mes», «Todos los aprendices», «Reporte del mes», la ficha del mentor,
  la lista y la ficha de la persona, y «Semáforo por grupos» llevaban «← VOLVER» en versalitas (`BarraDelLider`, y una copia en
  `SemaforoGruposScreen`); «Mis mentores» llevaba «‹ Título». Ahora todas usan `CabeceraAdmin` («‹ Título», botón «Volver» de 48, el mismo
  atrás): `BarraDelLider` es un envoltorio de ella y `SemaforoGruposScreen` la usa directo. El atrás del sistema no cambia.
* **20. Plan: la línea del objetivo.** «Inicio 10000 · Actual 14000 · Meta 30000 S/» se partía en «Meta / 30000 S/» y la barra quedaba pegada.
  `lineaDelObjetivo` usa `formatearNumero` (el formato de la app para cifras: miles con espacio duro, «30 000»; la coma y el punto ya significan
  decimal en el Mapa) y une etiqueta, cifra y unidad con espacios duros («Meta 30 000 S/»): si el renglón se parte, es entre partes, en el « · ».
  La barra sube a 12 de aire. El texto del objetivo (lo escribe la persona) no se toca.
* **21. Plan: «Recordatorios de tus acciones ›» es una fila que abre una hoja.** El bloque con la fila de días, el interruptor, «Aviso antes de
  cada acción» y «Cómo suena» dentro de «Acciones que mueven la meta» empujaba «Tu 80/20» y «Organizar mi semana ›» unas tres pantallas más
  abajo. Ahora es una fila de 56 con la campana, el título y, en una línea, el estado guardado en este teléfono («Todos los días a las 08:00 ·
  aviso 10 min antes», «Sin recordatorio diario · avisos 30 y 10 min antes y a la hora», «Apagados en este teléfono», «… según el día» si los
  días no coinciden; `notificaciones/resumenDelRecordatorio`, puro), que abre una `HojaDesdeAbajo` grande con el MISMO `RecordatorioDeAcciones`
  de siempre, sin tocar su lógica (`components/RecordatoriosDeLasAcciones`). La fila lee lo guardado al montar y al cerrar la hoja; sin lectura
  dice «Recordatorio diario y aviso de cada acción». Con la semana sin armar o sin alarmas locales (web, Expo Go), no se dibuja, como antes.
  **Las alarmas no dependen de la hoja:** el control ponía al día las alarmas de cada acción cuando Plan le pasaba la lista nueva; con él dentro
  de una hoja cerrada eso habría dejado de correr. Salió a `useAlarmasAlDiaConLasAcciones`, que la fila monta siempre; el control suma la prop
  `sincronizarConLaLista` (por defecto `true`, así Yo → Alarmas no cambia) y la hoja de Plan lo apaga para no hacerlo dos veces.
* **Pruebas:** Jest `cabeceraDelIngreso` (el tope por tamaño de pantalla y letra, el mínimo, sin medidas), `loginConCabecera` (48 de alto táctil y
  el tope tras medir), `alineacionDeLaFila`, `cabeceraDeLasPantallasDelLider`, `planPrincipal` (`lineaDelObjetivo`), `resumenDelRecordatorio`,
  `recordatoriosDeLasAcciones` (la fila, la hoja con el mismo control, las alarmas con la hoja cerrada) y `planDelEje`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Corrección — 2026-11-02 — el selector de hora sin huecos y con las 24 horas a la vista (issue #97)

Del E2E del 2/11 («Yo → Ajustes → Alarmas → Recordatorios de pago → Cambiar la hora»). El selector `HoraPickerModal` ocupaba toda la pantalla y dejaba
~500 px en blanco entre «HORA» y «MINUTOS» y hasta el botón; además la fila de horas solo mostraba de 00 a 05 (para elegir las 11 había que arrastrarla de
lado). **También estaba en `master`**: el archivo es idéntico y lo usan Despertar de Yo → Alarmas, los recordatorios de las acciones y el formulario de
eventos (el de pagos es de la rama de formaciones). Lo que cambia y nada más:
* **Causa:** los dos `ScrollView horizontal` (una fila de horas y otra de minutos) llevan `flexGrow: 1` por defecto, y en React Native una caja de alto
  automático con hijos con `flexGrow` los estira hasta lo que tenga disponible el contenedor: dentro de la tarjeta centrada de un `Modal`, los dos carriles
  se llevaban el alto de la pantalla. (Es la misma razón por la que los otros carriles horizontales de la app, el de meses de `PlanDelMesModal` y el de
  íconos de Planificar, llevan `flexGrow: 0`.) **No se reprodujo en el emulador** (estaba ocupado por el E2E): la causa se deduce de la regla de React
  Native y de esos precedentes, y se confirma en pantalla al correr el flujo de Maestro.
* **El selector ahora es una `HojaDesdeAbajo` del alto de su contenido** (la forma del selector de fecha de nacimiento y de las demás hojas de la app), no una
  tarjeta centrada con `VeloModal`. De arriba abajo: la agarradera, «Elegir hora» y debajo, en una línea, el nombre de lo que se está programando; la hora
  elegida en grande («09:00», «de la mañana»); «Hora» con **las 24 horas en una grilla de 4 renglones de 6**; «Minutos» con **los 12 minutos en 2 renglones de
  6**; y, fijo abajo, «✓ Guardar hora». Todo seguido y con el aire normal (16 entre bloques, 8 bajo cada rótulo, 6 entre botones). **Ningún carril se arrastra de
  lado.** Cada botón mide 48 de alto y reparte el ancho parejo (≈ 48 dp en un teléfono de 320 dp de ancho, ≈ 57 en uno de 411). Se cierra con la ✕, tocando
  fuera, arrastrando la hoja o con el atrás de Android (lo de siempre de `HojaDesdeAbajo`).
* **Por qué una grilla y no la rueda de Planificar** (`RuedaHoraPicker`): esa rueda tiene otras reglas —minutos de 1 en 1 y un tope de arranque a las 23:40
  (D-122, solo de los hábitos)—, así que usarla aquí cambiaría lo que el selector puede devolver a eventos, pagos y acciones; y para llegar a una hora hay que
  desplazar la rueda, mientras la grilla muestra las 24 a la vez. La grilla es lo que ya era este selector (botones grandes para un público de 40+), sin el defecto.
* **Un solo scroll, por si no entra:** el cuerpo va en un `ScrollView` vertical con `flexGrow: 0` y tope de alto (`useAltoMaximoDelCuerpo`), para que el botón
  quede siempre a la vista en una pantalla baja o con la letra del sistema grande. En un teléfono normal no desplaza nada.
* **Elegir no se anima** (se toca decenas de veces): el cambio de color es en el acto, el botón se hunde al apretar (`Presionable`, 0,97) y vibra el «tic» de
  selección una vez por cambio (`tacto.seleccion()`; no vibra si se toca lo ya elegido). Cada botón se anuncia al lector de pantalla como «11 horas» o «35 minutos»,
  con estado elegido.
* **No cambia lo que devuelve ni sus props** (`visible`, `tituloHabito`, `horaInicial`, `onConfirmar`, `onCerrar`): `HH:mm`, horas de 00 a 23 y minutos de 5 en
  5; parte de la hora que se le pasa (el minuto llevado al múltiplo de 5 más cercano) cada vez que se abre. Las cuatro pantallas que lo usan no se tocaron.
* **Textos:** el título «ELEGIR HORA» pasó a «Elegir hora» (tipo oración, como las demás hojas), los rótulos «HORA» y «MINUTOS» a «Hora» y «Minutos», y se fue el
  «Cerrar» de texto: la ✕ de la hoja tiene el mismo nombre accesible («Cerrar el selector de hora»). El botón dice «Guardar hora» (tipo oración, 16 px, sin espaciar; era «GUARDAR HORA» en versales, el estilo por defecto de `GoldButton`).
* **Pruebas:** Jest `horaDelSelector` (la lógica pura: las 24 horas en 4 renglones de 6, los 12 minutos en 2, `HH:mm`, de qué hora parte) y `horaPickerModal`
  (ningún `ScrollView` horizontal ni que crezca, los 24 + 12 botones, se llega a 00:00, 11:35 y 23:55, lo devuelto, un «tic» por cambio y que al reabrir parte de la
  hora nueva). Maestro `.maestro/pagos/09-…` actualizado (toca «14 horas» y «35 minutos» por su etiqueta); **sigue escrito y sin correr**.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Decisión del dueño — 2026-11-02 — los botones dorados en tipo oración y sin espaciado, en toda la app

Conviven dos estilos de `GoldButton`: el nuevo («Empezar ahora ›», «Elegir mi Día 1», «Guardar hora»: 16 px, sin espaciado) y el viejo, el que el
componente traía por defecto: versales de 11 px con `letterSpacing` 2,2 (1,6 en el contorno), con el texto escrito en MAYÚSCULAS («LISTO»,
«CONFIRMAR MI DÍA 1», «CONTINUAR A TÉRMINOS»). El dueño eligió **unificar todos al estilo nuevo**. Solo JavaScript, sin backend. Lo que cambia y nada más:
* **`GoldButton` trae el estilo nuevo por defecto** (`src/components/GoldButton.tsx`), en sus tres variantes (primario, contorno y secundario): tipo
  oración, **16 px y `letterSpacing: 0`**; la pesa no cambia (negrita en el primario, media en el contorno y el secundario, siempre por los roles de
  `theme/fuentes.ts`). Sale `t.micro` y el espaciado; se suman `flexShrink: 1` y `textAlign: 'center'`, para que un texto largo baje de renglón dentro
  del botón en vez de salirse de él en 360 dp (por ejemplo «Continuar al siguiente módulo» en el cuestionario). Es la regla global: se cambia en ese
  único lugar. Los `textStyle` que ya pasaban 16 px y `letterSpacing: 0` quedan como estaban (ahora repiten el valor por defecto); los de 15 px siguen en 15.
* **Los textos escritos en MAYÚSCULAS pasan a tipo oración** (antes → después): «LISTO» → «Listo» (selector de fecha y fecha del diagnóstico),
  «REINTENTAR» → «Reintentar» (diagnóstico, bandeja de tickets, «Mis evidencias» de Yo y registro con foto), «EMPEZAR» → «Empezar», «SIGUIENTE» → «Siguiente»,
  «TERMINAR» → «Terminar», «CERRAR VISTA PREVIA» → «Cerrar vista previa» y «Continuar» (ya no pasa por `toUpperCase()`) en el diagnóstico;
  «REGISTRANDO…», «REGISTRAR» y «TERMINAR» → «Registrando…», «Registrar» y «Terminar» (registro con foto); en el onboarding, «CONFIRMAR MI DÍA 1» →
  «Confirmar mi Día 1», «COMENZAR MI VIAJE» → «Comenzar mi viaje», «ANTERIOR», «GUARDANDO…», «CONTINUAR» y «CONTINUAR AL SIGUIENTE MÓDULO» del cuestionario →
  «Anterior», «Guardando…», «Continuar» y «Continuar al siguiente módulo», «CONTINUAR A TÉRMINOS» / «SIGUIENTE» de la ficha → «Continuar a términos» /
  «Siguiente», «ENTRAR A MI DÍA 01 (HOY)» → «Entrar a mi Día 1 (hoy)», «CONTINUAR» de Términos → «Continuar» y «ACEPTAR» de Términos actualizados → «Aceptar»;
  «TOMAR FOTO» de la tarjeta de SER → «Tomar foto»; y «💬 ENVIAR MENSAJE DIRECTO 1 A 1» de la ficha de un integrante → «Enviar mensaje directo»,
  **sin emoji** (los emojis no son íconos): lleva `messageCircle` a la izquierda. «Cancelar» de la pantalla de registro con foto (un botón de borde que
  iba justo debajo del dorado) pasó de «CANCELAR» a «Cancelar», 16 px, para que los dos no se contradigan. «Día 1» lleva la D mayúscula.
* **Pruebas:** `goldButtonTipoOracion` (las tres variantes, en claro y oscuro: 16 px, sin espaciado, sin versales, con la pesa de su rol) y
  `botonesDoradosSinMayusculas` (barre cada `<GoldButton>` de `src/` y `App.tsx`: falla si el texto literal de su `label` vuelve a las mayúsculas, si
  alguien lo pasa por `toUpperCase()` o le pide `textTransform` o un espaciado positivo; las siglas —OK, SER, IA…— se permiten). Se ajustaron las pruebas
  Jest y los flujos de Maestro que buscaban el texto viejo (`ficha-con-diagnostico`, `pagos/01` y `03`, `regresion/01`, `12` y `13`,
  `terminos-editables/02` y `04`, `hoy-programa-propio/01`, `mi-radar/16`) y el de Playwright `e2e/dia-uno`.
* **Queda fuera, a la vista:** lo que no es un `GoldButton`: los botones de los diálogos del sistema (`components/Alerta`, que escriben su texto en
  versales con `toUpperCase()`), enlaces como «VER EVENTO ›» y los rótulos de campo en mayúsculas del cuestionario y de Administración. Y el «✓ GUARDAR
  HORA» del selector de hora, que reescribe la rama `hora-picker-compacto` (#97) para que diga «Guardar hora»: la prueba lo deja exento hasta que se
  fusione (`PENDIENTES_EN_OTRA_RAMA`) y el flujo `pagos/09` sigue con su texto de ahora.
* **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se actualiza por aire). Backend nuevo, ninguno.

## Cambio de infraestructura — 2026-11-02 — CI de seguridad y alertas de Dependabot del frontend

Del barrido de seguridad del 02/11: el repositorio es público, tenía **27 alertas abiertas de Dependabot** (1 crítica, 13 altas, 9 medias y 4 bajas) y ningún
chequeo de seguridad en el CI. Sin cambios de diseño, textos, tabs ni código de `src/`. Lo que cambia y nada más:
* **Dependencias** (`package.json` y `package-lock.json`): `zod` `^4.5.4` → `^4.6.7` (directa, alta: agota memoria con arreglos grandes) y
  `@playwright/test` `^1.49.1` → `^1.55.1` (desarrollo, alta: bajaba navegadores sin verificar). El lock sube además `node-forge` 1.4.0 → 1.4.2
  (12 alertas), `shell-quote` 1.10.0 → 1.12.0 (la crítica), `brace-expansion`, `compression`, `source-map-js` y `@react-navigation/core`
  7.21.13 → 7.24.0 (con eso sale `query-string` y su `decode-uri-component`, dos alertas más). Ninguna otra versión directa cambia. Ninguno de los
  15 paquetes que cambian trae scripts de instalación; `zod@4.6.7` está publicado con procedencia (SLSA) desde GitHub Actions.
* **Después de fusionar quedan 4 alertas abiertas, a propósito**: `uuid` 7.0.3 (#2), `deepmerge` (#17, sin versión corregida), `glob` 13.0.6 (#30) y `minimatch`
  10.2.6 (#31). Las cuatro cuelgan de la herramienta de compilación de Expo y de Jest (`@expo/cli`, `@expo/config-plugins`, `xcode`,
  `jest-config`), no entran en el paquete de la app, y arreglarlas exige saltos mayores (`glob` 14, `minimatch` 11, `uuid` 11) que las versiones
  de Expo y Jest que usamos no aceptan; `npm audit fix --force` propone *bajar* Expo a la 51. Se vuelven a mirar al subir de SDK. Si
  Dependabot mantiene abierta la de `zod` por la copia 3.25.76 que trae `@expo/cli`, es un falso positivo: el código vulnerable (`$ZodArray`) es
  de la línea 4.
* **`.github/workflows/seguridad.yml`** (nuevo, aparte de `ci.yml`): corre en cada PR, en `master` y **cada lunes** (una dependencia puede
  volverse vulnerable sin que nadie toque el repo). Tres jobs: **gitleaks** (secretos en todo el historial, con `--redact` porque el registro
  es público), **trivy** (dependencias de `package-lock.json`, incluidas las de desarrollo: frena con severidad ALTA o CRÍTICA que ya tenga
  arreglo; lo medio y lo bajo solo se imprime) y **CodeQL** (JavaScript/TypeScript; no frena, sube a Security → Code scanning). Gitleaks y trivy se
  bajan como binarios con versión y SHA-256 fijos en el workflow (ninguna acción de terceros); para subir de versión se cambian los dos valores
  juntos.
* **`.trivyignore.yaml`** (nuevo, vacío): las excepciones con motivo y fecha de vencimiento. Va pasado con `--ignorefile` porque la versión que
  fijamos no lo busca sola.
* **`.github/dependabot.yml`** (nuevo): PR semanal de menores y parches (los saltos mayores, aparte) para npm y para las acciones de los
  workflows. **No toca lo que Expo fija por SDK** (`expo*`, `@expo/*`, `react`, `react-native*`, `@react-native/*`, Skia, Rive, `jest-expo`,
  `typescript`…): se mueve junto, a mano, al subir de SDK.
* **Comprobado sin `node_modules`**: el lock se regenera idéntico con `npm install --package-lock-only`; `trivy` da
  14 altas/críticas con el lock anterior (sale con 1) y 0 con el nuevo (sale con 0); `gitleaks` limpia sobre 922 commits y falla ante un secreto
  de prueba. **Falta** `npm ci`, `npm run typecheck` y `npm test -- --ci` con `node_modules` (zod 4.5 → 4.6 y `@react-navigation/core` 7.21 → 7.24 son
  código de la app), y que el workflow corra una vez en GitHub.
* **Hace falta un APK nuevo** para que `zod` y `@react-navigation/core` lleguen a los teléfonos (solo JavaScript: ni `app.json` ni código nativo; la
  app no se actualiza por aire). Backend nuevo, ninguno.

## Cambio por pedido del dueño — 2026-11-03 — textos más compactos en Eventos y Hoy, y un tope a la letra del sistema

Textual, con capturas de un teléfono real: «Redúcele el tamaño de texto, es muy grande» (Comunidad → Eventos) e «igual aquí es muy grande» (Hoy → la tarjeta de acciones,
en «Hoy no tienes acciones agendadas»). Solo JavaScript y solo tamaños (más dos textos que el dueño pidió cambiar al final, abajo): ningún flujo ni dato cambia. Lo que cambia y nada más:
* **Causa de fondo: la letra del sistema no tenía tope.** React Native aplica el tamaño de letra del sistema (Android llega al 200 %) a todo `Text` y `TextInput`, y solo unos
  pocos lugares pedían su propio `maxFontSizeMultiplier` (los chips de días de Planificar, la rueda de «Otra»). En el teléfono del dueño todo crecía sin límite. Ahora hay un
  **tope global de 1,2** (`theme/topeDeLetra.ts`, `TOPE_DE_LETRA`): con la letra del sistema al 130 %, 150 % o 200 % la app crece como mucho un 20 %; al 100 % o al 110 % nada cambia.
  La accesibilidad se respeta (la letra sigue agrandándose hasta ahí) pero nada se desborda. **Cómo se aplica, en un solo lugar:** `aplicarTopeDeLetra()` envuelve `Text` y
  `TextInput` en la propia exportación de `react-native` y lo llama `theme/topeDeLetraGlobal`, lo PRIMERO que carga `index.ts` (antes que `expo` y `App`, para que lo que guarda `Text`
  al cargar —p. ej. `Animated.createAnimatedComponent(TextInput)`— ya lo reciba con el tope). Se eligió esto y no `App.tsx` ni un componente `Texto`: en React Native 0.86 con React 19
  `Text.defaultProps` ya no se lee, y cambiar los cientos de `import { Text } from 'react-native'` por un componente propio no cubría lo que ya existe. Los envoltorios solo suman la
  prop (`ref`, `style`, `onPress` y `TextInput.State` pasan tal cual). **Lo que cada lugar pide gana:** un `maxFontSizeMultiplier` propio o `allowFontScaling={false}` se comportan como
  antes. **En web no se hace nada** (`react-native-web` no usa la prop). Las pruebas de Jest no lo aplican (usan el `Text` de siempre).
* **No choca con lo que ya usaba `fontScale`.** Las cuentas de espacio que seguían a `fontScale` pasan por `escalaDeLetra(fontScale)` (entre 1 y el tope), para no reservar sitio que la
  letra ya no puede ocupar: la columna de la hora de Training (`FilaDelDia`, antes hasta 1,5), la línea de tiempo del tiempo libre (`LineaDeTiempoDelDia`, antes hasta 1,6) y la tarjeta
  de fase de Yo (`TarjetaDeFase`, antes sin tope). El apilado de las mitades de «Hábitos de hoy» y el Radar (`fontScale > 1,15`) no cambia: con el tope sigue valiendo para toda letra
  de 1,16 en adelante. `medidasDeLaTarjetaDeFase` sigue siendo una función pura de `fontScale`; el tope se pone en quien la llama.
* **Comunidad → Eventos, la cabecera** (`SeccionEventos`, `CalendarioDelMes`, `SelectorDeVista`): «Mi agenda» y «Crear evento» son botones de **44** de alto con la etiqueta a **15** y
  **siempre en un renglón** (`BotonPrincipal` / `BotonSecundario` suman la opción `compacto`: la etiqueta se achica hasta el 85 % antes de bajar de renglón, así «Crear evento» nunca va
  en dos; sin la opción los botones de `Legible` siguen en 52 y 17); «Calendario / Tarjetas» y «Solo a los que voy» a 44 con letra de 15; el mes del calendario a **20** (el año a 14) y
  «Hoy ‹ ›» a 44; el selector de formación de Comunidad («Todas · Escuela · Diplomado · Certificación», solo Administración, Alquimista y Soporte TI) con **letra de 14**
  (`ControlSegmentado` suma `compacto`: segmentos de 40 con 2 de `hitSlop`, o sea 44 de área táctil; los demás controles segmentados no cambian); menos aire entre filas (10, era 16; 8 gap
  entre los dos botones). La prueba de letra legible de mentoría y administración (`letraLegibleEnMentoriaYAdministracion`) acepta, marcada a mano como `/* compacto */`, la etiqueta de 15
  del botón compacto: es una decisión del dueño y solo vale para botones de 44 con la etiqueta en un renglón.
* **Hoy → la tarjeta de acciones** (`TarjetaAccionDeHoy`; vale para sus cuatro contenidos, que comparten esqueleto): el rótulo («Hoy» o la hora) a **13**, el título a **16 semibold**
  (`fuentes.seminegrita`, era 18 negrita), «Meta: …» a 15, el botón dorado de **44** con la letra a **15** (`GoldButton` suma `compacto`; el dorado de siempre sigue en 52 y 16) y menos
  relleno (14, era 17). No cambian las filas compactas «Define tu objetivo de 90 días en Plan» / «Confirma tus objetivos» (`FilaCompacta`).
* **Dos textos que el dueño cambió después, con sus propias palabras** (commit aparte):
  * **Eventos → Calendario, la leyenda bajo el mes.** Decía «Hay evento» (cortado en un teléfono angosto) y «Vas». El dueño: «El lenguaje se fue, hay que ponerle allí, por ejemplo,
    Actividad programada / Confirmé asistencia». Ahora dice **«Actividad programada»** (el punto dorado) y **«Confirmé asistencia»** (el punto verde), a 14. Las dos piezas (punto + palabra)
    envuelven (`flexWrap`): si no caben en un renglón la segunda baja a otro, y ninguna se corta (sin `numberOfLines`). Lo que oye el lector de pantalla en cada día usa las mismas palabras:
    «Jueves 5 de noviembre, 1 actividad programada» / «2 actividades programadas» / «sin actividad programada», y «, confirmaste asistencia» con el punto verde (antes «evento(s)» y «, vas»).
    La etiqueta «Vas» / «No vas» de las tarjetas del día, y «Toca un día con punto para ver sus eventos», no se tocaron: no se pidió.
  * **Muro, la barra de crear publicación.** Bajo «¿Qué conquistaste hoy, <nombre>?» decía «Publicación sin límite de caracteres ›»; ahora dice **«Queremos leerte y acompañarte ›»**
    (`ComunidadScreen`). El placeholder del compositor («…sin límite de caracteres…») no se tocó.
* **No cambian**: los flujos, las pestañas, el calendario (celdas, puntos, día elegido), las tarjetas de eventos ni el resto de Hoy.
* **Pruebas:** `theme/__tests__/topeDeLetra.test.ts' (el tope, que lo propio gana, `TextInput.State`, idempotente, web, `index.ts` lo carga antes que la app),
  `eventos/components/__tests__/eventosCompacto.test.ts`, `leyendaDelCalendario.test.ts` (la leyenda, lo que oye el lector de pantalla y el texto de la barra del Muro), `home/components/__tests__/tarjetaAccionDeHoy.test.ts` (ajustada) y `tiempoLibreDeLaSemana.test.ts` (el tope de la línea de tiempo
  pasó de 1,6 a 1,2). Sin emulador en esta corrida: el aspecto, y que un teléfono con la letra al 200 % quede en 1,2, se confirman en pantalla.

## Corrección — 2026-11-03 — números y textos que no cuadraban en Plan, Training, Cierra tu día, Eventos y el Muro (issue #115)

E2E del 03/11 con la cuenta de las formaciones (3 objetivos, la semana y 21 acciones). Solo JavaScript, sin backend, sin diseño nuevo ni pantallas nuevas. Un commit por punto. Lo que cambia y nada más:
* **Plan → «Tu 80/20», vistas Semana y Mes: se dice el universo.** El servidor cuenta lo planificado **hasta hoy** (spec 031: lo de un día que no llegó no cuenta; se informa aparte como `porVenir`), y
  «Esta semana» de Plan cuenta **de hoy a fin de semana**; son dos universos distintos por diseño y no se unificaron (el servidor no lo permite sin castigar lo que viene como «no cumplido»).
  Con el periodo en curso la línea dice **«0 de 6 acciones cumplidas hasta hoy · 0 %»** y la de lo que viene, **«15 acciones más están agendadas para los días que vienen: la semana suma 21.»** (6 + 15, que es lo que
  Plan muestra de la semana; «el mes suma» en Mes). Un periodo cerrado cuenta entero y no dice «hasta hoy». Vale también para las fichas de quien acompaña (`lineaDeAvance(c, hastaHoy)`, `lineaDeLasPorVenir`).
* **`lineaDelObjetivo`:** una unidad que empieza con «/» va pegada a la cifra: **«Meta 8/10»**, no «Meta 8 /10». Y **el «·» ya no queda colgado al final del renglón**: cada separador va pegado al par que
  sigue con espacio duro (`·`+NBSP), así que el renglón solo se parte ANTES del punto, que abre el de abajo («Inicio 8 000 · Actual 8 000» / «· Meta 12 000 S/»).
* **Cierra tu día, franja de la semana (`CierresAnterioresDeLaSemana`):** hoy salía atenuado al 45 % (la regla de «no se puede tocar» de los días por venir) y se leía como desactivado, con ayer más fuerte. Ahora
  **hoy va pleno, con el número en negrita y un punto debajo**; los días pasados, normales; los que vienen y los anteriores al Día 1, apagados. El nombre para el lector de pantalla no cambia.
* **Training, hoja de evidencia de una acción:** decía «Vida y negocio · Innegociable» para una acción de Cuerpo. «Vida y negocio» es solo el cajón técnico de Training; cada acción lleva ahora su **eje**
  (`HabitItem.eje`) y la línea dice «Cuerpo · Innegociable» / «Negocio y dinero · …» / «Relaciones · …» (`contextoDeLaEvidencia`). Un hábito sigue diciendo su dimensión.
* **Training, «N de M hechos · X pts»:** el resumen suma `puntosOtorgados` de cada hecho, y para una acción es el que el servidor guarda en ella (`GET /rocks/today`): **eso ya se sumaba** una vez releída la lista
  (lo fija `accionesDeLosObjetivosEnTraining.test.ts`). El hueco real era el instante entre confirmar el cierre y la relectura: la lista reflejaba «hecho» **sin los puntos** y el resumen se quedaba en 0 hasta que
  llegaba lo verdadero. Ahora `reflejarCierreConfirmado` pone los puntos que el servidor respondió al cerrar (`conElCierreConfirmado`; nunca un número calculado en la app). **Ojo, sin confirmar en pantalla:** si
  el servidor paga 0 por una acción fuera de plazo (`EscalaPuntosRoca`: pasada la hora fin + 10 min de gracia + 3 h de extensión paga 0), «0 pts» es lo correcto; el E2E hizo la acción de las 07:00 a las 13:55.
* **Eventos → Calendario:** el día elegido (que no es hoy) se dibujaba como un cuadrado de esquinas casi vivas en Android (solo `backgroundColor` + `borderRadius`); el de hoy, con borde, sí salía redondo. El círculo
  de 40 recorta (`overflow: 'hidden'`) y el elegido lleva un borde del mismo color.
* **Muro, tarjeta:** la línea bajo el nombre empezaba con un «·» suelto («· Hace 1 minuto»): el separador solo aparece si hay algo antes (`lineaDelAutor`). Y **con la letra grande**: (a) «Me gusta», «Comentar» y
  «Compartir» ya no se cortan —sin `numberOfLines`, con `flexShrink`—; con la letra del sistema por encima de 1,15 (el umbral de Hoy) o si una etiqueta se parte en dos líneas (`onTextLayout`), la fila pasa a **solo
  íconos**, cada uno con su nombre y un área de 48 (un «Me gusta» dado se distingue también por el fondo dorado); (b) **«Ver más...» lo decide la tarjeta por las líneas reales** (`TextoDeLaPublicacion`): un `Text`
  invisible, del mismo ancho y letra y sin tope de líneas, mide una vez y se desmonta; el visible lleva su `numberOfLines={3}` aparte. Mientras no se mide se parte de la regla de antes (más de 120 caracteres) para que
  el botón no aparezca de golpe; los textos de 36 caracteres o menos ni se miden. Las pruebas que dibujan la tarjeta fijan `fontScale` (Jest, sin mock, lo da en 2).
* **No cambian:** el servidor, los puntos, la regla de Pareto, los textos del análisis de SER, ninguna pantalla ni tab. **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire).
* **Pruebas:** `textosDelOchentaVeinte`, `hojaOchentaVeinte`, `planPrincipal`, `cierreEnPlan`, `contextoDeLaEvidencia`, `accionesDeLosObjetivosEnTraining`, `diaElegidoDelCalendario`, `lineaDelAutorEnElMuro` y
  `muroConLetraGrande`. **Sin emulador en esta corrida:** el aspecto en pantalla (el punto de hoy, el círculo del calendario, los íconos del Muro con letra grande) se confirma con capturas.

## Cambio por pedido del dueño — 2026-11-06 — recorrido de bienvenida hasta el primer post, con confeti, y la pestaña «Entrenar» (spec 045)

Pedido del dueño (06/11): después de la ficha o del diagnóstico, un recorrido tipo tutorial, corto y no tan específico, que diga dónde está cada cosa (Hoy, Plan y
Entrenar) y lleve hasta el primer post en el Muro; al publicar, confeti; y «el inglés con español se ve feo en una app». Spec, decisiones y vista previa en el backend
(`specs/045-recorrido-de-bienvenida/`, D-330). **El dueño autorizó explícitamente** tocar los cinco tabs en lo que sigue, y el nombre de la pestaña del centro. Lo que cambia y nada más:
* **La pestaña «TRAINING» se llama «ENTRENAR»** (D5), en la barra, en la cabecera de la pantalla y en todos los textos que la nombran («Abrir Entrenar», «aparecen en Entrenar»,
  «Entrenar → Planificar»…). **La ruta interna sigue siendo `'Training'`** (navegación, avisos y pruebas no cambian).
* **Ningún texto en inglés** (D8, commit aparte): «Ranking» → «Tabla» (sección de Comunidad, imagen del podio, avisos), «Stickers» → «Figuritas», «checklist» → «lista»,
  «Tickets» → «Consultas», «Mi onboarding» → «Mis documentos», «· auto» → «· del teléfono». «chat» se queda. El prefijo técnico de las figuritas en el mensaje
  (`'Sticker Renaser: '`) no cambia: lo usan las versiones anteriores para reconocerlas. `src/__tests__/sinTextosEnIngles.test.ts` barre `src/` para que no vuelvan.
* **El recorrido** (`features/recorrido/`, montado en `App.tsx` como el arranque guiado): 5 pasos con una frase cada uno —«Te damos la bienvenida, Ana» (D6, sin género), Hoy,
  Plan, Entrenar y «Tu primera publicación»—; los pasos 2 a 5 oscurecen la pantalla (velo SVG con un agujero) y dejan un foco circular con aro dorado sobre la pestaña,
  **medida en la ventana** (`TabBar` registra sus botones en `recorrido/estado/focoDeLasPestanas`; no cambia su forma). El foco se desliza 240 ms y la tarjeta entra con
  un fundido de 200 ms (con «reducir movimiento», al instante); `tacto.seleccion()` al pasar de paso. «Saltar» pregunta («¿Saltar el recorrido?»); el atrás del sistema vuelve
  un paso y en el primero pregunta. La barra de pestañas queda a la vista mientras dura.
* **Cuándo sale lo decide el servidor** (`GET /api/v1/me/recorrido`): una vez por cuenta, **solo cuentas nuevas** (D2: la migración deja terminadas las anteriores), con programa
  propio activado (D4: el personal solo si hace el suyo). Solo arranca en Hoy, sin otra capa obligatoria ni el panel de SER encima, y nunca en «ver como». Si se cierra la app,
  sigue en el mismo paso. Con 4 pasos si ya publicó o si el Muro no está disponible. Contra un backend anterior (404) no sale.
* **El paso del Muro abre el compositor real** (`abrirComposerMuro` + `desdeElRecorrido`): solo cambia su texto de ayuda («¿Quién eres y qué vienes a cambiar?»); la foto sigue
  siendo obligatoria (D3). Si cierra sin publicar, queda la pastilla «Tu primera publicación · Continuar» sobre la barra.
* **Al publicar, la felicitación con confeti** (D7, solo el primer post): `PantallaDeCelebracion` con «¡Tu primera publicación!» y «Ya eres parte del grupo.», más `Confeti`
  (36 piezas en la paleta de la marca, una ráfaga de 1,4 s, solo `transform` y `opacity`, sin bloquear toques; sin confeti con «reducir movimiento»). Una sola vibración
  (`tacto.hito()`). Las otras celebraciones no cambian.
* **La guía de SER** (D1): el recorrido reemplaza su saludo y su guía al Muro; la burbuja «✳ SER» queda solo para el Pacto, que aparece al cerrar la felicitación (o al
  saltar el recorrido). Contra un backend anterior, la guía es la de siempre.
* **Yo → Ajustes → «Ver el recorrido»** (ícono `map`): lo repite desde Hoy, sin escribir en el servidor.
* **Pruebas:** Jest `reglasDelRecorrido`, `recorridoDeBienvenida`, `guiaSerTrasElRecorrido`, `confetiDelPrimerPost`, `respaldosDelBackend` y `sinTextosEnIngles`. Maestro:
  `.maestro/recorrido-de-bienvenida/01` y `02`; `comun/despejar-capas.yaml` salta el recorrido si aparece.
* **Hace falta el backend con V180 antes y un APK nuevo** (solo JavaScript).

> **Corregido el mismo día (el dueño, tras probarlo: «el primer post es obligatorio», D9–D11 de la spec).** Lo de «Saltar», «el atrás en el primero pregunta»,
> «Solo arranca en Hoy» y «la pastilla «Tu primera publicación · Continuar»» **ya no vale para una cuenta nueva**:
> * **El primer post es obligatorio** (D9): no hay «Saltar» ni «Ahora no»; el atrás retrocede un paso y en el primero y en el del Muro no hace nada. En el paso del Muro
>   un candado chico tapa Hoy, Plan, Entrenar y Yo, y la tarjeta dice «Lo demás se abre cuando publiques.». El paso tapa toda la app (también las otras secciones de
>   Comunidad): solo se puede ir al compositor. Cerrar el compositor sin publicar vuelve al paso del Muro (tras 0,6 s, para no parpadear sobre la felicitación); se quitó
>   la pastilla. Arranca sobre cualquiera de las cinco pestañas (un aviso pudo abrir otra al entrar). Mientras dura es la capa obligatoria `recorridoDeBienvenida`: los
>   avisos del teléfono esperan; el Código Renaser y el panel de SER lo pausan y vuelve al cerrarse (`hayOtraCapaObligatoriaAbierta` para no pausarse a sí mismo).
>   Repetido desde Yo → Ajustes sí se puede cerrar («Saltar», «Cerrar»).
> * **Modo oscuro** (D10): el velo es el token nuevo `velo` (72 % en claro, 78 % en oscuro), la tarjeta `cardBgAlt` y el confeti `coloresDelConfeti(tema)`: nada fijo.
> * **«Se reinicia cada rato»** (D11): se reiniciaba al parpadear la sesión (ahora solo al cambiar de cuenta) y al reabrir con un paso que no llegó al servidor (ahora
>   también se guarda en el teléfono, `renaser.recorrido.paso.<cuenta>`, y se retoma desde el más adelantado).
> * Pruebas: `recorridoDeBienvenida` (bloqueo, atrás, otras pestañas, reabrir, sin red, sesión que parpadea, lecturas al revés), `reglasDelRecorrido`, `confetiDelPrimerPost`;
>   Maestro `recorrido-de-bienvenida/02-el-primer-post-es-obligatorio.yaml` (reemplaza a `02-saltar…`).

## Cambio autorizado por el dueño — 2026-11-09 — tabs `Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`: la app funciona sin internet, fase 1 (spec 048)

* **Cambio autorizado por el dueño — 2026-11-09 — modo sin internet, fase 1 (spec 048).** El dueño decidió por rondas de
  preguntas (las 16 decisiones están en `specs/048-modo-offline/spec.md` del backend). Lo que cambia en la app:
  * **Sesión:** abrir la app sin señal ya no saca al login; se entra con el último perfil de esa sesión y se revalida con el
    servidor apenas responde.
  * **Ver sin señal:** Hoy, los hábitos de hoy y el Plan muestran lo último cargado (por sesión, se borra al salir).
  * **Marcar hábitos sin señal** (con texto o foto): el check sale al instante y sus alarmas de ese día se callan; queda en una
    cola por cuenta con la hora real (reloj del sistema desde el encendido, módulo `renaser-reloj`, solo Android) y se envía
    sola al volver la señal. Los puntos y la celebración salen con la respuesta del servidor. Las confirmaciones de Entrenar
    dicen «se enviará al volver la señal».
  * **Ícono discreto** arriba a la derecha sin señal o con cosas por enviar; al tocarlo, «Sin conexión desde las 10:42 · 3
    cosas por enviar».
  * **«Necesitas conexión para usar esto»** en SER, el chat, Mi ingreso, Eventos, el Código Renaser y los videos; cargan solos
    al volver la señal.
  * **Audios:** el de la Pastilla y el de la Audioterapia se bajan solos apenas la app tiene su URL; se borran a los 7 días.
  * **Cerrar sesión** con cosas sin enviar avisa cuántas se perderían.
  * **Lo que no cambia:** la Clase diaria y la Pastilla siguen entregándose con conexión (tienen su propio camino); la web
    sigue pidiendo internet. Fases 2 (Muro) y 3 (Plan, Cierra tu día, Radar, planificar) vienen después.

    > **Corregido 2026-11-10.** La Pastilla Renacer ya se entrega sin señal (issue #178, entrada del 2026-11-10 al final de
    > este archivo). La Clase diaria sigue pidiendo conexión.
  * **Necesita APK nuevo** (el módulo nativo del reloj). Sin él, la app usa el reloj del teléfono corregido y lo dice.

## Corrección — 2026-11-10 — tabs `Hoy`, `Training`, `Comunidad`: sin señal, el Código Renaser ya no atrapa, la Pastilla se entrega y el ranking lo dice (spec 048, issue #178)

* **Corrección — 2026-11-10 — tres bloqueos sin señal (spec 048, issue #178).** Los encontró la auditoría del modo sin
  internet; aplican lo que la spec ya decidía (D2, FR-005, FR-010, FR-011). Lo que cambia y nada más:
  * **Código Renaser innegociable (días 1 a 7):** sin señal no se abre solo. Si ya estaba abierto cuando se fue la señal,
    sigue abierto (lo escrito se guarda como siempre) pero se puede cerrar con la X o con el gesto de volver. Si la lectura de
    la hora falló por falta de señal, al volver la señal se lee de nuevo y el formulario se pide como siempre si la hora sigue
    sin responderse. Con señal no cambia nada.
  * **Pastilla Renacer:** sin señal la entrega espera en la cola de lo hecho sin señal, el hábito se ve hecho y el día de la
    Pastilla, entregado; sale sola al volver la señal. Un día que ya terminó no se entrega, igual que con señal.
    **Límite:** `POST /api/v1/spirit-audio/submit` del backend solo recibe `day` y `summaryText` (no `hechoEn` ni
    `idCliente`), así que el servidor la registra con la hora en que llega: si llega pasado el mediodía cuenta como tardía, y
    si llega otro día la rechaza (queda marcada en la cola con su motivo). Para no mandarla dos veces: una sola entrega por día
    en la cola, y el 409 «ya se registró (ENVIADO)» de un reintento se da por entregada. Llevar la hora real a ese endpoint es
    trabajo del backend, aparte.
  * **Comunidad → Tabla (ranking):** sin señal dice «Necesitas conexión para usar esto» en vez de un hueco, y se carga solo
    al volver la señal.
  * **No cambian:** el Código Renaser con señal, la Clase diaria (sigue pidiendo conexión), el resto de Comunidad.

    > **Corregido 2026-11-10 (fase 3, P8).** Lo del Código Renaser innegociable **ya no vale**: desde la fase 3 se responde sin
    > señal y el innegociable vuelve a abrirse solo y sin X también sin señal (entrada del 2026-11-10 de la fase 3, al final).
    > **Corregido 2026-11-11 (issue #186).** El **Límite** de la Pastilla de arriba **ya no vale**: `POST /api/v1/spirit-audio/submit`
    > ahora recibe la hora real y el `idCliente` (las tres cabeceras de la fase 3), así que la entrega sin señal se registra con
    > su hora real y no con la de llegada, y un reintento no la entrega dos veces. Tampoco valía lo del 409 «ENVIADO»: el servidor
    > decía «ENTREGADO» y esa respuesta nunca se reconocía (entrada del 2026-11-11, al final).
  * **Pruebas:** `src/features/radar/__tests__/radarSinSenal.test.ts`, `src/features/sinRed/__tests__/pastillaSinRed.test.ts`
    y `src/features/sinRed/__tests__/rankingSinSenal.test.ts`. Solo JavaScript: no hace falta APK nuevo ni cambio en el backend.

## Cambio autorizado por el dueño — 2026-11-10 — tabs `Hoy`, `Plan`, `Training`: la app funciona sin internet, fase 3 (spec 048, FR-019, issue #180)

* **Cambio autorizado por el dueño — 2026-11-10 — modo sin internet, fase 3 (spec 048).** El dueño respondió las nueve
  preguntas del plan de la fase 3 (`specs/048-modo-offline/plan.md` del backend). Plan (acciones y objetivos), Cierra tu día,
  Código Renaser y planificar hábitos y alarmas funcionan sin señal por la MISMA cola, con la hora real, y **si en el servidor
  cambió algo después de la hora en que lo hiciste, gana lo del servidor y se avisa qué no se aplicó** (D13). Lo que cambia y nada más:
  * **P1 — «Bitácora» es Cierra tu día.** No hay otra pantalla: la nota del día se guarda en el cierre.
  * **P2 — Agendar un día que ya pasó al llegar:** no se aplica y se avisa (`FUERA_DE_SU_DIA`); la app tampoco deja agendarlo
    si la hora real ya es de otro día.
  * **P3 — Sin tope de 48 h para lo que no da puntos.** Las 48 h solo quitan puntos al marcar una acción; lo demás lo decide el
    día y el choque.
  * **P4 — Código Renaser de una hora que el servidor ya tiene respondida:** se queda el del servidor y el aviso muestra lo que
    escribiste (`YA_ESTABA_HECHO`).
  * **P5 — Código Renaser que ya no corresponde** (Mi Radar apagado o sin esa hora desde el día 8): no se aplica y el aviso trae
    el texto (`MI_RADAR_NO_APLICA`).
  * **P6 — Acciones agendadas sin señal:** no se pueden marcar hasta que lleguen al servidor (el `id` lo pone él). Se ven
    «Se guardará al volver la señal» y, al tocarlas en Entrenar, lo dicen en vez de abrir el registro. Lo mismo vale para
    corregir o revisar un plan de la semana que todavía espera.
  * **P7 — Cierra tu día con una acción que ya no existe al llegar:** todo o nada (no se aplica y el aviso guarda lo escrito).
  * **P8 — Código Renaser innegociable (días 1 a 7): vuelve a abrirse solo y sin X también sin señal.** **Revierte la
    excepción de #179** (sin señal no se abría): ahora se puede responder sin señal (se guarda con la hora real y la hora queda
    respondida al instante), así que el formulario ya no va en «Necesitas conexión». Se actualizaron las pruebas de #179.
  * **P9 — Cómo se avisa lo que no se aplicó:** una hoja corta (`HojaDesdeAbajo`) la próxima vez que se abre Hoy y el globo del
    ícono de conexión dice «1 cosa no se aplicó» hasta que se ve. **No hay historial:** al verse se quita, y se borra al cerrar
    sesión. Cada aviso trae lo que no se aplicó, cuándo lo hiciste, el motivo y el texto que escribiste (con «Copiar»).
  * **Issue #180 (se cierra con este cambio):** un envío rechazado por el servidor (4xx) quedaba «bloqueado» en la cola para
    siempre y en silencio, y el `motivoSinPuntos` no se mostraba en ninguna pantalla (FR-015, FR-016). Ahora un 4xx es final:
    sale de la cola y deja su aviso; un hábito o una acción que llegó sin puntos dice por qué (más de 48 h, hora futura, fuera de su día).
  * **Planificar hábitos y alarmas** deja de ir en «Necesitas conexión»: la hora, el aviso, la alarma y apagar un día, el plan de
    la semana, pausar, quitar o sumar un hábito al plan se guardan sin señal y las alarmas del teléfono se reprograman al
    instante; el aviso de «rige desde mañana» (D-91) se calcula con la hora real. **Un hábito propio nuevo sigue pidiendo señal**
    (el servidor le pone el id con el que se planifica todo lo demás).
  * **Contrato con el servidor (sin cambiar nombres):** tres cabeceras — `X-Id-Cliente`, `X-Hecho-En` (ISO UTC con `Z`),
    `X-Origen-De-La-Hora` —; un 409 con `codigo` (`CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR`, `YA_ESTABA_HECHO`, `RECURSO_YA_NO_EXISTE`,
    `FUERA_DE_SU_DIA`, `MI_RADAR_NO_APLICA`) significa «no se aplicó» y la cola lo da por terminado.
  * **Límites:** el cambio de hora de un día y la alarma se ven al instante en los siete días; las semanas «solo esta semana» y
    la oferta de repetir semana se ven con lo último guardado hasta que llegue lo pendiente. Los puntos de una acción marcada sin
    señal salen al llegar (sin celebración propia: se ven al releer Entrenar).
  * **No cambian:** las cinco pestañas, ni con señal nada (los pedidos salen sin cabeceras y el servidor responde lo de siempre);
    el Muro, los hábitos y la Pastilla de las fases 1 y 2.
  * **Pruebas:** `src/features/sinRed/__tests__/` (`cabecerasSinRed`, `escrituraSinRed`, `avisosDeLoNoAplicado`, `colaSinRed`,
    `textoDelGlobo`, `pastillaSinRed`), `cierre/api/__tests__/cierreSinRed`, `radar/api/__tests__/radarSinRed`,
    `radar/__tests__/radarSinSenal` (P8), `objetivos/api/__tests__/planSinRed` y `habits/api/__tests__/planificarSinRed`.
    **Depende del backend de la rama `048-fase-3`** (las cabeceras las ignora uno anterior: lo hecho sin señal llegaría con la hora de
    llegada). Solo JavaScript: no hace falta APK nuevo.

## Corrección — 2026-11-10 — tabs `Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`: sin señal se dice «sin señal», no «No se pudo conectar» en rojo (spec 048, issue #182)

* **Corrección — 2026-11-10 — lo que se lee sin señal y no está guardado (spec 048, FR-004, FR-005, issue #182).** Lo encontró el
  E2E de la fase 3 (cuenta que nunca abrió Plan con señal) y el dueño mandó barrer toda la app. Lo que cambia y nada más:
  * **Plan:** «Esta semana» y «Acciones que mueven la meta» (y el objetivo de 90 días) sin señal y sin lectura guardada dicen
    «Todavía no hay nada guardado de esto en este teléfono. Se cargará solo cuando vuelva la señal.», en el color suave y no en
    rojo, **no ofrecen «Arma tu semana» ni dicen «Primero arma tu semana»** (no se sabe qué hay) y se leen solos al volver la señal.
  * **El resto de la app, con la misma frase y el mismo color:** Hoy (resumen del día), Entrenar (hábitos, elegir hábito para la
    foto, la Pastilla), Cierra tu día, la fecha de inicio al activar el programa. Lo que nunca se guarda en el teléfono dice «Necesitas
    conexión para usar esto. Se cargará solo cuando vuelva la señal.» (las palabras de `SoloConConexion`): cursos, tribu, listas
    del chat, Muro, ranking, quién reaccionó, tus evidencias en Yo. Todas se piden de nuevo al volver la señal.
  * **Una sola pieza** (`src/features/sinRed/`): `utils/sinSenal.ts` (`mensajeDeCarga`, `mensajeDeCargaEnLinea`, `esSinSenal`),
    `components/ErrorDeCarga.tsx` y `useRecargarAlVolverLaSenal.ts`. La regla `src/__tests__/reglas/sinSenalSeDiceSinSenal.test.ts`
    frena que una pantalla guarde `mensajeDeError(…)` de una lectura sin pasar por ahí.
  * **No cambian:** un error de verdad (500, 409 con motivo) sigue en rojo con su texto; lo que la persona manda (guardar, agendar,
    enviar) sigue diciendo «No se pudo conectar con el servidor…» en su diálogo; **las pantallas del personal** (Administración,
    términos, formaciones, mentoría, líderes, tickets, soporte, Caja) y el inicio de sesión no tienen modo sin internet y siguen
    como estaban (quedan en `excepciones.json`, `sinSenalAlCargar`, con su motivo: la lista solo se achica).
  * **Pruebas:** `src/features/objetivos/components/__tests__/planSinSenal.test.ts`,
    `src/features/objetivos/hooks/__tests__/planSinSenalAlLeer.test.ts`, `src/features/sinRed/__tests__/sinSenalAlCargar.test.ts`
    y la regla `sinSenalSeDiceSinSenal`. Solo JavaScript: no hace falta APK nuevo ni cambio en el backend.

## Corrección — 2026-11-10 — tab `Plan`: lo agendado sin señal cuenta en «Agendar mis acciones» (spec 048, issue #183)

* **Corrección — 2026-11-10 — la hoja «Agendar mis acciones» y las acciones que esperan señal (spec 048, FR-019, issue #183).** Lo
  encontró el E2E de la fase 3: una acción agendada sin señal («Se guardará al volver la señal») no contaba en la hoja de su día
  («Cuerpo · 0/3») y no se veía. Lo que cambia y nada más:
  * La hoja del día cuenta lo que ya espera señal en el tope de tres por eje («Cuerpo · 1/3»), lo muestra con «Se guardará al volver
    la señal» (y la hora, si la tiene) y **no lo vuelve a ofrecer** (ni la sugerida del diagnóstico ni una escrita igual): no se pasa
    de tres ni se agenda dos veces. No se puede quitar hasta que llegue (P6).
  * **Tocar en Plan una acción de otro día abre la hoja en ese día**, que es donde se ve lo que espera.
  * Al guardar, el plan del día viaja entero —lo que esperaba más lo nuevo, con las posiciones seguidas—, porque agendar un día
    futuro reemplaza al anterior (E-208) y sin ello el plan nuevo lo habría borrado. En la cola de lo hecho sin señal, el plan nuevo
    **sustituye** al anterior de esa fecha: sale un solo pedido por día (y el día en curso, que el servidor no deja rehacer, no
    choca con su propio plan).
  * **No cambian:** con señal, la hoja arranca en 0/3 y el servidor reemplaza el día como siempre (E-208); las cinco pestañas.
  * **Pruebas:** `src/features/objetivos/components/__tests__/agendarAccionesEnEspera.test.ts`,
    `src/features/objetivos/api/__tests__/planSinRed.test.ts` («agendar de nuevo un día que ya espera señal») y
    `src/features/objetivos/utils/__tests__/accionesPropias.test.ts`. Solo JavaScript: no hace falta APK nuevo ni cambio en el backend.

## Corrección — 2026-11-11 — tab `Training`: la Pastilla entregada sin señal se registra con su hora real (spec 048, issue #186)

* **Corrección — 2026-11-11 — la Pastilla Renacer sin señal con su hora real (spec 048, FR-008, FR-010, FR-015, FR-016, D14,
  D29, issue #186).** Lo dejó anotado la entrada del 2026-11-10 (#178) como «trabajo del backend, aparte»: la Pastilla entregada
  sin señal se guardaba con la hora en que **llegaba**, no con la hora en que se hizo. Lo que cambia y nada más:
  * **La cola de lo hecho sin señal manda la Pastilla con las tres cabeceras** (`X-Id-Cliente`, `X-Hecho-En` con la hora real en
    que la entregaste, `X-Origen-De-La-Hora`), como las demás áreas de la fase 3. El servidor aplica sus reglas con esa hora: la
    entregada a las 11:00 que llega a las 13:00 —o al día siguiente— cuenta **a tiempo**, y la hora del hábito «Pastilla Renacer»
    es la misma. Un reintento con el mismo `X-Id-Cliente` devuelve lo mismo y no la entrega dos veces.
  * **Lo que el servidor no aplica se dice**, con el mismo aviso de las demás áreas (la hoja de Hoy, con el motivo y lo que
    escribiste): `FUERA_DE_SU_DIA` si la hora real cae en un día que ya cerró para ese audio (D29: el audio de otro día nunca
    recibe el resumen de ayer), `YA_ESTABA_HECHO` si ese día ya estaba entregado (con red u otro teléfono; el día se ve entregado),
    `CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR` si se entregó desde otro lado después de lo que hiciste y `RECURSO_YA_NO_EXISTE` si ese audio
    ya no está. Si llegó pasadas 48 h o con una hora del futuro, la Pastilla cuenta pero el hábito queda **sin puntos** y la hoja
    lo dice (`motivoSinPuntos`, aditivo).
  * **Se quita el 409 «ENVIADO»** que se daba por entregada: no existía (el servidor decía «ENTREGADO») y con las cabeceras el
    reintento ya no lo necesita. Un servidor anterior (409 sin `codigo`) sigue terminando en aviso, como desde #180.
  * **No cambian:** la entrega con señal (sale sin cabeceras y el servidor responde lo de siempre), que sin señal se ve hecha al
    instante, que un día que ya terminó no se encola (D-259), la Clase diaria, las cinco pestañas.
  * **Pruebas:** `src/features/sinRed/__tests__/pastillaSinRed.test.ts` (cabeceras, mismo `idCliente` en el reintento, los 409
    con `codigo`, `motivoSinPuntos` y el servidor anterior). Solo JavaScript: no hace falta APK nuevo. **Depende del backend**
    «La Pastilla entregada sin señal se registra con su hora real (spec 048, #186)»: se fusiona primero; sin él, el servidor ignora
    las cabeceras y la Pastilla vuelve a llegar con la hora de llegada.

## Decisión del dueño — 2026-11-11 — sin tabs: la app entiende el 429 «Espera un momento» del límite de pedidos (spec 050, tramo C, FR-020)

* **Decisión del dueño — 2026-11-11 — el límite de pedidos por cuenta (spec 050, D3, FR-015, FR-020).** El backend cuenta los
  pedidos de cada cuenta por grupo (lectura, escritura, Muro, chat, subidas…) y, **cuando el dueño pase un grupo a «aplicar»**,
  responde **429** con `Retry-After` y `codigo: DEMASIADOS_PEDIDOS`. Hoy todos los grupos están en «solo registrar»: nadie recibe ese
  429. La app queda lista **antes** de que se aplique cualquier grupo de escritura (dependencia dura del plan de la spec). Lo que cambia
  y nada más:
  * **El mensaje se muestra.** Una pantalla que falla con ese 429 dice «Espera un momento y vuelve a intentarlo.» (el `message` del
    servidor, en tuteo; si lo respondió un intermediario sin cuerpo legible, el mismo texto, nunca «Error 429» ni una página HTML).
    `ApiError.esDemasiadosPedidos` lo reconoce sin leer el texto. Un 429 de otro límite (el login, las preguntas del día a SER) conserva
    su propio mensaje.
  * **`Retry-After` se lee** (`ApiError.reintentarEnMs`, segundos o fecha HTTP, tope de media hora) también en un 503. `apiFetch` no
    reintenta solo: un pedido, un 429.
  * **La cola de lo hecho sin señal (spec 048) lo trata como «reintenta después», nunca como final.** El envío se queda en la cola con
    todo lo que la persona hizo, sin aviso de «no se aplicó», y no sale antes del plazo del servidor (el mayor entre `Retry-After` y su
    espera creciente) **ni siquiera cuando vuelve la señal o la app vuelve al frente**: volver a pedir antes solo trae otro 429. Lo
    siguiente en la cola espera con él (el orden no cambia).
  * **No cambian:** los cinco tabs, ninguna pantalla, la cola de carreras con GPS (ya reintenta un 429 con su espera creciente) y la
    pantalla de SER (su 429 sigue diciendo que se acabaron las preguntas del día; el del minuto, `DEMASIADOS_PEDIDOS`, se distingue
    en un cambio aparte).
  * **Pruebas:** `src/services/http/__tests__/demasiadosPedidos.test.ts` (mensaje, `Retry-After`, la sesión no se cierra, sin cuerpo y
    con HTML) y `src/features/sinRed/__tests__/colaSinRed429.test.ts` (no es final, se respeta el plazo aunque se «adelante», el orden
    y nada se pierde). Solo JavaScript: llega con el siguiente APK. **Depende del backend** «Límite de pedidos por cuenta en modo solo
    registrar (spec 050, tramo C)», que además expone `Retry-After` en CORS para el build web. **E2E pendiente** (lo corre la sesión
    principal, con un grupo en `APLICAR` y `por-minuto` bajo en el backend local).
