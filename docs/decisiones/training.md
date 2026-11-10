# Training: lista por hora, hábitos, evidencias y el editor Planificar

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-09-22 — tabs `Training` y `Plan`

* **Excepción autorizada por el dueño del producto — 2026-09-22 — tabs `Training` y `Plan`.**
  Dos pedidos del dueño ese día, sobre capturas:
  * **`Training` — la Audioterapia Semanal abre con la MISMA hoja que la Pastilla Renacer.**
    Hasta hoy caía en el selector genérico y te pedía una foto o un video para demostrar que
    habías escuchado un audio que la app **nunca te mostraba**:
    `GET /api/v1/audio-therapy/status` existía en el backend y no lo llamaba nadie. Ahora abre
    `PastillaRenacerModal`: rótulo, título del audio, reproductor, las dos preguntas fijas de
    D-97 de a una, y el borrador que se guarda si cierras.
    **El cierre no cambió**: sigue siendo el camino genérico de evidencia
    (`confirmarEvidencia` TEXTO + `completarRegistro`). Se evaluó y se **descartó** entregarlo
    por `POST /spirit-audio/submit`, que es lo que parecía obvio: ese endpoint llama a
    `completarPastillaRenacer.completarDeHoy(...)`, resuelve el hábito por una constante y no
    recibe cuál cerrar — habría completado la PASTILLA, dado sus puntos y dejado la Audioterapia
    sin completar. Cero backend nuevo: es el camino que el propio `AudioterapiaService`
    documenta.

    > **Corregido el 2026-09-22.** Este párrafo decía que la Audioterapia mostraba el audio
    > *"arriba"* dentro del **modal genérico de evidencia**, abriendo en la pestaña TEXTO con las
    > dos preguntas listadas como guía. Esa fue la primera versión y **el dueño la rechazó** al
    > verla: *"está mal, cópiate este estilo, lo mismo para audioterapias"*, señalando la hoja de
    > la Pastilla. Se revirtió `EvidenciaHabitoModal` a como estaba y en su lugar se generalizó
    > `PastillaRenacerModal`, que ahora recibe un `AudioGuiado` (`audio`) en vez de un
    > `SpiritDayApi` (`dia`) — el mismo componente sirve a los dos flujos sin saber de cuál viene.
  * **`Plan` — la tarjeta del objetivo muestra solo la primera cláusula.** Pedido textual:
    *"quiero poco texto"*. Ahí iba la meta redactada entera —cinco líneas— sobre la tarjeta que
    se abre para ver el avance. Lo que se corta no se pierde: *"partiendo de X"* es el
    *"Partiste de X"* que está tres renglones más abajo, y la evidencia y el motivo se leen en
    el Mapa. Se reusó `primeraClausula`, que ya existía y ya se usaba en la lista de los tres.
  Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
  vuelve a necesitar autorización explícita.

## Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Training` y `Hoy`, registro con foto

* **Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Training` y `Hoy`,
  registro con foto.** Decisiones del dueño ese día:
  * **`Training` — los hábitos que EXIGEN evidencia abren la cámara directo** (solo foto, también
    los rituales). Con la foto tomada se abre una pantalla partida: la foto arriba y
    **"¿Qué sentiste?"** abajo, obligatoria; al terminar se sube la foto (evidencia `FOTO`) y se
    cierra el registro con esa respuesta como `respuestaTexto`. Aplica al check, al cuerpo de la
    tarjeta, a SUBIR y a la tarjeta del próximo a vencer. Quedan fuera los de flujo propio
    (`DAILY_CLASS`, Audioterapia, Pastilla, post de Comunidad, Despertar/Dormir), las rocas y el
    build web, que siguen con lo de antes. **Los de evidencia opcional no cambian**: siguen con el
    modal de las cuatro formas.
    > **Corregido 2026-10-31 (pedido del dueño).** Los tres rituales ya no abren la cámara: piden solo texto («Escribir cómo me
    > siento» y «¿Cómo te sientes después de realizar el ritual?»). Ver la entrada del 2026-10-31.
  * **`Training` — VER sobre un hábito ya cumplido ya no abre el modal de subida**: muestra lo
    que se escribió. Antes subía otra vez y terminaba en un `/complete` que el backend rechaza.
    Tampoco se abre la cámara para un registro `EXPIRADO`/`FALLIDO`.
    > **Corregido 2026-10-06 (D-259 del backend).** El aviso de ese caso decía «Este hábito ya venció ·
    > Pasó el plazo para registrarlo hoy», y `habitoDelMomento` contaba `EXPIRADO` como accionable. Regla
    > confirmada por el dueño: **un hábito se registra durante su día aunque se le haya pasado la hora
    > (vencer la hora solo baja los puntos); solo los del día.** `EXPIRADO` = su día ya cerró: el aviso dice
    > «Este hábito era del 5 de octubre; ese día ya cerró» (`avisoDeHabitoCerrado`), vale también en web y en
    > el modal genérico, y el «hábito del momento» ya no lo ofrece. Un `PENDIENTE` pasado su `plazoEvidencia`
    > se sigue registrando, y su tarjeta dice «Todavía puedes registrarlo hoy, sin puntos / con menos puntos»
    > (`avisoDeHoraPasada`). El servidor responde 409 a un registro de un día ya cerrado.
  * **`Hoy` — la hoja del orbe** muestra el pedido de foto del acompañante (evento `evidencia`)
    con **"Tomar foto"**, que abre la misma cámara y la misma pantalla partida. Nada más de Hoy
    cambia; al registrarse, Hoy relee el resumen y el hábito del momento.
  El código es uno solo para los tres lugares (y para la tarjeta del chat):
  `features/habits/hooks/useRegistroConFoto.ts` + `components/RegistroConFotoModal.tsx`.
  Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
  vuelve a necesitar autorización explícita.

## Cambio por pedido del dueño — 2026-10-05 — tab `Training`: íconos, hojas desde abajo, tipo oración y respuesta al tacto

* **Cambio por pedido del dueño — 2026-10-05 — tab `Training`: íconos, hojas desde abajo, tipo oración y
  respuesta al tacto** (rediseño aprobado sobre el inventario `trainingyo-iconos-inventario.png`, filas de
  Training, y las capturas `trainingyo-antes-t01..t06`). Lo que cambia y nada más:
  * **Íconos de línea** (Lucide, caja de 24, bloque `/* Training */` de `Icon.tsx`): «Próximo a vencer» con
    `timer` y «Vence en 12 min» a 16 (era el asterisco de Espíritu); racha con `flame` 16; «Entregada» con
    `badgeCheck` (era otra cámara); «Cambiar nombre» con `pencil` 18 en una fila de 44 (era el asterisco a 11).
    El asterisco queda solo para Espíritu y el corazón solo para Emociones. *(Corregido el mismo día: Espíritu
    pasó a `sparkles` y el asterisco ya no se usa en Training; ver la línea siguiente.)*
  * **Íconos de las cinco dimensiones, en un solo lugar** (`ICONO_DE_LA_DIMENSION` en
    `features/training/utils/iconoDeLaDimension.ts`; dibujos en el bloque `/* Dimensiones */` de `Icon.tsx`,
    Lucide en caja de 24): Cuerpo `activity` (era el monigote `body`; es el del eje Cuerpo, se toma de
    `ICONO_DEL_EJE`), Mente `brain` y Emociones `heart` redibujados con la forma de Lucide (mismo nombre: también
    cambian en el cuestionario del onboarding y en el «Protocolo de retorno» del Mapa), Espíritu `sparkles` (era
    el asterisco `spark`, que sigue en Sparkie, el Pacto, la firma, el onboarding y el Mapa) y Vida y negocio `briefcase` (el del eje
    Negocio). Lo leen la lista y el detalle de Training y el respaldo de un hábito sin ícono propio
    (`ICONO_DE_LINEA_POR_CATEGORIA` ya no es una copia). El paso «Hitos» del Mapa dejó su tabla propia (Salud
    con el corazón, Relaciones con `users`) y usa `iconoDelEje`, como Prioridad y Plan.
  * **Los 17 emojis de hábito pasan a íconos de línea por clave** (`iconoDeLineaDeHabito` en
    `habits/utils/iconosDeHabito.ts`): Despertar `sunrise` por su `clave_sistema` `WAKE_UP` (el catálogo les
    da `SLEEP` a los dos, sin tocar el backend), Dormir `moon`, agua `glassWater`, caminar `footprints`,
    jugo `salad`, comidas `utensils` / `utensilsCrossed`, etc. Se ven en la tarjeta, en Planificar y en la
    grilla «Elige un ícono» (se guarda la misma clave). **Plan sigue con el emoji** (`iconoDeHabito`, marcado
    de transición) hasta que pase a `iconoDeLineaDeHabito`.
  * **El botón de la tarjeta dice lo que pasa**: cámara «Subir», audífonos «Escuchar» (Pastilla y
    Audioterapia), libro «Clase» (Clase diaria), periódico «Publicar» (post diario), ojo «Ver» (lo hecho).
    **Despertar y Dormir siguen con «Subir» y registran la hora al tocar** (decisión del dueño: «los usuarios
    pueden trabajar de noche»).
  * **Un hábito cumplido se lee en su tarjeta**: tocarlo despliega «Cumplido a las 06:12 · +8 pts» y lo que
    escribió (hora y puntos del servidor, sin inventar); antes era el diálogo «Ya está cumplido». La Pastilla,
    la Audioterapia y la Clase diaria siguen abriendo su ventana en solo lectura.
  * **«Guías y audios» no se muestra** mientras esté vacío («En desarrollo») en las cinco dimensiones; vuelve
    como `ControlSegmentado` cuando tenga contenido (`seccionesDeLaDimension`).
  * **Hojas desde abajo** (`HojaDesdeAbajo`): Evidencia, Cambiar nombre y Clase diaria (eran ventanas
    centradas); Planificar y Pastilla, grandes (eran hojas hechas a mano con «× CERRAR»); Elegir hábito (Yo →
    «+ Subir foto»), del alto de su lista. «Pausar…» es una hoja de opciones (era un diálogo de tres botones).
    Planificar vuelve un paso con la ‹ y con el atrás de Android (prop nueva y opcional `alVolver` de
    `HojaDesdeAbajo`; sin ella la hoja es la de siempre). Cerrar una hoja nunca pierde lo escrito: borrador en
    memoria por registro, hábito o lección, y el borrador de la Pastilla de siempre.
  * **Evidencia**: Foto / Texto / Audio / Video en `ControlSegmentado`; grabar con `mic` (era el parlante),
    video con `video` (era ▶); lo cargado con su ícono y una papelera; «Entregar evidencia» fijo abajo; «con
    uno alcanza», una sola vez.
  * **Avisos de éxito en línea** (`ConfirmacionEnLinea` + `tacto.logro()`): «Evidencia entregada» y los puntos
    solo si la respuesta del servidor los trae (eran «¡Evidencia de Verdad Sellada! 🦅» con «+N puntos»),
    «Pastilla Renaser registrada», «Audioterapia registrada», «Clase diaria completada», y en Planificar los
    guardados y «Hábito creado». Los errores, y la hora guardada sin permiso de avisos, siguen en diálogo.
  * **Tipo oración y tacto**: «Cuerpo», «0 de 7 hoy», «Planificar Cuerpo», «Tu día (7)», «Guardar 09:30 · todos
    los días»… a 14–17 px (eran versalitas de 10–11); la cabecera del detalle es «‹ Cuerpo», como
    `CabeceraAdmin`. Dimensiones, hábitos, ✓, el botón de la derecha, las filas y las pastillas son
    `Presionable`; marcar un hábito, elegir un aviso, un día o un ícono vibran con `tacto.seleccion()`.
    «Ponele» → «Ponle»; las ayudas largas de Planificar, más cortas.
  * **No cambian**: los interruptores (`Switch`) de Training y de Planificar, el registro con foto
    (`RegistroConFotoModal`, compartido con Hoy y Yo), las reglas de cierre de cada hábito y los pedidos al
    backend.
    > Corregido 2026-10-05 (prueba final en Android). Los interruptores de Training y de Planificar sí cambiaron
    > después: en oscuro el pulgar casi desaparecía, y pasaron a `Interruptor` (ver la entrada «pulido final» más
    > abajo).
  * **Hace falta un APK nuevo** (la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-10-05 — tab `Training`: la racha real de cada hábito

* **Cambio por pedido del dueño — 2026-10-05 — tab `Training`: la racha real de cada hábito** (D-254 del
  backend). Lo que cambia y nada más:
  * **«🔥 N días» sale del servidor**: `rachaDias` de cada track de `GET /api/v1/habit-tracks/today`
    (días programados seguidos que se cumplieron; los días en que el hábito no toca y los de pausa no cortan
    ni suman; hoy pendiente no corta). Antes `useTraining` fijaba `streak: 0` y todas decían «0 días».
  * **Sin dato no hay racha**: si el campo no viene (backend anterior), en un hábito sin track de hoy (no le
    toca hoy o está en pausa) y en las rocas de Vida y negocio, la tarjeta no dibuja la llama
    (`HabitItem.streak` es `number | null`). Con 0 sigue la llama gris y «0 días».
  * **Hace falta un APK nuevo** (la app no se actualiza por aire); el APK publicado ignora el campo nuevo.

## Cambio por pedido del dueño — 2026-10-05 — tab `Training`: la racha congelada del hábito sin track de hoy

* **Cambio por pedido del dueño — 2026-10-05 — tab `Training`: la racha congelada del hábito sin track de hoy**
  (D-254 del backend, decisión 2 del dueño: «mostrar la racha congelada de un hábito que hoy no tiene track (no
  le toca hoy o está en pausa)»). Lo que cambia y nada más:
  * **De dónde sale**: `rachaDias` de cada hábito de `GET /api/v1/habits` (el catálogo con el que Training arma
    las tarjetas sin track), misma regla y mismo cálculo que el del track. No va en `GET /habit-unlocks`: ahí
    solo hay fila de los hábitos elegidos o pausados, y un hábito que hoy no toca por día de la semana no la tiene.
  * **La tarjeta sin track** dibuja la llama igual que las demás (gris con 0). Si el campo no viene (backend
    anterior), no dibuja nada. Con track sigue mandando `rachaDias` del track.
  * **Hace falta un APK nuevo**; el APK publicado ignora el campo.

## Cambio por pedido del dueño — 2026-10-07 — tab `Training` y el botón de SER: el momento de cumplir un hábito

* **Cambio por pedido del dueño — 2026-10-07 — tab `Training` y el botón de SER: el momento de cumplir un hábito**
  («cuando alguien completa un hábito no hay animación… lo quiero lo más fluido posible»; propuesta aprobada por el
  dueño). Lo que cambia y nada más:
  * **El check de la tarjeta de Training** (`habits/celebracion/CheckDelHabito`): al pasar a cumplido se llena de
    **dorado** (antes verde, de golpe) y rebota desde 0.8 con un resorte (~300 ms). Montarse ya cumplido no anima.
  * **Los puntos**: sobre el check sube «+N» y se desvanece (~600 ms). N es `puntosOtorgados` del SERVIDOR, que ahora
    viaja en el aviso `habitoCumplido` (`{ registroId, puntosOtorgados }`); con 0, o en la Pastilla y la Clase diaria
    (su endpoint no los devuelve), dice «Registrado». La línea «Evidencia entregada · +N pts» sigue igual.
  * **El fénix del botón flotante de SER** (`fenix/components/FenixDeSerQueSalta`) da un saltito (~500 ms) con cada
    hábito cumplido. Sigue siendo la foto fija: es un `transform`, **nunca** Rive.
  * **Vibración `tacto.logro`, una por cierre**: la dispara la pantalla que cerró. Se agregó donde faltaba (Despertar/
    Dormir y los hábitos sin evidencia en Training; el registro con foto desde Hoy y desde el panel de SER).
  * **Todos los del día**: la celebración corta que ya existía (una por día, al volver a Hoy). Nada nuevo la llama.
    > **Corregido 2026-10-07.** Ahora es la pantalla completa «¡Día completo!» y sale donde se cumple el último hábito
    > (ver «pantalla completa para los momentos grandes»).
  * **«Reducir movimiento»**: el check y los puntos aparecen con un fundido, sin rebote ni subida; el fénix no salta.
  * Las decisiones están en `habits/celebracion/momentoDelHabito.ts` (puras, probadas). Solo `transform`/`opacity` en el
    hilo de la interfaz: cumplir un hábito vuelve a dibujar ese check, no la lista.
  * **Segunda vuelta, mismo día** (el dueño lo probó: «No veo nada, mejora esos aspectos. Lo quiero lo más fluido
    posible»). En el emulador, tras tocar el check pasaban ~1–2 s sin ningún cambio y después todo aparecía de golpe;
    el «+N» (13 px, 22 px de subida) y el salto del fénix (7 px) no se percibían. Lo que cambia:
    * **Respuesta en el mismo toque**: al apoyar el dedo el check se hunde a 0.92 (`Presionable` acepta
      `escalaAlApretar`; el resto de la app sigue en 0.97); al soltar, en los cierres directos (Despertar/Dormir y los
      hábitos sin evidencia obligatoria) el disco aparece a medio llenar y respira suave hasta la respuesta
      (`habits/celebracion/momentoEnLaTarjeta.ts`, `cerrarConRespuestaInmediata`). La tarjeta (`done`) sigue
      marcándose SOLO con la respuesta del servidor (V-2). Si el servidor falla, el check se vacía en 180 ms y sale el
      diálogo de error de siempre.
    * **Al confirmar**: «pop» del check (1.15 → resorte a 1), ✓, la raya del tachado se dibuja de izquierda a derecha
      (`TituloQueSeTacha`), brillo dorado en el borde de la tarjeta (`BrilloDeLaTarjeta`, opacidad) y «+N pts» en una
      pastilla de 16 px dorada que sube 32 px en ~820 ms. Todo arranca en el mismo cuadro en que la tarjeta se dibuja
      cumplida (`useLayoutEffect`). Si el cierre vino de una hoja (evidencia, foto, Pastilla), espera 220 ms a que la
      hoja se vaya. El fénix del botón salta 11 px y crece a 1.1.
    * **Vibración**: el «tic» de selección al tocar (ya existía) y el logro al confirmar (ya existía): dos sensaciones
      distintas para dos hechos distintos, ninguna repetida.
    * **«Reducir movimiento»**: solo fundidos (medio llenado quieto, ✓, raya y puntos por opacidad; brillo igual).

## Cambio por pedido del dueño — 2026-10-13 — tabs `Training` y `Comunidad` (ranking): el hábito GIMNASIO y su pestaña

* **Cambio por pedido del dueño — 2026-10-13 — tabs `Training` y `Comunidad` (ranking): el hábito GIMNASIO y su
  pestaña** (backend D-266). Pedido: «activar el hábito de gimnasio y que salga en el ranking también, igual que los
  demás: una foto y nada más». Lo que cambia y nada más:
  * **Training**: aparece GIMNASIO para todos, opcional, con el ícono de pesas que ya tenía (`WORKOUT`). Es foto y
    listo, sin «¿Qué sentiste?» (solo los rituales preguntan, D-172): el flujo no se tocó. Lo pone el backend (V99).
  * **Comunidad → Ranking**: cuarta pestaña «Gimnasio» con los días de gimnasio desde el Día 1 («12 días», «1 día»;
    sin quien tiene 0, como Kilómetros). `ControlSegmentado` suma `achicarTexto` (apagado por defecto): con cuatro
    opciones en 360 dp el texto se achica hasta un 85 % en vez de cortarse con «…». Solo el ranking lo usa.
  * **Hace falta un APK nuevo** para la pestaña; el APK publicado ya ve y registra el hábito.

## Corrección autorizada — 2026-10-17 — hábitos al cambiar de día

Pedido del dueño: continuar con spec-kit e implementar el bug documentado del 17 de octubre;
después de leer la spec, indicó «sigue nomás». Lo que cambia y nada más: Training actualiza e invalida
los registros al cierre del día del participante y al recuperar foco/actividad; los caminos compartidos
de evidencia y cierre (también avisos/SER), y las entregas de Clase/Pastilla abiertas desde Training,
comprueban el ID original antes de enviar. Un rechazo por día cerrado recarga y avisa; no reasigna
el intento ni anuncia puntos. Se conservan los diseños, los tabs y las sesiones especiales que cruzan
medianoche. Spec canónica: backend `specs/002-habitos-cambio-de-dia/` (D-268/E-615).
Hace falta publicar el backend nuevo para el cierre preciso y una versión nueva de la app/APK;
con backend anterior se mantiene la validación previa y la actualización periódica.

## Cambio por pedido del dueño — 2026-10-20 — tab `Training` → Planificar: días solo con íconos, «Otra» en su lugar y pantalla completa

* **Cambio por pedido del dueño — 2026-10-20 — tab `Training` → Planificar: días solo con íconos, «Otra» en su
  lugar y pantalla completa** (spec 011 del backend, `specs/011-editor-por-pasos/`; pedido con una captura del
  editor de Descanso profundo: «que ocupe todo, y cuando le doy "Otra" se sobrepone lo de abajo»; después de comparar
  20 diseños el dueño decidió quedarse con el editor actual: «no era tanto cambio al final»). Solo cambia la FORMA
  de tres cosas. Lo que cambia y nada más:
  * **Los días llevan solo íconos**: la pastilla de cada día de `FilaDeDiasDelPlan` dibuja la campana (o la campana
    tachada si el día va sin aviso) y el reloj si tiene alarma propia, y ya no escribe «30′», «30′ +1» ni «a la hora».
    Con un solo ícono va a 16 y con dos a 14, como antes. Las siete pastillas siguen midiendo lo mismo y alineando
    letra, número y hora: el bloque de abajo es solo la fila de íconos (16) y el chip baja de 88 a 76. La etiqueta
    del lector de pantalla sigue nombrando la lista completa de avisos. La misma fila la usa el recordatorio de las
    acciones (Plan y Yo → Alarmas, spec 010): también deja de escribir el aviso. `resumenDelAvisoDelDia` ya no trae
    `corto`.
  * **«Otra» se elige en su lugar y SUMA un aviso**: tocarla agrega un aviso nuevo y lo marca —los que había (30, 10,
    «a la hora», los personalizados) quedan— y abre, DENTRO de lo que se desliza y justo debajo de las opciones del
    recordatorio, la fila «−  15 min antes  +» (botones redondos de 48, minutos a 18 en negrita, borde dorado). Arranca
    en 15; si 15 ya está, en el siguiente valor libre múltiplo de 5 (hacia arriba hasta 60 y, si no hay, hacia abajo);
    sin ningún valor libre no suma nada. «−» y «+» ("Cinco minutos menos" / "Cinco minutos más") cambian SOLO ese
    aviso, SOLO por múltiplos de 5 entre 5 y 60 (en 5 «−» se apaga y en 60 «+» se apaga), SALTANDO los avisos que ya
    existen (nunca pisan ni duplican otro; un valor guardado antes que no sea múltiplo de 5, como un 7 de la rueda
    vieja, vuelve a la cuadrícula: «+» lo lleva al siguiente, 7 → 10, y «−» al anterior, 7 → 5); sin un valor libre en
    esa dirección el botón también se apaga. Mientras ese aviso siga marcado, volver a tocar «Otra» solo abre o cierra
    la fila (no suma otro); tocar su pastilla lo desmarca
    y cierra la fila (el siguiente toque en «Otra» suma uno nuevo); «Sin aviso» sigue siendo exclusivo y también la
    cierra; cambiar entre todos los días y días marcados la cierra y suelta el aviso. Vale con días marcados (el aviso
    va a esos días, spec 008). Si la fila nace debajo de lo que se ve, se lleva a la vista. Entra con un fundido de
    160 ms (con «reducir movimiento», al instante). Se borró la rueda `RuedaAntelacionPicker` y su botón «Añadir»,
    que se montaban encima del contenido; la lógica vive en `training/utils/avisoOtra.ts`.
  * **Pantalla completa**: `HojaDesdeAbajo` suma `tamano="completa"` (todo el alto disponible, hasta debajo de la
    barra de estado; `grande` de las demás hojas no cambia) y la hoja de Planificar la usa en sus tres pasos —la
    lista, el editor y «Hábito nuevo»— para que no cambie de alto al entrar a un hábito. Al final de lo que se
    desliza queda más aire (32) para que «Cómo suena» se lea entero por encima del botón fijo de guardar. Volver, la
    ✕, arrastrar y el atrás de Android funcionan igual.
  * **No cambian**: la hora, el resto del recordatorio, «Cómo suena», los textos, lo que se guarda (los mismos
    pedidos), las alarmas y el backend (no se repiten las pruebas E2E de alarmas), Plan ni los demás tabs.
    **Hace falta un AAB/APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por
    aire).

## Cambio por pedido del dueño — 2026-10-29 — tab `Training`: Training por hora (spec 014)

* **Cambio por pedido del dueño — 2026-10-29 — tab `Training`: Training por hora (spec 014)** (spec, vista previa
  aprobada y decisiones del dueño en `Renaser-90-dias-backend/specs/014-training-por-hora/`; pedido: «vamos con ese
  diseño en Training, me gusta», con urgencia). Lo que cambia y nada más:
  * **La pantalla** (`features/training/components/TrainingPorHora`): «TRAINING» con la fase y el día («El Espejo · Día
    3 de 90») y el engranaje a la derecha; el día elegido en serif («Jueves 29») con su resumen («4 de 12 hechos · 46
    pts», los puntos son los que pagó el servidor); la semana de lunes a domingo —la que se VIVE, el domingo no salta
    a la siguiente como la de planificar— y, debajo, UNA lista con los hábitos, las acciones del día y los eventos,
    por la hora planificada. **Ya no se ven afuera** las cinco dimensiones, «Arma tu semana los domingos» ni la tarjeta
    «Próximo a vencer» (el primero de la lista ya lo es; `ProximoAVencerCard` queda sin uso, con su prueba).
    > **Corregido 2026-10-31 (pedido del dueño).** La línea de la fase y el día («El Espejo · Día 3 de 90») ya no se dibuja; la
    > cabecera queda con el día elegido y su resumen (y el engranaje). Ver la entrada del 2026-10-31.
  * **La lista de hoy** (`utils/listaDelDia`, pura y probada): lo que sigue por hora, y el primero dice «Te toca ahora»
    (su hora ya llegó) o «Lo que sigue»; después «Sin hora»; después «Se te pasó la hora · todavía puedes registrarlos
    hoy», con el texto de menos puntos de D-259 que ya existe (`avisoDeHoraPasada`); al final, plegado, «N hechos
    hoy». Un pendiente queda atrasado cuando llega la hora del siguiente ítem con hora del día (también lo hecho o un
    evento); el último nunca. Los eventos terminados salen (sin duración se suponen 60 min, la misma hora de gracia de
    `listarProximos`); un evento nunca se atrasa. Un hábito sin registro hoy (pausado, no le toca) no está; uno
    pausado después de generarse su registro y aún sin hacer, tampoco. Un registro cuyo día ya cerró (`EXPIRADO`) va
    aparte, con candado, y abre el aviso de siempre. Lo que se acaba de cumplir se despide en su lugar ~1,2 s (el check
    se llena de dorado y sube su «+N», `habitoCumplido`), sale con un fundido de 160 ms y la lista se acomoda;
    con «reducir movimiento», sin desplazamiento.
  * **Un toque, una hoja** (`HojaDelHabito`, `HojaDesdeAbajo`): el nombre, la hora, los puntos y la racha del servidor;
    la guía plegada («Guía de esta práctica», lo que el equipo cargó en `guia` del registro de hoy:
    `queHacer`, `comoHacerlo` y el mantra; sin guía la sección no existe) y, fijo abajo, el botón del registro de su
    tipo: «Tomar foto», «Escuchar el audio», «Ver la clase», «Publicar en el Muro», «Subir evidencia», «Marcar como
    hecha» (acciones) y, en Despertar y Dormir, «Marcar como hecho», que registra la hora. El botón cierra la hoja y abre
    **el registro de siempre por los mismos caminos** (`openEvidenceModal`, `useRegistroConFoto`, `PastillaRenacerModal`, la
    Clase, el Muro, `sellarRocaDiaria`): no se tocó ningún pedido al servidor ni cómo se emite `habitoCumplido`. **Sin
    guía no hay hoja**: el toque abre directo el registro de siempre (que ya es su hoja o la cámara), sin otro «Subir»;
    Despertar y Dormir siempre pasan por la hoja (marcar es inmediato). El ✓ de la fila, solo en lo que se cierra sin
    abrir nada (Despertar/Dormir y la evidencia opcional sin flujo propio), marca en el acto. Lo hecho abre su hoja con
    «Cumplido a las 06:12 · +8 pts» y lo que escribió; la Pastilla y la Clase conservan su ventana de solo lectura. Un
    evento lleva a su detalle en Comunidad → Eventos (`abrirEventoId`). El aviso del teléfono que abre un hábito
    (`aperturaDesdeAviso.habitoAAbrir`) lo abre como al tocar su fila, ya no la dimensión.
    > **Corregido 2026-10-31.** El nombre de un hábito del catálogo que llega en mayúsculas se ve en tipo oración («Agua tibia
    > con limón»); ver la entrada del 2026-10-31.
    > **Corregido 2026-10-31.** En los rituales (`RITUAL_MORNING`, `RITUAL_MIDDAY`, `RITUAL_NIGHT`) el botón no es «Tomar foto»
    > sino «Escribir cómo me siento».
  * **Un día anterior: sin registrar NUNCA** (regla explícita del dueño: «nunca debería llegar» a subir algo). Se lee
    `GET /api/v1/habit-tracks/day?date=` (solo de ayer hacia atrás, hasta el lunes y no antes del Día 1; el servidor
    responde 400 a cualquier otra fecha y la app ni la pide) **solo cuando la persona toca ese día**: nunca al abrir
    Training, al volver al foco ni en un efecto. Una lectura por fecha y por cuenta en memoria de la sesión
    (`utils/lecturaDeDiasCerrados`, `useDiasCerrados`): tocar el mismo día otra vez usa la guardada, dos toques
    seguidos comparten el pedido en vuelo, un error no se reintenta solo («Reintentar»), un 400/403/404 o una respuesta
    que no calza es «sin datos» definitivo, y cambiar de cuenta o de semana limpia la memoria. Con datos: ✓ en lo hecho
    y candado en lo demás, y tocar uno **solo dice** «Ya hecho» o «Ese día ya cerró. No se puede registrar.» (una línea
    que se va sola). Un día sin registros dice «Ese día no tuviste hábitos registrados.». Sin lectura, con error o con
    una respuesta que no calza: lo planificado, con «Lo que hiciste ese día está en Yo → Mis evidencias.», sin ✓ ni
    candados inventados. Un día anterior no muestra puntos en juego, racha, «Se te pasó la hora» ni «Te toca ahora».
    **En un día anterior no se monta ningún componente de registro** (`TrainingScreen` no monta la hoja de evidencia, la
    cámara, la Pastilla ni la Clase) y lo que haya quedado abierto se cierra; si cambia el día con una hoja abierta, se
    cierra y el registro de siempre vuelve a comprobar el día antes de enviar (spec 002). Pruebas:
    `diaAnteriorSinRegistro.test.ts` (ningún registro ni escritura: `/complete`, `/evidence`, `/rocks/…`; un solo
    pedido por día) y `trainingDiaAnteriorSinRegistro.test.ts`.
  * **Un día que viene**: lo planificado de ese día de la semana (los hábitos con la hora de ESE día, `habit-preferences`
    `weekdays[i].triggerTime` de la spec 008; las acciones de esa fecha, `GET /rocks/upcoming`; los eventos), sin
    botones ni toques. Las horas y las acciones se piden recién al tocar un día que no es hoy, una vez por semana y cuenta.
  * **El engranaje → «Tus prácticas»** (`PracticasDeTraining`, pantalla completa con `CabeceraAdmin`; el atrás del
    sistema sube un nivel por vez: `navegacionDePracticas`): **solo para planificar, ninguna fila registra**. Lleva
    «Arma tu semana los domingos» (el mismo `Interruptor`, ahora `useRepasoSemanal`) y las cinco dimensiones con su avance
    de hoy; cada una abre su detalle: «Planificar <dimensión>» —el `PlanificarDimensionModal` de siempre, con su pausa
    «Solo hoy» / «Hasta que yo lo reactive» y las specs 008 a 011—, la lista de sus hábitos (tocar uno abre su editor
    en Planificar: prop nueva y opcional `abrirEnHabitoId`) y «Cambiar nombre» en las dos bebidas renombrables
    (D-127). Las acciones de los objetivos se siguen planificando en Plan.
    > **Corregido 2026-10-31 (pedido del dueño).** Lo de «cada una abre su detalle», la lista de sus hábitos, la prop
    > `abrirEnHabitoId` y «Cambiar nombre» en esa lista **ya no es cierto**: tocar una dimensión abre DIRECTO la hoja
    > «Planificar <dimensión>» y «Cambiar nombre» pasó al editor de cada bebida. `abrirEnHabitoId` se borró (nadie más la
    > usaba). Ver «tab `Training` → Tus prácticas: la dimensión abre Planificar directo», al final de esta lista.
  * **No cambia**: cómo se registra cada tipo ni los pedidos al servidor, `habitoCumplido`, la actualización al
    cambiar de día (`useActualizacionDelDia`), abrir desde un aviso, los momentos del check y el «+N pts», las
    confirmaciones en línea, el interruptor `habitos` de Soporte TI, la barra que se esconde al desplazar, la invitación
    y los avisos del Día 1, ni Plan, Hoy, Yo y Comunidad. Sale de la pantalla principal, a «Tus prácticas» o a la hoja:
    la racha de cada hábito ahora se lee en su hoja (no en la tarjeta).
  * **Hace falta un APK nuevo** (la app no se actualiza por aire) y el backend con `GET /habit-tracks/day`; contra
    un backend anterior los días anteriores muestran lo planificado.
  * **Ajuste del dueño, mismo día:** la fila de un hábito es solo su nombre (la dimensión y los puntos pasan a la hoja,
    abajo), y lo atrasado ya no habla de puntos: «Todavía puedes cumplir tu compromiso hoy». Cuándo se avisa no cambia, y
    el servidor paga igual que antes (D-259).
  * **Ajuste del dueño, 2026-10-30:** en los hábitos de evidencia **opcional** (Día sin celular, Meditar, Escritura libre…) la
    fila lleva **solo «Subir»**, como botón aparte que abre las cuatro formas; ya no lleva el círculo, que «le quitaba lo
    simple». Tocar el nombre abre la hoja con «Subir evidencia» y «Marcar como hecho» (`ControlDeLaFila` `subir`). Un día
    anterior que no se pudo cargar dice una sola línea, «No pudimos cargar este día.», con «Reintentar».
    > **Corregido 2026-10-31.** «Última comida del día» ya no lleva «Subir» sino el círculo; los demás opcionales siguen igual.

## Cambio por pedido del dueño — 2026-10-31 — Training → Planificar y Plan: «Solo esta semana», repetir la semana y planificar el mes (spec 028)

Pedido textual: «si una persona planifica una semana, ofrecerle la misma planificación la siguiente semana; y, a la par, que pueda hacer la
planificación de cada mes, si lo desea». Spec, plan, contratos y decisión **D-296** en el backend (`specs/028-planificacion-semana-y-mes/`).
Decisiones del dueño del mismo día: **028-1 A** «todas las semanas» sigue como base y se suma «Solo esta semana», con la oferta de repetir la
semana anterior; **028-2** «planificar el mes» es el **plan de OBJETIVOS de Plan** (el mes del programa, Mes 1 = semanas 1 a 4), no el calendario;
**028-3** repetir la semana es de los **hábitos** y el mes es de los **objetivos**; **028-4 A**, **028-5 A**; y «lo único bueno que ya está es la
planificación de hábitos»: se reutiliza el editor de Planificar (specs 008 a 011) y no se reescribe. Lo que cambia y nada más:

> **Corregido 2026-11-02 (pedido del dueño).** El control ya no dice «Todas las semanas | Solo esta semana» sino **«Siempre | Por semana»**; «Por semana» deja
> pasar de semana (flechas y deslizando) hasta la última del programa y ya no lleva la ayuda «Solo esta semana: los días que faltan…», el rótulo «Toda esta
> semana», «Cargando esta semana…» ni la línea «Cambiado solo esta semana: sáb, dom» (queda el punto del día). El editor abre en «Por semana» cuando lo
> guardado ya tiene cambios. Ver «Training → Planificar: «Siempre | Por semana»…», más abajo.

* **El editor de un hábito** (`PlanificarDimensionModal`): un `ControlSegmentado` «Todas las semanas | Solo esta semana» arriba del bloque de los
  días. Por defecto «Todas las semanas», con **los mismos textos, pedidos y alarmas de siempre** (las pruebas de las specs 008 a 011 siguen
  sin modificarse). Solo se ofrece si el servidor sabe de esto (`GET /habit-preferences` manda `dateOverrides`).
  * En «Solo esta semana» los siete días salen de `GET /habit-preferences/{id}/week?weekStart=` (el lunes de la semana que el editor ya dibuja;
    el domingo, la siguiente), mapeados al mismo `DiaDelEditor` con el que ya funcionan las pastillas, el aviso y «Cómo suena». Vienen marcados
    los días que faltan y que el plan de siempre no apaga; **nunca queda ninguno sin marcar** (acá «sin días» no significaría «general»).
    Hoy y los días pasados siguen con candado. Los días con cambio propio de esa fecha llevan un punto (`marcaDelDia`, prop **opcional** nueva de
    `FilaDeDiasDelPlan`) con su etiqueta accesible, y una línea dice «Cambiado solo esta semana: sáb, dom».
  * **Se guarda solo lo tocado** (`utils/alcanceDeLaSemana.ts`, puro): hora si se movió la rueda, aviso si se tocó, «Cómo suena» si se tocó y
    apagar si se pidió, en un solo `PUT …/week` todo o nada. «Guardar … · solo esta semana» se apaga si no se tocó nada. «Volver al plan de siempre
    los …» devuelve esas fechas (`reset`; si son todas las que tenían cambio, `DELETE …/week`). Un hábito obligatorio no se apaga (409).
  * No cobra cupo, no cambia el plan de siempre ni las demás semanas.
* **«Tus prácticas»** (`PracticasDeTraining`) muestra arriba de las dimensiones la tarjeta **«Repetir tu semana»** («Tu semana del 26 oct al 1 nov, en la
  del 2 al 8 nov»), solo cuando el servidor la ofrece (`GET …/week-repeat`: la semana en curso tiene cambios propios y repetirla cambiaría la siguiente).
  «Repetir», «Ahora no» y «Ver qué se repite» (una `HojaDesdeAbajo` con el resumen por hábito: hora, aviso, «no va» o «cómo suena», y los hábitos que se
  dejan afuera con su motivo). Si la semana siguiente ya tiene cambios propios, dice «Reemplaza lo que ya cambiaste esa semana» y pide **un segundo toque**
  antes de mandar `replace: true`. Al repetir sale «Tu semana del 2 al 8 nov quedó como esta» con **«Deshacer»** (`DELETE …/weeks/{lunes}`); otro día queda
  «Volver al plan de siempre», con pregunta. «Ahora no» se recuerda **por cuenta en el teléfono** (`renaser.habitos.repetirSemana.descartada.<cuenta>` =
  `{ modelo, siguiente, huella }`): no reaparece mientras la huella de la semana modelo sea la misma; en otro teléfono puede salir una vez más. No hay
  notificación nueva: el recordatorio de los domingos abre Planificar como siempre. Mientras no se sabe no se dibuja nada (sin parpadeo); un fallo o un 204 no
  muestran nada. Doble toque: un solo envío.
* **Las alarmas del teléfono respetan lo «solo esta semana»** (`habits/notificaciones/**`, solo JavaScript). Una alarma `DAILY`/`WEEKLY` no puede saltarse una fecha
  (el mismo problema del #33), así que el hábito con fechas propias vigentes pasa al esquema por día y los **días de la semana afectados** dejan la alarma semanal por
  **alarmas de fecha** —una por aviso y por ocurrencia de ese día, desde hoy hasta la última fecha propia más dos semanas de cola, con el valor propio donde hay fila y el
  de siempre donde no—; los demás días siguen semanales. Identificadores: el primer aviso de cada día afectado conserva `habito-{id}-d{iso}-0` (la etiqueta del push de
  respaldo, spec 007) y el resto `habito-{id}-f{AAAAMMDD}-{n}`. Tope de 48 alarmas de fecha por hábito por esta vía (las más próximas primero). **Se revierte solo**: cuando
  ya no quedan fechas propias vigentes, la puesta al día (al abrir la app y al volver a primer plano) deja las `DAILY`/`WEEKLY` de siempre; guardar o deshacer en el
  editor y repetir reprograman en el acto (`utils/reprogramarLasAlarmas.ts` → `ajustarRecordatoriosAlServidor`). El puente del #33 y las repeticiones de la spec 009 leen
  la misma cuenta (`valoresDelDia`), así que respetan la hora, el aviso y «Cómo suena» de la fecha. `programar` sin `opciones.fechas` conserva las que el teléfono
  recordaba (`EsquemaGuardado.fechas`): guardar «todas las semanas» no las pierde. Sin fechas propias vigentes todo es **idéntico a hoy** (mismos identificadores y firma).
  **Límites aceptados**: (1) si la persona no abre la app en las dos semanas siguientes a la última fecha propia, ese día de la semana queda sin alarma hasta que la
  abra; (2) cuando suena una alarma de fecha, la siguiente puesta al día rehace el hábito; (3) un APK anterior no conoce las fechas propias (sus alarmas locales siguen como
  el plan de siempre; el push del servidor sí las respeta).
* **Plan → «Planificar mi mes»** (solo con el Mapa activo; `BotonPlanificarMes` debajo del objetivo de 90 días, `PlanDelMesModal`, `utils/mesDelPrograma.ts`): una hoja opcional
  con los **tres meses del programa** (`ControlSegmentado`, abre en el actual; semanas como las cuenta el servidor, D-203: lunes a domingo, trece, la 1 desde el Día 1 y la 13
  hasta el día 90), el **objetivo del mes del eje abierto** (cifra «Propuesta» o «Tu cifra», o el motivo si no hay cifra) y las **semanas del mes** con sus fechas, su estado
  («Revisada», «Esta semana», «Se arma el domingo», «Todavía no llega») y su objetivo semanal. «Cambiar» abre el mismo `EditarObjetivoDelMesModal` y guarda con
  `PUT /rocks/monthly/{eje}/{mes}` **para cualquiera de los tres meses** (hoy Plan solo ofrecía el mes en curso; el servidor ya lo aceptaba). Tocar la semana de ahora cierra la
  hoja y abre «Organizar mi semana» de siempre. **No se arman objetivos semanales de semanas que no llegaron**: la ventana del domingo no cambia. Nada lo exige ni lo
  recuerda. Sin backend nuevo.
* **No cambian**: Hoy, Comunidad y Yo; la hoja de cada dimensión salvo el control de alcance; las alarmas de Despertar de Yo → Alarmas; «Arma tu semana los domingos»; Plan salvo el botón y la
  hoja; las acciones de los objetivos (no se repiten); lo ya registrado, los puntos, la racha ni el semáforo; las pausas (no se repiten). Hoy y los días pasados nunca se cambian.
* **Hace falta publicar primero el backend** (V130 y V131 y los endpoints nuevos) **y un APK nuevo** (solo JavaScript: la app no se actualiza por aire). La app nueva contra el backend anterior
  no ofrece «Solo esta semana» ni la oferta (le falta `dateOverrides`) y Plan funciona igual; el APK anterior contra el backend nuevo sigue como hoy.
* **Pruebas**: Jest — `alcanceDeLaSemana`, `ofertaDeRepetir`, `useOfertaDeRepetirSemana`, `ofertaDeRepetirSemana`, `soloEstaSemana`, `fechasPropiasDeAlarmas`, `fechasPropiasEnElTelefono`,
  `mesDelPrograma`, `objetivoDelMesEnPalabras`, `planDelMes`, `botonPlanificarMes`, `useObjetivosSemanalesDelMes` y `planificarMiMesEnPlan`. Maestro, **escritos y sin correr** (sin emulador en esta
  entrega): `.maestro/planificacion/solo-esta-semana.yaml`, `repetir-la-semana.yaml` y `planificar-el-mes.yaml`.

## Corrección — 2026-10-31 — registro con foto: la foto no se pierde si Android mata la app con la cámara abierta, y «Reintentar» (issues #49 y #51)

* **Corrección — 2026-10-31 — registro con foto: la foto no se pierde si Android mata la app con la cámara abierta, y
  «Reintentar» (issues #49 y #51)**. Solo JavaScript: ni diseño, ni textos, ni tabs, ni código nativo. Lo que cambia y nada más:
  * **#49, la causa.** `getPendingResultAsync` de `expo-image-picker` (la recuperación que ya existía, `reanudarPendiente`)
    solo sirve cuando muere la ACTIVIDAD y el proceso sigue (la prueba de la documentación es «No conservar actividades»):
    Expo guarda ese resultado en una variable en memoria, y el resto de su estado solo lo anota en `onHostDestroy`. Cuando el
    sistema mata el PROCESO (poca memoria, `adb shell am kill`) no queda nada, y Android le entrega el resultado a la
    actividad nueva antes de que React esté listo, que lo descarta («Tried to access onActivityResult while context is not
    ready»). Lo único que sobrevive es el ARCHIVO que la cámara escribió en `cache/ImagePicker/` y la nota
    `fotoPendiente` (AsyncStorage) que se anota antes de abrir la cámara.
  * **#49, el arreglo** (`habits/utils/fotoHuerfanaDeLaCamara.ts`, `reanudarPendiente`): si hay nota vigente (30 min) y
    `getPendingResultAsync` no trae nada, se busca en esa carpeta la foto más nueva que la nota (con contenido, de imagen y
    escrita después de abrir la cámara), se procesa como cualquier foto de la cámara (JPEG a 1440 px, con la hora del
    archivo como `tomadaEn`) y vuelve la pantalla partida con ella; la original a resolución completa se borra. El resultado
    de Expo, cuando existe, sigue mandando. `HoyScreen` también llama a `reanudarPendiente` al montarse, porque al
    reabrirse la app cae en Hoy y Training no se monta hasta visitarlo (la nota se consume una sola vez: la retoma la
    primera pantalla que se monte). `fotoHuerfanaDeLaCamara.test.ts` vigila contra el código fuente de `expo-image-picker`
    que la carpeta sigue siendo `ImagePicker`. **Límites:** una foto de la GALERÍA (kilómetros) no se recupera: el
    selector del sistema no deja archivo propio hasta que Expo lo exporta en el proceso muerto; y si la persona cierra la
    cámara sin tomar nada no hay nada que recuperar (el archivo vacío que crea Expo se ignora).
  * **#51, lo que se pudo establecer.** El hook sí vuelve a subir en cada «Reintentar» (nueva dirección firmada, archivo leído
    otra vez, mismo PUT: probado con la subida y el hook enteros). El mismo texto para todo —`mensajeDeError` da el genérico
    a cualquier error que no sea `ApiError`— tapaba en qué paso fallaba, y no queda nada en logcat. **La causa del
    fallo visto en el emulador (después de quitar y reponer `adb reverse` del almacenamiento) NO se pudo reproducir ni
    confirmar sin el emulador**: queda por verificar con el E2E (flujo 13 de Maestro y, para el PUT a S3, la prueba manual
    que su cabecera explica). Leyendo el código de `expo/fetch` en Android no hay estado que se cachee tras un fallo.
  * **#51, lo que cambia:** (1) cada paso del envío (pedir la dirección de subida, leer el archivo, subir a S3, confirmar,
    cerrar) deja en el registro de la app `[evidencia] falló el paso «…»` con el error original (`enPasoDelEnvio`; no cambia
    el tipo del error ni lo que se muestra); (2) el PUT a S3 se repite hasta dos veces dentro del mismo envío (pausas de 0,5 y
    1,5 s) si la red se cae a mitad o S3 responde 5xx; un 4xx no se repite; (3) un archivo local que ya no existe (el `fetch` de
    Expo responde 404 «File not found» en vez de lanzar) ya no se sube como si fuera la foto. También vale para las fotos de
    las acciones del día (`subirArchivoAS3`).
  * **Pruebas:** `fotoTrasMorirElProceso.test.ts`, `fotoHuerfanaDeLaCamara.test.ts`, `subidaDeEvidencia.test.ts`,
    `reintentarTrasFalloDeRed.test.ts`; Maestro `regresion/12-foto-tras-matar-la-app.yaml` y `13-reintentar-sube-la-foto.yaml`.
  * **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-10-31 — tab `Training` → Tus prácticas: la dimensión abre Planificar directo

* **Cambio por pedido del dueño — 2026-10-31 — tab `Training` → Tus prácticas: la dimensión abre Planificar directo**
  (solo visual y de navegación; sin backend). Textual: «más simple, como dijiste: sacar lo de Planificar cuando entres a
  una categoría; no requiere nada de código backend, solo es visual». Eligió la opción A de la vista «Tus prácticas, sin la
  lista repetida»: la lista de hábitos salía dos veces (en el detalle de la dimensión y en «Planificar»). Lo que cambia y
  nada más:
  * **Tocar una dimensión en «Tus prácticas» abre DIRECTO la hoja «Planificar <dimensión>»** (`PlanificarDimensionModal`,
    `HojaDesdeAbajo tamano="completa"`, la de siempre: «Sin hora todavía» y «Tu día», interruptores, pausa «Solo hoy» /
    «Hasta que yo lo reactive», editor y «Crear un hábito»). Se quitó la pantalla del detalle intermedio con la tarjeta
    «Planificar Cuerpo», «Tus hábitos (N)» y «Aquí solo se planifica. Para registrar, vuelve a Training.». Cerrar la hoja
    (✕, arrastrar, el atrás del sistema, o guardar) vuelve a «Tus prácticas». La raíz sigue igual: «Arma tu semana los
    domingos» y las cinco dimensiones con su avance.
  * **«Cambiar nombre» pasó al editor del hábito**, solo en las dos bebidas renombrables (D-127: Agua tibia con limón y
    Jugo verde; misma regla `esRenombrable`, misma hoja `RenombrarHabitoModal` y mismo `useRenombreLocal`: guarda en el
    servidor y después en el teléfono). Va arriba del editor, junto al nombre que lleva el título de la hoja: `pencil` de
    18, texto de 16 y área de 48; dice «Cambiar o quitar el nombre» si ya tiene uno propio. `PlanificarDimensionModal`
    recibe `renombre` (prop opcional) y con el nombre propio lo muestra en el título del editor, en la fila de la lista,
    en «Pausar…» y en los avisos de guardado, sin recargar. Las alarmas siguen con el título del catálogo, como hoy.
  * **Vida y negocio** también abre la hoja; su aviso «Las acciones de tus objetivos se planifican en Plan, al agendarlas.»
    (el mismo texto de antes) lo dice ahora la hoja cuando la dimensión no tiene hábitos. Sin hábitos en otra dimensión
    sigue «Todavía no hay hábitos en esta dimensión.» con «Crear un hábito».
  * **El atrás del sistema sube un nivel por vez** (AGENTS.md §6): editor → lista de la hoja (la ‹ y el atrás de la hoja)
    → «Tus prácticas» (se cierra la hoja) → Training. `navegacionDePracticas` pierde el nivel de la dimensión y el de
    «planificando»: el estado es solo `{ abierta, dimension }`, y `dimension` con valor es la hoja abierta.
  * **Se borró** (sin uso): del detalle, todo el bloque de `PracticasDeTraining` (tarjeta «Planificar», lista de hábitos,
    «Cambiar nombre» y el `RenombrarHabitoModal` de ahí); de `PlanificarDimensionModal`, la prop `abrirEnHabitoId` y toda
    su maquinaria (`soloUnHabito`, `cargaVigente`, `editorDirectoAbierto`, `yaAbrioElHabito`,
    `habitoDirectoNoEncontrado`, `cerrarElHabitoDirecto` y el «Abriendo…»): solo la usaba «Tus prácticas». El aviso del
    teléfono que abre un hábito (`aperturaDesdeAviso.habitoAAbrir`) abre su fila en Training, no Planificar: no cambia.
  * **No cambia**: la hoja de Planificar por dentro (hora, días, «No hacerlo los…», recordatorio, cómo suena, guardar,
    pausa, crear un hábito: specs 008 a 011), la pantalla principal de Training, Plan, ningún pedido al servidor ni
    animación nueva (la hoja ya tenía las suyas).
  * **Pruebas**: `navegacionDePracticas.test.ts`, `practicasSinRegistro.test.ts` (la dimensión abre la hoja, sin detalle),
    `planificarCambiarNombre.test.ts` («Cambiar nombre» en el editor y el nombre nuevo en la lista) y Maestro
    `.maestro/training-por-hora/12-practicas-dimension-directo-y-cambiar-nombre.yaml` (se actualizaron también el 10,
    `regresion/08` y `comun/abrir-cuerpo.yaml`).
  * **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se
    actualiza por aire). Backend nuevo, ninguno.

## Cambio por pedido del dueño — 2026-11-02 — Training → Planificar: «Siempre | Por semana» con flechas, lo guardado marcado y menos texto

Pedido del dueño con la captura del editor de «Escritura libre nocturna»: «el de todas las semanas, si yo guardo el de semana debería de salir marcado,
cuidado; y dice todas las semanas, ¿a qué? debería deslizar hacia la derecha y poder planificar ¿no? arregla esa parte; y recuerda: mucho texto o entrada a
veces no les conviene». Eligió: `[ Siempre | Por semana ]`, `‹ Semana del 9 al 15 nov ›`, la fila de días con su punto, «Recordatorio» y
«Guardar 21:30 · semana 9–15 nov». Solo el editor de hábitos de **Training → Planificar** (`PlanificarDimensionModal`); Plan, Hoy, Yo y el control de
recordatorios de las acciones de los objetivos no cambian. Issues: **#95** (lo guardado no salía marcado) y **#94** (el nombre en «Qué se repite»).
Lo que cambia y nada más:

* **«Siempre | Por semana».** El control de alcance deja «Todas las semanas | Solo esta semana». **«Siempre» es exactamente lo de antes**: el plan de todas las
  semanas, con sus mismos pedidos, alarmas y pruebas (specs 008 a 011). **«Por semana»** guarda por fecha, como el «Solo esta semana» de la spec 028, pero de
  **cualquier semana por venir**, no solo de la en curso.
* **Pasar de semana** (`SelectorDeSemana`, `utils/semanasDelEditor`). Arriba de la fila de días: `‹  Semana del 9 al 15 nov  ›` (las flechas de 48 × 48 de
  «Tiempo libre»; apagadas en la primera y la última semana). También se pasa **deslizando la fila de días**: el dedo a la izquierda trae la semana siguiente; a la
  derecha, la anterior. Es un `PanResponder` (como el arrastre de `HojaDesdeAbajo`; Gesture Handler no está instalado) que solo toma el gesto cuando el dedo va
  claramente de lado y no lo suelta, así que no pelea con el desplazamiento vertical de la hoja ni con los toques en las pastillas. El cambio de semana es
  **instantáneo** (sin animación) y vibra con `tacto.seleccion()`. Va **desde la semana en curso** (el domingo, desde la que empieza) **hasta la última semana del
  programa de la persona**: su lunes ≤ `hoy + duración − día del programa` (90 días, 3 meses = 90 o 1 año = 365; `/home` manda `diaPrograma` y `duracionDias`, que
  `TrainingScreen` pasa por `PracticasDeTraining`; sin ellos solo se ve la primera semana). Hoy y lo pasado siguen con candado (solo existen en la primera
  semana). **Cada semana se lee una sola vez** (`GET /habit-preferences/{id}/week?weekStart=`, al llegar a ella; memoria de la apertura del hábito): ir y volver
  no repite el pedido. Mientras se lee, la fila se ve atenuada y no se pasa a otra; si falla, se vuelve a la anterior y se dice. Tras guardar se vuelve a leer **esa**
  semana; cambiar el plan de siempre vacía lo leído.
* **Guardar vale SOLO para la semana que se ve** (`PUT …/week`, la misma regla de «solo lo tocado», todo o nada). El botón dice `Guardar 21:30 · semana 9–15 nov`
  (con algunos días: `Guardar aviso · sáb, dom · semana 9–15 nov`); la confirmación, `Queda a las 21:30 todos los días de la semana 9–15 nov.`. **Lo tocado en una
  semana no se lleva a otra**: pasar de semana suelta el aviso, «Cómo suena» y la fila de «Otra», y la rueda vuelve a donde arrancó (supuesto, ver abajo).
* **Lo guardado sale marcado (#95).** Al abrir un hábito, si alguna semana por venir ya tiene cambios propios de ese hábito (las fechas con fila propia que
  `GET /habit-preferences` manda en `dateOverrides`: las de hoy o pasadas no cuentan), el editor abre en **«Por semana», en esa semana** (la más cercana con
  cambios; si es la en curso, esa), con sus días marcados con el punto (`marcaDelDia`; su etiqueta dice «cambiado solo esta semana») y con sus valores (hora,
  aviso, «Cómo suena»). Sin cambios propios abre en «Siempre». Si esa lectura falla, queda en «Siempre» sin diálogo. Al pasar a otra semana con cambios, también se
  ven marcados.
* **Menos texto.** Se quitaron: «Toca un día para darle su propia hora, aviso y alarma. Hoy y lo pasado van con candado.» (y sus variantes sin aviso/alarma), «Solo
  sáb, dom, todas las semanas. Hoy no cambia.», «Solo esta semana: los días que faltan. Tu plan de siempre no cambia. Hoy y lo pasado van con candado.», «Cambiado
  solo esta semana: sáb, dom», el rótulo «Toda esta semana» con su enlace, «Cargando esta semana…» y «Este hábito no corre en los días que faltan de esta semana. Hoy
  y lo pasado van con candado.» (ahora, en una línea: «Sin días por cambiar esta semana.»). Con **«Sin aviso»** (o el hábito apagado ese día) **«Cómo suena» no se
  dibuja** (antes, atenuada con «Este hábito no tiene aviso / Elige un aviso en Recordatorio…»). Quedan los rótulos (`MicroLabel`), la fila de días, el punto y los
  botones; el aire entre bloques es el de siempre (el rótulo «Recordatorio» ya llevaba su propio margen). «No hacerlo los sáb, dom · semana 9–15 nov» y «Volver
  a hacerlo…» dicen la semana; «Volver al plan de siempre los sáb» se queda.
* **Backend** (`PlanDeLaSemanaService`, spec 028 al día): `GET` y `PUT …/week` aceptan cualquier semana por venir cuyo lunes caiga **dentro del programa de la
  persona** (la misma cuenta que usa repetir la semana); **400 después de su último día**, sin escribir nada. La semana en curso y las pasadas no se acotan. Sin tablas
  nuevas. Hace falta publicar el backend antes: con el anterior, «Por semana» acepta cualquier fecha (sin tope) y la app igual no ofrece más allá del programa.
* **Alarmas del teléfono con semanas lejanas** (`habits/notificaciones/**`, sin cambios de código): el servidor manda en `dateOverrides` las fechas con fila propia
  de los **próximos 20 días**, y la puesta al día (al abrir la app y al volver a primer plano) arma con ellas las alarmas de fecha (tope de 48 por hábito, las más
  próximas primero). Un cambio en una semana lejana ya se respeta cuando entra en esa ventana; las alarmas semanales de antes de esa fecha pasan a ser de fecha con los
  valores de siempre. **Límites aceptados**: (1) un cambio de una semana que está a más de 20 días solo llega a las alarmas del teléfono cuando entra en la ventana y la
  persona abre la app; antes suena la alarma de siempre (el push de respaldo del servidor sí lo respeta); (2) con dos o tres semanas completas planificadas, el tope de 48
  gasta las alarmas en los días planificados y la «cola» de siempre vuelve cuando se abre la app.
* **#94**: «Repetir tu semana» → «Ver qué se repite» escribe el nombre del hábito en tipo oración (`tituloEnTipoOracion`), como el resto de la app.
* **Supuestos a confirmar con el dueño**: (1) pasar de semana **descarta** lo que se tocó sin guardar (en vez de llevarlo a la otra semana), para que un guardado
  nunca caiga en una semana distinta de la que se mira; (2) el editor abre en la **semana más cercana con cambios** (no solo la en curso), para que lo guardado en
  una semana que viene tampoco se pierda de vista; (3) la lectura de lo ya guardado cubre los próximos 20 días (la ventana de `dateOverrides`): un cambio más lejano
  se ve al navegar hasta esa semana; (4) las flechas son las de «Tiempo libre» (`arrowLeft`/`arrow`), no el `chevron`.
* **No cambian**: «Siempre» (hora, días, aviso, «Cómo suena», alarmas, pedidos), «Tus prácticas» y la tarjeta «Repetir tu semana», Plan (incluido «Planificar mi mes»),
  los demás tabs, la barra ni las animaciones (sin animación nueva). Sin dependencias ni código nativo.
* **Pruebas**: Jest `semanasDelEditor` (las semanas hasta el final del programa, abrir en la semana con cambios, el deslizamiento), `planificarPorSemana` (pasar de
  semana, una lectura por semana, guardar solo esa semana, lo guardado marcado al reabrir, menos texto), `alcanceDeLaSemana`, `soloEstaSemana` y `planificarComoSuena`
  (ajustadas), `fechasPropiasDeAlarmas` (semanas lejanas y el tope) y `ofertaDeRepetirSemana` (#94); backend `PlanDeLaSemanaServiceTest` y `PlanificacionDeLaSemanaIT`.
  Maestro, escritos y sin correr: `.maestro/planificacion/` (`solo-esta-semana` y `repetir-la-semana` adaptados y sin esperar los avisos de 3 s;
  `por-semana-con-flechas-y-deslizando` y `lo-guardado-sale-marcado` nuevos).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) **y el backend con esta ampliación antes**.

## Corrección — 2026-11-02 — Training dice cuándo empieza el programa de quien empieza mañana (issue #101)

E2E final del 2026-11-02: a quien activó su programa y su Día 1 es mañana (fila con `programa_activado_en` hoy; spec 036), Training le mostraba
un día cualquiera —«Hoy no tienes nada planificado.», la semana, un evento y la ayuda— con ~65 % de la pantalla en blanco, mientras Hoy y Plan decían
«Tu programa empieza el martes 3 de noviembre». Causa: `useArranqueDelPrograma` da a quien empieza mañana `EN_CURSO` con la fecha (D-103: ya puede
organizar), y Training solo avisaba a quien empieza pasado mañana o más tarde (`ESPERANDO_INICIO`). Lo que cambia y nada más:
* **Una fila arriba, pegada a la cabecera de Training**, con la MISMA fila y el MISMO texto de Hoy y Plan: `FilaDelProgramaQueEmpieza`
  (`FilaCompacta`, ícono `calendarRange`, sin chevron: no lleva a nada) con «Tu programa empieza el martes 3 de noviembre» —o «Tu programa empieza
  pronto» si el servidor no mandó la fecha: no se inventa una—. El texto sale de `vistaDelProgramaQueEmpieza` (`programa/utils/filaDelPrograma`), la
  única frase que usan Hoy, Plan (por `vistaDeLaFilaDelPrograma`), Training y Yo (issue #102). Quién la ve lo decide `programaQueEmpieza` (pura):
  `inscrito`, día 0 y `EN_CURSO`. Con el programa en marcha, sin fila, mientras se comprueba, con el aviso de «Todavía no empezaste tu programa» o el de
  «Tu programa arranca pronto» (pasado mañana o más), no se dibuja. Con el programa en otra formación tampoco.
* **No cambia**: la lista del día, la semana, «Tus prácticas» (siguen habilitadas: quien empieza mañana organiza hoy, D-103), el aviso de quien empieza
  pasado mañana, ni ningún pedido al servidor (la fila usa la lectura que Training ya hacía). Sin animación nueva.
* **Pruebas:** `trainingDiceCuandoEmpieza.test.ts` (`programaQueEmpieza`, el texto compartido, la fila y que `TrainingScreen` la dibuja arriba de la lista).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Corrección — 2026-11-02 — Training → Planificar: «Por semana» abre en la semana con el cambio guardado, también al volver de «Siempre» (issue #106)

El dueño pidió que lo guardado por semana «salga marcado» (issue #95). Al abrir un hábito ya abría en «Por semana», en la semana con el cambio; pero al pasar de «Siempre»
a «Por semana» con el editor abierto (`cambiarAlcance`) abría SIEMPRE en la primera semana, y si el cambio estaba en otra el punto no se veía. Hallado en el E2E del
02/11 con `planificacion/lo-guardado-sale-marcado`. Lo que cambia y nada más:
* **Regla única** (al abrir el hábito y al pasar de «Siempre» a «Por semana»): «Por semana» abre en **la primera semana editable que tenga un cambio guardado** de ese hábito
  (`primeraSemanaConCambiosPropios`: las fechas con fila propia de `dateOverrides`, sin contar hoy ni lo pasado); **si no hay ninguna, en la primera editable**, como siempre.
* **Cuenta lo guardado en la misma sesión:** tras guardar, el editor relee las preferencias, así que «Siempre» y de vuelta ya abre en esa semana.
* **No cambia** el resto del editor, lo que se guarda ni ningún pedido al servidor (la semana se lee con la misma lectura de siempre).
* **Pruebas:** `planificarPorSemana.test.ts` («Por semana» abre en la semana con el cambio guardado): vuelve a la semana del cambio, con varios cambios abre en el primero editable,
  un cambio de hoy o pasado no cuenta, sin cambios abre en la primera, y lo recién guardado también cuenta. Maestro `planificacion/lo-guardado-sale-marcado` ajustado a la regla.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Corrección — 2026-11-02 — Training abre en MAÑANA en el Día 0 (issue #107)

E2E final del 2026-11-02: a quien su programa empieza mañana, Training le abría en HOY, con la lista vacía («Hoy no tienes nada planificado.») y media pantalla en blanco, aunque ya
tenía lo planificado para mañana. El #101 puso arriba la fila «Tu programa empieza el …»; esto hace que además abra donde hay algo que ver. Lo que cambia y nada más:
* **En el Día 0, Training abre en mañana**, con la vista de un día que viene que ya existía (lo planificado de ese día, sin botones ni toques; las horas y las acciones se piden
  al abrir, una vez por semana y cuenta, como al tocar cualquier día que viene). Arriba sigue la fila «Tu programa empieza el …» y la persona puede tocar hoy cuando quiera.
* **Cuándo:** solo si el Día 1 es EXACTAMENTE mañana (`diaInicialDeTraining`, pura: la fecha de inicio que ya lee `programaQueEmpieza`). Sin fecha («Tu programa empieza pronto»),
  con el programa ya en marcha o empezando hoy o pasado mañana, abre en hoy como siempre. **El domingo se queda en hoy:** Training muestra la semana que se VIVE (de lunes a
  domingo) y mañana ya es de otra, que no se ve.
* **Una sola vez por día** (`useDiaInicialDeTraining`): si la persona toca hoy, no se la vuelve a llevar a mañana; al pasar la medianoche se decide de nuevo. Si eligió otro día antes
  de que llegara la fecha de inicio, tampoco se le cambia.
* **No cambia** la fila, la lista de hoy, «Tus prácticas» (siguen habilitadas, D-103) ni ningún pedido nuevo al servidor.
* **Pruebas:** `useDiaInicialDeTraining.test.ts` (la función pura, el hook y el cableado de `TrainingScreen`).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Corrección — 2026-11-04 — las fotos de muchos megapíxeles ya no dan «No se pudo procesar la foto» (issue #120)

Un usuario no podía subir la foto de un hábito que había creado: «No se pudo procesar la foto · Prueba a sacarla de nuevo.». No dependía de que el
hábito fuera propio (uno propio tiene evidencia opcional y abre la hoja genérica, que usa el procesamiento de foto de todos): fallaba con fotos
de 50 y 108 MP, de forma intermitente según la memoria libre. **Causa:** en Android `ImageManipulator.manipulate(uri).resize(..).renderAsync()`
decodifica la foto ENTERA y recién después la achica (108 MP son ~430 MB de bitmap); con poca memoria se cancela
(`Context.renderAsync has been rejected … JobCancellationException`) y el `catch` de cada pantalla lo volvía ese aviso sin registrar nada. El código era
el mismo en 1.5.0, 1.6.0 y 1.7.1. Lo que cambia y nada más (solo JavaScript: `expo-image` y `expo-image-manipulator` ya vienen en la app):
* **`src/utils/reducirFoto.ts`**: carga la foto YA achicada (`Image.loadAsync(uri, { maxWidth })` de expo-image, que muestrea al decodificar) y se la
  pasa al manipulador, que le da la medida exacta, endereza el EXIF y guarda el JPEG. Si falla, reintenta a 60 % y a 35 % del tamaño antes de
  rendirse, y deja cada fallo en el registro (`[foto] no se pudo achicar a … px: <causa real>`). En la web se deja como estaba (el navegador no tiene
  este problema).
* **Los seis lugares que decodificaban la foto entera la usan**: evidencia de hábitos (`habits/utils/capturarEvidencia`), chat, Muro
  (`community/utils/normalizarImagen`), Caja (`caja/utils/subirImagen`), foto de perfil y portada de bienvenida (`auth/utils/elegirFotoDePerfil`) y portada
  de eventos. Mismos anchos máximos, calidades y textos de siempre; la foto sale igual y derecha (EXIF), solo que sin armar el bitmap grande.
* **Comprobado en el emulador** (Pixel 6, backend local): con el código anterior las fotos de 50 y 108 MP fallaban; con el nuevo, 8 de 8 seguidas
  con la de 108 MP, Glide carga a 1440 px en ~125 ms (antes el bitmap completo en ~1,3 s), la orientación EXIF se conserva y el hábito propio se
  entrega y queda `COMPLETADO`.
* **Pruebas:** `reducirFoto` (carga achicada, reintentos, error final, `release`, web) y `elegirFotoCuadrada` (ajustada).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Cambio por pedido del dueño — 2026-11-10 — Entrenar pide primero lo esencial

Al abrir Entrenar salían 10 pedidos juntos (12 en los primeros 5 s). El dueño eligió «primero lo esencial»; sin cambios visibles:
* **Primera tanda** (dibuja la lista): hábitos, preferencias, desbloqueos, el día (`today/snapshot`), las acciones de hoy y el Día N
  (`home`). Sale `cargarEntrenamiento`, ahora con 5 pedidos.
* **Segunda tanda**, apenas la lista está: la evidencia de las acciones (`cargarEvidenciasDeRocas`; mientras llega, el sello de antes,
  así un refresco no parpadea), el estado de la Pastilla (`useEspiritu({ esperar })`) y los eventos de la semana.
