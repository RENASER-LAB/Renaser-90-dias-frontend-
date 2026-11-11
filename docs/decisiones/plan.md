# Plan: objetivos, semana, mes, 80/20, Cierra tu día y el Mapa (retirado)

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, las acciones bajan al día

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tabs `Hoy` y `Plan`

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, la cifra del mes se toca para corregirla

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Plan`, tarjeta del mes

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

## Corrección encontrada en el E2E del Mapa del Poder por rol — 2026-10-10 (backend E-592)

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

## Cambio por pedido del dueño — 2026-10-29 — tab `Training` (y las fichas del mentor, del líder y de Administración): Cierra tu día (spec 017)

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
  > **Corregido 2026-11-03.** Las opciones de «¿Qué pasó?» y «¿Qué harás mañana?» ya no son chips de texto largo: llevan un ícono y un texto corto («Tiempo», «Otra hora»). Los códigos
  > al servidor no cambian. Ver «Cierra tu día con chips de ícono».
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

## Cambio por pedido del dueño — 2026-10-31 — Plan → «Tu 80/20»: tus cifras y el análisis de SER por semana y por mes (spec 031)

Textual del pedido: un análisis 80/20 con IA de lo que la persona hizo. Spec, decisiones y contrato en
`Renaser-90-dias-backend/specs/031-analisis-80-20-con-ia/` (D-306, V153 y V154). Decisiones del dueño del mismo día: **031-1 A y B** (el 20 % son las
acciones verdes **y también** el 20 % de las cumplidas con más impacto), **031-2 A** (lo ve quien ve su Código Renaser, respetando el interruptor de la
spec 034), **031-3 A** (patrones y cifras; nunca cita frases ni nombra emociones o cuadros), **031-4 B** («Cierra tu día» entra al análisis), **031-5 A**
(NO se une con el Espejo de la Sombra), **031-6 A** (el mes es el del programa: semanas 1–4, 5–8, 9–13), **031-7 A** (solo se genera solo, al cerrar el
periodo; no se pide antes), **031-8 B** (sigue después del día 90 mientras use la app: la app no corta nada por un 90 fijo) y **031-9 A** (la persona no
borra análisis sueltos; se borran con la cuenta). Lo que cambia y nada más:
* **La hoja «Tu 80/20» de Plan** (`HojaOchentaVeinte`, la que abre el botón «Tu 80/20» de `PlanDelEje`): suma un `ControlSegmentado` **Hoy · Semana · Mes**.
  «Hoy» es la hoja de siempre, sin tocar (la regla de Pareto, los candados y las acciones de hoy del eje). «Semana» y «Mes» (`PeriodoDelOchentaVeinte`)
  muestran, de **todos los ejes**: arriba el periodo con flechas ‹ › («Semana 10 · Del 26 de octubre al 1 de noviembre»), «9 de 12 acciones cumplidas · 75 %»
  con su barra, las dos reglas del 20 % («Acciones verdes: 3 de 5 cumplidas · el 55 % del impacto…» y «El 20 % que más movió: 2 acciones…»), los ejes, la
  semana a semana (en el mes) y la línea del Código Renaser (solo cuenta: «12 respuestas · energía promedio 6.4»). **Cuando el periodo cierra y el análisis
  está listo**: las cuatro partes en este orden y con estos títulos, «Lo que más movió», «Lo que se te fue», «Cómo estuviste» y «Para la próxima semana» /
  «Para el próximo mes» (de 1 a 3 pasos), y «Análisis de SER · 2 de noviembre. No cambia tu plan: lo que sugiere lo decides tú.» Sin texto de la IA, las
  listas de lo que movió y de lo que se fue se dicen en cifras (sin frases). Un periodo sin acciones **no dibuja un tablero de ceros**: «Todavía no
  planificaste acciones en este periodo…» con **«Agendar mis acciones»**, que cierra la hoja y abre el planificador.
* **Por qué todavía no hay análisis, sin culpa** (`avisoDelEstado`): en curso («Tu análisis llega cuando cierre la semana»), pendiente («estará listo en cuanto
  podamos generarlo»), sin datos («Con al menos 5 acciones planificadas analizamos la semana», «Reparte tus acciones en más días…»; el mínimo lo manda el
  servidor, `minimoDeAcciones`) y sin análisis («No pudimos generar el análisis… Tus cifras de arriba siguen siendo las tuyas»). Nunca se inventa uno: un
  «LISTO» sin texto legible se lee como pendiente, y el texto solo se conserva con el estado LISTO.
* **Solo si el servidor ofrece las vistas**: la hoja lee la semana en curso al abrirse (la misma lectura que la vista «Semana» reusa) y dibuja el control
  únicamente con un 200. **Contra un backend anterior** (404) la hoja es exactamente la de siempre. Cerrada no pide nada. Cada periodo se lee una sola vez
  mientras la hoja está abierta (`useOchentaVeinte`, un almacén por función `cargar` estable, como `useCierresDeLaSemana`) y **ninguna lectura llama a la IA**
  (el servidor lo hace en su barrido horario). Un 403 o un 404 no dibujan nada; los demás fallos se dicen con «Reintentar» de 48.
* **Soporte TI**: el texto del análisis tiene su propio interruptor, `ia.analisis` (hijo de `ia`, nuevo en el catálogo). Con él apagado las cifras se ven
  igual y el texto se cambia por el aviso de mantenimiento; con él no disponible para el rol no se dibuja nada del análisis (`CLAVES.iaAnalisis`).
* **El aviso «Tu análisis de la semana/del mes está listo»** (tipo `ANALISIS_80_20`, texto fijo «Entra a Plan y míralo.»: **el aviso nunca lleva el
  análisis**): su ruta es `/plan/80-20?periodo=SEMANA|MES&inicio=AAAA-MM-DD`. Tocarlo abre Plan con la hoja «Tu 80/20» directo en esa vista, sin
  parpadear en «Hoy», y espera —como los avisos de hábitos y de la Caja— a que se cierre una capa obligatoria (`abrirOchentaVeinte`, que `PlanScreen`
  consume una sola vez). **Yo → Notificaciones** suma el interruptor «Análisis de tu 80/20» (`ANALISIS_80_20`), al final, solo si el servidor lo lista.
* **Las fichas de quien acompaña** (`OchentaVeinteDeLaFicha`, debajo de «Cierres del día» en `AlumnoScreen` —mentor o guía—, `PersonaDelLiderScreen` —líder— y
  `FichaAprendizScreen` —Administración y Alquimista, solo con grupo—): «Tu 80/20» en solo lectura, con el control **Semana · Mes** y el mismo periodo. Rutas:
  `GET /mentor/groups/{g}/learners/{u}/analisis-80-20` y `GET /leadership/groups/{g}/people/{p}/analisis-80-20` (o `/leadership/people/{p}/analisis-80-20`,
  sin grupo). **Respeta el interruptor de la spec 034** (`radar.fichas`): apagado o no disponible para el rol, la sección ni se dibuja ni se pide, igual
  que «Código Renaser» (el análisis resume lo que la persona respondió ahí). Un 403 o un 404 la esconden sin error; mientras llega la primera lectura no
  hay marco. Administración y Alquimista la ven siempre. Cada lectura de líder, Administración o Alquimista deja constancia en el servidor, como las demás.
* **No cambian**: la regla de Pareto, los candados, los puntos, el registro de acciones, las otras secciones de las fichas, Hoy, Training, Yo (salvo el
  interruptor de avisos), Comunidad ni la barra. Sin dependencias nuevas ni código nativo. La app solo lee: nada del análisis se edita ni se borra desde
  aquí, y nada del texto de la IA ni de las cifras personales se escribe en el registro de la app (lo frena una prueba).
* **Pruebas:** Jest `ochentaVeinteSchemas` (tolerante por partes, nunca inventa un análisis), `ochentaVeinteApi` (las tres puertas y sus rutas),
  `textosDelOchentaVeinte`, `almacenDelOchentaVeinte` (un pedido por periodo, 403/404 esconden, «Reintentar»), `ochentaVeinteDeLaFicha` (el periodo, los
  estados, `ia.analisis`, `radar.fichas`), `hojaOchentaVeinte` (las vistas, el aviso, el servidor anterior), `fichasConOchentaVeinte` (las tres fichas),
  `avisoDelOchentaVeinte` (la ruta y la espera a las capas) y `avisoDelAnalisis` (el interruptor de avisos); se ajustó `planDelEje`. Maestro, escritos
  y sin correr: `.maestro/analisis-80-20/`.
* **La Política de Privacidad** (`public/privacidad/index.html`) dice ahora que las respuestas del Código Renaser y de «Cierra tu día» se usan también para
  este análisis. Sale con el deploy de Vercel.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) **y el backend con la spec 031 antes** (V153 y V154). Contra un backend
  anterior no aparece nada nuevo: la hoja «Tu 80/20» y las fichas quedan como estaban.

## Cambio por pedido del dueño — 2026-11-03 — Cierra tu día con chips de ícono

Pedido del dueño con una referencia visual: «¿Qué pasó?» con el subtítulo «Selecciona lo que más haya influido.» y una fila de chips con un ícono de línea y
un texto corto («Tiempo», «Imprevisto», «Lo evité»); el elegido, con el fondo y el borde dorados. **Solo cambia lo que se ve: los códigos que viajan al servidor
(`SIN_TIEMPO`, `OTRA_HORA`…), las reglas de la hoja, el 409 y todo lo demás de la spec 017 y la 033 quedan igual. Sin backend nuevo.** Lo que cambia y nada más:
* **Las opciones de «¿Qué pasó?»** (`cierre/data/textosDelCierre`, un solo lugar): Tiempo (`clock`) = «No me alcanzó el tiempo», Imprevisto (`alertTriangle`) = «Surgió otra
  cosa», Energía (`batteryLow`) = «Me faltó energía» y Lo evité (`ban`) = «Lo dejé para después». **«¿Qué harás mañana?»**: Otra hora (`calendarClock`) = «Hacerla a otra hora»,
  Más corta (`minimize2`) = «Hacerla más corta», Pedir ayuda (`handHelping`) y Dejarla (`x`). Cada una tiene `valor` (el código, sin cambio), `texto` (el de siempre, completo),
  `corto` (lo que se ve) e `icono`. «¿Qué pasó?» lleva su subtítulo (`SUBTITULO_DEL_MOTIVO`); «¿Qué harás mañana?» no (el dueño no lo pidió: no se inventó texto).
* **El chip** (`ChipDelCierre`): caja de 48 de alto o más, esquinas de 12, borde de 1 y fila de ícono (20) y texto (16, `fuentes.media`) con 8 de por medio. Elegido: fondo `goldWash`,
  borde `gold` y el ícono en `goldInk`; sin elegir: `cardBg`, borde `border` y el ícono en `textSoft`. **El mismo borde y el mismo peso de letra elegido o no**, para que elegir
  no ensanche el chip ni corra a los de al lado. Se acomodan en filas que envuelven (`flexWrap`). **Sin animación nueva** (se tocan mucho): `Presionable` y `tacto.seleccion()`.
  La pregunta pasó a `t.cardTitle` de 19 (no hay serif: el display de Inter es solo de `t.hero` y `t.screenTitle`).
* **El lector de pantalla dice el texto de siempre:** el chip lleva `accessibilityLabel` con la frase completa («No me alcanzó el tiempo») y `accessibilityState.selected`, así que
  oye «No me alcanzó el tiempo, seleccionado». El texto largo ya no se dibuja: solo se oye. El grupo conserva su nombre («¿Qué pasó? Revisar las facturas»).
* **Seis íconos nuevos** en `Icon.tsx` (formas de Lucide, ISC, caja de 24 y `s24`): `alertTriangle`, `batteryLow`, `calendarClock`, `minimize2`, `handHelping` y `x`. `x` es la equis
  del trazo común: `close` lleva el énfasis de 1,3 veces y junto a los demás íconos del chip se vería más gruesa. `clock` y `ban` ya existían.
* **Las fichas del mentor, el líder y Administración** («Cierres del día», `CierresDelDia`): lo que dijo de cada pendiente se ve «Tiempo → Otra hora» con los mismos textos
  cortos y el ícono de cada chip delante de cada mitad, a 16 y en el gris del texto (`RespuestaConIconos`, solo lectura; si no cabe, se parte entre las dos mitades). El lector oye los textos completos
  («No me alcanzó el tiempo, Hacerla a otra hora», `respuestaParaElLector`). Un valor que esta versión no conoce no se dibuja, ni él ni su ícono. **«Lo que más se repite»** solo
  cambia el texto: «Tiempo · 4 veces».
* **Lo mismo vale en Plan** («Tus cierres de la semana», lo que la persona dijo de un día anterior): `respuestaEnPalabras` es una sola función y ahora dice «Tiempo → Otra hora»,
  para que la persona lea lo que eligió con las mismas palabras. Si el dueño lo quiere con el texto largo ahí, es devolver esa función a `textoDelMotivo` / `textoDelPlan` en
  `utils/textosDeLosCierres`. «Día cerrado» y «Mañana: «…» a otra hora» no cambian.
* **No cambian**: los códigos del contrato, la nota, «Guardar mi cierre» y lo que dice que falta, la pantalla final, el cambio de día, ni los demás tabs. Sin dependencias nuevas ni código nativo.
* **Pruebas:** Jest `hojaDelCierre` (las ocho opciones con su ícono, su texto corto y su etiqueta larga; el subtítulo; el grupo que envuelve; 48 de alto y esquinas de 12; el elegido dorado
  y el borde igual; lo que oye el lector; `tacto.seleccion()` una vez por toque; los ocho códigos al servidor sin cambio), `textosDeLosCierres`, `cierresDelDia` (los íconos y lo que oye el
  lector), `semanaDelCierre`, `cierreEnPlan` y `grosorDeIconos` (los seis íconos nuevos). El flujo de Maestro `.maestro/cierre-en-plan/01` sigue tocando los chips por su
  nombre completo (el del lector de pantalla) y suma el subtítulo; sin correr.
* **No comprobado en el emulador** (esta corrida no tuvo): cómo se acomodan los cuatro chips por fila a 360 dp y con la letra del sistema grande, y el aspecto del elegido en claro y oscuro.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Corrección — 2026-11-10 — tab `Plan`: «Agendar mis acciones» muestra y conserva lo que el día ya tiene en el servidor (spec 048, issue #185)

* **Corrección — 2026-11-10 — «Agendar mis acciones» y las acciones que el día ya tiene (issue #185).** Lo encontró el E2E de la fase 3, y
  pasa también en `master`: la hoja abría en «Cuerpo · 0/3» aunque el día ya tuviera acciones en el servidor, y agendar un día que todavía
  no llegó **reemplaza el plan entero de ese día** (`POST /rocks/plan`, E-208), así que agendar otra borraba en silencio las que ya estaban.
  Lo que cambia y nada más:
  * La hoja trae lo que el servidor ya tiene en el día elegido (sale de lo que Plan ya lee, `GET /rocks/upcoming`): se ve con su hora y
    «Ya agendada», **cuenta para el tope de tres por eje** y no se vuelve a ofrecer (ni la sugerida del diagnóstico ni una escrita igual).
  * **La persona puede quitar una, de forma explícita:** «Quitar» la deja a la vista con «Se quitará al guardar» y «Deshacer» la devuelve
    (no se puede devolver si su lugar ya lo ocupó otra y el eje llegó a tres). Nada se borra del servidor hasta guardar; si solo se quita,
    el botón dice «Guardar cambios». Un día no puede quedar sin acciones (el servidor lo rechaza): quitar todas solo sirve si se agrega otra.
  * **Al guardar viaja el plan del día entero:** lo que ya tenía y siguió (con su hora y sus pasos), lo que espera señal (#183) y lo nuevo,
    con las posiciones seguidas. Solo desaparece lo que la persona quitó. Cambiar de día en la hoja deja lo elegido en el día nuevo sin pasar
    de tres por eje, y lo que se había quitado vuelve a verse como lo tiene el servidor.
  * **Si lo agendado de la semana no se pudo leer** (la lectura de `/rocks/upcoming` falla aparte de la de hoy y mañana), la hoja lo dice
    («No pudimos leer lo que ya tienes agendado esta semana. Si agendas ahora, podrías borrarlo.»), ofrece «Volver a leer» y no deja agendar
    hasta leerlo; abrir la hoja en ese estado lo vuelve a pedir.
  * **No cambian:** el día en curso (el servidor no deja rehacerlo, 409: la hoja no trae lo de hoy y el mensaje sigue igual), con señal el
    servidor reemplaza el día como siempre (E-208), lo que espera señal sigue sin poder quitarse hasta que llegue (#183) y las cinco pestañas.
  * **Pruebas:** `src/features/objetivos/components/__tests__/agendarAccionesYaAgendadas.test.ts`, `planDelEje.test.ts` («Agendar» recibe
    lo que el servidor ya tiene), `src/features/objetivos/utils/__tests__/planPrincipal.test.ts` (`agendadasDeDiasQueVienen`),
    `accionesPropias.test.ts` (`recortadasAlTope`) y `src/features/objetivos/hooks/__tests__/agendadasLeidas.test.ts`. Solo JavaScript: no
    hace falta APK nuevo ni cambio en el backend.
