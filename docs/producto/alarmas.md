# Alarmas y recordatorios — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

## Corrección autorizada — 2026-10-27 — los recordatorios de un hábito cumplido ya no suenan ese día (issue #33)

Pedido del dueño: «Despertar cumplido a las 06:00 y la alarma de las 06:30 suena igual; con avisos de 30, 10 y a la hora,
cumplir tras el primero no apaga los que faltan». El backend no es la causa (`AvisoHabitoService` no manda push de respaldo de
un registro terminado): es la alarma local. Las de un hábito se repiten solas (`DAILY` por antelación, o `WEEKLY` por día,
specs 007–009) y una alarma que se repite no deja saltar un día: cancelarla borra la de mañana, y dejarla puesta la deja sonar.
Al cumplir solo se cancelaban las repeticiones +5/+10 (spec 009). Lo que cambia y nada más:
* **Un hábito cumplido hoy no suena nada más ese día, y mañana suena normal.** Al confirmar el servidor el cierre
  (`alCumplirElHabito`, en `habits/notificaciones/repeticiones.ts`): (1) se anota que el hábito se cumplió en ese día
  (`cumplidoDeHoy.ts`, `renaser.habitos.cumplido.<cuenta>.<hábito>` = `{ dia, puenteDe }`; se borra al cerrar sesión);
  (2) se atiende como siempre (las repeticiones de hoy se cancelan y no vuelven); (3) si el hábito tiene alarmas en este
  teléfono y a ese día todavía le queda algún aviso, se lee `GET /habit-preferences` —lo mismo que lee la puesta al día— y se
  vuelven a poner SOLO las alarmas de ese hábito (`ajustarRecordatoriosAlServidor`), que con la nota reemplaza las que se
  repiten por un **puente**: una alarma de FECHA por cada aviso de los 7 días siguientes, saltando hoy
  (`utils/puenteDeAlarmas.ts`, puro; `ponerElPuenteSiHoyYaSeCumplio`). Mismo texto, canal, ruta y datos («cómo suena»,
  `data.alarma`). Si ya sonaron todos los avisos de hoy no se toca ninguna alarma (no se gasta el puente); un hábito sin
  alarmas en el teléfono no hace ningún pedido.
* **Identificadores.** En el esquema por día el puente usa los mismos de siempre, `habito-{id}-d{1..7}-{n}` (una ventana de 7
  días no repite ningún día de la semana); en el diario, el primer aviso lleva `habito-{id}-inicio` y los demás
  `habito-{id}-pte-{AAAAMMDD}-{n}` (una alarma de fecha por día no puede compartir identificador). Así el tag del push de
  respaldo del servidor (spec 007) sigue juntándose con la alarma en la bandeja, y volver al esquema normal con el mismo
  identificador REEMPLAZA la alarma en vez de duplicarla. Los ids del puente se guardan con los del hábito
  (`renaser.habitos.recordatorio.*`): `cancelar`, el cambio de sonido de Yo → Alarmas, `ponerLasAlarmasDeHabitosEnSuCanal`,
  el aviso agrupado (E-410), el rearmado de la spec 007 y `alarmasVivas` lo tratan como cualquier otra alarma de fecha.
* **Cómo se revierte.** La regla es «puente armado si y solo si el hábito se cumplió HOY y le quedan avisos por sonar»
  (`puenteQueCorresponde`). La puesta al día que corre al abrir la app y al volver a primer plano compara lo armado con lo que
  corresponde (`hayQueConciliarElPuente`) y, si no coincide, vuelve a poner las alarmas del hábito aunque nada más haya
  cambiado: al día siguiente —o el mismo día, cuando ya sonaron todos los avisos— deja las `DAILY`/`WEEKLY` de siempre. Mientras
  coincide no toca nada (no cancela y pone en cada apertura). Converge también si el cumplido llegó mientras corría otra puesta
  al día, o sin red (la nota ya quedó; solo se pierde el apagado inmediato).
* **Reprogramar el mismo día.** `programar` y `programarConCambioDiferido` leen la nota: si Plan mueve la hora, Training guarda el
  editor, Yo → Alarmas toca Despertar, o se apaga y se vuelve a encender el aviso el mismo día en que ya se cumplió, hoy no vuelve
  a sonar. `cancelar` quita el puente (sus ids van con los del hábito) y lo marca desarmado, pero deja la nota de «se cumplió hoy».
* **El día es el del HÁBITO.** El aviso `habitoCumplido` trae ahora `fecha` (la `fechaEjecucion` del registro, `YYYY-MM-DD`). Un
  hábito se cumple a veces pasada la medianoche —Dormir a las 00:40 es del día anterior—: eso no apaga lo que le queda al de hoy,
  ni sus repeticiones (`atenderHabito` recibe el día). Los avisos se atribuyen al día del hábito, no al instante en que suenan: el de
  las 23:40 de esta noche de un hábito a las 00:10 es el de mañana y el puente lo conserva. «Hoy» para las alarmas es el del reloj del
  teléfono, como siempre.
* **Otros caminos de cumplir.** La Pastilla Renacer y la Clase diaria cierran por su propio endpoint y no emiten `habitoCumplido`
  (tampoco las celebraciones): `TrainingScreen` llama a `alCumplirElHabito` directamente al confirmar el servidor, con el
  `habitoId` y la `fecha` del registro vigente. La Audioterapia, Despertar/Dormir, el registro con foto y SER ya pasaban por
  `completarRegistro`.
* **Acciones de los objetivos (spec 010).** Al sellar una acción (`sellarRocaDiaria`) también se cancela su aviso «antes de la
  acción» que todavía no sonó (`cancelarElAvisoDeLaAccion`: son alarmas de fecha de esa acción), además de sus repeticiones. Las
  entradas guardadas se dejan: una lista leída antes del sello no vuelve a programarlas, y la primera que ya trae la acción
  cumplida las limpia. El recordatorio diario general y las demás acciones no se tocan.
* **No cambian**: ningún diseño, texto ni tab; los canales (`-vib`/`-sinvib`), las voces, «cómo suena», «Repetir si no la atiendo»
  y sus «atendidas», el rearmado de la spec 007, `ponerLasAlarmasDeHabitosEnSuCanal`, el aviso agrupado, cerrar sesión (suelta las
  alarmas y la nota), el push de respaldo del servidor ni el backend. Un hábito no cumplido suena exactamente igual que antes.
* **Compatibilidad.** Sin backend nuevo. Contra un servidor que no manda `weekdays` ni `alarm`, o una app sin permiso de avisos,
  se comporta como antes (sin permiso no arma nada). La nota y el puente son locales: no viajan.
* **Límites aceptados.** (1) Si la persona no abre la app en 7 días después de cumplir, el puente se acaba (como las
  repeticiones); la primera apertura lo revierte. (2) Un hábito cumplido desde OTRO teléfono o la web, o que el servidor cierra por su
  cuenta (el post diario al publicar), no avisa a este: sus alarmas de hoy suenan igual. Leer los registros de hoy en cada puesta al
  día sumaría un pedido por apertura; no se hizo. (3) Con el puente, un aviso de fecha de un hábito y la diaria de otro a la misma
  hora no se juntan en un solo aviso (E-410 solo junta el mismo tipo de disparador): Android puede callar el sonido del segundo hasta
  que la puesta al día revierte el puente. (4) El peor caso son 7 alarmas de fecha por aviso de cada hábito cumplido ese día
  (Android admite unas 500 por app). (5) Si `GET /habit-preferences` falla justo al cumplir, el apagado espera a la próxima puesta
  al día (que corre al volver a primer plano, con 10 min de intervalo mínimo).
* **Pruebas:** `puenteDeAlarmas.test.ts` (qué le queda a hoy, el puente, los identificadores), `habitoCumplidoSilenciaAlarmas.test.ts`
  (cumplir apaga el resto de hoy en el esquema diario y por día, mañana suena normal, reprogramar el mismo día, cumplir pasada la
  medianoche, cambio de sonido, rearmado, aviso agrupado y cerrar sesión), `habitoCumplido.test.ts` (el aviso trae el día) y
  `sellarRocaYRepeticiones.test.ts` (el aviso de la acción sellada).
* **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por aire).

## Cambio por pedido del dueño — 2026-10-19 — alarmas como el despertador, aviso cuando el teléfono las borra y guía por marca (tab `Yo` → Alarmas, una hoja global y, en Training → Planificar, una oferta única de la guía)

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

## Excepción autorizada por el dueño del producto — 2026-09-27 — tab `Yo` → Alarmas: la voz Dora dice el nombre del hábito, y sonidos para alertar y para relajar (decisiones del dueño de ese día, con sus notas: «que diga el nombre del hábito nomás y que sea rápido como está», tono antes de la voz «sí», y de los sonidos «déjalos como está y opcional que escoja el usuario»).

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

## Excepción autorizada por el dueño del producto — 2026-09-26 — tabs `Yo` y `Plan`, aviso con voz y recordatorios de las acciones de los objetivos (decisiones del dueño de ese día).

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

## Cambio por pedido del dueño — 2026-10-20 — tab `Training` → Planificar: el recordatorio por día

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

## Cambio por pedido del dueño — 2026-10-20 — tab `Training` → Planificar: cómo suena la alarma

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

## Cambio por pedido del dueño — 2026-10-20 — tabs `Plan` y `Yo` → Alarmas: las acciones de los objetivos por día y cómo suenan

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
