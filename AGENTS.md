# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

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

## Corrección autorizada — 2026-10-19 — Código Renaser sin parpadeo y con el 409

Pedido del dueño: arreglar dos fallos del Código Renaser (días 1–7, sobre Hoy) vistos en el emulador.
Lo que cambia y nada más: (1) mientras no se sabe si la hora en curso ya se respondió —primera lectura
de `GET /api/v1/radar/latest`, y cada recarga al cambiar de hora, fecha o cuenta, o al volver el radar
tras el Mapa— el estado del radar es `cargando` y no `abierto`: el formulario (`CodigoRenaserModal`) no se
abre y no se anota la capa obligatoria; la tarjeta de Hoy no dibuja nada hasta tener la lectura. Si la
lectura falla (red, 5xx) se abre igual, sin parpadeo; un 403 sigue apagando. Antes el formulario se abría y
se cerraba ~300 ms después, y en Android dejaba una ventana vacía y oscura sobre Hoy hasta recargar la app.
(2) El backend rechaza con 409 un segundo registro en la misma hora (índice `radar_un_registro_por_hora`):
la app relee `/radar/latest` y, si cae en la hora en curso, lo da por registrado (el formulario se cierra y
la tarjeta dice «Registrado», sin anunciar puntos); si no lo confirma, muestra un aviso propio en vez del
texto genérico del servidor. No cambian el diseño, los textos de la tarjeta ni del formulario, las
preguntas, los horarios ni los tabs. No hace falta backend nuevo; sí hace falta un APK nuevo (la app no se
actualiza por aire).

## Corrección autorizada — 2026-10-27 — los recordatorios de un hábito cumplido ya no suenan ese día (issue #33)

Pedido del dueño: «Despertar cumplido a las 06:00 y la alarma de las 06:30 suena igual; con avisos de 30, 10 y a la hora,
cumplir tras el primero no apaga los que faltan». El backend no es la causa (`AvisoHabitoService` no manda push de respaldo de
un registro terminado): es la alarma local. Las de un hábito se repiten solas (`DAILY` por antelación, o `WEEKLY` por día,
specs 007–009) y una alarma que se repite no deja saltar un día: cancelarla borra la de mañana, y dejarla puesta la deja sonar.
Al cumplir solo se cancelaban las repeticiones +5/+10 (spec 009). Lo que cambia y nada más:
* **Un hábito cumplido hoy no suena nada más ese día, y mañana suena normal.** Al confirmar el servidor el cierre
  (`alCumplirElHabito`, en `habits/notificaciones/repeticiones.ts`): (1) se anota que el hábito se cumplió en ese día
  (`cumplidoDeHoy.ts`, `renaser.habitos.cumplido.<cuenta>.<hábito>` = `{ dia, puenteDe }`; se borra al cerrar sesión);
  (2) se atiende como siempre (las repeticiones de hoy se cancelan y no vuelven); (3) si el hábito tiene alarmas en este
  teléfono y a ese día todavía le queda algún aviso, se lee `GET /habit-preferences` —lo mismo que lee la puesta al día— y se
  vuelven a poner SOLO las alarmas de ese hábito (`ajustarRecordatoriosAlServidor`), que con la nota reemplaza las que se
  repiten por un **puente**: una alarma de FECHA por cada aviso de los 7 días siguientes, saltando hoy
  (`utils/puenteDeAlarmas.ts`, puro; `ponerElPuenteSiHoyYaSeCumplio`). Mismo texto, canal, ruta y datos («cómo suena»,
  `data.alarma`). Si ya sonaron todos los avisos de hoy no se toca ninguna alarma (no se gasta el puente); un hábito sin
  alarmas en el teléfono no hace ningún pedido.
* **Identificadores.** En el esquema por día el puente usa los mismos de siempre, `habito-{id}-d{1..7}-{n}` (una ventana de 7
  días no repite ningún día de la semana); en el diario, el primer aviso lleva `habito-{id}-inicio` y los demás
  `habito-{id}-pte-{AAAAMMDD}-{n}` (una alarma de fecha por día no puede compartir identificador). Así el tag del push de
  respaldo del servidor (spec 007) sigue juntándose con la alarma en la bandeja, y volver al esquema normal con el mismo
  identificador REEMPLAZA la alarma en vez de duplicarla. Los ids del puente se guardan con los del hábito
  (`renaser.habitos.recordatorio.*`): `cancelar`, el cambio de sonido de Yo → Alarmas, `ponerLasAlarmasDeHabitosEnSuCanal`,
  el aviso agrupado (E-410), el rearmado de la spec 007 y `alarmasVivas` lo tratan como cualquier otra alarma de fecha.
* **Cómo se revierte.** La regla es «puente armado si y solo si el hábito se cumplió HOY y le quedan avisos por sonar»
  (`puenteQueCorresponde`). La puesta al día que corre al abrir la app y al volver a primer plano compara lo armado con lo que
  corresponde (`hayQueConciliarElPuente`) y, si no coincide, vuelve a poner las alarmas del hábito aunque nada más haya
  cambiado: al día siguiente —o el mismo día, cuando ya sonaron todos los avisos— deja las `DAILY`/`WEEKLY` de siempre. Mientras
  coincide no toca nada (no cancela y pone en cada apertura). Converge también si el cumplido llegó mientras corría otra puesta
  al día, o sin red (la nota ya quedó; solo se pierde el apagado inmediato).
* **Reprogramar el mismo día.** `programar` y `programarConCambioDiferido` leen la nota: si Plan mueve la hora, Training guarda el
  editor, Yo → Alarmas toca Despertar, o se apaga y se vuelve a encender el aviso el mismo día en que ya se cumplió, hoy no vuelve
  a sonar. `cancelar` quita el puente (sus ids van con los del hábito) y lo marca desarmado, pero deja la nota de «se cumplió hoy».
* **El día es el del HÁBITO.** El aviso `habitoCumplido` trae ahora `fecha` (la `fechaEjecucion` del registro, `YYYY-MM-DD`). Un
  hábito se cumple a veces pasada la medianoche —Dormir a las 00:40 es del día anterior—: eso no apaga lo que le queda al de hoy,
  ni sus repeticiones (`atenderHabito` recibe el día). Los avisos se atribuyen al día del hábito, no al instante en que suenan: el de
  las 23:40 de esta noche de un hábito a las 00:10 es el de mañana y el puente lo conserva. «Hoy» para las alarmas es el del reloj del
  teléfono, como siempre.
* **Otros caminos de cumplir.** La Pastilla Renacer y la Clase diaria cierran por su propio endpoint y no emiten `habitoCumplido`
  (tampoco las celebraciones): `TrainingScreen` llama a `alCumplirElHabito` directamente al confirmar el servidor, con el
  `habitoId` y la `fecha` del registro vigente. La Audioterapia, Despertar/Dormir, el registro con foto y SER ya pasaban por
  `completarRegistro`.
* **Acciones de los objetivos (spec 010).** Al sellar una acción (`sellarRocaDiaria`) también se cancela su aviso «antes de la
  acción» que todavía no sonó (`cancelarElAvisoDeLaAccion`: son alarmas de fecha de esa acción), además de sus repeticiones. Las
  entradas guardadas se dejan: una lista leída antes del sello no vuelve a programarlas, y la primera que ya trae la acción
  cumplida las limpia. El recordatorio diario general y las demás acciones no se tocan.
* **No cambian**: ningún diseño, texto ni tab; los canales (`-vib`/`-sinvib`), las voces, «cómo suena», «Repetir si no la atiendo»
  y sus «atendidas», el rearmado de la spec 007, `ponerLasAlarmasDeHabitosEnSuCanal`, el aviso agrupado, cerrar sesión (suelta las
  alarmas y la nota), el push de respaldo del servidor ni el backend. Un hábito no cumplido suena exactamente igual que antes.
* **Compatibilidad.** Sin backend nuevo. Contra un servidor que no manda `weekdays` ni `alarm`, o una app sin permiso de avisos,
  se comporta como antes (sin permiso no arma nada). La nota y el puente son locales: no viajan.
* **Límites aceptados.** (1) Si la persona no abre la app en 7 días después de cumplir, el puente se acaba (como las
  repeticiones); la primera apertura lo revierte. (2) Un hábito cumplido desde OTRO teléfono o la web, o que el servidor cierra por su
  cuenta (el post diario al publicar), no avisa a este: sus alarmas de hoy suenan igual. Leer los registros de hoy en cada puesta al
  día sumaría un pedido por apertura; no se hizo. (3) Con el puente, un aviso de fecha de un hábito y la diaria de otro a la misma
  hora no se juntan en un solo aviso (E-410 solo junta el mismo tipo de disparador): Android puede callar el sonido del segundo hasta
  que la puesta al día revierte el puente. (4) El peor caso son 7 alarmas de fecha por aviso de cada hábito cumplido ese día
  (Android admite unas 500 por app). (5) Si `GET /habit-preferences` falla justo al cumplir, el apagado espera a la próxima puesta
  al día (que corre al volver a primer plano, con 10 min de intervalo mínimo).
* **Pruebas:** `puenteDeAlarmas.test.ts` (qué le queda a hoy, el puente, los identificadores), `habitoCumplidoSilenciaAlarmas.test.ts`
  (cumplir apaga el resto de hoy en el esquema diario y por día, mañana suena normal, reprogramar el mismo día, cumplir pasada la
  medianoche, cambio de sonido, rearmado, aviso agrupado y cerrar sesión), `habitoCumplido.test.ts` (el aviso trae el día) y
  `sellarRocaYRepeticiones.test.ts` (el aviso de la acción sellada).
* **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por aire).

## Corrección — 2026-10-31 — un aviso de inicio de hábito ya no se muestra ni se queda en la bandeja después de su hora (issue #40)

El 28/10 llegó a las 8:58 un aviso de GIMNASIO que decía «te toca a las 07:00». **Esa vez la causa fue el push de respaldo del
servidor** (el dueño nunca configuró un recordatorio para ese hábito, así que el teléfono no tenía ninguna alarma local; el push
salía sin `expiration` y FCM lo guardó; ya arreglado en el backend, #22/#23). En la app no había una causa de ese caso; lo que sí
había son dos huecos reales para las alarmas locales atrasadas: `ExpoSchedulingDelegate.triggerNotification` muestra la alarma sin
mirar qué tan tarde llegó (sin el permiso «Alarmas y recordatorios» es inexacta: el rearmado documenta `window=+1h` y el e2e del
26/10 midió `+40m59s`), y nada quita de la bandeja un aviso cuya hora ya pasó. Regla (la misma que el dueño aceptó para el
servidor, FR-015): **un aviso de inicio vale hasta la hora del hábito; después no se muestra.** El hábito se sigue registrando todo
su día (D-259). Lo que cambia y nada más (ni diseño, ni textos, ni canales, ni sonidos):
* **Al entregarse (Android, parche de `postinstall`):** `scripts/arreglar-aviso-tardio.js` parcha `triggerNotification`. El aviso
  de inicio lleva ahora `data.vigenteMin` (su antelación + 2 min de gracia, `vigenciaDelAvisoMin`); si el atraso desde su hora
  nominal lo pasa, no se muestra, y la alarma diaria o semanal se vuelve a armar igual para mañana. Sin `vigenteMin` (eventos,
  acciones, Código Renaser, repeticiones, prueba de sonido) todo es como siempre. **El Kotlin no se compiló al escribirlo**: se
  valida al armar el APK. Convive con el parche de las alarmas tipo despertador (otras líneas, cualquier orden; este va antes en
  `postinstall` y el otro sigue de último).
* **Las ya programadas lo reciben solas:** el rearmado que corre al abrir la app (`planDeRearmado`) le pone `vigenteMin` a los
  avisos de inicio que se programaron antes, sin cambiar su hora, su identificador ni su texto.
* **Al abrir la app o volver al frente (JavaScript):** `limpiarAvisosVencidos` (en `RearmadorDeAlarmas`, sin el intervalo de 10 min)
  quita de la bandeja los avisos de inicio cuya hora ya pasó y los de un hábito cumplido ese día (nota de `cumplidoDeHoy`, issue
  #33). Los reconoce por su cuerpo «Te toca a las HH:mm.» y su ruta `/habitos/…`, así que alcanza también a los que mostró una versión
  anterior y a los de un grupo de avisos (E-410). Un hábito de después de la medianoche solo se quita al vencer, no por cumplido.
* **No se tocan:** las repeticiones («Te tocaba a las …»), las acciones de los objetivos, los eventos, los mensajes ni los push del
  servidor (esos los cubre su `expiration`).
* **Supuestos a confirmar con el dueño:** la gracia de 2 min (sin ella, el aviso «a la hora» se descartaría por llegar a las 07:00:03;
  con ella, un Despertar sin el permiso de alarmas exactas que llegue más de 2 min tarde ya no se muestra) y que la regla valga
  también para Despertar.
* **Pruebas:** `vigenciaDelAviso`, `vigenciaEnLasAlarmas`, `limpiarAvisosVencidos` y `avisoTardio` (el parche, sobre un paquete falso).
  Maestro: `.maestro/aviso-tardio/01-limpiar-la-bandeja.yaml`.
* **Hace falta un APK nuevo** (código nativo parchado). Sin backend nuevo.

## Decisión del dueño — 2026-10-31 — Alarmas silenciosas: se quita la hoja «Tu teléfono cerró Renaser»

Textual, viendo la hoja «Tu teléfono cerró Renaser» («Por eso no sonaron tus alarmas. Ya las volvimos a poner. Para que tus alarmas no se
borren, en Batería elige «Sin restricciones» y no cierres Renaser a la fuerza.», con «Arreglarlo» y «Ahora no»): «creo que el usuario no debe
saber esto… no me gusta… ¿no hay otras opciones, como lo hace WhatsApp, Facebook, Instagram, TikTok?». Eligió **«Silencioso, como WhatsApp»**.
Spec 007 (2026-10-19) corregida; solo la app. Lo que cambia y nada más:
* **Se quitó la hoja** `AvisoDeAlarmasBorradas` (y su montaje en `App.tsx`), con lo que solo servía para decidir si mostrarla:
  `detencionForzada.ts`, `alarmasVivas.ts` (la «foto» de si las alarmas siguen vivas), `esperarLaPuestaAlDia` y el paso 0 de
  `ponerAlDiaLasAlarmas` (`fotoDeLasAlarmas`). Nada le dice a la persona que el teléfono cerró la app.
* **El rearmado sigue igual y en silencio** (`RearmadorDeAlarmas`, `rearmarAlarmas.ts`, `ponerAlDiaLasAlarmas`): al abrir la app y al volver a
  primer plano, con su intervalo de 10 min. El push de respaldo del servidor (`habito-{id}-inicio`) cubre el primer aviso de cada hábito
  mientras tanto. No cambian los canales, las voces, «cómo suena», las repeticiones ni el aviso agrupado.
* **Se quitó la oferta preventiva** «Un ajuste para tus alarmas» (`guiaPreventiva.ts`, `pedidoDeLaGuia.ts`) al guardar un recordatorio en
  Training → Planificar (`PlanificarDimensionModal`). El pedido del permiso «Alarmas y recordatorios», cuando hace falta, **sigue igual**.
* **Yo → Alarmas: la guía de batería queda, en positivo** (`GuiaDeBateria`, `data/guiasPorMarca.ts`): título «Para que tus recordatorios
  suenen siempre» (19 px, negrita), la línea de la marca del teléfono y el botón **«Revisar»** (52 de alto; era «Abrir ajustes»), que abre lo
  mismo que antes (la pantalla de la marca, o la lista de batería, o los ajustes de Renaser: `abrirGuiaDeLaMarca`). La línea de una marca
  desconocida pasó de «Para que tus alarmas no se borren, en Batería elige «Sin restricciones» y no cierres Renaser a la fuerza.» a «En Batería,
  elige «Sin restricciones» para Renaser.»: sin culpar al teléfono ni pedir «no cierres la app a la fuerza». Las líneas de Honor, Huawei,
  Xiaomi, Samsung, Oppo y Vivo no cambian. Quieta, sin animación (se ve de vez en cuando y quien llega ahí la está buscando). El aviso de
  «Alarmas y recordatorios» de arriba no se tocó.
* **Módulo nativo `renaser-alarmas`: no se tocó** (borrar sus funciones exigiría un APK nativo nuevo). JavaScript ya no llama a
  `detencionForzadaDesde` ni a `proximaAlarmaPropia` (se quitaron sus envoltorios y `marcaQueDetieneApps`); el Kotlin las conserva sin uso.
* **Almacenamiento:** nada escribe ya `renaser.alarmas.detencionRevisada.`, `renaser.alarmas.avisoDetencion.` ni
  `renaser.alarmas.guiaPreventiva.`. Se dejan en la lista de lo que se borra al cerrar sesión (`alarmasDeLaCuenta.ts`) solo para no dejar
  restos en los teléfonos que ya las tenían; se pueden quitar de esa lista cuando ya no queden versiones anteriores en uso.
* **Pruebas:** se borraron `avisoDeAlarmasBorradas`, `guiaPreventiva`, `detencionForzada` y `alarmasVivas`; `esperarLaPuestaAlDia.test.ts` pasó a
  `puestaAlDiaConLaCuentaQueEntra.test.ts` (conserva lo que no era de la hoja); `guiaDeBateria`, `guiasPorMarca`, `moduloNativoDeAlarmas`,
  `alarmasDeLaCuentaAlSalir` y las de Planificar (`planificarDimension` y tres más) se ajustaron. Maestro, escritos y sin correr:
  `.maestro/alarmas-silenciosas/` (cerrar a la fuerza y reabrir sin hoja; Yo → Alarmas con el texto nuevo).
* **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por aire). Sin backend nuevo.

## Decisión del dueño — 2026-10-30 — Mentoría del Alquimista solo con semáforo verde (sin cambios en la app)

Textual: «en eventos, si eres aprendiz solo te saldrá la mentoría con alquimista si tienes semáforo verde». El filtro es 100 % del
servidor (backend spec 020, D-293, cierra D-213): lista, calendario, «Mi agenda», «Próximo evento» de Hoy, detalle, «Voy» y avisos. La app no
cambia ni suma textos: un aprendiz sin verde deja de recibir la mentoría en `GET /calendar/events` y en `/home → proximoEvento`; si abre
su detalle recibe el 403 de siempre («Este evento ya no está disponible…»), y la alarma local de un «Voy» se quita sola en la
siguiente lectura (`planDeSincronizacion`). No hace falta APK nuevo. Flujos de Maestro: `.maestro/mentoria-semaforo/`.

## Corrección — 2026-10-31 — la guía de arranque de SER ya no se monta sobre el panel de SER (issue #50)

E2E del 29/10: con una cuenta sin el Pacto firmado, la guía de arranque (`SparkieOverlay`, la burbuja «✳ SER») apareció encima
del panel de SER y su «Ahora no» no respondía (solo el «atrás» la cerraba). Dos causas en el código, ambas arregladas; no cambian
diseño, textos, ni la secuencia saludo → primer post → Pacto. Lo que cambia y nada más:
* **La guía espera al panel.** El panel y la guía son dos `Modal` y en Android el que se crea después queda encima. El panel de SER
  (`RenasiaPanel`, el del botón flotante, el orbe de Hoy y el botón del curso) se anota mientras está a la vista
  (`renasia/state/panelDeSerAbierto`, un contador como `chatEnPantalla`) y la tarjeta de la guía no se dibuja mientras haya uno:
  no se minimiza ni se pierde, vuelve al cerrar el chat. Mientras tanto no intercepta el «atrás» (es del panel). Una guía
  que espera sigue contando como capa obligatoria (D-218): un aviso del teléfono sigue esperándola.
* **Una guía pospuesta no se reabre sola.** `SparkieOverlay` volvía a abrirla ante CUALQUIER cambio de `estado.paso`, y
  `useArranqueGuiado` cae en «ninguno» ante cualquier lectura fallida (lo más común al volver de la cámara o de segundo plano) y
  vuelve a «publicar» en la lectura siguiente. Ahora solo la reabre un avance real («publicar» → «firmar el Pacto»), o entrar con
  otra cuenta (`sparkie/utils/tarjetaDelArranque`, puro).
* **Las lecturas del arranque se ordenan.** Si dos quedaban en vuelo (el sondeo de 8 s y el regreso de segundo plano), la que
  llegaba última pisaba a la más nueva. Ahora solo escribe la más reciente, y firmar el Pacto anula las que ya habían salido.
* **No comprobado todavía en el emulador:** el toque muerto de «Ahora no» sobre el panel se atribuye a la ventana apilada y deja de
  poder ocurrir con el panel; con la guía sobre otro `Modal` (no el panel) no se probó. Flujo de Maestro listo:
  `.maestro/guia-de-ser/01-la-guia-no-tapa-el-panel.yaml`. Pruebas: `guiaYPanelDeSer`, `lecturasDelArranque`, `tarjetaDelArranque`
  y `panelDeSerAbierto`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

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

## Cambio por pedido del dueño — 2026-10-31 — «Cierra tu día» pasa de Training a Plan (spec 033)

Textual: «Cerrar el día se mueve a Plan, todo de acuerdo a Plan.» Decisiones del dueño del mismo día: **todo la opción A** (spec y
decisiones en `Renaser-90-dias-backend/specs/033-cierre-del-dia-en-plan/`; D-298). **Solo la app: el servidor no cambia** (`GET/PUT
/api/v1/rocks/day-closure` y las lecturas de las fichas son las de la spec 017). Lo que cambia y nada más:
* **Plan suma una tarjeta «Cierra tu día»** (`features/cierre/components/CierreEnPlan`, con `TarjetaDelCierreEnPlan`): medallón de luna, el título,
  «2 minutos · opcional, no da puntos» y el chevron; toda la parte de arriba es un solo botón de 48 o más. Ya cerrada queda en verde con el
  check, «Día cerrado» y lo que dijo para mañana («Mañana: «Revisar las facturas» a otra hora»), y se puede volver a abrir para cambiarlo mientras
  el día no termine. **Es del día completo: no cambia con el selector de eje.** Va **bajo «Acciones que mueven la meta»** (cerrar es lo último que
  se hace) y, **sin Mapa activo, bajo «Primero tu Mapa de Renacimiento»**: está **siempre** (decisión 033-3 A), con o sin Mapa, con o sin acciones
  agendadas (una formación sin objetivos cierra igual, con su nota del día). Se calla donde ya se callaba la fila de Training: mientras no se sabe
  (nada de parpadeos), contra un servidor anterior a la spec 017 (404), ante un fallo de red (se reintenta al volver al foco) y con el interruptor
  `plan` de Soporte TI apagado (`CLAVES.plan`, que sigue tapando «Cierra tu día»).
* **La hoja es la misma** (`HojaDelCierre`, pantalla completa; sus reglas, textos, el 409 y el cambio de día a medianoche no cambian). Sus cambios:
  cada acción pendiente lleva **el ícono de su eje** (`iconoDelEje`; el servidor no manda el eje en el cierre, así que sale de las acciones de hoy
  que Plan ya lee con `GET /rocks/today`, por id: `cierre/utils/ejeDeLasAcciones`; la que no figura lleva el ícono neutro `target`, nunca un eje
  inventado) y el enlace de la pantalla final dice **«Ver mañana en Plan»**.
* **«Ver mañana en Plan» solo mueve** (decisión 033-2 A): lleva el scroll hasta «Acciones que mueven la meta», que ya muestra lo que viene (hoy,
  mañana y los próximos días). Sin automatismos ni atajos nuevos. **Se ofrece todos los días, también el domingo** (Plan muestra lo que viene), pero
  solo si Plan muestra acciones, o sea con el Mapa activo (`puedeVerManana`). Espera a que la hoja se vaya antes de mover el scroll.
* **Los días anteriores, en la misma tarjeta** (decisión 033-1 A): bajo la tarjeta, «Tus cierres de la semana» con los siete días de lunes a
  domingo (`CierresAnterioresDeLaSemana`, `utils/semanaDelCierre`, puro). Se pueden tocar los que ya pasaron (hasta el lunes y desde el Día 1; hoy y
  los que vienen no); la fila no se dibuja si no hay ninguno (lunes o Día 1). Tocar uno **solo lo lee**: «Miércoles 28 · Cerrado a las 21:40» con lo
  que respondió de cada pendiente y la nota del día, o «Sin cerrar»; **nunca ofrece cerrarlo** (un día que terminó no se cierra tarde, D-259).
  Se lee **solo al tocar, una vez por fecha y cuenta** (`useCierresAnteriores`, `lecturaDeCierres`: lo mismo que la spec 017); un fallo de red dice
  «No pudimos cargar este día.» con «Reintentar»; un 400/403/404 o una respuesta que no calza, «No hay un cierre de ese día para mostrar.». Cambiar
  de cuenta o de semana limpia la memoria. Cambio instantáneo y el «tic» de selección, sin animación.
* **Training deja de tener «Cierra tu día»**: se borraron `FilaDelCierre`, el campo `cierre` de `ListaDelDia`, el tipo `cierre` de las filas, la
  lectura del cierre de `TrainingPorHora`, la fila «Cerrado» / «Sin cerrar» de los días anteriores y las escuchas de `plan` / el cierre en
  `TrainingScreen`. `itemDelCierre` pasó a `tarjetaDelCierre` (los textos de la tarjeta, sin la fila). Training queda como antes **menos** esa fila;
  los hábitos, las acciones, los eventos, «N hechos hoy» y todo lo demás no cambian.
* **No cambian**: la hoja por dentro, el servidor, las fichas del mentor, el líder y Administración («Cierres del día»), el semáforo, los puntos
  (cerrar el día sigue sin dar puntos ni cumplir acciones), la barra de pestañas ni los demás tabs. Sin dependencias nuevas ni código nativo.
* **Pruebas:** Jest `cierreEnPlan` (la tarjeta siempre, sin Mapa, 404, fallo de red, `plan` apagado, fuera de foco, medianoche, la hoja, el ícono de
  eje, «Ver mañana» todos los días y solo con Mapa, el 409, los días anteriores y los cuatro casos de quien trabaja de noche),
  `tarjetaDelCierre`, `semanaDelCierre`, `ejeDeLasAcciones`, `hojaDelCierre` y `trainingSinElCierre` (Training ya no monta nada del cierre);
  se ajustaron `listaDelDia` y `calendarioDeTraining`. Maestro, escritos y sin correr: `.maestro/cierre-en-plan/`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). **Sin backend nuevo.**

## Cambio por pedido del dueño — 2026-10-31 — «Código Renaser en las fichas»: Administración decide si el mentor y el líder lo ven (spec 034)

Textual: «El líder de mentores y el mentor no pueden ver el Código Renaser: un interruptor para activar y desactivar.» Decisiones del dueño del
mismo día (spec y decisiones en `Renaser-90-dias-backend/specs/034-codigo-renaser-visible-por-admin/`; D-299): **de fábrica apagado**, **un solo**
interruptor para el mentor, la guía y el líder juntos, apagado **no ven nada** (ni un indicador de «registró / no registró»), lo deciden
**Administración, Alquimista y Soporte TI**, **sin motivo escrito** y **sin avisar** a la persona, al mentor ni al líder. Lo que cambia y nada más:
* **El servidor lo hace cumplir** (no es solo esconder la sección): es una funcionalidad más del catálogo de Soporte TI, `radar.fichas` («Código Renaser
  en las fichas», hija de `radar`), que nace apagada para MENTOR, TRAINEE_GUIDE y MENTOR_LEAD. Apagada **se esconde** (404
  `FUNCIONALIDAD_NO_DISPONIBLE`, no el aviso de mantenimiento) en las tres lecturas ajenas del Código Renaser —`GET /mentor/groups/{g}/learners/{u}/radar`,
  `GET /leadership/groups/{g}/people/{p}/radar` y `GET /leadership/people/{p}/radar`— y entra en `noDisponibles` de `GET /funcionalidades/mias`. El 403
  de siempre gana al 404. Administración y Alquimista no están entre los roles que se apagan, y la propia persona no pasa por ahí (`/radar/**`).
* **En la app, las tres fichas** (`CodigoRenaserDelAlumno` es el mismo componente de `AlumnoScreen`, `PersonaDelLiderScreen` y `FichaAprendizScreen`):
  con `radar.fichas` apagada o no disponible la sección «Código Renaser» **no se dibuja ni se pide** (sin hueco, sin error y sin aviso de
  mantenimiento). Un 404 del servidor que llegue igual tampoco la dibuja. Administración y Alquimista siguen viéndola siempre.
* **Administración → Más opciones → «Código Renaser en las fichas»** (`CodigoRenaserEnFichasAdminScreen`, vista nueva de la pila de `AdminScreen`; sigue la
  disponibilidad de Administración, `CLAVES.admin`): un `Interruptor` «El mentor y el líder ven el Código Renaser» con una frase que dice qué pasa en
  cada estado («El mentor, la guía y el líder no lo ven. Tú, Alquimista y la propia persona lo siguen viendo.») y «Último cambio: Ana Pérez, 31 oct 2026,
  18:40». **Cambiarlo pide una confirmación que dice qué va a pasar** («Mostrar el Código Renaser» / «Ocultar el Código Renaser»; sin motivo y con «No se
  avisa a nadie») y rige en el acto. El interruptor es el del servidor: no se mueve hasta que éste acepta (`useCodigoRenaserEnFichas`); un cambio doble
  manda un solo pedido; si falla, queda donde estaba y se dice por qué («Tu cuenta no puede cambiar esto.» en 403, «Esta opción todavía no está
  disponible…» en 404, «Sin conexión con el servidor.», «No se pudo cargar esta opción.») con «Reintentar» donde tiene sentido. Al quedar guardado,
  `tacto.logro()` una vez y «Listo: el mentor y el líder ya ven / ya no ven el Código Renaser.» Si Soporte TI dejó los tres roles distintos desde su
  consola, lo dice («Soporte TI lo dejó distinto para cada rol…») y no afirma que lo ven todos; cambiarlo aquí los iguala.
* **`GET/PUT /api/v1/admin/codigo-renaser-en-fichas`** (`admin/api/codigoRenaserEnFichasApi`, esquema tolerante): `{ visible, mixto, porRol, ultimoCambio }`
  y `PUT { visible }`. Solo ADMIN, ALCHEMIST e IT_SUPPORT activos; cualquier otro, 403 del servidor. Deja una fila de auditoría y no crea ninguna
  notificación. Soporte TI también lo ve en su consola, rol por rol (sin cambios en la app).
* **Quien publique el backend primero** (sin migración nueva): al publicar, **el mentor, la guía y el líder dejan de ver el Código Renaser hasta que
  Administración lo encienda**. Contra un backend anterior la pantalla nueva dice que todavía no está disponible (404) y las fichas quedan como estaban.
* **No cambian**: lo que se ve cuando está encendido (la sección es la de siempre, incluida la marca de dictado de la spec 030, que sale por las mismas
  tres lecturas), el Código Renaser de la propia persona, Hoy, Yo → Mi Radar, los demás tabs ni la barra. Sin dependencias nuevas ni código nativo.
* **Pruebas:** Jest `codigoRenaserEnFichasApi` (ruta, verbos, cuerpo sin motivo y esquema tolerante), `codigoRenaserEnFichas` (los textos y la
  confirmación), `useCodigoRenaserEnFichas` (el servidor es la verdad, fallos, «Reintentar», un solo pedido),
  `codigoRenaserEnFichasEnAdministracion` (el cableado y la pantalla) y `codigoRenaserDelAlumnoEnFichas` (apagado: ni se dibuja ni se pide); se ajustó
  `pilaDeAdministracion`. Maestro, escritos y sin correr: `.maestro/codigo-renaser-en-fichas/` (apagado de fábrica, Administración lo enciende y el
  mentor lo ve, lo apaga y ya no).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) **y el backend con la spec 034 antes** (sin migración).

# 📱 REGLAS Y BUENAS PRÁCTICAS DE DESARROLLO MÓVIL (REACT NATIVE / EXPO)

Actúa como un Desarrollador Móvil Senior y Diseñador UX/IA de Alto Nivel especializado en React Native, Expo y TypeScript. Al crear, refactorizar o modificar cualquier pantalla o componente, debes cumplir OBLIGATORIAMENTE con los siguientes estándares:

---

## 1. 🏗️ ARQUITECTURA LIMPIA Y SEPARACIÓN DE RESPONSABILIDADES
* **Estructura Modular por Feature**: Agrupa el código bajo `src/features/<nombre_modulo>/`:
  * `screens/`: Coordinadores y pantallas completas.
  * `components/`: Subcomponentes visuales reutilizables.
  * `types/`: Tipos TypeScript (`.types.ts`).
  * `data/`: Constantes, cláusulas, configuraciones estáticas.
* **Componentes de UI Atómicos**: Utiliza componentes compartidos bajo `src/components/` (`FormField`, `GoldButton`, `SliderRating`, `Checkbox`, `SignatureCanvas`, `Icon`, `LogoDeMarca`).
  * **Logos de marcas (Google, Apple, Google Meet, Zoom, Google Drive) → `LogoDeMarca`, nunca `Icon`**
    (2026-10-05, pedido del dueño de usar svgl). Son los SVG oficiales de svgl con sus colores, sin
    redibujar ni recolorear; Apple cambia a blanco en modo oscuro. Una marca nueva se agrega desde
    `static/library/` de svgl siguiendo la cabecera de `LogoDeMarca.tsx`. Los casos `google` y `apple`
    de `Icon` quedan solo hasta que `LoginScreen` pase a `LogoDeMarca`; no sumarles usos.
  * **`Icon`: un solo grosor real y tres tamaños** (decisión del dueño, 2026-10-05). El trazo se dibuja a
    **1,75 px reales** a cualquier tamaño (`GROSOR_TRAZO_PX`, `grosorDelTrazo`): antes era `strokeWidth = 1.1`
    en la caja de 20 y a 14 px quedaba en 0,77 px. Un `strokeWidth` explícito se respeta solo si es más grueso
    (el ✓ sobre dorado); nunca deja el trazo más fino. Tamaños de uso **16 / 20 / 24** (`TAMANO_ICONO`); la
    flecha de volver, 24 en un área de 48. Un ícono nuevo se dibuja con forma de **Lucide** (ISC) en caja de 24
    y usa **`s24`** —con `s` saldría a 1,46 px; `grosorDeIconos.test.ts` lo frena—. Nada de emojis como
    íconos: cambian de forma entre Android, iOS y web e ignoran el color del tema.
* **Integridad del Core**: NUNCA alterar, romper ni desconfigurar las pantallas existentes ni los tabs principales (`Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`).
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
  * **Cambio por pedido del dueño — 2026-10-19 — alarmas como el despertador, aviso cuando el teléfono las
    borra y guía por marca (tab `Yo` → Alarmas, una hoja global y, en Training → Planificar, una oferta única de la
    guía)** (spec 007 del backend, `specs/007-alarmas-confiables/`; pedido: «los usuarios dicen que sus alarmas no
    suenan», teléfonos Honor; decisión «la alarma… así como la alarma en Android… procede»; después, «arregla en
    general también, no es ese dispositivo, por si acaso»). Lo que cambia y nada más:
    * **Toda alarma programada por la app es una alarma del usuario** (`AlarmManager.setAlarmClock`) cuando hay permiso
      «Alarmas y recordatorios»: suena a su hora aunque el teléfono esté en reposo, y Android la muestra como «próxima
      alarma» con el ícono del despertador. Lo hace un parche de `postinstall` a `expo-notifications`
      (`scripts/arreglar-alarmas-tipo-despertador.js`, vigilado por `alarmasTipoDespertador.test.ts`). Vale para
      hábitos, Despertar, eventos, objetivos, Código Renaser y el repaso del domingo; la prueba de sonido (intervalo de
      3 s) no. Sin el permiso, como antes. Canales, voces, sonidos, ruta y avisos agrupados no cambian.
    * **La alarma del primer aviso de cada hábito se llama `habito-{id}-inicio`**, igual que el `tag` del push de
      respaldo del servidor: si llegan los dos, queda uno solo en la bandeja.
    * **Hoja al abrir la app** (`AvisoDeAlarmasBorradas`, montada en `App.tsx` junto a `RearmadorDeAlarmas`): si el
      teléfono borró las alarmas, se rearman y aparece, como mucho una vez por día y nunca la primera vez de la
      cuenta, «Tu teléfono cerró Renaser» con la línea de su marca, «Arreglarlo» y «Ahora no». Se considera borradas
      por **cualquiera de dos señales** (módulo `renaser-alarmas`, Android): (1) el historial del sistema dice que
      detuvo la app a la fuerza (Android 11+; en Honor, Huawei, Xiaomi/Redmi/POCO, Oppo/Realme/OnePlus, Vivo/iQOO y
      Samsung, de Android 11 a 14, también «quitar de recientes», porque allí borra las alarmas); (2) la app tenía
      alarmas programadas a futuro y el sistema no tiene ninguna «próxima alarma» de Renaser (`alarmasVivas.ts`,
      leído ANTES de rearmar). Si la próxima alarma es de otra app o falta el permiso «Alarmas y recordatorios», esa
      segunda señal calla: nunca avisa en falso por ahí.
    * **La misma hoja, antes de que pase** (`guiaPreventiva.ts`): en esas marcas, la primera vez que la persona
      guarda un recordatorio en Training → Planificar, se ofrece una sola vez (por cuenta, en este teléfono) con el
      título «Un ajuste para tus alarmas», «En tu teléfono, Renaser necesita un ajuste para que tus alarmas suenen
      siempre.», la línea de su marca y «Ajustarlo» / «Ahora no». Si ese guardado ya pidió el permiso de alarmas
      exactas no se le suma otra hoja encima. En otras marcas no sale nada.
    * **Yo → Alarmas**: la guía de batería dice el camino de la marca del teléfono (Honor/Huawei «Inicio de
      aplicaciones», Xiaomi, Samsung, Oppo/Realme/OnePlus, Vivo) y su botón abre esa pantalla si existe; si no, la
      lista de batería o los ajustes de Renaser. Nunca se pide la excepción directa de batería (política de Play).
      > **Corregido 2026-10-31 (decisión del dueño, «alarmas silenciosas»).** Ya no es cierto lo de la **hoja al abrir la app**
      > («Tu teléfono cerró Renaser», `AvisoDeAlarmasBorradas`, con sus dos señales `detencionForzada.ts` y `alarmasVivas.ts`), ni
      > lo de la **misma hoja antes de que pase** («Un ajuste para tus alarmas», `guiaPreventiva.ts`, `pedidoDeLaGuia.ts`): las
      > tres cosas se borraron. El rearmado en silencio (`RearmadorDeAlarmas`) sigue. La guía de batería de Yo → Alarmas queda,
      > con otro texto y otro botón. Ver la entrada «Alarmas silenciosas» de arriba.
    * **No cambian**: el resto de Yo, el resto de Planificar (horas, días, el pedido del permiso de alarmas exactas),
      los interruptores de avisos (`InterruptoresDeAvisos`, spec 005), los demás tabs.
      **Hace falta un APK nuevo** (código nativo) y, para el texto con la hora y el `tag`, el backend de la spec 007.
  * **Cambio por pedido del dueño — 2026-10-29 — tab `Yo` (y las fichas del mentor, del líder y de Administración): Mi Radar
    desde el día 8** (spec 012 del backend, `specs/012-mi-radar-en-yo/`; textual: «el radar son los primeros 7 días y se
    activa… ahora la persona puede activarlo individualmente y que le aparezca»). Lo que cambia y nada más:
    > **Corregido 2026-10-30 (spec 019, decisión del dueño).** Todo lo de **elegir las horas a mano** de esta entrada —los `ChipDeOpcion` de
    > 03:00 a 23:00, «hasta 12», las horas sugeridas 09:00, 14:00 y 20:00, «Guardar horarios» / «Guardar y encender», las horas propias por día,
    > `horasDelDia` leyendo `dias[].horas` elegidas, y `Encendido · 09:00, 14:00 y 20:00`— **ya no es cierto** (y nunca llegó a producción). Mi
    > Radar es **Automático** (cada hora entre el Despertar y el Dormir, sin tope) o **Personalizado** (cuántas veces por día, repartidas parejo),
    > por día de la semana; las horas las calcula el servidor. Ver la entrada «Mi Radar automático y personalizado (spec 019)», más abajo. Siguen
    > igual: los días 1 a 7, la fila de Yo desde el día 8, el interruptor opcional, la invitación del día 8, los canales y el minuto de los avisos,
    > el formulario y las fichas (salvo su línea de resumen). **Ya no están en Yo → Mi Radar** los registros de hoy, el «Historial» ni los
    > «Patrones» (corregido el mismo día: ver «Mi Radar automático y personalizado (spec 019)»).
    > **Corregido 2026-10-31 (spec 034, D-299, pedido del dueño: «El líder de mentores y el mentor no pueden ver el Código Renaser: un
    > interruptor para activar y desactivar»).** Lo de las **fichas** de abajo («`CodigoRenaserDelAlumno` … la usan `AlumnoScreen` (mentor),
    > `FichaAprendizScreen` … y `PersonaDelLiderScreen` (líder)») **ya no es incondicional**: el mentor, la guía y el líder solo ven la sección «Código
    > Renaser» de una ficha si Administración la encendió (de fábrica está **apagada**). Administración, Alquimista y la propia persona no cambian.
    > Ver la entrada «Código Renaser en las fichas (spec 034)», al final de las del 2026-10-31.
    * **Yo → fila «Mi Radar»** (`compass`), justo debajo de «Tuve una emergencia», **solo desde el día 8** y solo si el
      servidor la ofrece (`GET /api/v1/radar/mi-radar`; un 404 o 403 la esconde). Dice `Encendido · 09:00, 14:00 y 20:00` o
      `Apagado` y abre `MiRadarScreen` a pantalla completa. Los días 1 a 7 no hay fila: el Código Renaser se abre solo.
      > **Corregido 2026-10-30 (spec 019, el 403 dice por qué).** «Un 404 o 403 la esconde» ya no es cierto para el 403 que trae motivo: un
      > `PROGRAMA_NO_ACTIVADO` (el personal que todavía no eligió su Día 1) **muestra** la fila, con «Primero elige tu Día 1». Siguen
      > escondiéndola el 404 y un 403 sin motivo (un backend anterior) o con uno que la app no conoce. Ver la entrada de la spec 019, más abajo.
    * **`MiRadarScreen`**: el `InterruptorGrande` «Mi Radar» primero; apagado no hay registrar ni horarios. Encender muestra
      las horas (`ChipDeOpcion`, de 03:00 a 23:00, hasta 12; vienen 09:00, 14:00 y 20:00) y se guarda con «Guardar y
      encender»; apagar rige en el acto. Encendido: «Registrar ahora» (el `CodigoRenaserModal` de siempre, que se puede
      cerrar, con el mismo envío y el mismo 409), «Hoy» (las horas elegidas que ya pasaron con su registro o «Sin
      registro») y las horas. Siempre: historial por día con «Ver más» y Patrones (desde 3 registros, cada uno con «en N
      registros»), y «Lo ves tú, tu mentor y el equipo que coordina tu grupo.». Las horas se validan en la app y en el
      servidor (`utils/miRadar.ts`, `MI_RADAR`).
    * **Avisos del teléfono**: los mismos identificadores, canal y minuto. Los días 1 a 7, las doce de 08:00 a 19:00 **sin
      ningún cambio**; desde el día 8, solo las horas elegidas con Mi Radar encendido, con `data.route = '/mi-radar'`:
      tocarlos abre Yo → Mi Radar y, si la hora en curso es una elegida sin registro, también el formulario. Una
      invitación única el día 8 a las 09:00, que el teléfono programa una vez por cuenta durante los días 1 a 7 y se cancela
      si se enciende Mi Radar.
    * **Fichas** (solo lectura): `CodigoRenaserDelAlumno` recibe cómo cargar y muestra `Mi Radar: encendido · …` o
      `apagado` y la hora prevista de cada registro. La usan `AlumnoScreen` (mentor), `FichaAprendizScreen` (administrador
      y alquimista, solo con grupo) y `PersonaDelLiderScreen` (líder; estos dos con
      `GET /api/v1/leadership/groups/{g}/people/{p}/radar`). Un 403 o 404 esconde la sección.
    * **Por día de la semana, como los hábitos en Planificar (cuarta ronda, 2026-10-29)** (textual: «no harán la acción
      todos los días, es molestoso… igual que los hábitos… recuerda la experiencia de uso para hacerlo más fácil»). Lo que
      cambia y nada más, sobre lo de arriba (que sigue valiendo para «Todos los días»):
      * **Forma**: `{ encendido, horas, dias: [{ dia: 1..7, horas }] }`, lunes = 1. `horas` valen para todos los días; un día en
        `dias` tiene horas propias (de 1 a 12) y con `[]` es «Sin Radar ese día»; un día que no está sigue las de todos. El
        esquema es tolerante: sin `dias` (backend anterior) ningún día tiene horas propias, y un día roto se pierde solo él.
        **`horasDelDia(config, diaIso)` (`utils/miRadar.ts`) es la única función que dice qué horas tiene un día**: «Hoy»,
        «Registrar ahora», los avisos y el resumen la usan. Lo de editar días marcados (borrador, qué se guarda) vive en
        `utils/diasDeMiRadar.ts`.
      * **Pantalla**: bajo «Tus horas», la fila de los siete días de Planificar (`FilaDeDiasDelPlan`, sin tocarla; ningún día con
        candado: cambiar rige en el acto). Cada día con horas propias lleva la campana y el que va sin Radar, la campana tachada;
        el lector de pantalla dice «Sábado 31, horas propias: 11:00» / «Domingo 1, sin Radar». **Sin días marcados**: «Todos los
        días» y las horas de siempre, con «Guardar horarios» / «Guardar y encender» (conserva los días propios que ya había).
        **Con días marcados**: «Solo sáb, dom», el `InterruptorGrande` «Sin Radar ese día» / «Sin Radar estos días» (con «Varía»
        si no coinciden) y los mismos chips de horas, y se guarda con **«Guardar horas · sáb, dom»** (o «Guardar y encender · sáb»
        si Mi Radar aún está apagado): solo lo tocado, y un día que queda con las mismas horas que todos **vuelve a seguirlos**.
        Si los marcados tienen horas distintas no se marca ninguna y se lee «Estos días tienen horas distintas» (lo que se elija
        se pone a todos). «Dejar sáb como los demás días» le quita lo propio. Sin horas y sin «Sin Radar»: «Elige al menos una hora
        o marca «Sin Radar» para esos días». Cada modo tiene su borrador y no se mezclan. Sin animaciones nuevas (el interruptor
        grande ya anima su pulgar); el tacto de siempre en cada toque y en los errores.
      * **Avisos del teléfono**: sin ningún día distinto, las alarmas DIARIAS de siempre (`renaser.radar.slot.HH`); con algún día
        distinto, **una alarma SEMANAL por día y por hora de ese día** (`renaser.radar.slot.d{1..7}.HH`, lunes = 1; el disparador
        `WEEKLY` de expo numera el domingo como 1: `weekdayDeExpo`), como Planificar con los hábitos (spec 008). Un día sin Radar
        no tiene ninguna. Cancelar cubre los dos esquemas. Los días 1 a 7 no cambian (las doce diarias, con su prueba). **Tope de
        iOS: 64 avisos pendientes por app** y con días distintos pueden ser hasta 84; hoy la app es solo Android, que no tiene
        tope. Si algún día sale en iOS hay que recortar en `horasDeAviso`.
      * **«Hoy»** usa las horas de **hoy**; en un día sin Radar no hay «Registrar ahora»: dice «Hoy no tienes Mi Radar» (el
        servidor lo rechaza con un 409). «Hoy» va **en orden de hora, del más temprano al más tarde** (registros y «Sin registro»
        juntos); antes iba del más nuevo al más viejo. El historial de otros días sigue del más nuevo al más viejo.
      * **Resumen de la fila de Yo y de las fichas** (`textoDeMiRadar`): `Encendido · 09:00, 14:00 y 20:00 · sáb 11:00 · dom sin
        Radar`; los días que quedan igual van juntos (`sáb y dom 11:00`, `lun, mié y vie sin Radar`). Con todos los días iguales
        es el de antes. Es una sola línea que, si es larga, se parte en renglones y nunca se corta con «…».
      * **Hace falta el backend con `dias`** (`GET/PUT /radar/mi-radar`, `POST /radar` que rechaza un día sin Radar, y
        `horaPrevista` calculada con las horas del día) y un APK nuevo. Un backend sin `dias` los ignora y devuelve solo las
        horas de todos los días: la app lo lee como «ningún día tiene horas propias» y no inventa nada.
    * **No cambian**: los días 1 a 7, **Hoy** (desde el día 8 no muestra nada del Radar, con Mi Radar encendido o apagado),
      el formulario, los demás tabs ni Plan. Sin dependencias nuevas.
      > **Corregido 2026-10-29 (spec 016, decisión del dueño).** Lo de **Hoy** ya no es cierto: desde el día 8, Hoy sí muestra
      > el Radar, como la mitad derecha de la tarjeta «Hábitos de hoy» (apagado, «Tu hora», «Tu Radar de hoy»…). Ver la entrada
      > «hábito y Radar en una tarjeta» de abajo. Los días 1 a 7, el formulario y el resto de lo que dice esta línea siguen igual.
    * **Hace falta el backend con V119 antes y un APK nuevo** (la app no se actualiza por aire). Contra un backend anterior
      no aparece la fila y los días 1 a 7 siguen igual.
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
  * **Cambio por pedido del dueño — 2026-10-29 — tabs `Hoy` y `Plan`: hábito y Radar en una tarjeta, y las acciones de hoy por
    eje (spec 016)** (spec, vista previa aprobada y decisiones del dueño en `Renaser-90-dias-backend/specs/016-hoy-y-plan/`;
    pedido sobre la vista previa: «así bro, pero más centrado, para que sea CX/UX» —Hoy, opción A «Lado a lado»— y «el de acá,
    el B, creo que me agrada más; procede y la spec» —Plan, opción B «Por eje»—). Lo que cambia y nada más:
    * **Hoy — «Hábitos de hoy» y el Radar en una tarjeta** (`features/home/components/TarjetaHabitoYRadar`, en el lugar de la
      tarjeta de hábitos, después del Mapa): dos mitades **iguales** —ícono con el rótulo y su chevron, una línea de estado,
      título y detalle; la fila las estira a la más alta— con una línea fina entre las dos.
      > **Corregido 2026-10-29 (el dueño, sobre la captura: «esto alineado como estaba antes, que se vea mejor»).** Decía «al
      > centro a lo ancho y a lo alto». Ahora el contenido de las dos mitades va a la izquierda y arriba, como la tarjeta
      > «Hábitos de hoy» de antes: los renglones de una mitad quedan a la altura de los de la otra. Con la letra grande del sistema (`fontScale` > 1,15) pasan una debajo de la otra y nada se corta. Mitades de 48
      o más. Responden al dedo con el fondo lavado de oro, **no** con la escala de `Presionable` (una mitad que se hundiera
      dentro de una tarjeta de bordes comunes se vería rota); **sin movimiento propio** (es lo más visto de Hoy y lo que cambia
      tiene que leerse en el acto). Izquierda: la de siempre (cifra, hábito de esta hora, lo que queda) → Training. **Se borró
      la tarjeta aparte del Código Renaser** (`TarjetaCodigoRenaser`), que en los días 1 a 7 iba primera: la mitad la reemplaza
      y no se duplica.
    > **Corregido 2026-10-30 (spec 019).** Las «horas elegidas» de la tabla de abajo ya no se eligen: son las que el servidor calcula con el
    > Despertar y el Dormir de hoy (Automático) o las repartidas por «Veces al día» (Personalizado). Cambia el texto de la mitad: apagado
    > «Cada hora entre tu Despertar y tu Dormir. Es opcional.»; encendido sin hora pendiente «Próxima a las 20:00» con `05:30 a 22:30 · 17 veces`
    > (ya no «Hoy respondiste 2 de 3»: eso está en la hoja); hoy sin Radar «Toca para ver tu horario.»; y la hoja «Tu Radar de hoy» dice el
    > horario y las veces en su subtítulo y «Abrir Mi Radar» (era «Cambiar mis horas»). El resto de la tabla sigue igual.
    * **La mitad del Radar** (qué dice y qué hace, en `radar/utils/mitadDelRadar.ts`, sin React):
      | Cuándo | Dice | Al tocarla |
      |---|---|---|
      | Días 1 a 7, hora pendiente | «Código Renaser · 13:00 · Innegociable» (o «Abierto»), «¿Dónde estás ahora mismo?», cuándo cierra | el formulario de siempre, **obligatorio** para el aprendiz (`RadarContext.abrir`; el que se abre solo y por encima del navegador no cambió) |
      | Días 1 a 7, hora registrada | «Registrado», «Listo por esta hora. El siguiente a las 14:00.» | hoja «Ya lo registraste»: lo respondido y cuándo es el siguiente |
      | Antes del primer registro del día | «En espera», «El primer registro del día es a las 08:00.» | nada (no es un botón) |
      | Día 8 o más, Mi Radar apagado | «Mi Radar · Apagado», «Planifica tu Radar» | Yo → Mi Radar (`abrirMiRadar`) |
      | Encendido, una hora elegida pendiente | «Mi Radar · 14:00 · Tu hora», «Responde hasta las 15:00» | el formulario ahí mismo (`CodigoRenaserModal`, **se puede cerrar**, pie de Mi Radar) |
      | Encendido, esa hora ya registrada | «Registrado», «La siguiente a las 20:00.» | hoja «Ya lo registraste» |
      | Encendido, sin hora pendiente ahora | «Encendido», «Próxima a las 20:00», «Hoy respondiste 2 de 3.» | hoja «Tu Radar de hoy»: las horas de hoy con su estado (Respondida 09:04 / Sin registro / Es tu hora / Prevista), «Registrar ahora» si se puede y «Cambiar mis horas» → Yo → Mi Radar |
      | Encendido, hoy sin Radar | «Hoy no tienes Mi Radar» | Yo → Mi Radar |
      | Sin Día 1, backend sin Mi Radar (404/403), Mi Radar sin poder leerse, o **mientras no se sabe** | nada: queda solo la mitad de hábitos, a todo el ancho | — |
      Lo que sigue a una hoja (el formulario, Yo) espera a que la hoja se vaya del todo (`alTerminarDeCerrar`, como las de
      Training). «Registrar ahora» solo aparece cuando el servidor lo aceptaría; si no, dice por qué («Hoy no tienes Mi Radar»,
      «Mi Radar funciona de 03:00 a 23:59.», «Ya registraste esta hora»).
      > **Corregido 2026-10-31 (pedido del dueño).** La columna «Dice» ya no incluye la línea de abajo («Cinco preguntas, un minuto…»,
      > «Responde hasta…», «Listo por esta hora. El siguiente a las 14:00.»…): quedan el rótulo, el estado y el título. Lo que hace cada
      > mitad al tocarla no cambia.
    * **Una sola lógica, sin duplicar**: las horas de hoy y la hora en curso salen de `resumenDeMiRadarHoy` (`utils/miRadar.ts`,
      sobre `horasDelDia`), que ahora usa también `useMiRadar` de Yo; el envío es el de `RadarContext` (`radar.enviar`: el mismo
      `POST /radar` y el mismo 409 que se relee y se da por registrado); `HOY_SIN_RADAR`, `FUERA_DE_HORARIO` y el pie del
      formulario viven en `utils/miRadar.ts` (las pantallas los siguen exportando).
    * **Sin pedidos nuevos que se repitan** (`radar/hooks/useRadarEnHoy`): los días 1 a 7 lee lo mismo que ya leía
      (`/radar/latest`, por `RadarContext`) y **no** el historial, salvo cuando se abre una hoja; desde el día 8 usa la lectura
      de Mi Radar de `RadarContext` y, solo con Mi Radar encendido, el historial de siempre (`GET /radar/history`, el de Yo → Mi
      Radar). Al volver a Hoy relee en silencio lo respondido (pudo responderse desde Yo) y, si Mi Radar no se había podido
      leer, lo intenta otra vez. **Mientras no se sabe qué hora está respondida no se dibuja la mitad** (la misma regla del
      2026-10-19: «Tu hora» sin saberlo es el parpadeo que ya costó arreglar).
    * **Plan — «Tus acciones de hoy», por eje** (`objetivos/components/TarjetaAccionesDeHoyPorEje`): **se quitó el arco
      «Día 20 de 90»** (`ArcoDelDia` y su prueba se borraron: nada más lo usaba). En su lugar, arriba de «Fase actual», una
      tarjeta con «Tus acciones de hoy · 2 de 6», el subtítulo «Jueves 29 · día 20 de 90» (la fecha de las acciones, el día de
      `/home`; lo que no se sabe no se inventa), una barrita por acción y una fila por eje que tenga acciones hoy, **en el orden
      de las prioridades** (el principal primero): ícono del eje (`iconoDelEje`), «n de m», un símbolo por acción y «Sigue: X ·
      16:00», «Se te pasó: X» o «Todo cumplido». Los símbolos tienen forma, no solo color: ✓ cumplida (`checkCircle`), círculo
      vacío pendiente, reloj «se te pasó la hora» (`clock`) y candado si espera a la verde por Pareto (`lock`).
      > **Corregido 2026-10-29 (mismo día, tras el E2E).** El reloj y «Se te pasó: X» iban en rojo y la hoja decía «todavía
      > puedes registrarla hoy». Ahora van en dorado y la hoja dice «Se te pasó la hora · todavía puedes cumplir tu
      > compromiso», como Training (pedido del dueño: lo atrasado no habla de puntos, invita a cumplir). «Registrar en
      > Training» no abría la acción: al volver a Training se relee de cero y el pedido se buscaba en la lista todavía vacía;
      > ahora se busca en lo que trajo `useTraining` (lo mismo para el aviso del teléfono que abre un hábito).
      Reglas (`objetivos/utils/accionesDeHoy.ts`): cumplida manda sobre todo; una bloqueada por Pareto es candado aunque su hora
      haya pasado; **«se te pasó» es solo «pendiente y su hora ya pasó»** (Training es más generoso: una acción queda atrasada
      cuando llega la hora del siguiente ítem del día, hábitos incluidos, y Plan no lee los hábitos); la que sigue es la primera
      sin cumplir en orden de hora, sin contar las que esperan a la verde. Sin acciones hoy: «Hoy no tienes acciones agendadas.
      Agéndalas desde tus objetivos: toca una prioridad clave y elige «Agendar mis acciones».».
      > **Corregido 2026-10-31.** Esta tarjeta ya no existe: las acciones del eje elegido salen en «Acciones que mueven la meta» (hoy y
      > las que vienen), y tocar una de hoy sigue llevando a Training con `abrirAccionId`. Ver la entrada del 2026-10-31.
    * **La hoja de un eje** (`HojaDesdeAbajo`): sus acciones de hoy con hora, nombre, estado en palabras («Cumplida 10:14»,
      «Pendiente», «Se te pasó la hora · todavía puedes registrarla hoy», «Se abre al completar la primera») y su símbolo, y
      fijo abajo «Registrar en Training». **Plan solo muestra:** el botón no registra nada, lleva a Training con
      `abrirAccionId` —la acción que sigue de ese eje—, cuando la hoja ya se fue. `TrainingScreen` consume ese parámetro una
      vez (como `abrirHabitoId`): si la acción sigue entre las de hoy la abre como al tocar su fila; si no, Training queda en
      su lista. Es lo único que cambia en Training.
    * **Una lectura por visita** (`objetivos/hooks/useAccionesDeHoy`): `GET /rocks/today`, la misma que Hoy y Training ya
      hacen, cada vez que Plan vuelve al foco (y al volver de Objetivos, porque la tarjeta solo existe en la vista principal).
      Con un fallo conserva lo último que leyó y ofrece «Reintentar».
    * **No cambian**: «Fase actual», «Prioridades clave», «Arquitectura de tiempo», la vista de Objetivos, las demás tarjetas
      de Hoy, el formulario de los días 1 a 7, los avisos, Training (salvo `abrirAccionId`), Yo, Comunidad ni la barra.
      Sin dependencias nuevas ni backend nuevo.
      > **Corregido 2026-10-31.** «Arquitectura de tiempo» salió de Plan; el resto de esta lista sigue (hasta el rediseño de Plan del
      > mismo día, más abajo).
    * **Anotado, no inventado**: la vista previa decía «Pendiente · en 20 min» en la hoja del eje; no hay regla para ese
      umbral y no se dibuja. Tampoco había diseño para «En espera» (antes del primer registro de los días 1 a 7) ni para el día
      sin Radar: llevan los textos de arriba (los de la tarjeta de antes y los de Yo → Mi Radar).
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).
  * **Cambio por pedido del dueño — 2026-10-29 — tab `Training` (y las fichas del mentor, del líder y de Administración):
    Cierra tu día (spec 017)** (spec, vista previa aprobada y contrato en `Renaser-90-dias-backend/specs/017-cierre-del-dia/`;
    origen: el encargo de gerencia «Cerrar y evaluar mi día»; el dueño pidió que esté en Training «para los aprendices», es decir,
    para quien hace su programa de 90 días, también el personal que lo hace). Decisiones del dueño del mismo día: lo ven la persona
    **y su acompañamiento** (mentor o guía, líder, Administración y Alquimista, en la ficha); es **opcional y sin puntos**, nunca
    resta ni cuenta en el semáforo, y un día sin cerrar solo dice «Sin cerrar». Lo que cambia y nada más:
    > **Corregido 2026-10-31 (spec 033, pedido del dueño: «Cerrar el día se mueve a Plan, todo de acuerdo a Plan»).** «Cierra tu día»
    > **ya no está en Training**: la fila (`FilaDelCierre`), el tipo `cierre` de la lista de hoy, la fila «Cerrado» / «Sin cerrar» de los días
    > anteriores de Training y «Ver mañana en Training» se borraron. Vive en **Plan**, en una tarjeta. La hoja, las lecturas, el guardado, el
    > servidor y las fichas **no cambian**. Ver la entrada «Cierra tu día en Plan (spec 033)», al final de las del 2026-10-31.
    * **La fila** (`features/cierre/components/FilaDelCierre`, un tipo nuevo `cierre` de la lista de hoy): «Cierra tu día · 2
      minutos», con fondo dorado suave (`goldWash`) y el ícono de luna; es **la última de hoy**, a la hora de Dormir de hoy **menos 30
      minutos**, y **a las 21:30 si Dormir no tiene hora** (sin Dormir hoy, pausado, o sin hora legible). Si Dormir cae pasada la
      medianoche (00:10), 30 minutos antes sería ayer, así que la fila se ancla a las 00:00. **La calcula la app**
      (`cierre/utils/horaDelCierre`, con los hábitos que Training ya lee de hoy, `systemKey === 'SLEEP'`); el servidor no impone ninguna
      hora, solo que el día sea el de hoy. Antes de su hora no existe y **no se lee nada** del cierre.
    * **No es un hábito** (`training/utils/listaDelDia`): se ordena por hora entre el resto, pero **no cuenta** en «N de M hechos» ni en
      los puntos, **no se atrasa** (nunca pasa a «Se te pasó la hora») ni atrasa a nadie, **no es el «primero»** de «Te toca ahora», no
      cuenta para «Terminaste lo de hoy», no lleva ✓ ni «Subir» y **no se despide con fundido**: cerrada, se queda en su lugar en verde
      («Día cerrado» y lo que dijo para mañana, «Mañana: «Revisar las facturas» a otra hora»). Tocarla, cerrada o no, abre la hoja.
    * **La hoja** (`HojaDelCierre`, `HojaDesdeAbajo tamano="completa"`; sale de un toque a la fila y relee el día cada vez que se abre):
      «Cierra tu día», «Jueves 29 · Día 20»; lo ya cumplido llega **marcado y no se pregunta**; por **cada acción que quedó pendiente**,
      una tarjeta con «Era a las 20:30 · quedó pendiente» (o «Quedó pendiente» sin hora), **«¿Qué pasó?»** (No me alcanzó el tiempo ·
      Surgió otra cosa · Me faltó energía · Lo dejé para después), **«¿Qué harás mañana?»** (Hacerla a otra hora · Hacerla más corta ·
      Pedir ayuda · Dejarla) y una nota opcional de hasta 500 caracteres; después «Tus hábitos: N de M hechos hoy» y «Tu semana: N de M
      acciones cumplidas hasta hoy» (solo lectura; la semana viene del servidor y, si no viene, la línea no se dibuja). Los textos
      de las dos preguntas viven en `cierre/data/textosDelCierre`. «Guardar mi cierre» va fijo abajo y **se apaga hasta elegir los
      dos chips de cada pendiente**, con una línea que dice qué falta nombrando la acción («Elige qué pasó y qué harás mañana con
      «Revisar las facturas».»). Un **día sin acciones** dice «Hoy no tenías acciones.»; con todo cumplido, «No te quedó nada
      pendiente»; en los dos hay una **nota del día** opcional. **Ya cerrado, abre con lo guardado** y se puede cambiar mientras el día
      no termine. Al guardar, un fundido (solo `opacity`, `DURACION_MS.paso`; con «reducir movimiento», al instante) da paso a «Día
      cerrado» con lo que dijo para mañana, «Ver mañana en Training» (elige el día de mañana de la semana; **el domingo no se ofrece**,
      mañana cae fuera de la semana) y «Listo». Los chips no se animan (solo `Presionable`) y vibran con `tacto.seleccion()`;
      `tacto.logro()` suena **una sola vez**, al quedar guardado.
    * **Guardar NUNCA completa una acción ni anuncia puntos**: la hoja solo habla con `GET/PUT /api/v1/rocks/day-closure`
      (`cierre/api/cierreApi`); no llama a `/rocks/{id}/evidence` ni a `/habit-tracks/{id}/complete`, no emite `habitoCumplido` y no
      muestra «+N pts». Lo vigilan `useHojaDelCierre.test.ts` y `hojaDelCierre.test.ts`.
    * **El día no se reasigna** (spec 002): antes de enviar se compara el día para el que se abrió la hoja con el de hoy. Si cambió (pasó
      la medianoche con la hoja abierta), **no se envía nada**; un 409 del servidor («Ese día ya cerró y no se puede cerrar tarde.»)
      es lo mismo. En los dos casos Training cierra la hoja, relee el cierre y avisa con un diálogo («Ese día ya cerró»); no anuncia
      puntos ni pasa el cierre al día nuevo. Un fallo de red sale en un diálogo con «Reintentar», que vuelve a enviar lo mismo.
    * **Días anteriores: solo lectura** (`cierre/utils/lecturaDeCierres`, `useCierresAnteriores`): al tocar un día anterior de la semana
      (el mismo permiso que `GET /habit-tracks/day`: de ayer hacia atrás, hasta el lunes y desde el Día 1) la lista suma una fila
      «Cierra tu día» que dice **«Cerrado»** o **«Sin cerrar»** (con la hora del cierre si lo hubo). Se lee **solo al tocar ese día, una vez
      por fecha y cuenta** (nada al abrir Training ni al volver al foco; cambiar de cuenta o de semana limpia la memoria). La fila es solo
      texto: **un día que terminó no se cierra tarde** (D-259; el servidor responde 409). Los días que vienen no tienen fila.
    * **Cuándo no hay fila**: contra un backend sin la spec 017 (404, 403 o una respuesta que no es un cierre), con el interruptor `plan`
      de Soporte TI apagado (`CLAVES.plan`, nueva), con Training fuera de vista, antes de su hora o mientras no se sabe (**nada de
      parpadeos**: la fila solo existe con `listo`). Un fallo de red no la muestra y se reintenta al volver al foco. Al pasar la
      medianoche la lectura de ayer se descarta: la fila de ayer no queda en hoy. Esquemas tolerantes (`cierre/api/cierreSchemas`): una
      acción, un día o el resumen que no se entienden se pierden ELLOS; la hora de las acciones llega como `HH:mm:ss` y se acepta
      también `HH:mm`; el orden de las acciones es el del servidor.
    * **Las fichas** (`cierre/components/CierresDelDia`, **debajo del tiempo libre** de la spec 015, en `AlumnoScreen` —mentor o guía—,
      `FichaAprendizScreen` —Administración y Alquimista, solo si la persona tiene grupo— y `PersonaDelLiderScreen`): «Cierres del día»,
      solo lectura, semana de lunes a domingo con ‹ › (`Cierres del día: semana anterior` / `…siguiente`, nombres propios para no repetir los
      del tiempo libre ni los del semáforo). Arriba el resumen («3 cerrados · 1 sin cerrar») y «Lo que más se repite» («No me alcanzó el
      tiempo · 4 veces»); por día: «Jueves 29 · Cerrado» / «Sin cerrar» / «Hoy, todavía sin cerrar», cuántas acciones se cumplieron, cada
      pendiente con lo que dijo («No me alcanzó el tiempo → Hacerla a otra hora») y su nota, y la nota del día. «Sin cerrar» **no se
      dice como una falta**. Misma política que el tiempo libre: `cargar(semana)` estable por persona (el mentor pide
      `GET /mentor/groups/{g}/learners/{u}/cierres`; los otros tres, `GET /leadership/groups/{g}/people/{p}/cierres`), una lectura por
      semana, 403 o 404 esconden la sección, nada se dibuja mientras llega la primera lectura, «Reintentar» de 48. **Nada para la propia
      persona** fuera de Training.
    * **Textos y medidas**: tipo oración, tuteo de Perú, 16–17 px, áreas de 48 (chips, fila, flechas, «Reintentar»). Un solo scroll en la hoja
      (`keyboardShouldPersistTaps="handled"`).
    * **No cambian**: Hoy, Plan, Yo y Comunidad; los hábitos, las acciones y sus registros (cámara, Pastilla, Clase, evidencia), el
      semáforo, los puntos, la coherencia y la racha; la lista de Training salvo la fila nueva; el tiempo libre ni el Radar de las fichas.
      Sin dependencias nuevas ni código nativo.
    * **Hace falta el backend con la spec 017 (V121) antes y un APK nuevo** (la app no se actualiza por aire). Contra un backend anterior no
      aparece la fila ni la sección y Training queda como hoy.
    > **Corregido 2026-10-30 (pedido del dueño: «Cierra tu día» está siempre y no depende de Dormir).** Textual: «el tema de Dormir, y que
    > salga ahí "Cerrar tu día", está mal. Motivo: personas que trabajan en la noche o de día. No debiste juntar lógica de ese lado… como
    > botón: ingresa "Cerrar el día", y es todos los días, y debe guardarse y mostrarse en su ficha». La entrada de arriba decía que la fila
    > era «la última de hoy, a la hora de Dormir de hoy **menos 30 minutos**, y **a las 21:30 si Dormir no tiene hora**» (00:00 si Dormir cae
    > pasada la medianoche), que se calculaba en la app (`cierre/utils/horaDelCierre`), que «antes de su hora no existe y **no se lee nada**
    > del cierre», que «se ordena por hora entre el resto» y que la fila llevaba hora. Eso **ya no rige**. Lo que cambia y nada más:
    > * **La fila está SIEMPRE**, todos los días y a cualquier hora, como **la última fila de la lista de hoy en Training**: después de todo
    >   lo del día, también de lo atrasado, de «N hechos hoy» (plegado o abierto) y de Dormir. **No depende** de Despertar, de Dormir ni de
    >   ninguna hora, y **no lleva hora**: ni «22:00» ni otra calculada. La columna de la hora queda vacía —guarda el lugar para que la
    >   tarjeta alinee con las de arriba— y lo que oye el lector de pantalla empieza por «Cierra tu día» (ya no dice «Sin hora»). Ya cerrada,
    >   la hora en que se cerró se dice en su texto («Cerrado a las 23:50»), no en la columna. Un día anterior también va de última y sin
    >   hora.
    > * **Dónde**: se borró `cierre/utils/horaDelCierre` (y su prueba). `armarListaDelDia` entrega el cierre aparte (`cierre`, nuevo campo
    >   de `ListaDelDia`; ya no está en `enCurso`) y `ListaDeHoy` lo dibuja al final. `TrainingPorHora` lee el cierre de hoy en cuanto
    >   Training está a la vista (antes esperaba a su hora). `itemDelCierreDeHoy(hoyIso, vista)` ya no recibe hora.
    > * **Sigue igual**: la hoja, lo cumplido que llega marcado y solo se pregunta por lo pendiente y por mañana, que no da puntos ni cumple
    >   acciones y es opcional, el verde al cerrar (tocarla de nuevo abre la hoja para cambiarlo), «Cerrado» / «Sin cerrar» en los días
    >   anteriores (que no se cierran tarde, D-259), el 409 que recarga y avisa sin reasignar el cierre, y las fichas del mentor, el líder y
    >   Administración («Cierres del día»). **El día sigue siendo el día calendario de la persona** (su zona).
    > * **Sin lectura no hay fila** (backend anterior: 404; interruptor `plan` apagado; mientras no se sabe): eso no cambia.
    > * **Casos de quien trabaja de noche, descritos y probados sin inventar regla** (`cierreEnTraining.test.ts`, «caso 1…4», y
    >   `cierresDelDia.test.ts`): (1) turno de noche (Despertar 16:00, Dormir 08:00) que cierra a las 23:50: se guarda en el día de hoy y la
    >   fila queda verde; (2) a las 00:30 o las 02:00 del día siguiente ve el día **nuevo**, la fila es la del día nuevo y cerrar guarda
    >   ese; el día anterior queda «Sin cerrar» y ya no se cierra (409); una hoja abierta al pasar la medianoche se cierra y no envía nada;
    >   (3) cerrar temprano (06:00) se puede: el servidor pide respuesta por cada acción que **siga pendiente** en ese momento, aunque su hora
    >   no haya llegado (la hoja dice «Era a las 20:30 · quedó pendiente»); si después cumple algo, el día sigue cerrado y se puede reabrir
    >   y cambiar el mismo día; (4) un día normal que cierra a las 21:00 se ve en la ficha. Qué conviene hacer en cada uno es del dueño
    >   (preguntas en el informe de esta corrección y en D-290 del backend).
    > * **Hace falta un APK nuevo** (solo JavaScript; la app no se actualiza por aire). Backend: sin cambios (nunca validó una hora).
    >
    > **Corregido 2026-10-30, segunda parte (decisiones del dueño sobre los casos de quien trabaja de noche).** (1) *Cerrar después de
    > medianoche: se queda como está* («déjalo como está; con los hábitos, lo de no cruzar el horario ya se soluciona para esas
    > personas»): el día es el del calendario, el anterior queda «Sin cerrar» y no se cierra tarde; sin código nuevo. (2) *Cerrar temprano:
    > se pregunta SOLO por las acciones cuya hora ya pasó.* Lo de arriba decía que la hoja preguntaba por **cada acción que quedó
    > pendiente**. Ahora solo por las pendientes **cuya hora ya llegó** o **sin hora** (esas se preguntan como siempre); las de hora futura
    > no se preguntan ni se exigen. La decisión la toma el **servidor** (con su reloj y la zona de la persona) y la dice en
    > `exigeRespuesta` de cada acción de `GET /rocks/day-closure` (`AccionDelCierre.exigeRespuesta`, opcional: sin el dato —un backend
    > anterior— se pregunta por todas); la app no compara horas ni usa el reloj del teléfono. Qué cambia en la hoja:
    > * **Una pendiente de hora futura** se ve como una línea quieta (`LineaPorLlegar`: reloj, su nombre y «Es a las 20:30 · todavía no
    >   llega»), sin chips ni nota. «Guardar mi cierre» no la espera, el `PUT` no la lleva, y con solo de esas el texto dice «Lo que falta por
    >   hacer todavía no llega a su hora. No hace falta responder nada.» y se ofrece la nota del día. «Era a las 20:30 · quedó pendiente» queda
    >   para las que sí se preguntan (su hora ya pasó). Textos nuevos en tipo oración y tuteo; sin íconos nuevos (`clock`).
    > * **Si la hora llega con la hoja abierta**, el servidor responde 400 («Cuenta qué pasó con «X»…»): la hoja relee el día **sin perder lo
    >   ya elegido**, la acción nueva aparece con sus preguntas y se avisa con «Falta una respuesta» («Entendido», sin «Reintentar» a
    >   ciegas; resultado `falta` de `useHojaDelCierre`).
    > * **Dónde**: `cierre/utils/borradorDelCierre` (`aPreguntarDe`, `porLlegarDe`; `loQueFalta` y `cuerpoDelCierre` usan solo las
    >   preguntadas), `cierre/api/cierreSchemas` (campo opcional y tolerante), `cierre/components/HojaDelCierre`, `cierre/hooks/useHojaDelCierre`.
    >   Pruebas: `hojaDelCierre.test.ts` y `cierreEnTraining.test.ts` (a las 06:00 no pregunta por la de las 20:30 y a las 21:00 sí).
    > (3) *Cerrar temprano y luego cumplir una acción: se queda como está.* El cierre sigue verde y se puede reabrir; lo que dijo de la
    > acción cumplida ya no se muestra. **Hace falta el backend con esta corrección** para que las de hora futura no se exijan (un backend
    > anterior las exige: la app, sin `exigeRespuesta`, pregunta por todas) y un APK nuevo.
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
  * **Cambio por pedido del dueño — 2026-10-30 — tab `Yo` (Mi Radar) y `Hoy`: Mi Radar automático y personalizado (spec 019)** (spec,
    plan y vista previa aprobada en `Renaser-90-dias-backend/specs/019-radar-automatico/`; decisión D-292 del backend; textual: «aplicar ese
    rediseño, nada más»). **Reemplaza lo de elegir las horas a mano de la spec 012.** Lo que cambia y nada más:
    * **Los días 1 a 7 no cambian** (08:00 a 19:00, obligatorio). Desde el día 8, «Encendido» sigue opcional, con la invitación del día 8.
    * **Dos modos** (`ControlSegmentado`, sin animación al cambiar): **Automático** (por defecto) pregunta cada hora en punto entre el Despertar y
      el Dormir de ese día, de 03:00 a 23:00 y **sin el tope de 12** (05:30 y 22:30 dan 17; 08:00 y 23:00, 15); **Personalizado**: «Veces al día»
      con − / + (botones de 48), de 1 a las horas que caben ese día, repartidas parejo con `round(i·(n_slots−1)/(n−1))` (6 de 17 dan 06, 09, 12, 16,
      19, 22). **Las horas no se muestran, solo la cifra.** Al pasar a Personalizado se propone `min(6, las que caben)` (supuesto). Un día sin
      Despertar o sin Dormir (sin hora, apagado, en pausa, o Dormir ≤ Despertar) **no tiene Mi Radar**, en los dos modos: no se inventa un horario.
      Las horas las calcula el **servidor** (`HorarioDelDiaFinder`) y la app las lee ya resueltas: `utils/vecesDeMiRadar.ts` repite la cuenta
      (`horasQueCaben`, `repartirHoras`) solo para ajustar − / + y para fijar la regla en las pruebas.
    * **Yo → Mi Radar**, con la forma del editor de un hábito en Planificar (`screens/MiRadarScreen`): cabecera «‹ Mi Radar» con «Ahora: 05:30 a 22:30»
      y **sin ✕** (se vuelve con ‹ y con el atrás del sistema); fila «Encendido» (`InterruptorGrande`, sin descripción); el modo; **«Hora»** de solo
      lectura con la estética de la rueda (líneas doradas, «05:30 a 22:30» con «Despertar» y «Dormir» chicos; con horarios distintos «Estos días
      tienen horas distintas»); «Veces al día» solo en Personalizado; la fila de los siete días de Planificar (`FilaDeDiasDelPlan`, sin cambiar su
      forma) con **solo cuántas veces pregunta ese día** en dorado, candado en hoy y lo pasado y «—» en un día sin Radar (el lector de pantalla dice
      «Sábado 31, 15 veces»); «Todos los días» / «Solo sáb, dom»; «Sin Radar estos días» al marcar días; y **«Guardar · sáb, dom»** fijo abajo, con
      SOLO lo tocado. Sin «Cómo suena»: el Radar siempre suena, una vez por hora, sin repeticiones nuevas.
    * **Hoy y lo pasado no se editan** (candado, como en Planificar): `editable` lo dice el servidor por día y la app ni los marca ni los manda;
      el servidor también responde **409** («Hoy y los días que pasaron no se pueden cambiar»). **El modo y las veces son de cada día de la semana:**
      el control de modo cambia los días marcados o, sin marcar, todos los que vienen; hoy y lo pasado conservan lo suyo. «Encendido» rige en el
      acto. **El domingo** el domingo mismo queda con candado y de lunes a sábado se edita (la regla es por día de la semana, sin fecha).
    * **Sin Despertar (o sin Dormir):** en lugar de «Hora», una tarjeta de una línea («Falta tu hora de Despertar») y, fijo abajo, **«Programar mi
      Despertar»** (o «Dormir»), que lleva a **la pestaña Training** (`onProgramarHorario` → `navigate('Training')`). **No abre Planificar directo en
      ese hábito:** hoy no existe ese parámetro y Training no se toca en esta spec; queda anotado.
    * **Se quitan** «Lo ves tú, tu mentor y el equipo que coordina tu grupo.», «Aquí verás tus registros de hoy», «De 03:00 a 23:00, hasta 12 horas
      por día», «Toca un día para…», la elección de horas a mano (`HorariosDeMiRadar`, `HorasDeLosDias`, `DiasDeMiRadar`, `diasDeMiRadar.ts`) y la
      fila cortada debajo del botón flotante de SER: al final solo queda su relleno, y el botón de guardar fijo se corre lo justo para no quedar
      debajo de él (`entradaParaElLanzador`). **Tampoco están más las respuestas de la persona** (decisión del dueño, mismo día): ni los registros
      de hoy (`RegistroDeMiRadar`), ni la sección «Historial», ni «Patrones» (sus componentes, hooks y pruebas sin uso se borraron); eso lo ven su
      mentor y su líder en la ficha, que no cambia. Queda «Registrar ahora» y, en su lugar, **una sola línea «Hoy: 4 de 6»** (las veces que
      respondió hoy de las que le tocaban; el total son las horas de hoy de `GET /radar/mi-radar`): 16 px, `tabular-nums`, tipo oración, sin color
      de estado ni animación, y el lector de pantalla dice «Hoy respondiste 4 de 6 veces». Solo se dibuja con Mi Radar encendido y un día con Radar
      (no apagado, no «Sin Radar» hoy, no los días 1 a 7, no con 0 que tocan); `utils/miRadar.lineaDeHoy`.
    * **Para todos los roles que hacen los 90 días** (aprendiz, guía, mentor, líder, administrador y alquimista con su programa propio): ni Mi
      Radar ni la mitad de Hoy filtran por rol; la puerta es tener el programa activado desde el día 8 (lo decide el servidor). Lo fijan
      `radarConMiRadar.test.ts` y `miRadarParaTodosLosRoles.test.ts` (que además barre el código de `features/radar` buscando nombres de rol).
    * **Avisos del teléfono:** desde el día 8 y con Mi Radar encendido, **una alarma semanal por hora y por día de la semana de las que tocan**
      (`renaser.radar.slot.d{1..7}.HH`, lunes = 1; hasta 21 × 7 = 147 pendientes, por debajo de las 500 de Android; ya no hay diarias). Los días 1 a 7,
      las doce diarias de siempre. **Se rehacen** al cambiar el modo, las veces o «Sin Radar» (guardar relee), y cuando cambian el Despertar o el Dormir:
      `useConfigDeMiRadar` vuelve a leer Mi Radar al abrir la app y al volver a primer plano (con 10 minutos de por medio) y la huella de las horas
      (`claveDeMiRadar`) dispara la sincronización. **No se tocó Planificar para avisar al instante**; si el Despertar o el Dormir cambian, las
      alarmas se rehacen la próxima vez que se abre la app.
    * **Hoy (la mitad del Radar, spec 016) y las fichas** dicen lo que toca: la mitad «Próxima a las 20:00 · 05:30 a 22:30 · 17 veces» (la hoja «Tu
      Radar de hoy» lo repite y su enlace pasa a «Abrir Mi Radar»), «Hoy no tienes Mi Radar» y la fila de Yo `Encendido · 05:30 a 22:30 · 17 veces`.
      Las fichas del mentor, del líder y de Administración (`CodigoRenaserDelAlumno`): `Mi Radar: encendido · 05:30 a 22:30 · 17 veces`, `… · hoy no
      tiene Radar` o `apagado`.
      > **Corregido 2026-10-31.** En Hoy ya no se dice la línea «05:30 a 22:30 · 17 veces» ni «Toca para ver tu horario.»: la mitad queda con
      > su estado y su título («Próxima a las 20:00»). La hoja «Tu Radar de hoy» sigue diciendo el horario y las veces.
    * **Lo único que se toca fuera de Yo, Hoy y las fichas** son dos cambios **aditivos**: `FilaDeDiasDelPlan` suma la prop opcional
      `etiquetaPropiaDelDia` (lo que oye el lector de pantalla de cada pastilla; Training y Plan no la pasan y su fila es la de siempre) e
      `InterruptorGrande` deja de dibujar la línea de descripción cuando va vacía.
    * **Compatibilidad:** `GET/PUT /radar/mi-radar` devuelven los siete días ya resueltos; una respuesta de un backend anterior a la 019 (con `horas`) se
      lee como un error y la fila de Yo no aparece. **Hace falta el backend con V122 antes y un APK nuevo** (la app no se actualiza por aire).
    * **El 403 de Mi Radar dice por qué y lleva a elegir el Día 1** (último pedido del dueño sobre la spec 019: «no quiero bugs en esa parte»).
      Hasta hoy un 403 de `GET/PUT /api/v1/radar/mi-radar` se leía como «no hay Mi Radar», en silencio. Ahora el cuerpo trae `codigo`
      (`PROGRAMA_NO_ACTIVADO`, `CUENTA_SUSPENDIDA` o `SIN_PERMISO`; el formato `ApiErrorConCodigo` de siempre) y la lectura
      (`useConfigDeMiRadar.lecturaDeUnError`) lo distingue; la pantalla dice lo que toca con `utils/vistaDeMiRadar` y
      `components/SinMiRadar`:
      * **Sin programa activado** (el personal —mentor, líder, administrador, alquimista— que no eligió su Día 1, con o sin fila de programa;
        lo decide el servidor, no el rol): en lugar de la pantalla, «Mi Radar empieza en tu día 8. Primero elige tu Día 1.» y el botón
        **«Elegir mi Día 1»** (`programa/components/BotonElegirDiaUno`, que abre `ActivarProgramaScreen` con su flecha para volver). Al
        confirmar, la pantalla olvida el motivo («Cargando Mi Radar…», nunca el de antes ni la pantalla vacía) y vuelve a leer: con el
        programa activado y antes del día 8 dice cuándo empieza («Mi Radar empieza en tu día 8, el domingo 1 de noviembre.», con la
        fecha de hoy del servidor; sin Día 1 todavía, sin fecha). Desde el día 8, el formulario de siempre.
      * **Suspendida o sin permiso**: una línea con el motivo («Tu cuenta está suspendida: Mi Radar no está disponible.» o «No tienes
        permiso para usar Mi Radar.», textos de la app y no del servidor) y nada más: sin botones que no llevan a nada.
      * **Sin red o 5xx**: «No pudimos cargar Mi Radar.» con «Reintentar» (que también pasa por «Cargando…»).
      * **Con un backend anterior** (un 403 sin `codigo`, o con uno que esta app no conoce) **se lee como hoy**: «no hay Mi Radar», en
        silencio, sin fila (FR-010). Un 404 también.
      * **Yo → fila «Mi Radar» para el personal sin programa** («Primero elige tu Día 1»): **solo cuando el servidor lo confirmó**. Yo le
        pregunta a `GET /radar/mi-radar` (una vez por cuenta, `solicitar`) únicamente a quien puede no tener programa activado
        (`capacidades.puedeIniciarPrograma` —sin fila— o la fila sin Día 1), así que **para el aprendiz y para quien ya va por su programa
        Yo no cambia** y antes del día 8 no se les pide nada. Elegir el Día 1 en cualquier lugar (Yo, Hoy, Training) invalida la lectura
        (`escucharDiaUnoElegido`), de modo que la fila no se queda diciendo «Primero elige tu Día 1» después de elegirlo. Las decisiones
        están en `radar/utils/miRadarEnYo` y se prueban sin pantalla.
      * **Sin parpadeos**: `recargar` (al abrir la pantalla, al volver a Hoy tras un fallo) relee **en silencio**, sin vaciar lo que se ve;
        `reiniciar` (elegir el Día 1, «Reintentar») deja la lectura en «pendiente» antes de pedir, y una respuesta vieja no pisa a la nueva.
        Un fallo de red al releer **no borra** una lectura buena ni un motivo que el servidor ya dio. El historial del Código Renaser no se
        pide mientras no hay Mi Radar a la vista.
      * **Servidor** (backend, D-292): el 403 de la suspensión y de la falta de permiso lo escribe el filtro de permisos
        (`PermissionEnforcementInterceptor`), así que el `codigo` aparece también en esos 403 de otros endpoints (aditivo: `message` no cambia).
        Quien no tiene fila de programa recibe el mismo 403 `PROGRAMA_NO_ACTIVADO` (antes un 404 «Participante no encontrado»).
      * **Hace falta publicar el backend antes que la app** (con la app nueva contra el backend anterior no aparece la fila ni cambia nada) y un
        APK nuevo. Maestro: `.maestro/mi-radar/16-personal-sin-programa.yaml`.
    * **No cambian**: Training, Plan, los días 1 a 7, los hábitos, el formulario, los demás tabs ni la barra.
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
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Plan`: sin la vista muerta de hábitos, selector de eje,
    las cuatro fases, íconos por eje y hojas desde abajo** (rediseño aprobado por el dueño según la auditoría:
    mosaico `hoyplan-iconos-inventario.png`, filas de Plan; respuesta literal «1 sí, 2 sí, 3 sí, 4 fases que
    mencionas, 6 sí»). Lo que cambia y nada más:
    * **Se borró la sub-vista «Hábitos 7 días»** (~700 líneas: semana LUN–DOM, crear y reubicar hábito, hora,
      renombre de bebidas): nada la abría desde `8b78a00` (2026-09-08) —ni `setActiveSubView('habitos')`, ni
      parámetro de ruta, ni aviso (los de hábitos abren Training)—. Todo eso vive en Training. Los tipos
      `PlanHabit`/`DayOfWeek`/`DayMoment` siguen exportados desde `PlanScreen` (los usan hábitos y Training).
    * **Objetivos**: volver es la flecha de 24 en 48 con el nombre del eje (eran «← VOLVER A PLAN» y la píldora
      «02. OBJETIVOS (3 NIVELES)»), y debajo un `ControlSegmentado` Cuerpo / Negocio / Relaciones para cambiar de
      eje sin volver a Plan, en el orden de las tarjetas (el principal primero).
      > **Corregido 2026-10-31 (pedido del dueño, «en Plan replica este formato»).** La sub-vista Objetivos, su flecha de volver y las
      > «Prioridades clave» en lista ya no existen: Plan es una sola pantalla con el selector de eje arriba. Ver la entrada del 2026-10-31.
    * **«Arquitectura de tiempo»** dibuja las cuatro fases del programa con su largo (1–7, 8–34, 35–64, 65–90) y
      su nombre, y marca la que dice el backend; antes eran tres tramos de 30 días que contradecían la «Fase
      actual» de arriba. Los días salen de `FASES_EN_ORDEN` (`home/hooks/useResumenHome`, que ahora trae
      `primerDia`/`ultimoDia` y arma el rótulo con ellos), vía `objetivos/utils/arquitecturaDeTiempo`.
      > **Corregido 2026-10-31 (pedido del dueño).** «Arquitectura de tiempo» ya no está en Plan (ya está en Yo); se borró con su
      > cuenta (`arquitecturaDeTiempo`). `FASES_EN_ORDEN` y `faseEnCurso` siguen siendo la tabla única de fases.
    * **Íconos** (bloque `/* Plan */` de `Icon.tsx`: `activity`, `heartHandshake`, `calendarRange`; `flag` es el de
      Hoy y `compass` el de Yo):
      cada eje con el suyo (`objetivos/utils/iconoDelEje`: Cuerpo `activity`, Negocio `briefcase`, Relaciones
      `heartHandshake`), en las prioridades de Plan (en vez de «01/02/03», con chevron gris de 16) y en los pasos
      Prioridad y Sistema de ejecución del Mapa (Relaciones era `users`, el de Tribu; Cuerpo era `heart`). El
      objetivo de 90 días con `flag` (era `trophy`), «Editar»/«Avance» y «Este mes» con `pencil` 16 (eran ✏️; el
      del mes en un área de 44), la semana con `calendarRange` dorado (era `zap` en verde), la acción cumplida con
      `checkCircle` (era «✓» de texto). `target` queda solo en «Tus acciones»; el Código Renaser de Hoy pasa a
      `compass`.
    * **Hojas desde abajo**: editar el objetivo / anotar el avance, el objetivo del mes, armar la semana, agendar
      acciones y la revisión de la semana son `HojaDesdeAbajo` con el mismo contenido (eran ventanas centradas con
      «✕ Cerrar»). En agendar, la ✕ cierra la hoja entera; salir de la rueda de la hora sin elegir es «Cancelar».
    * **Avisos**: «¡Objetivo actualizado! 🎯» y «¡Avance anotado! 🎯» son una `ConfirmacionEnLinea` bajo el objetivo
      con `tacto.logro()`. Los errores siguen en diálogo.
    * **Texto**: rótulos y botones en tipo oración; sin el lema «Enfocado. Estratégico. Real.»; los estados vacíos
      del objetivo, la semana bloqueada y las acciones en dos renglones; los ejemplos del formulario en gris tenue
      con «Ej.:» («Ej.: 82», «Ej.: 30000», «Ej.: USD»).
    * **Respuesta al tacto**: `Presionable` en las prioridades, volver, «Más detalles», la escala 1–10 (semana y
      revisión, con `tacto.seleccion()`) y «Agendar otro día» (área de 48); la fila de días de agendar vibra al
      cambiar de día (la fila es de `habits/components/FilaDeDiasDelPlan`, que no se tocó).
    * **No se tocaron**: Hoy (salvo el ícono del Código Renaser), semáforo, chat de SER, Training, Yo,
      `iconosDeHabito.ts`, `FilaDeDiasDelPlan` ni el texto de `AperturaScreen`. **Hace falta un APK nuevo** (la app
      no se actualiza por aire).
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Hoy`: íconos, tipo oración, respuesta al tacto y el día
    real en el Mapa** (rediseño aprobado por el dueño según la auditoría: mosaico `hoyplan-iconos-inventario.png`,
    filas de Hoy; decisiones: SER se queda dos veces —orbe con micrófono = voz, botón flotante = chat— y «Cómo se
    calcula» del semáforo se pliega con textos más cortos). Lo que cambia y nada más:
    * **Íconos** (Lucide, caja de 24, bloque `/* Hoy */` de `Icon.tsx`: `gauge`, `map`, `listChecks`, `flame` y
      `flag`, este último para el objetivo de 90 días de Plan): los puntos van sin ícono («170 pts», como Ranking);
      Coherencia con `gauge` (era la diana `target`); la racha con `flame` a 16, gris en 0 (era `fire` a 14); el Mapa
      con `map` (era el asterisco `spark`) y el chevron gris de 16 en vez del disco dorado de 40; «Hábitos de hoy»
      con `listChecks` (era el sol de la pestaña); el autor de la última evidencia con `AvatarPersona` (era un
      `user` igual para todos) y «1 foto» con `image` 16 (era `camera` y «1 evidencia»); el evento con `calendar`
      20. La propuesta flotante de SER, la cabecera y el vacío de su chat llevan `OrbeQuieto` (eran `spark` y el
      globo `chat`); el chat de Sparkie conservaba el globo (Sparkie se retiró el 2026-10-06, D-255). El Código Renaser conserva `target` hasta que entre
      `compass` del rediseño de Plan.
      > **Corregido 2026-10-31.** Coherencia (`gauge`) y la racha (`flame`) ya no se dibujan en Hoy: el dueño quitó el bloque
      > porque está en Yo. Los íconos siguen en `Icon.tsx` y Yo los usa.
    * **Tipo oración** en lugar de versales: fase, «Día 15 de 90», «Coherencia», «Racha», «días», «Tu
      acompañante», «Ver en el chat» (14 con chevron de 16), los estados del Código Renaser («En espera»,
      «Registrado», «Innegociable», «Abierto»), «Cancelar»/«Confirmar»/«Tomar foto» de la propuesta (también en
      la tarjeta del chat), «Reintentar» y «Ver mensajes anteriores» del chat de SER. La fecha del próximo evento
      dice «Hoy · 20:00» o «mar 6 oct · 20:00» (`home/utils/cuandoEsElEvento`; era «5/10/26, 20:00»).
    * **Semáforo**: en la tarjeta, chevron de 16 centrado a la derecha (iba arriba); en el detalle, volver es la
      flecha de 24 en 48 sin texto (era «← VOLVER») y «Cómo se calcula» llega plegado con «Más detalles» / «Ver
      menos», cuatro frases cortas y los mismos umbrales.
    * **Respuesta al tacto**: las tarjetas de Hoy (Mapa, Hábitos, semáforo, Acciones, evidencia, evento, Código
      Renaser) con `Presionable`; el orbe vibra con `tacto.seleccion()` cuando el toque empieza a escuchar y con
      `tacto.mantener()` cuando mantenerlo cierra la conversación; «Terminar» es una píldora de 44 (medía ~26);
      cerrar el chat de SER es un ✕ de 24 en 44 sin disco. El chevron del Mapa va a la altura del título y no
      centrado: con Hoy sin desplazar, en Android el botón flotante de SER caía sobre el centro de su borde
      derecho (`RenasiaLauncher` no se movió).
    * **Mapa (bug)**: la apertura decía «DÍA 7» y «los próximos 83 días» escritos a mano, y la cabecera de cada
      paso «Día 7». Ahora la apertura dice el día real (`useProgramaDia`, `GET /home`) y los días que quedan con
      la misma cuenta que Hoy (`home/utils/diasQueQuedan`); mientras no se sabe el día no muestra número. La
      cabecera de los pasos dice solo «Paso n de 10».
    * El campo de escribir del chat de SER va en un renglón en la web (`propsDelCampoDelChat`, como Comunidad).
    * **No se tocaron**: `RenasiaLauncher`, `TabBar`, Plan, Objetivos, Training, Yo ni el formulario del Código
      Renaser. **Hace falta un APK nuevo** (la app no se actualiza por aire).
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Yo` → Evidencia: la foto real en cada miniatura**
    (backend D-252). El dueño preguntó «¿Mostrar la foto real de cada evidencia en Yo?» y respondió «sí».
    Lo que cambia y nada más:
    * La tira de tres miniaturas de «Evidencia» y la grilla de «Registro de Evidencias» pintan la foto real
      (`evidence/components/MiniaturaDeEvidencia`, `expo-image`) encima del ícono del tipo, que sigue de
      respaldo: sin `fotoUrl` (texto, video, audio, o un backend anterior a D-252), con una URL que no es de
      la red, o si la foto no carga. La foto entra con un fundido de `DURACION_MS.fundido`.
      > **Corregido 2026-10-31 (pedido del dueño).** La tira de tres miniaturas de Yo se quitó; queda la grilla de «Mis evidencias»
      > (Ajustes → Tu proceso).
    * En la grilla del registro, tocar una foto la abre en grande en el visor que ya existía
      (`ImageViewerModal`, sin reacciones ni comentarios). En la tira, tocar sigue llevando al registro.
    * `fotoUrl` es opcional y tolerante en `evidenceSchemas.ts`; la clave de caché es la URL sin la firma
      (`evidence/utils/fotoDeEvidencia.ts`), la misma del visor. Ningún texto visible cambia; la foto
      ampliable se anuncia al lector de pantalla como «Ver la foto en grande».
    * **Hace falta el backend con D-252 y un APK nuevo** (la app no se actualiza por aire).
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Comunidad` → Eventos: el logo del servicio junto al
    «dónde».** Pedido del dueño: «Ayúdame con el diseño para el tema de íconos: https://github.com/pheralb/svgl
    utiliza esta parte». Es la aplicación de ese pedido general a Eventos, no una autorización aparte para el tab:
    si el dueño no lo quiere acá, se revierte solo el commit «Mostrar el logo de Google Meet, Zoom o Google Drive
    junto al lugar del evento». Lo que cambia y nada más:
    * Donde un evento dice por dónde es (la tarjeta de «Tarjetas», la fila del día en «Calendario» y «Es por …» del
      detalle), un link de Meet, Zoom o Drive lleva el logo de esa marca (`LogoDeMarca`, decorativo: el nombre ya
      está escrito). Un enlace sin marca sigue con `play` y una dirección con `users`, como antes.
    * La marca sale de `marcaDelLink`, que lee el dominio igual que `nombreDelLink`: el logo y el texto no pueden
      decir dos servicios distintos. Ningún texto, botón ni etiqueta accesible cambia.
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).
  * **Excepción autorizada por el dueño del producto — 2026-10-05 — tab `Comunidad` (chat): responder y
    copiar un mensaje, descartar una nota de voz, y la barra de escribir y las burbujas del rediseño**
    (backend D-251). El dueño respondió «sí» a (a) un menú al mantener presionado un mensaje con copiar y
    responder, y (b) un botón para descartar una nota de voz mientras se graba («hoy cortar = enviar sí o
    sí»); y aprobó el rediseño de Comunidad (mosaico `comunidad-iconos-inventario.png`, filas «Barra de
    escribir», «Grabando», «Nota de voz», «Burbuja»). Lo que cambia y nada más:
    * **Menú del mensaje**: mantener presionada una burbuja (también su foto o su cita; 350 ms) vibra
      (`tacto.mantener`), tiñe su renglón y abre una hoja desde abajo (`chat/components/MenuDelMensaje`,
      sobre `HojaDesdeAbajo`) con «Responder» y, si hay texto escrito por alguien y el teléfono puede,
      «Copiar» (`expo-clipboard`; «Copiado» flota un momento sobre los mensajes). No había ninguna
      acción previa en el toque largo.
    * **Responder**: «Respondiendo a…» encima del campo (autor —«Tú» en dorado—, una línea con lo que
      decía o el ícono del adjunto, miniatura de la foto o del sticker, y ✕), entra con fundido y 8 px en
      180 ms. Lo próximo que se mande —texto, foto, sticker o nota de voz— viaja con `replyToId`; sin
      cita el cuerpo del POST es el de siempre. En la burbuja, la cita va arriba
      (`CitaDeRespuesta.CitaEnLaBurbuja`); tocarla lleva al mensaje si está cargado y lo tiñe un
      momento. Si el citado ya no está, «Mensaje eliminado» sin autor. La cita sale de
      `chat/utils/citaDelMensaje.ts`: del servidor (`replyTo`, `replyToDeleted`) o, con un backend
      anterior a D-251 que devuelve solo `replyToId` al enviar, del mensaje citado ya cargado. Los campos
      nuevos del esquema son tolerantes: un resumen roto pierde la cita, no la página.
    * **Barra de escribir**: dentro del campo, a la izquierda, los stickers con el ícono `smile` (antes la
      imagen de un sticker de 32 px); a la derecha la galería (`image`) y la cámara (`camera`), cada una
      directa: se quitó la ventana centrada «Enviar una foto — ¿De dónde la sacamos?». Los cuatro
      botones del campo son `Presionable` de 44.
    * **Grabando**: a la izquierda la papelera (`trash`, en rojo) descarta la nota sin mandarla, con un
      golpe háptico (`tacto.descartar`) y sin alerta. Enviar sigue igual.
    * **Burbujas**: la nota de voz con `play` / `pause` de `Icon` en un botón de 44 con `Presionable`
      (antes «▶ ⏸» de texto, que Android pintaba como emoji); «✓» / «✓✓» pasan a los íconos `check` /
      `checkCheck` de 16, en los mismos colores.
    * Íconos nuevos en `components/Icon.tsx` (Lucide, caja de 24, de línea, grosor común):
      `smile`, `trash`, `checkCheck`, `reply`, `copy`.
    * **Dependencia nueva: `expo-clipboard`** (código nativo). Se carga recién al copiar
      (`chat/utils/portapapeles.ts`): un binario sin el módulo no ofrece «Copiar» y no revienta. **Hace
      falta un APK nuevo** (que de todos modos ya es build completo por `expo-haptics`).
    No cambian las secciones de Comunidad, el Muro, compartir, las reacciones, el selector de stickers
    (solo el botón que lo abre), crear publicación ni el ranking. Una excepción puntual **no abre** el
    tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar autorización explícita.
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Comunidad`: íconos, «Cursos» y respuesta al tacto**
    (tandas 1 y 3 del inventario de íconos de Comunidad, decisiones del dueño del 2026-10-05). Lo que cambia y
    nada más:
    * **«Cursos» en vez de «Classroom»**, solo en el texto visible: la clave `classroom`, las rutas y los
      atajos desde Training no cambian.
    * **Íconos de línea en vez de emojis y metáforas equivocadas**: secciones (Muro `newspaper`, Cursos
      `bookOpen`, Testimonios `quote`); el botón de la cabecera abre tu grupo con `users` (era una ⓘ); sellos de
      la lista de chats (grupo `users`, comunidad `globe`, soporte `headset`); avatares con foto o iniciales
      (`AvatarPersona`) en vez de 👤/🦅; «Escribir» con `messageCircle` (era «💬 Chatear»); lecciones con su tipo
      (`video`, `fileText`, `link`, `pencil`) y un solo candado; Ranking con la cifra sola (sin ⚡/🔥) y el trofeo
      de línea en los estados vacíos (las medallas 🥇🥈🥉/👑 del podio **se quedan**: son decoración); «Ver ficha»
      con `idCard`; «Tarjetas» de Eventos con `layoutGrid`; lupa en el buscador de Soporte.
    * **Tarjeta del Muro**: «Me gusta», «Comentar» y «Compartir» con ícono de 20 y texto de 14 en un solo gris;
      «Me gusta» pasa a dorado y negrita al darlo. La chapa de reacciones subió al resumen, a la izquierda (al
      final de la fila de acciones quedaba debajo del botón flotante de SER). El voto de un comentario muestra si
      ya lo diste; adjuntar a un comentario muestra `image` (abre la galería) y enviar es el botón redondo de `send`.
    * **Tipo oración** en lugar de versales espaciadas: «Ver todos», «Volver a los cursos», «Volver al curso»,
      «Marcar como completada», «Siguiente», «Finalizar», «Explorar contenido», «Hecho» y la categoría del curso.
    * **Respuesta al tacto** (`Presionable`, 0,97 en 120 ms) en medallones, barra de crear publicación, tarjetas de
      curso, filas de lección y de chat, «Ver todos» y la cabecera de Soporte; `tacto.seleccion()` al cambiar de
      sección y `tacto.logro()` al publicar, compartir y completar una lección.
    * **Los avisos de éxito dejaron de ser diálogos** («¡Publicación Compartida! 🦅», «¡Hábito completado! 🦅»,
      «¡Excelente Progreso! 🦅», «¡Curso Completado!»): son una línea con ✓ junto a lo hecho, que se va sola
      (`ConfirmacionEnLinea`). Los errores siguen en diálogo.
    * **La fila de medallones deja asomar medio medallón** cuando no entra entera, para que se vea que se desliza,
      y lleva a la vista entera la sección que se elige (`separacionDeLaFila`).
    * **Botón flotante de SER**: el orbe de SER quieto (`OrbeQuieto`) en vez del globo de chat, con nombre para el
      lector de pantalla. Se eligió el orbe y no el fénix: el orbe es la cara de SER en Hoy; el fénix es la foto
      del programa en el chat de la comunidad.
    * **No se tocaron** (los llevan otros trabajos en curso): la sala de chat y su barra de escribir, las burbujas y
      la nota de voz, `SharePostSheet`, el modal de reacciones, el de stickers, el modal de «Nueva publicación»
      y el selector del Ranking (los cambió la tanda 2, «hojas», que entró en la misma integración).
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).
  * **Cambio por pedido del dueño — 2026-10-06 — tab `Yo`: el animal de cada fase** (mono, gorila, caballo, águila,
    tomados del repo anterior `RenaserAntiguCuidado`; son el arte 3D recortado: `gorila2`/`caballo2`/`aguila2` y
    `avatar-frames/macaco3d-tutorial/anim-01`). Lo que cambia y nada más:
    * **En «Tu evolución»**: un disco con el animal de tu fase actual (aro dorado) junto a «Fase 2 · El Ciclo Alquímico»,
      «Día N de 90» y «Tu animal: Gorila», y debajo la fila de las cuatro fases: las pasadas a color con una marca de
      superada, la actual con aro, las que vienen en silueta tenue (no se revela qué animal es).
    * **Correspondencia por posición** (Fase 1 mono, 2 gorila, 3 caballo, 4 águila), no por días: el repo anterior cortaba
      en 1–16/17–34/35–64/65–90 y las fases de ahora son 1–7/8–34/35–64/65–90. `animalesDeFase.ts` sólo dice qué animal es;
      la fase actual sale de `resumen.fase` (`descripcionDeFase`), sin repetir la regla de los días.
    * **Primera vez en una fase nueva**: el animal aterriza con un resorte corto (desde 82 %), un aro dorado se abre y se
      desvanece (700 ms) y se lee «¡Entraste en la Fase N!». Una vibración (`tacto.logro`). Con «reducir movimiento» no se
      anima. Se guarda la última fase vista por cuenta (`yo.faseVista.<id>`); la primera vez que se abre Yo no se celebra
      nada (no se festeja una fase que ya venía de antes).
    * Imágenes en `assets/fases/` (WebP 512×512 con transparencia, menos de 60 KB cada una). El rótulo «Fase N · nombre»
      reemplaza al rótulo suelto del nombre de la fase.
  * **Cambio por pedido del dueño — 2026-10-06 — tab `Yo`: la tarjeta de fase «B · Tarjeta héroe» y las imágenes configurables**
    (el dueño comparó 4 diseños y eligió la B; pidió además un CRUD en Administración con vista previa).
    > **Corregido 2026-10-06.** La entrada de arriba («el animal de cada fase») describía un disco con aro y la fila de
    > las cuatro fases. El dueño eligió la B: **la fila de fases y `EmblemaDeFase` se quitaron**. Se conserva el momento
    > «¡Entraste en la Fase N!» (único deleite, una vez; ahora el animal aterriza con el resorte, sin aro) y «reducir movimiento».
    * **Yo → «Tu evolución»**: `TarjetaDeFase` a todo el ancho (262 px, degradado dorado sutil, claro y oscuro): «FASE 2 DE 4»,
      el nombre de la fase en serif, «Tu animal: Gorila», «Día 8 de 27 de esta fase» con barra, «Día 15 de 90 en total» y el
      animal grande saliendo por la derecha. Recibe todo por props (`imagen`, `imagenDeRespaldo`, `paleta` opcional): **es el
      mismo componente que usa la vista previa del administrador**.
    * **Días dentro de la fase**: `utils/diasDeLaFase.ts` los saca de `FASES_EN_ORDEN` (la única tabla de fases de la app, con
      los cortes del backend 1/8/35/65). El backend aún no manda inicio y fin de la fase en `/home`; cuando lo haga, se
      cambia esa función. Sin fase o sin día no se dibuja la barra.
      > **Corregido 2026-10-06 (`fase-en-yo`).** `utils/diasDeLaFase.ts` ya no existe: la cuenta vive en
      > `features/home/utils/faseEnCurso.ts`, la misma que usa Plan (ver la entrada de abajo).
    * **Imagen y nombre configurados** (backend D-258, `GET /api/v1/phase-animals`): `useAnimalesDeFase` + `animalConfigurado`.
      Sin nada configurado, sin red o si la imagen no carga, se usa la de `assets/fases/` (respaldo). La imagen remota lleva
      `cacheKey` = su ruta (la URL firmada cambia cada hora).
    * **Administración → Más opciones → «Imágenes de las fases»** (solo ADMIN y ALCHEMIST: Administración ya se muestra por
      `canAdminister`): lista de las 4 fases («Imagen por defecto» / «Imagen cambiada») y, al tocar una, el detalle con la vista
      previa de la tarjeta **en claro y en oscuro**, nombre del animal, «Elegir una imagen» (selector sin recorte ni JPEG, para
      conservar la transparencia; recomendación «PNG o WebP con fondo transparente»), «Guardar» y «Restaurar la imagen por
      defecto» (diálogo de confirmación y `ConfirmacionEnLinea` al terminar). Validación previa de tipo (PNG/WebP), peso (2 MB) y
      medidas (256–4096 px) con los mismos límites del servidor, que decide al confirmar.
    * **Hace falta un APK nuevo** y el backend con D-258 (V94).
  * **Cambio por pedido del dueño — 2026-10-06 — tabs `Yo` y `Plan`: la misma fase en las dos** («En Yo las fases están con
    bug: deben ser iguales que en Plan […] los mismos días que salen en Plan, en "Arquitectura de tiempo"»). Lo que cambia y
    nada más:
    * **Una sola cuenta de la fase**: `features/home/utils/faseEnCurso.ts` (número, nombre, rango «Días 8–34» y «Día N de M de
      esta fase», con la fase que manda el backend en `/home` y los cortes de `FASES_EN_ORDEN`). La leen la tarjeta de Yo,
      «Fase actual» y «Arquitectura de tiempo» de Plan y la vista previa de Administración. Se quitó `yo/utils/diasDeLaFase.ts`.
    * **Plan lee `/home` con `useResumenHome`** (como Yo y Hoy), que relee al volver al foco. Antes usaba `useProgramaDia`, que lo
      lee una sola vez al montar la pestaña: con la app abierta al cambiar el día, Plan se quedaba en el de ayer (del 34 al 35, Yo
      decía «Fase 3 · El Maestro Interno» y Plan «02 · El Ciclo Alquímico»). Solo la primera carga cuenta como «cargando», así
      el arco y los tramos no se vacían al volver.
    * **La tarjeta de Yo dice el rango de Plan**: «FASE 2 DE 4  Días 8–34» (el rango en el color `micro`, como en Plan junto al
      «02»). El resto del diseño B no cambia. Sin APK nuevo no se ve en el teléfono.
    * **El animal nunca tapa el texto** (de 320 a 430 px y con letra del sistema grande): `utils/medidasDeLaTarjetaDeFase.ts`
      calcula, con el ancho real de la tarjeta (`onLayout`) y `fontScale`, cuánto mide el animal (112–240 px) y cuánto ancho
      se reserva a la columna de texto, que termina siempre antes de la caja del animal. El texto manda: en un teléfono
      angosto el animal se achica y sigue saliendo por el borde derecho; con la columna más angosta, «Días 8–34» puede bajar
      a su propia línea. Antes el animal medía 240 px fijos y a 360 px tapaba «de esta fase» y «en total». Vale también para
      la vista previa de Administración (mismo componente).
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Yo`: Yo y el Centro de Perfil y Ajustes** (rediseño aprobado
    por el dueño: mosaico `trainingyo-iconos-inventario.png`, filas de Yo y Ajustes, y sus decisiones 10, 12 y 14).
    Lo que cambia y nada más:
    * **Una sola de cada cosa (decisión 10)**: a Ajustes se entra solo por el engranaje de la cabecera (`settings`,
      con nombre «Ajustes»; eran unos «⋯» sin nombre que abrían lo mismo que la tarjeta del usuario, que ya no se
      toca). «Cerrar sesión» queda una vez, en Ajustes, al final, en rojo y sin «›». **«Eliminar mi cuenta» pasó a
      Ajustes**, junto a «Cerrar sesión», como fila roja visible (Google Play exige que se encuentre).
    * **Yo**: la Caja, Administración, «Mi ficha y Pacto» (`signature`) y «Tuve una emergencia» (`lifeBuoy`; era ♡)
      son filas de una lista; antes eran tarjetas sueltas y botones de web en versales.
      > **Corregido 2026-10-05 (ajustes de Hoy y Yo).** «Mi ficha y Pacto» ya no está en Yo: abría la misma vista
      > que «Mi onboarding» de Ajustes, y el dueño dejó solo esa. El ícono `signature` queda en `Icon.tsx` sin uso.
    * **Ajustes estilo iOS** (`features/yo/components/FilasDeAjustes`): filas de 56 agrupadas, baldosa dorada de 30
      con el ícono de 18, «›» de 20, y la línea entre filas solo ENTRE filas (arregla la raya negra al pie de cada
      grupo en modo claro: la última fila tenía borde inferior sin color). Los grupos se llaman **Perfil, Tu
      proceso, Herramientas y Preferencias** (decisión 14; decían «FASE 1…4», que chocaba con las fases del
      programa). Íconos: «Mi onboarding» `listChecks`, «Información» `idCard`, «Mis evidencias» `images`, «El Método»
      `compass`, Alarmas `alarmClock`, «Lo que SER recuerda» el orbe de SER (`OrbeQuieto`).
    * **Volver, una sola forma**: todas las sub-vistas usan la cabecera «‹ título» de `CabeceraAdmin` (como la Caja,
      la emergencia y eliminar la cuenta), y vuelven adonde se abrieron: a Yo si se llegó desde Yo, a Ajustes si
      desde Ajustes (`features/yo/utils/navegacionDeYo`). El gesto del sistema va al mismo lugar.
    * **El Pacto ya firmado (decisión 12)**: en solo lectura, «Firmado el <fecha>» (`pactSignedAt`) y sin lienzo ni
      «Sellar». **La firma dibujada se ve arriba de la fecha** (`PactoFirmado`, con `GET
      /api/v1/onboarding/pact/signature`, backend D-253): el PNG tal como se selló, sobre el papel blanco del
      lienzo en los dos temas (no se invierte: volvería azul el dorado), con `expo-image` y la URL sin la firma
      como clave de caché (`features/yo/utils/firmaDelPacto`). Sin la URL (backend anterior, 404, sin red) o si
      la imagen no carga, queda solo «Firmado el …».
      > **Corregido 2026-10-05 (mismo día).** Decía: «La firma dibujada no se muestra: el servidor la guarda pero
      > ningún endpoint la devuelve (solo el `mediaId` en `/onboarding/answers`); hace falta backend para
      > mostrarla». El backend se hizo (D-253, rama `pacto-firma` de los dos repos); hace falta desplegarlo y un
      > APK nuevo.
    * **El Método**: las cuatro fases son páginas que se deslizan con el dedo (asoma la siguiente; los puntos solo
      indican, y para el lector son un control ajustable), con «Siguiente fase» para quien no desliza. Se fueron el
      giro 3D con el `Animated` de React Native, las flechas y los colores pastel a mano; la Fase 3 dejó el ♡.
    * **`Interruptor`** (`components/Interruptor.tsx`): reemplaza los `Switch` con colores a mano de Yo
      (modo oscuro), Notificaciones y Alarmas (en la web su pulgar salía verde azulado). Tema, `tacto.seleccion()`,
      rol `switch`. Los de Training, Plan y `RecordatorioDeAcciones` quedan para el integrador.
    * **Éxitos en línea**: «Perfil guardado», «Información guardada», «Foto actualizada», «Pacto sellado» y la
      evidencia registrada ya no son diálogos: una línea bajo la cabecera con `tacto.logro()`
      (`ConfirmacionEnLinea`). Los errores siguen en diálogo.
    * **Textos**: versales a tipo oración (rótulos de campo, botones, «Acto fundacional»); «Cambiar foto» con la
      cámara en una insignia sobre la foto (era el emoji 📷); en Alarmas el radio del sonido no elegido es un círculo
      vacío (era el parlante).
    * No se tocaron las miniaturas y la foto de las evidencias en Yo (trabajo aparte), Training, Hoy, Plan ni
      `TabBar`. Íconos nuevos en el bloque `/* Yo */` de `Icon.tsx`: `lifeBuoy`, `alarmClock`, `settings`, `images`,
      `listChecks`, `compass`, `package`, `signature`.
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
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Training`: la racha real de cada hábito** (D-254 del
    backend). Lo que cambia y nada más:
    * **«🔥 N días» sale del servidor**: `rachaDias` de cada track de `GET /api/v1/habit-tracks/today`
      (días programados seguidos que se cumplieron; los días en que el hábito no toca y los de pausa no cortan
      ni suman; hoy pendiente no corta). Antes `useTraining` fijaba `streak: 0` y todas decían «0 días».
    * **Sin dato no hay racha**: si el campo no viene (backend anterior), en un hábito sin track de hoy (no le
      toca hoy o está en pausa) y en las rocas de Vida y negocio, la tarjeta no dibuja la llama
      (`HabitItem.streak` es `number | null`). Con 0 sigue la llama gris y «0 días».
    * **Hace falta un APK nuevo** (la app no se actualiza por aire); el APK publicado ignora el campo nuevo.
  * **Cambio por pedido del dueño — 2026-10-06 — tab `Comunidad` (Classroom): sin Sparkie, el curso abre a SER**
    (D-255 del backend; textual: «Me dijeron que quites a Sparkie, porque los usuarios se confunden, y que SER haga lo
    mismo»). Lo que cambia y nada más:
    * **El botón al pie del curso y de la lección** (`ChatDelCurso`) dice «Pregúntale a SER», lleva el orbe de SER y
      abre su chat (`agent: 'COMPANION'`) con el curso y la lección de contexto (`courseId` y `scope`, que ahora viajan
      también con SER). Es la misma conversación que la del orbe y el botón flotante. Dentro del curso el flotante se
      sigue escondiendo (D-101): la entrada es el botón del curso.
    * **No hay más `COURSE_TUTOR` ni nombre «Sparkie» en la app** (`AgenteRenasia` es solo `'COMPANION'`; el panel
      siempre muestra el orbe). `SparkieOverlay` y `features/sparkie` siguen con ese nombre técnico: son el arranque
      guiado y ya se presentan como SER.
    * **El APK instalado sigue abriendo a «Sparkie»** en el curso hasta reinstalar; el backend nuevo lo responde con
      SER y muestra ahí el historial de SER. **Hace falta un APK nuevo** para que el nombre desaparezca.
  * **Cambio por pedido del dueño — 2026-10-05 — tab `Training`: la racha congelada del hábito sin track de hoy**
    (D-254 del backend, decisión 2 del dueño: «mostrar la racha congelada de un hábito que hoy no tiene track (no
    le toca hoy o está en pausa)»). Lo que cambia y nada más:
    * **De dónde sale**: `rachaDias` de cada hábito de `GET /api/v1/habits` (el catálogo con el que Training arma
      las tarjetas sin track), misma regla y mismo cálculo que el del track. No va en `GET /habit-unlocks`: ahí
      solo hay fila de los hábitos elegidos o pausados, y un hábito que hoy no toca por día de la semana no la tiene.
    * **La tarjeta sin track** dibuja la llama igual que las demás (gris con 0). Si el campo no viene (backend
      anterior), no dibuja nada. Con track sigue mandando `rachaDias` del track.
    * **Hace falta un APK nuevo**; el APK publicado ignora el campo.
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
  * **Excepción autorizada por el dueño del producto — 2026-10-02 — tab `Yo` y Administración: eliminar cuenta
    (backend D-243).** Pedido del dueño (textual: «El propio usuario, desde Yo → "Eliminar mi cuenta"»), porque
    Google Play exige poder eliminar la cuenta desde la app y desde un enlace web. Todo vive en
    `src/features/cuenta/` salvo lo de Administración. Lo que cambia y nada más:
    * **`Yo`**: una fila discreta «Eliminar mi cuenta» al final de la vista principal, debajo de «Cerrar sesión»,
      que abre `EliminarMiCuentaScreen` a pantalla completa (como la Caja y Administración). Tres líneas de qué
      pasa (se cierra al instante; N días para pedir a soporte que la recupere; después se borra para siempre),
      y se confirma con la contraseña o, si la cuenta entra solo con Google o Apple, con un código al correo
      (`GET/POST /api/v1/users/me/account-deletion`, `POST …/code`). Un `Alert` de `components/Alerta` pide la
      confirmación con el botón destructivo «Eliminar mi cuenta»; tras el 200 avisa la fecha del borrado y hace
      el `logout` local (el servidor ya cerró las sesiones; el 401 del logout se tolera).
      > Corregido 2026-10-05 (rediseño de Yo, decisión 10 del dueño). Decía «una fila discreta … al final de la
      > vista principal, debajo de «Cerrar sesión»»: era un enlace subrayado al pie de Yo. Ahora es una fila roja
      > al final de Ajustes, junto a «Cerrar sesión», para que se encuentre.
    * **Administración**: en la ficha de la persona, «Eliminar cuenta» al final (solo ADMIN o ALQUIMISTA; nunca
      sobre sí mismo; sobre un ADMIN o ALQUIMISTA, solo un ADMIN), con una vista donde hay que ESCRIBIR su correo
      (`EliminarCuentaAdminScreen`); al terminar vuelve a Personas. Si la persona cerró su cuenta
      (`deletionScheduledFor`), la ficha dice «Cerró su cuenta. Se borra el …» con «Recuperar cuenta», y su fila
      en Personas lleva «Se elimina el …».
    * **Web pública** `/eliminar-cuenta`: HTML estático en `public/eliminar-cuenta/index.html` (no es parte del
      bundle de Expo), servido por una regla propia de `vercel.json` antes del rewrite general.
    * **Hace falta un APK nuevo**: el APK de producción no tiene la fila ni las pantallas (la app no se actualiza
      por aire).
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar
    autorización explícita.
  * **Cambio por pedido del dueño — 2026-10-06 — tab `Yo` (Ajustes) y el ingreso: Política de Privacidad (backend
    D-245).** Google Play exige una Política de Privacidad con URL pública. El dueño entregó los datos de la empresa
    (ficha RUC de SUNAT) y dijo «procede». Lo que cambia y nada más:
    * **Web pública** `/privacidad/`: HTML estático sin JavaScript en `public/privacidad/index.html`, servido por una
      regla propia de `vercel.json` antes del rewrite general. URL para declarar en Play:
      `https://renaser-90-dias-frontend-livid.vercel.app/privacidad/`. Responsable: RENASER CONSULTING S.A.C.
      (nombre comercial RENASER), RUC 20615428419, domicilio fiscal en Pj. Manuel Castillo N.º 205, Urb. Alto Selva
      Alegre, Arequipa; representante legal Kelin Jadik Merma Llave (Gerente General); contacto de privacidad y
      derechos ARCO **renaserlab@gmail.com** (`CORREO_DE_CONTACTO` en `src/features/legal/enlacesLegales.ts`).
      **Nunca se publica el DNI** del representante ni ningún documento personal (`paginaPoliticaDePrivacidad.test.ts`
      lo verifica, junto con que no quede ningún marcador `[[…]]`).
    * **Ajustes**: un grupo nuevo «Legal», entre «Preferencias» y el grupo rojo, con la fila «Política de
      privacidad» (ícono `lock`, con «›»). En nativo abre la URL absoluta en el navegador; en web, `/privacidad/` en
      otra pestaña. No es una sub-vista de la app.
    * **Ingreso y «Solicitar acceso»**: una línea chica «Política de privacidad» en tipo oración, gris del texto
      secundario y subrayada, debajo de «¿No tienes cuenta? Solicitar acceso» en el pie fijo; se esconde con el
      teclado como la línea de arriba. No cambia nada más del login aprobado el 2026-10-05.
    * **Contacto de soporte para una cuenta cerrada**: `/eliminar-cuenta` y el aviso «Tu cuenta quedó cerrada»
      (`textoDeCuentaCerrada`) dan renaserlab@gmail.com, porque con la cuenta cerrada ya no se entra al soporte de
      la app. La pantalla de la app antes de eliminar sigue diciendo «pedir a soporte» (todavía hay sesión).
    * **Sin dato, no inventado**: número de inscripción del banco de datos ante la ANPD y plazos legales de
      respuesta (la página dice «dentro de los plazos que fija la ley»). La edad dice «mayores de edad» (D-80), sin
      número; ojo: el selector de fecha de la ficha todavía permite desde 14 años.
    * **Hace falta un APK nuevo** para la fila y el enlace (la app no se actualiza por aire); la página web sale con
      el deploy de Vercel.
  * **Cambio por pedido del dueño — 2026-10-06 — tab `Comunidad` → Eventos: «Quién respondió» y «Pasar lista»
    (backend D-256).** Propuesta aprobada (`~/Imágenes/e2e-2026-10-06/eventos-asistencia-maqueta-*.png`). Reglas del
    dueño, literales: ven los confirmados y pasan lista «quien creó el evento + Admin, Alquimista y Líder de
    mentores»; «simplemente es seguimiento» (no da puntos ni toca coherencia, semáforo ni racha); A tiempo / Tarde /
    Ausente; el aprendiz NO ve su propia asistencia. Lo que cambia y nada más:
    * **Detalle del evento**: para esas personas (`puedeVerAsistencia`), una tarjeta «Asistencia» entre «Unirme» y
      «¿Vas a ir?»: cuántos van / no van / no respondieron, las caras de los primeros que van, una barra con las tres
      partes y «Ver quién respondió»; abajo «Pasar lista» (solo con la ventana abierta: 30 min antes del inicio hasta
      12 h después del fin, la decide el servidor) o «Ver la lista». Si el servidor no la entrega (backend sin el
      endpoint → 404, sin permiso → 403, sin red) la tarjeta no existe y el detalle queda como antes. Al aprendiz no
      se le hace ningún pedido.
    * **Hoja «Quién respondió»** (`HojaDesdeAbajo` grande): Van / No van / Sin respuesta con `ControlSegmentado`,
      buscador sin tildes, «Dijo «Voy» · sáb 3, 18:42» en la zona del evento y, si cambió de idea desde que existe
      el historial, «Antes dijo «No voy» (…)». «Quizás» se muestra como «Sin respuesta» (la app no lo ofrece).
      «Compartir la lista» abre el menú del teléfono con texto (`Share`, sin librerías nuevas).
    * **Modo «Pasar lista»** (dentro de la sección, «Volver al evento» y el atrás del sistema vuelven al detalle):
      resumen de presentes, «Dijeron «Voy»» / «Todos», buscador y un círculo de 44 px por persona: un toque = a
      tiempo, otro toque o mantener = tarde (reloj, no solo color), otro toque = sin marcar (ausente). Se marca al
      instante y el `PUT` va detrás; si falla la red se reintenta solo (1,5 s → 20 s) y la fila lo dice; un rechazo
      del servidor (lista cerrada, fuera de hora) relee la lista y avisa. «Deshacer» ~4 s abajo, encima de los
      botones de SER. «Cerrar la lista» pide confirmación y espera a que se guarden las marcas pendientes.
    * **Los flotantes de abajo no tapan ningún botón.** El orbe de SER (`RenasiaLauncher`) y la burbuja «✳ SER» del
      arranque guiado (`SparkieOverlay`, mientras la cuenta no firmó el Pacto; en todas las plataformas) van contra
      el borde de la pantalla. «Pasar lista», la lista cerrada y el detalle del evento terminan con
      `EspacioSobreFlotantes`, que completa el relleno de Comunidad hasta `ALTO_TAB_BAR + SEPARACION + DIAMETRO`
      (+ 12 y el borde seguro) para que el último botón suba por encima aun con la barra escondida.
    * **Lista cerrada**: tres números (asistieron, de los que dijeron «Voy», sin confirmar), «Asistieron» /
      «Faltaron» (dijeron «Voy» y no vinieron), «Corregir» (reabre, solo dentro del plazo) y «Compartir».
    * **Movimiento** (`emil-design-eng`, `animate-expo`, `apple-design`): el círculo NO se anima (se toca decenas de
      veces): cambio instantáneo + escala 0.97 de `Presionable` + háptico de selección (mantener: `tacto.mantener`).
      «Deshacer» entra con fundido y 8 px en 200 ms ease-out y sale en 150 ms; con «reducir movimiento», solo
      fundido; un toque nuevo con el aviso visible no lo vuelve a animar. La tarjeta aparece con un fundido de 200 ms
      (llega después que el detalle). La barra y los contadores no se animan. Íconos existentes (`listChecks`,
      `clock`, `lock`, `share`, `pencil`, `rotateCcw`); ninguno nuevo.
    * **Hace falta un APK nuevo** (la app no se actualiza por aire) y el backend con V93; la app nueva contra el
      backend viejo no muestra la tarjeta.
  * **Excepción autorizada por el dueño del producto — 2026-10-02 — tabs `Yo` y `Comunidad` (chat de soporte): el
    botón de emergencia** (backend D-244). Pedido del dueño: «un botón de emergencia para pedir ayuda si tuvo un
    accidente y quiere volver a un día específico del programa; que llegue a su soporte». Lo que cambia y nada más:
    * **`Yo`**: al pie, entre «Mi ficha inicial & pacto» y «Cerrar sesión», un botón discreto con el mismo formato,
      «TUVE UNA EMERGENCIA» (> Corregido 2026-10-05: desde el rediseño de Yo es la fila «Tuve una emergencia» con
      `lifeBuoy`, la última de la lista de Yo; «Cerrar sesión» ya no está en Yo), solo si `GET /api/v1/me/emergency-request` dice que puede (cualquier aprendiz, desde el Día 0;
      un 403 lo esconde). Abre `EmergenciaScreen` a pantalla completa: «¿Qué pasó?» (hasta 280),
      «Volver al día» (− / +, de 1 al día de hoy, que se muestra), confirmación y «Recibimos tu pedido». Pedir no cambia
      el día. **Desde el Día 0** (respuesta del dueño, 02/10): en el Día 0 no hay selector, el pedido es solo «necesito
      ayuda» y la franja de soporte ofrece solo «Cerrar sin cambiar». Al resolverlo, el programa le escribe a la persona
      en su chat de soporte (lo hace el servidor).
      > Corregido 2026-10-02 (mismo día). Decía «solo si … aprendiz que ya empezó, o con un pedido abierto».
    * **`Comunidad` → chat de soporte, solo para ADMIN y ALCHEMIST**: bajo la cabecera, si esa persona tiene un pedido
      abierto, una franja «EMERGENCIA · Pide volver al día N (hoy está en el día M)» con «Cambiar al día N» (abre
      «Cambiar día del programa» de Administración con el día y el motivo ya puestos; cambiarlo resuelve el pedido) y
      «Cerrar sin cambiar». Para el aprendiz y el resto de los chats, nada cambia.
    * Todo vive en `src/features/emergencia/`. `CambiarDiaScreen` suma dos props opcionales (`diaSugerido`,
      `motivoSugerido`); sin ellas se comporta igual que antes.
    * **Hace falta un APK nuevo**: el APK de producción no tiene estas pantallas (la app no se actualiza por aire).
    Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales vuelve a necesitar
    autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-10-02 — tab `Comunidad` → Tribu: los chats de soporte
    de Admin y Alquimista en una sección plegable** (backend D-249). Pedido del dueño: con 300 aprendices, la fila
    de soporte de cada uno («Nombre – Formación Renaser») volvía inmanejable la lista. Lo que cambia y nada más:
    * **Solo ADMIN y ALCHEMIST** (`veLaSeccionDeSoportes`): sus soportes salen de «Formación Renaser» y van a una
      sección **«Soporte · N»** al final de Tribu, después de Directos, **plegada al entrar**, con un contador dorado
      de en cuántos hay mensajes sin leer. Al abrirla la lista sube hasta su buscador.
    * Adentro: buscador por nombre o correo (en el servidor, sin tildes ni mayúsculas, espera de 300 ms, «Sin
      resultados para «…».») y los chats de a 25 desde `GET /api/v1/chat/support-conversations`, pidiendo la
      página siguiente al acercarse al final (mismo `onScroll` de la lista, encadenado al de la barra y el
      encabezado). Las filas son `FilaDeConversacion` y abren el chat por el camino de siempre.
    * El aprendiz, el mentor y el líder no ven ningún cambio: el aprendiz sigue con su único soporte en
      «Formación Renaser». `GET /chat/conversations` no cambia.
    * Todo vive en `src/features/chat/` (`useSoportesPaginados`, `SeccionDeSoportes`, `utils/seccionDeSoportes.ts`).
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar
    autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-10-02 — tab `Comunidad`: el encabezado se esconde
    al desplazar** (backend D-248). Pedido del dueño: el encabezado («COMUNIDAD», «TU TRIBU. TU SOPORTE. TU
    LEGADO.» y la fila Muro / Eventos / Classroom / Tribu / Ranking) ocupaba ~25 % de la pantalla fijo arriba.
    Lo que cambia y nada más:
    * **Al bajar** se esconde entero, junto con la barra de pestañas (mismo estado compartido de D-246, misma
      dirección y umbral); **al subir un poco** vuelve solo la fila de círculos; **cerca del tope** (24 px)
      vuelve completo. Decisión pura en `navigation/barraAlDesplazar/logicaDelEncabezado.ts`, hook
      `useEncabezadoAlDesplazar`. Al cambiar de sección o de pestaña, y al volver a la app, vuelve completo.
    * **Cómo se mueve**: medido el encabezado, va ENCIMA de la lista (posición absoluta) y cada lista de
      Comunidad suma su alto como relleno de arriba; se esconde solo con `transform` (Reanimated, 200 ms, hilo
      de UI). Ninguna lista cambia de alto, así que el contenido no brinca ni se reabre el bucle de D-246. El
      borde seguro de arriba lo pone una franja en el flujo que tapa lo que sube. El círculo de «actualizando»
      de Tribu y Eventos baja lo que mide el encabezado (`progressViewOffset`).
    * En todas las secciones (Muro, Eventos, Classroom —catálogo, curso y lección—, Tribu, Ranking). En la
      lección no hay fila de círculos: al subir un poco no vuelve nada hasta llegar arriba. No en la
      conversación abierta (ya es pantalla completa).
    * **Fijo como antes** con lector de pantalla (el encabezado vuelve al flujo). Por pedido del dueño
      del 2026-10-03, las animaciones desactivadas del sistema ya no lo fijan: conserva la transición
      de 200 ms, igual que la barra.
    * **Web**: `react-native-web` responde siempre que hay lector de pantalla, así que la barra de D-246 y este
      encabezado quedaban fijos para todos en la web (E-499); ahí se omite esa detección.
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a
    necesitar autorización explícita.
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
  * **Excepción autorizada por el dueño del producto — 2026-09-30 — tab `Hoy`, el orbe con la voz en
    vivo como una conversación abierta** (backend E-458 / D-232). Pedido del dueño probando el APK 1.5.0:
    «noto latencia al hablar y recibir su respuesta… la respuesta se entrecorta… que siga fluido como
    Gemini con streaming, y luego que mande el mensaje de confirmación del hábito». Lo que cambia y nada más:
    * **Tocar el orbe ya no cierra la voz en vivo**: escuchando es «ya terminé» (contesta sin esperar el
      silencio), hablando lo calla y sigue escuchando. **Mantener presionado** la cierra (también al pasar
      la app a segundo plano o tras 45 s sin que nadie hable). El rótulo dice «Te escucho… toca cuando
      termines», y mientras la conversación está abierta se ve junto al orbe un botón chico
      «✕ Terminar» (etiqueta accesible «Terminar conversación») que la cierra; mantener presionado
      también (confirmado por el dueño el 2026-09-30, junto con los 45 s). Con el flujo de siempre
      (sin voz en vivo) el rótulo y los toques no cambian.
    * **«Tomar foto»** en la hoja del orbe cierra la conversación en vivo antes de abrir la cámara.
    * La hoja de la propuesta o de la foto aparece **cuando el orbe termina de hablar**, no a mitad.
    * **Hace falta un APK nuevo**: además del JavaScript, el parlante nativo de `expo-two-way-audio`
      lleva un parche (`scripts/arreglar-parlante-two-way-audio.js`, en `postinstall`).
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-10-05 — alta (`LoginScreen`) y
    onboarding (Ficha Inicial, Términos, «Elige tu Día 1»): forma «de app»** (backend D-250). Pedido
    del dueño: «Me gustaría mejorar el diseño. Estamos en una app móvil y veo cosas como si fuera una
    web, tipo el registro, que lo hace por fases». Cambia la FORMA, no el contenido. Lo que cambia y
    nada más:
    * **Login:** cada campo declara `autoComplete`/`textContentType` y su tecla de acción encadena al
      siguiente o envía.
      > Corregido 2026-10-05 (mismo día). Decía además: «las pestañas «Iniciar sesión / Crear cuenta»
      > pasan a `ControlSegmentado` (píldora que se desplaza, 250 ms, háptico de selección). Mismos
      > textos, placeholders y flujo». El rediseño del login de abajo quitó las pestañas; el
      > `ControlSegmentado` sigue en la ficha (tipo de documento).
    * **Rediseño del login (ampliación autorizada por el dueño el 2026-10-05, con la imagen que generó
      él):** `LoginScreen` pasa a cabecera a sangre (~54 % de la pantalla; ~30 % en «Solicitar
      acceso») con el fénix entero, cola incluida, que se funde con el fondo en un degradado largo
      de nueve paradas, sin onda ni línea (`features/auth/components/CabeceraDelIngreso`, imágenes
      `assets/login/cabecera.webp` y `cabecera-oscura.webp`, 1024 × 1536; si no cargan,
      `IlustracionTopografica`), «Iniciar sesión» apoyado sobre el final del degradado, en la
      serif con un subrayado dorado, los dos campos (`CampoDelIngreso`), «¿Olvidaste tu
      contraseña?» bajo la contraseña, «Ingresar» fijo abajo que sube con el teclado
      (`BotonDelIngreso`) y al pie «¿No tienes cuenta? Solicitar acceso». Crear cuenta deja de ser
      pestaña: es la vista «Solicitar acceso» (cabecera más baja, mismos campos, «¿Ya tienes
      cuenta? Iniciar sesión», flecha y atrás del sistema vuelven al login). Se quitaron el botón
      de luna (del login y de `MarcoDePaso`: el modo oscuro se elige en Yo; antes de entrar se ve
      el modo guardado, o el claro), «Google · Próximamente», el separador «o accede con» y la
      frase del pie. No se agregó «Recordarme»: la sesión ya queda guardada. Movimiento: entrada escalonada (título, campos,
      botón; 8 px, 50 ms entre cada uno, < 400 ms) y, si el ingreso se rechaza, el mensaje bajo el
      campo, sacudida de 280 ms y vibración de error; con «reducir movimiento», solo fundido.
      **No cambia:** `login`, los mensajes de error, la sesión, la recuperación de contraseña, el
      alta por solicitud aprobada (mismo hook, mismas validaciones y endpoints) ni los pasos que
      siguen (código, acuse), que sólo pasan a la cabecera baja. El botón de acceso se llama ahora
      «Ingresar» también para el lector de pantalla (antes «Continuar»; e2e y Maestro ajustados).
    * **Ficha Inicial:** los tres capítulos se muestran en doce pasos cortos (`data/pasosFicha.ts`)
      dentro de `MarcoDePaso` (botón principal fijo abajo que sube con el teclado, barra fina de
      avance en vez de «CAPÍTULO 1 DE 3», atrás con la flecha o el gesto del sistema = un paso). Las
      opciones son tarjetas grandes (`OpcionElegible`) con háptico. Únicos textos nuevos: los títulos
      de los pasos que agrupan preguntas («Sobre ti», «Tu familia», «Tu trabajo», «Tu documento»,
      «¿Dónde vives?», «Tu descanso»).
    * **Selectores de la Ficha (fase 2, mismo día; el dueño: «vamos por toda la app»):** la fecha de
      nacimiento, el código de país del WhatsApp y la ubicación dejan el diálogo centrado con
      «CERRAR» y abren una hoja desde abajo (`components/hojaDesdeAbajo/`): entra en 280 ms con la
      curva del cajón, se cierra arrastrándola (un cuarto de su alto, o un golpe rápido), tocando
      fuera, con la ✕, con el atrás de Android o con Escape; con «reducir movimiento», sólo fundido.
      La fecha va en tres ruedas (día, mes, año) con «LISTO», y ya no deja confirmar un día que no
      existe (el 31/02 se mandaba como `1995-02-31`). País y ubicación: buscador sin tildes, lista
      virtualizada con lo elegido marcado (✓); la ubicación pasa a cuatro filas agrupadas. Las
      sugerencias de Google Places del distrito llevan «Powered by Google», que su política pide
      cuando se muestran sin un mapa (faltaba). Se guarda lo mismo: `"DD/MM/AAAA"`,
      `"+51 987654321"` con su prefijo, y la misma cascada de ubicación. Textos nuevos o cambiados:
      «LISTO», «Código de país», «Sugerencias», «Usar «…»» (era `USAR: "…"`), «Sin resultados para
      «…».». **Sin dependencias nuevas:** el arrastre usa `PanResponder` (Gesture Handler no está
      instalado y agregarlo exige prebuild); las ruedas no usan el selector nativo de fecha.
    * **Términos y Día 1:** el mismo esqueleto, con «CONTINUAR» / «CONFIRMAR MI DÍA 1» fijos abajo.
      Términos atiende el gesto atrás de Android (vuelve a la ficha).
    * **Lo que NO cambia:** preguntas, claves y respuestas (`mapaPreguntas.ts`), el guardado por
      capítulo (mismo `POST /onboarding/answers`, mismo `avanzarEstado`, sólo al terminar cada
      capítulo), las 23 cláusulas, la firma y los avisos de validación (mismos títulos y mensajes).
      El Pacto (`PactoScreen`) y `BienvenidaScreen` no están en este flujo y no se tocaron.
    * **Dependencia nueva:** `expo-haptics` (código nativo). Sin el módulo, `utils/tacto.ts` no vibra
      y no rompe; la vibración se siente recién con un APK nuevo, que de todos modos hace falta para
      que este cambio llegue (no hay actualización por aire).
  * **Excepción autorizada por el dueño del producto — 2026-10-05 — tab `Comunidad`, tanda 2 de la
    propuesta de rediseño (hojas):** cambia la FORMA de cinco ventanas, no lo que hacen.
    * **Compartir publicación** (`SharePostSheet`, desde la tarjeta del Muro y desde el visor): pasa a
      la `HojaDesdeAbajo`, con los colores del tema (antes `#1E1B18` fijo: oscura también en claro).
      Cada destino como en la lista de chats (`AvatarDeChat`, su nombre y su línea), con un botón
      redondo `send` de 44 que es lo único que envía. Rótulos «Formación Renaser» y «Directos»
      (era «💬 CHAT DIRECTO CON MIEMBROS»). El ícono de compartir pasa a `forward` en la tarjeta y en
      el visor (era `share` y el emoji ↗️).
    * **Quién reaccionó** (`HojaDeReacciones`): hoja «Reacciones · N me gusta» con la foto o las
      iniciales de cada persona (era la ventana centrada «REACCIONES DEL POST»).
    * **Stickers** (`SelectorDeStickers`): la misma hoja en vez de su `Modal` con `slide`.
    * **Nueva publicación** (`NuevaPublicacion`): ✕ de 24 en área de 44, «Nueva publicación» y la
      píldora «Publicar», que se ve apagada hasta que hay texto y una foto; tocarla igual muestra la
      alerta de siempre con lo que falta (y vibra con `tacto.error`), y al publicar vibra con
      `tacto.logro`. Las fotos se ven en un mosaico de 88 con un recuadro `imagePlus` para agregar.
      Rótulos en tipo oración («Fotos · al menos una», «Cargando categorías…», «Reintentar»; las
      categorías se muestran como las manda el servidor, sin pasarlas a mayúsculas).
    * **Ranking:** las tres tablas en el `ControlSegmentado`.
    * **No cambia:** a quién se puede compartir, `handleShareToConversation`, la validación y el
      guardado de la publicación (`handlePublishPost`, mismas alertas), el pedido de reacciones, los
      stickers y su envío, ni las tablas del ranking. Sin dependencias nuevas.
  * **Excepción autorizada por el dueño del producto — 2026-09-29 — tab `Comunidad` (chat): nombres
    de los chats y avisos de mensajes** (backend D-221). Pedido del dueño: «Formación Renaser Global,
    grupo general donde estarán todos; luego el otro con el Mentor y sus estudiantes, que será el nombre
    "Luisa y sus aprendices"; y luego será "Pedro - Formación Renaser" […] y que los chats tengan
    notificación con el sonido tipo WhatsApp». Lo que cambia y nada más:
    * **Nombres.** El nombre de cada chat lo manda el servidor (`conversation.nombre`): «Formación
      Renaser Global», «<primer nombre del mentor> y sus aprendices» y «<primer nombre> – Formación
      Renaser». Ese nombre GANA en la lista, la cabecera y la info del grupo
      (`nombreVisibleDeGrupo`, `ComunidadScreen.nombreDelGrupo`); el `cellName` de `/me/cells` queda
      solo para un backend viejo que manda `nombre: null` (título genérico `TITULO_DE_GRUPO_SIN_NOMBRE`).
      Las tarjetas de grupo de Tribu siguen con el nombre de la célula.
    * **Tocar el aviso** de un mensaje (`/chat/{id}`) abre Comunidad en esa conversación con el mismo
      parámetro de «Escribirle» (`abrirChatConversacionId`), y espera a las capas obligatorias como los
      de hábitos (`navigation/abrirAviso.ts`).
    * **Con la app abierta** (`features/chat/avisos/`): un aviso del chat que se está mirando no se
      muestra ni suena; uno de otro chat no sale como aviso del sistema, suena un «pop» corto dentro
      de la app (volumen 0,6) y la lista de chats se relee. En segundo plano el chat deja de escuchar
      en vivo (`useChatEnVivo`), para que el servidor sí mande el push.
    * **Web:** el service worker agrupa por `tag` (`renotify`) y, con Renaser a la vista, le pasa el
      mensaje a la página en vez de mostrar el aviso del sistema.
    * **Yo → Notificaciones:** interruptor «Mensajes» (`MENSAJE_CHAT`).
    * **Sonido y canal nuevos:** `assets/sonidos/mensaje_burbuja.wav` (síntesis propia,
      `scripts/sonidos/sintetizar_mensaje.py`; no es ni imita el de WhatsApp) y el canal de Android
      `mensajes-chat` (HIGH, con ese sonido), creado al registrar el token. **Hace falta un APK nuevo**:
      el APK viejo no tiene el canal y sus avisos caen al canal de respaldo de `expo-notifications`,
      con el sonido por defecto del teléfono.
  * **Excepción autorizada por el dueño del producto — 2026-09-28 — tabs `Yo` y `Hoy`, Administración y
    las dos fichas del aprendiz: la Caja Renaser** (backend D-219, `docs/specs/CAJA_RENASER.md`; pedido
    del dueño en el cuestionario del 28/09, con «poco texto, que no se maree el usuario»). Todo vive en
    `src/features/caja/`. Lo que cambia y nada más:
    * **`Yo`**: una fila «Tu Caja Renaser» (con el estado en palabras del aprendiz) entre «Identidad» y
      «Administración», que aparece SOLO si `GET /api/v1/me/caja` responde con un estado que se le
      muestra (no `NO_APLICA`, `EN_PAUSA` ni `FUERA_DE_LA_APP`; un 404/403 la esconde). Abre
      `MiCajaScreen` a pantalla completa (como Administración): cinco pasos, «Ya la recibí» si
      `puedeConfirmar`, «¿Te la enviamos a otro lugar?» si `puedeCambiarDestino`, «Ver dónde va» si
      hay `rastreoUrl`, y ya entregada una invitación opcional a publicar una foto en el Muro (abre el
      composer existente, `abrirComposerMuro`). Yo lee además el parámetro `abrirCaja`.
    * **`Hoy`**: solo lee el parámetro `abrirCajaAprendizId` para abrir Administración en esa caja
      (si la cuenta administra; si no, se descarta). La tarjeta y todo lo demás de Hoy no cambian.
    * **Avisos** (D-218): `/caja` abre Yo con su caja y `/admin/caja/{aprendizId}` abre Hoy →
      Administración → Caja Renaser → esa caja. Los dos esperan a que se cierre una capa obligatoria
      (Código Renaser, arranque guiado, Pacto), como los de hábitos (`navigation/abrirAviso.ts`).
      > **Corregido 2026-10-31 (punto 16).** El aviso del Admin abre ahora **Yo** → Administración → Caja Renaser → esa caja:
      > `abrirCajaAprendizId` lo lee `YoScreen` (si la cuenta administra; si no, lo descarta), no Hoy, que ya no tiene nada de Administración.
      > Lo mismo para «Ver ficha» desde la info de un chat (`abrirFichaAprendiz`). Sigue esperando a las capas obligatorias.
    * **Administración**: «Caja Renaser» en «Más» de la raíz (lista con pestañas por estado y conteo,
      buscador, «Descargar» la planilla), el detalle de cada caja (datos de envío, checklist, foto de
      la caja, formulario del envío, comprobante, carta, historial y un botón por acción) y «Contenido
      y carta» (la lista editable y el fondo de la carta). La ficha del aprendiz suma un chip con el
      estado de su caja que abre su caja.
    * **Ficha del mentor** (`AlumnoScreen`): el mismo chip, solo para mirar.
    * **Dependencias nuevas**: `expo-sharing` y `expo-file-system` (esta ya venía dentro de `expo`,
      ahora es directa): en el teléfono, «Descargar» guarda el archivo con la sesión y abre la hoja de
      compartir del sistema. Llevan código nativo: **hace falta un APK nuevo**.
  * **Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Comunidad`, pestaña
    *Tribu* y chat (dos pedidos del dueño de ese día).** Lo que cambia y nada más:
    * **Bug «no carga los integrantes».** Un mentor que lidera un grupo entraba a Tribu y leía
      «Todavía no tienes un mentor asignado» y «Todavía no tienes integrantes en tu grupo» debajo de
      su propio grupo. La tarjeta salía SOLO de `/me/cell` y `/me/cell/members`, que responden «¿de
      qué grupo soy aprendiz?» y a un mentor le dicen que de ninguno. Ahora
      (`community/utils/tarjetaDeTribu.ts`): quien es aprendiz de un grupo sigue igual; si no, la
      tarjeta usa sus grupos de `/me/cells` (que ya incluye los que acompaña) y los integrantes de
      ESE grupo (`/me/cells/{id}/members`), con fichas para elegir si son varios; el bloque del
      mentor solo se muestra a aprendices. La info de un chat que no es de grupo (1 a 1, soporte,
      comunidad) ya no muestra el grupo principal: muestra lo suyo, sin lista de integrantes.
    * **Chat estilo WhatsApp** (patrones, no la marca ni su verde): filas de chat con avatar redondo
      (foto o iniciales; grupos, comunidad y soporte con el sello del programa, una «R» de la marca
      sobre dorado, porque en `assets/` no hay logo de Renaser), último mensaje en una línea
      («Tú: …», «📷 Foto», «🎤 Audio»), hora a la derecha («21:04», «Ayer», «lun») y no leídos en
      un círculo dorado. **Las dos secciones («Formación Renaser» y «Directos») se ordenan por el
      último mensaje**: el orden fijo de grupos del 2026-09-22 queda reemplazado. Conversación con
      burbujas con cola (propias a la derecha en dorado suave, ajenas a la izquierda en blanco),
      hora dentro, separadores «Hoy» / «Ayer» / «25 de septiembre», nombre en color en los grupos,
      tandas del mismo remitente, foto dentro de la burbuja, y una barra con campo redondeado
      (evidencia y cámara adentro) y un botón redondo que es micrófono o enviar. Cabecera con
      avatar, nombre y «Grupo · N integrantes» / «Aprendiz · 1 a 1» / «En línea»; tocarla abre la
      info. Las marcas de los propios pasan de «✓✓» a «✓»: el backend no informa entrega ni lectura.
      Todo en `features/chat/components/` y `features/chat/utils/formatoChat.ts`; envío, fotos,
      audios, evidencia, tiempo real y la tarjeta de bienvenida siguen por el mismo camino.
      > **Corregido 2026-09-27.** El sello de grupos, comunidad y soporte ya no es una «R» sobre
      > dorado: desde el mismo 26 es el fénix de la tarjeta de bienvenida de Operaciones
      > (`assets/imagenes/fenix-renaser.png`, commit «Usar el fénix de la tarjeta de Canva como foto
      > de los grupos del chat»), con un sello chico en la esquina. Esta línea no se había puesto al
      > día.
      > **Corregido 2026-09-27 (D-208 del backend).** «Las marcas de los propios pasan de «✓✓» a «✓»:
      > el backend no informa entrega ni lectura» dejó de ser cierto: desde D-208 el backend informa
      > la LECTURA (la entrega sigue sin saberla). «✓» es que el servidor guardó el mensaje y «✓✓»
      > dorado que lo leyeron; en la comunidad queda un solo «✓». Ver el punto de la doble marca, más
      > abajo.
      > **Actualizado 2026-10-05.** La barra ya no es «evidencia y cámara adentro»: desde el rediseño de
      > Comunidad lleva stickers (`smile`) a la izquierda y galería y cámara a la derecha, y «✓» / «✓✓»
      > son íconos. Ver la excepción del 2026-10-05 (responder y copiar), más arriba.
    * **Ampliada el 2026-09-26 (noche), tercer pedido del dueño mirando el emulador — conversación
      a pantalla completa, franja blanca, conteo de integrantes y chat en vivo.**
      * **Pantalla completa, como WhatsApp**: con una conversación abierta (o su info) no se ven la
        cabecera «COMUNIDAD» ni la fila de secciones, y **se esconde la barra de pestañas de
        abajo** (`navigation.setOptions({ tabBarStyle: { display: 'none' } })`); vuelve al cerrar
        con ← o con el «atrás» de Android, que sigue cerrando primero la conversación. Por eso
        `components/TabBar.tsx` (la barra propia) ahora obedece esa opción de la pestaña enfocada
        (`navigation/pestanasOcultas.ts`); las otras cuatro pestañas no la usan y no cambian.
      * **Franja blanca** bajo la barra de escribir: el `SafeAreaView` de Comunidad aplicaba el
        inset de abajo que la barra de pestañas ya reserva (se pagaba dos veces, pintado de `c.bg`).
        Ahora va con `edges={['top','left','right']}`; sin barra de pestañas, el inset lo pinta un
        relleno con el fondo del chat. Efecto colateral: en las demás secciones de Comunidad
        desaparece el mismo hueco duplicado encima de la barra de pestañas.
      * **«Grupo · N integrantes» cuenta a todos**, mentor incluido (WhatsApp cuenta a todos los
        participantes): `memberCount` de `/me/cells` son solo los aprendices vigentes y el backend
        no da el total de la conversación, así que se suma el mentor del grupo
        (`integrantesDelChatDeGrupo`), la misma cifra que la lista de la info.
      * **Chat en vivo que nunca funcionó en el teléfono** (roto desde que existe, 2026-09-17):
        React Native corta en el primer NUL los strings que cruzan a lo nativo, y cada trama STOMP
        salía sin su NUL final; el servidor nunca procesaba el CONNECT y la app nunca se suscribía.
        Las tramas salen ahora en binario (`protocoloStomp.tramaEnBytes`), se repone el NUL de las
        que lleguen sin él, y el vigilante de silencio respeta `heart-beat:0,0` del backend (antes
        habría reconectado cada 32 s de silencio dejando el socket viejo abierto). *Desde D-202 del
        backend (2026-09-27) el servidor manda latidos cada 10 s (`heart-beat:10000,10000`); el
        vigilante sigue leyendo lo que se negocie, así que funciona con los dos.*
    * **Ampliada el 2026-09-27, pedidos del dueño mirando el emulador — info tipo WhatsApp, orden
      de la lista, mensajes del programa y la conversación que no bajaba al último mensaje.**
      * **Info del chat tipo WhatsApp** (textual: «si le doy en el círculo, ver la info del grupo
        tipo WhatsApp; esa parte ajústala»). Tocar el avatar o el nombre de la cabecera (ya abría
        la info) lleva a `chat/components/InfoDelChat.tsx`, a pantalla completa como el chat (sin
        «COMUNIDAD», sin secciones ni pestañas ni el botón flotante del acompañante; ← y el «atrás»
        de Android vuelven al chat): avatar de 120 px (el fénix, sin sello, en grupo, soporte y
        comunidad; foto o iniciales en un 1 a 1 — *corregido 2026-09-27, D-206: el de `AvatarDeChat`,
        o sea la tarjeta sin nombre en el grupo (o su foto propia, D-212), la del nombre de su aprendiz en el soporte y el fénix
        solo en la comunidad; esta línea había quedado del fénix de antes de 8971acf*), nombre grande y debajo «Grupo · N integrantes» /
        «Chat de soporte» / el rol del otro («Aprendiz»). En un grupo, la cohorte y la sección «N integrantes»: el mentor primero,
        «Tú» y el resto por nombre, cada uno con su marca («Mentor», «Aprendiz»). La cifra es la
        de la cabecera (aprendices + mentor). Tocar a un compañero abre su 1 a 1 con la acción que
        ya existía (`abrirDMConIntegrante`, el botón «Chatear» de antes); al mentor no, porque el
        grupo no trae su id: no se inventan permisos (*corregido el mismo día, D-207: el dueño decidió
        que sí se le escribe al mentor desde acá, y `/me/cells` ya trae su id; ver el punto de D-207*). Ninguna sección sin datos detrás (ni
        «archivos» ni «descripción»). Lógica en `chat/utils/infoDelChat.ts`. El desplegable de
        integrantes de la tarjeta de Tribu (`FilaIntegrante`) no cambia.
      * **La lista de chats va por el último mensaje** (confirmado por el dueño): las dos secciones
        siguen separadas y las dos ordenan con `ordenarPorActividad`. Se corrigió que un mensaje
        recibido en vivo con la conversación abierta no movía su fila: al recargar el historial,
        la fila toma la vista previa, la hora y la fecha del último (`conversacionConHistorial`).
      * **Mensajes del programa.** Un mensaje de sistema (`SYSTEM`, el `TipoMensaje.SISTEMA` del
        backend) con texto y/o imagen es una burbuja a la izquierda firmada «Formación Renaser»
        con el fénix al lado, en cualquier conversación y aunque el servidor lo guarde a nombre de
        una cuenta (`chatMappers.esMensajeDelPrograma`); uno de sistema vacío sigue como antes
        («Mensaje del sistema»). El parser acepta el emisor en `null`, vacío o ausente
        (`chatSchemas.emisorTolerante`: antes un emisor `null` dejaba a la persona sin bandeja), el
        aviso en vivo también (`SISTEMA` o `SYSTEM`), y uno de sistema a nombre de quien mira no se
        descarta como eco. En la lista nunca dice «Tú: » y la tarjeta se lee «📷 Foto».
      * **La conversación no bajaba al último mensaje** (grupo «Fénix», ~12 mensajes largos: se
        quedaba en «Ayer»: bajaba con un `scrollToEnd` desde `onContentSizeChange`, que dependía de
        llegar después de medir todo y en el emulador no llegó; causa exacta no confirmada). Ahora
        es una `FlatList` invertida: abre siempre en el último mensaje y lo que se mide tarde crece
        hacia arriba. Quien está abajo ve llegar lo nuevo; quien subió a leer no es arrastrado
        (`maintainVisibleContentPosition`, puesto solo mientras está arriba) y ve un botón redondo
        «↓» con el contador de nuevos; lo propio siempre baja. Separadores y tandas se arman en
        orden cronológico y después se da vuelta la lista (`formatoChat.elementosDeLaListaInvertida`,
        `utils/bajadaDelChat.ts`, `hooks/useBajadaDelChat.ts`).
      * **La lista de chats se refresca sola** (mismo día, pedido del coordinador sobre lo
        encontrado). `GET /api/v1/chat/conversations` se pedía una vez, al entrar a Tribu por
        primera vez; ahora se relee al volver de una conversación, al volver a la pestaña o a Tribu
        y deslizando la lista (`RefreshControl`), para que el orden y los no leídos queden al día.
        En silencio si ya hay lista, un solo pedido para los disparos juntos y sin que una
        respuesta vieja pise a una nueva (`useChatConversaciones`, con la misma
        `eventos/utils/lecturaVigente` de Eventos, solo leída); un cambio hecho en el teléfono
        descarta la lectura en vuelo, y la lectura espera a que el chat recién abierto quede
        marcado como leído. Se conserva el historial ya cargado de cada chat
        (`utils/refrescoDeLaLista.ts`). **Sin refresco en vivo de la lista**: el backend solo
        publica por conversación (`/topic/conversaciones/{id}`) y no tiene un destino por persona;
        no se inventó.
      * **No se adivina el rol del otro en un 1 a 1.** Sin rol en el directorio, el mapeador ponía
        `'TRAINEE'` y la cabecera y la info decían «Aprendiz» de cualquiera. Ahora dice «1 a 1» a
        secas (`chatMappers.SUBTITULO_DE_UN_1_A_1_SIN_ROL`) y la info no muestra rol.
      * **La foto del chat de SOPORTE es SU tarjeta de Canva con SU primer nombre** (decisión del
        dueño, mismo día; D-205 del backend). Los grupos y la comunidad siguen con la tarjeta sin
        nombre (`tarjeta-renaser.jpg`, 8971acf). *Corregido el mismo día (D-206): la comunidad
        volvió al fénix; la tarjeta sin nombre queda para los grupos (ver el punto siguiente).* La conversación de soporte trae `photoPath`
        (`GET /api/v1/chat/conversations/{id}/foto`, campo nuevo y opcional) y el avatar del soporte
        la muestra en la lista, la cabecera y la info (`AvatarDeChat` con `fotoPath`). El endpoint pide
        la sesión: en Android/iOS va en las cabeceras del `Image`; en web se trae el blob con
        `X-Auth-Token` y se muestra desde un object URL guardado por conversación (uno por sesión; al
        cambiar de sesión se liberan). La tarjeta sin nombre queda debajo: se ve mientras carga y
        queda sola si la foto falla, sin reintentar en cada fila (`utils/fotoDelSoporte.ts`,
        `hooks/useFotoDelSoporte.ts`; *desde D-206 se llaman `utils/fotoConSesion.ts` y
        `hooks/useFotoConSesion.ts`, porque sirven cualquier ruta*).
      * **La comunidad vuelve al fénix y cada integrante de la info del grupo muestra su tarjeta con
        nombre** (decisiones del dueño del mismo día, D-206 del backend). Textual: «de la plantilla
        que te pasé los 2 png […] es para el grupo con el mentor y el tema de soporte […] y chat
        global, solo afecta esos 2 primeros», y sobre la info (que mostraba «RP», «EL», «EL»): «debe
        de poner con el nombre […] el grupo del mentor y sus integrantes». En la página de decisiones
        eligió «Siempre su tarjeta con nombre» aunque la persona haya subido foto en «Yo», y pidió dejar
        listo el otro modo («hazlo los 2 por si acaso»).
        * El chat global muestra el fénix (`FotoDelPrograma`) en la lista, la cabecera y la info; qué
          foto lleva cada conversación lo decide `utils/fotosDelChat.fotoDeLaConversacion`.
        * `/me/cells` trae `mentorId` y `mentorPhotoPath`, y `/me/cells/{id}/members` trae `photoPath`
          (campos nuevos y opcionales; el esquema los acepta ausentes o en `null`). La info muestra
          `AvatarDeIntegrante` con una sola regla (`fotosDelChat.fotoDelIntegrante`): si llega la ruta,
          la tarjeta —pedida con la sesión, con las iniciales debajo mientras carga o si falla—, y la
          foto subida se ignora; si no llega, la foto subida; si tampoco, las iniciales.
        * **El modo lo elige el servidor** (`CHAT_FOTO_DE_INTEGRANTES`: `TARJETA` por defecto, o
          `FOTO_SUBIDA`) decidiendo a quién le manda la ruta, así que cambiarlo no pide APK.
        * El mentor que mira su propio grupo ya no se ve como «Ricardo Palomino»: su fila dice «Tú»
          (la app compara `mentorId` con el id de la sesión; sin `mentorId` no adivina).
        * No cambian: las burbujas del grupo (solo el nombre, sin avatar), el desplegable de
          integrantes de la tarjeta de Tribu (`FilaIntegrante`, con la foto subida), el perfil, «Mi
          grupo» ni el panel de admin. El soporte no tiene lista de integrantes en la app.
      * **Desde la info del grupo, el aprendiz le escribe a su mentor y el mentor abre la ficha de
        cada aprendiz** (decisiones del dueño en la página de decisiones, mismo día; D-207 del
        backend, sin cambios en el servidor). Escribirle al mentor: «Sí, agregarlo». La ficha:
        «Agregar la ficha desde la info», con la nota «El público es objetivo lo mejor visible
        posible».
        * La fila del mentor abre su 1 a 1 con la misma acción que la de un compañero
          (`abrirDMConIntegrante` → `POST /api/v1/chat/conversations/direct`): si el chat de dos de
          D-173 ya existe, el servidor devuelve ese. Quién puede escribirle a quién lo decide el
          servidor (cuentas activas, G-4): si no lo abre, la app avisa con su respuesta (antes el
          toque no hacía nada; vale también para los compañeros y el «Chatear» de Tribu).
        * Cuando quien mira es el mentor de ESE grupo (su id de sesión es el `mentorId`), cada
          aprendiz lleva debajo del nombre un botón grande con texto, «Ver ficha», y a la derecha el
          ícono del 1 a 1 como botón aparte. Abre la misma ficha que «Mi grupo» (`AlumnoScreen`) con
          el id de ESE grupo, y «←» vuelve a la info (`mentor/utils/alumnoDesdeLaInfo.ts`: el alumno
          del padrón de «Mi grupo» si es el mismo grupo; si no, uno armado con el id y el nombre, con
          lo de seguimiento en `null`). El «Escribirle» de esa ficha abre el 1 a 1 y cierra la ficha y
          la info, para que no tapen el chat pedido. No es un permiso nuevo: la ficha la sirve el servidor al
          acompañante vigente del grupo, y la lista de la info solo la ven los aprendices y el mentor
          del grupo; un administrador no la ve, así que no ve el botón.
      * **La foto de un grupo se puede cambiar** (decisión del dueño en la página de decisiones, mismo
        día: la cambian «Admin y el mentor de ese grupo»; D-212 del backend).
        * El grupo con foto propia la muestra en la lista, la cabecera y la info: la conversación trae
          `photoPath` con `?v=` (cuándo cambió) y `AvatarDeChat` la pide con la sesión, con la tarjeta
          sin nombre debajo mientras carga o si falla (`fotosDelChat.fotoDeLaConversacion`). Al releer
          la lista, la conversación abierta toma la ruta nueva (`refrescoDeLaLista.conLaFotoDeLaLista`):
          se ve la foto nueva sin reinstalar la app.
        * En la info del grupo, a quien puede cambiarla (`infoDelChat.puedeCambiarLaFotoDelGrupo`: el
          ADMIN, o el mentor cuyo id es el `mentorId` del grupo), la sección «Foto del grupo»
          (`community/components/CambiarFotoDelGrupo.tsx`): «Cambiar foto del grupo», grande y con texto,
          abre el selector de siempre (`elegirFotoDePerfil`, que ahora recibe para qué es la foto en el
          aviso del permiso), muestra la vista previa en el círculo con «Guardar foto» y «Cancelar», y
          sube por multipart (`community/api/fotoDelGrupoApi.ts`; `apiFetch` ahora manda un `FormData`
          tal cual). Con foto propia, también «Volver a la foto de Renaser», con confirmación.
        * El ADMIN tiene el mismo control en la pantalla del grupo del panel de Administración
          (`GrupoDetalleScreen`, sección «Foto del grupo», con si tiene foto propia y desde cuándo): no
          ve la lista de la info del grupo (el servidor le da 403). El Alquimista entra a ese panel pero
          no ve el control: el dueño nombró solo a «Admin», y el servidor le respondería 403. Nada más
          de esa pantalla cambia. *Corregido el mismo día: en la página de decisiones el dueño sumó al
          Alquimista («sí»); ahora ve el control en el panel y en la info (`infoDelChat.esAdministracionDeGrupos`),
          y el servidor lo deja.*
      * **E-341 (mismo día): el «Escribirle» de la ficha de «Mi grupo» en Comunidad abría el chat
        detrás de la ficha** y parecía no hacer nada. Las vistas del mentor que tapan Comunidad («Mi
        grupo», su ficha y la ficha desde la info) pasaron a un reductor
        (`mentor/utils/vistasDelMentor.ts`) con una sola acción que las despeja todas al pedir un
        chat; la navegación con «←» no cambia. Desde Hoy ya funcionaba (cambia de pestaña).
      * **Doble marca de leído, «✓✓»** (decisión del dueño en la página de decisiones, mismo día:
        «Quiero ✓✓ de leído (trabajo extra en el servidor)»; D-208 del backend). En los mensajes
        propios, «✓» es que el servidor lo guardó y «✓✓» en dorado que lo leyeron: en un 1 a 1 el
        otro; en un grupo y en el soporte, TODOS los demás, como WhatsApp. En la comunidad queda un
        solo «✓». Pasa de «✓» a «✓✓» sin recargar: el aviso en vivo `READ` («todos leyeron hasta X»)
        llega por la suscripción de la conversación abierta (`useChatEnVivo.leidoHasta`, que solo
        avanza) y se aplica a los mensajes propios (`chat/utils/lecturaDelChat.ts`); al abrir, la
        marca de cada mensaje viene en el listado (`status`). Un `status` ausente o desconocido se
        ve «✓» (el esquema lo tolera aunque no sea texto), y un APK anterior ignora el campo y el
        aviso. Nunca se marca nada como leído por un aviso de lectura: haría que dos teléfonos se
        avisaran sin fin. Colores con contraste medido en `coloresDelChat.ts` (`leido`,
        `leidoSobreFoto`). No cambia la fila de la lista (sin marcas, como antes).
      En `ComunidadScreen.tsx` solo cambian los campos opcionales `esDelPrograma`, `rolDelOtro` y
      `fotoPath` (este último se pasa a la cabecera y a la info), el id y la tarjeta del mentor y el id
      de la sesión que recibe la lista de la info (D-206), la ficha abierta desde la info y el aviso
      cuando el servidor no abre un 1 a 1 (D-207), las vistas del mentor en un reductor (E-341), el
      control de la foto del grupo en la info y la foto nueva tomada de la lista (D-212), la marca de
      leído en vivo (D-208: la llamada a `useChatEnVivo` sube junto a la lista de mensajes, que la
      necesita, y su `leidoHasta` se aplica a los mensajes propios), la
      lista de mensajes, el bloque de la info, que el flotante del acompañante siga escondido con
      la info abierta y los disparos del refresco de la lista (volver de un chat, foco, deslizar);
      envío, fotos, audios, evidencia y la tarjeta de Tribu siguen por el mismo camino.
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-27 — tab `Yo` → Alarmas: la voz Dora
    dice el nombre del hábito, y sonidos para alertar y para relajar (decisiones del dueño de ese día,
    con sus notas: «que diga el nombre del hábito nomás y que sea rápido como está», tono antes de la
    voz «sí», y de los sonidos «déjalos como está y opcional que escoja el usuario»).** Lo que cambia y
    nada más:
    * **La «Voz» es Dora** (Kokoro-82M, Apache-2.0), a la velocidad que el dueño escuchó, con una
      campanita corta delante, y **en los hábitos dice su nombre**: un audio por hábito del catálogo
      (los 18 activos de `V4__catalogo_habitos_default.sql` del backend; 17 archivos, porque los dos
      rituales de la mañana dicen lo mismo): «Despertar», «Ritual de la mañana», «Tu jugo verde» y
      «A dormir» (con una palabra delante: sin ella, Kokoro decía «Kugo verde» y «Dormir» sola se
      confundía con «Dormida»)… Lo que dice cada uno está en `features/alarmas/vocesDeLasAlarmas.json`,
      que leen la app y el script. Cada hábito
      con voz propia sale por su canal (`recordatorios-habitos-voz-<clave>`), porque en Android el
      sonido es del canal. Se empareja por id **y** por título del catálogo: un hábito propio, uno
      renombrado (jugo verde, agua tibia) o uno cuyo título cambie dicen la frase genérica «Tu hábito
      está por empezar»; eventos y objetivos, la suya. Todas con Dora: la app no genera voz en el
      teléfono (`features/alarmas/vozDeLosHabitos.ts`).
    * **Yo → Alarmas → Sonido**: debajo de los cuatro de siempre, dos grupos nuevos, **«Para
      alertar»** (Amanecer, Marimba, Campanas, Kalimba) y **«Para relajar»** (Cuenco, Campanitas,
      Lluvia, Ruido marrón). Cada opción tiene un ▶ que la hace sonar al instante sin elegirla
      (`escucharSonido`, por el mismo canal que la alarma y sin pasar por una alarma, así que no
      depende del permiso de alarmas exactas); tocar la opción la elige, como antes, y «Probar el
      sonido» sigue igual. Todo en `features/alarmas/components/SelectorDeSonido.tsx`; en
      `SeccionAlarmas.tsx` solo cambian esa lista, una línea de ayuda («Toca ▶ para escuchar cada uno
      antes de elegirlo») y el paso de los hábitos al sonido nuevo, cada uno a su canal
      (`cambiarSonidoDeLosHabitos`). **El sonido por defecto sigue siendo «El del teléfono»**, los
      canales de antes conservan id y archivo, y el rearmado (`archivoDelCanal`) conoce todos los
      nuevos: a quien ya tenía una elección no se le rompe nada.
    * **Audios**: MP3 mono 44,1 kHz (voces a 64 kb/s; los ocho sonidos a 128 kb/s, byte a byte los que
      aprobó el dueño) en `assets/sonidos/` y en `sounds` de `app.json`. Suman 1,48 MB y se van los
      tres WAV provisionales (0,88 MB): **+0,62 MB al APK**. iOS no acepta MP3 en un aviso (sonaría el
      del sistema); hoy la app es solo Android. Se regeneran con `scripts/sonidos/generar-sonidos.sh`
      (Kokoro con semillas fijas: da los mismos archivos; corre sin red si el modelo ya está bajado; la
      cabecera dice cómo armar el entorno, que no va en el repo), que reemplaza a
      `scripts/generar-voces-provisionales.sh`. `sonidosElegibles.test.ts` falla si un archivo que el
      código nombra falta en `assets/sonidos/` o en `app.json`, si sobra uno, o si pasan de 2 MB.
    * `app.json` cambia la lista de sonidos: **requiere APK nuevo** (no se armó: va a la Play Store).
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Yo` y `Plan`, aviso con
    voz y recordatorios de las acciones de los objetivos (decisiones del dueño de ese día).** Lo que
    cambia y nada más:
    * **`Yo` → Alarmas → Sonido suma «Voz»**: un tono suave y una voz que dice «Tu hábito está por
      empezar» (hábitos), «Tu evento está por empezar» (eventos) o «Tienes acciones de tus objetivos
      por hacer» (objetivos). El nombre del hábito o del evento sigue escrito en el aviso. Un canal de
      Android por tipo y sonido (`recordatorios-*-voz`), como la campana. **El sonido elegido pasa a
      regir para TODOS los recordatorios de hábitos**, no solo Despertar (antes los demás hábitos
      sonaban siempre con el del teléfono; sin esto la voz no llegaba a ningún hábito). Cambiarlo pasa
      las alarmas ya programadas al canal nuevo sin tocar su hora (`alarmas/cambioDeSonido.ts`). Quien
      nunca tocó Alarmas sigue con «El del teléfono». «Probar el sonido» usa el canal de hábitos.
      > **Corregido 2026-09-27.** Un hábito del catálogo ya no dice «Tu hábito está por empezar»:
      > con la voz Dora dice su nombre y sale por su propio canal (`recordatorios-habitos-voz-<clave>`).
      > La frase genérica queda para los hábitos propios y los renombrados. Ver la excepción del 27.
    * **Los audios son PROVISIONALES**: voz sintética (`espeak-ng -v es-419`) generada con
      `scripts/generar-voces-provisionales.sh` en `assets/sonidos/voz_habito.wav`, `voz_evento.wav` y
      `voz_objetivos.wav` (WAV mono 16-bit 44,1 kHz, < 5 s). **El dueño puede reemplazarlos por una
      grabación humana con el MISMO nombre de archivo** (minúsculas y guion bajo: lo exige Android
      `res/raw`) y un APK nuevo; el código no cambia. Si se reemplazan, no volver a correr el script.
      > **Corregido 2026-09-27.** Ya no son provisionales ni WAV ni de `espeak-ng`: el dueño eligió la
      > voz Dora de Kokoro. Son `voz_habito.mp3`, `voz_evento.mp3`, `voz_objetivos.mp3` y uno
      > `voz_habito_<clave>.mp3` por hábito del catálogo, hechos con `scripts/sonidos/generar-sonidos.sh`;
      > `generar-voces-provisionales.sh` ya no existe. Cambiar lo que dice una voz es editar
      > `features/alarmas/vocesDeLasAlarmas.json` y volver a generar: el nombre del archivo no cambia.
      > Una grabación humana sigue entrando con el mismo nombre base (Android busca `res/raw` sin
      > extensión), pero si la extensión no es `.mp3` hay que cambiarla también en `app.json`.
    * **Recordatorios de las acciones de los objetivos** (hasta hoy solo los hábitos tenían). Una
      acción del día (`RocaDiaria`) tiene `horaInicio` **opcional**, así que van los dos, locales, sin
      servidor ni tablas (`objetivos/notificaciones/recordatoriosDeAcciones.ts`): (1) «Recordarme mis
      acciones del día», diario, con hora elegible y encendido/apagado, texto fijo «Revisa las acciones
      de tus objetivos de hoy» (una alarma que suena sin que la app corra no puede contar pendientes);
      (2) «Aviso antes de cada acción con hora»: sin aviso / 30 / 10 min antes / a la hora, una sola
      elección para todas las acciones. El control (`RecordatorioDeAcciones`) está en `Plan`, al pie
      de la tarjeta «Tus acciones» (solo cuando ya hay plan semanal), y en `Yo` → Alarmas, entre
      Eventos y Sonido. En `TarjetaAccionesDelDia.tsx` solo se agregó ese bloque; nada más de Plan
      cambia. `App.tsx` monta `SincronizadorDeAcciones` (no pinta nada) junto a `RearmadorDeAlarmas`.
    * `app.json` suma los tres WAV al plugin de `expo-notifications`: **requiere APK nuevo**.
      > **Corregido 2026-09-27.** Los tres WAV se reemplazaron por MP3 con el mismo nombre base, y la
      > lista suma las voces de los hábitos y los ocho sonidos nuevos (29 archivos en total).
    Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Comunidad`, `Yo` y
    `Plan`, eventos, avisos y alarmas (E-4 a E-10 de `docs/specs/RETROALIMENTACION_2026-09-26.md`
    del backend, y §9 con las decisiones del dueño de ese día).** Lo que cambia y nada más:
    * **`Comunidad` — sección nueva «Eventos»** (segunda medalla, al lado del Muro; decisión del
      dueño: los eventos se ven sobre todo acá). Todo vive en `features/eventos/`
      (`SeccionEventos`): los próximos 30 días, el detalle con «Voy» / «No voy» y un botón grande
      «Unirme» si el evento trae un link `https://` (Meet, Zoom o Drive, pegado por quien lo crea; sin
      OAuth), el formulario mínimo para crear, editar y cancelar (solo `ADMIN` y `ALCHEMIST`; el
      servidor vuelve a autorizar) y «Mi agenda» (7 días con eventos, hábitos con hora y acciones).
      En `ComunidadScreen.tsx` solo se agregó la medalla, el bloque que monta la sección, la entrada
      por parámetro `abrirEventoId` (misma forma que los atajos de siempre) y que el «atrás» del
      sistema vuelva primero a la lista de eventos. Las otras cinco secciones no cambian.
    * **Tocar un aviso `/eventos/{id}`** (push del servidor o alarma local) abre ese evento. Lo
      atiende `AbridorDeEventos`, montado en `App.tsx` junto al acompañante: ninguna pestaña escucha
      por su cuenta.
    * **`Yo` — Notificaciones deja de ser decorativa**: los tres `Switch` que no guardaban nada se
      reemplazan por «Eventos y clases», «Logros» y «Resumen semanal», guardados en
      `notification-preferences` (sin tema «Hábitos», decisión del dueño). La fila del menú se parte
      en dos: «Notificaciones» y **«Alarmas»**, sub-vista nueva con la alarma de Despertar (prender,
      apagar, cambiar la hora), la de los eventos a los que vas y el sonido (el del teléfono, una
      campana propia o solo vibrar). `features/alarmas/`.
    * **`Plan` — cambiar la hora de un hábito mueve también su alarma del teléfono.** Antes quedaba
      sonando a la hora vieja. La pantalla llama a `habits/utils/cambioDeHora.ts` en vez del PATCH
      suelto; nada visual cambia.
    * `app.json` suma el plugin de `expo-notifications` con el sonido
      `assets/sonidos/campana_renaser.wav`: **requiere APK nuevo**.
    * **Mismo día, ampliación posterior, confirmada por el dueño — `Hoy`, solo la tarjeta «Próximo
      evento»:** tocarla abre el detalle de ese evento en Comunidad → Eventos (E-5), con la misma
      entrada `abrirEventoId` que usa el aviso. En `HoyScreen.tsx` solo se envolvió la tarjeta en un
      `Pressable` y se le sumó el chevron; nada más de Hoy cambia. Y **«Mi agenda» muestra el
      semáforo** (`SemaforoDeLaAgenda`): arriba, el color y la palabra del semáforo vigente de
      `/me/semaforo` (mismos colores, umbrales y palabras) y los días ya vividos de esta semana
      (sábado → ayer) con su puntito. Hoy y los días que vienen no llevan color: no se predice. Con
      404/403, sin datos o para quien no se mide, no aparece nada.
    * **Mismo día — `Yo` → Alarmas, aviso de «Alarmas y recordatorios»** (e2e en Android SDK 37: sin
      ese permiso, la alarma de «Voy» quedó con `window=+40m59s`). Arriba de la sub-vista, en
      Android 12+, un aviso con el botón «Revisar permiso de alarmas exactas» que abre esa pantalla
      del sistema (`features/alarmas/permisoDeAlarmaExacta.ts`). Está siempre porque la app no puede
      saber si ya se concedió sin un módulo nativo nuevo. Nada más de `Yo` cambia.
    * **Mismo día — dos bugs del e2e en emulador, sin cambio visual en los tabs.** (1) La lista de
      Eventos no se refrescaba (un evento recién creado solo aparecía al cerrar la app): ahora se
      relee al ganar el foco, al volver a la lista y deslizando hacia abajo en la lista y en «Mi
      agenda» (`utils/lecturaVigente.ts`: los disparos juntos comparten un pedido, una respuesta
      vieja no pisa una nueva). Para el `RefreshControl`, el `ScrollView` de la sección pasó de
      `ComunidadScreen.tsx` a `SeccionEventos` con el mismo estilo de contenido; nada más de
      Comunidad cambia. (2) Las alarmas programadas antes de conceder «Alarmas y recordatorios»
      seguían inexactas: `RearmadorDeAlarmas` (en `App.tsx`, fuera de los tabs) las vuelve a armar
      tal cual —mismo id, contenido y disparador— al abrir la app y al volver a primer plano, con 10
      min mínimo entre corridas (`features/alarmas/rearmarAlarmas.ts`, solo Android).
    * **Mismo día, ampliación posterior pedida por el dueño — Eventos «tipo calendario del mes, 2
      formas»** (textual: «ver los eventos asignados por mes a los alumnos y ver de largo como cursos
      los eventos… no me gusta ese diseño, muy IA»). Solo dentro de `features/eventos/`; en
      `ComunidadScreen.tsx` no cambia nada. La lista de filas con iconito se reemplaza por:
      * Un selector grande «Calendario» | «Tarjetas», recordado por persona en AsyncStorage
        (`utils/vistaPreferida.ts`; por defecto «Calendario»), y la casilla «Solo a los que voy»,
        que filtra las dos. «Mi agenda» y «Crear evento» (ADMIN/ALCHEMIST) siguen arriba, en una fila.
      * **Calendario** (`CalendarioDelMes`): grilla del mes de lunes a domingo, ‹ › y «Hoy»; punto
        dorado en los días con eventos y verde (el de «Vas») si la persona dijo «Voy»; tocar un día
        muestra sus eventos debajo, que abren el detalle de siempre. Los días son los de la zona del
        evento, no de UTC (`utils/calendarioDelMes.ts`, con pruebas con el reloj en la madrugada UTC).
        Pide el rango de la grilla visible (`useEventosDelMes`), lectura aparte que **no** toca
        alarmas.
      * **Tarjetas** (`TarjetasDeEventos`): la tarjeta de los cursos de Classroom con los datos del
        evento — `CursoPortada` (sin portada, el mismo fondo oscuro de los cursos), rótulo del tipo
        («SESIÓN ESPECIAL»), título en serif, día y hora grandes, lugar y «VER EVENTO ›» —, agrupadas
        por mes. Muestran los próximos **60 días** (`DIAS_EN_LA_SECCION`; antes la lista era de 30):
        `useEventos` lee y sincroniza alarmas sobre esa misma ventana. `AbridorDeEventos` y Yo →
        Alarmas siguen con 30 (`DIAS_A_LA_VISTA`).
      * **Portada opcional en el formulario** («Elegir portada», recorte 16:9): se sube después de
        guardar con `/events/{id}/portada/upload-url` y `/confirm`, con `expo-image-picker`,
        `expo-image-manipulator` y `subirImagenAS3` del Muro (sin dependencias nuevas). Si falla, el
        evento queda guardado y se avisa. `Evento.portadaUrl` sale de `coverUrl`.
    Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
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
  * **Decisión del dueño del producto — 2026-09-27 — semáforo: los días con la cuenta suspendida no se
    miden (backend D-209).** El dueño eligió «Que no se midan». El servidor manda esos días con un estado
    nuevo, `CUENTA_SUSPENDIDA`, y la app lo nombra **«Cuenta en pausa»** (`estadoDelDiaEnPalabras`), en la
    misma fila de 16 px que los otros estados («Nada programado», «En pausa»…): el detalle del semáforo
    (estado de `Hoy`), las barras de su tarjeta y la tarjeta del semáforo de un aprendiz en mentoría y
    administración. Sin porcentaje ni color, como todo día que no se mide. **APK publicado:** no lo
    conoce y lo lee como «Sin datos», neutro, sin romper la pantalla (`aEstadoDelDia` lee `estado` como
    texto abierto; verificado contra `origin/master`). Nada más de `Hoy` cambia.
  * **Excepción autorizada por el dueño del producto — 2026-09-27 — tab `Hoy`, cifra de «Hábitos de hoy»
    (S-9 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, E-257).** Sin datos
    (`habitosHoy` null) la tarjeta ya no dice «Al día»: no muestra cifra (`features/home/utils/cifrasDeHabitos.ts`).
    Nada más de `Hoy` cambia.
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
  * **Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Hoy`, la foto de una
    ACCIÓN del día desde el acompañante (D-178 del backend).** Decisión del dueño: marcar como hecha
    una acción del día (roca) desde el acompañante funciona *exactamente* como un hábito que exige
    evidencia: la misma tarjeta, la misma cámara, la misma pantalla partida (sin "¿Qué sentiste?").
    El evento `evidencia` trae `destino: "roca"` y la foto sube por `/rocks/{id}/evidence`, que la
    completa y paga sus puntos. En `Hoy` lo único que cambia es que la hoja del orbe puede mostrar
    esa tarjeta ("EVIDENCIA DE TU ACCIÓN", *"Listo, quedó registrada tu acción."*). Un solo código:
    `useRegistroConFoto` recibe las reglas de la roca inyectadas
    (`features/objetivos/utils/registroDeAccionConFoto.ts`, que reusa `sellarRocaDiaria`), porque
    `habits` no conoce las rocas. El cerrojo Pareto se avisa antes de abrir la cámara, nombrando la
    verde que va primero. Sin `destino` (backend viejo) todo sigue siendo un hábito. **`Training` no
    cambia**: sus acciones siguen con el modal de antes.
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Cambio por pedido del dueño — 2026-10-06 — tab `Hoy` (el centro) y SER: el fénix** (entrega del diseñador
    PHOENIX_MASTER v3.3, `rive-react-native` 9.8.5). Lo que cambia y nada más:
    > **Corregido 2026-10-06 (el dueño, tres ajustes el mismo día).** Un primer paso puso el fénix vivo en la tarjeta del
    > semáforo y su detalle, y otro en el botón flotante y el panel de SER. Quedó así: **un solo fénix vivo, el del centro
    > de Hoy**; el botón flotante, el panel y los íconos de SER son **foto fija**; la tarjeta y el detalle del semáforo
    > quedan como en `master`.
    * **El fénix** vive en `src/features/fenix/`: `rive/` es la entrega (Director `phoenixMaster.ts` intacto,
      `PhoenixTargets.tsx`, `PhoenixMascot.tsx` adaptado: solo la variante `master`, sin `PhoenixStage`); `assets/rive/`
      tiene `phoenix_master_v3_3.riv` y los 5 PNG de 512. La vista Rive entra por `rive/vistaRive.native.tsx`; en la
      **web** no hay Rive ni `.riv`: se ve la foto del ánimo. Metro lleva `riv` en `assetExts` y Jest un doble de
      `rive-react-native` (`jest.setup.js`).
    * **Ánimo = color del semáforo que manda el servidor** (VERDE alegre, AMARILLO serio, ROJO triste, SIN_DATOS o sin dato
      neutral; `fenix/utils/animoDelFenix`, `useAnimoDeSer`). Nada se recalcula en la app.
    * **Una sola fuente del color** (`semaforo/estado/semaforoVigente` + `useSemaforoVigente`): Hoy publica lo que ya lee
      (`/home` y, si se pidió, `/me/semaforo`), sin peticiones de más; se vuelve a leer (`/me/semaforo?semanas=1`) solo al
      volver la app al frente tras ≥ 15 min y después de cumplir un hábito (aviso `habits/eventos/habitoCumplido`, que
      emite `completarRegistro`). Sin sondeo; si falla, neutral. Solo el aprendiz (`TRAINEE`): admin, alquimista, mentor y
      líder no piden nada y su fénix es neutral.
    * **Centro de Hoy** (`OrbeAcompanante`, era la nube de puntos de `expo-thinking-orbs` y en la web un disco con
      micrófono): el fénix vivo (`FenixDeSer`), el ÚNICO de la app, con todo lo de la entrega: ánimo, vida autónoma
      (`alive`, `life` 1), fase de la voz (sostenida mientras dura: ver la entrada «el fénix se mueve al escucharte,
      pensar y hablar» del 2026-10-07), saludo (`trgWelcome`, una vez por sesión), `trgTap` al apoyar el dedo, asentir 700 ms al cumplir un
      hábito y la celebración corta de los hitos. **Funciona igual**: el mismo botón, área de toque (el diámetro),
      etiquetas por fase, mantener para cerrar y deshabilitado; con la voz activa, el aro dorado fino de antes y un halo
      que late con el ritmo de la fase. Con Hoy fuera de la vista (`useOrbeALaVista`) el centro pasa a la foto fija.
      `OrbeDePuntos`, `utils/orbes.ts` y `utils/ritmoDelOrbe.ts` quedan sin usar.
    * **Foto fija** (`FenixDeSerQuieto`, la imagen del ánimo, sin Rive): el botón flotante (disco de las tarjetas con borde
      dorado, el ave desborda un poco; mismos 52 de toque, acción y etiqueta), el encabezado del panel (48) y su bienvenida
      (140), el botón «Pregúntale a SER» del curso (44), la propuesta de la hoja de voz (28) y la baldosa «Lo que SER
      recuerda» en Yo (30). `OrbeQuieto` se borró. **SER funciona igual**: el panel no cambió más que el dibujo.
    * **Celebración corta** de los hitos, **máximo una por día por cuenta** (`fenix.celebracion.<id>` en el teléfono):
      racha de 30 y de 7 (`rachaActual` de `/home`, sin repetir la misma racha) y todos los hábitos del día. Salta el fénix
      del centro (`celebracionEnElCentro`); si no está (Hoy sin ver, web, «reducir movimiento»), la superposición
      `CelebracionFenix` (180 px abajo, no bloquea, se salta tocándola). Sin sonido. **Fase nueva**: no se le suma el
      fénix; «¡Entraste en la Fase N!» de Yo ocupa el día. **Graduación: fuera** (`/home` no la dice; `diaPrograma` se
      queda en 90 después del día 90). **Un hábito suelto** solo hace asentir al fénix del centro.
      > **Corregido 2026-10-07.** Además, la foto del botón flotante da un saltito (`transform`, sin Rive): ver la
      > entrada «el momento de cumplir un hábito» de abajo.
      > **Corregido 2026-10-07 (segunda vez).** Los hitos ya no son la celebración corta del fénix del centro ni la
      > superposición `CelebracionFenix` (borradas, con `celebracionEnElCentro`), y la fase nueva SÍ se celebra: todo
      > pasó a la pantalla completa. Ver la entrada «pantalla completa para los momentos grandes» de abajo.
    * **«Reducir movimiento»**: el rig sigue montado y quieto; sin saludo, toque, asentir, boca ni salto.
    * **Hace falta un APK nuevo** (módulo nativo nuevo): el fénix animado no se ve en ningún teléfono sin esa build.
  * **Cambio por pedido del dueño — 2026-10-07 — tabs `Training`, `Hoy` y `Yo`: «Elegir mi Día 1» para el personal**
    (backend D-260, E-577). Captura del dueño con una cuenta ADMIN: Training decía «Todavía no elegiste tu Día 1» y no
    había dónde elegirlo. Regla del dueño: el personal (MENTOR, LÍDER DE MENTORES, ADMIN, ALQUIMISTA) elige su Día 1 con
    el mismo selector y la misma regla que el aprendiz, y su programa empieza ese día sin descontar nada. Lo que cambia y
    nada más:
    * **Fila sin Día 1, cualquier rol:** botón «Elegir mi Día 1» (`programa/components/BotonElegirDiaUno`) que abre
      `ActivarProgramaScreen` **tal cual** —mismas fechas del servidor, mismo `POST /onboarding/activate-program`— a
      pantalla completa, con flecha para volver (prop `alVolver`, solo fuera del onboarding; en el onboarding la pantalla
      sigue sin «volver» y tragándose el gesto). Está en la tarjeta de Training y, como tarjeta «Todavía no elegiste tu
      Día 1», en Hoy y Yo (`EntradaAlProgramaPropio`, que solo consulta con `inscrito` y día 0). Al elegir, el aviso se va
      solo (`useArranqueDelPrograma` acepta una `version` para volver a consultar).
    * **Sin fila (personal que nunca empezó):** Training muestra la invitación «Hacer mi programa de 90 días · Empezar»
      en vez de «No pudimos cargar tu entrenamiento» con el uuid. La tarjeta salió de Hoy a
      `programa/components/InvitacionProgramaPropio` (mismo texto, mismos botones); «Empezar» sigue siendo
      `POST /mentor/activate-tracking`, que arranca hoy.
      > **Corregido 2026-10-07 (D-261, decisión del dueño: «que elija el día como los demás»).** Decía que «Empezar»
      > seguía siendo `POST /mentor/activate-tracking` (arranque HOY). Ahora el botón de la invitación, en Hoy, Training y
      > Yo, es **«Elegir mi Día 1»** (`BotonElegirDiaUno`, el mismo de arriba) y abre `ActivarProgramaScreen`; al confirmar,
      > `POST /onboarding/activate-program` le **crea la fila** con la fecha elegida (Día 1 ese día, sin ajuste). La app ya
      > no llama a `activate-tracking` (se borró `activarProgramaPersonal` de `mentorApi`; `useProgramaPersonal` cambió
      > `activar`/`activando`/`error` por `alEmpezar`, que solo esconde la invitación después de elegir). El backend
      > conserva `activate-tracking` igual para los APK 1.5.0 y anteriores. **Necesita el backend con D-261 antes que el
      > APK:** con un backend anterior, el selector de quien no tiene fila muestra «No pudimos cargar las fechas…» (404).
      > Prueba: `programa/__tests__/elegirDiaUnoDelPersonal.test.ts` (la invitación abre el selector, elige con el
      > servidor y no llama a `activate-tracking`; ninguna pantalla contiene `/mentor/activate-tracking`).
    * **«Ahora no»** sigue escondiendo la invitación solo en Hoy; Yo la ofrece siempre que el servidor diga
      `canStartProgram` (`useProgramaPersonal` devuelve además `puedeActivar`, sin el pospuesto).
    * Nada depende del nombre del rol (los dos idiomas: `MENTOR_LEAD`/`LIDER_MENTORES`, `ALCHEMIST`/`ALQUIMISTA`): lo
      decide el servidor (`activated`, `canStartProgram`). El flujo del aprendiz no cambia.
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
  * **Cambio por pedido del dueño — 2026-10-07 — tabs `Hoy`, `Training` y `Yo`: pantalla completa para los momentos
    grandes** («para los momentos grandes, pantalla completa… nuevas mejoras para destacar»). Lo que cambia y nada más:
    * **Qué la abre** (`fenix/utils/hitosDelFenix`, solo datos de `/home`): todos los hábitos del día («¡Día completo!»),
      racha de 7 y de 30 («7 días seguidos» con el número grande) y fase nueva («¡Entraste en la Fase N · nombre!» con el
      animal configurado D-258 junto al fénix). **Una por día por cuenta** (`fenix.celebracion.<id>`); si coinciden, la de
      mayor jerarquía (fase > racha 30 > racha 7 > día completo) y las otras como línea dentro de la misma pantalla. La
      fase vista sigue en `yo.faseVista.<id>`; una fase que llega con el día ocupado sale al día siguiente. Graduación
      fuera (ya documentado). **Un hábito suelto nunca la abre**: sigue con su momento chico.
    * **Dónde**: la dibuja `fenix/components/AnfitrionDeCelebraciones`, montado en `App.tsx` sobre el navegador. Después
      de cada hábito cumplido (aviso `habitoCumplido`) espera 1 s (que se vea el momento chico), relee `/home` y revisa;
      Hoy y Yo revisan con el `/home` que ya leen (`useCelebracionDelDia`). Así sale en Training, Hoy o Yo.
    * **Qué muestra** (`PantallaDeCelebracion`): velo crema/oscuro al 97 % (sin desenfoque: `expo-blur` pediría un APK
      nuevo), el fénix Rive grande con `trgCelebrate`, brasas doradas sutiles, «+N puntos hoy» (suma de
      `puntosOtorgados` de `/habit-tracks/today`) y la racha de `/home` con contadores que suben en el hilo de la
      interfaz, «Seguir». Se cierra sola a los 3,8 s (no con lector de pantalla), tocando, con «Seguir» o con «atrás».
      Entrada desde escala 0.96 + opacidad con resorte; salida de 180 ms. Sin sonido; `tacto.hito()` (logro + golpe
      pesado) una vez al aparecer.
    * **Un solo lienzo Rive**: mientras está, el fénix del centro de Hoy pasa a su foto (`OrbeAcompanante`).
    * **«Reducir movimiento»**: el fénix es su imagen quieta, solo fundidos, sin brasas, números ya puestos.
    * **Yo**: ya no hace el momento chico «¡Entraste en la Fase N!» de la tarjeta (se borró `useCambioDeFase`); la
      tarjeta queda igual.
    * **Límite**: la Pastilla y la Clase diaria se cierran por su propio endpoint y no emiten `habitoCumplido`; si una de
      ellas es la última del día, la pantalla sale al volver a Hoy o Yo.
  * **Cambio por pedido del dueño — 2026-10-07 — tab `Hoy` (el centro): el fénix se mueve al escucharte, pensar y
    hablar** («no se está usando el movimiento cuando te escucha, cuando razona/piensa y cuando habla; probé y nada»).
    Lo que cambia y nada más (el `.riv` y el dibujo, sin tocar):
    > **Corregido 2026-10-07.** La entrada del fénix (2026-10-06) decía «escuchando = cara atenta, pensando =
    > `trgThinking`, hablando = boca `isTalking`». Era eso y solo una vez al entrar a la fase; después el fénix quedaba
    > como en reposo (E-583 del backend).
    * **Cada fase se sostiene mientras dura** (`fenix/utils/actuacionDeVoz`, plan en `conversacionDeSer`): postura,
      vaivén, disparo repetido, boca y parpadeos con timers propios hasta la fase siguiente; la vida autónoma (`alive`)
      se apaga mientras tanto (sus miradas a un costado peleaban con la fase).
      | Fase | Qué se mueve |
      |---|---|
      | Escuchando | `emotion` curious, se inclina (`bodyLean` 0.5, `headPitch` 0.15), mirada al frente (`gazeX/Y` 0, `lifeGaze` 0.1), ladea la cabeza (`headRoll` 0.45 ↔ −0.15 cada 1,6 s), parpadeo cada 3,2 s; con la voz en vivo, el volumen del micrófono estira el pecho (`bodyStretch` ≤ 0.3) y sube las alas |
      | Pensando | `emotion` thinking, `trgThinking` cada 2,8 s mientras dure, mira arriba (`gazeY` 0.6, `headPitch` 0.4) y alterna a cada lado (`gazeX` ±0.4, `headRoll` −0.5 ↔ 0.3 cada 1,1 s), `energy` 0.3 |
      | Hablando | `emotion` happy, `isTalking` + visemas sintéticos con `director.speak` (sílabas de 110–190 ms, tandas de 0,9 s), `trgExplain` al empezar y cada 6,5 s, alas alternadas (`wingL/R` 0.45/0.15 ↔ 0.15/0.42) con cabeceo, mirada al frente, `energy` 0.7 |
      | Reposo | vuelve suave (≈ 0,7 s) a la postura del dibujo, cara neutral, boca cerrada, `lifeGaze` 1, la `energy` del ánimo y `alive`; el ánimo del semáforo (`mood`) nunca se toca |
    * **Volumen del micrófono**: aviso `renasia/events/nivelDelMicrofono` (no estado de React: llega varias veces por
      segundo), emitido por `useConversacionEnVivo` con el micrófono abierto. La voz de siempre (dictado) no lo tiene.
    * **«Reducir movimiento»**: una pose quieta por fase (cara y postura al instante), sin disparos, boca, vaivén,
      parpadeos ni micrófono.
    * **Límite**: el Director no cancela un `speak` en curso; al callarse, la boca puede moverse hasta 0,9 s más.
  * **Excepción autorizada por el dueño del producto — 2026-09-25 — tab `Hoy`, tarjeta del semáforo.**
    Autorizada junto con el diseño del semáforo de cumplimiento del aprendiz (D-168; el contrato vive
    en el backend, `docs/arquitectura/SEMAFORO_DEL_APRENDIZ.md`). El alcance es **solo** la tarjeta
    del semáforo, entre *Hábitos de hoy* y *Acciones y objetivos*, y el detalle que abre:
    > **Corregido 2026-10-31 (pedido del dueño).** La tarjeta del semáforo y su detalle ya no están en Hoy: pasaron a Yo (en el lugar del
    > gráfico «Tu cumplimiento»), con las mismas reglas. El aviso del sábado entra por Hoy y abre el detalle en Yo (`abrirSemaforo`). Ver
    > la entrada del 2026-10-31.
    * La tarjeta aparece solo si `GET /api/v1/home` trae `semaforo` distinto de `null`. Para quien no
      se mide, y con un backend que todavía no lo manda, Hoy queda exactamente como estaba.
    * El detalle (`features/semaforo/screens/SemaforoScreen.tsx`) es estado de Hoy, como las vistas
      del mentor. También lo abre el aviso del sábado (ruta `/semaforo`, `rutaDeAviso.ts`).
    * Lo demás que se tocó en `HoyScreen.tsx` existe solo para esa tarjeta: la lectura compartida
      `useMiSemaforo`, que el pull-to-refresh también la recargue, y que la escucha de avisos del
      mentor consuma solo rutas de alumno (antes consumía cualquiera, y se habría tragado `/semaforo`).
    * Si `/home` trae `semaforo.dias` (aditivo, contrato §4.2), la tarjeta dibuja sus barras con eso y
      **no** pide `/me/semaforo`; sin ese campo queda como arriba (`utils/entradasDelSemaforo.ts`).
    * **Mismo día, misma autorización («Vista del mentor» y «Vista de líder y admin»), y amplía el
      «solo» de arriba en esto y nada más:** una tarjeta
      **solo para el LÍDER DE MENTORES**, debajo de *Tickets de mentoría* y con su misma forma, que
      abre el resumen por grupos sin nombres (`SemaforoGruposScreen`, estado de Hoy como la bandeja).
      Aparece solo si el servidor ya respondió que `/api/v1/semaforo/groups` existe: con 404 o 403, y
      para cualquier otro rol, Hoy queda como estaba. También se agregaron las escuchas de los otros
      dos avisos del sábado: `/mentor/groups/{g}/semaforo` abre «Mi grupo» en su sección del semáforo,
      y `/semaforo/grupos` abre la pantalla del líder o el semáforo de Administración.
      > **Corregido 2026-10-29 (spec 018).** Esta tarjeta y la de tickets se fueron de Hoy: el resultado por grupo es la lista de
      > «Mis mentores» y la bandeja, su fila «Consultas de mentores». El aviso `/semaforo/grupos` sigue abriendo este resumen.
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
      > **Corregido 2026-10-31 (punto 16).** Las escuchas de estos avisos ya no viven en `HoyScreen`: `/semaforo`, `/mentor/groups/{g}/semaforo`,
      > `/mentor/groups/{g}/learners/{a}` y `/semaforo/grupos` entran por `navigation/abrirAviso.ts`, que lleva a **Yo** con un parámetro
      > (`abrirSemaforo`, `abrirSemaforoDelGrupo`, `abrirAlumno`, `abrirSemaforoPorGrupos`) que Yo consume una sola vez. «Mi grupo» y la
      > ficha esperan al padrón del grupo; el resumen por grupos abre «Mis mentores» al líder y el semáforo de Administración a quien
      > administra. No esperan a las capas obligatorias, como antes.
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
  * **Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, las acciones bajan
    al día.** El dueño describió la cadena del plan así: *"objetivo de los 90 días, luego mensual,
    luego semanal, y luego objetivo diario, y estos objetivos diarios tienen acciones para
    hacerlo"*. Los cuatro niveles ya existían; lo que estaba en el lugar equivocado eran las
    acciones, que colgaban de la semana. Dos pantallas cambian:
    * **El asistente semanal pierde los tres campos de acciones críticas.** La semana queda en lo
      que es: un objetivo. De doce campos mínimos pasa a **uno**.
    * **El planificador del día cambia de dónde saca lo que ofrece.** Leía
      `roca.accionesCriticas` —las tres del domingo—; ahora lee las del Mapa. **Esto no era
      opcional:** sin cambiarlo, una semana nueva llega sin acciones y esa pantalla quedaba vacía,
      o sea que nadie podía planificar su día. Las de la semana se siguen ofreciendo para los planes
      viejos que las tienen, sin repetir.
    Lo de fondo está en el backend: `V61` crea `acciones_diarias` colgando de `rocas_diarias`, y
    ahora son **0 a 3** en vez de exactamente 3 — obligar a inventar tres es lo que llevaba a
    escribir relleno. Ver RK-13 y D-150 en el repo del backend.
    Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-22 — tabs `Hoy` y `Plan`.**
    Dos pedidos del dueño, el mismo día, sobre el mismo tema: que el plan cueste menos de llenar.
    * **`Hoy` — se termina el renombre de "roca".** Era el pendiente *"El renombre de roca quedó a
      medias"*, que estaba trabado esperando justo esta autorización: la del 21 cubría `Plan`,
      `Comunidad` y `Yo`, no `Hoy`. Cambian **cuatro** textos y nada más:
      *"Define tu Roca Verde en Plan"* (×2) → *"Define tu objetivo en Plan"*,
      *"Rocas y objetivos"* → *"Acciones y objetivos"*, y
      *"N de M rocas selladas hoy"* → *"N de M acciones selladas hoy"*.
      **Por qué "acciones" y no "objetivos" en dos de ellos**, aunque el pedido fue *"ya no son
      rocas, ahora son objetivos"*: esa tarjeta cuenta las **diarias**, y en `Plan` las diarias ya
      se llaman *acciones* (*"3. TUS ACCIONES · DÍA 15"*, *"las tres acciones críticas"*). Decirles
      "objetivos" acá crearía una palabra distinta para lo mismo en dos tabs — exactamente la clase
      de incoherencia que este día se dedicó a cerrar. Los identificadores del código siguen
      diciendo `roca` (el módulo del backend se llama `rocks`); esto es solo el texto que se ve.
    * **`Plan` — el asistente semanal se abre con lo del Mapa y con un solo eje obligatorio.**
      Pedía inventar **nueve** acciones críticas desde cero cuando la persona ya había escrito las
      suyas el día 7. Ahora el asistente abre en el eje principal del Mapa, con sus acciones ya
      escritas, y guardar exige **solo ese**; los otros dos se suman cuando quiera.
      **Cero endpoints nuevos**: `GET /api/v1/mapa-renacimiento` ya devolvía las acciones y
      `consultarMapa()` ya lo llamaba — solo hacía falta tipar `actions` en el esquema, que venía
      como `passthrough` esperando que alguien las leyera.
    Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, la cifra del mes
    se toca para corregirla.** Pedido textual: *"el backend debe de autocalcular el objetivo del mes
    en todos los aspectos y también debe de poder editar"*. La línea "Este mes: 81.6 kg" pasa a ser
    pulsable, con un ✏️ al lado —el mismo del botón Editar del objetivo, tres tarjetas más arriba— y
    abre un modal de **un solo campo** con el número ya propuesto. Se mantiene la regla de poco
    texto: la tarjeta no gana ni una palabra.
    Lo de fondo no es la UI: la cifra **ya no la calcula la app**. Había dos fórmulas dando números
    distintos para el mismo mes (el hito del Mapa decía 81,6 y el Plan 82); ahora hay una sola, en
    el backend, y la app la lee de `GET /api/v1/rocks/monthly/plan`. Ver `api/planMensualApi.ts`, y
    E-203 / D-147 en el repo del backend.
    Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, tarjeta del mes.**
    Pedido del dueño ese día, revisando los pendientes del 22 sobre una captura: que la cifra del mes
    se vea. El alcance autorizado fue **solo agregar la cifra mensual** a la tarjeta que ya decía
    *"Mes 1 · Semanas 1 a 4 · Vas por la semana N de 12"*:
    * El cálculo **ya existía y estaba probado** desde el 21 (`objetivoMensual.ts` +
      `objetivoMensualDelMapa`), pero **no se pintaba en ningún lado**: era el pendiente *"Enganchar
      la cifra mensual en la UI"*. Esto es solo el enganche — no se tocó una línea de la fórmula.
    * Función pura `cifraDelMesDeLaRoca`: recibe la Roca Maestra y qué se mide, y devuelve la cifra
      ya formateada. La pantalla no calcula nada y la función se prueba sin montar un componente.
    * **Qué se mide sale del servidor**, no del borrador local: `usePrioridadPrincipal` ya traía
      `saludTipo`/`negocioTipo` en la misma lectura que la prioridad y los descartaba. Hacía falta
      ese dato porque la Roca Maestra guarda el número, la unidad y la línea base pero no QUÉ se
      mide, y eso es lo que activa el tope del 4 % por mes: sin él, un objetivo de peso arrastrado
      dos meses mostraría *"baja 20 kg este mes"*, que el dueño pidió que no se muestre.
    * **Una sola línea** (`Este mes: 82 kg`), sin párrafo explicativo: la tarjeta ya tiene el
      objetivo de 90 días entero encima. Cuando no hay cifra —escala subjetiva, condición clínica o
      ritmo fuera de alcance— no se muestra nada.
    * **No se tocó** ninguna otra tarjeta de `Plan`, ni la intro de Objetivos, ni el plan semanal.

    > **Corregido el 2026-09-22 (el mismo día, más tarde).** Todo lo de arriba describe la primera
    > versión y **ya no es cierto de la mitad para abajo**. El dueño vio la cifra en pantalla y notó
    > que no coincidía con el hito del Mapa para el mismo mes (*81,6 kg* contra *82*). Lo que cambió:
    > * `cifraDelMesDeLaRoca`, `objetivoMensual.ts` y la sección mensual de `reglas.ts`
    >   **se borraron**. El cálculo vive ahora en el backend y la app lo lee de
    >   `GET /api/v1/rocks/monthly/plan`.
    > * `usePrioridadPrincipal` **volvió a no exponer** `saludTipo`/`saludUnidad`/`negocioTipo`/
    >   `negocioPeriodo`: el backend lee esas respuestas del Mapa por su cuenta.
    > * La línea muestra **81.6 kg**, no 82, y Relaciones **sí** lleva cifra (entera, `7/10`) —
    >   antes el Mapa le dibujaba hito y el Plan le decía "no se reparte".
    > * La línea ahora **se toca para corregirla**; ver la excepción de más arriba.

    > **Nota 2026-09-27 (D-203 del backend, OBJ-03).** El *«Vas por la semana N de 12»* citado
    > arriba ya no es el texto: las semanas se cuentan como las numera el servidor, de lunes a
    > domingo y **trece** (la 13 hasta el día 90), y la tarjeta dice *«de 13»*; el mes 3 son las
    > semanas 9 a 13. Además, el domingo la tarjeta de la semana suma debajo la que empieza el
    > lunes, que es la que se arma ese día. Ver `features/objetivos/utils/periodoDelPrograma.ts`.
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Comunidad`, pestaña *Tribu*.**
    Pedido del dueño ese día, sobre una captura de la app y trayendo el reporte de un usuario: que
    los grupos a los que la persona pertenece se vean juntos, con nombre propio, y los 1 a 1 abajo.
    El alcance autorizado fue:
    * Una sección nueva **“Formación Renaser”** que lista los **tres grupos** de la persona: el
      general (`GLOBAL`), el de su mentor (`CELULA`) y el de soporte (`SOPORTE`). Orden fijo, no el
      del servidor: son tres destinos que se miran todos los días y tienen que estar siempre en el
      mismo lugar.
      > **Corregido 2026-09-26.** El orden fijo se reemplazó por el del último mensaje, a pedido del
      > dueño (chat estilo WhatsApp); ver la excepción de ese día, más arriba.
    * **Se eliminó el conmutador `DIRECTOS | GLOBAL`** y su estado `tribuTab`. Ya no hay nada que
      conmutar: se ven las dos listas a la vez, grupos arriba y 1 a 1 abajo, bajo el rótulo
      **“Directos”**.
    * En consecuencia, `chatMappers.mapearTipoConversacion` **dejó de aplastar `SUPPORT` a
      `'direct'`** y `ChatConversation['type']` sumó `'soporte'`. Ese aplastamiento existía porque
      Directos era el único cajón donde el chat de soporte se veía; con cajón propio se ve mejor,
      ya no compite con los 1 a 1.
    * **No se tocó** la tarjeta del mentor ni la entrada al grupo que se acompaña (la sección
      *Acompañamiento*, que solo ve un mentor y significa otra cosa: el grupo que LIDERA, no uno al
      que pertenece). Tampoco cambió `handleAbrirChat`: las filas de grupo abren el chat por el
      mismo camino que siempre.
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
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
  * **Excepción autorizada por el dueño del producto — 2026-09-16 — tab `Yo`.** Se autorizó
    expresamente agregar la fila **"Modo oscuro"** (ícono + `Switch`) a la sección
    *FASE 4: PREFERENCIAS & SISTEMA* de `src/screens/YoScreen.tsx`, porque hasta entonces el tema
    solo se podía cambiar desde el botón de luna/sol de la cabecera y el dueño lo quería como una
    fila de ajustes más. Queda anotado acá para que esta regla no contradiga al código.
    El alcance autorizado fue **solo esa fila**: el resto de `Yo` no se tocó, el botón de la
    cabecera sigue donde estaba, y "Notificaciones & Alarmas" sigue navegando a su sub-vista con
    chevron (convertirla en `Switch` habría tapado los tres ajustes detallados que viven adentro).
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.

---

  * **Corrección encontrada en el E2E del Mapa del Poder por rol — 2026-10-10 (backend E-592).**
    Al abrir el mapa activo desde otro navegador, el cierre decía «0 acciones semanales» y «0 reemplazos»
    aunque el servidor hubiera guardado tres y uno. `useMapaRenacimiento` recupera los conteos del mismo
    `GET /mapa-renacimiento`; `CierreScreen` los usa cuando no hay listas locales. También corrige un cierre
    vacío guardado por la versión anterior. No reconstruir un borrador vacío ni mandarlo al servidor.
    `mapaEnOtroDispositivo.test.ts` cubre ambos casos; `e2e/mapa-poder/` pasó los cinco roles con login, Día 1,
    diez pasos y otro navegador. Sin permisos ni endpoints nuevos. **Hace falta una versión nueva de la app.**

  * **Recuperación del Día 1 de cuentas anteriores — 2026-10-10 (backend E-594/E-596/E-597).**
    Pedido del dueño: verificar quienes nunca eligieron su inicio después de actualizar la app y evitar
    entradas escondidas, parpadeos y cargas interminables. Hoy, Yo y Training ofrecen el selector a una
    participación pendiente; el personal sin fila conserva la invitación opcional, y «Ahora no» pertenece
    a esa cuenta. No asignar automáticamente una fecha ni reiniciar un programa activo o completado.
    Un fallo muestra «Reintentar Día 1»; las consultas cortas y la confirmación vencen a los 15 s.
    Los datos de la consulta anterior no deben aparecer ni un render al recargar o cambiar de usuario.
    Confirmar invalida las lecturas de las pestañas montadas; una respuesta o error anterior no debe
    reemplazar la relectura nueva (`lecturasDiaUnoFueraDeOrden.test.ts`). Un 400 refresca fechas; un 409 relee la
    elección existente; una respuesta perdida permite repetir la misma fecha. La matriz E2E vive en
    `playwright.dia-uno.config.ts` y su preparación y alcance en `e2e/mapa-poder/README.md`.
    **Requiere publicar ambos proyectos:** el backend serializa la elección por usuario hasta el commit.
    Verificación final del 2026-10-12: 34/34 E2E de Día 1 y 5/5 mapas completos, cero reintentos,
    fallos, errores u omitidos. JUnit y persistencia SQL en `artifacts/e2e-dia-uno/` y `artifacts/e2e-mapa/`.

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

  * **Cambio por pedido del dueño — 2026-10-13 — tabs `Training` y `Comunidad` (ranking): el hábito GIMNASIO y su
    pestaña** (backend D-266). Pedido: «activar el hábito de gimnasio y que salga en el ranking también, igual que los
    demás: una foto y nada más». Lo que cambia y nada más:
    * **Training**: aparece GIMNASIO para todos, opcional, con el ícono de pesas que ya tenía (`WORKOUT`). Es foto y
      listo, sin «¿Qué sentiste?» (solo los rituales preguntan, D-172): el flujo no se tocó. Lo pone el backend (V99).
    * **Comunidad → Ranking**: cuarta pestaña «Gimnasio» con los días de gimnasio desde el Día 1 («12 días», «1 día»;
      sin quien tiene 0, como Kilómetros). `ControlSegmentado` suma `achicarTexto` (apagado por defecto): con cuatro
      opciones en 360 dp el texto se achica hasta un 85 % en vez de cortarse con «…». Solo el ranking lo usa.
    * **Hace falta un APK nuevo** para la pestaña; el APK publicado ya ve y registra el hábito.

  * **Cambio por pedido del dueño — 2026-10-29 — tabs `Training`, `Yo` y `Hoy` (registro con foto): KILÓMETROS DIARIOS
    siempre muestra el campo de km y nunca se envía sin el número** (issue #42; autorizado el 2026-10-29). El campo
    «¿Cuántos km recorriste hoy?» solo salía si el registro fresco (`GET /habit-tracks/today`) decía que el hábito mide
    algo. El chat y el orbe de SER no traen esa pista, la foto pendiente de Android no la guardaba y, si esa consulta
    fallaba, la pantalla se abría SIN campo y se enviaba sola: el servidor respondía 400 «Escribe cuántos km recorriste
    hoy…» y «Reintentar» repetía el mismo envío, en bucle. Lo que cambia y nada más:
    * **Tres respuestas en vez de dos** (`medicionQueSeSabe`, `habits/utils/registroConFoto`): pide los km (objeto), no
      pide nada (`null`) o **no se sabe** (`undefined`: no se pudo leer el registro y quien llamó no trae la pista). Training
      y Yo siempre saben (leen el track: objeto o `null`); el chat y el orbe, no. Antes lo que no se sabía se tomaba por
      «no pide nada».
    * **Si no se sabe, no se abre a ciegas**: antes de la cámara, un diálogo «Sin conexión» con el mensaje de siempre
      («Necesitamos actualizar tus hábitos antes de registrar. Revisa tu conexión e inténtalo de nuevo.»,
      `MENSAJE_SIN_CONEXION_PARA_REGISTRAR`, el mismo de `ejecutarEnRegistroVigente`) y «Ahora no» / «Reintentar» (repite el
      toque desde cero). Resultado nuevo de `iniciar`: `'sin-conexion'` (las tarjetas del chat y del orbe lo leen como «sigue
      pendiente»). En web, que no lee el registro antes de la cámara, el mismo aviso sale tras la foto, sin enviar nada.
    * **La foto pendiente de Android recuerda los km** (`fotoPendiente.medicion`: objeto, `null` o ausente; un valor roto
      se lee como «no se sabe»): al recuperarla sin red abre con el campo; sin ninguna pista, avisa (sin «Reintentar»: la
      foto pendiente se ofrece una sola vez).
    * **Si el servidor pide los km igual** (400 con «km» en el mensaje, `pideLosKm`) y la pantalla no tenía el campo, se
      muestra el campo (con el total recorrido si se puede leer el registro) y NO se repite el envío; la evidencia ya subida
      no se vuelve a subir y los km viajan al registrar. Cualquier otro error sigue siendo el de siempre con «Reintentar».
    * **No cambian**: ningún texto ni diseño de la pantalla de foto, los demás hábitos con foto (se registran solos como
      siempre; Training y Yo con pista `null` siguen abriéndose sin red), las acciones del día, el backend (el evento de
      SER no trae la clave ni la medición: hacerlo es trabajo de backend) ni los tabs.
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).

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

  * **Cambio por pedido del dueño — 2026-10-19 — tab `Hoy`: la tarjeta del semáforo con el mensaje del día y el
    sticker del búho** (backend spec 006, `Renaser-90-dias-backend/specs/006-mensaje-semaforo-y-podio/`). Textual: «El
    mensaje que acompaña los semáforos tiene que ser mucho más personalizado, no solo que muestre el porcentaje avanzado
    en el día». Lo que cambia y nada más:
    * **El mensaje** (`semaforo.mensaje` de `GET /api/v1/home`: `{ id, texto, sticker }`): entre la palabra del color y
      las siete barras de `TarjetaSemaforoHoy`, un sticker del búho de 56 y el texto en una burbuja de lavado dorado
      (`MensajeDelSemaforo`; Jost 15, color de texto del tema, en claro y oscuro). Lo elige y lo redacta el servidor
      —uno por persona y por día, con su nombre, el hábito que más le cuesta o el que mejor le va y cuánto le falta para
      el siguiente color—: la app NO transforma el texto. Sale todos los días, también sin color (inicio, pausa, sin
      programa, cuenta en pausa, graduado). El lector de pantalla lo lee: el texto se suma a la etiqueta de la tarjeta.
      > **Corregido 2026-10-31.** La tarjeta (con este mensaje y su búho) ya no está en Hoy: pasó a Yo, en el lugar del gráfico «Tu
      > cumplimiento». El mensaje se dibuja igual (`MensajeDelSemaforo` dentro de `TarjetaSemaforoHoy`) y sale de `/home` como siempre.
    * **Los 15 stickers** (WebP de 512, sin texto en la imagen, 5 dorados para lo que se celebra y 10 azules) viven en
      `assets/stickers/semaforo/`, y `semaforo/data/stickersDelSemaforo.ts` es el único lugar que los nombra (la prueba
      frena que el catálogo del servidor use uno que falte). Un nombre desconocido, vacío o una imagen que no carga
      dejan solo el texto, sin hueco.
    * **Tolerante a todo lo de afuera**: el campo es aditivo y `.nullish().catch(null)`. Un mensaje mal formado, vacío o
      con una llave `{…}` sin reemplazar se pierde SOLO él: la tarjeta sigue y Inicio no se cae. Con `mensaje: null`
      (backend anterior, nadie a quien medir, ningún candidato) la tarjeta es exactamente la de antes.
    * **Movimiento** (`emil-design-eng`, `animate-expo`): lo ve una vez al día, así que un fundido de 180 ms con
      ease-out y solo `opacity` (hilo de la interfaz); con «reducir movimiento», sin animación. `key={mensaje.id}`: un
      mensaje distinto se vuelve a fundir; el mismo con datos nuevos (los «faltan» bajan al cumplir un hábito), no.
    * **No cambian**: la palabra del color, el porcentaje, «N de 7 días con datos», las barras, el detalle del semáforo
      (`SemaforoScreen`), el aviso del sábado, las tarjetas del mentor, del líder y de administración ni el resto de Hoy.
    * **Hace falta un APK nuevo y el backend con V110.** La app nueva contra un backend anterior muestra la tarjeta como
      hoy; el APK publicado ignora el campo.

  * **Cambio por pedido del dueño — 2026-10-19 — tab `Comunidad` → Ranking: «Descargar» la imagen del podio** (la misma
    spec 006 del backend). Textual: «Que haya opción para descargar en los podios». Lo que cambia y nada más:
    * **El botón**: junto a la línea de lo que mide la tabla, «Descargar» (`BotonDescargarPodio`: `Presionable` de 48 con
      el ícono `forward`, «Preparando…» mientras trabaja). **Solo con el permiso del servidor**: `capabilities.canExportRanking`
      de `GET /api/v1/mentor/context` (líder de mentores, alquimista, administrador y Soporte TI;
      `useCapacidades().capacidades.exportarRanking`). Para aprendiz, guía, mentor y un backend anterior la fila es la de
      siempre. La consulta se hace al abrir Ranking, no al abrir Comunidad.
    * **La imagen**: vertical 9:16 de 1080 × 1920 px de la tabla que se está mirando (General, Coherencia, Kilómetros o
      Gimnasio): el fénix de Renaser, el nombre de la tabla, la fecha del corte en español de Perú, el podio PLANO de
      los tres primeros (oro, plata, bronce) y del 4.º al 10.º, con nombre completo («…» si no cabe) y puntaje, siempre
      en la paleta oscura de la marca y con Fraunces solo en el título. Son las mismas filas que la pantalla en el
      momento del toque; con menos de 10 personas salen las que hay y los lugares del podio sin nadie se ven libres. La
      arma el teléfono con lo que ya tiene (`GET /ranking`): no hay endpoint nuevo ni se guarda nada en el servidor.
    * **Cómo sale**: `TarjetaDelPodioParaCompartir` (540 × 960 dp, el doble en la imagen) se monta fuera de pantalla solo
      mientras se genera, se captura con `react-native-view-shot` (`captureRef`, PNG) y se comparte con `expo-sharing`
      (hoja del sistema: WhatsApp, historias, «Guardar imagen»); en la web baja el archivo
      `podio-<tabla>-<fecha>.png`. Cancelar la hoja no es un error; un fallo avisa con un diálogo; vibración
      `tacto.logro()` al terminar. **Sin dependencias nuevas** (las dos ya estaban). Todo vive en `features/ranking/`.
    * **En `ComunidadScreen.tsx` solo cambia** la línea bajo el selector de tabla: pasa a ser una fila con el texto y,
      a la derecha, el botón.
    * **No cambian**: las tablas, el podio animado de la app, el selector, «Tu posición» ni las demás secciones.
    * **Hace falta un APK nuevo y el backend con V110** (la capacidad la publica el backend; contra uno anterior no hay
      botón).

  * **Cambio por pedido del dueño — 2026-10-29 — tab `Comunidad` → Ranking: «TÚ» y «Tu posición» solo por id** (issue #43;
    autorizado el 2026-10-29). Se buscaba a la persona por id o, si no, por nombre con `includes`: «Ana» o «Luis» están
    dentro de «Ana María Torres» o «Luis Pérez», que pueden estar más arriba en la tabla, y se marcaba a otra persona como
    «TÚ» con su posición. Lo que cambia y nada más:
    * **Solo por id de la cuenta**, en las cuatro tablas (General, Coherencia, Kilómetros y Gimnasio): `participanteId` de
      cada fila de `GET /ranking` es el `UserId` (`EntradaRankingResponse`) y el de la sesión es `UserResponse.id`: el
      mismo texto. `esMiEntrada` / `nombreEnElRanking` / `miEntradaEnLaTabla` (`ranking/utils/tablasDeRanking`) lo deciden
      para las filas de la tabla («TÚ (nombre)» y la fila resaltada), los tres lugares del podio y «Tu posición»;
      `QuienMira` ya no tiene `name`. **Sin id** (de la sesión, o en una fila) **no se marca a nadie**: no se adivina por
      nombre.
    * **No cambian**: los textos, el diseño, las tablas, el podio, «Descargar» (esa imagen usa siempre el nombre que
      manda el servidor) ni los demás tabs. Sin backend nuevo.
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).

  * **Cambio por pedido del dueño — 2026-10-20 — tab `Training` → Planificar: el recordatorio por día** (spec 008 del
    backend, `specs/008-recordatorio-por-dia/`, D-282 y E-640). Textual, sobre la captura del editor de GIMNASIO: «los
    recordatorios también deben de ser por día, no en general, arregla eso para continuar». Lo que cambia y nada más:
    * **El editor de un hábito** (`PlanificarDimensionModal`, paso 2) se ordena en tres bloques con su rótulo
      `MicroLabel`: **Hora** (la rueda, fija arriba), **Días** y **Recordatorio**. Debajo de la rueda todo se desliza
      (`ScrollView`, barra visible) para que, con días marcados, entren el recordatorio y los botones por día en un
      teléfono bajo o con la letra grande; la rueda de «Otra» queda fuera de lo que se desliza (dos ruedas anidadas se
      pelean por el dedo). Las opciones del recordatorio miden 48 y van a 16 px; la ayuda, a 16.
    * **Con días marcados se elige el aviso** de esos días («Recordatorio de sáb, dom»), con las mismas opciones del
      general. La línea «El recordatorio se elige sin días marcados» queda **solo** contra un backend que no informa
      `customReminder` (anterior a V111). Si los días marcados tienen avisos distintos no se marca ninguno (tampoco «Sin
      aviso») y se lee «Estos días tienen avisos distintos» (15 px); lo que se elija se pone a todos los marcados.
    * **Se guarda solo lo tocado** (`training/utils/avisoDeLosDias`): sin mover la rueda cada día conserva su hora y solo
      cambia el aviso («Guardar aviso · sáb, dom»; `PUT .../weekdays/{wd}/reminder`, que no gasta el cupo de reacomodos);
      moviendo la rueda se guarda la hora («Guardar 07:00 · sáb, dom», como hasta ahora) y, si también se tocó el aviso,
      las dos («Guardar hora y aviso · …»). Los días van con su nombre corto y no con la inicial («M, M» no distingue).
      Hoy y los días pasados siguen con candado, para la hora y para el aviso.
    * **El chip de cada día** (`FilaDeDiasDelPlan`, prop **opcional** `avisoDelDia`; Plan y «Agendar acciones» no la
      pasan y su fila es la de siempre) dibuja bajo la hora la campana de línea (`bell`; `bellOff` nueva, Lucide en caja
      de 24, para «sin aviso») de 16 con «30′», «a la hora» o «30′ +1», a 13 px y con el dorado de alto contraste; solo en
      los días cuyo aviso propio difiere del general. Con la prop, cada pastilla se anuncia completa al lector de
      pantalla («Sábado 24, 09:00, aviso 30 minutos antes»). Tocar un día vibra (`tacto.seleccion()`).
      > **Corregido 2026-10-20 (E-643, captura del dueño: «se deforma»).** Un día con varios avisos agrandaba su chip
      > (la campana, los minutos en dos o tres renglones y, con la 009, el reloj de la alarma propia) y desalineaba a los
      > demás. Ahora, en el editor, **los siete chips reservan el mismo bloque de abajo**, lleven o no campana y reloj: los
      > datos de arriba (letra, número, hora o candado) quedan pegados arriba y alineados, y abajo hay UNA fila de íconos
      > (campana y reloj de 14 si conviven; solos, de 16) y UNA línea de texto de ancho acotado que se achica
      > (`adjustsFontSizeToFit`, hasta 0,75) en vez de partirse. El texto es el aviso más temprano y cuántos más («30′ +3»);
      > nunca la lista, que la oye el lector de pantalla en la etiqueta («Avisos 30, 10 y 5 minutos antes y a la hora»).
      > Formatos: minutos hasta 99, horas justas desde 100 («2 h») y **«hora»** para el aviso a la hora exacta (antes «a la
      > hora» y «1 h 30′», que no cabían en una línea). Con la letra del sistema grande la escala de los textos del chip
      > se acota a 1,15. Plan y «Agendar acciones» no pasan las props y su chip es el de siempre.
    * **«Dejar sáb como los demás días»** (antes «Quitar la hora propia de sáb») quita la hora **y** el aviso propios.
    * Debajo del recordatorio queda un lugar vacío (`espacio-para-tipos-de-alarma`) para los tipos de alarma, que van en
      otra spec: no muestra nada. (> Ocupado el 2026-10-20 por «Cómo suena» de la spec 009, más abajo; sigue vacío
      contra un backend que no la informa.)
    * **La alarma del teléfono dejó de ignorar la hora de cada día (E-640)**: una sola alarma `DAILY` a la hora general
      hacía sonar el jueves a las 07:00 aunque fuera a las 09:00. Con la misma regla del servidor —algún día con hora
      propia, aviso propio o apagado—, `recordatoriosDeHabito.programar` pone una alarma `WEEKLY` por día encendido y
      por antelación, a la hora de ese día (`habits/notificaciones/utils/alarmasPorDia`), con el identificador
      `habito-{id}-d{1..7}-{n}` (lunes = 1; la más temprana de cada día es `-0`, la etiqueta del push de respaldo). Un
      aviso que cruza la medianoche suena el día anterior. Sin ningún día distinto queda el esquema diario **tal cual**,
      con `habito-{id}-inicio`. Se conservan el canal y la voz por hábito, la ruta de Training, la puesta al día con el
      servidor (compara la firma de lo programado y no repite trabajo), el rearmado de la spec 007 y el aviso agrupado
      (E-410: dos semanales del mismo día y hora se juntan; una semanal y una diaria no). Guardar, quitar o apagar días
      en el editor relee la semana y rehace las alarmas. Mientras un cambio de hora general espera su fecha (D-91), los
      días que siguen la general llevan una alarma de fecha, que la puesta al día convierte en semanal.
    * **Compatibilidad**: todo campo nuevo es opcional. Contra un backend anterior (sin `weekdays` ni `customReminder`)
      la app no ofrece aviso por día y todo es como hoy; un hábito sin días distintos no ve ningún cambio.
    * **No hace falta APK nuevo** (solo JavaScript): hace falta el backend con V111 antes. No cambian Plan, Hoy, los otros
      tabs ni las alarmas de Despertar de Yo → Alarmas (no conocen los días: si el hábito tenía días distintos, la
      próxima puesta al día —al abrir la app— las deja por día otra vez).

  * **Cambio por pedido del dueño — 2026-10-20 — tab `Training` → Planificar: cómo suena la alarma** (spec 009 del
    backend, `specs/009-tipos-de-alarma/`, D-283 y V112; se apoya en la 008). Textual: «abajo saldrá los diferentes
    tipos de alarmas que pondremos… debajo de los recordatorios», con un interruptor grande como referencia; «para que
    sea más agradable visual para los usuarios y recuerda que es por día totalmente personalizable… es para personas de
    40 años para arriba y que sea cómodo». Lo que cambia y nada más:
    * **Sección «Cómo suena»** (`training/components/SeccionComoSuena`), en el lugar que dejó la 008 debajo del
      recordatorio (`espacio-para-tipos-de-alarma`). La hoja queda en este orden, cada bloque con su `MicroLabel`:
      **Hora → Días → Recordatorio → Cómo suena → Guardar**. Cuatro filas: **Sonido** («Suena el tono que elegiste en
      Yo → Alarmas»), **Vibración** («El teléfono vibra»), **Voz que dice el hábito** («Una voz dice el nombre del
      hábito») y **Repetir si no la atiendo** («Vuelve a sonar a los 5 y a los 10 minutos»). Sin aviso, o con el hábito
      apagado ese día, la sección se atenúa, no se puede tocar y dice por qué («Este día no tiene aviso»).
    * **`InterruptorGrande`** (`components/InterruptorGrande.tsx`), componente nuevo y aparte: **no reemplaza ni cambia
      a `Interruptor`**, que sigue con 51 × 31 en Yo, Plan, Training y Eventos. La fila entera es el área de toque (56 o
      más de alto), con el rótulo a 17 px y la explicación a 15; riel de 72 × 40, pulgar blanco de 34 con sombra suave,
      dorado del tema encendido y gris apagado con «Sí» / «No» dentro del riel (el estado no depende solo del color:
      el gris mide 3,2 : 1 contra la tarjeta en claro y 3,4 : 1 en oscuro). Estado **«Varía»** (los días marcados no
      coinciden): riel gris, pulgar en el medio con un guion y la palabra «Varía»; al tocarlo pasa a encendido para todos.
      Rol `switch`, `checked` (`mixed` en «Varía»), el rótulo como nombre y la explicación como ayuda. El pulgar se
      mueve 180 ms con la curva de la app (Reanimated, hilo de la interfaz) y al instante con «reducir movimiento»;
      `tacto.seleccion()` una vez por cambio.
    * **Reglas, dichas en línea bajo la fila que las causa** (nada de diálogos): **sonido y vibración no pueden quedar
      los dos apagados** (se puede apagar el segundo para no trabar la mano, pero la línea lo explica —«Si no quieres
      alarma, elige «Sin aviso» en Recordatorio»—, no deja guardar y vibra con `tacto.error()`); **la voz necesita el
      sonido** (apagar «Sonido» apaga «Voz» y la deshabilita con «La voz necesita el sonido»; encender «Voz» enciende
      «Sonido»). Estas dos reglas las agregó el equipo y se le avisan al dueño (Clarifications de la spec).
    * **El tono de Yo → Alarmas sigue mandando** con «Sonido» encendido y «Voz» apagada. Si ese tono ya es «Voz», las
      alarmas siguen diciendo el hábito aunque la combinación traiga `voice: false` (el servidor no conoce el tono): la
      fila de voz se ve encendida y fija, con «Ya habla porque tu tono en Yo → Alarmas es «Voz»». Si es «Solo vibrar»,
      la fila de sonido avisa que no va a sonar. Una alarma nunca queda muda: sin sonido ni vibración, vibra.
    * **Por día, igual que la hora y el aviso (008)**: sin días marcados vale para el hábito entero (`PUT
      /habit-preferences/{id}/alarm`); con días marcados, solo para esos (`PUT …/weekdays/{wd}/alarm`). Los cuatro
      campos viajan siempre. **Se guarda solo lo tocado** y no gasta cupo: «Guardar alarma · sáb» si solo se cambió «Cómo
      suena» (ni la hora ni el aviso se vuelven a mandar), «Guardar hora y alarma · …», «Guardar aviso y alarma · …» o
      «Guardar hora, aviso y alarma · …» si también se cambió lo otro; lo que no se tocó conserva, día por día, lo que
      cada día tenía. Sin días marcados y solo «Cómo suena»: «Guardar alarma · todos los días». Si se cambia con la hora,
      «cómo suena» se guarda primero y, si falla, no se toca nada más. **«Dejar sáb como los demás días»** quita también
      la combinación propia (el servidor la borra con la fila del día).
    * **El chip del día** (`FilaDeDiasDelPlan`, prop **opcional** `alarmaDelDia`; Plan y «Agendar acciones» no la
      pasan): un día con combinación propia lleva un reloj de alarma de 16 (`alarmClock`, sin texto), junto a la campana
      del aviso propio. El lector de pantalla lo suma a la etiqueta: «Sábado 24, 09:00, alarma propia: sin sonido, vibra».
    * **La alarma del teléfono suena como dice el día** (sin código nativo ni sonidos nuevos): en Android la
      vibración también es del canal, así que cada combinación es un canal (`habits/notificaciones/utils/combinacionDeAlarma`):
      el del tono de Yo → Alarmas con el sufijo **`-vib`** (`enableVibrate: true`), ese mismo con **`-sinvib`**
      (`enableVibrate: false`), el de **solo vibrar** (también `-vib`) y el de **voz del hábito** (o la frase general),
      con `-vib` o `-sinvib`. Los canales `-vib` y `-sinvib` están en `ARCHIVO_POR_CANAL` (el rearmado nombra el archivo
      correcto).
      > **Corregido 2026-10-20 (E-641, decisión del dueño: vibrar por defecto).** Decía que con la vibración encendida
      > la alarma salía por el canal de siempre. Medido con `dumpsys notification` en el emulador, los canales que ya
      > existían (`recordatorios-habitos`, `-campana`…) NO vibran —Android crea un canal sin vibración si no se le pide
      > y no se puede cambiar después—, así que «Vibración: sí» no vibraba. Ahora **toda alarma de HÁBITO sale por un
      > canal `-vib` o `-sinvib`**, creado con la vibración dicha de forma explícita; los canales base quedan solo para
      > eventos, objetivos y el repaso del domingo, que no cambian. Al actualizar, la puesta al día pasa las alarmas de
      > hábitos ya programadas (y sus repeticiones) al canal que corresponde sin cambiar su hora ni su identificador
      > (`ponerLasAlarmasDeHabitosEnSuCanal`, como el cambio de sonido), y «Probar el sonido» de Yo → Alarmas también sale
      > por el canal que vibra.
      > **Corregido 2026-10-20 (E-642).** Un día sin hora propia usaba la `triggerTime` de arriba del ítem de
      > `GET /habit-preferences`, que el servidor resuelve para HOY: si hoy tenía hora propia (martes a las 11:29), el
      > sábado quedaba a las 10:59 en vez de las 06:30. Cada día usa ahora su propia `weekdays[i].triggerTime` (`horaResuelta`).
      La combinación viaja en
      `data.alarma` del aviso (solo si no es la de siempre), así que cambiar el tono en Yo → Alarmas y el aviso agrupado
      de dos hábitos a la misma hora conservan cómo suena cada uno (un grupo suena y vibra si alguno lo pide). Un día con
      combinación propia pasa al esquema por día como uno con hora o aviso propios (misma regla que el servidor: su push
      de respaldo lleva la etiqueta `habito-{id}-d{iso}-0`); sin combinaciones el esquema diario queda idéntico, con los
      mismos identificadores y el mismo contenido. El teléfono recuerda la combinación general para que Plan o Yo, que
      reprograman sin saber de ella, no la pierdan.
    * **Repetir si no la atiendo** (`habits/notificaciones/repeticiones.ts`): alarmas de **fecha** a +5 y +10 min de la
      hora del hábito (solo esa; las de antes no se repiten) en una **ventana de 7 días** (hoy y los 6 siguientes), con
      el identificador `habito-{id}-rep-{AAAAMMDD}-{5|10}` (la fecha es la del día del hábito). Se arman al guardar y la
      puesta al día (`ajustarRecordatoriosAlServidor`, al abrir la app y al volver a primer plano) renueva la ventana
      sin tocar lo que ya está igual. **Tocar cualquier alarma del hábito o completarlo cancela las de HOY** y se anota
      que ese día ya se atendió, para que la renovación no las resucite; las de mañana siguen. Un toque viejo (la última
      respuesta que devuelve la librería al abrir la app en frío) no cuenta. Cerrar sesión las borra con sus notas.
      **Límite aceptado:** si la persona no abre la app en 7 días, las repeticiones se acaban (la alarma principal
      sigue). Tampoco se cancelan al cumplir el hábito por la Pastilla o la Clase diaria (su endpoint no emite
      `habitoCumplido`), ni al cumplirlo desde otro teléfono o la web, salvo que se toque la alarma.
    * **Compatibilidad**: todo campo nuevo (`alarm`, `customAlarm`) es opcional y una combinación que no se entiende se
      descarta sola sin tumbar la lista de preferencias. Contra un backend anterior no se muestra «Cómo suena» y todo
      queda como la 008; un APK anterior con el backend nuevo ignora los campos y suena como hoy. En la web no se
      muestra (no hay alarmas locales).
    * **Voces de los hábitos de sistema que faltaban** (decisión del dueño, 2026-10-20: «grabar los que faltan + frase
      clara para el resto»): «KILÓMETROS DIARIOS» (`V84`) y «GIMNASIO» (`V99`, era «ENTRENAMIENTO FÍSICO» de `V9`) dicen
      su nombre con la voz Dora, igual que los 18 de `V4`: «Kilómetros diarios.» y «Al gimnasio.» (sola, «Gimnasio» sale
      «Quimnasio»), en `vocesDeLasAlarmas.json`, con `voz_habito_kilometros_diarios.mp3` (17 KB) y
      `voz_habito_gimnasio.mp3` (15 KB) en `assets/sonidos/` y en `sounds` de `app.json`. Los siete de `V9` que siguen
      apagados no tienen voz: si se activan desde «Hábitos del programa», dicen la frase general hasta que se les grabe.
      **Los audios van dentro del APK: hace falta un APK nuevo** para oírlos. En «Cómo suena», la fila **Voz** de un
      hábito sin voz propia (propio, renombrado o nuevo) dice «Este hábito dice la frase general: «Tu hábito está por
      empezar»» en vez de «Una voz dice el nombre del hábito» (`filasDeComoSuena`, con `vozDelHabito`, la misma función
      que elige el canal de la alarma).
    * **No hace falta APK nuevo** (solo JavaScript; ni `package.json`, ni `app.json`, ni código nativo): hace falta el
      backend con **V112** antes. No cambian `Interruptor`, Yo → Alarmas, Plan, Hoy ni los otros tabs.
      > **Corregido 2026-10-20.** Con las voces nuevas de arriba (`app.json` y dos MP3) **sí hace falta un APK nuevo**.

  * **Cambio por pedido del dueño — 2026-10-20 — tabs `Plan` y `Yo` → Alarmas: las acciones de los objetivos por día y
    cómo suenan** (spec 010 del backend, `specs/010-acciones-por-dia/`; se apoya en la 008 y la 009). Textual, después de
    probar las dos en el emulador: «tenemos que probar que esto también funcione con las acciones diarias que son los
    objetivos», y aclarando: «me refiero a lo nuevo que estábamos agregando, que también lo tenga». Lo que cambia y nada
    más:
    * **El mismo control en los dos lugares** (`objetivos/components/RecordatorioDeAcciones`: «Recordatorios» de «Tus
      acciones» en Plan y «Acciones de tus objetivos» en Yo → Alarmas) suma arriba la **fila de los siete días de los
      hábitos** (`FilaDeDiasDelPlan`, sin tocarla: usa sus props opcionales). El número bajo cada día es la hora de su
      recordatorio diario; la campana con «30′», «hora» o «30′ +1», el aviso propio (solo si difiere del general). **Hoy y
      lo pasado van con candado** (`esPlanificable`, la misma regla que los hábitos): rige desde la próxima vez.
    * **Dos modos, como el editor de Planificar.** Sin días marcados («Todos los días») todo se guarda en el acto, como
      siempre. Con días marcados («Solo sáb, dom») lo que se toca queda en un borrador y se guarda con **«Guardar
      cambios · sáb, dom»**, que solo aparece si algo cambió. **Se guarda solo lo tocado** (`conCambios`): la hora que no
      se movió y el aviso que no se eligió siguen como cada día los tenía. Si los días marcados tienen avisos distintos no
      se marca ninguna opción (tampoco «Sin aviso») y se lee **«Estos días tienen avisos distintos»** (15 px, color del
      texto); lo mismo con los recordatorios y las horas distintas. «Dejar sáb como los demás días» devuelve esos días a la
      general. Tipo oración, tuteo, 16–17 px, opciones de 48.
    * **Qué se puede elegir por día**: encender o apagar «Recordarme mis acciones del día» (`Interruptor`, el de siempre),
      su hora, el aviso antes de cada acción con hora (sin aviso, 30 min, 10 min, a la hora; se pueden varias, como
      siempre: para pasar de «10 min» a «30 min» se apaga una y se enciende la otra) y **cómo suena** (más abajo). Lo que un
      día no dice lo hereda de la general, campo por campo; lo que queda igual a la general vuelve a seguirla.
    * **Todo en el teléfono, por cuenta, como hoy** (FR-007): sin servidor y sin endpoints nuevos. Las preferencias son
      las de siempre (`diarioActivo`, `horaDiaria`, `antelaciones`), que **pasan a ser la configuración general sin
      migrar nada**, más dos campos opcionales (`dias` y `alarma`) que solo existen si la persona los usa
      (`objetivos/notificaciones/preferenciasPorDia`, puro). Quien actualiza y no toca nada sigue con lo que tenía.
    * **Las alarmas.** Recordatorio diario: sin días distintos (encendido, hora o cómo suena) es **UNA alarma diaria**, la
      de siempre, con su id guardado suelto; con algún día distinto, **una alarma semanal por día encendido**, a la hora de
      ese día, con el identificador estable `acciones-diario-d{1..7}` (lunes = 1; `objetivos/notificaciones/planDelDiario`).
      Aviso antes de cada acción: alarmas de **fecha**, como hoy, pero con las antelaciones del día de la semana de **su
      fecha** (el aviso de una acción del sábado es el del sábado, aunque se lea el martes). Se conservan la ruta a Plan →
      Objetivos, el agrupado de avisos a la misma hora (E-410), el rearmado de la spec 007 y la puesta al día al abrir la
      app (`SincronizadorDeAcciones`, que ahora mira si algún día pide aviso). Cerrar sesión borra todo, también las
      semanales; al volver, el recordatorio por día se arma como estaba.
    * **«Cómo suena»** (`training/components/SeccionComoSuena` con una prop nueva y opcional `filas`; los hábitos no la
      pasan): debajo del aviso, las **mismas cuatro filas, reglas y medidas que en los hábitos (009)** con el
      `InterruptorGrande` (filas de 56, 17 / 15 px): **Sonido**, **Vibración**, **Voz** («Una voz dice: «Tienes acciones de
      tus objetivos por hacer»», la voz de objetivos que ya existe; no se graba nada) y **Repetir si no la atiendo**. Mismas
      reglas, dichas en línea: sonido y vibración no pueden quedar los dos apagados; la voz necesita el sonido; con el tono
      «Voz» de Yo → Alarmas la voz ya habla; con «Solo vibrar» el sonido avisa que no suena. Con días que no coinciden el
      interruptor dice **«Varía»**; tocarlo lo enciende para todos. Sin recordatorio diario ni aviso no hay alarma que
      decidir: la sección se atenúa y lo dice («Enciende el recordatorio o elige un aviso para elegir cómo suena»). Sin días
      marcados se guarda en el acto (salvo que deje sonido y vibración apagados: espera, con su aviso, a que se encienda
      uno); con días marcados, con «Guardar cambios · sáb» y solo lo tocado (`training/utils/comoSuena` es el de los
      hábitos, sin duplicar). El chip del día con combinación propia lleva el reloj de alarma de 16 y el lector de pantalla
      dice «alarma propia: sin sonido, vibra». Yo → Alarmas le pasa al control su tono (`tonoDeYo`) porque lo cambia en la
      misma pantalla.
    * **La alarma suena como dice el día** (`objetivos/notificaciones/canalDeObjetivos`, que usa `canalDeLaCombinacion` de
      los hábitos con el tipo `objetivos`): `recordatorios-objetivos-vib`, `…-sinvib`, `…-vibrar-vib` (solo vibrar) y
      `…-voz-vib`, con el tono de Yo → Alarmas (`…-campana-vib`, etc.). **E-641 (vibrar por defecto) también vale para
      objetivos**: el canal base `recordatorios-objetivos` no vibra, así que toda alarma de las acciones sale ahora por un
      canal que dice si vibra. Los canales de hábitos y de eventos no cambian. La combinación viaja en `data.alarma` del
      aviso solo si no es la de siempre (el contenido de siempre queda idéntico), y forma parte de la clave de la alarma de
      fecha: cambiar cómo suena un día rehace solo las alarmas de ese día. El cambio de tono de Yo → Alarmas y el aviso
      agrupado (E-410) conservan la combinación de cada una; un grupo de acciones suena y vibra si alguna lo pide.
    * **Al actualizar sin tocar nada** (SC-003): la puesta al día pasa las alarmas de las acciones ya programadas —el
      recordatorio diario y el aviso de cada acción— al canal que vibra sin cambiar su hora, su identificador ni su texto
      (`ponerLasAlarmasDeAccionesEnSuCanal`, como `ponerLasAlarmasDeHabitosEnSuCanal`): suenan a la misma hora de siempre y
      ahora vibran. Un teléfono que borró las alarmas (spec 007) las recupera con el rearmado, que conserva el canal y los
      datos de cada una.
    * **Repetir si no la atiendo** (`objetivos/notificaciones/repeticionesDeAcciones`, puro en `planDeRepeticionesDeAcciones`):
      alarmas de **fecha** a +5 y +10 min de la **hora de la acción** (solo esa: el aviso 30 min antes no se repite; solo
      acciones con hora, sin cumplir y de un día con aviso) con el identificador `accion-{rocaId}-rep-{AAAAMMDD}-{5|10}`, y
      a +5 y +10 min de la hora del **recordatorio diario** en una ventana de 7 días (`acciones-diario-rep-{AAAAMMDD}-{5|10}`),
      que renueva `SincronizadorDeAcciones` al abrir la app. Las de las acciones se arman con la lista que se acaba de leer:
      una acción cumplida, movida o borrada deja de repetir en esa lectura. **Tocar la alarma de la acción** (lleva su
      `rocaId` en los datos solo cuando repite) **o el recordatorio** (`diario`), o **sellar la acción** (`sellarRocaDiaria`),
      cancela las de HOY y se anota que ya se atendió (`renaser.objetivos.recordatorios.atendidas`, unos días) para que la
      puesta al día no las resucite; un toque viejo no cuenta. Como las de los hábitos, no se agrupan. Cerrar sesión las
      borra con sus notas. **Límites aceptados:** cumplir la acción desde otro teléfono o la web no cancela las de este
      hasta que la app lea la lista; un aviso agrupado atiende solo a la acción del primero del grupo; las alarmas de
      acciones que ya estaban puestas antes de esta versión no llevan la acción en sus datos, así que tocarlas no cancela
      repeticiones hasta que se guarde cualquier cambio en el control (que las rehace).
    * **Compatibilidad**: todo campo nuevo es opcional; una combinación guardada que dejaría la alarma muda se descarta sola.
    * **No hace falta APK nuevo** (solo JavaScript; ni `package.json`, ni `app.json`, ni código nativo: la voz de objetivos
      y los sonidos ya van dentro del APK, y los canales `-vib` / `-sinvib` se crean desde JavaScript al programar) ni
      backend. No cambian los otros tabs, ni Plan o Yo en nada más.

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
      > **Corregido 2026-10-31 (punto 16).** «En Hoy las tarjetas de Administración, Mi grupo, Mis mentores, tickets, semáforo»: esas
      > entradas ya no están en Hoy sino en Yo (filas «Administración», «Mi grupo» y «Mis mentores»; el semáforo propio, en su tarjeta de
      > Yo) y se esconden con los mismos interruptores. En Hoy queda el próximo evento.
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

  * **Cambio por pedido del dueño — 2026-10-27 — tab `Plan`: los objetivos esperan al Mapa de Renacimiento (issue #37)**
    (backend #20: una aprendiz escribió su objetivo de 90 días en Plan sin haber activado el Mapa y, al activarlo, el
    servidor le respondió `409 ROCA_MAESTRA_FIJA`, porque el objetivo ya quedaba fijo). Textual: «Bloqueemos objetivos
    diciendo desde el inicio que debe hacer el Mapa de Renacimiento, porque si no, más bugs encontraremos.» El Mapa sigue
    siendo opcional en el resto de la app: nada se vuelve pantalla obligatoria. Lo que cambia y nada más:
    * **Plan → Objetivos sin Mapa activo** (`PuertaDelMapa`, en lugar de lo que había debajo del título «Objetivos» y su
      flecha de volver): no hay selector de eje, ni «Editar» / «Avance», ni la cifra del mes, ni la semana, ni las
      acciones —todo cuelga del objetivo de 90 días—. En su lugar, una tarjeta de borde dorado con el ícono `map`, el
      título **«Primero tu Mapa de Renacimiento»**, «Tu objetivo de 90 días nace de tu Mapa, así que primero lo armas
      allí. Toma de 15 a 20 minutos.» y el botón **«Hacer mi Mapa»**, que abre el MISMO flujo que la tarjeta del Mapa de
      Hoy (`abrirMapa` de `MapaRenacimientoContext`: el Mapa reemplaza a las pestañas). Texto de 16, botón de 52, sin
      animación (se ve de vez en cuando y no reemplaza nada que se esté usando). **Con el Mapa activo, Plan es
      exactamente el de siempre.**
      > **Corregido 2026-10-31.** Objetivos dejó de ser una sub-vista: `PuertaDelMapa` se dibuja en la pantalla principal de Plan, en lugar
      > del selector de eje y de todo lo del eje, con la misma regla.
    * **Cómo se sabe si el Mapa está activo** (`objetivos/hooks/usePuertaDeObjetivos`, decisión pura en
      `objetivos/utils/puertaDeObjetivos`): lo mismo que lee la tarjeta de Hoy —«activo» en el borrador del teléfono o
      `GET /api/v1/mapa-renacimiento` con `stageCompleted`, que solo puede confirmar—. A diferencia de Hoy, Plan no
      sigue «utilizable» con lo local si la red cae. Mientras se lee: «Comprobando tu Mapa…», sin tarjeta ni
      formularios (sin parpadeo: la primera lectura es «comprobando» y una relectura conserva lo ya confirmado). Si no
      se pudo leer y el teléfono no dice «activo»: «No pudimos comprobar tu Mapa de Renacimiento. Revisa tu conexión e
      inténtalo de nuevo.» con **«Reintentar»**; no se deja pasar ni se bloquea. Se relee al abrir Objetivos y al
      volver del Mapa. Al cambiar de cuenta no queda a la vista la lectura de la anterior ni un render.
    * **Un build sin el Mapa no bloquea nada**: la regla `EXPO_PUBLIC_MAPA_DIA7` (en desarrollo siempre; en un build
      publicado solo con `on`, como en `eas.json`) se movió a `mapa-renacimiento/utils/mapaHabilitado` y la usan Hoy y
      Plan. Si ese build no ofrece el Mapa, tampoco se le pide a nadie.
    * **Plan, pantalla principal**: «Toca cada una para escribir tu objetivo.» solo con el Mapa activo; sin él dice
      «Tus objetivos nacen de tu Mapa de Renacimiento.» (y mientras se comprueba, nada). Las tarjetas de prioridades
      siguen abriendo Objetivos, que dice lo mismo con su botón.
    * **Hoy, solo texto** (los dos textos cuando el Mapa no está activo; Hoy no cambia de forma, y el Día 0 y el Mapa
      siguen igual): la tarjeta del Mapa dice «Tu plan para {lapso} empieza aquí: de este Mapa nacen tus objetivos.
      15–20 min.» (era «Convierte lo aprendido en un plan claro para …») y la línea de «Acciones y objetivos» sin objetivo
      dice «Tu objetivo de 90 días nace de tu Mapa de Renacimiento.» (era «Define tu objetivo en Plan para sostener la
      dirección.», que mandaba a un lugar donde ya no se puede).
      > **Corregido 2026-10-31.** La línea de «Acciones y objetivos» ya no existe: la tarjeta de abajo (con «Prioridad #1 del día» y
      > «Define tu objetivo en Plan…») se reemplazó por `TarjetaAccionDeHoy`, arriba, que sin Mapa activo dice «Tu objetivo de 90
      > días nace de tu Mapa de Renacimiento.» con «Hacer mi Mapa». Ver la entrada del 2026-10-31.
    * **Rechazo del servidor, tolerante**: `PUT /api/v1/rocks/master/{eje}` puede responder `MAPA_PENDIENTE` (código
      tentativo, 409 o 403; el backend lo decide). `useRocasMaestras.definir` devuelve `mapaPendiente: true` con el
      mensaje del servidor (`objetivos/utils/mapaPendiente`) y Plan lo muestra con «Ahora no» / **«Hacer mi Mapa»**; el
      resto de los rechazos sigue como siempre (su mensaje tal cual, `ROCA_MAESTRA_FIJA` relee la lista). Contra un
      backend que no lo conoce nada de esto se activa. La app ya no llega ahí sin Mapa: es el caso de borde en que el
      teléfono creía el Mapa activo y el servidor no.
    * **Caminos que escribían el objetivo de 90 días** (revisados): (1) Plan → Objetivos → «Editar» / «Avance»
      (`useRocasMaestras.definir`) —bloqueado sin Mapa—; (2) el Mapa al activarse (`useMapaRenacimiento.activar`) —no se
      tocó—; ninguno más en la app. Lo que cuelga del objetivo (mes, semana, acciones, «Armar mi semana», agendar) vive
      dentro de Objetivos y queda detrás de la misma tarjeta. El acompañante SER propone «armar el plan de rocas» como
      una propuesta genérica que aplica el servidor (la app solo dibuja «Cancelar» / «Confirmar»): la regla de ahí la
      tiene que dar el backend.
    * **Pendiente de contrato con el backend**: `activar()` del Mapa escribe las tres rocas (`PUT /rocks/master`)
      ANTES de marcar la etapa (`POST /mapa-renacimiento/completar`). Si el servidor rechaza la roca porque la etapa
      todavía no está completa, activar el Mapa se rompería a sí mismo: el backend tiene que aceptar las rocas que
      llegan desde el flujo del Mapa. No se cambió el orden de esas llamadas. Tampoco se resolvió la persona que ya
      tiene objetivos sin Mapa (queda tras la tarjeta hasta que lo active; ver arriba el 409 `ROCA_MAESTRA_FIJA`, que es
      de backend #20).
    * **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se
      actualiza por aire). **Compatibilidad**: contra un backend anterior la app se comporta igual (la puerta sale del
      Mapa que ya existe, no de un campo nuevo). No cambian los cinco tabs en nada más, ni el Mapa, ni los hábitos.

  * **Cambio por pedido del dueño — 2026-10-30 — tab `Hoy`: la sección del fénix sin el vacío de arriba y de abajo**
    (textual, sobre una captura: «acá podemos optimizar esta parte, en la parte de arriba mucho espacio, podemos
    optimizar sin reducir el tamaño»). Lo que cambia y nada más:
    * **La sección mide lo que ocupa** (`styles.hero` de `HoyScreen`): tenía alto fijo (`rs(252)`, o `rs(206)` en pantalla
      baja) con el contenido centrado y 12 de relleno, y sobre ~206 de contenido quedaban entre 23 y 35 dp en blanco
      arriba y otros tantos abajo, además de los 28 de siempre entre secciones. Ahora no tiene alto, ni centrado, ni
      relleno: el aire por arriba y por abajo es el de siempre entre secciones, igual por los dos lados. Medido en el
      emulador a 411 dp (de la letra del texto a la del vecino): arriba de «Tu acompañante» de 73 a 38 dp y debajo de
      «Toca y háblame» de 65 a 30 dp (70 dp menos en total).
    * **El fénix no cambia de tamaño** en ninguna pantalla: el diámetro (140; menor en un teléfono angosto o bajo, como ya
      era) sale de la misma cuenta, ahora en `home/utils/diametroDelOrbe` y fijada contra la fórmula anterior por
      `hoyEspacioDelFenix.test.ts`. No se tocaron `OrbeAcompanante`, el `.riv`, el área de toque, la etiqueta accesible ni
      el aire entre el rótulo, el ave y el rótulo de la fase (10 o 14: el ave se dibuja 14 px fuera de su área de toque y
      ese aire le deja sitio).
    * **«Terminar» no reserva su alto** (52 px): reservarlo dejaría en blanco, en reposo, justo lo que se pidió quitar. Con
      la sección anclada arriba, el ave y su rótulo no se mueven cuando aparece «Terminar» o cambia la fase (antes,
      centrada con alto fijo, el ave subía 26 dp, la mitad de los 52 de «Terminar»); lo que crece es lo de abajo (la tarjeta
      del Mapa baja 52 dp), como ya lo hace la caja de «Tú: …» y la respuesta.
    * **Dos retoques por lo mismo**: el rótulo de la fase deja más ancho (relleno lateral de 24 a 8) para no pasar de una a
      dos líneas con letra grande a mitad de la conversación, y la caja de la conversación (`conversacionVoz`) queda a 16 de
      lo de arriba (era 12), porque ya no hay blanco propio que la separe.
    * **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). No cambian los otros tabs ni nada más
      de Hoy.

  * **Cambio por pedido del dueño — 2026-10-29 — tabs `Training` y `Yo` (y las tarjetas «Tomar foto» de `Hoy` y del chat
    de SER): KILÓMETROS DIARIOS deja elegir la captura de la galería** (issue #41; autorizado el 2026-10-29). El hábito
    dice «Sube la captura de tu app de actividad… y escribe cuántos km recorriste», pero la app solo abría la cámara:
    una captura de Strava, Google Fit o el reloj no se puede sacar con la cámara del mismo teléfono. Lo que cambia y
    nada más:
    * **Solo el registro que pide los km** (`seOfreceGaleria`: lleva `medicion`, que marca el servidor —D-226, hoy solo
      KILÓMETROS DIARIOS, `DAILY_KM`— y no una lista de claves de este lado; también desde «+ Subir foto» de Yo y desde
      el chat y el orbe de SER, que leen el registro fresco). Al tocarlo se abre `HojaDeOrigenDeLaFoto`, una
      `HojaDesdeAbajo` con dos filas de 72: **«Tomar foto»** («Con la cámara del teléfono») y **«Elegir de la galería»**
      («Para la captura de tu app de actividad»); texto de 17 y 16 px, `Presionable` y `tacto.seleccion()`. Cerrarla (✕,
      fondo, arrastre, atrás de Android) no saca ninguna foto. Después sigue la MISMA pantalla partida con «¿Cuántos km
      recorriste hoy?»; en esa pantalla, para km, el botón de la foto dice «Cambiar foto» y vuelve a abrir la hoja.
    * **La galería** reutiliza `elegirFotoDeGaleria` (el selector y el permiso de galería de siempre) y pasa por el
      mismo procesamiento que la cámara: JPEG a 1440 px de ancho y calidad 0,8. Una acción del día (`'roca'`) nunca la
      ofrece: su foto exige el EXIF de una toma de ahora (Ley VI, ±15 min).
    * **No cambia**: ningún otro hábito con evidencia obligatoria (siguen abriendo la cámara directo, decisión del
      2026-09-26), los rituales, las acciones del día, el build web (el modal de las cuatro formas ya tenía galería),
      el backend (acepta cualquier foto) ni los tabs.
    * **Hace falta un APK nuevo** (la app no se actualiza por aire).

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

  * **Cambio por pedido del dueño — 2026-10-31 — tab `Comunidad` (Muro) y Administración: ocultar y eliminar publicaciones, solo
    ADMIN y ALCHEMIST** (sin backend nuevo: `WallController` ya tenía todo, con `MODERATE_WALL`). Textual: «una función para
    Administrador y Alquimista para eliminar publicaciones, que solo les salga a estos roles». Motivo: una persona subió una
    publicación en blanco al Muro. El dueño eligió «Ocultar y eliminar». Lo que cambia y nada más:
    * **El «…» de cada publicación del Muro** (`TarjetaPublicacionMuro`, prop nueva `puedeModerar`), arriba a la derecha, junto a
      la insignia del día: área de 48 que no agranda la cabecera (márgenes negativos), nombre «Opciones de moderación» y el ícono
      `ellipsis` (Lucide, caja de 24, `s24`; nuevo en `Icon.tsx`). **Solo lo ve ADMIN o ALCHEMIST** (`usePuedeModerarElMuro`): el
      rol de la sesión Y `canAdminister` de `GET /mentor/context` (la misma condición que muestra Administración y que
      `MODERATE_WALL`); un fallo de esa consulta o un backend anterior lo dejan oculto. Ni el líder, ni el mentor, ni la guía, ni el
      aprendiz —**ni el autor de la publicación**— lo ven; y a quien no puede ni se le hace el pedido de capacidades
      (`useCapacidades({ activo })`, parámetro nuevo y opcional: sin él, el hook es el de siempre). Una publicación que todavía se
      está subiendo (`pendiente`) no lo lleva. Sin animación nueva: `Presionable`.
    * **La hoja del «…»** (`HojaDeModeracionDelMuro`, sobre `HojaDesdeAbajo`; una sola para todo el Muro): «Ocultar publicación»,
      con «Deja de verse en el Muro. Puedes devolverla desde Administración.», y «Eliminar para siempre», en rojo. Eliminar pide
      confirmación con el `Alert` de `components/Alerta` y su botón destructivo: «¿Eliminar esta publicación para siempre?
      También se borran sus comentarios, reacciones y fotos. No se puede deshacer.» (la hoja queda abierta debajo: cancelar no
      pierde dónde se estaba). Mientras trabaja, las dos filas se apagan y la que corre dice «Ocultando…» / «Eliminando…».
    * **Eliminar desde el Muro son DOS pedidos** (hallazgo al leer el servidor): `DELETE /wall/{id}/permanent` solo actúa sobre una
      publicación OCULTA —sobre una visible responde 404, igual que sobre una que no existe—, así que la app primero oculta
      (`DELETE /wall/{id}`) y después borra. Un 404 al ocultar no corta (puede que otra cuenta ya la haya ocultado); si se ocultó y el
      borrado falla, la publicación sale igual de la lista y el diálogo dice que quedó oculta y que se termina desde Administración
      → Más opciones → Publicaciones ocultas. Lo que se borra (fotos del almacenamiento, comentarios, reacciones) lo decide el
      servidor; la app no lo recalcula.
    * **Al terminar**: la publicación sale de la lista en el acto (`quitarPublicacion` de `useWallFeed`), la hoja se cierra,
      `tacto.logro()` y una `ConfirmacionEnLinea` —«Publicación oculta» / «Publicación eliminada»— que **flota arriba del Muro** (no
      va en el encabezado de la lista: quien modera suele estar a mitad del Muro y la tarjeta que tocó ya no está). El Muro se relee
      **en silencio** (`releerEnSilencio`: sin `loading`, sin volver arriba, conservando los comentarios abiertos, las que se están
      publicando y lo traído más abajo; `fusionarPrimeraPagina` decide el cursor) y la tarjeta «última evidencia» de Hoy da por
      vencida su lectura. Los dos avisos viajan por un emisor de pocas líneas (`community/events/muroModerado`).
      > **Corregido 2026-10-31 (el dueño, tras el E2E: «salió de fondo y se sobreponía a lo que había, arruinando la experiencia del
      > usuario»).** Decía que la línea «Publicación oculta / eliminada» era una `ConfirmacionEnLinea` que flotaba arriba del Muro.
      > Salía semitransparente y encima de los círculos de las secciones («Muro», «Eventos»). Ahora es **`AvisoDeAbajo`**
      > (`components/AvisoDeAbajo.tsx`), un snackbar como los de WhatsApp o Instagram: **abajo**, nunca sobre la cabecera ni los
      > círculos; fondo **opaco** (`cardBgAlt`), borde (`borderStrong`) y sombra suave; el ✓ dorado y el texto de 16 px; sin recibir
      > toques. Va **encima de los botones flotantes de SER** con la cuenta del «Deshacer» de Pasar lista (`alturaDelAviso` =
      > `ALTO_TAB_BAR + SEPARACION + DIAMETRO + 8` + borde seguro, de `renasia/components/lugarDelLanzador`): como el orbe baja con
      > la barra de pestañas cuando se esconde al desplazar, encima de él el aviso queda a la vista con la barra a la vista o
      > escondida. Movimiento: entra con fundido y 8 px en 200 ms con ease-out fuerte y sale en 150 ms; con «reducir movimiento», solo
      > fundido; se va solo a los 2,5 s; un aviso nuevo con otro a la vista reinicia la cuenta. Lo usan el Muro y «Publicaciones
      > ocultas» de Administración («Publicación devuelta al Muro»). `ConfirmacionEnLinea` no cambió. Prueba: `avisoDeAbajo`.
    * **Errores**: un 403 dice «No tienes permiso para moderar el Muro.»; un 404 saca la publicación de la lista sin error ni
      aviso; los demás, en un diálogo con el mensaje del servidor. El 503 de «Muro apagado» y el 403 de «solo lectura» de Soporte TI
      siguen su camino de siempre (`apiFetch`).
    * **Administración → Más opciones → «Publicaciones ocultas»** (`PublicacionesOcultasScreen`, vista nueva de la pila de
      `AdminScreen`; sigue la disponibilidad del Muro, `CLAVES.muro`): la cola de `GET /wall/hidden` paginada por cursor («Ver más
      publicaciones»). Cada una con su autor (foto o iniciales), la fecha («30 de octubre, 21:04» en la hora del teléfono), el texto
      recortado a dos líneas (o «Sin texto») y la miniatura de su primera foto, si tiene; y dos botones de 52: **«Devolver al
      Muro»** (`POST /wall/{id}/restore`) y **«Eliminar para siempre»** (`DELETE /wall/{id}/permanent`, con la misma confirmación).
      Cargando, vacío («No hay publicaciones ocultas.») y error con «Reintentar» (un 403 no ofrece reintentar). Devolver una
      publicación hace que aparezca en el Muro aunque ya esté abierto (el aviso de arriba). El atrás del sistema vuelve a «Más
      opciones». La fila «Categorías del muro y conocimiento» de «Desde el panel web» ya no dice «Moderación» ni que «moderar exige
      ver la publicación entera»: eso ya se hace desde la app.
    * **Esquemas tolerantes**: la cola de ocultas valida cada fila por separado (`paginaDeOcultasTolerante`): una fila rota se pierde
      ELLA y no la página; un cursor que no es texto significa «no hay más». Una publicación en blanco (sin texto ni fotos), que es
      justo lo que motivó esto, es una fila válida. Las escrituras no leen el cuerpo de la respuesta (`{ id }`).
    * **No cambian**: el diseño de la tarjeta para quien no modera, los permisos (el servidor autoriza cada llamada), el autor
      que oculta lo suyo por otro camino (no hay botón para eso), los comentarios, Hoy, Plan, Training y Yo. **No se tocó el visor
      «Ver publicación»** de las fichas del mentor, del líder y de Administración (`VisorDePublicacion`): es una hoja dentro de otra
      hoja y moderar ahí obligaría a refrescar la ficha; queda para otra vez si se pide.
    * **Pruebas**: Jest `moderacionDelMuro` (rol + servidor, el orden ocultar → borrar, los 403 y 404, la fusión de la relectura,
      la fecha local), `moderacionDelMuroApi` (rutas, verbos y una fila rota), `usePuedeModerarElMuro` (los siete roles; ni el autor),
      `moderarDesdeLaTarjeta` (el «…» solo con permiso, 48, nombre, `ellipsis`), `useModeracionDelMuro` (ocultar saca la
      publicación, eliminar pide confirmación y no manda nada antes, 403 y 404), `usePublicacionesOcultas` (la lista devuelve y
      elimina), `muroSeReleeAlModerar`, `publicacionesOcultasEnAdministracion` y `moderarElMuroEnComunidad`. Maestro, **escritos y
      sin correr**: `.maestro/moderar-muro/01` (admin: «…» → ocultar → «Publicaciones ocultas» → devolver → «…» → eliminar) y `02`
      (aprendiz: no hay «…»).
    * **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se actualiza por
      aire). Backend nuevo, ninguno.

## 2. 📱 RESPONSIVIDAD UNIVERSAL (XIAOMI, ANDROID, IOS Y TABLETS)
* **Cero Doble Scroll**: NUNCA coloques un contenedor con `maxHeight` fijo o scroll interno dentro de otro `ScrollView`. Toda pantalla debe tener UN ÚNICO contenedor de scroll fluido con `contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}`.
* **Adaptabilidad a Xiaomi y Pantallas Altas (20:9 / 19.5:9)**:
  * Utiliza márgenes dinámicos basados en `useResponsive()`:
    * Pantallas compactas (<360px): `paddingHorizontal: 14`
    * Móviles estándar y Xiaomi (360px - 440px): `paddingHorizontal: 18`
    * Tablets (≥768px): `paddingHorizontal: 32` con tarjeta centrada a `maxWidth: 560`.
* **Cero Desbordamientos**:
  * Utiliza `width: '100%'`, `flexShrink: 1` y `flexWrap: 'wrap'` en filas y tarjetas para evitar que botones o textos sobresalgan de la pantalla.
* **Manejo de Teclado**: Envuelve siempre los formularios con `keyboardShouldPersistTaps="handled"`.

---

## 3. ✍️ MANEJO DE GESTOS TÁCTILES Y FIRMA DIGITAL
* **Prevención de Cancelación Táctil en Android / Xiaomi**:
  * Al implementar lienzos o componentes táctiles (ej. `SignatureCanvas` con `PanResponder` o `react-native-svg`), SIEMPRE declara:
    * `onStartShouldSetPanResponderCapture: () => true`
    * `onPanResponderTerminationRequest: () => false`
    * `onShouldBlockNativeResponder: () => true`
  * Esto impide que el `ScrollView` nativo de Android intercepte y borre los trazos del dedo.
* **Persistencia Incondicional**: Las firmas y respuestas de formularios deben guardarse en el estado raíz o contexto (`OnboardingFlow` / `AuthContext`) para que NO se pierdan al retroceder, avanzar o abrir el teclado.
* **Modo Dual**: Proveer modo de trazado con el dedo (dibujo vectorial) y modo de firma electrónica estilizada (nombre caligráfico).
* **Parche Seguro de JSON**: Utilizar `safeParsePaths` al deserializar datos de firma para evitar excepciones `JSON.parse`.

---

## 4. 👁️ TIPOGRAFÍA, CONTRASTE Y ACCESIBILIDAD (UX/IA)
* **Grosor y Claridad**: Prohibido usar fuentes ultrafinas (`300Light` o `200ExtraLight`) para lectura prolongada. Usar siempre **`Jost_400Regular`**, **`Jost_500Medium`** y **`Jost_700Bold`**.
  > **Corregido 2026-10-31 (pedido del dueño).** La fuente de la app es **Inter**, no Jost: usa siempre los roles de `src/theme/fuentes.ts`
  > (`fuentes.regular`, `.media`, `.seminegrita`, `.negrita`), nunca un nombre de archivo. Las pesas ultrafinas siguen prohibidas (ni se cargan).
* **Serif editorial, SOLO en display** *(agregado 2026-09-14)*: **`Fraunces_600SemiBold`** y **`Fraunces_700Bold`** se usan únicamente en los tokens `t.hero` y `t.screenTitle` (≥ 24 px). **Nada que se lea en párrafo la toca**: texto corrido, inputs, cláusulas y etiquetas siguen en Jost, que es lo que esta regla protege. Entró porque la jerarquía estaba construida sobre `letterSpacing` (el `hero` llegaba a 8) en vez de sobre familia y peso, y eso hacía que cada pantalla se leyera como plantilla. Si alguna vez se quiere volver atrás, es un valor en `theme/tokens.ts` y dos imports en `App.tsx`.
  > **Corregido 2026-10-31 (pedido del dueño).** Ya no hay serif: el display también es Inter (`fuentes.display`, hoy la Bold, porque el paquete no trae el corte Display); la regla de que **nada que se lea en párrafo usa el display** sigue. Fraunces se fue del proyecto.
* **La fuente es una regla global, en un solo archivo** *(agregado 2026-10-31, pedido del dueño: «como un CSS global»)*: el nombre de la fuente se escribe **solo** en `src/theme/fuentes.ts`, que exporta **roles** (`fuentes.regular`, `.media`, `.seminegrita`, `.negrita`, `.display`). Ningún otro archivo de `src/` (ni `App.tsx`) escribe `Inter_…`, `Jost_…` ni `Fraunces_…`, ni un `fontFamily` con un texto: pide el rol o usa los tokens `t.*`. `theme/__tests__/fuenteUnica.test.ts` lo vigila. Cambiar la fuente de toda la app es tocar ese archivo.
* **El espaciado de letras no es jerarquía** *(agregado 2026-09-14)*: un titular grande lleva tracking **negativo** (junta, pesa); sólo los rótulos chicos en versales (`micro`, `sectionTitle`) llevan tracking positivo, y por debajo de 1.5. Estirar un texto para que parezca importante es el gesto que hay que evitar.
  > **Corregido 2026-10-05 (decisión del dueño).** Un rótulo en **tipo oración** no lleva espaciado: `MicroLabel` (el rótulo de sección de toda la app) pasó a 13 px, `Jost_700Bold` y `letterSpacing: 0`; con el 1,1 de `t.micro` se leía «H á b i t o s». El tracking positivo queda solo para lo que todavía va en versales.
* **Cifras que cambian, tabulares**: todo número que se actualiza en pantalla (día de programa, puntos, racha) va con `fontVariant: ['tabular-nums']` — ya está en el token `t.metric`. Sin eso, pasar de 9 a 10 corre de lugar todo lo que tenga al lado.
* **Tamaño Mínimo de Lectura**:
  * Textos de párrafo / cláusulas / inputs: **14px a 15.5px**.
  * Etiquetas de ayuda / subtítulos: **12px a 13.5px**.
  * Badges: **10px a 11.5px (Medium/Bold)**.
  * Rótulos de sección (`MicroLabel`): **13px, Bold, sin espaciar**.
    > **Corregido 2026-10-05.** Decía «Badges / MicroLabels: 10px a 11.5px (Medium/Bold)». `MicroLabel` se leía chico y estirado en tipo oración; el dueño pidió quitarle el espaciado en toda la app, y con 13 px en negrita queda como «Coherencia» y «Racha» de Hoy.
* **Alto Contraste de Color**:
  * Modo Oscuro: Texto principal `#FFFFFF` / `#F6F4EE`, secundario `#C5BEB3`.
  * Modo Claro: Texto principal `#1E1B18`, secundario `#4A453D`.
* **Touch Targets Cómodos**: Botones y casillas de checkbox con altura mínima de **48px - 52px** para pulsación cómoda con una sola mano.

---

## 5. 🔒 VALIDACIÓN ESTRICTA Y EXPERIENCIA DE USUARIO
* **Validación Antes de Avanzar**: Validar campos requeridos por cada paso o capítulo antes de cambiar de pantalla.
* **Feedback Visual y Alertas Amigables**: Mostrar con precisión qué campo falta por completar mediante alertas claras (`Alert.alert`) y bordes de estado de error (`#E06A66`).
* **Seguridad TypeScript**: Todo código nuevo debe compilar con 0 errores mediante `npx tsc --noEmit`.

---

## 6. 📱 NAVEGACIÓN UNIVERSAL POR GESTOS DEL SISTEMA (EDGE SWIPE & BACKHANDLER)
* **Soporte Obligatorio para Pantallas Táctiles y Gestos (Xiaomi / Android / iOS)**:
  * En dispositivos modernos con navegación por gestos en pantalla (deslizar desde el borde lateral para volver atrás sin botones físicos), toda subpantalla, modal o flujo multinivel DEBE implementar `useSystemBackHandler`:
    * Si hay un **modal abierto** (ej. Subir Evidencia, Agregar Hábito): el gesto lateral debe cerrar el modal.
    * Si está en el **detalle de una categoría/dimensión**: el gesto lateral debe regresar al menú principal.
    * Si está en un **formulario por pasos / onboarding**: el gesto lateral debe retroceder al paso anterior.
  * **Prohibido**: Permitir que el gesto lateral del sistema cierre o minimice la aplicación cuando el usuario se encuentre en una vista hija o modal.
