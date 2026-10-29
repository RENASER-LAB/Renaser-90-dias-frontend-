# Plan (objetivos y Mapa de Renacimiento) — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

## Cambio por pedido del dueño — 2026-10-05 — tab `Plan`: sin la vista muerta de hábitos, selector de eje, las cuatro fases, íconos por eje y hojas desde abajo

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
  * **«Arquitectura de tiempo»** dibuja las cuatro fases del programa con su largo (1–7, 8–34, 35–64, 65–90) y
    su nombre, y marca la que dice el backend; antes eran tres tramos de 30 días que contradecían la «Fase
    actual» de arriba. Los días salen de `FASES_EN_ORDEN` (`home/hooks/useResumenHome`, que ahora trae
    `primerDia`/`ultimoDia` y arma el rótulo con ellos), vía `objetivos/utils/arquitecturaDeTiempo`.
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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, las acciones bajan al día.

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tabs `Hoy` y `Plan`.

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, la cifra del mes se toca para corregirla.

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, tarjeta del mes.

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

## Corrección encontrada en el E2E del Mapa del Poder por rol — 2026-10-10 (backend E-592).

* **Corrección encontrada en el E2E del Mapa del Poder por rol — 2026-10-10 (backend E-592).**
  Al abrir el mapa activo desde otro navegador, el cierre decía «0 acciones semanales» y «0 reemplazos»
  aunque el servidor hubiera guardado tres y uno. `useMapaRenacimiento` recupera los conteos del mismo
  `GET /mapa-renacimiento`; `CierreScreen` los usa cuando no hay listas locales. También corrige un cierre
  vacío guardado por la versión anterior. No reconstruir un borrador vacío ni mandarlo al servidor.
  `mapaEnOtroDispositivo.test.ts` cubre ambos casos; `e2e/mapa-poder/` pasó los cinco roles con login, Día 1,
  diez pasos y otro navegador. Sin permisos ni endpoints nuevos. **Hace falta una versión nueva de la app.**

## Cambio por pedido del dueño — 2026-10-27 — tab `Plan`: los objetivos esperan al Mapa de Renacimiento (issue #37)

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
