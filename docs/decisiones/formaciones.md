# Formaciones (Escuela, Diplomado, Certificación): specs 022–025, 035 y el plazo de cada formación

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Cambio por pedido del dueño — 2026-10-31 — formaciones: Escuela, Diplomado y Certificación (spec 022)

Pedido del dueño del 31/10 (decisiones en `~/.config/renaser-e2e/formaciones/decisiones-del-dueno-2026-10-31.md`; spec, plan y contrato en el backend,
`specs/022-formaciones/`, D-295). Renaser deja de ser un solo programa de 90 días: hay **tres formaciones fijas** —**Escuela Renaser** (90 días),
**Diplomado Renaser** (3 meses = 90 días, o 1 año = 365) y **Certificación Renaser** (90 días)— con los mismos roles pero **aisladas entre sí**. Lo
decide y lo filtra **siempre el servidor**; la app solo lo muestra. Lo que cambia y nada más (esta spec es la base: el contenido por formación —hábitos,
Muro, cursos, ranking— llega con las siguientes):
* **Autorizado en los cinco tabs, y nada más que esto:** (1) en **Hoy**, una línea con el **nombre de la formación** sobre la frase del día, solo si la
  persona tiene más de una o no es de la Escuela (`NombreDeLaFormacion`); para el aprendiz de la Escuela Hoy queda **idéntico**; (2) en **Yo**, la fila
  **«Cambiar de formación»** (ícono `layoutGrid`, ya existente) con la activa como detalle, **solo** para el personal asignado a más de una, que abre
  una `HojaDesdeAbajo`; (3) en **Yo**, la tarjeta de fase y «Día N de M» usan la **duración de cada persona**; (4) en **Administración**, la sección
  **«Formaciones»** (en «Más» de la raíz) y los filtros/fichas de abajo. Los tabs, la barra y los diseños de las otras pantallas **no cambian**.
* **La sesión trae la formación** (`formacion` en `/auth/me`, login y social; `GET /api/v1/me/formacion`): `{ activa, disponibles, puedeElegir,
  veTodas, sinFormacion, duracionDias, fases }`. `FormacionProvider` (en `App.tsx`, dentro de la sesión) la guarda, la relee al volver al frente (así
  un traslado se nota sin cerrar la app) y expone `elegir`. **Un backend anterior no la manda: la persona se trata como de la Escuela** (nunca se
  inventa una elección ni un selector). El esquema es tolerante (`formaciones/api/formacionesSchemas`): una opción rota se pierde ella, no la sesión.
* **Al cambiar de formación todo se arma de nuevo**: la `key` de `MainTabs` (en `RootNavigator`) es `cuenta|formaciónActiva` (`llaveDeLasVistas`), el
  mismo mecanismo de «ver como». No queda a la vista nada de la formación anterior ni por un instante. Sin formación conocida la `key` es la de siempre.
* **La pregunta de la primera vez** (`EleccionDeFormacionScreen`): «¿En qué formación vas a trabajar hoy?», una fila por formación, **una sola vez por
  teléfono y cuenta** (`renaser.formacion.eligio.<cuenta>` en AsyncStorage; si el almacenamiento falla, no se pregunta) y solo para el personal con
  varias. Después el servidor recuerda la última. Sin ✕ ni «atrás» (no hay a dónde volver). **No lleva cifras por formación** (aprendices, pendientes):
  el servidor no las manda a esta cuenta y no se inventan.
* **Personal sin ninguna formación** (`SinFormacionScreen`): «Administración todavía no te asignó una formación.» con «Volver a revisar» y «Cerrar
  sesión»; nada más. Administración, Alquimista y Soporte TI **ven las tres** (`veTodas`) y no tienen selector ni nombre en Hoy.
* **Días y fases por duración.** `/home` suma `duracionDias` y `formacion`. Las cuatro fases se estiran: con 90 días son 1, 8, 35 y 65; con 365, **1, 29,
  138 y 260** (`formaciones/utils/fasesDeLaDuracion`, la misma cuenta que el servidor; `faseEnCurso(fase, día, duración)`). Los nombres y las claves de
  fase no cambian (son contrato). «Los días que quedan» del Mapa usa la duración (`diasQueQuedan(día, duración)`). **No se tocó** el plan de
  objetivos/acciones ni las pastillas de hábitos: siguen en 90 hasta sus specs.
* **Cerrado el mismo día (pedido del coordinador):** (1) **«El Método»** (Yo → Ajustes) dice «4 fases en N días» y el rango de cada fase de SU
  programa (`metodoFasesDe(duración)`, sobre `fasesEnOrden`); con 90 días es el de siempre. (2) **«Cambiar día del programa»** (Administración y el
  aviso de emergencia del chat de soporte) acota con la duración de la persona: el último día ajustable es el penúltimo (89 en la Escuela, 364 en el
  Diplomado de un año; `ultimoDiaAjustable`), «Hoy está en el día N de M» dice la suya, y la ficha le pasa `programDuration` del detalle; si no la
  sabe (el aviso del chat solo trae el día de hoy), `useDuracionDelPrograma` la lee una vez del detalle y mientras tanto vale 90 (el servidor vuelve a
  acotar). La pantalla de emergencia del aprendiz ya leía el tope que manda el servidor (`diaMaximo`).
* **Administración → Formaciones** (`formaciones/screens/FormacionesAdminScreen` y `FormacionDetalleAdminScreen`, **solo Administración y Alquimista**):
  las tres con nombre, duraciones, cifras y «N por atender»; el detalle (Resumen, Personas, Grupos, Por atender) y **«Ver personas» / «Ver grupos»,
  que abren esas listas ya filtradas por la formación** (las cifras salen de las mismas consultas que las listas). «Editar» (`EditarFormacionSheet`):
  nombre (3–80), descripción (≤ 600), «Disponible» y las duraciones (3 meses / 1 año); guarda con `version` (409 si otra persona la cambió antes). Cambiar
  las duraciones rige solo para quien entre o se traslade después. Las secciones «Ficha y términos» y «Hábitos y contenido» del detalle **no se dibujan
  todavía**: llegan con las specs 026/027 y 023.
* **Filtro «Formación»** (`FiltroDeFormacion`: Todas · Escuela · Diplomado · Certificación) en **Personas** (va al servidor, `?formation=`) y en
  **Grupos** (sobre `formation` de cada grupo); cada fila nombra la formación si no es la Escuela.
* **Ficha de una persona** (`FormacionDeLaPersona`): su formación y duración, **lo que cursó antes** (historial) y, para un **aprendiz**, **«Pasar a otra
  formación»** (`TrasladarAprendizSheet`): destino entre las disponibles, duración que ese destino ofrece, y «Darla por terminada» con un **motivo** (3–500)
  si todavía no terminó. Una confirmación dice que **empieza de cero allí** (día 0, sin grupo ni mentor, 100 puntos) y que su historial queda. Un 409
  («todavía no terminó») abre el motivo. **Equipo y roles** suma **«Formaciones en las que trabaja»** (`FormacionesDelPersonal`) para mentor, guía y
  líder: marcar una o más, cuál queda activa; el servidor impide quitar una donde lidera un grupo y dice cuál. Si el servidor no ofrece estas secciones
  (backend anterior), no se dibujan.
* **Sin animaciones nuevas** (se ven poco y son de consulta): `Presionable`, `HojaDesdeAbajo`, `tacto.seleccion()` al elegir y `tacto.logro()` al
  quedar guardado. Textos en tipo oración y tuteo; áreas táctiles de 48 o más; un solo scroll por pantalla; la fuente solo por los roles de
  `theme/fuentes.ts`. Sin íconos, dependencias ni código nativo nuevos.
* **Pruebas:** Jest en `src/features/formaciones/__tests__` (fases y duraciones, tolerancia de la sesión, el nombre/pregunta/aviso, el proveedor, la
  API, el centro, la edición, el traslado, las formaciones del personal y el cableado) y los tres guardas de texto de `src/screens/__tests__` que
  cambian con `duracionDias`. Maestro, escritos y sin correr: `.maestro/formaciones/` (`README.md` explica las cuentas).
* **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por aire) **y el backend de la spec 022 antes**
  (V125–V128). Con el APK nuevo contra un backend anterior todo queda como hoy; con el APK anterior contra el backend nuevo también (la formación
  por defecto es la Escuela).

## Cambio por pedido del dueño — 2026-10-31 — hábitos y categorías por formación (spec 023)

Pedido del dueño del 31/10 (decisiones en `~/.config/renaser-e2e/formaciones/decisiones-del-dueno-2026-10-31.md`; spec, plan y contrato en el backend,
`specs/023-habitos-por-formacion/`, D-300): «el sistema debe configurarse las categorías de hábito por formación» y «debe mostrar los hábitos por formación».
Cada formación (Escuela, Diplomado, Certificación) tiene **sus categorías** y **sus hábitos**; una persona ve solo los de la formación en que hace su
programa. Lo decide y filtra **siempre el servidor**; la app solo lo dibuja. Lo que cambia y nada más:
* **Autorizado en Training, Hoy y Administración, y nada más que esto:** (1) las **dimensiones de Training** (nombre, ícono y orden) salen de las
  categorías de la formación; (2) en **Hoy**, «Hábitos de hoy» no se dibuja si la formación todavía no tiene hábitos para la persona; (3) la línea de
  **«Mi programa» en otra formación**; (4) **Administración → Más opciones → «Hábitos del programa»** gana el selector de formación, «Categorías» y «Copiar a
  otra formación». Plan, Yo, Comunidad, la barra y los diseños de Training y Hoy **no cambian**; el aprendiz de la Escuela ve **exactamente lo mismo**.
* **Las categorías llegan del servidor** (`habits/categorias/`: `GET /api/v1/habit-categories`, esquema zod tolerante —una categoría rota se pierde ella,
  no la lista—, `useCategoriasDeHabito` con UNA lectura por cuenta y formación compartida por todas las pantallas, y `estado/estadoDeCategorias`). Sin
  respuesta (backend anterior, 404, sin red) valen **las cuatro de la Escuela de siempre**, con su orden, nombre e ícono. `DimensionDeTraining` pasó de una
  unión cerrada a `string`: las cuatro de la Escuela conservan su clave (`CUERPO`, `MENTE`, `EMOCIONES`, `ESPÍRITU`, que usan Planificar, los avisos con
  `?dimension=` y las pruebas); cualquier otra categoría usa su `code` (`DIPLOMADO_ESTUDIO`). «Vida y negocio» sigue siendo de las acciones de los
  objetivos, no una categoría de hábito. El campo `category` de los hábitos es ahora un texto abierto y llega además `categoryKey`.
* **Training** dibuja las categorías **activas** de la formación en el orden del servidor, y una categoría sin hábitos que le toquen a la persona **no se
  dibuja** (`dimensionesQueSeDibujan`). Un **hábito propio** cuya categoría no está entre las de la formación vigente se agrupa en **«Mis hábitos»**
  (dimensión virtual `MIS_HABITOS`, ícono `listChecks`). Si la formación no tiene ningún hábito para la persona, Training dice «Tu formación todavía no
  tiene hábitos.» (nunca un error ni una pantalla vacía) y Hoy no dibuja «Hábitos de hoy» (`sinHabitosEnLaFormacion`).
* **«Mi programa» solo en la formación del programa** (`programaEnOtraFormacion`, `AvisoDeProgramaEnOtraFormacion`): si el servidor dice que los hábitos
  de la persona son de una formación distinta de la que tiene activa y puede elegir, Training y Hoy muestran **una línea** —«Tu programa propio está en
  Escuela Renaser. Cámbiate a ella para verlo.»— con «Cambiar de formación» (el selector de la spec 022) en lugar de la lista. Para quien tiene una sola
  formación, o ve las tres, no hay nada nuevo (ni selector ni la palabra «formación»). El servidor sigue entregando esos hábitos propios del programa; es
  la app la que no los muestra.
* **Las alarmas de otra formación no suenan** (FR-018): la puesta al día de alarmas (`ajustarRecordatoriosAlServidor`) **retira** las alarmas locales,
  el puente de «cumplido hoy» (issue #33) y las repeticiones de un hábito que el servidor ya no lista —los de la formación anterior tras un traslado—,
  solo cuando la lista llegó bien (una lectura fallida no borra nada; una lista vacía legítima sí retira todo). No cambia sonido, canales ni «cómo suena».
* **Administración → «Hábitos del programa»** (solo Administración y Alquimista): el selector de formación (`FiltroDeFormacion`: Todas · Escuela ·
  Diplomado · Certificación; sin `formation` el servidor responde la Escuela, que es lo que el cliente anterior esperaba, y la app pide `ALL` para «Todas»)
  decide la lista, los filtros por rol y los activos/inactivos. En **«Todas»** cada fila nombra su formación y **no se crea** (crear y editar son siempre
  dentro de una formación concreta). El formulario ofrece **solo las categorías activas de la formación del hábito**. **«Copiar a otra formación»**: elegir la
  formación destino y una categoría de ELLA; la copia es independiente (mismo contenido, horarios, guía y audiencia por rol) y los motivos del servidor
  (título o función repetidos, categoría desactivada) se muestran tal cual. **«Categorías»** (`CategoriasDeHabitoAdminScreen`, vista de la pila de
  `AdminScreen`): la lista de la formación con ícono, nombre, activa/inactiva y cuántos hábitos tiene; «Nueva categoría», renombrar, el ícono (entre los 16
  que la app ya dibuja), subir/bajar (botones de 48, sin arrastrar), activar/desactivar y eliminar (con confirmación). Una categoría con hábitos activos no se
  desactiva ni se elimina y una con historial solo se desactiva: lo dice el servidor con su motivo. El atrás sube un nivel por vez (categorías → hábitos del
  programa → más opciones).
* **Sin animaciones nuevas** (pantallas de consulta y configuración): `Presionable`, `HojaDesdeAbajo`, `tacto.seleccion()` al elegir y `tacto.logro()` al
  quedar guardado. Textos en tipo oración y tuteo; toques de 48 o más; un solo scroll por pantalla; la fuente solo por los roles de `theme/fuentes.ts`.
  Sin íconos, dependencias ni código nativo nuevos.
* **Compatibilidad:** contra un backend anterior no hay categorías por formación (404): valen las cuatro de siempre y todo queda como hoy; con el APK
  anterior contra el backend nuevo, la Escuela sigue igual (`category` conserva `BODY`, `MIND`, `CONSCIENCE`, `SPIRIT`).
* **Pruebas:** Jest en `habits/categorias/__tests__` (esquema tolerante, dimensiones, estado, hook), `training/hooks/__tests__/categoriasPorFormacion`
  (un aprendiz del Diplomado ve sus categorías y nada de la Escuela, «Mis hábitos», formación sin hábitos), `dimensionesQueSeDibujan`,
  `formaciones/__tests__/programaEnOtraFormacion`, `home/__tests__/sinHabitosEnLaFormacion`, `alarmas/__tests__/retirarLasAlarmasDeHabitosAjenos`
  y las de Administración (`habitosPorFormacionEnAdministracion`, `categoriasDeHabito`, `habitosProgramaPorFormacion`, `habitosProgramaApi`). Maestro,
  escritos y sin correr: `.maestro/habitos-por-formacion/` (`README.md` explica las cuentas).
* **Hace falta un APK nuevo** (solo JavaScript: no hay código nativo nuevo, pero la app no se actualiza por aire) **y el backend de la spec 023 antes**
  (V134–V136, y la 022).

## Cambio por pedido del dueño — 2026-10-31 — Administración → Solicitudes: aceptar eligiendo formación, duración, rol y ficha (spec 025)

Pedido del dueño (textual): «Al aceptar a la persona, primero se elige a qué formación entra; si es el Diplomado, si es de 3 meses o de 1 año. Luego, qué rol ocupará dentro de la app.
Debe activarse con diagnóstico o sin diagnóstico.» Decisiones del 31/10 (025-1 a 025-8): «con diagnóstico» vale para cualquier rol; se puede cambiar la duración de quien ya empezó; se acepta una
por una y varias a la vez; **viene marcado Escuela, Aprendiz y sin diagnóstico**. Backend D-302 (`specs/025-solicitud-con-formacion/`). Lo que cambia y nada más:
* **«Aceptar» abre una hoja** (`AceptarSolicitudSheet`, `HojaDesdeAbajo`) en lugar de la fila de chips de rol que cada solicitud llevaba. Tres bloques numerados que se abren de a uno
  (`BloqueDeAceptacion`): **1 Formación** (con la **duración** debajo si el Diplomado ofrece más de una: «3 meses» / «1 año», con las palabras que manda el servidor), **2 Rol** (los mismos
  chips y orden de siempre, con los roles personalizados) y **3 Ficha de entrada** («Sin diagnóstico» / «Con diagnóstico»). Arriba, una **frase de resumen** («María entrará al Diplomado Renaser de
  1 año como Aprendiz, con diagnóstico.») y «Aceptar» fijo abajo, apagado con una línea que dice qué falta. Aceptar a un aprendiz de la Escuela son **dos toques** (Aceptar y Aceptar). La hoja no
  acepta sola: devuelve lo elegido y la pantalla hace el pedido.
* **El rol decide cuántas formaciones se piden** (`modoDeFormacionDelRol`, en `utils/aceptarSolicitud`): el aprendiz, una; mentor, guía de aprendiz y líder, una o varias; Administración y
  Alquimista, ninguna («ven las tres»). Cambiar el rol ajusta la formación conservando lo que siga valiendo. Un rol personalizado se pide según su rol base.
* **Aceptar varias** (025-3 C): «Seleccionar varias» marca solicitudes (`Checkbox`) y «Aceptar N solicitudes» abre la misma hoja con **una misma elección**; se hacen **una por una**
  (`aceptarUnaPorUna`): una que falla (la decidió otra persona) no deshace las demás; queda en la hoja con su motivo para reintentar. «La misma que la última» (solo en esta sesión) repite la
  elección anterior sin aceptar por sí sola.
* **La lista tiene tres vistas** (`ControlSegmentado`): Por decidir, Aceptadas y Rechazadas. Las aceptadas dicen «Aceptada por Ana el 31 oct» y qué se eligió («Diplomado 1 año · Aprendiz ·
  con diagnóstico»; las de antes de las formaciones, «Escuela · sin diagnóstico»), con el filtro `FiltroDeFormacion` de la 022. Las rechazadas, el motivo.
* **Contra un backend anterior** (sin `GET /account-requests/acceptance-options`, 404) la hoja pide solo el rol y **no manda formaciones**: el servidor viejo las ignoraría en silencio y la
  persona entraría a la Escuela sin que quien la acepta lo sepa. «Con diagnóstico» no se ofrece mientras el servidor diga `diagnosisAvailable: false` (no hay diagnóstico publicado, spec 026).
* **La ficha de la persona dice cómo entró** (US4, escenario 1; `AceptacionDeLaPersona`, entre «Su formación» y «Día del programa» de `FichaAprendizScreen`): «Cómo entró», «Aceptada por Ana el 31 de
  octubre» y debajo lo que se eligió («Diplomado 1 año · Aprendiz · con diagnóstico»). **Dice exactamente lo mismo que la lista de «Aceptadas»**: las dos usan `textoDeLaAceptada`
  (`utils/aceptarSolicitud`) y el servidor manda la misma forma `acceptance` en `GET /account-requests` y en `GET /admin/trainees/{id}` (con `acceptedByName` y `acceptedAt`). Es la foto de ese día:
  la formación y la duración de HOY están en las secciones de arriba y pueden haber cambiado. Una cuenta que no entró por una solicitud (la invitó Administración) o un backend anterior: la sección
  no se dibuja.
* **El rol personalizado queda en la foto** (V142): si se aceptó con «Mentor junior», la lista y la ficha dicen «Mentor junior (Mentor)» —el nombre que tenía ese día y, entre paréntesis, su rol base—
  (`customRoleId`, `customRoleName`; tolerantes: un backend anterior no los manda y se dice solo el rol base). Renombrar o borrar el rol después no cambia lo que dice lo aceptado.
* **Cambiar de formación en la hoja vuelve a pedir la duración** (o la aplica sola si la nueva ofrece una única): no se arrastra en silencio la que quedó de la formación anterior.
* **Cambiar la duración de quien ya empezó** (025-2 A): en la ficha de la persona (`FormacionDeLaPersona`), «Cambiar la duración» (`CambiarDuracionSheet`) pide la nueva duración entre las que
  ofrece su formación y un motivo de 3 a 280 letras; conserva su día y mueve el último; el último ajuste de la ficha lo dice («su programa pasó de 3 meses a 1 año»). Quien todavía no empezó
  se corrige con «Pasar a otra formación» (022).
* **Pruebas:** Jest `aceptarSolicitud` (reglas por rol, duración, frase, descripción, rol personalizado, `textoDeLaAceptada`), `aceptarVarias`, `aceptarSolicitudApi` (cuerpo, filtro, opciones, servidor anterior), `cambioDeDuracion` y `aceptacionEnLaFicha` (la lista y la ficha dicen lo mismo).
  Maestro, escritos y sin correr: `.maestro/solicitud-con-formacion/`.
* **No cambian:** Rechazar y borrar solicitudes, los demás tabs, «Equipo y roles», el resto de la ficha ni el onboarding de la persona (la ficha con o sin diagnóstico la pone la 026). Sin
  dependencias nuevas ni código nativo.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y el backend con la spec 025 antes.

## Cambio por pedido del dueño — 2026-10-31 — la Comunidad de cada formación (spec 024)

Pedido del dueño del 31/10 (decisiones en `~/.config/renaser-e2e/formaciones/decisiones-del-dueno-2026-10-31.md`; spec, plan y contrato en el backend,
`specs/024-comunidad-por-formacion/`, D-301). Cada formación tiene **su** comunidad: el Muro, los testimonios, los eventos, los cursos, la Tribu y el
ranking de una no se ven ni se escriben desde otra. **Lo filtra siempre el servidor**; la app solo avisa qué formación mira quien las ve todas. **Comunidad no
cambia de forma** (sus seis secciones, sus diseños y textos) y para el aprendiz, el mentor, la guía y el líder **no cambia nada**: ni un selector ni la palabra
«formación». Lo que cambia y nada más:
* **Selector de formación** (`formaciones/components/SelectorDeFormacionDeLaComunidad`), **solo para Administración, Alquimista y Soporte TI** (`veTodas`):
  una fila de 52 con el `ControlSegmentado` «Todas · Escuela · Diplomado · Certificación» arriba de Comunidad. Cambiarlo es instantáneo y vuelve a leer las
  seis secciones; se recuerda por cuenta en este teléfono (`formaciones/estado/formacionDeLaComunidad`, fuera de React porque lo leen las funciones de las
  APIs; lo mantiene `SincronizadorDeLaFormacionDeLaComunidad`, montado en `App.tsx`). **Un código de formación solo sale en un pedido si la cuenta ve todas y
  eligió una**: `?formation=` en las lecturas del Muro, las ocultas, los testimonios, los eventos, los cursos, la Tribu (lista, integrantes y renombre de la
  comunidad general) y el ranking. Para las demás cuentas cada pedido sale **exactamente como antes**.
* **«Todas»**: cada fila (publicación, testimonio, evento, curso, chat, entrada del ranking) lleva un rótulo chico con el nombre de su formación
  (`RotuloDeFormacion`, solo texto con borde, no se toca) y el ranking se agrupa por formación, cada una con su podio y su tabla
  (`ranking/components/RankingPorFormacion`, `agruparPorFormacion`: las posiciones son las que manda el servidor, dentro de cada formación; no se recalcula nada).
  > **Corregido 2026-11-03 (el dueño, viendo el Muro en «Todas»: «¿qué necesidad de agregar Escuela? Quita eso: arriba, como administrador, puedo
  > clasificar por tipo; se ve feo»).** La **tarjeta de la publicación del Muro** (`TarjetaPublicacionMuro`) ya no lleva el rótulo de formación, para
  > ningún rol. El selector «Todas · Escuela · Diplomado · Certificación» de arriba se queda tal cual y sigue filtrando. Los demás rótulos
  > (testimonios, eventos, cursos, chats y las «Publicaciones ocultas» de Administración) no cambian. Sigue llegando `formacion` en la publicación;
  > solo se dejó de dibujar. Ver la corrección del 2026-11-03 en la entrada de moderación del Muro.
* **Crear exige elegir**: publicar en el Muro y crear un evento con «Todas» no envían nada y dicen «Elige una formación arriba para publicar.» / «…para
  crear.» (`AvisoDeFormacionPorElegir`, una línea en el lugar de la acción, no un diálogo); con una elegida viaja `formation` en el cuerpo. El servidor igual
  responde 400 si faltara. Nada se crea «para todas» ni «sin formación».
* **Administración → Formaciones → el detalle de una formación → «Comunidad»** (`SeccionComunidadDeLaFormacion`): los cuatro tipos —comunidad general, grupo
  con mentor, soporte y directos— con un interruptor cada uno (`GET /admin/formaciones/{codigo}/comunidad`, `PUT …/comunidad/{tipo}`). Apagar uno **esconde**
  sus conversaciones para toda la formación sin borrar un mensaje y pide confirmación diciendo cuántas esconde («Esto esconde 12 conversaciones para toda
  la formación…»); prender guarda al instante. Rige al instante y sin app nueva. Contra un backend anterior (404/403 al leer) la sección no se dibuja.
* **El aviso de un mensaje** (`navigation/abrirAviso`, `formaciones/utils/avisoDeFormacion`): la ruta es `/chat/{id}` en la Escuela y
  `/chat/{id}?formacion=CÓDIGO` en las demás. El personal con varias formaciones **cambia su formación activa** a la del chat antes de abrirlo y se avisa en una
  línea («Cambiamos a Diplomado Renaser.»); si no la tiene asignada, el aviso se descarta. Administración pasa su elección a la del chat (solo local). Quien
  tiene una sola formación ignora el parámetro.
* **La imagen del podio** (`ranking/components/BotonDescargarPodio`) lleva el nombre de la formación que se mira (la elegida por Administración; la propia en
  las demás cuentas); sin dato, como hoy. Las pestañas **Kilómetros y Gimnasio salen siempre**: ocultarlas según los hábitos de la formación es de la spec 023
  (`// spec 023` en el código).
* **Esquemas tolerantes** (`formaciones/api/formacionTolerante`): `formation` en las filas de la Comunidad es opcional; un valor roto se pierde él, no la fila ni la
  página, y un servidor anterior (sin el campo) se lee como la Escuela.
* **No cambian**: los permisos (los decide el servidor), los diseños y textos de las seis secciones, la barra de pestañas, ni los otros tabs. Sin animaciones,
  íconos ni dependencias nuevas (`Presionable`, `HojaDesdeAbajo`, `tacto.seleccion()` y `tacto.logro()`). Textos en tipo oración y tuteo; áreas táctiles de 48 o
  más; un solo scroll por pantalla; la fuente solo por los roles de `theme/fuentes.ts`.
* **Pruebas:** Jest en `src/features/formaciones/__tests__` (`formacionDeLaComunidad`, `selectorYRotulosDeLaComunidad`, `comunidadMandaLaFormacion`,
  `esquemasConFormacion`, `seccionComunidadDeLaFormacion`, `avisoDeUnChatDeOtraFormacion`) y en `ranking` (`rankingPorFormacion`,
  `botonDescargarPodioConFormacion`). Maestro, escritos y sin correr: `.maestro/comunidad-por-formacion/`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) **y el backend de la spec 024 antes** (V137–V139). El APK 1.6.0 contra el backend
  nuevo sigue mostrando la Escuela completa sin mandar nada nuevo; el APK nuevo contra un backend anterior queda como hoy.

## Cambio por pedido del dueño — 2026-10-31 — al juntar las formaciones: Ranking según los hábitos de la formación y el nombre del objetivo según la duración

Dos decisiones del dueño que aparecieron al integrar las specs 022 a 034 (solo la app; el backend, sin endpoints nuevos). Lo que cambia y nada más:
* **Ranking → «Kilómetros» y «Gimnasio» solo salen si el catálogo de hábitos de la formación que se mira tiene ese hábito** (`KILÓMETROS DIARIOS`,
  clave `DAILY_KM`, y `GIMNASIO`, clave `GYM`; spec 023 sobre el ranking de la 024). «General» y «Coherencia» salen siempre. Las demás cuentas leen
  su propio catálogo (`GET /habits`); Administración, Alquimista y Soporte TI con una formación elegida, el de esa formación (`GET /admin/habits?formation=`,
  solo los activos); con «Todas» salen las cuatro. **Solo se esconde una pestaña cuando el catálogo se leyó bien y de verdad no la tiene**: sin lectura, con
  fallo o vacío (una cuenta que no hace su programa en esa formación) salen las cuatro, como antes. Si la pestaña elegida deja de ofrecerse, vuelve a «General».
  Lógica pura en `ranking/utils/tablasQueSeOfrecen`, lectura en `ranking/hooks/useTablasDelRanking`. Pruebas: `tablasQueSeOfrecen`.
* **El objetivo grande se nombra según la duración del programa de la persona** (`/home` `duracionDias` y `formacion`): «objetivo de 90 días» en la
  Escuela y la Certificación, «objetivo de 3 meses» en el Diplomado de 90 días y «objetivo de 1 año» en el de 365 (`objetivos/utils/nombreDelObjetivo`,
  puro y con pruebas). Plan y Hoy lo leen del contexto `PlazoDelObjetivoProvider` / `usePlazoDelObjetivo` (sin dato, «90 días»): «Tu objetivo de …», «Define tu
  objetivo de …», «Revisa tus objetivos de …», «Tu dirección en …», los avisos de guardado y la tarjeta de Hoy. **No cambia** el nombre de la formación
  («Escuela Renaser 90 días»), ni lo que dicen el onboarding y los términos del programa de 90 días de la Escuela como hecho. Los textos de error de los hooks
  (`useRocasMaestras`, `useRocasSemanales`) no saben la duración y siguen igual.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire).

## Corrección — 2026-11-01 — lo que salió en la segunda jornada del E2E de las formaciones (issues #73 a #80; backend #53 y #54)

Pedido del dueño: corregir todo lo que salió, también lo menor. Solo JavaScript en la app y un parámetro opcional en el backend. Un commit por error. Lo que cambia y nada más:
* **#73 «Asignar a varias personas» (Fichas)** pide solo las cuentas activas: `listarAprendices({ soloActivas: true })` manda `activeOnly=true` y el padrón del servidor deja fuera las
  solicitudes que esperan aprobación (cuentas INACTIVAS, sin programa) y las suspendidas, en la lista y en el total (`u.estado = 'ACTIVO'`). «Personas» no lo pide y sigue viendo todo (D-138).
* **#74 «Planificar mi mes» según la duración.** Los meses del programa son los del servidor, `duración / 30` (`MesPrograma.mesesDe`): 3 en 90 días y **12 en 365** (antes la app contaba 13 bloques de
  cuatro semanas en 365 y ofrecía solo 3 en la hoja). Las semanas (53 en 365) se reparten parejo entre los meses: 4 + 4 + 5 en 90 días, exactamente como siempre; en 365, meses de 4 o 5 semanas hasta la 53
  (`periodoDelPrograma.mesesDelProgramaDe` / `semanasDelMes` / `mesDeLaSemana`). `mesDelPrograma` y `PlanDelMesModal` reciben `duracionDias`; con 12 meses el selector son chips que se deslizan
  de lado (con 3, el control de siempre). El número de mes es el que viaja al servidor en `PUT /rocks/monthly/{eje}/{mes}`. **Límite conocido:** el mes de la hoja es un bloque de semanas y el «mes actual» del
  servidor se cuenta por días (30, 60, …): pueden decir meses distintos unos días al año, igual que ya pasaba en 90 días (decisión del dueño 028-2).
* **#75 «Elige tu Día 1»** nombra el programa de la persona (`introduccionDelDiaUno`: «90 días», «3 meses», «1 año», con `plazoDelObjetivo`) en vez de «90 días» fijo.
  > **Corregido 2026-11-02 (spec 036, D-309).** «Elige tu Día 1» ya no existe; el plazo lo dice ahora «Tu programa empieza mañana» con `lineaDelPlazo` («Son tus 90 días.», «Son tus 3 meses.», «Es tu año.»).
* **#76 El 80/20 de la ficha** habla en tercera persona para quien acompaña (`voz="ficha"`): «Su 80/20», «Sus cifras al día. Su análisis llega cuando cierre la semana.», flechas, avisos, «Lo que se le fue» y
  el pie del análisis. Plan (la propia persona) no cambia. Los textos de las dos voces viven en `textosDelOchentaVeinte` (`textosDeLaVoz`, `avisoDelEstado(vista, voz)`).
* **#77 Editor del diagnóstico:** las tarjetas muestran `[formación]` y `[duración]` en vez de `{formacion}` y `{duracion}` (`verLasMarcas`, solo para mostrar; al editar se conserva el texto con sus marcas).
* **#78 Copiar un hábito a otra formación** dice qué falta para poder copiar («Elige la formación…», «Elige la categoría en … para poder copiar.») y el aviso «Copiado a …» sale dentro de la misma sección.
* **#79 «Aceptar N solicitudes»** queda fijo abajo mientras se elige (fuera de la lista que se desliza), corrido lo justo para no quedar debajo del botón de SER (`entradaParaElLanzador`).
* **#80 Solicitudes aceptadas:** la Escuela y la Certificación (90 días, una sola duración) ya no dicen «3 meses»; la duración se dice solo en el Diplomado o cuando no es la de 90 días.
* **Backend #53:** mensajes del servidor con sus tildes (repetir la semana, chats directos apagados, plan de la semana, copiar un hábito).
* **No cambian:** los textos de Plan, los demás tabs, el resto de «Personas» ni las reglas de las formaciones. **No hace falta APK nuevo** más allá del que ya llevan las formaciones; sí el backend con `activeOnly`
  para #73 (con uno anterior la lista trae todas las cuentas, como antes).

## Cambio por pedido del dueño — 2026-11-02 — identidad por formación: la bienvenida y la imagen de cada formación (spec 035)

Textual: «procede con la spec; revisa siempre eso en todas las partes, no quiero errores en producción». Tras los nombres de los chats por
formación (spec 024), quedaban dos huecos: la bienvenida automática era la de la Escuela para las tres formaciones, y la imagen de los chats
(el fénix de la comunidad y la tarjeta de los grupos) era la misma. Backend: spec 035, V159, D-308 (`specs/035-identidad-por-formacion/`).
Lo que cambia y nada más:
* **Administración → Más opciones → Bienvenida** (`BienvenidaAdminScreen`): arriba, el control **«Escuela · Diplomado · Certificación»**
  (`ControlDeFormacion`, el `ControlSegmentado` de la app: la píldora viaja 250 ms con su «tic»; sin otro movimiento). Todo lo de abajo
  —la tarjeta con su vista previa, los tres mensajes, sus estados y «volver al original»— es de la formación elegida. Arranca en la
  Escuela. Cambiar de formación pide la suya y **no deja a la vista la de la anterior** mientras llega (`useBienvenidaAdmin(formacion)`: una
  respuesta tardía de otra formación se descarta); los borradores no se mezclan (cada pieza lleva `key` con la formación). Subtítulo de la
  cabecera: «La tarjeta y los mensajes de cada formación».
  * **El pedido** lleva `?formation=` solo para el Diplomado y la Certificación (`conFormacion`): para la Escuela sale exactamente como
    siempre, así que la app nueva contra un backend anterior edita la Escuela sin notar nada.
  * **Tolerante a un backend anterior** (`bienvenidaEsDe`): ese backend contesta SIEMPRE con la bienvenida de la Escuela y no manda `formation`.
    Con el Diplomado o la Certificación elegidos y una respuesta sin `formation`, la pantalla no muestra ni deja editar nada y dice «Este
    servidor todavía no tiene una bienvenida para cada formación. Cuando se actualice, la podrás cambiar acá.»: nunca se edita —ni se cree
    editar— la de la Escuela bajo el nombre de otra.
  * **Portada**: en el Diplomado y la Certificación, sin portada propia la línea dice «Usa la portada de la Escuela.» (`portada.heredada`); su
    botón es «Volver a la portada de la Escuela» (con su confirmación y su aviso); en la Escuela, todo como antes.
* **Administración → Formaciones → cada formación → «Imagen de la formación»** (`ImagenDeLaFormacion`, después de «Comunidad»): la imagen
  que esa formación lleva en el chat, en su comunidad general y en sus grupos sin foto propia. Dos círculos de 72 («Comunidad» y «Grupos») dicen
  cómo se ve hoy (con imagen, los dos la llevan; sin ella, cada uno lleva lo de siempre: el fénix y la tarjeta); una línea de estado («Usa la
  imagen de siempre.», «Usa la imagen de la Escuela.», «Cambiada por … el …»); «Cambiar la imagen» (el selector cuadrado de la foto de perfil,
  sin otro) que sube la candidata y muestra **«Así se vería en el chat»** con «Usar esta imagen» / «Elegir otra» / «Cancelar» —nada queda
  vigente hasta «Usar»—; y «Volver a la imagen de siempre» (Escuela) o «Volver a la imagen de la Escuela» (las otras), con confirmación.
  Lo guardado se dice con `ConfirmacionEnLinea` y una vibración de logro. Sin almacenamiento de verdad (local) el botón queda apagado y la
  sección lo dice. **Contra un backend anterior (404) o sin permiso (403) la sección no se dibuja.**
* **El chat** muestra esa imagen **según lo que manda el servidor**, con lo local de respaldo (mientras carga o si falla, y siempre que no haya
  imagen): `photoPath` ahora también llega en la **comunidad general** y en un **grupo sin foto propia** cuando su formación tiene imagen.
  `fotoDeLaConversacion('global', ruta)` es `foto-del-servidor` (con el fénix debajo, `AvatarDeChat`); el grupo conserva su tarjeta debajo.
  La lista, la cabecera y la info lo toman sin más cambios.
  > **Corregido 2026-11-02 (sobre D-206 y D-212).** «La comunidad es siempre el fénix» y «`tieneFotoPropia` = hay `fotoPath`» dejaron de ser
  > ciertos. El fénix es lo de siempre; la imagen de la formación lo reemplaza si existe. Y como `fotoPath` ya no dice que la foto sea del grupo,
  > el servidor manda `ownPhoto` (solo en grupos): «Volver a la foto de Renaser» y «Guardar foto» usan `grupoTieneFotoPropia` (con un backend
  > anterior, sin `ownPhoto`, vale que `fotoPath` solo existe si es propia).
* **El nombre de la formación en el chat**, sin cambiar diseño: la sección de chats de Tribu y la de «Compartir publicación» se rotulan con
  `rotuloDeLaSeccionDeTribu` («Formación Renaser» en la Escuela y donde no se sabe la formación o se lee «Todas»; «Diplomado Renaser» y
  «Certificación Renaser» en las otras, con el nombre que Administración les puso). Los mensajes del programa se firman con el nombre que manda
  el servidor (`firmaDelProgramaDe`: solo se aceptan las tres firmas; la cuenta de staff que guardó el mensaje no es una firma).
  > **Corregido 2026-11-02 (sobre 2026-09-27).** «Formación Renaser» como rótulo fijo de la sección de grupos y como firma única del programa
  > pasó a ser el de la **Escuela**; las otras formaciones llevan el suyo.
* **No cambian**: el diseño de Bienvenida, Formaciones y el chat, los tabs, los textos de las alarmas ni los cinco principales. Sin animaciones
  nuevas, íconos ni dependencias.
* **Supuestos para que el dueño revise** (están en la spec del backend): los textos del Diplomado y la Certificación arrancan con el original de
  su formación (el de la Escuela con el nombre de la institución cambiado) y no copian lo que Administración haya editado de la Escuela; la
  portada y la imagen sin la propia **siguen a la Escuela en vivo**; hay **una sola imagen por formación** para la comunidad y los grupos sin
  foto propia.
* **Pruebas:** Jest `identidadPorFormacion` (bienvenida por formación, `bienvenidaEsDe`, imagen, rótulo, firma, `grupoTieneFotoPropia`,
  cableado), `imagenDeLaFormacionApi`, `bienvenidaApi` (rutas con formación), `fotosDelChat`. Maestro, escritos y sin correr:
  `.maestro/identidad-por-formacion/` (01 a 04).
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire) y el backend con V159 antes: contra uno anterior se edita solo la
  Escuela, la sección de imagen no aparece y el chat queda como estaba.

## Corrección — 2026-11-02 — ningún «90 días» escrito a mano en lo que ve la persona (issue #104)

Decisión del dueño: «ningún «90 días» para el Diplomado ni la Certificación». Completa lo de #103 en todo `src/`. El plazo se dice con el de la formación de la
persona (`usePlazoDeLaSesion`: «90 días» en la Escuela y la Certificación, «3 meses» o «1 año» en el Diplomado), o con un texto neutro donde no hay sesión.
Con 90 días cada frase es la de siempre. Lo que cambia y nada más:
* **Con el plazo de la formación:** la invitación del personal sin programa («Hacer mi programa de 3 meses», `InvitacionProgramaPropio`), el aviso de la clase diaria
  («Todavía no arrancaste tus 3 meses / tu año», `ClaseDiariaModal`, `tuPlazo`), el Pacto de Yo (la cláusula 10 «Llegar al Día 365…» y «Pacto sellado. Tu compromiso de
  1 año está activo.»), la tarjeta «Completa tu diagnóstico» («De él nacen tus objetivos de 3 meses.», `lineaDeLaTarjetaPendiente`), los avisos «No pudimos cargar
  tu objetivo de …» y «Primero define tus tres objetivos de …» (`useRocasMaestras`, `useRocasSemanales`: el plazo va en una referencia, así que leer la formación tarde no
  vuelve a pedir los objetivos) y «Tu semáforo se mide cuando tienes el programa de … activado» (`SemaforoScreen`).
* **Neutro donde no hay sesión de esa persona:** la imagen del podio sin nombre de formación dice «Renaser» (antes «Renaser · 90 días»; con formación dice la de la tabla, como
  siempre); la tarjeta del semáforo de OTRA persona (mentor y Administración) dice «No tiene su programa activado…»; y la ficha del mentor dice «Día 12» en vez de
  «Día 12 de 90» (esa lectura no trae la duración del aprendiz).
* **`FormacionContext` se partió en dos** (`context/contextoDeFormacion.ts`: el contexto y `useFormacionDeLaSesion`, sin la sesión; `FormacionContext.tsx`: el
  proveedor, que re-exporta lo anterior, así que los imports de siempre no cambian). Así leer la formación no arrastra `AuthContext` ni `AsyncStorage` a cada pantalla y a
  cada prueba (el primer intento de #103 dejó roja `fichaPasoAPaso` por eso).
* **Excepciones del barrido, solo dos y justificadas** (`ningunNoventaDiasEscrito.test.ts`): `PLAZO_POR_DEFECTO = '90 días'` en `nombreDelObjetivo.ts` (el valor por defecto de
  donde salen los demás) y el respaldo `{ dias: 90, texto: '90 días' }` de `diagnosticoSchemas.ts` (un servidor que no manda la duración; ninguna pantalla lo dibuja). Los
  comentarios no cuentan. **No se tocó** el nombre del producto «Renaser 90 días» de las páginas públicas (`public/privacidad`, `public/eliminar-cuenta`): es la marca de la app.
* **Pruebas:** `ningunNoventaDiasEscrito.test.ts` (barre `src/` y `App.tsx`: falla con «90 días», «Día 90», «de 90» o «noventa» escritos a mano), `plazoEnLasPantallas.test.ts`
  y las de #103; se ajustaron `subtituloDelAlumno` y `tarjetaDelPodio`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). Sin backend nuevo.
