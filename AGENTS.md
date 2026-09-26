# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# 📱 REGLAS Y BUENAS PRÁCTICAS DE DESARROLLO MÓVIL (REACT NATIVE / EXPO)

Actúa como un Desarrollador Móvil Senior y Diseñador UX/IA de Alto Nivel especializado en React Native, Expo y TypeScript. Al crear, refactorizar o modificar cualquier pantalla o componente, debes cumplir OBLIGATORIAMENTE con los siguientes estándares:

---

## 1. 🏗️ ARQUITECTURA LIMPIA Y SEPARACIÓN DE RESPONSABILIDADES
* **Estructura Modular por Feature**: Agrupa el código bajo `src/features/<nombre_modulo>/`:
  * `screens/`: Coordinadores y pantallas completas.
  * `components/`: Subcomponentes visuales reutilizables.
  * `types/`: Tipos TypeScript (`.types.ts`).
  * `data/`: Constantes, cláusulas, configuraciones estáticas.
* **Componentes de UI Atómicos**: Utiliza componentes compartidos bajo `src/components/` (`FormField`, `GoldButton`, `SliderRating`, `Checkbox`, `SignatureCanvas`, `Icon`).
* **Integridad del Core**: NUNCA alterar, romper ni desconfigurar las pantallas existentes ni los tabs principales (`Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`).
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
    * **`Hoy` — la hoja del orbe** muestra el pedido de foto del acompañante (evento `evidencia`)
      con **"Tomar foto"**, que abre la misma cámara y la misma pantalla partida. Nada más de Hoy
      cambia; al registrarse, Hoy relee el resumen y el hábito del momento.
    El código es uno solo para los tres lugares (y para la tarjeta del chat):
    `features/habits/hooks/useRegistroConFoto.ts` + `components/RegistroConFotoModal.tsx`.
    Una excepción puntual **no abre** los tabs: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
  * **Excepción autorizada por el dueño del producto — 2026-09-25 — tab `Hoy`, tarjeta del semáforo.**
    Autorizada junto con el diseño del semáforo de cumplimiento del aprendiz (D-168; el contrato vive
    en el backend, `docs/arquitectura/SEMAFORO_DEL_APRENDIZ.md`). El alcance es **solo** la tarjeta
    del semáforo, entre *Hábitos de hoy* y *Acciones y objetivos*, y el detalle que abre:
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
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.
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
* **Serif editorial, SOLO en display** *(agregado 2026-09-14)*: **`Fraunces_600SemiBold`** y **`Fraunces_700Bold`** se usan únicamente en los tokens `t.hero` y `t.screenTitle` (≥ 24 px). **Nada que se lea en párrafo la toca**: texto corrido, inputs, cláusulas y etiquetas siguen en Jost, que es lo que esta regla protege. Entró porque la jerarquía estaba construida sobre `letterSpacing` (el `hero` llegaba a 8) en vez de sobre familia y peso, y eso hacía que cada pantalla se leyera como plantilla. Si alguna vez se quiere volver atrás, es un valor en `theme/tokens.ts` y dos imports en `App.tsx`.
* **El espaciado de letras no es jerarquía** *(agregado 2026-09-14)*: un titular grande lleva tracking **negativo** (junta, pesa); sólo los rótulos chicos en versales (`micro`, `sectionTitle`) llevan tracking positivo, y por debajo de 1.5. Estirar un texto para que parezca importante es el gesto que hay que evitar.
* **Cifras que cambian, tabulares**: todo número que se actualiza en pantalla (día de programa, puntos, racha) va con `fontVariant: ['tabular-nums']` — ya está en el token `t.metric`. Sin eso, pasar de 9 a 10 corre de lugar todo lo que tenga al lado.
* **Tamaño Mínimo de Lectura**:
  * Textos de párrafo / cláusulas / inputs: **14px a 15.5px**.
  * Etiquetas de ayuda / subtítulos: **12px a 13.5px**.
  * Badges / MicroLabels: **10px a 11.5px (Medium/Bold)**.
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

