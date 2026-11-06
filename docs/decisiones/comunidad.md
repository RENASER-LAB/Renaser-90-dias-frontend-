# Comunidad: Muro, chat, Tribu, Eventos, Cursos y Ranking

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-09-22 — tab `Comunidad`, pestaña *Tribu*

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

## Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Comunidad`, pestaña *Tribu* y chat (dos pedidos del dueño de ese día)

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
    > **Corregido 2026-11-02 (spec 035).** La comunidad es el fénix solo mientras su formación no tenga una imagen propia; con ella, la del
    > servidor (`photoPath`) y el fénix debajo. Ver la entrada «identidad por formación», arriba.
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

## Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Comunidad`, `Yo` y `Plan`, eventos, avisos y alarmas (E-4 a E-10 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, y §9 con las decisiones del dueño de ese día)

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

## Cambio por pedido del dueño — 2026-10-05 — tab `Comunidad` → Eventos: el logo del servicio junto al «dónde»

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

## Cambio por pedido del dueño — 2026-10-06 — tab `Comunidad` → Eventos: «Quién respondió» y «Pasar lista» (backend D-256)

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

## Cambio por pedido del dueño — 2026-10-29 — tab `Comunidad` → Ranking: «TÚ» y «Tu posición» solo por id

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

## Decisión del dueño — 2026-10-30 — Mentoría del Alquimista solo con semáforo verde (sin cambios en la app)

Textual: «en eventos, si eres aprendiz solo te saldrá la mentoría con alquimista si tienes semáforo verde». El filtro es 100 % del
servidor (backend spec 020, D-293, cierra D-213): lista, calendario, «Mi agenda», «Próximo evento» de Hoy, detalle, «Voy» y avisos. La app no
cambia ni suma textos: un aprendiz sin verde deja de recibir la mentoría en `GET /calendar/events` y en `/home → proximoEvento`; si abre
su detalle recibe el 403 de siempre («Este evento ya no está disponible…»), y la alarma local de un «Voy» se quita sola en la
siguiente lectura (`planDeSincronizacion`). No hace falta APK nuevo. Flujos de Maestro: `.maestro/mentoria-semaforo/`.

## Cambio por pedido del dueño — 2026-10-31 — tab `Comunidad` (Muro) y Administración: ocultar y eliminar publicaciones, solo ADMIN y ALCHEMIST

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
    > **Corregido 2026-11-03 (el dueño: «ya no está como antes»; captura de Administración con el filtro «Todas»).** El «…» **sí seguía en el código**
    > y `puedeModerar` seguía llegando a la tarjeta (`ComunidadScreen` → `usePuedeModerarElMuro`); no lo quitó la fusión de las formaciones. Lo sacaba
    > de la pantalla **la cabecera**: la caja del autor (foto + nombre) no tenía tope y medía lo que midiera el nombre en una línea. Con un nombre
    > largo («Lisette Pierina Camones Aparicio») empujaba la insignia «Día 1» y, detrás de ella, el «…» —el último de la fila— **fuera de la tarjeta y de
    > la pantalla**. Ahora (`TarjetaPublicacionMuro`, estilos `cabecera`, `autor`, `autorTextos`, `insigniaYModerar`): el autor ocupa lo que sobra
    > (`flex: 1`, `minWidth: 0`), el nombre va en hasta **dos líneas** (`numberOfLines={2}`, «…» si aun así no cabe) y «grupo · hace cuánto» en una; la
    > insignia del día y el «…» van en una mitad que **no se achica** (`flexShrink: 0`), con 8 de aire entre las dos mitades. El «…» sigue arriba a la
    > derecha, junto a la insignia, de 48 de área táctil y solo para ADMIN y ALCHEMIST (rol + `canAdminister`, sin cambios). Un nombre corto se ve igual
    > que antes. Prueba: `tarjetaDelMuroCabecera.test.ts` (sin chip de formación, el nombre cede, la insignia y el «…» comparten la mitad que no cede, y el
    > «…» de punta a punta para ADMIN, ALCHEMIST y quienes no lo ven). **Sin emulador en esta corrida**: falta confirmarlo en pantalla. **Hace falta un
    > APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.
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

## Cambio por pedido del dueño — 2026-11-04 — Eventos: el enlace de Meet lo crea el servidor, con una cuenta de Google de Renaser (spec 040, D-321)

Pedido del dueño («procede»; spec, decisiones y contrato en `Renaser-90-dias-backend/specs/040-meet-automatico-en-eventos/`). Hasta hoy quien creaba un evento pegaba a mano el
link de Meet. Ahora el formulario puede pedir que el servidor lo cree (Calendar API, cuenta `renasercorporation@gmail.com`, calendario propio «Renaser 90 días»). **Todo
nace apagado** (`eventos.meet` en Soporte TI) y **no se prende en producción hasta pasar SC-001** (una reunión de más de 60 minutos con 3 o más personas en la cuenta real).
Lo que cambia y nada más (el aprendiz, el mentor y el líder no ven ninguna pantalla nueva, SC-007):
* **Formulario de eventos** (`SeccionDelEnlaceDeMeet`, dentro de `FormularioDelEvento`; solo ADMIN y ALCHEMIST): un interruptor **«Crear enlace de Meet»** («Renaser lo crea al
  guardar el evento.») **en el lugar del campo del link**, que se esconde al encenderlo (y el lugar también). Debajo, con el interruptor encendido, **«Quién puede entrar»**:
  **Abierta** («Se entra directo, sin esperar.», viene marcada) o **Con permiso** («Tú admites a cada persona.»). Solo se ofrece si `GET /calendar/events/meet/status` dice que se
  puede (`useDisponibilidadDeMeet`): mientras no se sabe, con 404/403, sin red o apagado **no se dibuja** (nunca una opción que después responde 409 o 404). Un evento que ya
  usaba el enlace lo conserva a la vista aunque el servidor ya no lo ofrezca, y una línea dice por qué («Hay que volver a conectar la cuenta de Google…»). Sin animación nueva.
* **El cuerpo** (`armarCuerpo`): encendido manda `crearEnlaceMeet: true` y `accesoSalaMeet`, tipo `MEET` y **sin** `locationValue` (pedir el automático y pegar un link a la vez es un
  400 del servidor); lo que haya en «Link» o «Lugar» no viaja. **Editar un evento que ya lo usa lo vuelve a mandar**, o el servidor lo entendería como «ahora es un link pegado»
  y borraría sus salas: por eso «Editar evento» **espera** a leer el evento fresco (`useMeetDelEvento`, `GET /events/{id}`, que es el que trae `meet`) y se apaga mientras tanto o si
  esa lectura falla («No pudimos leer el estado del enlace de Meet. Vuelve a abrir el evento en un rato.»). Apagado, el cuerpo es **idéntico al de siempre** (FR-020).
* **Detalle del evento**: para ADMIN y ALCHEMIST, si algo de la sala quedó sin terminar, la frase corta del servidor (`meet.mensaje`: «No pudimos crear el enlace de Meet.», «El enlace
  de Meet todavía se está creando.»…) y **«Reintentar»** (`POST /events/{id}/meet/retry`); al lograrlo se relee la lista y aparece el enlace. En un evento que se repite, «Cada fecha
  tendrá su propio enlace.» (el formulario de la app no edita eventos que se repiten). «Unirme» y todo lo del aprendiz **no cambian**: el enlace de cada fecha llega en el
  `locationValue` de su ocurrencia.
* **Yo → Administración → Más opciones → «Cuenta de Google»** (`integraciones-google/`, `CuentaDeGoogleAdminScreen`; sigue la disponibilidad de la gestión de eventos): sin
  credenciales en el servidor lo dice y no ofrece conectar; **«Conectar cuenta de Google»** abre Google en el navegador (`POST /admin/integraciones/google/connect` da la dirección)
  y **no da nada por conectado** hasta que la app vuelve al frente y relee; ya conectada muestra el correo, desde cuándo, el último uso, el último problema, las **últimas acciones**
  (en palabras, con quién, con «Salió bien» / «No salió» además del color) y «Volver a conectar» / «Desconectar» (con confirmación que dice que los enlaces ya creados siguen
  funcionando). Si la cuenta está revocada lo dice y ofrece volver a conectarla. **Nunca se muestra ni viaja un permiso o un token.**
* **Política de privacidad** (`public/privacidad/index.html`): nueva fila «Google (Calendar y Meet)» en los proveedores: solo el nombre del evento, el día, la hora y la duración; no
  el nombre, el correo ni quiénes van. **Debe publicarse antes del APK.**
* **FR-021 (la puerta de los 60 minutos) no deja ningún aviso en la app**: si la prueba SC-001 muestra que Google corta, se para y se avisa al dueño; si no corta, no hay texto de
  ningún tipo. Una prueba vigila que ningún texto del formulario hable de 60 minutos ni de cortes.
* **No cambian**: los demás tabs, la barra, el resto del formulario (nombre, tipo, día, hora, duración, portada, aviso), las alarmas de «Voy», la asistencia, ni ningún permiso (los decide el
  servidor). Sin dependencias nuevas ni código nativo.
* **Pruebas:** Jest `enlaceDeMeetAutomatico` (el cuerpo y los textos), `meetApi` (disponibilidad, «Reintentar» y el resumen tolerante), `enlaceDeMeetEnElFormulario` (el formulario y el
  detalle), `cuentaDeGoogle`, `useCuentaDeGoogle` y `cuentaDeGoogleEnAdministracion`, y la de la política de privacidad. Maestro: no se escribió ninguno (SC-001 y el Meet real los
  prueba el dueño con su cuenta).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) **y el backend de la spec 040 antes** (V169); contra uno anterior «Crear enlace de Meet» no se ofrece
  (404) y todo queda como hoy.

> **Corregido 2026-11-05 (decisión del dueño: «el Meet se crea solo y los demás entran sin tanto ajetreo en el móvil, mucha configuración arruina la experiencia»).**
> Lo del formulario y del cuerpo de arriba ya no es así. (1) **Ya no hay interruptor «Crear enlace de Meet» ni «Quién puede entrar»**: la sala es **siempre abierta** (el servidor
> pide `accessType=OPEN` y lo lee de vuelta) y la app **no manda `accesoSalaMeet`**; `ResumenDeMeet` ya no tiene `acceso` (un `acceso` que llegue se ignora). (2) En su lugar,
> **«Dónde es»** (`DondeEsElEvento`, que reemplaza a `SeccionDelEnlaceDeMeet`): dos opciones de 52, **«Por Meet (se crea solo)»** —**viene marcada**: un evento nuevo sin tocar nada
> pide la sala— y **«En un lugar»**, que muestra el campo «Dirección»; debajo, discreto (texto subrayado de 16 en un área de 48), **«Pegar otro enlace»** muestra el campo «Link de la
> reunión» de siempre (Zoom, Drive, un Meet que ya existe). Sin textos de ayuda en las opciones. El formulario guarda `donde: 'meet' | 'lugar' | 'enlace'` (`formularioDeEvento`).
> (3) Si el servidor no ofrece el Meet automático (apagado, sin cuenta, 404, sin red) no hay «Dónde es» y queda el formulario de siempre («Link de la reunión» u «O el lugar»):
> `dondeQueSeGuarda` lo guarda como `enlace`, así nunca se pide una sala que responde 409; mientras no se sabe, no se dibuja la parte del lugar (una sola lectura corta). Un evento
> que ya usaba el enlace sigue en «Por Meet» y dice por qué si el servidor dejó de ofrecerlo. (4) **«Unirme» ya era de un toque**: `Linking.openURL` con el enlace tal cual; un
> `https://meet.google.com/…` lo abre Android en la app de Google Meet si está instalada (enlace verificado de la app), sin pantallas intermedias. No cambió. Pruebas:
> `enlaceDeMeetAutomatico` (sin elegir nada el cuerpo pide la sala y no manda acceso; lugar; otro enlace; sin servidor), `enlaceDeMeetEnElFormulario` (Meet marcado, sin elección de
> acceso, lugar y otro enlace), `meetApi` y `reglasDeEventos` ajustadas. Hace falta el backend con esta corrección (un backend de la versión anterior también deja la sala abierta
> cuando no recibe el acceso).

> **Agregado 2026-11-05 (decisión 6 del dueño: «que el administrador o alquimista, jalando su correo, sea el que tenga permisos, y que el Meet ya venga grabando
> y transcribiendo»; backend FR-035 a FR-037, V171).** Todo lo hace el servidor: invita al evento de Calendar a quien crea o edita el evento (sin correos de Google) y
> pide que la sala grabe, transcriba y tome notas sola. En la app cambia **solo esto**: `ResumenDeMeet` suma `avisoDelPlan` (esquema tolerante: roto, vacío o ausente
> = `null`) y el detalle del evento, para Administración y Alquimista, muestra ese aviso en una línea de texto normal (no roja) cuando la cuenta de Google conectada no
> tiene el plan (por ejemplo «Para grabar hace falta Google One de 2 TB o más en la cuenta conectada; para transcribir, Google Workspace.»), **sin «Reintentar»** (no es un
> error: el evento y el enlace están bien; `avisoDelPlanDeGoogle` en `utils/enlaceDeMeet`). El aprendiz, el mentor y el líder no ven nada. Sin diseño, textos del
> formulario ni pantallas nuevas. Pruebas: `meetApi`, `enlaceDeMeetAutomatico` y `enlaceDeMeetEnElFormulario`. Hace falta un APK nuevo (solo JavaScript) y el backend
> con V171; contra un backend anterior no llega el campo y la pantalla queda igual.

## Cambio por pedido del dueño — 2026-11-04 — Recordatorios de eventos por el chat y por WhatsApp: la baja en Yo → Notificaciones y el aviso de finalidad (spec 041)

Pedido del dueño (textual): «Quiero lo mismo [que RenaserOs]… los recordatorios dentro del mismo chat y la app, y también con otro número que pondré». Spec, plan y decisiones en el backend
(`specs/041-recordatorios-de-eventos/`, D-322). **Casi todo es del servidor:** manda el recordatorio de cada evento (1 día, 1 hora, 30 y 10 minutos antes) como un mensaje del programa en el
chat de soporte de quien dijo «Voy» y, por WhatsApp (YCloud, con el número nuevo del dueño), a quien tiene su WhatsApp en la Ficha Inicial. La app solo suma lo que sigue; ningún tab cambia de forma.
* **Yo → Notificaciones suma «Recordatorios de eventos por WhatsApp»** (`alarmas/api/preferenciasDeNotificacion`, tema `whatsapp`, tipo `RECORDATORIO_EVENTO_WHATSAPP`), **al final de la lista**, **encendido de
  fábrica** (lo que no tiene fila en el servidor cuenta como encendido) y **solo si el servidor lo lista**: contra un backend anterior no se dibuja ni se lee la ficha. Es el único lugar de la app
  donde se apaga (la otra baja es el botón «No recibir más» del propio mensaje de WhatsApp o responder «BAJA»; las dos apagan esta misma preferencia en el servidor). **Apagarlo no toca «Eventos y clases»**
  (el aviso del teléfono y el mensaje del chat siguen): son dos preferencias distintas.
* **La fila dice a qué número se escribe** (`useWhatsappDeLosAvisos` sobre `leerWhatsappDelPerfil`, una lectura por visita; `alarmas/utils/whatsappDeLosAvisos`, puro): «Te escribimos al +51 9•• ••• •21.» (el número
  **enmascarado**, nunca entero, ni en pantalla ni en lo que oye el lector), o «Agrega tu WhatsApp en Editar perfil.» si la ficha no tiene uno con forma de número internacional (la misma regla que aplica el servidor:
  `+` y 8 a 15 dígitos). Mientras se lee, o si la lectura falla, la línea no se dibuja (no se afirma nada del número). La descripción de la fila dice cuándo llegan los avisos.
* **La Ficha Inicial dice para qué se usa el WhatsApp** (`onboarding/data/pasosFicha`, paso «WhatsApp principal», solo la `bajada`): «Por aquí te acompaña tu mentor y te recordamos tus eventos. Puedes darte de baja cuando
  quieras». Es el aviso de finalidad de la Ley 29733; no cambia el paso ni su validación.
* **La Política de privacidad** (`public/privacidad/index.html`) dice que el WhatsApp de la ficha se usa para recordar por WhatsApp los eventos a los que se dijo «Voy», **que YCloud y Meta procesan el mensaje** (con qué
  datos: el número, el nombre de pila, el nombre del evento, su fecha y hora, el enlace o el lugar y el nombre de la formación), cómo darse de baja (el botón, «BAJA», o el interruptor de Yo) y que **no se guarda el
  texto del mensaje ni lo que la persona responde, solo el estado del envío, 12 meses**. **Debe publicarse antes de sacar el APK** (sale con el deploy de Vercel).
* **Chat de Comunidad, sin cambios.** El mensaje llega como cualquier mensaje del programa («Formación Renaser», «Diplomado Renaser»…) con una línea «Entra aquí: https://…» o «Lugar: …». **Hallazgo, sin tocar:** la burbuja
  del chat dibuja el texto como texto plano, así que el enlace se ve pero no se toca; hacerlo tocable cambia el chat de todos los mensajes y necesita la autorización explícita del dueño para el tab Comunidad.
* **No cambian:** el formulario de eventos (no hay elección de WhatsApp por evento: a quién le llega es un valor del servidor), «Mi agenda», las alarmas locales de eventos, los demás avisos ni los otros tabs. Sin
  dependencias, íconos ni código nativo.
* **Pruebas:** Jest `recordatoriosDeEventosPorWhatsApp` (el tema, que solo se ofrece si el servidor lo lista, encendido de fábrica, que se guarda solo ese tipo, el número enmascarado y la fila), `fichaDiceParaQueSeUsaElWhatsapp`
  y `paginaPoliticaDePrivacidad` (la finalidad, YCloud y Meta, la baja, y qué no se guarda). Maestro: no se escribió ningún flujo (la fila es un interruptor como los de al lado; el envío real depende del número y de la
  plantilla que apruebe Meta, y se prueba a mano: SC-015 de la spec).
* **Hace falta un APK nuevo** para la fila de Yo (solo JavaScript: la app no se actualiza por aire) **y el backend con V166 a V168 antes**. Un APK anterior sigue funcionando: no ve la fila, y los mensajes llegan igual (el chat
  y el WhatsApp salen del servidor; la baja la cubren el botón y «BAJA»).

## Cambio por pedido del dueño — 2026-11-05 — tab `Comunidad` → Muro en lista compacta estilo Skool

El dueño autorizó explícitamente este cambio en el tab Comunidad, con un lienzo de referencia (estilo Skool): el Muro pasa de tarjetas
grandes a una lista compacta, y la tarjeta completa de siempre se ve al abrir una publicación. Solo JavaScript, sin backend. Lo que cambia y
nada más:
* **Cada publicación del Muro es una fila compacta** (`community/components/FilaCompactaDelMuro`, lógica pura en `utils/filaCompactaDelMuro`),
  sobre el fondo de tarjeta y separadas por franjas de 8 del fondo de pantalla:
  * **Cabecera:** su foto o sus iniciales (44), el nombre (16 semibold, hasta dos líneas, cede ante lo de la derecha) y, debajo en una línea,
    «grupo · hace cuánto» (13, `textSoft`). A la derecha, la insignia «Día N» de siempre (`diaPrograma`) y el «…» de moderación solo para
    ADMIN y ALCHEMIST (`usePuedeModerarElMuro`, sin cambios; abre la misma hoja).
  * **Cuerpo:** el texto a 15 px cortado a tres líneas y, a la derecha, la PRIMERA foto en una miniatura cuadrada de 66 (radio 10, `FotoMuro`);
    con más de una foto, la chapa «+N» (N = fotos − 1) abajo a la derecha, fondo oscuro translúcido y texto blanco de 12 en negrita. Sin fotos,
    el texto usa todo el ancho.
  * **Pie:** «me gusta» con su número (dorado y con relleno suave si ya lo diste; toca para dar o quitar, como siempre) y comentarios con su
    número (toca para abrir la publicación con los comentarios a la vista). Áreas de 44 o más. **No se dibuja «Nuevo comentario hace X»:** el
    feed no trae la fecha del último comentario (solo `commentCount`), y no se inventa. El número de comentarios sale de `commentCount`
    (`PostItem.cantidadComentarios`, nuevo, de `wallMappers`), o de los ya leídos si van por delante.
  * **Tocar la fila** (fuera de esos botones) abre la publicación. Una publicación que todavía se está subiendo no se abre ni se modera.
* **La publicación abierta** (`PublicacionAbierta`): pantalla completa DENTRO de Comunidad, encima de la lista, que queda montada debajo y por eso
  conserva su posición al volver. Cabecera «‹ Publicación» (`CabeceraAdmin`, volver de 48) y un solo scroll con la **tarjeta completa de siempre**
  (`TarjetaPublicacionMuro`, sin reescribir nada): texto entero, mosaico de fotos con «+2», reacciones, comentarios, compartir y moderación.
  Sin barra de pestañas ni el botón flotante de SER mientras está abierta (`OPCIONES_SIN_PESTANAS`, `marcarChatMontado`). El atrás del sistema
  vuelve al Muro, después de cerrar las hojas que se abren desde ella (reacciones, compartir). Si la publicación se oculta o elimina, se vuelve
  a la lista; cambiar de sección la cierra.
* **Tocar una foto** dentro de la publicación abre el visor de siempre (`ImageViewerModal`), con sus comentarios, sin cambios.
* **Sin animación nueva** (se toca decenas de veces por visita): el hundimiento de `Presionable` en la fila (0,985) y nada más.
* **No cambian:** crear publicación, el selector de formación, la moderación y su hoja, `AvisoDeAbajo`, la llegada desde Hoy a una publicación
  (`scrollToIndex`, ahora a su fila con borde dorado), Hoy, los demás tabs y el backend.
* **Pruebas:** Jest `utils/__tests__/filaCompactaDelMuro` (miniatura, «+N», sin foto, comentarios, etiquetas), `components/__tests__/filaCompactaDelMuro`
  (miniatura de 66, «+N», sin foto a todo el ancho, insignia del día, «…» solo para quien modera, abrir, comentarios, «me gusta», 44 de alto) y
  `screens/__tests__/muroCompactoEnComunidad` (la lista dibuja filas, la publicación abierta usa la tarjeta completa, el atrás y la barra); se
  ajustó `moderarElMuroEnComunidad`. Maestro, **escrito y sin correr** (el emulador estaba ocupado): `.maestro/muro-compacto/01-lista-y-publicacion-abierta.yaml`.
* **Corregido 2026-11-05 (pendiente del E2E): deslizar hacia abajo recarga el Muro.** La lista compacta suma `RefreshControl` (dorado del tema, bajo el
  encabezado): con publicaciones a la vista relee la primera página en silencio (`useWallFeed.refrescar` → `releerEnSilencio`: sin «Cargando el muro…», sin
  vaciar ni volver arriba, `refrescando` mueve el círculo); con la lista vacía o tras un error es la carga de siempre. Pruebas: `muroSeReleeAlModerar` y
  `muroCompactoEnComunidad`.

## Cambio por pedido del dueño — 2026-11-06 — el sobrenombre en el Muro (spec 046)

Pedido del dueño (06/11): desde el día 7 la persona elige un sobrenombre que reemplaza su nombre en el Muro, y Administración lo puede configurar o editar.
Spec, decisiones (D1–D9) y vista previa en el backend (`specs/046-sobrenombre-en-el-muro/`, D-331). **El dueño autorizó** tocar Hoy (la fila), Comunidad → Muro
(el nombre real para el equipo) y Yo → Ajustes → Perfil. Lo que cambia y nada más:
* **Hoy, desde el día 7** (`features/sobrenombre/`, `FilaDelSobrenombre`): bajo la frase, la fila compacta «Elige cómo te verán en el Muro · Tu sobrenombre ›» con «Ahora no» (✕);
  **«Ahora no» no la vuelve a mostrar** (D2, lo guarda el servidor) y después se elige solo desde Yo. Sale hasta que elija uno o diga «Ahora no» (no solo el día 7). Sin lectura
  del servidor no hay fila. Entra en el bloque de debajo de la frase sin dejar hueco.
* **La hoja** (`HojaDelSobrenombre`, `HojaDesdeAbajo`): el campo con su contador «n / 20», «Así te verán en el Muro. Tu mentor y el equipo siguen viendo tu nombre.», la vista previa de
  una publicación con el sobrenombre, «Guardar» y, si ya tiene uno, «Volver a mi nombre». Lo que rechaza el servidor (repetido en la formación, palabra prohibida, antes de los 30 días)
  se dice bajo el campo, sin diálogos; `tacto.logro()` al guardar. Sin animación nueva.
* **Yo → Ajustes → Perfil → «Sobrenombre en el Muro»**: abre la misma hoja; dice el sobrenombre o «Con tu nombre».
* **El Muro** muestra lo que manda el servidor: `authorName` ya es el sobrenombre (un APK anterior también lo ve). Al equipo (mentor, guía, líder, Administración, Alquimista, Soporte TI) le
  llega además el nombre real (`authorRealName` / `realName`) y se dibuja debajo en gris en la tarjeta, la fila compacta, los comentarios, el visor y «quién reaccionó». La foto se ve (D4).
* **Administración**: en la ficha de la persona, «Sobrenombre en el Muro» con «Cambiar» / «Ponerle uno» y «Quitar», con motivo (se le avisa a la persona sin el motivo, D7); y Más
  opciones → «Sobrenombres»: la lista con buscador y las palabras que no se pueden usar (agregar y quitar).
* **Pruebas:** Jest `reglasDelSobrenombre`, `sobrenombreEnElMuro` y `hojaYFilaDelSobrenombre`. Maestro: `.maestro/sobrenombre/01–04`.
* **Hace falta el backend con V181 antes y un APK nuevo** (solo JavaScript).

## Cambio por pedido del dueño — 2026-11-06 — Comunidad → Eventos: eventos para quien tú elijas, y el líder en el chat de soporte (spec 044, D-326)

Textual (resumido): «El líder de mentores puede agendar una sesión de Meet para un mentor o una persona específica, o para todos los de semáforo verde,
rojo o amarillo… también con el alquimista o administrador. Y el mentor también puede crear una sesión con todos sus alumnos, con alumnos específicos, o
por semáforo. Prioridad: los eventos y los recordatorios a los números específicos.» Spec, decisiones (P1 a P9) y contrato en el backend
(`specs/044-eventos-por-audiencia/`). Vista previa aprobada: https://claude.ai/artifact/EVHGP8P1mWqgwz7B7Nu3Uc. Lo que cambia y nada más:
* **Quién crea eventos** lo dice el servidor (`GET /api/v1/calendar/audience/options`, `useOpcionesDeAudiencia`), no una lista de roles: además de
  Administración y Alquimista, el **líder de mentores**, el **mentor** y la **guía de aprendiz** ven «Crear evento» (corrige la decisión del 26/09 de
  `permisosDeEventos.ts`, que ahora solo dice quién ADMINISTRA todo el calendario). El mentor y el líder solo eligen «Sesión especial» y «Encuentro
  espontáneo». Con el interruptor `eventos.convocar` apagado o contra un backend anterior, el formulario es el de siempre (para todos).
* **El formulario suma «¿Para quién es?»** (`components/audiencia/ParaQuienEs.tsx`), en el mismo scroll, entre «Dónde es» y la descripción: chips de 48
  con ícono y palabra de lo que el servidor ofrece (Todos, Mis alumnos, Personas, Grupos, Mentores, Por semáforo, Personal), que se suman. Por semáforo:
  Verde, Amarillo y Rojo con ícono, palabra, ayuda y la cifra de hoy (nunca solo color). Personas: «Elegir personas» abre una `HojaDesdeAbajo` con
  buscador al servidor (foto o iniciales, nombre, rol y grupo; nunca el semáforo; `ElegirPersonasHoja`); lo elegido queda en píldoras con su ✕.
  Personal: «Todo el personal» o por nombre. Al editar con colores, «Volver a calcular» (la foto del semáforo es la del día en que se guardó). Una nota
  dice «Tus invitados no ven por qué los elegiste ni a quién más invitaste». Sobre el botón, **«Llega a N personas»** («alumnos» para el mentor), que
  cuenta el servidor 300 ms después del último cambio (`useVistaPreviaDeAudiencia`). Abre en «Todos» para Administración, en «Mis alumnos» para el
  mentor y sin elección para el líder.
* **El detalle**: al invitado, «Te invitó Rocío, líder de mentores» (nunca el motivo ni el color). A quien lo creó o lo gestiona (Administración,
  Alquimista y el líder si lo creó uno de sus mentores), **«Para quién es · Solo lo ves tú»** con cada parte y su cifra («Rojo · Según el semáforo del 6
  de noviembre · 15», las personas por nombre) y «Llega a N personas»; y la sección Administrar de ESE evento (`ParaQuienEsDelEvento`). Un evento con
  audiencia elegida se lee fresco al abrirlo (`GET /events/{id}`), y se puede editar en la app.
* **Comunidad → Tribu**: la sección «Soporte · N» también se le muestra al **líder de mentores** (`veLaSeccionDeSoportes`), que desde la spec 044 está en
  el chat de soporte de los aprendices de su formación.
* **No cambian**: el resto de Eventos (calendario, tarjetas, «Mi agenda», «Voy» / «No voy», pasar lista), los demás tabs ni el chat. Sin dependencias
  nuevas, sin código nativo y sin animaciones nuevas (`Presionable` y el «tic» de selección).
* **Pruebas:** Jest `audienciaDelFormulario`, `audienciaSchemas`, `paraQuienEs` y `seccionDeSoportes`. **Hace falta el backend con la spec 044 (V182 y
  V183) y un APK nuevo** (solo JavaScript: la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-11-06 — la transcripción de las sesiones por Meet se guarda, cifrada y sin mostrarse (spec 047)

Textual: «el link es automático pero lo más importante: que puede ingresar cualquier persona si está abierto y se guarde la transcripción, igual que el repo que
te pasé guarda muy bien esa información, no mostrándola, pero que cumpla». Spec, plan y decisiones en el backend (`specs/047-transcripcion-de-eventos/`, D-332).
Decisiones del dueño: P1-A (nadie la ve en la app; ADMIN y ALCHEMIST la sacan desde el servidor con motivo), P2-B (transcripción y enlace a la grabación),
P3-B (6 meses), P4-B (una línea en el detalle del evento) y P5-A. **Casi todo es del servidor**; en la app cambia solo esto:
* **Comunidad → Eventos, el detalle** (autorizado por el dueño solo para esta línea): bajo «Es por Google Meet.», la línea **«Esta sesión se graba y se
  transcribe.»** (`AVISO_DE_GRABACION`, `Parrafo` de siempre, sin ícono ni animación), solo si el servidor lo afirma (`recordingNotice: true` en
  `GET /calendar/events/{id}`: Google confirmó que la sala graba o transcribe). Para que la vea el aprendiz, el detalle de un evento por Meet ahora se lee fresco
  para todos (`useMeetDelEvento` con `tipoUbicacion === 'MEET'`; antes solo para quien lo gestiona): un pedido más al abrir el detalle de un evento por Meet.
  El esquema es tolerante: cualquier cosa que no sea `true` es «no», y un servidor anterior no lo manda. **La transcripción nunca llega a la app.**
* **Política de privacidad** (`public/privacidad/index.html`): la sección «Las sesiones en vivo por Google Meet» (se graban y se transcriben, qué se guarda, para
  qué, que no se muestra ni se usa con IA, que va cifrada, quién puede sacarla y que se borra a los 6 meses), la fila de Google en «Con quién los compartimos» y
  una línea en «Cuánto tiempo los guardamos». **Debe publicarse antes de que Soporte TI prenda `eventos.meet.transcripcion`.**
* **No cambian**: el resto del detalle, la lista, el calendario, el formulario, los demás tabs. Sin dependencias ni código nativo.
* **Pruebas:** Jest `avisoDeGrabacion` y `paginaPoliticaDePrivacidad` (marcas `spec 047 FR-018`).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y el backend con V184. Contra un backend anterior la línea no aparece.
