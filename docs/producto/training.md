# Training (hábitos y Planificar) — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

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

## Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Training` y `Hoy`, registro con foto.

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tabs `Training` y `Plan`.

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
