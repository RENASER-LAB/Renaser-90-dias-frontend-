# Código Renaser (días 1–7) y Mi Radar (desde el día 8)

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

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

## Cambio por pedido del dueño — 2026-10-29 — tab `Yo` (y las fichas del mentor, del líder y de Administración): Mi Radar desde el día 8

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

## Cambio por pedido del dueño — 2026-10-30 — tab `Yo` (Mi Radar) y `Hoy`: Mi Radar automático y personalizado (spec 019)

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
    > **Corregido 2026-11-02 (spec 036, D-309).** Ya no se elige el Día 1: el motivo dice «Mi Radar empieza en tu día 8. **Primero empieza tu programa.**», la fila de Yo
    > «**Primero empieza tu programa**» y el botón es «**Empezar mañana**», que abre «Tu programa empieza mañana». El 403 `PROGRAMA_NO_ACTIVADO`, "Cargando…" y el resto de lo de abajo no cambian.
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

## Cambio por pedido del dueño — 2026-10-31 — Código Renaser con la voz: dictar la respuesta y escuchar la pregunta (spec 030)

Pedido del dueño (textual): «El sistema debe poder ofrecer el servicio de audios al responder el radar.» Spec, plan y tareas en
`Renaser-90-dias-backend/specs/030-codigo-renaser-con-audio/`; decisiones del dueño del mismo día: **030-1 A** (dictar la respuesta y
escuchar la pregunta con la voz Dora, grabada y sin red; la energía se toca, no se dicta) y **030-2 B** (el registro dice «dictado» y
lo ven el mentor, el líder y Administración). Toca el formulario del Código Renaser, que vive en **Hoy** (pantalla obligatoria de los
días 1 a 7 y mitad del Radar) y en **Yo → Mi Radar**. Lo que cambia y nada más:
* **Un micrófono y un «Escuchar» por pregunta** (`radar/components/VozDeLaPregunta`, `BotonDeVoz`; 48 de alto, ícono y palabra, sin
  movimiento propio salvo el hundimiento de `Presionable`, un «tic» de `tacto.seleccion()` por toque). Es el mismo formulario
  (`CodigoRenaserModal`) en las cuatro entradas —la pantalla obligatoria, Hoy, Mi Radar y el aviso del teléfono—, así que se ve y funciona
  igual en todas. Las cuatro preguntas, las horas, la obligatoriedad, el borrador, un registro por hora y el 409 **no cambian**.
  > **Corregido 2026-11-03 (pedido del dueño).** «Escuchar» y «Dictar» ya no son botones de 48 con ícono y palabra en su propia fila: son dos **íconos sutiles en el renglón
  > del enunciado** (`BotonDeVoz` de solo ícono, 44 de área táctil), el enunciado perdió su línea de ayuda y el micrófono activo es dorado y respira. Ver la entrada del 2026-11-03.
* **Dictar** reutiliza `useDictado` (el reconocimiento de voz del teléfono, el mismo del chat de SER; español `es-419`; el audio no se
  guarda ni se sube). Lo dictado se **suma** al final del campo, se ve mientras se habla, queda **editable** y se corta en los 2 000
  caracteres de siempre. **Nada se registra solo:** solo «Registrar»; con el micrófono abierto ese botón dice «Terminar de dictar» y
  cierra el micrófono. **Un solo micrófono a la vez**: tocar el de otra pregunta cierra el primero, espera a que entregue su texto y recién
  entonces abre el segundo (`useDictadoDelRadar`). Sin reconocimiento de voz en el teléfono no hay «Dictar» y el formulario es el de hoy.
  Si falla (sin permiso, sin red, sin motor en español, ocupado) una línea bajo esa pregunta lo dice —«… escribe tu respuesta»— y lo
  escrito y lo dictado antes no se tocan.
* **Escuchar** (los MP3 de la spec 030 dicen el enunciado de entonces y su ayuda; ver el 2026-11-03) lee el enunciado y su ayuda con la voz Dora de las alarmas, **cuatro MP3 grabados** (`assets/sonidos/voz_radar_que_*.mp3`,
  generados con `scripts/sonidos/generar-sonidos.sh voces`, que ahora también lee `radar/vocesDelRadar.json`; sin campanita; Whisper los
  entendió sin errores), desde el paquete de la app, **sin red**. Una voz a la vez; se detiene al terminar, al tocar de nuevo, **antes** de
  abrir el micrófono, al registrar y al cerrar el formulario. El reproductor (`expo-audio`) nace al primer toque. **Límite aceptado:** el
  teléfono no le cuenta su volumen a la app (haría falta código nativo nuevo), así que mientras suena una línea dice «Si no la oyes, sube
  el volumen de tu teléfono.» en vez de detectar el volumen en cero.
* **«Dictado»** (030-2 B): el pedido de `POST /api/v1/radar` suma `dictado: true` **solo si** alguna respuesta se dictó y sigue en el texto
  (un campo que la persona vacía deja de contar; corregir una palabra no); una respuesta escrita viaja idéntica a la de siempre. El
  borrador local guarda qué respuestas se dictaron. En las fichas del mentor o guía, del líder, de Administración y de Alquimista
  (`CodigoRenaserDelAlumno`), cada registro dictado dice «Dictado por voz. Puede haber errores de transcripción.» (solo texto, como el
  resto de la sección). Viaja en las mismas filas que ya leen, así que si el interruptor de la spec 034 oculta el Código Renaser, tampoco
  se ve «dictado».
* **Arreglo en lo compartido:** `useDictado` ahora atiende **solo su propia sesión** de micrófono. El reconocedor manda sus eventos a todos
  los que escuchan; sin este seguro, dictar el Código Renaser habría puesto al orbe de Hoy «escuchando» y habría mostrado «Tú: <lo que
  dictaste>» bajo el fénix. El chat de SER y el orbe se comportan igual que antes (`useDictado.test.ts`).
* **Política de privacidad** (`public/privacidad/index.html`): dice que el Código Renaser también se puede dictar con el reconocimiento de
  voz del teléfono y que el audio no se guarda. **Debe publicarse antes de sacar el APK.**
* **No cambian**: Plan, Training, Comunidad, los demás tabs, el semáforo, los puntos, Mi Radar (horas, modos, veces), los avisos y sus
  canales, ni quién ve el Código Renaser.
* **Hace falta el backend con V132 (D-297) antes y un APK nuevo** (los cuatro MP3 van dentro del APK; la app no se actualiza por aire).
  Contra un backend anterior la app funciona igual (el servidor ignora `dictado`) y las fichas no muestran la línea.
* **Pruebas:** `useDictado.test.ts`, `useDictadoDelRadar.test.ts`, `useEscucharPregunta.test.ts`, `dictadoDelRadar.test.ts`,
  `vozDelRadar.test.ts`, `codigoRenaserConVoz.test.ts`, `dictadoEnElContrato.test.ts`, `codigoRenaserDelAlumno.test.ts` y
  `sonidosElegibles.test.ts`. Maestro: `.maestro/codigo-renaser/41-dictar-y-escuchar.yaml` (escrito, **no corrido**: este trabajo no usó el
  emulador).

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

## Cambio por pedido del dueño — 2026-11-03 — Código Renaser compacto: sin párrafos, con los íconos de voz en el renglón y el borrador al escribir

> **Corregido el mismo día (opción C del dueño).** «Escuchar» se quitó y el 🎤 pasó DENTRO del campo; el campo crece, la energía son chips y el pie del obligatorio se quitó. Ver la entrada «Código Renaser, opción C», justo debajo. Lo de los íconos en el renglón del enunciado, las voces pregrabadas y la `SliderRating` de esta entrada ya no rige.

Textual, con capturas: «Allí en el código Renaser hay mucho texto y se extendió demasiado. En qué hago es: ¿Dónde estoy y qué estoy haciendo ahora? / ¿Qué
estoy pensando? / ¿Qué estoy sintiendo? / ¿Qué estoy evitando? / ¿Cuál es mi nivel de energía? Y esos botones de escuchar, dictar deben de aparecer allí de manera
sutil» y «el de dictar o el ícono de audio dentro del label, y que se guarde gradualmente». Es el mismo formulario (`CodigoRenaserModal`) de las cuatro entradas
—la pantalla obligatoria de los días 1 a 7, Hoy, Mi Radar y el aviso—. Solo JavaScript y solo la forma; lo que se envía no cambia. Lo que cambia y nada más:
* **Cabecera:** solo «Código Renaser · 11:00» (con «· Innegociable» cuando no se puede cerrar, como antes) y la ✕ si se puede cerrar (ahora con 44 de área
  táctil). **Se quitaron** el título grande «¿Dónde estás ahora mismo?» y el párrafo «Responde con lo que hay… Este registro es el de las… y se cierra a las…».
* **Las cinco preguntas, sin línea de ayuda debajo** (`PREGUNTAS_RADAR` ya no tiene `ayuda`; `PreguntaDelRadar`): «¿Dónde estoy y qué estoy haciendo ahora?»,
  «¿Qué estoy pensando?», «¿Qué estoy sintiendo?», «¿Qué estoy evitando?» y «¿Cuál es mi nivel de energía?» (`PREGUNTA_ENERGIA`, la misma `SliderRating` del 1 al 10 con
  la prop nueva `variante="pregunta"`: el rótulo es un enunciado más, 16 semibold, y el valor va a su altura; los demás usos de `SliderRating` no cambian). Enunciado a 16,
  campo de mínimo 56 (era 76) y menos aire entre preguntas (14). Los marcadores en gris dentro del campo («Estoy…», «Estoy pensando en…», «Siento…», «Estoy evitando…») siguen.
  `faltantesDelRadar` usa los enunciados nuevos («Falta: ¿Qué estoy evitando?» / «Faltan 2: ¿Qué estoy sintiendo?, nivel de energía.»; sin punto detrás de un «?»).
* **Escuchar y Dictar son dos íconos, en el renglón del enunciado, a la derecha** (`VozDeLaPregunta` + `BotonDeVoz`, ya sin texto): el parlante (`volume`) y el micrófono
  (`mic`), de 20, en el gris secundario, sin fondo ni borde en reposo y con 44 × 44 de área táctil. El par se acuesta con márgenes negativos (−11 arriba y abajo) para no
  agrandar el renglón y, si el enunciado ocupa dos líneas, queda arriba a la derecha a la altura de la primera (el enunciado cede ancho: `flexShrink`). Los nombres accesibles
  son los de siempre («Escuchar la pregunta …», «Detener la lectura de la pregunta …», «Dictar la respuesta a …», «Parar de dictar la respuesta a …»), con el enunciado nuevo.
  **Activo se nota sin depender solo del color:** un círculo de 36 con lavado dorado y borde fino (`goldInk`), el ícono dorado, `accessibilityState.selected`, y el parlante
  pasa a `pause`. **El micrófono abierto respira** (opacidad del círculo 1 ↔ 0,45, 650 ms cada mitad, `Easing.inOut`, solo `opacity` en el hilo de la interfaz); con «reducir
  movimiento» queda solo el color. Las líneas «Te escucho. Toca el micrófono para parar.» (antes aludía al botón «Parar», que ya no tiene texto) y «Si no la oyes, sube el volumen
  de tu teléfono.» y el aviso de si el micrófono falla **solo existen mientras pasa**; en reposo no hay nada. La energía no se dicta ni se escucha. El micrófono ya no es rojo: es dorado.
* **El borrador se guarda al escribir** (`hooks/useBorradorDelRadar`, sobre `storage/borradorRadar`, que ya existía): las cuatro respuestas, qué respuestas se dictaron y la energía
  se escriben en el teléfono **400 ms después de la última tecla** (era 1 s; una sola escritura al terminar de teclear), con la clave `renaser.radar.borrador.<cuenta>|<AAAA-MM-DD>|<HH>`
  —por cuenta y por hora—. Reaparece tal cual al cerrar y reabrir el formulario o la app **en la misma hora**; el de otra hora no se lee y se barre; el de otra cuenta tampoco. Detalles
  que se arreglaron: (1) **no se escribe hasta terminar de leer** el borrador al abrir (un formulario en blanco no puede pisarlo) y lo que la persona ya escribió manda sobre un borrador
  que llegue tarde; (2) **al cerrar el formulario o desmontarse, lo que esperaba su turno se escribe en el acto** (antes los últimos segundos de teclado se perdían); (3) lo que ya
  está en el teléfono no se vuelve a escribir; (4) **registrar con éxito lo borra** y el cierre del formulario no lo vuelve a escribir (`descartar`). **«Cerrar sesión» borra todos
  los borradores del Código Renaser** (`borrarTodosLosBorradores`, desde `AuthContext.logout`); la sesión que vence sola, no (ahí el borrador existe para que la persona vuelva a
  entrar y lo encuentre). Una línea chica «Guardado» (check de 16 + 12 px, `IndicadorDeGuardado`, en la cabecera) aparece 150 ms, se queda 1,4 s y se apaga cada vez que un borrador con
  algo quedó escrito; no mueve nada de lugar, no recibe toques y el lector de pantalla la ignora.
* **Las voces pregrabadas dicen el texto de antes.** `vocesDelRadar.json` ya trae el enunciado nuevo (solo el enunciado, sin ayuda) para cuando se regeneren, pero **los cuatro MP3 de
  `assets/sonidos/voz_radar_*.mp3` siguen diciendo «¿Qué hago? Lo que estás haciendo en este momento, sin adornos.» y sus tres hermanas** (no se generaron audios nuevos: no se pidió).
  Para ponerlos al día: `scripts/sonidos/generar-sonidos.sh voces`, y un APK nuevo. Ojo: `vozDelRadar.test.ts` exige entre 2 y 5 segundos por archivo; los enunciados nuevos son más
  cortos y esa cota baja puede necesitar un ajuste al regenerar.
* **No cambian**: `POST /api/v1/radar` (los mismos cinco campos y `dictado` solo si es cierto), el 409, las reglas de obligatorio de los días 1 a 7 y de Mi Radar, la validación,
  los horarios, el pie («Completa las preguntas cada hora…» / «Puedes cerrarlo…»), el botón fijo «Registrar» / «Terminar de dictar», la hoja «Ya lo registraste» de Hoy (que lee
  los mismos enunciados, ahora los nuevos), ni los demás tabs.
* **Pruebas:** `codigoRenaserCompacto.test.ts` (sin título, párrafo ni ayuda; los cinco enunciados; los íconos en el renglón con sus nombres accesibles, 20 de ícono y 44 de área;
  activo), `borradorDelCodigoRenaser.test.ts` (400 ms, una sola escritura, la energía, cerrar sin perder nada, reabrir en la misma hora, otra hora, otra cuenta, lectura tardía,
  registrar borra, cerrar sesión), `useBorradorDelRadar` por esas mismas pruebas, y ajustadas `codigoRenaserConVoz`, `codigoRenaserModal`, `faltantesDelRadar`, `vozDelRadar`,
  `tarjetaHabitoYRadar` y `alarmasDeLaCuentaAlSalir`. Sin emulador en esta corrida: el aspecto y el pulso del micrófono se confirman en pantalla.
  Maestro (escritos, **no corridos**): los flujos que reconocían el formulario por su título «¿Dónde estás ahora mismo?» ahora lo reconocen por el ícono «Escuchar la pregunta ¿Dónde estoy y qué
  estoy haciendo ahora?» (el enunciado solo también está en la hoja «Ya lo registraste»), `41-dictar-y-escuchar` usa los enunciados nuevos y `llenar-formulario-radar` busca «¿Cuál es mi nivel de energía?».

## Cambio por pedido del dueño — 2026-11-03 — Código Renaser, opción C: sin «Escuchar», con «Dictar» dentro del campo, campo que crece y energía en chips

Pedido del dueño, después de comparar una maqueta (https://claude.ai/artifact/FrrSUh8mqxFLMDgjvksCDp, artboard «C · Dictar dentro del campo»): quita «Escuchar» («con solo leer ya basta»),
el micrófono va dentro del campo «como en un buscador», más espacio para escribir («capaz escriben bastante»), la energía en chips y fuera el texto del pie. **Corrige la entrada de arriba
(«Código Renaser compacto»)**: donde ella dice que Escuchar y Dictar son dos íconos en el renglón del enunciado, que las voces pregrabadas dicen el texto de antes, que la energía es
una `SliderRating` o que el pie del formulario obligatorio dice «Completa las preguntas cada hora…», léase lo de abajo. Es el mismo formulario (`CodigoRenaserModal`) de las cuatro
entradas. Solo JavaScript y solo la forma; lo que se envía no cambia. Lo que cambia y nada más:
* **Se quitó «Escuchar» en todas las preguntas, y todo lo que solo servía para eso:** `VozDeLaPregunta`, el hook `useEscucharPregunta`, `config/vozDelRadar.ts`, `vocesDelRadar.json`, los cuatro
  `assets/sonidos/voz_radar_que_*.mp3` (los dos que se habían regenerado el mismo día) y sus cuatro entradas en `sounds` de `app.json` (**por eso `app.json` cambió: hace falta un APK nuevo**),
  la parte del radar de `scripts/sonidos/tabla_de_voces.py` y `generar_voces.py` (`archivos_del_radar`, `sin_campanita`) y sus pruebas (`useEscucharPregunta`, `vozDelRadar`; `sonidosElegibles`
  ya no nombra las voces del radar). Se verificó con `grep` que nada más los usaba. Ya no existe la línea «Si no la oyes, sube el volumen de tu teléfono.», ni el parlante, ni la pausa.
* **La pregunta queda sola en su renglón, y el 🎤 «Dictar» va DENTRO del campo** (`PreguntaDelRadar` + `BotonDeDictar`, que reemplaza a `BotonDeVoz`), a la derecha y **anclado abajo**
  (`position: absolute`, `right: 4`, `bottom: 4`) para no moverse cuando el campo crece: área de 44, ícono de 20, gris en reposo. **Activo** (dictando): círculo dorado suave de 36 (lavado
  dorado y borde fino `goldInk`) con el ícono dorado y el pulso de opacidad de antes (1 ↔ 0,45, 650 ms cada mitad); con «reducir movimiento», solo el color. Además la caja toma el borde
  dorado. Sin reconocimiento de voz en el teléfono no hay micrófono y el texto usa el margen normal. Los nombres accesibles son los de siempre («Dictar la respuesta a …» / «Parar de
  dictar la respuesta a …»). La línea «Te escucho. Toca el micrófono para parar.» ya no existe: queda el «Te escucho…» gris dentro del campo vacío, el micrófono activo y el botón de
  abajo, que dice «Terminar de dictar». El aviso rojo si el micrófono falla sigue, bajo la pregunta.
* **El campo es multilínea y crece solo** (16 / 22): arranca en ~2 líneas (`ALTO_MINIMO_DEL_CAMPO` = 72, era 56) y crece con el texto hasta 5 líneas (`ALTO_MAXIMO_DEL_CAMPO` = 130); de ahí en
  adelante se desplaza por dentro, sin que la pantalla gane un segundo scroll. La caja (`View` con borde, fondo y radio 12) lleva el borde; el `TextInput` de adentro no. El texto deja 52 de
  margen a la derecha (`MARGEN_DEL_TEXTO_ANTE_EL_MICROFONO`) para no pasar por debajo del micrófono.
* **Lo dictado se escribe EN el campo mientras se habla.** Ya era así (el reconocedor da resultados parciales y el campo muestra `textoMientrasDicta(escrito, parcial)` en la misma caja; el texto
  queda en el campo, editable, al cerrar el micrófono); no hubo que cambiar de dónde sale. Lo que se sumó: el campo crece con eso y **el cursor queda al final** (`selection` controlado desde que
  se abre el micrófono hasta que la persona toca el campo; con ese `selection` un campo ya lleno se desplaza para mostrar lo último dictado). Mientras se dicta el campo no se puede teclear
  (`editable={false}`). **Límite sin comprobar:** que Android desplace de verdad un campo no editable hasta el cursor, pasadas las 5 líneas, se confirma en el teléfono (este trabajo no usó el emulador).
* **Energía en chips del 1 al 10** (`EnergiaEnChips`, en lugar de `SliderRating` en este formulario; `SliderRating` vuelve a ser el de siempre y sigue en el onboarding): diez chips en fila,
  44 de alto, borde fino y radio 10; el elegido en dorado suave (lavado dorado, borde dorado, número en negrita); debajo, «En reserva» y «A tope» a 13, sin números. Sin elegir, ningún chip
  está marcado (`null` no es un número). Cada chip no lleva etiqueta propia (se oye «5, seleccionado») y el grupo se llama como la pregunta. Con diez chips en 324 dp cada uno mide ~29 de
  ancho (la maqueta lo dibuja igual); `hitSlop` suma 1 por lado.
* **Sin el texto del pie en el formulario obligatorio:** se quitó «Completa las preguntas cada hora. Durante los primeros 7 días.», y «Registrar» queda fijo abajo, solo. Los formularios que
  se pueden cerrar siguen con su línea («Puedes cerrarlo; vuelve a ofrecerse la hora que viene.» y, en Mi Radar y en Hoy, «Puedes cerrarlo; tu borrador queda guardado en este teléfono.»):
  el pedido nombró solo la del obligatorio; quitar también esas es borrar `textoDelPie` y la constante `TEXTO_DEL_PIE_DE_MI_RADAR`.
* **No cambian**: el borrador (400 ms, por cuenta y por hora, «Guardado»), `POST /api/v1/radar` ni `dictado: true`, las preguntas, `faltantesDelRadar`, el 409, la obligatoriedad, la cabecera, ni la
  hoja «Ya lo registraste».
* **Maestro (escritos, no corridos):** el formulario se reconoce ahora por el gris «Estoy…» del primer campo (antes por el ícono «Escuchar…», que ya no existe); `41-dictar-y-escuchar` quedó con el
  micrófono dentro del campo y sin los pasos de Escuchar. `llenar-formulario-radar.yaml` sigue valiendo (toca «5» y busca «¿Cuál es mi nivel de energía?»).
* **Pruebas:** `codigoRenaserCompacto.test.ts` (reescrita: sin Escuchar ni pie, el micrófono dentro de la caja y anclado abajo a la derecha, el margen del texto, el campo multilínea 72–130, lo dictado
  entrando en el campo, el cursor al final, los diez chips, «En reserva / A tope» a 13), `codigoRenaserConVoz.test.ts` (el micrófono), `borradorDelCodigoRenaser.test.ts` y `codigoRenaserModal.test.ts` (ajustadas).
  Se borraron `useEscucharPregunta.test.ts` y `vozDelRadar.test.ts`.
* **Hace falta un APK nuevo** (`app.json` cambió: ya no lista los cuatro MP3 de las preguntas). Sin backend nuevo.
