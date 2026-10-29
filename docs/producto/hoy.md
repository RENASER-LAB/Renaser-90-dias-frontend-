# Hoy — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

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

## Cambio por pedido del dueño — 2026-10-05 — tabs `Hoy` y `Yo`: ajustes al rediseño

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

## Cambio por pedido del dueño — 2026-10-05 — tab `Hoy` (y los rótulos de toda la app): la fase sin inventar, el rótulo de sección sin espaciado y el cierre del Mapa

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

## Excepción autorizada por el dueño del producto — 2026-09-30 — tab `Hoy`, el orbe con la voz en vivo como una conversación abierta

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

## Decisión del dueño del producto — 2026-09-27 — semáforo: los días con la cuenta suspendida no se miden (backend D-209).

* **Decisión del dueño del producto — 2026-09-27 — semáforo: los días con la cuenta suspendida no se
  miden (backend D-209).** El dueño eligió «Que no se midan». El servidor manda esos días con un estado
  nuevo, `CUENTA_SUSPENDIDA`, y la app lo nombra **«Cuenta en pausa»** (`estadoDelDiaEnPalabras`), en la
  misma fila de 16 px que los otros estados («Nada programado», «En pausa»…): el detalle del semáforo
  (estado de `Hoy`), las barras de su tarjeta y la tarjeta del semáforo de un aprendiz en mentoría y
  administración. Sin porcentaje ni color, como todo día que no se mide. **APK publicado:** no lo
  conoce y lo lee como «Sin datos», neutro, sin romper la pantalla (`aEstadoDelDia` lee `estado` como
  texto abierto; verificado contra `origin/master`). Nada más de `Hoy` cambia.

## Excepción autorizada por el dueño del producto — 2026-09-27 — tab `Hoy`, cifra de «Hábitos de hoy» (S-9 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, E-257).

* **Excepción autorizada por el dueño del producto — 2026-09-27 — tab `Hoy`, cifra de «Hábitos de hoy»
  (S-9 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, E-257).** Sin datos
  (`habitosHoy` null) la tarjeta ya no dice «Al día»: no muestra cifra (`features/home/utils/cifrasDeHabitos.ts`).
  Nada más de `Hoy` cambia.

## Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Hoy`, la foto de una ACCIÓN del día desde el acompañante (D-178 del backend).

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

## Cambio por pedido del dueño — 2026-10-06 — tab `Hoy` (el centro) y SER: el fénix

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

## Cambio por pedido del dueño — 2026-10-07 — tabs `Hoy`, `Training` y `Yo`: pantalla completa para los momentos grandes

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

## Cambio por pedido del dueño — 2026-10-07 — tab `Hoy` (el centro): el fénix se mueve al escucharte, pensar y hablar

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

## Excepción autorizada por el dueño del producto — 2026-09-25 — tab `Hoy`, tarjeta del semáforo.

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
