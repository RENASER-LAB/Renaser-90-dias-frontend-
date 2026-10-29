# Ingreso, onboarding y Día 1 — cambios autorizados por el dueño

Historial movido tal cual desde `AGENTS.md` el 2026-10-29 (en el orden en que estaba). Cada entrada dice
qué autorizó el dueño y «lo que cambia y nada más». Una entrada que toca varios tabs vive en un solo archivo;
el índice `README.md` lista todas con los tabs que tocan. Cuando una entrada dice «más arriba» o «más abajo»,
se refiere a su posición en el `AGENTS.md` original: búscala en el índice por fecha y título.

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
  * **Términos y Día 1:** el mismo esqueleto, con «CONTINUAR» / «CONFIRMAR MI DÍA 1» fijos abajo.
    Términos atiende el gesto atrás de Android (vuelve a la ficha).
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
  * **«Ahora no»** sigue escondiendo la invitación solo en Hoy; Yo la ofrece siempre que el servidor diga
    `canStartProgram` (`useProgramaPersonal` devuelve además `puedeActivar`, sin el pospuesto).
  * Nada depende del nombre del rol (los dos idiomas: `MENTOR_LEAD`/`LIDER_MENTORES`, `ALCHEMIST`/`ALQUIMISTA`): lo
    decide el servidor (`activated`, `canStartProgram`). El flujo del aprendiz no cambia.

## Recuperación del Día 1 de cuentas anteriores — 2026-10-10 (backend E-594/E-596/E-597).

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
  Verificación final del 2026-10-12: 34/34 E2E de Día 1 y 5/5 mapas completos, cero reintentos,
  fallos, errores u omitidos. JUnit y persistencia SQL en `artifacts/e2e-dia-uno/` y `artifacts/e2e-mapa/`.
