# Login, onboarding, ficha, diagnóstico, términos y el Día 1

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Excepción autorizada por el dueño del producto — 2026-10-05 — alta (`LoginScreen`) y onboarding (Ficha Inicial, Términos, «Elige tu Día 1»): forma «de app»

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
    > **Corregido 2026-11-02.** Los botones dorados ya no van en versales: «LISTO» es «Listo», y lo mismo «SIGUIENTE», «CONTINUAR A
    > TÉRMINOS» y los demás de la Ficha. Ver «los botones dorados en tipo oración y sin espaciado», al final de las decisiones.
  * **Términos y Día 1:** el mismo esqueleto, con «CONTINUAR» / «CONFIRMAR MI DÍA 1» fijos abajo.
    Términos atiende el gesto atrás de Android (vuelve a la ficha).
    > **Corregido 2026-11-02.** Los botones dicen «Continuar» y «Confirmar mi Día 1» (también «Aceptar» en Términos actualizados,
    > «Comenzar mi viaje» en la bienvenida y «Entrar a mi Día 1 (hoy)» en el gong). Ver la entrada del 2026-11-02.
    > **Corregido 2026-11-02 (spec 036, D-309).** «Confirmar mi Día 1» ya no existe: el último paso es «Tu programa empieza mañana» con «Entendido». Ver la entrada del 2026-11-02 (spec 036).
  * **Lo que NO cambia:** preguntas, claves y respuestas (`mapaPreguntas.ts`), el guardado por
    capítulo (mismo `POST /onboarding/answers`, mismo `avanzarEstado`, sólo al terminar cada
    capítulo), las 23 cláusulas, la firma y los avisos de validación (mismos títulos y mensajes).
    El Pacto (`PactoScreen`) y `BienvenidaScreen` no están en este flujo y no se tocaron.
  * **Dependencia nueva:** `expo-haptics` (código nativo). Sin el módulo, `utils/tacto.ts` no vibra
    y no rompe; la vibración se siente recién con un APK nuevo, que de todos modos hace falta para
    que este cambio llegue (no hay actualización por aire).

## Cambio por pedido del dueño — 2026-10-07 — tabs `Training`, `Hoy` y `Yo`: «Elegir mi Día 1» para el personal

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
    > **Corregido 2026-11-01.** En Hoy (y en Plan) ya no es una tarjeta: es una fila compacta, «Todavía no elegiste tu Día 1 · Elige cuándo
    > empiezas ›», y la invitación sin fila es «Haz tu programa de 90 días · Elige tu Día 1 ›» sin el párrafo «Puedes recorrerlo tú también…».
    > Yo conserva la tarjeta. Ver la entrada del 2026-11-01.
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
    > **Corregido 2026-11-02 (spec 036, D-309).** Nadie elige ya su Día 1: «Elegir mi Día 1» es «**Empezar mañana**», «Todavía no elegiste tu Día 1» es «**Todavía no empezaste tu programa**» y la
    > pantalla que abre es «Tu programa empieza mañana» (sin fechas a elegir, con «Entendido»). El POST sigue creando la fila ya activada, con inicio mañana. `activate-tracking` no cambia.
  * **«Ahora no»** sigue escondiendo la invitación solo en Hoy; Yo la ofrece siempre que el servidor diga
    `canStartProgram` (`useProgramaPersonal` devuelve además `puedeActivar`, sin el pospuesto).
  * Nada depende del nombre del rol (los dos idiomas: `MENTOR_LEAD`/`LIDER_MENTORES`, `ALCHEMIST`/`ALQUIMISTA`): lo
    decide el servidor (`activated`, `canStartProgram`). El flujo del aprendiz no cambia.

## Recuperación del Día 1 de cuentas anteriores — 2026-10-10 (backend E-594/E-596/E-597)

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
  > **Corregido 2026-11-02 (spec 036, D-309).** «Ofrecen el selector», «Reintentar Día 1», «Un 400 refresca fechas» y «repetir la misma fecha» ya no son así: se ofrece «Empezar mañana» (la pantalla
  > «Tu programa empieza mañana»), el aviso dice «No pudimos comprobar tu programa» con «Reintentar», un 400 significa que pasó la medianoche y la fecha mostrada ya no es mañana (se vuelve a leer y se avisa),
  > y «Entendido» otra vez manda la misma fecha. El resto (nada se asigna solo, vencen a los 15 s, respuestas fuera de orden) sigue igual.
  Verificación final del 2026-10-12: 34/34 E2E de Día 1 y 5/5 mapas completos, cero reintentos,
  fallos, errores u omitidos. JUnit y persistencia SQL en `artifacts/e2e-dia-uno/` y `artifacts/e2e-mapa/`.

## Cambio por pedido del dueño — 2026-10-31 — Términos y condiciones editables desde la app, por formación y con versiones (spec 027)

Pedido del dueño (textual): «El sistema debe poder gestionar sus propios términos y condiciones, para no estar borrando ni editando código.» Decisiones del 31/10 (todas la opción A):
uno por formación (copia de la Escuela en borrador), Administración decide en cada publicación si se acepta de nuevo (por defecto no), el personal firma los de cada formación y Administración y
Alquimista los de la Escuela, releer desde Yo, texto plano, editan Administración y Alquimista, sin push. Backend D-304 (`specs/027-terminos-editables/`). Lo que cambia y nada más:
* **La pantalla de Términos del primer ingreso no cambia** (SC-006): el texto lo manda ahora el servidor —los vigentes de MI formación— y, si no los ofrece (backend anterior) o falla la lectura, se
  usa el que la app lleva dentro (`TERMINOS_DE_LA_APP`: las 23 cláusulas de siempre). Las cláusulas se dibujan con `ContenidoDeLosTerminos` (extraído tal cual de la pantalla). Al aceptar, el hito
  de Términos lleva la **versión que leyó** (`termsVersionId`) y deja constancia de ella; si Administración publicó mientras leía, el servidor responde 409 y la pantalla relee el texto y avisa «Los
  términos cambiaron mientras leías: léelos de nuevo». Antes el hito se ignoraba si fallaba; ahora, como la respuesta y la firma, **no se avanza sin constancia** (FR-013).
* **«Actualizamos nuestros términos»** (`TerminosActualizadosScreen`, montada en `RootNavigator` después de la elección de formación): si Administración publicó una versión **pidiendo aceptar de nuevo**,
  o la persona entra a una formación cuyos términos no aceptó (personal asignado, aprendiz trasladado), al abrir la app ve la nota de lo que cambió, el texto, la casilla y la firma, y **no usa el resto
  de la app hasta aceptar**; puede cerrar sesión (la flecha de arriba; el atrás del sistema también). Se relee al volver al frente. Si no se pidió aceptar de nuevo, nadie es interrumpido. El primer
  ingreso no se bloquea: lo lleva su paso de Términos del onboarding. Mientras llega la primera lectura la app no se dibuja (sin parpadeo); si la lectura falla, se deja pasar.
* **Administración → Más opciones → «Términos y condiciones»** (y, en el centro «Formaciones», la sección «Ficha y términos»): las tres formaciones con su versión vigente o «Por revisar»
  (`TerminosAdminScreen`); los de una formación con su historial —versión, fecha, autor, nota, cuántas personas la aceptaron, si pidió aceptar de nuevo—, «Editar», «Ver el texto vigente» y
  «Descartar el borrador» (`TerminosDeUnaFormacionScreen`); y el **editor** (`EditorDeTerminosScreen`): título, introducción, cada cláusula (escribir, subir, bajar, insertar después, quitar; la
  numeración sale sola de la posición), texto de la casilla, **Vista previa** (la pantalla que verá la persona), «Guardar borrador» y «Publicar» (`PublicarTerminosSheet`: nota opcional e interruptor
  «Pedir que acepten de nuevo», apagado por defecto). No se publica con cláusulas vacías, sin cláusulas, sin cambios ni si otra persona publicó antes (se relee y se avisa). Avisa si una cláusula
  cita a otra por su número. Los marcadores `{formacion}` y `{duracion}` se muestran con el nombre y la duración de cada persona. Una versión vieja se **restaura como borrador** (no se publica sola) y
  se puede ver **quiénes la aceptaron y quiénes faltan** (`VersionDeTerminosSheet`).
* **La ficha de la persona** (Administración) suma «Aceptó los términos de Escuela Renaser, versión 2, el 31 oct 2026» con «Ver su firma» (`ConstanciaDeTerminos`); sin aceptar, «Todavía no aceptó los
  términos». **La hoja «Aceptar» de la spec 025** apaga la formación que todavía no tiene términos publicados («Todavía no tiene términos publicados.»): no recibe personas nuevas.
* **Yo → Mi onboarding → «Términos y condiciones»** (P3, FR-023; `TerminosAceptadosVista`, vista `terminos` de Yo, solo lectura): bajo las dos etapas, una fila «Términos y condiciones · Versión 2 · aceptada
  el 31 de octubre de 2026 · toca para releer» (`useTerminosAceptados`, que lee `GET /onboarding/terms/accepted` al entrar a Mi onboarding). La vista muestra el número de versión, el día, **la firma que
  dibujó al aceptar** (`signatureUrl`, enlace de 15 minutos; sin ella, o si la imagen no carga, no se dibuja el recuadro) y el texto **tal como lo aceptó**, aunque Administración haya publicado otro
  después. Sin botones: no se acepta ni se firma de nuevo desde ahí. No es una etapa: **no cuenta** en «N de 2 etapas completadas». La fila solo se dibuja si el servidor dice que aceptó unos (un 404, un
  backend anterior o un fallo de red la esconden; la vista distingue «no pude leerlo» de «nunca aceptó»). El atrás sube un nivel: términos → Mi onboarding. **Es la única parte de Yo que toca esta spec**
  (autorizada por el dueño: «releer desde Yo», decisión Q6-A del 31/10); el resto de Yo no cambia.
* **No cambian:** el diseño y los textos de la pantalla de Términos para quien entra a la Escuela sin que nadie edite, el resto del onboarding, los demás tabs, ni el Pacto. Sin dependencias nuevas.
* **Pruebas:** Jest `borradorDeTerminos`, `terminosDeLaPersona` (la versión en el hito, la lectura tolerante, la pantalla que bloquea, la API de Administración y la lista) y `releerLoAceptado` (la lectura de lo aceptado con su firma, «nunca aceptó» frente a «no se pudo leer», la vista de solo lectura y su lugar en Yo). Maestro, escritos y sin correr:
  `.maestro/terminos-editables/`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y el backend con la spec 027 antes; contra uno anterior la app usa el texto que lleva y la sección de Administración no
  encuentra datos.

## Cambio por pedido del dueño — 2026-10-31 — ficha con diagnóstico: reemplaza al Mapa de Renacimiento (spec 026)

Pedido y decisiones del dueño del 31/10 (spec 026 del backend, `Renaser-90-dias-backend/specs/026-ficha-con-diagnostico/`, D-303): una **ficha nueva
«con diagnóstico»** —su formulario de Google, adaptado— va **en lugar de** la ficha estándar para quien Administración decida (al aceptar la solicitud,
spec 025, o después, a quien ya estaba dentro); **el Mapa de Renacimiento ya no va** («será reemplazado con la nueva ficha»). De las respuestas nacen los
objetivos de 90 días de Plan, que la persona revisa y confirma una vez. La ficha estándar queda como hoy. **Todo es de la app y necesita el backend de
la 026 antes**: contra uno anterior nadie tiene el diagnóstico y la app queda como estaba, salvo que el Mapa ya no se ofrece. Son tres partes:

### La persona: el ingreso, el recorrido y la lectura (spec 026)

Pedido del dueño: una ficha nueva «con diagnóstico» —su formulario de Google, adaptado— que va **EN LUGAR de** la ficha estándar para
quien Administración decida (al aceptar su solicitud, spec 025, o después, a quien ya estaba dentro); de ella nacen los objetivos de 90
días de Plan. Esta entrada es solo la mitad de la **persona** (spec y contrato en
`Renaser-90-dias-backend/specs/026-ficha-con-diagnostico/`). Todo vive en `src/features/diagnostico/`. Lo que cambia y nada más:

* **El ingreso** (`OnboardingFlow`): lee `ficha` de `GET /onboarding/state` (`ESTANDAR` | `CON_DIAGNOSTICO`; ausente o desconocida =
  `ESTANDAR`, así que un backend anterior no cambia nada). Con `CON_DIAGNOSTICO` y el diagnóstico sin terminar, el paso inicial es
  `diagnostico` (`DiagnosticoDeLaPersonaScreen`) en lugar de `FichaInicialScreen`; al terminar sigue Términos y «Elige tu Día 1», igual
  que hoy. Si ya lo terminó y no aceptó Términos (cerró la app ahí), entra a Términos; con Términos aceptados, a «Elige tu Día 1»; si no se
  puede saber (sin red), abre el diagnóstico, que sabe reintentar. «Salir» de la portada cierra la sesión, como la ficha estándar. **El
  «volver» de Términos** de esta persona muestra lo que respondió en solo lectura (`MiDiagnosticoScreen`), porque no hay una ficha a la que
  volver a editar. Al entrar a la app se llama `completeOnboarding()` **sin ficha** (la ficha estándar no existe para ella: el diagnóstico ya
  está en el servidor). **La ficha estándar no cambia en nada.** Límite aceptado: si `GET /onboarding/state` falla por red justo al abrir,
  se queda con la ficha estándar (el comportamiento de siempre); `AuthContext` ya leyó ese mismo endpoint un instante antes.
  > **Corregido 2026-11-02 (spec 036, D-309).** El último paso ya no es «Elige tu Día 1» sino «Tu programa empieza mañana» (un solo botón, «Entendido»). El recorrido (Diagnóstico → Términos → ese paso → Hoy) y los saltos de reanudación no cambian.
* **El recorrido** (`components/RecorridoDelDiagnostico`, la misma pantalla para la persona y para la vista previa de Administración):
  **portada** (título, mensaje con sus saltos de línea y «Empezar»; la barra de avance no la cuenta) → **pasos cortos** → **cierre**.
  Es la ficha estándar con otro contenido: el mismo esqueleto (`MarcoDePaso`: barra arriba, un solo scroll, botón fijo abajo que sube con
  el teclado), la misma `BarraDeAvance` (un tramo por sección) y las mismas opciones grandes (`OpcionElegible`).
  * **Pasos**: cada sección se parte en pasos de 1 a 3 preguntas según lo que pesa cada una (`utils/pasosDelRecorrido`): un párrafo, una
    cuadrícula, el consentimiento y una lista de más de 5 opciones van solos; de 4 a 5 opciones pesan doble. **La composición de un paso nunca
    depende de sus propias respuestas**: una pregunta que se muestra «solo si» otra del mismo paso abre un paso nuevo.
  * **Condicionales** (`seMuestraSi`, `utils/visibilidad`): se muestra solo si la respuesta de la pregunta indicada ES ese `valor` (en casillas,
    si lo INCLUYE); recursivo; una condición que nombra una pregunta que no está (otra formación) o un ciclo la deja oculta. Las ocultas no se
    piden ni cuentan; **sus respuestas guardadas se conservan** y reaparecen si la condición vuelve a cumplirse. Los pasos y secciones sin
    preguntas visibles se saltan.
  * **Tipos**: TEXTO (`FormField`), AREA_TEXTO (con contador «123 / 500» si hay `largoMaximo`, que además corta en ese tope), NUMERO (teclado
    decimal, acepta coma, solo dígitos), SELECCION_UNICA (`OpcionElegible`), SELECCION_MULTIPLE (casillas cuadradas; con `maximoOpciones` la
    tercera no se marca y un texto dice «Elige como máximo 2.»), ESCALA y CUADRICULA (números de 48, repartidos en filas parejas si son más de
    cinco; la cuadrícula muestra cada fila con su escala, los extremos una vez arriba y «N de M respondidas»; no avanza hasta responder todas
    las filas), FECHA (`CampoDeFecha`: las ruedas de día, mes y año de la ficha estándar sin su tope de «mayor de 18»; guarda `DD/MM/AAAA`) y
    CASILLA = consentimiento (la declaración, que viene en `ayuda`, completa y sin scroll propio sobre la casilla; **siempre se marca**, sea cual
    sea `requerida`). Un tipo que la app no conoce no llega (el esquema lo descarta).
  * **Precarga**: si `precarga` viene y no hay respuesta guardada, el campo arranca con ese valor para confirmarlo (se guarda al avanzar).
  * **Lo que falta**: al tocar «Siguiente» con una obligatoria sin responder se marca **esa** pregunta (borde rojo y un mensaje de 15 px en
    tuteo bajo ella: «Escribe tu respuesta para continuar.», «Elige una opción para continuar.», «Responde todas las filas para continuar.»…),
    vibra con `tacto.error()` y la vista baja hasta ella (`MarcoDePaso` suma la prop opcional `desplazarA`). Nada de diálogos.
  * **Guardar de verdad**: cada «Siguiente» llama a `onGuardarPaso(respuestasDeEsePaso, pasoAlQueLlega)` y **solo avanza si resuelve**; si falla,
    el paso dice «No se pudo guardar. Revisa tu conexión.» con «Reintentar» de 48, sin perder lo escrito. En el último paso se revisa TODO
    antes de mandar nada (un borrador restaurado pudo dejar un hueco) y se guarda ese mismo paso. «Terminar» llama a `onTerminar()`; un 400
    `DIAGNOSTICO_INCOMPLETO` (`faltan`) lleva al paso de la primera pregunta que falta y la marca; un fallo de red dice «No se pudo terminar…»
    con «Reintentar». Un doble toque manda un solo pedido.
  * **Atrás** (flecha y gesto del sistema, `useSystemBackHandler`): sube un paso; en el primero vuelve a la portada; en la portada llama a
    `onSalir`; en el cierre es «Continuar». Volver no manda nada ni pierde lo escrito.
  * **Retomar**: arranca en el paso de `datos.paso` (acotado), sin portada, con todo lo respondido. Se guarda el paso **al que se llega**.
  * **El cierre**: «Tus objetivos ya están preparados» con los objetivos que devolvió `terminar` (el de la prioridad principal primero, con su
    eje y el texto tal como lo escribió), la primera acción si hubo y qué sigue; sin objetivos, «Los escribirás en Plan.». «Continuar» llama
    a `onContinuar`. En el ingreso «qué sigue» dice Términos y Día 1; para quien ya estaba dentro, revisar y confirmar los objetivos en Plan.
  * **Vista previa** (`modo: 'vistaPrevia'`): no guarda nada ni en el servidor ni en el teléfono, no llama a `onTerminar`, y el último botón
    («Cerrar vista previa») cierra con `onSalir`.
  * **Movimiento** (`emil-design-eng`, `animate-expo`): ninguno propio. El paso nuevo entra con el desplazamiento de 25 px + fundido de 260 ms
    de `MarcoDePaso` (con «reducir movimiento», solo fundido), la barra rellena en 280 ms, y los toques usan `Presionable`. Las respuestas
    cambian al instante (se hacen decenas de veces).
* **Borrador local** (`utils/borradorLocal`): lo que se escribe en el paso en curso se guarda en `AsyncStorage`, clave
  `renaser.diagnostico.<usuario>.<versión>`, medio segundo después de la última tecla, al pasar la app a segundo plano y al salir; se borra al
  guardar el paso y al terminar. Al abrir, lo escrito y no mandado le gana a lo del servidor (es más reciente). Cualquier fallo de
  almacenamiento se lee como «no hay borrador».
* **Pantallas conectadas** (`components/DiagnosticoConectado`, envuelto por `screens/DiagnosticoDeLaPersonaScreen` para el ingreso y
  `screens/CompletarDiagnosticoScreen` para quien ya estaba dentro, con su cabecera «‹ Diagnóstico» en los avisos): abre `GET /diagnostico/mio`;
  **404** → «Todavía no tienes un diagnóstico disponible.» con «Reintentar»; **409** → ya lo terminó (avisa y sigue); sin red → «No pudimos
  cargar tu diagnóstico. Revisa tu conexión.». Guardar un paso = `PUT /diagnostico/mio/respuestas` y después `PUT /onboarding/state`
  (`flow: diagnostico`, `step`); si el servidor rechaza solo el cursor, el paso se da por guardado (lo respondido está a salvo).
* **Ofrecerlo a quien ya estaba dentro** (FR-026-9): `hooks/useEstadoDeMiDiagnostico` (`GET /diagnostico/mio/estado`; sin lectura —404, sin red—
  no hay oferta; se relee al cambiar de cuenta, al volver la app al frente y al terminar el diagnóstico) y
  `components/TarjetaDelDiagnosticoPendiente` (props `{ alAbrir }`; «Completa tu diagnóstico · De él nacen tus objetivos de 90 días ›», una fila
  compacta toda tocable, del estilo de la tarjeta del Mapa que reemplaza; **devuelve `null` salvo con el diagnóstico pendiente o en curso**).
  Hoy la monta y abre `CompletarDiagnosticoScreen` (lo hace el agente `plan-hoy`). Para la fila «Mi diagnóstico» de Yo,
  `utils/estadoDelDiagnostico.diagnosticoTerminado(estado)` dice si ya lo terminó (con el mismo hook).
* **Lectura de solo lectura**: `screens/MiDiagnosticoScreen` (props `{ onBack }`; Yo → «Mi diagnóstico», cabecera «‹ Mi diagnóstico») y
  `components/SeccionDelDiagnosticoDeLaPersona` (props `{ cargar }`) en las fichas del **mentor o la guía** (`AlumnoScreen`), del **líder**
  (`PersonaDelLiderScreen`, con grupo y desde «Todos los aprendices») y de **Administración** (`FichaAprendizScreen`), debajo de «Cierres del
  día». Por sección, cada pregunta tal como se le hizo con su respuesta legible (texto, valores como lista, una fila por área de la cuadrícula,
  «Aceptó» en el consentimiento; sin respuesta, «Sin respuesta»); una pregunta retirada lleva la marca «Pregunta retirada» y conserva lo que se
  respondió. Mismo criterio que el tiempo libre y los cierres: **403, 404, la ficha estándar o ningún diagnóstico no dibujan nada**; mientras
  llega la primera lectura tampoco (sin parpadeo); un fallo de red dice «No se pudo cargar el diagnóstico.» con «Reintentar» de 48; si
  todavía no lo completó, «Todavía no lo ha completado.». Rutas: `GET /admin/diagnostico/personas/{id}`,
  `/mentor/groups/{g}/learners/{u}/diagnostico` y `/leadership/groups/{g}/people/{p}/diagnostico` (o `/leadership/people/{p}/diagnostico` sin
  grupo). **No hay nada que editar ni ningún pedido de escritura.**
* **Retoques a lo compartido (aditivos, sin cambio para nadie más)**: `MarcoDePaso` suma la prop opcional `desplazarA` (bajar la vista hasta
  una altura); `FormField` suma `mensajeDeErrorAparte` (borde rojo sin el texto de 12 px, para decirlo a 15); el esquema de
  `GET /onboarding/state` suma `ficha`; `PreguntaLeida` suma `escalaMax` opcional (con él la cuadrícula se lee «Mi salud… · 4 de 5»; sin él,
  «Mi salud… · 4»: el contrato de §4 todavía no trae la escala en la lectura).
* **No cambian**: la ficha estándar (preguntas, pasos, validaciones, borrador), Términos, «Elige tu Día 1», los cinco tabs, Plan, Hoy y Yo por
  dentro (solo montan lo que esta entrada exporta), ni ningún permiso (lo decide el servidor). Sin dependencias nuevas ni código nativo.
* **Pruebas**: Jest `respuestasEnEdicion`, `visibilidadYPasos`, `validacion`, `borradorLocal`, `lecturaLegible`, `estadoDelDiagnostico`,
  `diagnosticoLecturaApi`, `recorridoDelDiagnostico` (portada, pasos, condicionales, lo que falta, guardar/reintentar, terminar,
  `DIAGNOSTICO_INCOMPLETO`, atrás, retomar, borrador, vista previa, bajar hasta la pregunta), `campoDeFecha`, `diagnosticoConectado`,
  `onboardingFlowConDiagnostico`, `estadoOnboardingFicha`, `useEstadoDeMiDiagnostico`, `tarjetaDelDiagnosticoPendiente`,
  `seccionDelDiagnosticoDeLaPersona`, `miDiagnosticoScreen` y `lecturaEnLasFichas`. Maestro, **escritos y sin correr**:
  `.maestro/ficha-con-diagnostico/01–04` y `comun/diagnostico-responder-el-paso`.
* **Sin comprobar en pantalla** (solo se ve con el emulador): el aspecto de los pasos (alturas de las opciones, la cuadrícula de 7 filas, el
  texto largo de la declaración), el desplazamiento hasta la pregunta marcada con el teclado abierto, y el borrador tras matar la app.
* **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se actualiza por aire) **y el backend
  con la spec 026 antes** (`/diagnostico/mio…`, `ficha` en `/onboarding/state` y las tres lecturas). Contra un backend anterior nadie tiene
  `CON_DIAGNOSTICO`: la app queda como estaba.

### Administración → Más opciones → «Fichas» (spec 026)

Pedido del dueño (026-1 A, 026-4 A, 026-9 B): el **diagnóstico se administra desde la app**; la ficha estándar queda como hoy y solo se nombra. Solo
ADMIN y ALQUIMISTA (Administración ya se muestra por `canAdminister`; el servidor vuelve a exigirlo en cada pedido). Todo vive en
`src/features/diagnostico-admin/`. Lo que cambia y nada más:

* **La fila «Fichas»** en «Más opciones» (`MasOpcionesScreen`; sigue la disponibilidad de las personas, `CLAVES.adminPersonas`) abre
  `FichasAdminScreen`, un nivel más de la pila de `AdminScreen` (`{ nombre: 'fichas' }`): lista ↔ editor ↔ asignar a varias personas. El atrás
  (flecha y sistema) sube un nivel por vez: editor → lista → Más opciones.
* **El editor** (`DiagnosticoEditorScreen`): la portada (su título y su mensaje se editan, no se borra) y las secciones con sus preguntas, en el orden en
  que las ve la persona. Por pregunta (`EditorDePreguntaSheet`, una hoja): texto, ayuda, tipo (Texto corto, Párrafo, Número, Opción única, Casillas,
  Escala, Cuadrícula, Fecha, Consentimiento), obligatoria, opciones o filas (`EditorDeOpciones`), máximo de opciones, rango de la escala
  (`EditorDeEscala`), **«Se muestra solo si»** (`SelectorDeCondicion`: solo una pregunta ANTERIOR de opciones y una de sus opciones; las demás no se
  ofrecen), **«Alimenta»** (`SelectorDeDestino`: objetivo de Cuerpo, Negocio o Relaciones, prioridad principal, primera acción; el trato no se asigna
  a mano y uno ya usado se marca) y **«Se muestra en»** (formaciones; vacío = todas). Duplicar, subir y bajar (botones de 48, sin arrastre; una pregunta
  que llega al borde de su sección pasa a la de al lado). Cada cambio se manda al servidor y se **relee el borrador** antes de avisarlo: lo que se ve es
  lo que el servidor tiene. El aviso de lo guardado es `AvisoDeAbajo`. Un solo scroll.
* **Preguntas protegidas**: la del **trato** (la usa SER) y el **consentimiento** no se quitan ni cambian de tipo; el editor lo dice en lugar de ofrecer el
  botón. A una pregunta con respuestas no se le cambia el tipo (el servidor lo rechaza con su motivo, que se dice tal cual).
* **Quitar** (`BarraDeQuitar`, modo «Quitar preguntas», barra fija ARRIBA —abajo flota el botón de SER—): se marcan varias y hay **una sola confirmación**.
  El servidor las **elimina** si nunca se publicaron ni se respondieron, y las **retira** (dejan de mostrarse y conservan sus respuestas) si no; lo dice
  en el aviso («2 eliminadas · 1 retirada»). Si otra pregunta depende de una (409 `TIENE_DEPENDIENTES`) se muestran cuáles y se repite con confirmación
  quitándolas juntas. **Retiradas** (`PreguntasRetiradas`, plegada): se pueden restaurar (409 si su «alimenta» ya lo tiene otra).
* **Vista previa** (`VistaPreviaDelDiagnosticoScreen`, `GET /admin/diagnostico/vista-previa`): el MISMO `RecorridoDelDiagnostico` de la persona en
  `modo: 'vistaPrevia'` (no guarda nada), elegible por formación y duración (Escuela 90 días, Diplomado 3 meses o 1 año, Certificación 90 días).
* **Publicar** (`PanelDePublicar`): dice qué versión está vigente y si hay cambios; si el servidor no deja publicar, **lo dice antes con cada motivo y
  apaga el botón** (sin preguntas, sin consentimiento, **falta el texto de la declaración de responsabilidad y consentimiento**, una condición rota).
  Publicar manda `versionBase`; un 409 `OTRA_PERSONA_PUBLICO` pide releer. «Versiones» (`HojaDeVersiones`): quién publicó y cuándo. **La declaración
  de responsabilidad y consentimiento la escribe Administración** en la ayuda de la pregunta del consentimiento (026-6); mientras diga
  `[PENDIENTE DEL DUEÑO]` el diagnóstico no se publica.
* **Importar** (`HojaDeImportar`, 026-4 A): se **pega** la tabla (lo copiado de Excel o Google Sheets sale con tabuladores; también vale CSV con coma o
  punto y coma) y el servidor dice qué entendió y los errores **por fila** (la cabecera es la 1); con un error no se puede confirmar (todo o nada).
  «Añadir» o «Reemplazar» (reemplazar muestra cuántas preguntas se retirarían y cuántas ya tienen respuestas). **«Descargar plantilla»** y
  **«Descargar la ficha»** (`useDescargaDeFicha`: `plantilla.csv` y `exportar.csv`) abren la hoja de compartir del sistema. **No hay selector de
  archivos** (pediría un módulo nativo nuevo): se pega el texto. Lo importado queda en borrador.
* **Asignar el diagnóstico a quien ya estaba dentro** (026-9 B): en la **ficha de una persona** (`FichaAprendizScreen`, `FichaDeIngresoDeLaPersona`,
  debajo de la formación) se lee su ficha de ingreso («Estándar» o «Con diagnóstico»), con «Asignar el diagnóstico» y «Volver a la ficha estándar»;
  quien decide si se puede es el servidor (409 con el motivo si ya respondió). Y en **Fichas → «Asignar a varias personas»**
  (`AsignarDiagnosticoVariasScreen`, `utils/seleccionDePersonas`): se busca como en «Personas» (al servidor, con el filtro de formación), se marcan,
  lo marcado se conserva al cambiar la búsqueda y **una sola confirmación** las cambia a todas; el servidor deja afuera a las que no se pueden y dice por
  qué («12 asignadas · 2 omitidas»). La barra de la selección va arriba y fija.
* **Rutas** (`/api/v1/admin/diagnostico`): `GET ` (borrador), `GET /vista-previa`, `POST/PUT/DELETE /secciones[/id]`, `PUT /secciones/orden`,
  `POST/PUT /preguntas[/id]`, `PUT /preguntas/{id}/mover`, `POST /preguntas/{id}/duplicar|restaurar`, `POST /preguntas/quitar`, `POST /publicar`,
  `GET /versiones`, `POST /importacion/vista-previa`, `POST /importacion`, `GET /plantilla.csv|exportar.csv`, `GET /personas/{id}` (la lectura) y
  `POST /personas/ficha`. Las respuestas se leen con esquemas tolerantes (`diagnosticoAdminSchemas`): una pregunta o sección rota se pierde ella.
* **No cambian**: la ficha estándar, el resto de Administración, los demás tabs. Sin dependencias nuevas ni código nativo.
* **Pruebas**: Jest `diagnosticoAdminApi`, `diagnosticoAdminSchemas`, `borradorDePregunta`, `condicionesYOrden`, `editorDelDiagnostico`,
  `quitarPreguntasEnElEditor`, `publicarYVistaPrevia`, `importarPreguntas`, `useDiagnosticoAdmin`, `fichasAdminScreen`, `fichasEnAdministracion`,
  `textosDeLaFicha`, `seleccionDePersonas`, `asignarDiagnosticoVarias` y `fichaDeIngresoDeLaPersona`. Maestro, escritos y sin correr:
  `.maestro/ficha-con-diagnostico/10–13`.
* **Sin comprobar en pantalla** (solo se ve con el emulador): el aspecto del editor con muchas preguntas, la hoja de importar con una tabla larga y la
  barra fija de «Quitar» con el teclado abierto.
* **Hace falta un APK nuevo** y **el backend con la spec 026 antes**; contra uno anterior «Fichas» responde 404 y lo dice.

### El Mapa se retira; Plan, Hoy y Yo dependen del diagnóstico (spec 026)

Decisión del dueño (spec 026 del backend, `specs/026-ficha-con-diagnostico/`): el **Mapa de Renacimiento ya no va**; lo reemplaza la
ficha con diagnóstico. De las respuestas del diagnóstico nacen los objetivos de 90 días de Plan, el eje de la prioridad principal va
primero y la primera acción se sugiere al agendar. Sin diagnóstico, la persona escribe sus objetivos directo en Plan, **sin ningún
requisito del Mapa**. Esta entrada es la parte de Plan / Hoy / Yo; el recorrido de la persona, las lecturas de otras personas y
Administración → «Fichas» son de otras entradas de la 026. Lo que cambia y nada más:

#### El Mapa se retira de la app
* **Se borró `src/features/mapa-renacimiento/` entero** (flujo de diez pasos, pantallas, `MapaRenacimientoContext`, hooks, esquemas y
  tests) y todo lo que entraba a él: la tarjeta «Mapa de renacimiento» de Hoy, la fila/estado «Haz tu Mapa de Renacimiento» de la
  tarjeta de acciones, «Primero tu Mapa de Renacimiento» y «Ir al Mapa de Renacimiento» de Plan, la etapa «Mapa de Renacimiento» de
  Yo → Ajustes → Mi onboarding, el overlay que reemplazaba a las pestañas (`RootNavigator`, `MapaRenacimientoProvider` de `App.tsx`),
  y los dos lugares que esperaban a que se cerrara (el botón flotante de SER, `RenasiaLauncher`, y el radar, `RadarContext`).
  `useEtapasOnboarding` ya no lee `GET /api/v1/mapa-renacimiento`; `catalogoPreguntas` ya no pide el flujo `mapa_dia7`.
* **Los datos que el servidor guarde del Mapa no se tocan**: solo la app deja de ofrecerlo. El servidor (contrato §3) responde
  `stageCompleted: true` a todos y `409 MAPA_RETIRADO` a lo que intentara escribir.
* **Se borraron** también `e2e/mapa-poder/mapa-por-rol.spec.ts` y `playwright.mapa.config.ts` (el recorrido del Mapa del Poder).
  **Se conservó la suite del Día 1**, que vivía en esa carpeta y no dependía del Mapa: ahora es `e2e/dia-uno/` (`dia-uno.spec.ts`,
  `preparar.py`, `README.md`) con `playwright.dia-uno.config.ts` autónomo; la variable `E2E_ACTORES` reemplaza a `E2E_MAPA_ACTORES`
  (el nombre viejo se sigue aceptando).
* **Se conservó** lo que otras funciones siguen usando: `home/utils/diasQueQuedan` (lo prueba `formaciones/__tests__/fasesYDuraciones`;
  hoy sin uso en el código de producción), `objetivos/utils/iconoDelEje`, `objetivos/utils/cifraDelObjetivo` y los esquemas de Plan.
  `EXPO_PUBLIC_MAPA_DIA7` de `eas.json` quedó sin efecto (nada la lee); se puede quitar cuando convenga.
* Prueba que lo vigila de punta a punta: `navigation/__tests__/mapaRetirado.test.ts` (ningún import, identificador ni texto del Mapa).

#### Plan sin la puerta
* **Plan siempre muestra el selector de eje y todo lo del eje** (objetivo de 90 días, semana, acciones…). Se borraron `PuertaDelMapa`,
  `usePuertaDeObjetivos`, `puertaDeObjetivos` y `mapaPendiente`. Sin Mapa ni diagnóstico, «Define tu objetivo de 90 días» se escribe
  ahí mismo (los «…» de la tarjeta del objetivo abren la hoja de siempre).
* **`PUT /api/v1/rocks/master/{eje}`** sigue como siempre (`409 ROCA_MAESTRA_FIJA` incluido); `MAPA_PENDIENTE` ya no existe y se quitó
  `mapaPendiente` de `useRocasMaestras.definir`. La línea de la hoja del objetivo fijo dice «Tu objetivo de 90 días quedó fijo.
  Aquí solo anotas cuánto llevas.» (sin «en tu Mapa»). La opción `desdeElMapa` de `definirRocaMaestra` se quitó.
* **Con la semana bloqueada** (faltan objetivos de 90 días; el servidor responde 403 `ROCKS_LOCKED`) la tarjeta «Esta semana» dice
  «Primero define tus tres objetivos de 90 días…» y ofrece **«Escribir mis objetivos»**, que abre el editor del primer eje (en el orden
  de la pantalla) que todavía no tiene objetivo. «Organizar mi semana ›» hace lo mismo en ese estado.

#### Objetivos de 90 días «por confirmar»
* `GET /rocks/master` suma `origin` (`PLAN | MAPA | DIAGNOSTICO`) y `confirmed` por fila. Se leen **tolerantes** (`objetivosSchemas`):
  ausentes ⇒ `PLAN` y confirmado, así un servidor anterior no muestra nada «por confirmar». Un objetivo `DIAGNOSTICO` con
  `confirmed: false` está «por confirmar» (`objetivos/utils/objetivosPorConfirmar`).
* **Plan**: arriba, la tarjeta **«Revisa tus objetivos de 90 días»** («3 objetivos por confirmar», «Salieron de tu diagnóstico. Léelos,
  cámbialos si quieres y confírmalos: después quedan fijos.», botón **«Revisar y confirmar»**) mientras haya alguno. El objetivo por
  confirmar lleva en su tarjeta una píldora **«Por confirmar»** (ícono `hourglass`, borde y texto: no solo color) y sus «…» abren la
  revisión en lugar de «Anotar avance».
* **La hoja** (`HojaConfirmarObjetivos`, `HojaDesdeAbajo grande`): el aviso a la vista «Puedes reescribirlos una vez. Después quedan
  fijos.», un campo editable por objetivo por confirmar (el de la prioridad principal primero) con contador «n / 500» —**nunca se
  recorta en silencio**: el campo no lleva `maxLength`; pasar de 500 se dice y no deja confirmar— y «Confirmar mis objetivos» fijo
  abajo. Confirmar manda **un `PUT /rocks/master/{eje}` por eje, en serie**, solo con `{ objetivo }` (sin meta; el servidor lo marca
  confirmado). Si uno falla se detiene, dice **cuál** («No pudimos confirmar tu objetivo de Cuerpo.» y el motivo) y cuáles ya quedaron
  confirmados; con un `ROCA_MAESTRA_FIJA` (otro teléfono ya lo confirmó) se vuelve a leer lo guardado. Al terminar: línea «Tus
  objetivos de 90 días quedaron confirmados.», `tacto.logro()`, y la tarjeta y las etiquetas desaparecen.
* **Ya confirmado, o de otro origen, el objetivo es fijo como siempre** (D-234: solo el avance, si tiene meta).

#### Prioridad y primera acción desde el diagnóstico
* `usePrioridadPrincipal` y las acciones del Mapa dejaron de leer el Mapa. Ahora `usePrioridadPrincipal` lee
  `GET /api/v1/diagnostico/mio/resumen` (`obtenerResumenDeMiDiagnostico`) cada vez que Plan recupera el foco: **el eje de la
  prioridad va primero en el selector** (y es el que se abre mientras la persona no toque otro; antes arrancaba siempre en Cuerpo) y
  la **primera acción** se ofrece al agendar.
* **«Agendar mis acciones»** (`AgendarAccionesModal`): en el eje de la prioridad aparece la primera acción como **«Sugerida por tu
  diagnóstico»**; **no se agenda sola** (nada viene marcado: se elige tocándola). Ya no se ofrecen las acciones del Mapa ni se marcan
  solas las que «tocaban hoy». Lo que la persona escribe a mano sigue igual.
* **Sin diagnóstico, con un servidor anterior (404) o sin red**: el orden de siempre y sin sugerencia, sin error visible. Un fallo al
  releer conserva lo último que se leyó. Lo que el Mapa daba y ya no hay (hitos, acciones motoras) no se muestra; la cifra del mes
  sigue la regla de siempre («sin cifra no se muestra nada», `usePlanMensual`).

#### Hoy
* Se quitó la tarjeta «Mapa de renacimiento» y `useLecturaDelEstadoDelMapa`. **La tarjeta de acciones** (`vistaDeLaAccionDeHoy`) ya no
  tiene el estado `mapa`; sin acciones hoy dice, según los objetivos de 90 días (`useObjetivosDeNoventaDias`: una lectura de
  `GET /rocks/master` por foco): **«Confirma tus objetivos de 90 días» / «Confirmar»** (hay objetivos del diagnóstico por confirmar),
  **«Define tu objetivo de 90 días en Plan» / «Escribir mi objetivo»** (no tiene sus tres objetivos) —ambas son la misma fila compacta
  de siempre, toda tocable, y llevan a Plan—, o «Hoy no tienes acciones agendadas» / «Agendar en Plan». **Una acción que seguir manda
  sobre todo** (como mandaba sobre el Mapa). Mientras no se sabe, nada (sin parpadeo); si la lectura de los objetivos falla, no afirma
  nada de ellos.
* **Con el diagnóstico pendiente o en curso**, Hoy muestra `TarjetaDelDiagnosticoPendiente` (de la persona; no se dibuja si no hay
  nada pendiente) en el lugar donde estaba la tarjeta del Mapa, debajo del programa propio. Al tocarla abre `CompletarDiagnosticoScreen`
  **como un estado de Hoy** (reemplaza la pantalla, sin pestaña nueva); al terminar o salir, Hoy vuelve y relee el resumen, las
  acciones y los objetivos.
* No cambia nada más de Hoy.

#### Yo
* **Mi onboarding** queda con una etapa, **El Pacto** (la fila dice «Tu Pacto de Renacimiento»; «0 de 1 etapa completada»). Se quitó el
  estado `mapa_renacimiento` de `VistaDeYo`.
* **Fila nueva «Mi diagnóstico»** en la lista de Yo (junto a «Tuve una emergencia» y «Mi Radar»; ícono `fileText`), solo con la ficha con
  diagnóstico: **completado** → «Mi diagnóstico / Lee lo que respondiste» abre `MiDiagnosticoScreen`; **en curso** → «Mi diagnóstico /
  Sigue donde lo dejaste» y **pendiente** → «Completa tu diagnóstico / Todavía no lo empiezas» abren `CompletarDiagnosticoScreen`; con la
  ficha estándar, sin lectura o con un servidor anterior no hay fila (`yo/utils/filaDeMiDiagnostico`). A pantalla completa como la Caja y
  la emergencia; el estado se relee cada vez que Yo recupera el foco y al terminar el recorrido.

#### Compatibilidad
* **Sin backend nuevo para que nada se rompa**: contra un servidor anterior (sin las rutas del diagnóstico, 404) Plan, Hoy y Yo
  funcionan sin el Mapa y sin errores visibles; la persona escribe sus objetivos en Plan, Hoy dice «Define tu objetivo de 90 días en
  Plan» y Yo no muestra «Mi diagnóstico». Los objetivos «por confirmar» y la primera acción necesitan el backend de la 026.
* **No cambian**: los demás tabs, la barra de pestañas, las reglas del servidor de las semanas y las acciones, ningún diseño fuera de lo
  de arriba. Sin dependencias nuevas ni código nativo.
* **Pruebas**: Jest `planSinMapa`, `planPorConfirmar`, `objetivosPorConfirmar` (utils, componentes y esquema), `useRocasMaestrasConfirmar`,
  `usePrioridadPrincipal`, `agendarAccionesSugerida`, `accionesPropias`, `useObjetivosDeNoventaDias`, `vistaDeLaAccionDeHoy`,
  `tarjetaAccionDeHoy`, `hoySinMapaConDiagnostico`, `yoSinMapaConDiagnostico`, `filaDeMiDiagnostico`, `useEtapasOnboarding`,
  `definirRocaMaestra` y `mapaRetirado`. Maestro, escritos y sin correr: `.maestro/ficha-con-diagnostico/20-plan-objetivos-por-confirmar`,
  `21-hoy-sin-mapa` y `22-sin-diagnostico-escribe-objetivos-en-plan` (y se ajustaron `diseno-31/01–03`).
* **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se actualiza por aire).
  **Hace falta el backend de la 026** para los objetivos por confirmar y la primera acción.

### Las semanas y los meses del plan siguen la duración de la persona (spec 026, tras la 022)

* `objetivos/utils/periodoDelPrograma` cuenta las semanas y los bloques de cuatro semanas con la **duración propia** (`semanasDelProgramaDe`, `mesesDelProgramaDe`): con 90 días son
  13 semanas y 3 bloques (como siempre); con 365, **53** semanas y 13 bloques (el último se lleva la 53). `semanaDe`, `semanaAPlanificar`, `mesDe`, `semanasDelMes`,
  `mesDeLaSemana` y `etiquetaDelMes` reciben `duracionDias` (opcional: sin dato, la de 90). Plan la pasa desde `GET /home` (`resumen.duracionDias`), igual que Yo.
  Es la misma cuenta de `SemanaPrograma` del backend (V156 sube los topes de la base a la semana 53 y el mes 12); prueba `periodoDelProgramaSegunLaDuracion`.
* **No cambia** el texto «objetivo de 90 días» (es el nombre del objetivo en toda la app); decidir si en el Diplomado de 1 año se llama de otra forma es del dueño.

### La meta medible y la constancia de las lecturas (spec 026, decisiones del dueño del 2026-11-01)

Dos decisiones del dueño sobre la ficha con diagnóstico (backend V157, D-303). Solo JavaScript en la app; **hace falta el backend con V157 antes** y un APK nuevo.

* **La meta medible se pregunta en el diagnóstico.** Por cada eje, debajo de su objetivo en palabras, el borrador del backend trae preguntas **opcionales**: a qué
  número quiere llegar, en qué unidad (kg, soles, clientes…) y desde qué número parte; Relaciones solo los dos números, enteros del 1 al 10 (siempre es esa escala).
  Alimentan ocho destinos nuevos (`DestinoDeLaPregunta`: `META_CUERPO`, `UNIDAD_CUERPO`, `PARTIDA_CUERPO`, `META_NEGOCIO`, `UNIDAD_NEGOCIO`, `PARTIDA_NEGOCIO`,
  `META_RELACIONES`, `PARTIDA_RELACIONES`). Con las tres partes el objetivo llega a Plan **con su meta**: Plan lo dibuja como cualquier objetivo con meta
  («Inicio · Actual · Meta», el %, «Este mes») y saca la cifra del mes y los hitos; sin alguna parte, queda en palabras y el plan dice «sin cifra», como hasta hoy.
  Confirmar el objetivo (`PUT /rocks/master/{eje}` solo con el texto) no borra la meta.
* **Los dos esquemas leen los destinos nuevos** (`diagnostico/api/diagnosticoSchemas`, `diagnostico-admin/api/diagnosticoAdminSchemas`): sin ellos una pregunta de la
  meta se leería «sin destino» y, al guardar el editor, dejaría de alimentarla. **El editor** (`diagnostico-admin/utils/tiposDePregunta`) los ofrece según el tipo:
  la meta y el punto de partida piden una pregunta de **Número**; la unidad, de **Texto corto**. Al dejar de alimentar una meta el editor avisa («Su objetivo de ese
  eje quedará solo en palabras: Plan no podrá sacar la cifra de cada mes.», `dejaDeAlimentarUnaMeta`). La importación por CSV los acepta por su nombre («Meta de
  Cuerpo», «Unidad de Negocio», «Punto de partida de Relaciones»…).
* **La persona ve antes de guardar lo que el servidor exige** (`diagnostico/utils/validacion`): Relaciones, «Escribe un número entero del 1 al 10.»; Cuerpo y
  Negocio, «Escribe un número de cero o más.» y «Ese número es demasiado grande.» (de 10¹² en adelante). Aceptan decimales y la coma. Siguen siendo opcionales.
* **Supuesto a confirmar con el dueño:** Negocio se toma como un **nivel** (dónde estar al cierre de cada mes); no se pregunta si la meta es mensual o acumulada
  al final, como hacía el Mapa. Y la unidad que parece una escala («puntos», «/10») se trata como escala (cifras enteras).
* **Quién abrió el diagnóstico de una persona queda anotado** (backend): el mentor o la guía de su grupo, el líder, Administración y Alquimista. **No hay nada
  nuevo en la app**: las pantallas que lo leen (`diagnostico/components/SeccionDelDiagnosticoDeLaPersona` en las fichas) piden lo mismo de siempre. La propia
  persona («Mi diagnóstico») no deja registro. Esa constancia no entra al resumen de las 20:00 que recibe el mentor.
* **Pruebas:** Jest `validacion` (la meta de un eje), `diagnosticoSchemas`, `diagnosticoAdminSchemas` y `borradorDePregunta` (los destinos nuevos). Maestro, escrito
  y sin correr: `.maestro/ficha-con-diagnostico/05-persona-responde-la-meta-y-plan-saca-la-cifra.yaml` (pide el borrador sembrado por la V157 publicado; el ayudante
  `comun/diagnostico-responder-el-paso.yaml` contesta la meta con `META: si`). Los flujos 01 a 04 siguen igual: las preguntas nuevas son opcionales.

### Entradas anteriores que esta deja obsoletas

Donde una entrada de este documento nombra el Mapa de Renacimiento (el flujo de diez pasos, su tarjeta en Hoy, `PuertaDelMapa` /
`usePuertaDeObjetivos`, «Primero tu Mapa de Renacimiento», `MAPA_PENDIENTE`, `mapa-renacimiento/*`, `useAccionesDelMapa`, la etapa «Mapa de
Renacimiento» de Mi onboarding, el E2E del Mapa del Poder, `EXPO_PUBLIC_MAPA_DIA7`), léase **retirado** y vale esta entrada. En concreto:
«tab `Plan`: los objetivos esperan al Mapa de Renacimiento (issue #37)» y «Corrección encontrada en el E2E del Mapa del Poder por rol — 2026-10-10»
quedan solo como historia; en «diseño de Hoy, Plan y Training» (2026-10-31) el estado `mapa` de la tarjeta de acciones, «sin Mapa no se repite la tarjeta
Diseña tu mapa» y la `PuertaDelMapa` de Plan ya no existen; «Recuperación del Día 1 de cuentas anteriores» sigue valiendo pero su suite pasó de
`e2e/mapa-poder/` a `e2e/dia-uno/` (`E2E_ACTORES`). Las demás menciones (la fase y los días que quedan, el radar que esperaba al Mapa, los íconos por eje)
son sueltas y se leen igual con el Mapa fuera.

## Cambio por pedido del dueño — 2026-11-02 — el programa empieza al día siguiente, sin elegir el Día 1

Cambio de gerencia relayado por el dueño (02/11), textual: «Después de la ficha inicial se preguntaba qué día quiere empezar. Ahora iniciará al día siguiente: el
usuario no podrá elegir, lo hará al día siguiente. No es un gran cambio, pero sí cambiaría el mensaje: que comienza al día siguiente.» Backend: spec 036 / D-309
(`specs/036-empieza-al-dia-siguiente/`). Rama `036-empieza-al-dia-siguiente`, sobre `botones-tipo-oracion`. Lo que cambia y nada más:
* **Regla única: el Día 1 es MAÑANA** en la zona de la persona, **para todos**: el aprendiz al terminar la ficha y los Términos, el personal que se suma a su programa propio
  (D-260/D-261) y las cuentas antiguas que nunca eligieron (E-594/596/597). **Nadie elige la fecha.** La duración (90 días, 3 meses o 1 año) y el estado del día 0 («Tu programa
  empieza el martes 3 de noviembre», issue #72) no cambian; quien ya había elegido +2 o +3 conserva su fecha.
* **La pantalla** (`ActivarProgramaScreen`, la de siempre, ahora corta; el dueño pidió poco texto): «Tu programa empieza mañana» (título), la fecha en una tarjeta con el ícono
  `calendarRange` («Martes 3 de noviembre»), una línea con el plazo de SU programa (`lineaDelPlazo` sobre `plazoDelObjetivo` y la formación de la sesión: «Son tus 90 días.», «Son tus
  3 meses.», «Es tu año.») y un solo botón, **«Entendido»**, que activa (`tacto.logro()` y a Hoy). Se fueron la lista de fechas (`OpcionElegible`), «Confirmar mi Día 1» y «Elige tu Día 1».
  La fecha **la manda el servidor** (`GET /onboarding/activate-program` → `validStartDates[0]`) y es la que se envía en el `POST`: contra un servidor anterior, que ofrecía tres, la primera
  también es mañana. Todos los textos viven en `onboarding/utils/textoDelDiaUno` (con `fechaDelDiaUno`, que arma la fecha sin pasar por UTC).
* **Errores**: sin red al activar, «No pudimos activar tu programa. Revisa tu conexión e inténtalo de nuevo.» y el **mismo botón «Entendido» reintenta** con la misma fecha; sin red al leer
  la fecha, «No pudimos cargar tu fecha de inicio. Revisa tu conexión.» con «Reintentar». **400** (pasó la medianoche con la pantalla abierta y la fecha mostrada ya no es mañana): se
  vuelve a leer, se muestra la fecha nueva y se dice «Pasó la medianoche y tu fecha cambió. Mira la nueva.»; nunca se activa con un día distinto al que se vio. **409** (otro teléfono ya
  activó): «Vamos a comprobar tu programa.», se relee y entra directo. Ya activado al abrir, entra sin mostrar nada.
* **Las entradas, con la misma pantalla** (los nombres internos `BotonElegirDiaUno`, `useSelectorDelDiaUno`, `SelectorDelDiaUno` y `ELEGIR_DIA_UNO` se conservan: renombrarlos tocaría una docena
  de archivos sin cambiar nada de lo que se ve):
  | Dónde | Antes | Ahora |
  |---|---|---|
  | Hoy y Plan, sin fila (fila compacta) | «Haz tu programa de 90 días · Elige tu Día 1 ›» | «Haz tu programa de {plazo} · **Empieza mañana** ›» |
  | Hoy y Plan, con fila sin activar | «Todavía no elegiste tu Día 1 · Elige cuándo empiezas ›» | «**Todavía no empezaste tu programa** · **Empieza mañana** ›» |
  | Training, Plan (estado vacío), Yo (tarjeta), Mi Radar (botón) | «Elegir mi Día 1» | «**Empezar mañana**» |
  | Training, con fila sin activar | «Todavía no elegiste tu Día 1» + «Elige en qué día quieres empezar tus 90 días. Hasta entonces no hay evidencia que entregar.» | «Todavía no empezaste tu programa» + «**Tu programa empieza mañana. Hasta entonces no hay evidencia que entregar.**» |
  | Yo, tarjeta de la fila sin activar | «Todavía no elegiste tu Día 1» + «Elige en qué día quieres empezar tus 90 días. Tu programa arranca ese día.» | «Todavía no empezaste tu programa» + «**Tu programa empieza mañana.**» |
  | Plan, estado vacío | «Cuando elijas tu Día 1 podrás escribir tus objetivos y agendar tus acciones aquí.» | «Cuando empiece tu programa podrás escribir tus objetivos y agendar tus acciones aquí.» |
  | Mi Radar (motivo y fila de Yo) | «Mi Radar empieza en tu día 8. Primero elige tu Día 1.» / «Primero elige tu Día 1» | «Mi Radar empieza en tu día 8. **Primero empieza tu programa.**» / «**Primero empieza tu programa**» |
  | Aviso de error (Hoy, Yo, Training) | «No pudimos comprobar tu Día 1» + «Reintentar Día 1» | «No pudimos comprobar tu programa» + «**Reintentar**» |
  | Objetivos sin programa; fin del diagnóstico; Administración (cambiar día) | «Cuando elijas tu Día 1…»; «…aceptar los Términos y elegir tu Día 1»; «Todavía no eligió su Día 1» | «Cuando empiece tu programa…»; «…aceptar los Términos y empezar tu programa»; «Todavía no empezó su programa» |
  «Ahora no» (la ✕ de la fila de Hoy), el «volver» de la pantalla fuera del onboarding (su etiqueta pasa de «Volver sin elegir» a «Volver sin empezar») y que en el onboarding la pantalla se
  trague el gesto de retroceso no cambian.
* **Cómo se comporta un APK anterior contra el backend nuevo**: ve UNA sola fecha en el selector, preseleccionada, y «Confirmar mi Día 1» activa con ella; si guardó las fechas antes de la
  medianoche, el servidor responde 400 y ese APK vuelve a leerlas (E-594). **La app nueva contra un backend anterior** también funciona: usa la primera fecha que ofrece (mañana).
* **No cambian**: la duración por formación, `POST /mentor/activate-tracking` (inicio hoy; solo lo llaman APK ≤ 1.5.0), el reloj del programa, Hoy ni Plan fuera de estos textos, los
  demás tabs, ninguna animación (la pantalla es la misma, sin movimiento propio), ícono ni dependencia nueva.
* **Pruebas:** Jest `textoDelDiaUno` (el plazo y la fecha), `diaUnoRecuperacion` (la pantalla: una fecha, 400 con aviso y fecha nueva, 409, red perdida, servidor anterior),
  `elegirDiaUnoDelPersonal`, `filaDelProgramaPropio`, `filaDelPrograma`, `botonElegirDiaUnoSinEspaciado`, `onboardingFlowConDiagnostico`, `vistaDeMiRadar`, `miRadarEnYo`, `miRadarScreen`,
  `planFilaDelPrograma` y `planSinProgramaPropio` ajustadas. `e2e/dia-uno/` (Playwright) ajustado. Maestro, escritos y sin correr: `.maestro/empieza-manana/` (01 aprendiz en el
  onboarding, 02 personal sin fila, 03 fila sin activar con Training y Mi Radar, 04 el plazo según la formación); se ajustaron `hoy-programa-propio/01` y `mi-radar/16`.
* **Supuestos para el dueño**: «al día siguiente» es el día calendario siguiente (quien termina a las 23:58 empieza dos minutos después); `activate-tracking` queda como está; no hay
  aviso del teléfono nuevo.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y el backend con la spec 036 (sin migración); sin él la app funciona igual.
  > **Corregido 2026-11-02, más tarde (ajuste del dueño: «Después de la ficha inicial ya no le sale qué día escogerá. Firma, y al día siguiente ya es su día número 1, ¿verdad?»).**
  > En el **onboarding**, «Tu programa empieza mañana» ya no espera el toque: al montarse, justo después de firmar los Términos (o al reabrir la app con los Términos firmados),
  > activa sola (`activarAlMontar`: `POST /onboarding/activate-program` sin fecha, una sola vez aunque se monte dos veces; `activacionAlFirmar`, `useActivacionAlFirmar`). Dice
  > «Preparando tu programa…» sin fecha mientras responde; con la respuesta, la fecha del servidor y el plazo, y **«Entendido» solo continúa** a la app. Sin red: el mensaje de
  > siempre y «Reintentar». Si ya había activado y su Día 1 ya llegó, entra directo sin decir «mañana»; contra un servidor anterior que exige la fecha, usa la primera que ofrece.
  > **Siguen necesitando el toque** (para el personal el programa es opcional): Hoy, Plan, Yo, Training y Mi Radar, y las cuentas anteriores sin Día 1. Backend nuevo, ninguno (el
  > cuerpo del POST ya era opcional). Maestro `empieza-manana/01` y `04` y `e2e/dia-uno` ajustados; Jest `diaUnoRecuperacion`, `activacionAlFirmar`, `textoDelDiaUno` y
  > `onboardingFlowConDiagnostico`.

## Cambio por pedido del dueño — 2026-11-02 — Acuerdo de transformación: los términos nuevos, «Mi aceptación» y el cronograma que se firma al entrar (spec 039)

Textual: «Este será el nuevo términos y condiciones. Y cuando aceptes la solicitud con cronograma o sin cronograma: con cronograma, sale abajo para firmar también que estás de acuerdo; y sin cronograma, el de siempre
de firmar. No te guíes explícitamente como mencionan, solamente agregar esa parte cuando el usuario, administrador o alquimista agregue a alguien dentro de la app.» Spec y contrato en el backend
(`specs/039-acuerdo-de-transformacion/`, D-312). Lo que cambia y nada más (ni diseño de las demás pantallas, ni tabs):
* **El texto**: las 23 cláusulas del dueño, tal cual y numeradas, en las TRES formaciones (lo publica el servidor con la migración V162; las edita Administración desde la app, como siempre). Las de dos párrafos (18, 21, 22 y
  23) llevan una línea en blanco entre ellos. La Escuela dice «Formación RENASER»; el Diplomado, «Diplomado RENASER»; la Certificación, «Certificación RENASER»; «NASER» (la app) se deja. El texto que la app lleva por
  dentro para un servidor que no ofrece los términos (`terminosData.ts`, `TERMINOS_DE_LA_APP`) pasó al nuevo. El subtítulo dice «Lee atentamente las 23 cláusulas y sella tu aceptación.» (con punto).
* **«MI ACEPTACIÓN»** (`terminos/components/MiAceptacion`), al final de los términos y antes de firmar, solo lectura y quieto: las dos frases fijas —«He decidido formar parte de RENASER, consciente de mi compromiso con este
  proceso de transformación.» y «Declaro que he leído, comprendido y aceptado los términos y condiciones del programa al que ingreso.»— y cinco datos que llena el SISTEMA (ninguna IA): **Participante** (el nombre completo del
  perfil), **Programa** («Formación RENASER · 90 días», «Diplomado RENASER · 3 meses» / «· 1 año», «Certificación RENASER · 90 días»), **Fecha de inicio**, **Fecha de finalización** y **Fecha de aceptación** (la del día
  de hoy; la hora que queda guardada es la del servidor). La app no calcula nada: llega en `GET /onboarding/terms` → `agreement`. El inicio es el de «Tu programa empieza mañana» (spec 036) —o el real, si ya
  empezó— y el fin es su último día (inicio + duración − 1), nunca «90 días» escrito a mano. Sin programa que prometer (el personal que no activó el suyo) no hay fechas y el programa dice solo su nombre; sin `agreement`
  (un servidor anterior) no se dibuja el bloque. Lo escribe `terminos/utils/miAceptacion` (puro).
* **Con cronograma** (solo al entrar a la app, el onboarding, y solo si el servidor manda `agreement.schedule`: primer ingreso, cronograma de la spec 032 sin confirmar): debajo de «Mi aceptación» sale **«Mi cronograma de pagos»**
  (`MiCronogramaDePagos`): la moneda, una fila por cuota con el mismo dibujo de «Mi ingreso» (`FilaDeCuota`: fecha, monto y «Pendiente») y la casilla con la frase de la cláusula 19, «Acepto el cronograma de pagos registrado en NASER
  y me comprometo a cumplirlo.». Sin esa casilla «Continuar» no avanza y dice «Cronograma por aceptar» (la casilla se marca en rojo con «Marca esta casilla para continuar.»). Al firmar, el pedido lleva `scheduleFingerprint` y el
  servidor confirma el cronograma con la MISMA confirmación de la spec 032 (el nombre completo del perfil, la hora y la huella): «Mi ingreso» ya sale «Confirmaste tu cronograma el …» y no lo vuelve a pedir. **Sin
  cronograma, o con «pagó completo», la firma es la de siempre, sin esa sección.**
  > **Corregido 2026-11-02 (decisión del dueño: «lo de los pagos no debe de salir en términos y condiciones ya que será asíncrono»).** Todo este punto **ya no es cierto**: ni «Mi cronograma de
  > pagos», ni su casilla, ni `scheduleFingerprint`, ni el 409 «Tu cronograma cambió mientras leías», ni «Firmaste tu cronograma de pagos con los términos.». Lo mismo en «El pedido», «Qué guarda el servidor»
  > y «Orden del onboarding» de abajo, en lo que hablan del cronograma. «Mi aceptación» y el texto no cambian. Ver «Decisión del dueño — 2026-11-02 — el cronograma de pagos no va en los términos».
* **Orden del onboarding**: Ficha → (diagnóstico, si lo tiene) → Términos con «Mi aceptación» y, si corresponde, el cronograma → firma → «Tu programa empieza mañana» (se activa sola). Las fechas de «Mi aceptación» y las de «empieza
  mañana» son las mismas (las dos salen de la misma cuenta del servidor).
* **Volver a aceptar** (quien ya estaba dentro: «Actualizamos nuestros términos», `TerminosActualizadosScreen`): el texto nuevo y «Mi aceptación» con su programa y sus fechas REALES (ya empezó), **sin** la sección del cronograma,
  aunque tenga uno. A quien recibe un cronograma después, o lo tiene cambiado, se le pide en «Mi ingreso» como hoy (spec 032), sin volver a firmar los términos. Esta pantalla no manda ninguna huella.
* **El pedido** (`POST /onboarding/milestones`, hito `TERMINOS`) suma `agreementStartDate` (el inicio que vio) y `scheduleFingerprint` (la huella del cronograma que aceptó, si lo firmó). Si ya no coinciden con los de ahora el
  servidor responde **409** y no registra nada: «Pasó la medianoche y tus fechas cambiaron: léelas de nuevo.» o «Tu cronograma cambió mientras leías: revísalo de nuevo.»; la app relee, lo dice con las palabras del servidor
  (título «Algo cambió mientras leías») y vuelve a pedir lo marcado. «Continuar» espera a que lleguen los términos (`loading` hasta `cargada`) para no firmar sin lo que el servidor ofrece.
* **Qué guarda el servidor** junto a la constancia de la spec 027: el programa, el inicio y el fin que se mostraron y, si firmó el cronograma, su huella. Yo → Mi onboarding → «Términos y condiciones» y la constancia de la ficha de
  Administración lo dicen («Formación RENASER · 90 días», «Del 3 de noviembre de 2026 al 31 de enero de 2027», «Firmaste tu cronograma de pagos con los términos.»); lo aceptado antes no dice nada de eso.
* **No cambian**: la firma (dibujo o nombre) y su casilla, las validaciones de siempre («Aceptación requerida», «Firma requerida»), «Mi ingreso», el editor de términos de Administración (muestra y edita las 23 cláusulas, también
  las de dos párrafos), la barra de pestañas ni las demás pantallas. Sin dependencias ni código nativo.
* **Supuestos para el dueño**: el texto nuevo reemplaza a los vigentes en las tres formaciones; «(Formación, Diplomado o Certificación RENASER)» es el programa de la persona; quien ya estaba dentro vuelve a aceptar con su firma al abrir
  la app; el Diplomado y la Certificación, que no tenían términos publicados, quedan con estos; el nombre con el que se confirma el cronograma es el nombre completo del perfil. Límite aceptado: si la medianoche cae entre firmar y que
  se active el programa (segundos), la fecha de «Tu programa empieza mañana» puede ser un día después de la firmada.
* **Pruebas**: Jest `miAceptacion` (lectura y líneas), `acuerdoDeTransformacion` (las pantallas sin cronograma, con cronograma y volver a aceptar, el 409), `loMostradoAlAceptar` (releer y la constancia), `borradorDeTerminos` y
  `cableadoDeTerminos` (el texto de respaldo y el cableado). Maestro, escritos y sin correr: `.maestro/acuerdo-de-transformacion/` (01 a 04).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y el backend con la spec 039 (V162) antes; sin él la app usa el texto que lleva y no dibuja «Mi aceptación» ni el cronograma.

## Corrección — 2026-11-02 — la Ficha Inicial dice el plazo de la formación de cada persona (issue #103)

Identidad por formación en todo: la Ficha Inicial estándar —la que ve quien no tiene diagnóstico— decía «durante los 90 días», «me comprometo a los 90 días» y
«compromiso a los 90 días» a todos, también a quien está en un Diplomado de 3 meses o de 1 año. Ahora el plazo sale de la formación de la persona
(`useFormacionDeLaSesion` → `plazoDelObjetivo(duracionDias, codigo)`, el mismo que usa «Tu programa empieza mañana», `lineaDelPlazo`). Lo que cambia y nada más:
* **Tres textos**: la ayuda de «¿Qué esperas concretamente de Renaser?» («…en tu mente, cuerpo y negocio durante los 90 días» / «durante los 3 meses» / «durante
  el año»), la casilla del consentimiento («Autorizo el uso de mis datos y me comprometo a los 90 días» / «a los 3 meses» / «al año») con su nombre para el lector de
  pantalla («Consentimiento y compromiso de 90 días» / «3 meses» / «1 año»), y el aviso «Por favor marca la casilla de autorización de datos y compromiso a los 90 días
  para continuar.» (`plazoConArticulo` y `alPlazo` en `pasosFicha`: el artículo y la contracción «al año»).
* **Con 90 días las frases son EXACTAMENTE las de siempre**, palabra por palabra: la Escuela y la Certificación no ven ningún cambio, y sin formación conocida
  (un servidor anterior, o todavía sin leer) vale el de siempre, 90 días (`PLAZO_POR_DEFECTO`). `validarPaso`, `validarCapitulo` y `ChapterConsentimiento` suman un
  parámetro opcional `plazo`; `PasoFicha.bajada` puede ser una función del plazo (`bajadaDelPaso`).
* **No cambia** lo que se guarda (`compromiso90Dias` sigue siendo la clave del contrato con el servidor), las preguntas, ni los demás avisos.
* **Barrido de todo `features/onboarding/` (ampliación, mismo día).** El E2E lo confirmó en pantalla con un Diplomado de 1 año, y quedaban más «90 días». Un
  solo mecanismo para todo: `usePlazoDeLaSesion` (`formaciones/hooks`; `{ plazo, duracionDias }` de la formación de la sesión) y las frases de
  `formaciones/utils/plazoEnFrases` (`plazoConArticulo`, `alPlazo`, `losProximos`, `diaDeLaEtapa`). Con 90 días cada texto es el de siempre. Ahora también dicen el
  plazo de SU formación: el subtítulo del capítulo 3 (`chaptersConfig.subtitle`, `subtituloDelCapitulo`), «Ratifico mi compromiso con los 90 días de Renaser» y su
  «Día 90» (`ChapterCompromiso`), los campos de Cuerpo y Negocio y sus ejemplos (`ChapterCuerpo`, `ChapterNegocio`: «A 3 MESES», «al Día 365»), los avisos y campos del
  cuestionario profundo (`bloquesCuestionarioProfundo`, `textoDelAviso`, `CuestionarioProfundoScreen`), «LOS PRÓXIMOS 90 DÍAS», «90 días de compromiso…» y las etapas
  «DÍA 01 / 30 / 60 / 90» de la bienvenida (con 365 días: 01, 122, 243 y 365, la misma proporción de las fases; `BienvenidaScreen`), «Activaste tu protocolo innegociable de
  90 días» (`GongVictoriaScreen`) y el último compromiso del Pacto (`pactoData`).
  **Ojo, qué se ve de verdad:** la Ficha Inicial estándar y «Tu programa empieza mañana» son las pantallas vivas. `BienvenidaScreen`, `GongVictoriaScreen`, el cuestionario
  profundo (`CuestionarioProfundoScreen` y sus `Chapter…`) y `pactoData` **no están montados hoy** (nadie los importa): se corrigieron para que, si vuelven, no digan 90 a
  nadie. `usePlazoDeLaSesion` no pide nada: lee el contexto de la formación que ya está en la sesión.
* **Fuera de `onboarding/`:** los demás «90 días» de la app se corrigieron en el issue #104 (entrada de abajo).
* **Pruebas:** `fichaPorFormacion.test.ts` (los tres plazos en los tres textos, la frase de siempre con 90 días y el cableado de `FichaInicialScreen`),
  `plazoEnElOnboarding.test.ts` (las frases, cada pantalla con 90 días, 3 meses y 1 año, y un barrido que falla si el código de `onboarding/` vuelve a escribir «90 días»
  o «Día 90» a mano) y `usePlazoDeLaSesion.test.ts`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.

## Cambio por pedido del dueño — 2026-11-06 — el código de verificación también por WhatsApp (spec 043)

Textual: «si no llega o está lleno el correo… otras empresas usan SMS o WhatsApp». Decisiones del dueño del 06/11: **solo WhatsApp** (nada de SMS, Amazon SES ni
ayuda desde Administración); **al solicitar acceso se pide el WhatsApp** con el selector de país de la Ficha Inicial y, aceptada la solicitud, **rellena la ficha**;
**al recuperar la contraseña el código va al WhatsApp que la cuenta ya tiene guardado, nunca a uno que se escriba en ese momento**. Spec, plantilla y decisión en el
backend (`specs/043-codigo-por-whatsapp/`, D-325). Toca el ingreso (`LoginScreen`, el diseño del 2026-10-05 no cambia más que esto). Lo que cambia y nada más:
* **Solo con el canal disponible** (`GET /api/v1/auth/whatsapp-code` → `available: true`; el interruptor de Soporte TI `auth.codigo_whatsapp` **nace apagado** hasta que
  Meta apruebe la plantilla). Se pregunta una vez al abrir el ingreso (`codigoPorWhatsAppDisponible`, que nunca lanza): **un 404 (apagado o backend anterior) o cualquier
  error = no hay canal, y el ingreso queda exactamente como hoy**: ni el campo ni el enlace.
* **«Solicitar acceso» suma el campo «WhatsApp»** entre el correo y la contraseña: el mismo `PhoneCountryInput` de la ficha (píldora del país + número), con la ayuda «Por si el
  código no te llega al correo.». Es obligatorio y se valida con la regla de la ficha (`validarWhatsapp`) más la forma que el servidor puede usar (`+`, código de país y de
  8 a 15 dígitos; `avisoDelWhatsappDelRegistro`). Viaja como `phone` de la solicitud (`"+51 987654321"`, el campo existía y nadie lo llenaba); al aceptarla, el servidor lo
  deja en la respuesta `whatsapp` de la Ficha Inicial sin pisar una existente, y la ficha lo trae ya escrito (ya leía lo guardado).
* **La pantalla del código, más limpia** (pedido del dueño del mismo día, con captura: «mucho texto, más limpio»; vale para el alta y para recuperar la
  contraseña, con el mismo estilo, `pantallaDelCodigo` en `LoginScreen`): el título **«Ingresa tu código»** (se fue «Verificación de seguridad» y el «INGRESA
  TU CÓDIGO» en versalitas), **una línea** «Te lo enviamos a ana@…» (en la recuperación, «Si tu correo tiene cuenta, te lo enviamos a ana@…»; se fue la
  caja que lo repetía), las seis casillas, **una línea chica** «¿No te llegó? Reenviar» (o «Reenviar en 43 s»; era «¿NO RECIBISTE EL CÓDIGO? REENVIAR»), el
  botón dorado **«Confirmar»** en tipo oración (era «CONFIRMAR Y ENVIAR SOLICITUD» / «VERIFICAR CÓDIGO») y nada más: **volver es la flecha de la cabecera**
  (se fueron «VOLVER AL INICIO DE SESIÓN» y «CAMBIAR DE CORREO»; en la recuperación la flecha vuelve un paso, a cambiar el correo). El aviso de reenvío y los
  errores son una línea chica, sin caja. Las etiquetas para el lector de pantalla no cambiaron («Verificar el código», «Verificar el código de recuperación»).
* **A los 60 segundos, en esa misma línea**, aparece **«· Por WhatsApp»** (`EnlaceDeWhatsApp`, 48 de alto táctil; el lector oye «Envíamelo por WhatsApp. Va a
  +51 9•• ••• •21» en el alta y «Envíamelo por WhatsApp» en la recuperación). Al tocarlo, debajo: en el **alta** «Te lo enviamos por WhatsApp a +51 9•• ••• •21»
  (enmascarado como el servidor, `enmascararWhatsapp`); en la **recuperación** siempre «Si tu cuenta tiene un WhatsApp guardado, te lo enviamos ahí»: la app no
  sabe (ni debe saber) si la cuenta tiene número, porque mostrarlo diría que el correo tiene cuenta (anti-enumeración; el servidor responde 202 sin cuerpo en
  todos los casos). Un error (429 por los límites, 409, red) se dice en esa línea con el texto del servidor y el enlace sigue para reintentar;
  `tacto.logro()` / `tacto.error()`. Reenviar por correo no reinicia la espera. **El código es el mismo** (el servidor manda el vigente del correo) y se escribe
  en las mismas casillas: nada más cambia en la verificación.
* **Política de privacidad** (`public/privacidad/index.html`): el WhatsApp se pide desde que se solicita acceso y se usa también para mandar el código de verificación cuando no
  llega al correo (al número escrito en el alta; al guardado, en la recuperación). Sale con el deploy de Vercel.
* **No cambian**: el login, los textos y el orden del alta sin canal, la verificación del código, la Ficha Inicial, los cinco tabs. Sin dependencias ni código nativo.
* **Pruebas:** Jest `codigoPorWhatsApp` (los 60 s, la máscara, la validación, los textos), `codigoPorWhatsAppApi` (404 = sin canal, la recuperación no lleva número),
  `loginCodigoPorWhatsApp` (sin canal todo como hoy; con canal el campo, el enlace a los 60 s, el número enmascarado, el WhatsApp en la solicitud, la recuperación sin número, la pantalla del código sin versalitas ni caja repetida)
  y `privacidadCodigoPorWhatsApp`. E2E en el emulador contra el backend local y un YCloud falso (capturas en el PR).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) **y el backend de la spec 043 antes**. Contra un backend anterior la app queda como hoy.
