# Texto para AGENTS.md — spec 026, la persona (agente `persona`)

Pegar tal cual como una entrada más de «Cambio por pedido del dueño» (junto a las demás de 2026-10-31). La parte de Plan, Hoy y el
retiro del Mapa (agente `plan-hoy`) y la de Administración (agente `admin`) van en sus propias entradas.

---

## Cambio por pedido del dueño — 2026-10-31 — Ficha con diagnóstico: lo que ve y hace la persona (spec 026)

Pedido del dueño: una ficha nueva «con diagnóstico» —su formulario de Google, adaptado— que va **EN LUGAR de** la ficha estándar para
quien Administración decida (al aceptar su solicitud, spec 025, o después, a quien ya estaba dentro); de ella nacen los objetivos de 90
días de Plan. Esta entrada es solo la mitad de la **persona** (spec y contrato en
`Renaser-90-dias-backend/specs/026-ficha-con-diagnostico/`). Todo vive en `src/features/diagnostico/`. Lo que cambia y nada más:

* **El ingreso** (`OnboardingFlow`): lee `ficha` de `GET /onboarding/state` (`ESTANDAR` | `CON_DIAGNOSTICO`; ausente o desconocida =
  `ESTANDAR`, así que un backend anterior no cambia nada). Con `CON_DIAGNOSTICO` y el diagnóstico sin terminar, el paso inicial es
  `diagnostico` (`DiagnosticoDeLaPersonaScreen`) en lugar de `FichaInicialScreen`; al terminar sigue Términos y «Elige tu Día 1», igual
  que hoy. Si ya lo terminó y no aceptó Términos (cerró la app ahí), entra a Términos; con Términos aceptados, a «Elige tu Día 1»; si no se
  puede saber (sin red), abre el diagnóstico, que sabe reintentar. «Salir» de la portada cierra la sesión, como la ficha estándar. **El
  «volver» de Términos** de esta persona muestra lo que respondió en solo lectura (`MiDiagnosticoScreen`), porque no hay una ficha a la que
  volver a editar. Al entrar a la app se llama `completeOnboarding()` **sin ficha** (la ficha estándar no existe para ella: el diagnóstico ya
  está en el servidor). **La ficha estándar no cambia en nada.** Límite aceptado: si `GET /onboarding/state` falla por red justo al abrir,
  se queda con la ficha estándar (el comportamiento de siempre); `AuthContext` ya leyó ese mismo endpoint un instante antes.
* **El recorrido** (`components/RecorridoDelDiagnostico`, la misma pantalla para la persona y para la vista previa de Administración):
  **portada** (título, mensaje con sus saltos de línea y «Empezar»; la barra de avance no la cuenta) → **pasos cortos** → **cierre**.
  Es la ficha estándar con otro contenido: el mismo esqueleto (`MarcoDePaso`: barra arriba, un solo scroll, botón fijo abajo que sube con
  el teclado), la misma `BarraDeAvance` (un tramo por sección) y las mismas opciones grandes (`OpcionElegible`).
  * **Pasos**: cada sección se parte en pasos de 1 a 3 preguntas según lo que pesa cada una (`utils/pasosDelRecorrido`): un párrafo, una
    cuadrícula, el consentimiento y una lista de más de 5 opciones van solos; de 4 a 5 opciones pesan doble. **La composición de un paso nunca
    depende de sus propias respuestas**: una pregunta que se muestra «solo si» otra del mismo paso abre un paso nuevo.
  * **Condicionales** (`seMuestraSi`, `utils/visibilidad`): se muestra solo si la respuesta de la pregunta indicada ES ese `valor` (en casillas,
    si lo INCLUYE); recursivo; una condición que nombra una pregunta que no está (otra formación) o un ciclo la deja oculta. Las ocultas no se
    piden ni cuentan; **sus respuestas guardadas se conservan** y reaparecen si la condición vuelve a cumplirse. Los pasos y secciones sin
    preguntas visibles se saltan.
  * **Tipos**: TEXTO (`FormField`), AREA_TEXTO (con contador «123 / 500» si hay `largoMaximo`, que además corta en ese tope), NUMERO (teclado
    decimal, acepta coma, solo dígitos), SELECCION_UNICA (`OpcionElegible`), SELECCION_MULTIPLE (casillas cuadradas; con `maximoOpciones` la
    tercera no se marca y un texto dice «Elige como máximo 2.»), ESCALA y CUADRICULA (números de 48, repartidos en filas parejas si son más de
    cinco; la cuadrícula muestra cada fila con su escala, los extremos una vez arriba y «N de M respondidas»; no avanza hasta responder todas
    las filas), FECHA (`CampoDeFecha`: las ruedas de día, mes y año de la ficha estándar sin su tope de «mayor de 18»; guarda `DD/MM/AAAA`) y
    CASILLA = consentimiento (la declaración, que viene en `ayuda`, completa y sin scroll propio sobre la casilla; **siempre se marca**, sea cual
    sea `requerida`). Un tipo que la app no conoce no llega (el esquema lo descarta).
  * **Precarga**: si `precarga` viene y no hay respuesta guardada, el campo arranca con ese valor para confirmarlo (se guarda al avanzar).
  * **Lo que falta**: al tocar «Siguiente» con una obligatoria sin responder se marca **esa** pregunta (borde rojo y un mensaje de 15 px en
    tuteo bajo ella: «Escribe tu respuesta para continuar.», «Elige una opción para continuar.», «Responde todas las filas para continuar.»…),
    vibra con `tacto.error()` y la vista baja hasta ella (`MarcoDePaso` suma la prop opcional `desplazarA`). Nada de diálogos.
  * **Guardar de verdad**: cada «Siguiente» llama a `onGuardarPaso(respuestasDeEsePaso, pasoAlQueLlega)` y **solo avanza si resuelve**; si falla,
    el paso dice «No se pudo guardar. Revisa tu conexión.» con «Reintentar» de 48, sin perder lo escrito. En el último paso se revisa TODO
    antes de mandar nada (un borrador restaurado pudo dejar un hueco) y se guarda ese mismo paso. «Terminar» llama a `onTerminar()`; un 400
    `DIAGNOSTICO_INCOMPLETO` (`faltan`) lleva al paso de la primera pregunta que falta y la marca; un fallo de red dice «No se pudo terminar…»
    con «Reintentar». Un doble toque manda un solo pedido.
  * **Atrás** (flecha y gesto del sistema, `useSystemBackHandler`): sube un paso; en el primero vuelve a la portada; en la portada llama a
    `onSalir`; en el cierre es «Continuar». Volver no manda nada ni pierde lo escrito.
  * **Retomar**: arranca en el paso de `datos.paso` (acotado), sin portada, con todo lo respondido. Se guarda el paso **al que se llega**.
  * **El cierre**: «Tus objetivos ya están preparados» con los objetivos que devolvió `terminar` (el de la prioridad principal primero, con su
    eje y el texto tal como lo escribió), la primera acción si hubo y qué sigue; sin objetivos, «Los escribirás en Plan.». «Continuar» llama
    a `onContinuar`. En el ingreso «qué sigue» dice Términos y Día 1; para quien ya estaba dentro, revisar y confirmar los objetivos en Plan.
  * **Vista previa** (`modo: 'vistaPrevia'`): no guarda nada ni en el servidor ni en el teléfono, no llama a `onTerminar`, y el último botón
    («Cerrar vista previa») cierra con `onSalir`.
  * **Movimiento** (`emil-design-eng`, `animate-expo`): ninguno propio. El paso nuevo entra con el desplazamiento de 25 px + fundido de 260 ms
    de `MarcoDePaso` (con «reducir movimiento», solo fundido), la barra rellena en 280 ms, y los toques usan `Presionable`. Las respuestas
    cambian al instante (se hacen decenas de veces).
* **Borrador local** (`utils/borradorLocal`): lo que se escribe en el paso en curso se guarda en `AsyncStorage`, clave
  `renaser.diagnostico.<usuario>.<versión>`, medio segundo después de la última tecla, al pasar la app a segundo plano y al salir; se borra al
  guardar el paso y al terminar. Al abrir, lo escrito y no mandado le gana a lo del servidor (es más reciente). Cualquier fallo de
  almacenamiento se lee como «no hay borrador».
* **Pantallas conectadas** (`components/DiagnosticoConectado`, envuelto por `screens/DiagnosticoDeLaPersonaScreen` para el ingreso y
  `screens/CompletarDiagnosticoScreen` para quien ya estaba dentro, con su cabecera «‹ Diagnóstico» en los avisos): abre `GET /diagnostico/mio`;
  **404** → «Todavía no tienes un diagnóstico disponible.» con «Reintentar»; **409** → ya lo terminó (avisa y sigue); sin red → «No pudimos
  cargar tu diagnóstico. Revisa tu conexión.». Guardar un paso = `PUT /diagnostico/mio/respuestas` y después `PUT /onboarding/state`
  (`flow: diagnostico`, `step`); si el servidor rechaza solo el cursor, el paso se da por guardado (lo respondido está a salvo).
* **Ofrecerlo a quien ya estaba dentro** (FR-026-9): `hooks/useEstadoDeMiDiagnostico` (`GET /diagnostico/mio/estado`; sin lectura —404, sin red—
  no hay oferta; se relee al cambiar de cuenta, al volver la app al frente y al terminar el diagnóstico) y
  `components/TarjetaDelDiagnosticoPendiente` (props `{ alAbrir }`; «Completa tu diagnóstico · De él nacen tus objetivos de 90 días ›», una fila
  compacta toda tocable, del estilo de la tarjeta del Mapa que reemplaza; **devuelve `null` salvo con el diagnóstico pendiente o en curso**).
  Hoy la monta y abre `CompletarDiagnosticoScreen` (lo hace el agente `plan-hoy`). Para la fila «Mi diagnóstico» de Yo,
  `utils/estadoDelDiagnostico.diagnosticoTerminado(estado)` dice si ya lo terminó (con el mismo hook).
* **Lectura de solo lectura**: `screens/MiDiagnosticoScreen` (props `{ onBack }`; Yo → «Mi diagnóstico», cabecera «‹ Mi diagnóstico») y
  `components/SeccionDelDiagnosticoDeLaPersona` (props `{ cargar }`) en las fichas del **mentor o la guía** (`AlumnoScreen`), del **líder**
  (`PersonaDelLiderScreen`, con grupo y desde «Todos los aprendices») y de **Administración** (`FichaAprendizScreen`), debajo de «Cierres del
  día». Por sección, cada pregunta tal como se le hizo con su respuesta legible (texto, valores como lista, una fila por área de la cuadrícula,
  «Aceptó» en el consentimiento; sin respuesta, «Sin respuesta»); una pregunta retirada lleva la marca «Pregunta retirada» y conserva lo que se
  respondió. Mismo criterio que el tiempo libre y los cierres: **403, 404, la ficha estándar o ningún diagnóstico no dibujan nada**; mientras
  llega la primera lectura tampoco (sin parpadeo); un fallo de red dice «No se pudo cargar el diagnóstico.» con «Reintentar» de 48; si
  todavía no lo completó, «Todavía no lo ha completado.». Rutas: `GET /admin/diagnostico/personas/{id}`,
  `/mentor/groups/{g}/learners/{u}/diagnostico` y `/leadership/groups/{g}/people/{p}/diagnostico` (o `/leadership/people/{p}/diagnostico` sin
  grupo). **No hay nada que editar ni ningún pedido de escritura.**
* **Retoques a lo compartido (aditivos, sin cambio para nadie más)**: `MarcoDePaso` suma la prop opcional `desplazarA` (bajar la vista hasta
  una altura); `FormField` suma `mensajeDeErrorAparte` (borde rojo sin el texto de 12 px, para decirlo a 15); el esquema de
  `GET /onboarding/state` suma `ficha`; `PreguntaLeida` suma `escalaMax` opcional (con él la cuadrícula se lee «Mi salud… · 4 de 5»; sin él,
  «Mi salud… · 4»: el contrato de §4 todavía no trae la escala en la lectura).
* **No cambian**: la ficha estándar (preguntas, pasos, validaciones, borrador), Términos, «Elige tu Día 1», los cinco tabs, Plan, Hoy y Yo por
  dentro (solo montan lo que esta entrada exporta), ni ningún permiso (lo decide el servidor). Sin dependencias nuevas ni código nativo.
* **Pruebas**: Jest `respuestasEnEdicion`, `visibilidadYPasos`, `validacion`, `borradorLocal`, `lecturaLegible`, `estadoDelDiagnostico`,
  `diagnosticoLecturaApi`, `recorridoDelDiagnostico` (portada, pasos, condicionales, lo que falta, guardar/reintentar, terminar,
  `DIAGNOSTICO_INCOMPLETO`, atrás, retomar, borrador, vista previa, bajar hasta la pregunta), `campoDeFecha`, `diagnosticoConectado`,
  `onboardingFlowConDiagnostico`, `estadoOnboardingFicha`, `useEstadoDeMiDiagnostico`, `tarjetaDelDiagnosticoPendiente`,
  `seccionDelDiagnosticoDeLaPersona`, `miDiagnosticoScreen` y `lecturaEnLasFichas`. Maestro, **escritos y sin correr**:
  `.maestro/ficha-con-diagnostico/01–04` y `comun/diagnostico-responder-el-paso`.
* **Sin comprobar en pantalla** (solo se ve con el emulador): el aspecto de los pasos (alturas de las opciones, la cuadrícula de 7 filas, el
  texto largo de la declaración), el desplazamiento hasta la pregunta marcada con el teclado abierto, y el borrador tras matar la app.
* **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se actualiza por aire) **y el backend
  con la spec 026 antes** (`/diagnostico/mio…`, `ficha` en `/onboarding/state` y las tres lecturas). Contra un backend anterior nadie tiene
  `CON_DIAGNOSTICO`: la app queda como estaba.
