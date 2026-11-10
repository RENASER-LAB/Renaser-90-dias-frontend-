# Kilómetros diarios: captura, pasos (Health Connect) y la carrera con GPS

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Cambio por pedido del dueño — 2026-10-29 — tabs `Training`, `Yo` y `Hoy` (registro con foto): KILÓMETROS DIARIOS siempre muestra el campo de km y nunca se envía sin el número

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

## Cambio por pedido del dueño — 2026-10-29 — tabs `Training` y `Yo` (y las tarjetas «Tomar foto» de `Hoy` y del chat de SER): KILÓMETROS DIARIOS deja elegir la captura de la galería

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

## Cambio por pedido del dueño — 2026-11-02 — «Kilómetros diarios»: los pasos del teléfono llenan los km (spec 037, D-310)

Textual: «cómo hacemos que el celular cuente los pasos, tipo Pokémon GO. Procede.» Maqueta aprobada (opción A, 14 pantallas). Pokémon GO no cuenta
los pasos él mismo: lee lo que el sistema registra; aquí igual, **sin servicio propio, sin notificación fija y con la app cerrada**. Spec, plan y
contrato en el backend: `specs/037-pasos-y-km/` (D-310, V161). **Cambio del dueño el mismo día («todos tienen Android 14»): solo Health Connect.** Lo que
cambia y nada más:
* **Solo Health Connect, Android 14 o más.** El sistema cuenta los pasos del teléfono en cuanto una app tiene `READ_STEPS`, y los relojes (Samsung,
  Fitbit, Garmin, Xiaomi/Zepp) escriben en el mismo lugar. **No hay módulo propio, ni Recording API, ni `play-services-fitness`.** Android menor a 14,
  un teléfono sin Health Connect, Huawei sin Google y el iPhone (web) **se quedan con la captura de siempre, por decisión del dueño**, y no se ofrece
  instalar nada (`soporteDeSalud`: API 34 y `SDK_AVAILABLE`; en la web `saludConectada.web.ts` dice siempre «no disponible»).
* **La fila de «Kilómetros diarios»** (`features/pasos/`; solo esa fila y solo HOY): sin conectar, bajo el nombre «Cuenta tus pasos solo ›» (48 de alto);
  conectado, una barra y «3,2 de 5 km» con la fuente, un círculo apagado, y **sin «Subir»**; con la meta alcanzada, «5,4 km · ¡Meta lista!» y el botón
  **«Registrar»**, que relee, comprueba la meta y cierra el hábito; sin pasos hoy, «Todavía no vemos pasos hoy» con «Actualizar» y «Subir captura»; sin
  permiso, «Perdimos tus pasos»; ya cumplido, «5,4 km». La hoja de lo cumplido suma «5,4 km · Health Connect · Galaxy Watch» (o «· Captura»). Todo lo
  decide `vistaDeKilometros` (pura, con una prueba por estado). La lista de hoy lo comparte con la fila por contexto (`PasosDeLaLista`): ni `ListaDeHoy` ni
  los días anteriores cambian, y sin `medicion.meta` en la agenda (un backend anterior) la fila es exactamente la de siempre.
* **Dos hojas** (`HojaDesdeAbajo`, sin animación propia): `HojaConectarPasos` («Cuenta tus km solo»: «Tu teléfono o tu reloj cuentan los pasos. · Renaser solo lee pasos y
  distancia. · Tu mentor y el ranking ven tu total de km.», «Conectar» / «Ahora no», y la política de privacidad; después «Ya contamos tus pasos»; y en un teléfono
  sin soporte, «Sube tu captura» con «Subir captura») y `HojaDeKilometros` (el número grande, los pasos «aprox.» si salen de la zancada, la meta, la fuente y la
  última lectura, «Registrar 5,4 km», «Actualizar» y «Desconectar»; con dos fuentes, «La usamos» / «No se suma» y «Cambiar prioridad»). «Conectar» es el consentimiento
  que pide Google Play: dice que el mentor y el ranking ven el total.
* **Cuándo lee** (`usePasosDelDia`): al abrir Training, al volver a primer plano, con «Actualizar» y justo antes de registrar; entre lecturas automáticas, 30 s.
  Nunca en segundo plano, ni en un día anterior, ni con el hábito cumplido, ni sin conectar o sin permiso. Lee solo `Steps` y `Distance`, solo el día del registro.
* **Una sola fuente por día, sin doble conteo** (`saludConectada`, `fuentesDeSalud`): se leen los registros del día con su método y su origen; un origen con algo escrito a mano
  (`recordingMethod` 3) o de método desconocido (0) **no cuenta** (`METODOS_QUE_NO_CUENTAN`; si en un teléfono real los relojes llegaran con 0, es una línea). El número es el
  AGREGADO de Health Connect pedido solo a los orígenes limpios: Health Connect elimina duplicados con la prioridad que la persona fijó. Km = la distancia agregada o, si no hay,
  los pasos × 0,75 m («aprox.»). La etiqueta de la fuente sale del paquete (los nombres están escritos de memoria y se confirman en un teléfono real) o del modelo del dispositivo.
* **Registrar** (`registrarKilometrosAutomaticos`, `POST /habit-tracks/{id}/auto-measurement`): mismas reglas del 17-oct que `/complete`: se compara el id del registro con
  el de hoy antes de enviar; si el día cambió no se manda nada, se recarga y se avisa «Tu día cambió»; un 409 de día cerrado tampoco se reasigna ni se celebra. Al confirmar sale
  `habitoCumplido` (alarmas, celebración, puntos del servidor) y la línea «Registramos tus 5,4 km.». Doble toque = un pedido. El servidor valida la meta, los topes y el día, y es idempotente.
* **Quién más lo ve:** el mentor, la guía, el líder y Administración ven en cada día «5,9 km · Medido por el reloj», los pasos y la distancia, «Galaxy Watch · leído a las 17:10» y
  **«Por revisar»** si el servidor dejó dudosa la lectura (`LineaDeLaMedicion`, en `AlumnoScreen` y `DiaDeLaPersona`; la captura dice «Captura de la persona»). El **ranking de
  Kilómetros** no cambia sus cifras: marca **«· auto»** junto al total de quien tiene días leídos por el teléfono y dice «Km de tus pasos o de tu captura.» bajo el selector.
* **Administración → Hábitos del programa → Kilómetros diarios:** «Meta diaria de km» (`MetaDeKilometrosDelHabito`, `GET/PUT /admin/habits/{id}/measurement-goal`, de 0,5 a 50, por
  defecto 5; «Volver a la del programa»). Rige desde ya para los registros automáticos; la captura sigue aceptando cualquier km mayor que cero. La sección solo existe si el servidor responde.
* **Supuestos del equipo, a confirmar con el dueño:** (1) la meta de 5 km; (2) solo el cierre automático exige la meta; (3) el ranking mezcla km de GPS y de pasos (±10–20 %) y los marca «auto»;
  (4) lo dudoso (más de 30 km, o una zancada fuera de 0,3 a 1,6 m) entra marcado «por revisar» y cuenta; (5) los pasos son de todo el día, no solo caminatas.
* **Privacidad y Play:** la política (`/privacidad/`) suma una sección de pasos y distancia, para qué se usan, quién los ve y cómo se desconecta. **Antes de publicar** hay que declarar
  «Activity and fitness» (Steps y Distance) en el formulario «Health apps» de Play Console y actualizar Data safety. La pantalla de permisos de Health Connect abre NUESTRA actividad
  (`plugins/withHealthConnect.js` escribe `PoliticaDePrivacidadDeSaludActivity.kt`, el filtro `ACTION_SHOW_PERMISSIONS_RATIONALE` y el alias `ViewPermissionUsageActivity`): el plugin de la
  librería (`app.plugin.js`) **no** se pone en `plugins` porque apunta a `MainActivity`, y tocar el enlace solo abría la app.
* **Dependencias nuevas, revisadas antes de instalar** (`specs/037-pasos-y-km/research.md` del backend): `react-native-health-connect@4.1.3` **fijada sin `^`** (MIT, publicada por GitHub Actions con
  proveniencia, sin scripts de instalación, sin dependencias, sin red) y `expo-build-properties@~57.0.22` (Expo). **`minSdk` pasa de 24 a 26** (lo exige `androidx.health.connect:connect-client:1.1.0`):
  Android 7.x queda fuera. **No se agregó `expo-dev-client`:** cambiaría cómo arrancan `expo start` y `expo run:android` y los flujos de Maestro.
* **Hace falta un build nativo** (código nativo nuevo: no llega por aire, no sirve Expo Go ni el APK publicado): `eas build --platform android --profile debug-pasos` (el APK de depuración de siempre,
  que carga el JS desde Metro). Probar en un emulador Android 14+ con Health Connect Toolbox sembrando pasos (`.maestro/pasos-y-km/README.md`). Y **el backend con V161 antes** (contra uno anterior
  no hay `medicion.meta` y la fila es la de siempre).
* **Fuera de alcance, para después:** cerrar el hábito sin tocar al abrir la app (B), en segundo plano (C, pide `READ_HEALTH_DATA_IN_BACKGROUND`), iPhone (HealthKit), una fila «Mis pasos» en Yo.
* **Pruebas:** Jest `fuentesDeSalud`, `lecturaDelDia`, `vistaDeKilometros`, `textosDePasos`, `medicionDeLaFicha`, `pasosApi`, `conexionDeLosPasos`, `usePasosDelDia`, `pasosEnPantalla`,
  `filaDeKilometrosConPasos`, `pasosEnLaApp` y `healthConnectEnLaApp` (configuración del build). Maestro, escritos y sin correr: `.maestro/pasos-y-km/`.

## Corrección — 2026-11-05 — «Kilómetros diarios»: aceptar los permisos de Health Connect ya no depende de una sola respuesta (issue #127)

Un usuario real (Play Store, 1.7.1 y 1.7.2) tocaba «Cuenta tus pasos solo» → «Conectar», aceptaba TODOS los permisos de Health Connect y la
pantalla de permisos volvía a salir, sin quedar nunca conectado. **La causa exacta en ese teléfono NO se pudo reproducir ni confirmar**: en
un emulador Android 37 con Health Connect real el flujo completo funciona. Lo comprobado y lo que se endureció (solo JavaScript, sin
dependencias ni código nativo; `app.json`, el manifiesto y `plugins/withHealthConnect.js` ya estaban bien: están los dos permisos, la
actividad de «por qué pedimos esto» y el alias de «ver uso de permisos» en el APK 1.7.2 publicado):
* **La app dependía de UNA sola respuesta del diálogo** (`requestPermission`), y la conexión solo se anotaba si esa respuesta llegaba bien. Dos
  caminos la perdían sin avisar: (1) Android cierra la app con el diálogo abierto (poca memoria, ahorro de batería, `singleTask` + el
  proceso que muere): la persona acepta, el sistema GUARDA el permiso, pero la respuesta se pierde con el proceso; al volver la app no se
  había anotado conectada y volvía a ofrecer «Conectar» (medido en el emulador: permiso concedido en el sistema, app «sin conectar»). (2) La
  librería lanza o devuelve vacío: `pedirPermisosDeSalud` se tragaba el error sin dejar nada en el registro.
* **`pedirPermisosDeSalud`** (`pasos/services/saludConectada`): si el sistema ya tiene el permiso de pasos no abre el diálogo; si el diálogo
  no devuelve los pasos (vacío, error o se perdió), le pregunta al SISTEMA (`getGrantedPermissions`) antes de decir que no; y un fallo queda en
  el registro de la app (`[pasos] …`). `permisosDeSalud` confirma un «faltan» con dos relecturas más (350 ms entre una y otra) para que un
  teléfono lento no «pierda» los pasos por una lectura vacía. Sigue pidiéndose SOLO la lectura de pasos y de distancia (spec 037 FR-003).
* **El intento de conectar se anota ANTES de abrir el diálogo** (`pasos/services/conexionDeLosPasos`: `renaser.pasos.intento.<cuenta>`, vale 15
  minutos, se borra al terminar). Si la app vuelve sin conexión anotada, con un intento reciente y el permiso de pasos ya concedido en el
  sistema, `usePasosDelDia` termina de conectar sola (al montar y al volver a primer plano). **Sin un intento reciente no se conecta nada
  solo**, aunque el permiso exista: el consentimiento es el toque en «Conectar» (el que pide Google Play, spec 037).
* **No cambian**: ningún diseño ni texto, la lectura de pasos, el registro de los km, «Desconectar», ni el backend.
* **Corregido el mismo día (E2E integrado del 05/11, el bug que vio el dueño en su teléfono).** El primer «Permitir» seguía perdiéndose:
  el diálogo contestaba «vacío» **mientras la persona todavía elegía** (el registro decía «el diálogo… no devolvió el permiso; se comprueba
  con el sistema»), las relecturas daban «faltan», `conectar` **borraba la nota del intento** y, al volver con el permiso ya concedido, ya
  no había intento con qué terminar de conectar: la hoja volvía a ofrecer «Conectar» y recién el segundo toque conectaba. Ahora un «no» del
  diálogo **no borra el intento** (vence solo a los 15 min) y `reconciliarElIntento`, al volver a primer plano, relee el permiso con las
  relecturas: con el permiso en el sistema queda conectada sin otro toque. Sin el permiso sigue sin conectar nada. Pruebas: dos nuevas en
  `usePasosDelDia` (fallan con el código anterior).
* **Y la hoja se entera (issue #137, E2E del mapa del 05/11).** Con la conexión ya terminada al volver a primer plano, la hoja «Cuenta tus km solo»
  seguía en «Conectar» (solo pasaba a «Ya contamos tus pasos» si el diálogo contestaba que sí). Ahora recibe `conectada` (Training le pasa
  `vista.modo !== 'ofrecer'`) y, con la hoja abierta y la conexión anotada, pasa a «Ya contamos tus pasos» y borra el aviso de error. Prueba en
  `pasosEnPantalla` (falla con la hoja anterior).
* **Comprobado en el emulador** (Pixel 6, API 37, debug local, sin cuentas ni producción): camino normal (acepta todo → conectada) y la app
  muerta con el diálogo abierto (acepta todo → al reabrir queda conectada sin otro toque). **Sin comprobar:** el teléfono real del reporte; si
  el bucle vuelve, el registro ahora dice qué falló (`[pasos] falló el diálogo de permisos…`).
* **Pruebas:** Jest `saludConectada` (qué se pide, cuándo cuenta como concedido, relecturas, errores), `intentoDeConectar` y las nuevas de
  `usePasosDelDia` (el intento antes del diálogo, la app muerta, sin intento no conecta, sin permiso tampoco).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Cambio por pedido del dueño — 2026-11-05 — tab `Training` → Kilómetros en vivo con GPS (spec 042)

Decisiones del dueño del 2026-11-05 sobre el lienzo de diseño (fila «Elegida»: estilo adidas Running con los botones de Renaser) y sus respuestas a los
supuestos (spec, plan, contrato y «Decisiones del dueño» en el backend, `specs/042-kilometros-en-vivo-gps/`, D-323, V170). Pedido explícito: **que no se
llame al servidor a cada rato y que nada se duplique**, y **«el avatar debe reflejar el movimiento real al instante, incluso 4 pasos»**. Todo vive en
`src/features/carrera/`. Lo que cambia y nada más:
* **La entrada** (`EntradaDeLaCarrera`): bajo el nombre de «Kilómetros diarios», en la lista de HOY de Training, una píldora con borde dorado de 48,
  **«Correr con GPS»** (con una carrera en curso, «Carrera en curso · Volver»). Solo si `seOfreceLaCarrera`: Android, hoy, la agenda trae
  `medicion.carrerasDelDia` (un backend anterior no lo manda y la entrada no existe) y el interruptor `habitos.km.carreras` (`CLAVES.habitosKmCarreras`)
  disponible y prendido. Se ofrece también con el hábito ya cumplido (correr más sube los km del día, FR-022). La fila de siempre (la captura, los pasos
  de la spec 037) no cambia: `PasosDeLaLista` suma `carrera` y `FilaDelDia` dibuja la píldora debajo de la línea de los pasos. En la web no hay carrera.
  > **Corregido 2026-11-05 (pedido del dueño: «que se detecte el dispositivo solo»).** Donde la carrera se ofrece (misma `seOfreceLaCarrera`), el botón de
  > la DERECHA de «Kilómetros diarios» por cumplir hoy ya no es «Subir»: es **«Correr»** (`BotonCorrerDeLaFila`, ícono `footprints`, la misma píldora de
  > «Subir», 48 de área con el `hitSlop`), o **«Volver»** con una carrera en curso; abre la cuenta 3, 2, 1. Debajo queda «Cuenta tus pasos solo ›» solo si
  > Health Connect está disponible (spec 037). **La captura no desaparece:** tocar el nombre abre la hoja del hábito con «Correr con GPS» como botón principal y
  > **«Subir captura»** como secundario (`accionesDeLaHojaConCarrera`; antes el toque abría la cámara directo). Ya cumplido, o con la barra de avance de los pasos a
  > la derecha, la píldora «Correr con GPS» sigue debajo del nombre como antes (`lugarDeLaCarrera`, pura: `'fila' | 'debajo' | null`). **En cualquier otro caso**
  > (web, iPhone, backend sin `carrerasDelDia`, interruptor apagado) la fila es exactamente la de antes, con «Subir». Sin parpadeo: la decisión sale de la misma
  > agenda que dibuja la fila (`carrerasDelDia`) y de la lectura de interruptores guardada por cuenta, así que la fila nace con su botón. Sin animación nueva.
  > Pruebas: `filaDeKilometrosConCarrera`.
* **La pantalla vive sobre el navegador** (`AnfitrionDeLaCarrera`, montado en `App.tsx`; Training solo la pide con `pedirLaCarrera`): así la carrera sigue
  a la vista aunque se cambie de pestaña, y el atrás del sistema la deja seguir y vuelve a la app (la entrada dice «Volver»). Flujo: pedir ubicación
  precisa «mientras se usa la app» (sin permiso no empieza y lo dice; queda la captura) y, opcional, actividad física → leer el peso y el sexo ANTES de la
  cuenta (cada lectura con 4 s de tope) → generar la `carreraId` (UUID v4, `expo-crypto`) y guardarla en pausa (no cuenta tiempo) → arrancar el GPS →
  **cuenta regresiva** 3, 2, 1 dorada a pantalla completa con el número blanco en un aro, pitido (la campana de Renaser), voz y vibración en cada número,
  «Empezar ya» y «Cancelar» → **Corriendo**: el tiempo grande «00:14:32 / Duración», la fila Distancia km · Ritmo min/km · Calorías, las cuatro pestañas
  con íconos (Mapa, Estadísticas, Tramos, Voz), el mapa y abajo la píldora dorada **«Desliza para pausar»** (deslizar o un golpe rápido; mantener
  presionado medio segundo o la acción «activar» del lector de pantalla también pausan) → **Pausa**: franja «En pausa», números atenuados, «Tu carrera
  queda guardada, aunque cierres la app» en verde, Ver mis tramos / Ver estadísticas / Voz y sonidos / Bloquear la pantalla (una capa que se quita
  manteniendo presionado), «Seguir» dorado, «Terminar» con borde y «Descartar esta carrera» en rojo (pide confirmación, borra y no envía nada) →
  **Terminaste**: «¡Carrera terminada!», el mapa, km, duración, ritmo, calorías aprox., tramos (el mejor km en verde), la línea del hábito y «Compartir en
  el Muro» (abre la publicación de siempre). La pausa automática (sin pasos y quieto 10 s) dice «En pausa automática · sigue al moverte» y sigue sola.
* **El mapa** (`MapaDeCarrera`): `react-native-maps` con Google, cámara inclinada con edificios que sigue el rumbo, sin gestos (**2D/3D: ver «Corregido 2026-11-05 (mapa)»**); la ruta
  dorada (#B2924F) que crece; la chapita «Km 3 · 0,47 en 2:44». **El avatar va FIJO al centro y se mueve la cámara** (un `Marker` animado en Android se
  dibuja como imagen fija). **Sin la clave de Maps** (`extra.mapaGoogle` de `app.config.js`, variable de EAS `GOOGLE_MAPS_ANDROID_KEY`) o sin el módulo
  nativo, fondo neutro con el avatar y «El mapa todavía no está disponible. Tu carrera se cuenta igual.». En la web, `MapaDeCarrera.web.tsx` (sin el módulo).
* **El avatar** (`AvatarCaminante`) es **arte provisional**: un círculo con la foto o las iniciales y borde dorado, con un vaivén de 3 px mientras camina
  (quieto en pausa y con «reducir movimiento»). La figura (hombre, mujer o neutral) sale de `sex` de la Ficha Inicial (`figuraDelAvatar`) y ya viaja en
  las props: el arte final reemplaza SOLO `DibujoDelAvatar`. **Fusión** (`fusionDelAvatar`, FR-031/032): cada paso del podómetro lo adelanta una zancada en el
  rumbo en el mismo instante (aunque el GPS no cambie); cada punto GPS bueno lo reconcilia en ≤ 600 ms, o lo coloca sin animar si saltó más de 30 m.
* **El motor** (`utils/motorDeCarrera`, puro): descarta puntos con precisión peor que 20 m y saltos de más de 25 km/h; suaviza con los últimos 4 puntos
  ponderados por 1/precisión²; distancia haversine; **quieto no suma** (sin pasos recientes y sin desplazarse más que el ruido del GPS en 10 s); huecos sin
  señal de menos de 60 s con pasos se rellenan con pasos × zancada (calibrada con el GPS de la carrera; si no, 0,75 m caminando y 1,0 m corriendo) y quedan
  como `metrosSinGps`; de 60 s o más no suman; tramos por km; ritmo actual de los últimos 30 s; subida con altitud suavizada (solo subidas de más de 2 m);
  **calorías** MET × peso × horas con el peso del objetivo de 90 días de Cuerpo si está en kilos (el avance o, si no, la línea base; 30–300 kg), si no 70
  kg (decisión 5 del dueño, `pesoParaCalorias`). Carreras de menos de 100 m o de menos de 1 minuto activo no se envían: «Muy corta para guardarla» con
  Seguir / Descartar.
* **Cero pedidos durante la carrera** (FR-004): el estado vive en `servicios/carreraEnVivo` y se guarda en el teléfono (AsyncStorage, clave
  `renaser.carrera.enCurso`, con la cuenta adentro) como mucho cada 5 s o cada 10 puntos. **Si Android mata la app**, al reabrir se retoma esa carrera de
  esa cuenta en pausa, sin contar el tiempo muerto (FR-006). La única lectura de red es antes de la cuenta regresiva (peso y sexo).
* **Un solo envío al terminar** (FR-016): `POST /api/v1/carreras` con la `carreraId`, el resumen, los tramos completos y la ruta (COMPLETA,
  Douglas-Peucker a 5 m, polyline de Google, ≤ 3000 puntos y ≤ 100 KB; sin ruta si la persona apagó «Guardar mi ruta», encendido por defecto). El
  cuerpo se arma UNA vez y va a la **cola por cuenta** (`renaser.carreras.cola.<cuenta>`) ANTES de borrar la carrera de «en curso»: los reintentos mandan los
  mismos bytes (misma huella).
  > **Corregido 2026-11-05 (FR-043, decisión del coordinador): la zona de privacidad la quita el SERVIDOR, no el teléfono.** `rutaParaEnviar` ya no recorta
  > (se borraron `recortarPrivacidad` y `ZONA_DE_PRIVACIDAD_M`): manda la ruta completa por HTTPS y el servidor le quita los primeros y los últimos 200 m
  > —cortando en el punto exacto, con el mismo algoritmo que tenía la app— antes de guardarla; si no quedan 2 puntos, la carrera se guarda sin ruta. Así ni
  > una app modificada logra que se guarde dónde empieza o termina una carrera (la casa de alguien). Nunca se recorta en los dos lados (se perderían 400 m por
  > punta). Lo que leen la persona, el mentor, el líder y Administración (`GET …/ruta`) ya viene recortado; «Terminaste» dibuja la ruta completa porque es la
  > propia pantalla de la persona. No hay imagen de la ruta para el Muro: «Compartir en el Muro» abre el compositor vacío. Prueba: `rutaYCuerpo` («manda la
  > ruta completa»). Hace falta el backend con este cambio a la vez que la app (un backend anterior guardaría la ruta entera). Sin red o 5xx/503/404: espera creciente 5 s, 15 s, 1 min, 5 min, 15 min y luego 30 min; con la app al frente nunca más de 1 min
  (no hay detector de red en la app). 2xx —también `repetida: true`— o 409 `CARRERA_YA_REGISTRADA` la sacan de la cola; otro 4xx queda marcado con el motivo.
  La línea del hábito (FR-018): «Registrando 3,2 km en tu hábito…», «Registramos 3,2 km en tu hábito», «Guardada en tu teléfono, se enviará al tener señal», o
  por qué no entró (captura, día cerrado, sin hábito, no cuenta). Si la carrera cerró el hábito (`CERRADO`, no repetida) se emite `habitoCumplido` (alarmas,
  celebración, semáforo, FR-027). La cola se procesa al abrir, al volver al frente y cada 15 s con la app abierta.
* **Fuera de la app** (FR-011): el GPS corre en un servicio en primer plano de `expo-location` (`foregroundService`, iniciado con la app visible: **no pide
  ubicación en segundo plano**, lo confirma el código del módulo). La tarea se define al cargar la app (`index.ts`). La notificación del servicio no admite
  acciones ni se puede cambiar con la app atrás, así que hay una segunda **notificación fija propia** (`expo-notifications`, canal silencioso
  `carrera-en-vivo`) con km, tiempo y ritmo, actualizada como mucho cada 10 s desde la tarea, con «Pausar» y «Abrir» (los dos abren la app; «Pausar» además
  pausa). Con la app abierta no sale como banner (`recordatoriosDeHabito` la reconoce por su identificador).
  > **Corregido 2026-11-05 (pedido del dueño: una sola notificación).** Ya no son dos: `scripts/arreglar-notificacion-de-carrera.js` (postinstall; `expo-location` y `expo-notifications` en `buildFromSource`) fija el id del servicio (481756) y publica la de la carrera con ese id y sin tag, así REEMPLAZA a la del servicio: una sola, fija, con «Pausar» (o «Seguir» y «Carrera en pausa» en pausa) y «Abrir», al día también con la app abierta y desde que termina la cuenta regresiva; al terminar o descartar desaparece. «Pausar»/«Seguir» funcionan también con la app cerrada desde recientes (se lee la última respuesta al abrir), y tras morir el proceso el GPS se reinicia con su servicio al seguir (antes quedaba sin servicio ni notificación). E2E en el emulador: `~/Imágenes/e2e-2026-11-05/una-notificacion/`. Hace falta un APK nuevo (código nativo).
* **Voz y sonidos** (FR-010, `PanelVoz`, por cuenta en el teléfono): avisos cada 1 km (por defecto) / cada 5 min / nunca; qué dice (distancia, tiempo, ritmo,
  ritmo del último km); pitidos; pausa automática; pantalla siempre encendida (`expo-keep-awake`, apagada por defecto); «Guardar mi ruta». La voz es el texto
  a voz del teléfono (`expo-speech`, `es-419`).
* **Lo que se lee de un día con carreras**: `origenDelDia: GPS` dice «6,2 km · Carrera con GPS» en Training y en las fichas (`detalleDeLosKm`,
  `quienLoMidio`). En las fichas del mentor, el líder y Administración (`LineaDeLaMedicion`), cada carrera del día (`medicion.carreras[]`) es una
  línea «6,21 km · 36:55 · 5:57 min/km», con «No cuenta» o «Por revisar» si el servidor lo dijo. Las rutas por rol ya tienen su función
  (`leerRutaDeLaCarrera`: la propia, la del mentor o guía y la del liderazgo con y sin grupo, contracts/api.md §3), pero **el mapa de la ruta en
  las fichas todavía no se abre** (pendiente). En «Terminaste», `NO_CUENTA` dice el `motivoNoCuenta` del servidor y una carrera `porRevisar` lo
  avisa; un 409 que no sea `CARRERA_YA_REGISTRADA` queda marcado y no se toma por éxito.
* **Cerrar sesión** apaga el GPS y la notificación (`apagarLaCarreraAlSalir`); la carrera y la cola quedan guardadas por cuenta (no salen con otra sesión).
  Falta el aviso «tienes una carrera sin enviar» antes de cerrar sesión.
* **Dependencias nuevas, revisadas antes de instalar** (`npm view` y el tarball, integridad igual a la del lock, sin `preinstall`/`install`/`postinstall`, sin
  `child_process`/`eval`/red en el código; instaladas con `--ignore-scripts` y versión exacta de al menos dos semanas): `expo-location@57.0.22`,
  `expo-task-manager@57.0.21` (y su dependencia `unimodules-app-loader@57.0.2`), `expo-sensors@57.0.3`, `expo-keep-awake@57.0.2` (ya venía dentro de `expo`)
  — todas de Expo (650 Industries, repo `expo/expo`) — y `react-native-maps@1.27.2` (repo `react-native-maps/react-native-maps`, MIT, su única dependencia es
  `@types/geojson`; su script `prepare` no corre al instalar desde el registro). El lock dejó `@expo/image-utils` en 0.11.6 y `@expo/require-utils` en 57.0.6
  (las 0.11.7 y 57.0.7 salieron el mismo día). **Sin AsyncStorage nuevo ni `expo-sqlite`.** `app.json` suma el plugin de `expo-location` (foreground service
  y actividad física sí, ubicación en segundo plano no); `app.config.js` (nuevo) suma `react-native-maps` con la clave si existe.
* **No cambian**: la captura, los pasos de Health Connect (spec 037), los demás hábitos, los demás tabs ni la barra. Sin backend, la entrada no existe.
* **Pruebas:** Jest `motorDeCarrera`, `rutaYCuerpo`, `colaAvatarYTextos` y `carreraSinPedidos` (cero pedidos durante la carrera y uno al terminar, sin red y
  reintento repetido sin duplicar, cola por cuenta, retomar tras morir la app). Maestro, **escritos y sin correr**: `.maestro/carrera-gps/` (01 a 04).
* **Hace falta**: el backend de la spec 042 antes; **un APK nuevo** (código nativo); la clave de Maps SDK for Android restringida (variable de EAS
  `GOOGLE_MAPS_ANDROID_KEY`); en Play Console la declaración del servicio en primer plano de tipo ubicación (con video) y Data safety (ubicación precisa,
  actividad física); la política de privacidad con la ubicación y la ruta; el arte final del avatar; y probar en un teléfono real (latencia del podómetro,
  batería, pantalla bloqueada 10 min, SC-007 y SC-011).
* **Corregido 2026-11-05 (pendientes del E2E):**
  * **Los km, un solo formato.** «Registramos X km en tu hábito» usa `formatoKm`, el de la tarjeta: dos decimales («Registramos 0,40 km», no «0,4»).
  * **Las calorías salen de la distancia** (FR-015). Antes, parada, el reloj sumaba el MET de estar quieta y subían con 0 m. Ahora cada tramo usa los
    metros recorridos desde el último cálculo (`ultimoCalculoCaloriasDistanciaM`, opcional para estados guardados antes); sin metros nuevos no suma, y por
    debajo de 1 km/h `caloriasDelTramo` da 0. Con 0 m, 0 kcal; al pararse, dejan de subir.
  * **Sin el cuadro gris detrás del avatar** en «Terminaste» (visto al volver de modo avión). Era el resaltado de foco de Android: `accessible` volvía al
    avatar (72 × 80) enfocable y, fuera del modo táctil, tomaba el foco. `AvatarCaminante` ahora es decorativo y no enfocable (`focusable={false}`,
    oculto para el lector, como el mapa); los datos los leen las tarjetas. Causa deducida por la medida del cuadro, sin emulador: falta confirmarlo en pantalla.
* **Corregido 2026-11-07 (la carrera se pausaba al cerrar la app en el teléfono del dueño).** Honor, Huawei, Xiaomi/Redmi/POCO, Oppo/Realme/OnePlus, Vivo/iQOO y Samsung cierran del todo una app quitada de recientes si no está en «Sin restricciones»; el servicio del GPS no lo evita (en el emulador no se pausa). El código de la carrera no cambia. **Antes de la ubicación y de la cuenta 3, 2, 1**, solo en Android y solo en esas marcas (la misma `marcaDelTelefono` de `guiasPorMarca`, sin lista nueva), el anfitrión muestra **una vez por cuenta en este teléfono** (`renaser.carrera.guiaBateria.<cuenta>`; si el almacenamiento falla, no se muestra) la hoja `HojaGuiaDeBateria` (`HojaDesdeAbajo`): «Para que tu carrera siga con la app cerrada», la línea de la marca de `guiasPorMarca`, el botón dorado **«Revisar»** (abre `abrirGuiaDeLaMarca` y, al volver la app, sigue a la cuenta) y **«Ahora no»** (sigue en el acto); cerrar la hoja es «Ahora no». Otras marcas y la web: flujo idéntico. Sin animación, íconos, dependencias ni código nativo. Pruebas: `guiaDeBateriaDeLaCarrera`, `guiaDeBateriaEnLaCarrera`, `anfitrionConGuiaDeBateria`. **Hace falta un APK nuevo** (solo JavaScript). Sin backend nuevo. **Sin comprobar en un teléfono real** de esas marcas.
* **Corregido 2026-11-05 (mapa, pedido del dueño en su teléfono; rama `042-mapa-rapido-y-diagonal`).** (1) **El mapa sale en la cuenta 3, 2, 1**: antes esperaba
  el primer punto del GPS (5–30 s en frío). Se centra con la última posición conocida, la aproximada (`mayShowUserSettingsDialog: false`: si no, Android tapaba
  la cuenta con su diálogo) o el primer punto crudo del GPS (`servicios/centroDelMapa`, **solo para mirar: nunca entra a la ruta ni a la distancia**), y la
  pantalla de correr se monta detrás de la cuenta (dorado al 86 %, solo el mapa se ve) para que al terminar el «1» sea el mismo mapa. (2) **Cámara en diagonal**:
  67,5°, acercamiento 18,5 y el avatar en el tercio de abajo (`mapPadding`). (3) **Cambia la decisión de «sin botón 2D/3D»**: un botón redondo de 48 arriba a la
  derecha del mapa («2D» / «3D», «Ver el mapa en 2D/3D», `tacto.seleccion()`) pasa a la vista desde arriba (0°, rumbo hacia arriba, avatar al centro) en 400 ms
  (en el acto con «reducir movimiento») y se recuerda por cuenta en el teléfono (`renaser.carrera.vistaDelMapa.<cuenta>`). Solo con el mapa de Google, corriendo y
  en la pausa automática; «Terminaste» sigue igual. Jest `mapaRapidoYDiagonal` y `centroDelMapaNoSeMide`. Solo JavaScript: hace falta un APK nuevo.
* **Corregido 2026-11-06 (el mapa en frío, pedido del dueño: «todavía tarda unos 3 s»; rama `042-mapa-aun-mas-rapido`).** Al verse la fila de «Kilómetros diarios»
  se adelanta todo (`servicios/calentarLaCarrera`): Google Maps se calienta con un mapa de 1 × 1 invisible una vez por proceso (`CalentadorDelMapa`), el peso y el sexo
  se leen ya (una sola lectura compartida) y la ubicación también (solo con el permiso ya dado); el último centro mostrado se guarda en el teléfono
  (`renaser.carrera.ultimoCentroDelMapa`, solo para mirar). La cuenta ya no espera al servicio del GPS (~0,7 s), un velo del color de la tarjeta tapa el gris de
  carga, y `mapPadding` va recién con el mapa listo (antes se caía con «setPadding on a null object»). En el emulador, en frío: de 1,5 s en blanco tras el «1» a 0 s.
  Cancelar en la cuenta mientras el GPS arranca lo detiene igual (`detenerGps(true)`). Jest `mapaAunMasRapido`. Solo JavaScript: hace falta un APK nuevo.
  **Privacidad (decisión del coordinador, 2026-11-06):** cerrar sesión borra ese centro guardado y lo adelantado (`borrarCentroGuardadoDelMapa`, desde
  `apagarLaCarreraAlSalir`), para que en un teléfono compartido la cuenta que entra no vea dónde corrió la anterior. Jest `alarmasDeLaCuentaAlSalir`.

> **Nota del arnés (2026-11-06).** El párrafo de abajo estaba suelto en `AGENTS.md`, justo debajo del título
> de las reglas y fuera de cualquier entrada. Es de la spec 042 (la carrera con GPS) y se movió aquí tal cual.

* **Decisión del dueño (05/11): cerrar la app NO pausa la carrera** («Seguir grabando», como Strava, Nike Run y adidas Running). Mientras esté la
  notificación «Carrera en curso», la carrera sigue (servicio en primer plano con `killServiceOnDestroy: false` y la tarea `renaser-carrera-gps`
  definida al cargar la app). Comprobado en el emulador con la ruta simulada: botón Inicio, 60 s → sigue sumando; **cerrar desde recientes**, 90 s →
  la notificación sigue y al reabrir retoma corriendo con lo recorrido mientras estuvo cerrada; **forzar detención** → al reabrir vuelve «En pausa» sin
  contar el tiempo muerto (FR-006). Las marcas que matan la app al deslizarla (Xiaomi, Huawei, Honor) caen en este último caso. No se pausa sola al
  cerrar: mucha gente cierra las apps por costumbre mientras corre y perdería esos km.
* **Corregido 2026-11-07 (un salto de GPS ya no bloquea los puntos siguientes, issue #156).** `alPunto` descartaba como «salto» todo punto a más de 25 km/h del
  último aceptado y dejaba el ancla (`ultimoCrudo`) donde estaba: si el ancla era la rara (último fix conocido viejo al empezar, un fix por wifi a 300 m, o la persona
  se movió durante la pausa), todos los puntos siguientes se descartaban para siempre (distancia 0,00 y la pausa automática no seguía; solo «Seguir» a mano la
  destrababa). Ahora el motor recuerda los descartados (`saltoCandidato`, `saltosSeguidos`, `saltoDesdeMs`, opcionales: un estado guardado antes los lee como
  ausentes); si 3 puntos seguidos, o 5 s, son coherentes entre sí (≤ 25 km/h de uno a otro), reancla en el último: segmento nuevo, sin sumar el salto a la distancia,
  a `metrosSinGps`, a los tramos ni a la ruta, y la pausa automática sigue al moverse. Un atípico aislado se sigue descartando y el siguiente punto normal lo olvida.
  Prueba: `utils/__tests__/saltoDeGps.test.ts`. Hace falta un APK nuevo (solo JavaScript).
* **Corregido 2026-11-07 (la ruta cruzaba las casas tras un corte; issue #161).** El mapa dibujaba toda la ruta como UNA Polyline, así que cualquier corte
  (seguir tras una pausa, un hueco largo, un hueco corto con distancia estimada por pasos, o el reanclaje tras un salto de GPS) quedaba unido por una recta que atravesaba
  las manzanas. `PuntoDeRuta` suma `corte?: 'pausa' | 'hueco'` en el primer punto de cada segmento nuevo (`'pausa'`: seguir, hueco largo, reanclaje; `'hueco'`: hueco corto
  estimado); un estado guardado antes no lo tiene y se lee como un solo segmento. `utils/segmentosDeLaRuta` parte la ruta y `MapaDeCarrera` (también el mapa de «Terminaste»)
  dibuja una Polyline dorada por segmento (#B2924F, 6); entre segmentos no hay nada tras un corte `'pausa'`, y tras `'hueco'` un conector punteado y tenue (3, `[6, 8]`, dorado al 50 %)
  para que se vea que es una estimación. No cambian la distancia, las notificaciones, el envío al servidor (ignora `corte`) ni la cámara 2D/3D. Pruebas: `cortesDeLaRuta`,
  `segmentosDeLaRuta`, `rutaPorSegmentos`. Hace falta un APK nuevo (solo JavaScript). Sin comprobar en el teléfono.

## Corrección — 2026-11-10 — Kilómetros diarios: una caminata normal cuenta (#172)

El dueño reportó que «Kilómetros diarios» no grababa bien o no notaba las caminatas. Causas leídas en el código y corregidas (sin cambiar
lo que se ve):
* **Caminar contaba como estar quieta.** La regla era «se mueve si en 10 s avanzó más que 1,5 × la precisión»: con 10 m de precisión había
  que ir a más de 5,4 km/h. Ahora también se mueve si la **velocidad que mide el GPS** (mediana de los últimos puntos) llega a 0,6 m/s y el
  avance pasa un margen menor (4 m o media precisión). Parada, con el GPS que tiembla, sigue sin sumar.
* **El sistema mataba la app a mitad de camino y la carrera quedaba en pausa.** Si la levanta la tarea del GPS, la carrera sigue (el rato
  sin latidos es un hueco de GPS); solo queda en pausa cuando la abre la persona tras tenerla muerta.
* **Los pasos recientes** cuentan 10 s en vez de 3 s (el sensor los entrega en tandas).
Pruebas: `motorDeCarrera.test.ts` (#172) y `carreraLevantadaPorElGps.test.ts`. Falta confirmarlo caminando con un teléfono real.
