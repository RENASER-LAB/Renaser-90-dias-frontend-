# Yo: Ajustes, fase, evidencias, Caja, emergencia, perfil, cuenta y privacidad

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-09-16 — tab `Yo`

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

## Excepción autorizada por el dueño del producto — 2026-09-28 — tabs `Yo` y `Hoy`, Administración y las dos fichas del aprendiz: la Caja Renaser

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
    > **Corregido 2026-10-31 (punto 16).** El aviso del Admin abre ahora **Yo** → Administración → Caja Renaser → esa caja:
    > `abrirCajaAprendizId` lo lee `YoScreen` (si la cuenta administra; si no, lo descarta), no Hoy, que ya no tiene nada de Administración.
    > Lo mismo para «Ver ficha» desde la info de un chat (`abrirFichaAprendiz`). Sigue esperando a las capas obligatorias.
  * **Administración**: «Caja Renaser» en «Más» de la raíz (lista con pestañas por estado y conteo,
    buscador, «Descargar» la planilla), el detalle de cada caja (datos de envío, checklist, foto de
    la caja, formulario del envío, comprobante, carta, historial y un botón por acción) y «Contenido
    y carta» (la lista editable y el fondo de la carta). La ficha del aprendiz suma un chip con el
    estado de su caja que abre su caja.
  * **Ficha del mentor** (`AlumnoScreen`): el mismo chip, solo para mirar.
  * **Dependencias nuevas**: `expo-sharing` y `expo-file-system` (esta ya venía dentro de `expo`,
    ahora es directa): en el teléfono, «Descargar» guarda el archivo con la sesión y abre la hoja de
    compartir del sistema. Llevan código nativo: **hace falta un APK nuevo**.

## Excepción autorizada por el dueño del producto — 2026-10-02 — tab `Yo` y Administración: eliminar cuenta (backend D-243)

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

## Excepción autorizada por el dueño del producto — 2026-10-02 — tabs `Yo` y `Comunidad` (chat de soporte): el botón de emergencia

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

## Cambio por pedido del dueño — 2026-10-05 — tab `Yo` → Evidencia: la foto real en cada miniatura

* **Cambio por pedido del dueño — 2026-10-05 — tab `Yo` → Evidencia: la foto real en cada miniatura**
  (backend D-252). El dueño preguntó «¿Mostrar la foto real de cada evidencia en Yo?» y respondió «sí».
  Lo que cambia y nada más:
  * La tira de tres miniaturas de «Evidencia» y la grilla de «Registro de Evidencias» pintan la foto real
    (`evidence/components/MiniaturaDeEvidencia`, `expo-image`) encima del ícono del tipo, que sigue de
    respaldo: sin `fotoUrl` (texto, video, audio, o un backend anterior a D-252), con una URL que no es de
    la red, o si la foto no carga. La foto entra con un fundido de `DURACION_MS.fundido`.
    > **Corregido 2026-10-31 (pedido del dueño).** La tira de tres miniaturas de Yo se quitó; queda la grilla de «Mis evidencias»
    > (Ajustes → Tu proceso).
  * En la grilla del registro, tocar una foto la abre en grande en el visor que ya existía
    (`ImageViewerModal`, sin reacciones ni comentarios). En la tira, tocar sigue llevando al registro.
  * `fotoUrl` es opcional y tolerante en `evidenceSchemas.ts`; la clave de caché es la URL sin la firma
    (`evidence/utils/fotoDeEvidencia.ts`), la misma del visor. Ningún texto visible cambia; la foto
    ampliable se anuncia al lector de pantalla como «Ver la foto en grande».
  * **Hace falta el backend con D-252 y un APK nuevo** (la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-10-05 — tab `Yo`: Yo y el Centro de Perfil y Ajustes

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

## Cambio por pedido del dueño — 2026-10-06 — tab `Yo`: el animal de cada fase

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

## Cambio por pedido del dueño — 2026-10-06 — tab `Yo`: la tarjeta de fase «B · Tarjeta héroe» y las imágenes configurables

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

## Cambio por pedido del dueño — 2026-10-06 — tabs `Yo` y `Plan`: la misma fase en las dos

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

## Cambio por pedido del dueño — 2026-10-06 — tab `Yo` (Ajustes) y el ingreso: Política de Privacidad (backend D-245)

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

## Corrección — 2026-11-02 — Yo: sin fase ni semáforo antes del Día 1 ni sin programa (issue #102)

E2E final del 2026-11-02: a quien empieza mañana, Yo le decía «Fase 1 de 4 · Días 1–7 · Día 0 de 90 · Te quedan 6 días en esta fase» y «Tu semáforo ·
Sin datos · 0 de 7 días con datos»; al personal sin programa, lo mismo. `/home` manda la fase y el semáforo también antes del Día 1 y sin fila, y Yo los
dibujaba siempre que llegaran. Lo que cambia y nada más (`features/yo/utils/evolucionEnYo`, pura):
* **Con el programa en marcha (día 1 o más):** «Tu evolución» —la tarjeta de fase y el semáforo— como siempre.
* **Antes del Día 1 (activó su programa y espera):** en su lugar, UNA fila, «Tu programa empieza el martes 3 de noviembre» (o «pronto» sin fecha), la
  misma de Hoy, Plan y Training (`FilaDelProgramaQueEmpieza`). Sin fase, sin días que quedan y sin semáforo.
* **Sin programa** (`inscrito` falso: el personal sin fila) **o con la fila sin activar:** no se dibuja nada de «Tu evolución», ni siquiera el rótulo:
  un bloque vacío deja igual su separación del scroll (`gapLg`) y ese era el hueco. Yo ya tiene lo que corresponde (la invitación o «Todavía no empezaste
  tu programa», `EntradaAlProgramaPropio`). Mientras se comprueba cuál de los casos es, tampoco se dibuja nada (sin parpadeo). Si la tarjeta de fase y el
  semáforo faltan por otro motivo (fase desconocida, semáforo apagado), el rótulo «Tu evolución» tampoco queda suelto.
* **Sin pedidos nuevos:** Yo ya leía `/home` y `useDiaUnoPorElegir` (que antes solo usaba `porElegir`). No cambian Coherencia / Puntos / Racha, las filas ni Mi Radar.
* **Pruebas:** `evolucionEnYo.test.ts` (los cuatro casos y que `YoScreen` condiciona la tarjeta, el semáforo y el rótulo).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Cambio por pedido del dueño — 2026-11-03 — Yo → Ajustes → Perfil: sin biografía, sin la fila «Información» y con el WhatsApp de la ficha

Textual: «En perfil, en Yo, configuración, quitas biografía, y en editar perfil jalas los datos del número de WhatsApp que puso; agregas ese campo más.» Solo la app: **sin backend
nuevo**. Lo que cambia y nada más:
* **Se quita la «Biografía somática»** de Yo → Ajustes → Perfil → «Información» (ya no se pide, ni se muestra, ni se manda). El campo `bio` salió del usuario de la app (`User`, `UsuarioApi`, el esquema y el mapper), de `actualizarMiPerfil` y de la sesión de
  «ver como». **La columna del servidor no se toca** (`PATCH /users/me` ignora un `bio` que no llega: `null` significa «no cambiar»): lo que la persona escribió antes sigue guardado, solo que
  nadie lo pide ya.
* **Se quita la fila «Información»** de Ajustes → Perfil (decisión posterior del dueño, el mismo día): con la biografía fuera solo le quedaba el departamento, así que **«Departamento o área»
  pasó a «Editar perfil»**, debajo del WhatsApp, con el mismo campo y el mismo «Guardar cambios» (el mismo `department` de `PATCH /users/me`; un departamento vacío sigue sin borrar el guardado,
  como antes). Ajustes → Perfil queda con una sola fila, «Editar perfil», que dice «Nombre, foto, WhatsApp y departamento». Se borró la sub-vista `info_perfil` (su pantalla, su título en
  `navegacionDeYo`, su botón «Guardar información» y el aviso «Información guardada»); el atrás del sistema sigue subiendo un nivel: Editar perfil → Ajustes → Yo. El ícono `idCard` ya no se
  dibuja en Yo (queda en `Icon.tsx`: lo usan «Ver ficha» del chat y la ficha del líder).
* **«Editar perfil» suma el campo «WhatsApp»**, debajo del correo y ya lleno con el número que la persona puso en su ficha («WhatsApp principal»), con **el mismo control de la ficha**
  (`PhoneCountryInput`: la píldora del país que abre la hoja desde abajo con buscador, y el número solo con dígitos, con el largo máximo del país). El rótulo es el de los otros campos de la
  pantalla (15, medio). Mientras se lee, el lugar queda ocupado por una caja del mismo alto (52) que dice «Cargando…» (el selector de país parte del número que recibe, así que el campo no puede
  nacer vacío y cambiar después); si no se pudo leer, «No pudimos cargar tu WhatsApp.» con «Reintentar» (el resto del perfil se guarda igual y el número no se toca). Sin animación nueva.
* **De dónde sale y a dónde va: la misma respuesta de la ficha, sin duplicar el dato.** El número es la respuesta `whatsapp` de la Ficha Inicial (`respuestas_onboarding`, guardada como
  `"+51 987654321"`). Perfil la lee con `GET /onboarding/answers?flow=ficha_inicial` y la escribe con `POST /onboarding/answers` (upsert por persona y pregunta; el `id` de la pregunta sale del
  catálogo del servidor, nunca escrito a mano). Es la que lee la Caja Renaser (`FichaDeEnvio.CLAVE_CELULAR`: el «Celular» de los datos de envío en Administración → Caja Renaser), y cualquier otra lectura de
  la ficha, así que lo que se guarda en Perfil es lo que ven Administración y el acompañamiento (hoy ninguna otra pantalla de la app muestra el WhatsApp). No se usa `usuarios.telefono`: la columna
  existe pero el servidor no la mapea ni la lee en ningún lado. El pedido a `/users/me` no lleva teléfono.
* **Validación: la de la ficha.** La regla del paso «WhatsApp principal» (`validarWhatsapp`, en `pasosFicha`) la usan la ficha y Perfil, y el control solo deja escribir dígitos hasta el largo del
  país. **Vaciarlo no se guarda**: si ya había un número y el campo queda sin dígitos, o el número no cumple la regla, «Guardar cambios» muestra el aviso de la ficha («WhatsApp requerido»), marca
  el campo y **no guarda nada** (ni el nombre). Quien nunca tuvo uno (personal que no pasó por la ficha) y lo deja vacío no tiene qué guardar: su nombre o su foto no se le traban por eso.
  Un número que no cambió no se vuelve a mandar.
* **Cuándo se lee y cuándo se guarda** (`useWhatsappDelPerfil`): al abrir «Editar perfil», una vez por visita; una relectura no pisa lo que la persona ya escribió, una lectura vieja no pisa a
  una nueva y otra cuenta no hereda nada de la anterior. «Guardar cambios» guarda primero el perfil de siempre y después el número (`guardarElPerfil`); si el perfil se guardó y el número no,
  un diálogo lo dice («Tu nombre y tu foto sí se guardaron…») y al reintentar se vuelve a mandar todo (los dos pedidos son upsert).
* **Límite aceptado:** el servidor no valida el formato del WhatsApp (tampoco lo hacía para la ficha): la regla vive en la app. Si Soporte TI apaga la función `onboarding`, el campo avisa que no
  pudo cargar (las rutas de la ficha están bajo esa función).
* **Pruebas:** `whatsappDelPerfil` (de dónde sale, vaciarlo, la regla de la ficha), `guardarElPerfil`, `useWhatsappDelPerfil` (prellenado, relecturas, error, guardar), `campoWhatsappDelPerfil`
  (el control de la ficha prellenado, los tres estados) y `perfilConWhatsappSinBiografia` (ni `bio` en pantallas ni en pedidos; el campo en «Editar perfil», revisado antes de guardar).
  `navegacionDeYo`, `redisenoDeYo`, `barraDePestanasIconos` y `textosVerdaderosDeYo` se ajustaron (sin «Información»; el departamento en Editar perfil). Sin Maestro nuevo: no se probó en el emulador.
