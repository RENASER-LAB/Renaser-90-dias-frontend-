# Soporte TI: interruptores, despliegue, roles personalizados y «ver como» (spec 002)

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Cambio por pedido del dueño — 2026-10-13 — los cinco tabs: aviso de mantenimiento cuando una funcionalidad está apagada (spec 002)

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

## Cambio por pedido del dueño — 2026-10-14 — los cinco tabs y Administración: lo no disponible se esconde, y la consola Soporte TI suma despliegue, roles personalizados y «ver como» (spec 002, fase 2)

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
