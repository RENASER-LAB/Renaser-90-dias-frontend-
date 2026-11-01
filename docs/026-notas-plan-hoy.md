# Notas para AGENTS.md — spec 026, parte «plan-hoy» (Plan, Hoy y Yo sin el Mapa de Renacimiento)

Texto listo para pegar en `AGENTS.md` (arriba, con las demás entradas «Cambio por pedido del dueño — 2026-10-31 — …»), más la lista
de entradas existentes que quedan obsoletas por el retiro del Mapa. Un commit por funcionalidad en la rama `026-app-plan-hoy`.

---

## Cambio por pedido del dueño — 2026-10-31 — el Mapa de Renacimiento se retira; Plan, Hoy y Yo dependen del diagnóstico (spec 026)

Decisión del dueño (spec 026 del backend, `specs/026-ficha-con-diagnostico/`): el **Mapa de Renacimiento ya no va**; lo reemplaza la
ficha con diagnóstico. De las respuestas del diagnóstico nacen los objetivos de 90 días de Plan, el eje de la prioridad principal va
primero y la primera acción se sugiere al agendar. Sin diagnóstico, la persona escribe sus objetivos directo en Plan, **sin ningún
requisito del Mapa**. Esta entrada es la parte de Plan / Hoy / Yo; el recorrido de la persona, las lecturas de otras personas y
Administración → «Fichas» son de otras entradas de la 026. Lo que cambia y nada más:

### El Mapa se retira de la app
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

### Plan sin la puerta
* **Plan siempre muestra el selector de eje y todo lo del eje** (objetivo de 90 días, semana, acciones…). Se borraron `PuertaDelMapa`,
  `usePuertaDeObjetivos`, `puertaDeObjetivos` y `mapaPendiente`. Sin Mapa ni diagnóstico, «Define tu objetivo de 90 días» se escribe
  ahí mismo (los «…» de la tarjeta del objetivo abren la hoja de siempre).
* **`PUT /api/v1/rocks/master/{eje}`** sigue como siempre (`409 ROCA_MAESTRA_FIJA` incluido); `MAPA_PENDIENTE` ya no existe y se quitó
  `mapaPendiente` de `useRocasMaestras.definir`. La línea de la hoja del objetivo fijo dice «Tu objetivo de 90 días quedó fijo.
  Aquí solo anotas cuánto llevas.» (sin «en tu Mapa»). La opción `desdeElMapa` de `definirRocaMaestra` se quitó.
* **Con la semana bloqueada** (faltan objetivos de 90 días; el servidor responde 403 `ROCKS_LOCKED`) la tarjeta «Esta semana» dice
  «Primero define tus tres objetivos de 90 días…» y ofrece **«Escribir mis objetivos»**, que abre el editor del primer eje (en el orden
  de la pantalla) que todavía no tiene objetivo. «Organizar mi semana ›» hace lo mismo en ese estado.

### Objetivos de 90 días «por confirmar»
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

### Prioridad y primera acción desde el diagnóstico
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

### Hoy
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

### Yo
* **Mi onboarding** queda con una etapa, **El Pacto** (la fila dice «Tu Pacto de Renacimiento»; «0 de 1 etapa completada»). Se quitó el
  estado `mapa_renacimiento` de `VistaDeYo`.
* **Fila nueva «Mi diagnóstico»** en la lista de Yo (junto a «Tuve una emergencia» y «Mi Radar»; ícono `fileText`), solo con la ficha con
  diagnóstico: **completado** → «Mi diagnóstico / Lee lo que respondiste» abre `MiDiagnosticoScreen`; **en curso** → «Mi diagnóstico /
  Sigue donde lo dejaste» y **pendiente** → «Completa tu diagnóstico / Todavía no lo empiezas» abren `CompletarDiagnosticoScreen`; con la
  ficha estándar, sin lectura o con un servidor anterior no hay fila (`yo/utils/filaDeMiDiagnostico`). A pantalla completa como la Caja y
  la emergencia; el estado se relee cada vez que Yo recupera el foco y al terminar el recorrido.

### Compatibilidad
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

---

## Entradas de AGENTS.md que quedan obsoletas (total o parcialmente) por el retiro del Mapa

Para anotarles un «> **Corregido 2026-10-31 (spec 026).** …» o borrarlas. Se obtuvo recorriendo AGENTS.md por entrada y contando las
que nombran el Mapa; los números de línea son los de la base de la rama (cambian al editar).

| Entrada (línea) | Qué deja de ser cierto |
|---|---|
| «tab `Plan`: los objetivos esperan al Mapa de Renacimiento (issue #37)» (3662, 33 menciones) | **Toda**: `PuertaDelMapa`, `usePuertaDeObjetivos`, `puertaDeObjetivos`, `mapaHabilitado`, `MAPA_PENDIENTE` / «Hacer mi Mapa», y los textos de Hoy «de este Mapa nacen tus objetivos». Queda como historia |
| «diseño de Hoy, Plan y Training, y la fuente Inter» (238, 13 menciones): punto 1–3 «Hoy: … la tarjeta de acciones arriba» y sus «Corregido» (el estado «sin Mapa» «Haz tu Mapa de Renacimiento», `mapa`, `useLecturaDelEstadoDelMapa`, «sin Mapa no se repite la tarjeta Diseña tu mapa», `mostrarTarjetaDelMapa`) | La tarjeta de acciones ya no tiene estado `mapa` (ahora «Confirma tus objetivos…» / «Define tu objetivo…»), y Hoy ya no tiene tarjeta del Mapa |
| Mismo bloque, punto 10 (Plan, «Sin Mapa activo: `PuertaDelMapa`», «Ir al Mapa» de «Esta semana», «si ya nació del Mapa, que lo deja fijo») | Plan no tiene puerta; sin objetivos se escribe directo; «Ir al Mapa» pasó a «Escribir mis objetivos» |
| «hábito y Radar en una tarjeta, y las acciones de hoy por eje (spec 016)» (971, 1 mención) | «después del Mapa»: ahora va después del programa propio y la tarjeta del diagnóstico pendiente |
| «tab `Plan`: sin la vista muerta de hábitos, selector de eje…» (1356, 1 mención) | Los íconos «por eje» de `PrioridadScreen` / `SistemaEjecucionScreen` / `HitosScreen` del Mapa ya no existen (`iconoDelEje` sigue) |
| «tab `Hoy`: íconos, tipo oración…» (1398, 5), «tabs `Hoy` y `Yo`: ajustes al rediseño» (1719, 5) y «tab `Hoy`: la fase sin inventar, el rótulo y el cierre del Mapa» (1760, 3) | La tarjeta del Mapa, su ícono `map`, «los días que de verdad quedan» en los pasos del Mapa (`textosConLosDiasQueQuedan`, `lapsoDelMapa`) y `CierreScreen` / `PantallaPaso` («Felicidades», «Anterior») |
| «tab `Training`: íconos, hojas desde abajo…» (1632, 3) y «Excepción… 2026-09-22 — tabs `Training` y `Plan`» (2858, 1) | Solo menciones sueltas (`Hitos`, el Mapa como fuente de las acciones) |
| «Excepción… 2026-09-22 — tab `Plan`, las acciones bajan al día» (2888) y «tabs `Hoy` y `Plan`» (2905, 3) | «El asistente semanal se abre con lo del Mapa» y «las acciones salen del Mapa» (`useAccionesDelMapa`, `GET /mapa-renacimiento`): ya no hay acciones del Mapa; la primera acción sale del diagnóstico |
| «Excepción… 2026-09-22 — tab `Plan`, la cifra del mes» (2928) y «tarjeta del mes» (2940, 3) | Las menciones al hito del Mapa y a la lectura de sus respuestas; la cifra sigue saliendo de `GET /rocks/monthly/plan` |
| «Corrección encontrada en el E2E del Mapa del Poder por rol — 2026-10-10 (E-592)» (3026) | **Toda**: `useMapaRenacimiento`, `CierreScreen` y `mapaEnOtroDispositivo.test.ts` se borraron, y `e2e/mapa-poder/` ya no existe |
| «Recuperación del Día 1 de cuentas anteriores — 2026-10-10» (3034) | Las rutas: la suite pasó de `e2e/mapa-poder/` a `e2e/dia-uno/` (README y `preparar.py` ahí; `E2E_ACTORES`); «5/5 mapas completos» ya no aplica |
| «Corrección autorizada — 2026-10-19 — Código Renaser sin parpadeo» (16, 1) y «Cambio — 2026-10-30 — Hoy: la sección del fénix» (3721, 1) | Menciones sueltas: el radar ya no espera a que se cierre el Mapa (`RadarContext`) |
| «formaciones (spec 022)» (570, 1) | La mención a que el Mapa dice los días del programa (`diasQueQuedan`); `diasQueQuedan` queda sin uso en producción |
| Las entradas de Yo del 2026-10-05 («Yo y el Centro de Perfil y Ajustes», «una sola entrada a Mi onboarding») | «Ajustes → Mi onboarding → El Pacto / el Mapa de Renacimiento»: solo queda El Pacto |
| Los comentarios de `navigation/abrirAviso.ts`, `capasObligatorias.ts` y `navegacionRef.ts` y la descripción de los avisos | «Mapa del Día 7» como razón de que no existan las pestañas: hoy son solo el login y el onboarding |

> **`.maestro/README.md`.** Sumar una línea para `ficha-con-diagnostico/` (los flujos 20–22 son de esta parte; los otros números los llevan
> los agentes de la persona y de Administración). No se tocó el README para no chocar con ellos.

> **Para el integrador.** Las entradas de la persona (recorrido del diagnóstico), de Administración → «Fichas» y de las lecturas de
> otras personas son de los otros dos agentes. Esta parte importa de ellos: `TarjetaDelDiagnosticoPendiente`,
> `CompletarDiagnosticoScreen`, `MiDiagnosticoScreen` y `useEstadoDeMiDiagnostico` (rutas acordadas en el brief), y no exporta nada que
> ellos usen.
