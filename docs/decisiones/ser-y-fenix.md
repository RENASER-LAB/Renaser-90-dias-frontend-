# SER (el acompañante), el orbe, el fénix y las celebraciones

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-09-26 — tab `Hoy`, la foto de una ACCIÓN del día desde el acompañante (D-178 del backend)

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

## Corrección — 2026-10-31 — la guía de arranque de SER ya no se monta sobre el panel de SER (issue #50)

E2E del 29/10: con una cuenta sin el Pacto firmado, la guía de arranque (`SparkieOverlay`, la burbuja «✳ SER») apareció encima
del panel de SER y su «Ahora no» no respondía (solo el «atrás» la cerraba). Dos causas en el código, ambas arregladas; no cambian
diseño, textos, ni la secuencia saludo → primer post → Pacto. Lo que cambia y nada más:
* **La guía espera al panel.** El panel y la guía son dos `Modal` y en Android el que se crea después queda encima. El panel de SER
  (`RenasiaPanel`, el del botón flotante, el orbe de Hoy y el botón del curso) se anota mientras está a la vista
  (`renasia/state/panelDeSerAbierto`, un contador como `chatEnPantalla`) y la tarjeta de la guía no se dibuja mientras haya uno:
  no se minimiza ni se pierde, vuelve al cerrar el chat. Mientras tanto no intercepta el «atrás» (es del panel). Una guía
  que espera sigue contando como capa obligatoria (D-218): un aviso del teléfono sigue esperándola.
* **Una guía pospuesta no se reabre sola.** `SparkieOverlay` volvía a abrirla ante CUALQUIER cambio de `estado.paso`, y
  `useArranqueGuiado` cae en «ninguno» ante cualquier lectura fallida (lo más común al volver de la cámara o de segundo plano) y
  vuelve a «publicar» en la lectura siguiente. Ahora solo la reabre un avance real («publicar» → «firmar el Pacto»), o entrar con
  otra cuenta (`sparkie/utils/tarjetaDelArranque`, puro).
* **Las lecturas del arranque se ordenan.** Si dos quedaban en vuelo (el sondeo de 8 s y el regreso de segundo plano), la que
  llegaba última pisaba a la más nueva. Ahora solo escribe la más reciente, y firmar el Pacto anula las que ya habían salido.
* **No comprobado todavía en el emulador:** el toque muerto de «Ahora no» sobre el panel se atribuye a la ventana apilada y deja de
  poder ocurrir con el panel; con la guía sobre otro `Modal` (no el panel) no se probó. Flujo de Maestro listo:
  `.maestro/guia-de-ser/01-la-guia-no-tapa-el-panel.yaml`. Pruebas: `guiaYPanelDeSer`, `lecturasDelArranque`, `tarjetaDelArranque`
  y `panelDeSerAbierto`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Cambio por pedido del dueño — 2026-11-02 — SER al día con la lógica nueva y para las tres formaciones (spec 038)

Textual: «Lo de cumplir hábito, su lógica, y SER también puede hacerlo: ¿sabe de estos cambios? Ahora no pide foto, pero SER debe ayudar con lo que tenemos. Cada
cambio debe ser de acuerdo a lo de ahora: no ayudará a Plan como antes, ya que no podrá, o saldrá error»; y «SER estará para las 3» (Escuela, Diplomado y
Certificación). La mayor parte es del **backend** (prompt, herramientas, V160; `specs/038-ser-al-dia/` y D-311 del backend). En la app cambia solo esto, sin
diseño nuevo ni dependencias:
* **Un ritual que pide SER se escribe, no se fotografía.** La tarjeta del chat y la hoja del orbe de Hoy (`TarjetaFotoDeHabito`, `AccionDelAcompanante`) leen el pedido
  con `conPregunta` en un hábito como «ritual: se escribe» (`seRegistraEscribiendoElPedido`, `renasia/utils/pedidosDeFoto`; una acción del día nunca lo es). Su botón dice
  **«Escribir cómo me siento»** (con lápiz en la hoja del orbe) y abre la MISMA hoja de Training, `RegistroDeRitualConTexto` (evidencia TEXTO y cierre con la respuesta,
  que emite `habitoCumplido`), montada dentro del panel de SER y en Hoy (`useRitualPorTexto`). Así también las tarjetas que ya estaban en un chat, de cuando se pedía la
  cámara, pasan a escribir. Registrada, la tarjeta dice «Listo, quedó registrado tu ritual.». Los demás hábitos con foto siguen con «Tomar foto».
* **Rótulos de esas tarjetas en tipo oración y en segunda persona** («Evidencia de tu hábito», «Evidencia de tu acción», «Registro de tu ritual», «Tomar foto», «Tu día ya
  cerró…»; antes «EVIDENCIA DE TU HÁBITO», «TOMAR FOTO» y «Su día ya cerró…»).
* **Cumplir un hábito con SER hace lo mismo que cumplirlo en Training (issue #33).** `POST /renasia/propuestas/{id}/confirmar` devuelve, si la propuesta cumplió un hábito
  (Despertar, Dormir, Última comida, un opcional…), `habitoCumplido {registroId, habitoId, fecha, puntos}`, y `confirmarPropuestaRenasia` emite `habitoCumplido` con ese dato
  **antes** de avisar a Training y a Hoy que recarguen: se apagan las alarmas de ese hábito que le quedaban a ese día (`atenderAlCumplirUnHabito` → `alCumplirElHabito`),
  sale la celebración con sus puntos y se refresca el semáforo y el fénix. El campo es opcional y tolerante: un backend anterior, una propuesta que no cumple un hábito o un
  dato mal formado no emiten nada. **Límites aceptados:** la Pastilla, la Audioterapia y la Clase por SER siguen sin avisar (cierran por su propio camino), y una respuesta
  repetida (doble toque) trae solo el texto.
* **«Última comida del día» lleva el círculo en todos los entornos** porque el backend (V160) la deja con evidencia opcional; la app no cambió (ya decidía por el dato).
* **Política de privacidad (`public/privacidad/index.html`)**: declara que el diagnóstico inicial completo (ingresos, emociones, situación personal) llega al proveedor de IA
  para responderte, que la memoria del acompañante no guarda dinero personal y que SER no lee los pagos; ya no promete el Mapa ni fija «90 días». Prueba: `paginaPoliticaDePrivacidad`.
* **Pruebas:** Jest `ritualPorSer`, `propuestaCumpleUnHabito`, `tarjetaDelRitualPorSer`, `useRitualPorTexto`, `ritualPorSerEnLasPantallas` y la de la política de privacidad.
  Maestro, escrito y sin correr: `.maestro/ser-al-dia/`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y **el backend con la spec 038 antes** (V160 y `habitoCumplido`). Sin él, los rituales
  por SER siguen abriendo el registro por texto, pero cumplir con SER no apaga alarmas.
* **Para cuando se integren 036 y 037:** el día 0 («tu programa empieza mañana») y los km con pasos conectados (SER no pide foto y manda al «Registrar» de la fila) se
  programan al integrarlas; ver `specs/038-ser-al-dia/` del backend.
  > **Corregido 2026-11-02 (integración de las formaciones).** Esos dos pendientes (T020 y T021 de la spec 038) son **del servidor** y no cambian la app: en el día 0 SER
  > dice que el programa empieza mañana, con la fecha y el plazo de la formación, y no habla de día ni de fase; `proponer_plan_del_dia` exige que el programa haya
  > empezado; y en KILÓMETROS DIARIOS con medición automática SER no pide foto sino que manda al «Registrar» de la fila de Training (la fila y su pantalla son de la
  > spec 037, ya en la app). La app solo dibuja lo que el servidor le manda, así que ni la tarjeta del chat ni la hoja del orbe cambian.

## Corrección — 2026-11-02 — SER: el texto de respaldo de las propuestas ya no queda encima de la tarjeta ni repetido al releer el historial (issue #105)

E2E final del 2026-11-02 (capturas `B4-ser-ritual-tarjeta` y `B4-ser-historial-recargado`). El backend manda antes de cada evento un texto de respaldo para las
apps viejas —«Propuesta: …», «Foto para registrar '…': …» y, para los rituales, «Para registrar '…' cuenta como te sientes: …»— y esta versión dibuja la tarjeta, así que
los quita. Fallaban tres cosas, todas en `renasia/utils/propuestas` (ahora con las reglas en `respaldosDelBackend`, que `propuestas` re-exporta). Lo que cambia y nada más:
* **Se quitan estén donde estén y aunque vengan varios seguidos.** Antes solo si iban al FINAL del mensaje: con dos respaldos seguidos (el de la foto o el del ritual
  y después el de la propuesta) el de la propuesta quedaba como texto encima de la tarjeta. Ahora se compara línea por línea (cada respaldo es una línea) y se quita la
  línea completa de cualquier lugar; lo que no es EXACTAMENTE esa línea no se toca (mejor repetido que borrar algo que dijo el asistente).
* **El respaldo del ritual tiene quien lo quite** (`quitarRespaldoDeFoto` lo reconoce junto al de la foto del hábito y al de la foto de la acción del día), y el de la foto
  ya no depende de «subela desde Hoy»: vale «desde Hoy» y «desde Training» (el servidor ahora dice Training). `destino` se acepta pero ya no distingue una forma de otra.
* **Tolerante a las tildes** (el backend los va a corregir, #63): la comparación es sin tildes, sin mayúsculas, con los espacios juntos y con las comillas tipográficas
  como rectas, así que «súbela», «botón», «cámara», «acción» y «cuenta cómo» valen igual que las formas sin tilde.
* **Al releer el historial**, lo guardado trae los respaldos adentro y sin tarjeta (la propuesta ya venció o se resolvió) y una vez salió el mismo «Propuesta: …» dos
  veces en la misma burbuja: `mapearMensajeApi` aplica `sinRespaldosRepetidos` a los mensajes del asistente, que deja UNA sola vez cada línea de respaldo. Una propuesta
  guardada una sola vez se deja como estaba (ya sin botones, pero es lo que se dijo); lo que escribió la persona no se toca.
* **La voz tampoco lee el del ritual** (`voz.ts` usaba un filtro propio que solo conocía «Propuesta:» y «Foto para registrar»; ahora usa `esLineaDeRespaldo`).
* **No cambian** las tarjetas, los textos del asistente, el backend ni el stream. **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire).
* **Pruebas:** `respaldosDelBackend.test.ts` (con los textos reales de `B4-SER-respuestas.txt`: ritual, kilómetros, última comida, dos seguidos, en medio, tildes, Hoy y
  Training, y el historial repetido), `respaldosEnElChat.test.ts` (el hook: llegada con dos respaldos seguidos y relectura del historial) y `propuestas.test.ts`.
