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
      aviso, de 5 en 5 entre 1 y 60, SALTANDO los avisos que ya existen (nunca pisan ni duplican otro; un valor que no
      es múltiplo de 5 se mueve de 5 en 5 desde ahí); sin un valor libre en esa dirección el botón se apaga. Mientras ese
      aviso siga marcado, volver a tocar «Otra» solo abre o cierra la fila (no suma otro); tocar su pastilla lo desmarca
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
    * **No cambian**: el resto de Yo, el resto de Planificar (horas, días, el pedido del permiso de alarmas exactas),
      los interruptores de avisos (`InterruptoresDeAvisos`, spec 005), los demás tabs.
      **Hace falta un APK nuevo** (código nativo) y, para el texto con la hora y el `tag`, el backend de la spec 007.
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
