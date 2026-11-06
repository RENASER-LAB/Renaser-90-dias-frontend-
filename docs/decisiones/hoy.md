# Hoy: tarjetas, frase del día, semáforo y lo que Hoy muestra

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-09-25 — tab `Hoy`, tarjeta del semáforo

* **Excepción autorizada por el dueño del producto — 2026-09-25 — tab `Hoy`, tarjeta del semáforo.**
  Autorizada junto con el diseño del semáforo de cumplimiento del aprendiz (D-168; el contrato vive
  en el backend, `docs/arquitectura/SEMAFORO_DEL_APRENDIZ.md`). El alcance es **solo** la tarjeta
  del semáforo, entre *Hábitos de hoy* y *Acciones y objetivos*, y el detalle que abre:
  > **Corregido 2026-10-31 (pedido del dueño).** La tarjeta del semáforo y su detalle ya no están en Hoy: pasaron a Yo (en el lugar del
  > gráfico «Tu cumplimiento»), con las mismas reglas. El aviso del sábado entra por Hoy y abre el detalle en Yo (`abrirSemaforo`). Ver
  > la entrada del 2026-10-31.
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
    > **Corregido 2026-10-29 (spec 018).** Esta tarjeta y la de tickets se fueron de Hoy: el resultado por grupo es la lista de
    > «Mis mentores» y la bandeja, su fila «Consultas de mentores». El aviso `/semaforo/grupos` sigue abriendo este resumen.
  Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
  vuelve a necesitar autorización explícita.
    > **Corregido 2026-10-31 (punto 16).** Las escuchas de estos avisos ya no viven en `HoyScreen`: `/semaforo`, `/mentor/groups/{g}/semaforo`,
    > `/mentor/groups/{g}/learners/{a}` y `/semaforo/grupos` entran por `navigation/abrirAviso.ts`, que lleva a **Yo** con un parámetro
    > (`abrirSemaforo`, `abrirSemaforoDelGrupo`, `abrirAlumno`, `abrirSemaforoPorGrupos`) que Yo consume una sola vez. «Mi grupo» y la
    > ficha esperan al padrón del grupo; el resumen por grupos abre «Mis mentores» al líder y el semáforo de Administración a quien
    > administra. No esperan a las capas obligatorias, como antes.

## Decisión del dueño del producto — 2026-09-27 — semáforo: los días con la cuenta suspendida no se miden (backend D-209)

* **Decisión del dueño del producto — 2026-09-27 — semáforo: los días con la cuenta suspendida no se
  miden (backend D-209).** El dueño eligió «Que no se midan». El servidor manda esos días con un estado
  nuevo, `CUENTA_SUSPENDIDA`, y la app lo nombra **«Cuenta en pausa»** (`estadoDelDiaEnPalabras`), en la
  misma fila de 16 px que los otros estados («Nada programado», «En pausa»…): el detalle del semáforo
  (estado de `Hoy`), las barras de su tarjeta y la tarjeta del semáforo de un aprendiz en mentoría y
  administración. Sin porcentaje ni color, como todo día que no se mide. **APK publicado:** no lo
  conoce y lo lee como «Sin datos», neutro, sin romper la pantalla (`aEstadoDelDia` lee `estado` como
  texto abierto; verificado contra `origin/master`). Nada más de `Hoy` cambia.

## Excepción autorizada por el dueño del producto — 2026-09-27 — tab `Hoy`, cifra de «Hábitos de hoy» (S-9 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, E-257)

* **Excepción autorizada por el dueño del producto — 2026-09-27 — tab `Hoy`, cifra de «Hábitos de hoy»
  (S-9 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, E-257).** Sin datos
  (`habitosHoy` null) la tarjeta ya no dice «Al día»: no muestra cifra (`features/home/utils/cifrasDeHabitos.ts`).
  Nada más de `Hoy` cambia.
> **Corregido 2026-11-02 (spec 035).** La bienvenida de abajo es ahora **una por formación**: la pantalla suma el control «Escuela · Diplomado ·
> Certificación» y cada una tiene sus mensajes y su portada. Lo demás de esta entrada vale para la formación elegida. Ver «identidad por formación».

## Cambio por pedido del dueño — 2026-10-05 — tab `Hoy`: íconos, tipo oración, respuesta al tacto y el día real en el Mapa

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
    > **Corregido 2026-10-31.** Coherencia (`gauge`) y la racha (`flame`) ya no se dibujan en Hoy: el dueño quitó el bloque
    > porque está en Yo. Los íconos siguen en `Icon.tsx` y Yo los usa.
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

## Cambio por pedido del dueño — 2026-10-19 — tab `Hoy`: la tarjeta del semáforo con el mensaje del día y el sticker del búho

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
    > **Corregido 2026-10-31.** La tarjeta (con este mensaje y su búho) ya no está en Hoy: pasó a Yo, en el lugar del gráfico «Tu
    > cumplimiento». El mensaje se dibuja igual (`MensajeDelSemaforo` dentro de `TarjetaSemaforoHoy`) y sale de `/home` como siempre.
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

## Cambio por pedido del dueño — 2026-10-29 — tabs `Hoy` y `Plan`: hábito y Radar en una tarjeta, y las acciones de hoy por eje (spec 016)

* **Cambio por pedido del dueño — 2026-10-29 — tabs `Hoy` y `Plan`: hábito y Radar en una tarjeta, y las acciones de hoy por
  eje (spec 016)** (spec, vista previa aprobada y decisiones del dueño en `Renaser-90-dias-backend/specs/016-hoy-y-plan/`;
  pedido sobre la vista previa: «así bro, pero más centrado, para que sea CX/UX» —Hoy, opción A «Lado a lado»— y «el de acá,
  el B, creo que me agrada más; procede y la spec» —Plan, opción B «Por eje»—). Lo que cambia y nada más:
  * **Hoy — «Hábitos de hoy» y el Radar en una tarjeta** (`features/home/components/TarjetaHabitoYRadar`, en el lugar de la
    tarjeta de hábitos, después del Mapa): dos mitades **iguales** —ícono con el rótulo y su chevron, una línea de estado,
    título y detalle; la fila las estira a la más alta— con una línea fina entre las dos.
    > **Corregido 2026-10-29 (el dueño, sobre la captura: «esto alineado como estaba antes, que se vea mejor»).** Decía «al
    > centro a lo ancho y a lo alto». Ahora el contenido de las dos mitades va a la izquierda y arriba, como la tarjeta
    > «Hábitos de hoy» de antes: los renglones de una mitad quedan a la altura de los de la otra. Con la letra grande del sistema (`fontScale` > 1,15) pasan una debajo de la otra y nada se corta. Mitades de 48
    o más. Responden al dedo con el fondo lavado de oro, **no** con la escala de `Presionable` (una mitad que se hundiera
    dentro de una tarjeta de bordes comunes se vería rota); **sin movimiento propio** (es lo más visto de Hoy y lo que cambia
    tiene que leerse en el acto). Izquierda: la de siempre (cifra, hábito de esta hora, lo que queda) → Training. **Se borró
    la tarjeta aparte del Código Renaser** (`TarjetaCodigoRenaser`), que en los días 1 a 7 iba primera: la mitad la reemplaza
    y no se duplica.
  > **Corregido 2026-10-30 (spec 019).** Las «horas elegidas» de la tabla de abajo ya no se eligen: son las que el servidor calcula con el
  > Despertar y el Dormir de hoy (Automático) o las repartidas por «Veces al día» (Personalizado). Cambia el texto de la mitad: apagado
  > «Cada hora entre tu Despertar y tu Dormir. Es opcional.»; encendido sin hora pendiente «Próxima a las 20:00» con `05:30 a 22:30 · 17 veces`
  > (ya no «Hoy respondiste 2 de 3»: eso está en la hoja); hoy sin Radar «Toca para ver tu horario.»; y la hoja «Tu Radar de hoy» dice el
  > horario y las veces en su subtítulo y «Abrir Mi Radar» (era «Cambiar mis horas»). El resto de la tabla sigue igual.
  * **La mitad del Radar** (qué dice y qué hace, en `radar/utils/mitadDelRadar.ts`, sin React):
    | Cuándo | Dice | Al tocarla |
    |---|---|---|
    | Días 1 a 7, hora pendiente | «Código Renaser · 13:00 · Innegociable» (o «Abierto»), «¿Dónde estás ahora mismo?», cuándo cierra | el formulario de siempre, **obligatorio** para el aprendiz (`RadarContext.abrir`; el que se abre solo y por encima del navegador no cambió) |
    | Días 1 a 7, hora registrada | «Registrado», «Listo por esta hora. El siguiente a las 14:00.» | hoja «Ya lo registraste»: lo respondido y cuándo es el siguiente |
    | Antes del primer registro del día | «En espera», «El primer registro del día es a las 08:00.» | nada (no es un botón) |
    | Día 8 o más, Mi Radar apagado | «Mi Radar · Apagado», «Planifica tu Radar» | Yo → Mi Radar (`abrirMiRadar`) |
    | Encendido, una hora elegida pendiente | «Mi Radar · 14:00 · Tu hora», «Responde hasta las 15:00» | el formulario ahí mismo (`CodigoRenaserModal`, **se puede cerrar**, pie de Mi Radar) |
    | Encendido, esa hora ya registrada | «Registrado», «La siguiente a las 20:00.» | hoja «Ya lo registraste» |
    | Encendido, sin hora pendiente ahora | «Encendido», «Próxima a las 20:00», «Hoy respondiste 2 de 3.» | hoja «Tu Radar de hoy»: las horas de hoy con su estado (Respondida 09:04 / Sin registro / Es tu hora / Prevista), «Registrar ahora» si se puede y «Cambiar mis horas» → Yo → Mi Radar |
    | Encendido, hoy sin Radar | «Hoy no tienes Mi Radar» | Yo → Mi Radar |
    | Sin Día 1, backend sin Mi Radar (404/403), Mi Radar sin poder leerse, o **mientras no se sabe** | nada: queda solo la mitad de hábitos, a todo el ancho | — |
    Lo que sigue a una hoja (el formulario, Yo) espera a que la hoja se vaya del todo (`alTerminarDeCerrar`, como las de
    Training). «Registrar ahora» solo aparece cuando el servidor lo aceptaría; si no, dice por qué («Hoy no tienes Mi Radar»,
    «Mi Radar funciona de 03:00 a 23:59.», «Ya registraste esta hora»).
    > **Corregido 2026-10-31 (pedido del dueño).** La columna «Dice» ya no incluye la línea de abajo («Cinco preguntas, un minuto…»,
    > «Responde hasta…», «Listo por esta hora. El siguiente a las 14:00.»…): quedan el rótulo, el estado y el título. Lo que hace cada
    > mitad al tocarla no cambia.
  * **Una sola lógica, sin duplicar**: las horas de hoy y la hora en curso salen de `resumenDeMiRadarHoy` (`utils/miRadar.ts`,
    sobre `horasDelDia`), que ahora usa también `useMiRadar` de Yo; el envío es el de `RadarContext` (`radar.enviar`: el mismo
    `POST /radar` y el mismo 409 que se relee y se da por registrado); `HOY_SIN_RADAR`, `FUERA_DE_HORARIO` y el pie del
    formulario viven en `utils/miRadar.ts` (las pantallas los siguen exportando).
  * **Sin pedidos nuevos que se repitan** (`radar/hooks/useRadarEnHoy`): los días 1 a 7 lee lo mismo que ya leía
    (`/radar/latest`, por `RadarContext`) y **no** el historial, salvo cuando se abre una hoja; desde el día 8 usa la lectura
    de Mi Radar de `RadarContext` y, solo con Mi Radar encendido, el historial de siempre (`GET /radar/history`, el de Yo → Mi
    Radar). Al volver a Hoy relee en silencio lo respondido (pudo responderse desde Yo) y, si Mi Radar no se había podido
    leer, lo intenta otra vez. **Mientras no se sabe qué hora está respondida no se dibuja la mitad** (la misma regla del
    2026-10-19: «Tu hora» sin saberlo es el parpadeo que ya costó arreglar).
  * **Plan — «Tus acciones de hoy», por eje** (`objetivos/components/TarjetaAccionesDeHoyPorEje`): **se quitó el arco
    «Día 20 de 90»** (`ArcoDelDia` y su prueba se borraron: nada más lo usaba). En su lugar, arriba de «Fase actual», una
    tarjeta con «Tus acciones de hoy · 2 de 6», el subtítulo «Jueves 29 · día 20 de 90» (la fecha de las acciones, el día de
    `/home`; lo que no se sabe no se inventa), una barrita por acción y una fila por eje que tenga acciones hoy, **en el orden
    de las prioridades** (el principal primero): ícono del eje (`iconoDelEje`), «n de m», un símbolo por acción y «Sigue: X ·
    16:00», «Se te pasó: X» o «Todo cumplido». Los símbolos tienen forma, no solo color: ✓ cumplida (`checkCircle`), círculo
    vacío pendiente, reloj «se te pasó la hora» (`clock`) y candado si espera a la verde por Pareto (`lock`).
    > **Corregido 2026-10-29 (mismo día, tras el E2E).** El reloj y «Se te pasó: X» iban en rojo y la hoja decía «todavía
    > puedes registrarla hoy». Ahora van en dorado y la hoja dice «Se te pasó la hora · todavía puedes cumplir tu
    > compromiso», como Training (pedido del dueño: lo atrasado no habla de puntos, invita a cumplir). «Registrar en
    > Training» no abría la acción: al volver a Training se relee de cero y el pedido se buscaba en la lista todavía vacía;
    > ahora se busca en lo que trajo `useTraining` (lo mismo para el aviso del teléfono que abre un hábito).
    Reglas (`objetivos/utils/accionesDeHoy.ts`): cumplida manda sobre todo; una bloqueada por Pareto es candado aunque su hora
    haya pasado; **«se te pasó» es solo «pendiente y su hora ya pasó»** (Training es más generoso: una acción queda atrasada
    cuando llega la hora del siguiente ítem del día, hábitos incluidos, y Plan no lee los hábitos); la que sigue es la primera
    sin cumplir en orden de hora, sin contar las que esperan a la verde. Sin acciones hoy: «Hoy no tienes acciones agendadas.
    Agéndalas desde tus objetivos: toca una prioridad clave y elige «Agendar mis acciones».».
    > **Corregido 2026-10-31.** Esta tarjeta ya no existe: las acciones del eje elegido salen en «Acciones que mueven la meta» (hoy y
    > las que vienen), y tocar una de hoy sigue llevando a Training con `abrirAccionId`. Ver la entrada del 2026-10-31.
  * **La hoja de un eje** (`HojaDesdeAbajo`): sus acciones de hoy con hora, nombre, estado en palabras («Cumplida 10:14»,
    «Pendiente», «Se te pasó la hora · todavía puedes registrarla hoy», «Se abre al completar la primera») y su símbolo, y
    fijo abajo «Registrar en Training». **Plan solo muestra:** el botón no registra nada, lleva a Training con
    `abrirAccionId` —la acción que sigue de ese eje—, cuando la hoja ya se fue. `TrainingScreen` consume ese parámetro una
    vez (como `abrirHabitoId`): si la acción sigue entre las de hoy la abre como al tocar su fila; si no, Training queda en
    su lista. Es lo único que cambia en Training.
  * **Una lectura por visita** (`objetivos/hooks/useAccionesDeHoy`): `GET /rocks/today`, la misma que Hoy y Training ya
    hacen, cada vez que Plan vuelve al foco (y al volver de Objetivos, porque la tarjeta solo existe en la vista principal).
    Con un fallo conserva lo último que leyó y ofrece «Reintentar».
  * **No cambian**: «Fase actual», «Prioridades clave», «Arquitectura de tiempo», la vista de Objetivos, las demás tarjetas
    de Hoy, el formulario de los días 1 a 7, los avisos, Training (salvo `abrirAccionId`), Yo, Comunidad ni la barra.
    Sin dependencias nuevas ni backend nuevo.
    > **Corregido 2026-10-31.** «Arquitectura de tiempo» salió de Plan; el resto de esta lista sigue (hasta el rediseño de Plan del
    > mismo día, más abajo).
  * **Anotado, no inventado**: la vista previa decía «Pendiente · en 20 min» en la hoja del eje; no hay regla para ese
    umbral y no se dibuja. Tampoco había diseño para «En espera» (antes del primer registro de los días 1 a 7) ni para el día
    sin Radar: llevan los textos de arriba (los de la tarjeta de antes y los de Yo → Mi Radar).
  * **Hace falta un APK nuevo** (la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-10-30 — tab `Hoy`: la sección del fénix sin el vacío de arriba y de abajo

* **Cambio por pedido del dueño — 2026-10-30 — tab `Hoy`: la sección del fénix sin el vacío de arriba y de abajo**
  (textual, sobre una captura: «acá podemos optimizar esta parte, en la parte de arriba mucho espacio, podemos
  optimizar sin reducir el tamaño»). Lo que cambia y nada más:
  * **La sección mide lo que ocupa** (`styles.hero` de `HoyScreen`): tenía alto fijo (`rs(252)`, o `rs(206)` en pantalla
    baja) con el contenido centrado y 12 de relleno, y sobre ~206 de contenido quedaban entre 23 y 35 dp en blanco
    arriba y otros tantos abajo, además de los 28 de siempre entre secciones. Ahora no tiene alto, ni centrado, ni
    relleno: el aire por arriba y por abajo es el de siempre entre secciones, igual por los dos lados. Medido en el
    emulador a 411 dp (de la letra del texto a la del vecino): arriba de «Tu acompañante» de 73 a 38 dp y debajo de
    «Toca y háblame» de 65 a 30 dp (70 dp menos en total).
  * **El fénix no cambia de tamaño** en ninguna pantalla: el diámetro (140; menor en un teléfono angosto o bajo, como ya
    era) sale de la misma cuenta, ahora en `home/utils/diametroDelOrbe` y fijada contra la fórmula anterior por
    `hoyEspacioDelFenix.test.ts`. No se tocaron `OrbeAcompanante`, el `.riv`, el área de toque, la etiqueta accesible ni
    el aire entre el rótulo, el ave y el rótulo de la fase (10 o 14: el ave se dibuja 14 px fuera de su área de toque y
    ese aire le deja sitio).
  * **«Terminar» no reserva su alto** (52 px): reservarlo dejaría en blanco, en reposo, justo lo que se pidió quitar. Con
    la sección anclada arriba, el ave y su rótulo no se mueven cuando aparece «Terminar» o cambia la fase (antes,
    centrada con alto fijo, el ave subía 26 dp, la mitad de los 52 de «Terminar»); lo que crece es lo de abajo (la tarjeta
    del Mapa baja 52 dp), como ya lo hace la caja de «Tú: …» y la respuesta.
  * **Dos retoques por lo mismo**: el rótulo de la fase deja más ancho (relleno lateral de 24 a 8) para no pasar de una a
    dos líneas con letra grande a mitad de la conversación, y la caja de la conversación (`conversacionVoz`) queda a 16 de
    lo de arriba (era 12), porque ya no hay blanco propio que la separe.
  * **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). No cambian los otros tabs ni nada más
    de Hoy.

## Cambio por pedido del dueño — 2026-11-01 — tab `Hoy` (y Plan): la frase siempre, el programa propio en una fila y la fecha de inicio

Pedido del dueño del 1/11 con capturas de Hoy de una cuenta del personal sin programa propio: «recuerda la frase y abajo va ese de los 90 días con
menos texto, el tamaño que antes de coherencia y racha bro, y luego el fénix… ok bro que salga pese que no inició su programa» y, sobre quien ya
eligió su Día 1: «¿y por qué no le salió cuándo empezar? eso es un bug». Todo es de la app, sin backend. Cada punto es un commit aparte de la rama
`hoy-frase-y-dia-uno`. Lo que cambia y nada más:
* **La frase del día sale siempre** (`TarjetaConfrontacion`, con su raya dorada): también sin día de programa (personal sin programa, Día 0 y quien no
  eligió su Día 1). Con día de programa es la de siempre. **Sin día de programa se elige por la FECHA del calendario** (`fraseDelDia(dia, fechaDeHoy)`):
  `f(fecha)`, derivada y sin guardar nada (nueve frases, días seguidos dan frases seguidas). **Supuesto:** `/home` no manda la fecha de hoy, así que es el día
  civil del teléfono (`fechaLocalISO`); aquí no corre el riesgo de E-91 (no hay contador): un huso distinto solo cambia cuál de las nueve toca. Hoy da la fecha
  solo cuando ya se sabe si hay día de programa (`/home` respondió o falló), para que quien sí lo tiene no vea primero la del calendario y se le cambie.
  Sin día ni fecha sigue sin dibujar nada.
* **El programa propio es una fila compacta y sube**: justo debajo de la frase y antes del fénix (`FilaDelProgramaPropio`, sobre `components/FilaCompacta`),
  del alto que tenía Coherencia / Racha (72 de mínimo), toda tocable, título en negrita (16), una línea corta en dorado, chevron, **sin botón dorado**. Es la
  misma fila compacta que ya usaba la tarjeta de acciones («Define tu objetivo de 90 días en Plan»), que ahora comparte el componente. Reemplaza a la tarjeta
  grande «Tu programa · Hacer mi programa de 90 días · Puedes recorrerlo tú también… · Elegir mi Día 1 / Ahora no» (`EntradaAlProgramaPropio`), que **Yo
  conserva** (y Training conserva su invitación). Textos (`programa/utils/filaDelPrograma`, pura):
  | Estado | Título | Línea | Al tocar |
  |---|---|---|---|
  | Sin fila en el programa y el servidor dice que puede empezar | «Haz tu programa de {plazo}» | «Elige tu Día 1» | el selector del Día 1 de siempre; con una ✕ «Ahora no» |
  | Con fila, sin Día 1 elegido | «Todavía no elegiste tu Día 1» | «Elige cuándo empiezas» | el selector del Día 1 |
  | Eligió su Día 1 y la fecha no llega (día 0) | «Tu programa empieza el martes 3 de noviembre» | — | nada (sin chevron) |
  | Esperando y el servidor no mandó la fecha | «Tu programa empieza pronto» | — | nada |
  `{plazo}` es «90 días», «3 meses» o «1 año» según SU programa (`plazoDelObjetivo`, el mismo con que se nombra el objetivo grande). «Ahora no» se conserva como
  una **✕ chica de 48 de área** a la derecha, fuera de la fila tocable, y hace lo mismo que el botón de antes: deja de ofrecer la invitación a esa cuenta en
  ese teléfono, sin borrar nada. Si una lectura falló, en su lugar va el aviso de siempre «No pudimos comprobar tu Día 1» con «Reintentar Día 1». Igual en todos los
  roles y formaciones: lo decide el servidor (`canStartProgram`, `activated`). **Ningún pedido nuevo en Hoy**: las mismas lecturas que hacía la tarjeta.
  > **Corregido 2026-11-02 (spec 036, D-309).** Ya no se elige el Día 1: el programa empieza siempre mañana. La tabla de arriba dice ahora «Haz tu programa de
  > {plazo} · **Empieza mañana**» (sin fila) y «**Todavía no empezaste tu programa** · **Empieza mañana**» (con fila sin activar); el aviso de error es «No pudimos comprobar
  > tu programa» con «Reintentar». Al tocarlas se abre «Tu programa empieza mañana» (ver la entrada del 2026-11-02). «Tu programa empieza el …» (día 0) no cambia.
* **Sin hueco vacío antes del fénix**: el bloque entre la frase y el fénix solo existe si tiene algo que dibujar (la fila, la tarjeta de acciones o el error de `/home`).
  Vacío dejaba sus dos separaciones de 28 (`gapLg`) y a la cuenta sin programa le quedaba un hueco grande entre «Escuela Renaser» y «Tu acompañante». Si hay fila y
  también tarjeta de acciones, la fila va primero. Para saberlo antes de dibujar, el hook `useFilaDelProgramaPropio` vive en Hoy (y en Plan), no dentro de la fila.
* **BUG (issue #72): quien ya eligió su Día 1 y espera no veía cuándo empieza.** El Día 1 nunca puede ser hoy (`ActivarProgramaScreen`), así que todo aprendiz recién
  activado pasa al menos un día en el día 0; desde el 31/10 Hoy ya no tiene la cabecera de fase y día y ningún texto decía «empieza el…» (Training lo decía solo si
  faltaba más de un día). La fecha **ya la entrega `GET /onboarding/activate-program`** (`startDate`), que Hoy ya leía con `useDiaUnoPorElegir` (solo inscrito y día 0):
  no hace falta backend. `useArranqueDelPrograma` suma `fechaInicio` al estado `EN_CURSO` cuando la fecha es posterior a hoy (empieza mañana: el programa ya cuenta como
  «en curso» para planificar, D-103, pero la fecha se dice), y `useDiaUnoPorElegir` expone `esperando` y `fechaInicio`. Una fecha de hoy o pasada no se dice (D-90): «pronto».
  La fecha se escribe con `formatearFechaLarga` (español, sin pasar por UTC).
* **Plan lleva la misma fila**, arriba de todo y sin hueco si no hay nada que decir: mismo hook, mismo componente, misma función pura (un solo lugar para los textos; una
  prueba vigila que Hoy y Plan no los repitan). **Plan suma lecturas que antes no hacía**, las mismas que Hoy: las capacidades (`GET /mentor/context`, que ya leen Hoy,
  Yo y Comunidad) y la del programa personal solo para el personal, y `GET /onboarding/activate-program` solo con `inscrito` y día 0. Quien ya está en su programa no ve
  nada nuevo en Plan.
* **No cambian**: Yo (conserva la tarjeta grande), Training, las reglas de quién puede empezar un programa, el selector del Día 1, `TarjetaAccionDeHoy` en sus estados
  (solo comparte la fila), el diagnóstico pendiente, los demás tabs, ni el backend. Sin animaciones nuevas (`Presionable` y la `Aparicion` que ya tenía el bloque), sin
  íconos nuevos (`calendarRange`, `close`, `chevron`), sin dependencias ni código nativo.
* **Pruebas:** Jest `fraseDelDia` y `tarjetaConfrontacion` (la frase por calendario), `filaDelPrograma` (los textos y la fecha en español), `filaDelProgramaPropio` (los tres
  estados con el hook real, por rol y por formación, la ✕, el selector, el error), `filaCompacta`, `hoyFilaDelPrograma` y `planFilaDelPrograma` (el orden y el cableado). Se
  ajustaron `hoyIconosYTextos`, `panelesDeRolEnYo` y `hoySinMapaConDiagnostico`. Maestro, escrito y sin correr: `.maestro/hoy-programa-propio/01-fila-del-programa-en-hoy-y-plan.yaml`
  (`ESTADO` = `sin-programa` | `sin-dia-1` | `esperando`).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.
