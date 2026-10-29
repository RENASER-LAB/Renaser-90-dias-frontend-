# Comunidad (Muro, chat, Eventos, Cursos, Ranking, Tribu) — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

## Cambio por pedido del dueño — 2026-10-05 — tab `Comunidad` → Eventos: el logo del servicio junto al «dónde».

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

## Excepción autorizada por el dueño del producto — 2026-10-05 — tab `Comunidad` (chat): responder y copiar un mensaje, descartar una nota de voz, y la barra de escribir y las burbujas del rediseño

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

## Cambio por pedido del dueño — 2026-10-05 — tab `Comunidad`: íconos, «Cursos» y respuesta al tacto

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

## Cambio por pedido del dueño — 2026-10-06 — tab `Comunidad` (Classroom): sin Sparkie, el curso abre a SER

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

## Cambio por pedido del dueño — 2026-10-06 — tab `Comunidad` → Eventos: «Quién respondió» y «Pasar lista» (backend D-256).

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

## Excepción autorizada por el dueño del producto — 2026-10-02 — tab `Comunidad` → Tribu: los chats de soporte de Admin y Alquimista en una sección plegable

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

## Excepción autorizada por el dueño del producto — 2026-10-02 — tab `Comunidad`: el encabezado se esconde al desplazar

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

## Excepción autorizada por el dueño del producto — 2026-10-05 — tab `Comunidad`, tanda 2 de la propuesta de rediseño (hojas):

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

## Excepción autorizada por el dueño del producto — 2026-09-29 — tab `Comunidad` (chat): nombres de los chats y avisos de mensajes

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

## Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Comunidad`, pestaña *Tribu* y chat (dos pedidos del dueño de ese día).

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

## Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Comunidad`, `Yo` y `Plan`, eventos, avisos y alarmas (E-4 a E-10 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, y §9 con las decisiones del dueño de ese día).

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

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Comunidad`, pestaña *Tribu*.

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

## Cambio por pedido del dueño — 2026-10-19 — tab `Comunidad` → Ranking: «Descargar» la imagen del podio

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
