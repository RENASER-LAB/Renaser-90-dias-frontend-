# Avance del plan de diseño — 9 de septiembre de 2026

Qué se hizo del plan de `PLAN_Y_PROMPT_DISENO_PARA_CLAUDE.md`, qué se comprobó y qué no.

Siete commits, de `b9c8091` a `5ca8f49`: **78 archivos, +1926 / −1005**.

Este documento separa a propósito **lo verificado** de **lo que solo compila**. Un cambio que
pasa `tsc` no es un cambio que funcione.

---

## Comprobaciones que cualquiera puede repetir hoy

```bash
npx tsc --noEmit          # 0 errores
npm run build:web         # exit 0
```

| Búsqueda | Antes | Ahora |
|---|---|---|
| `fontWeight` sobre familia Jost | 321 | **0** |
| Textos por debajo de 10 px | 114 | **0** |
| `Jost_300Light` / `Jost_200ExtraLight` | 3 usos + 2 cargas | **0** (queda 1 comentario) |
| Literales de color de estado | 90 | **1**, a propósito (ver §3) |
| Emojis usados como icono | ~50 | **2**, a propósito (el águila de marca) |
| `isTablet ? 560` escrito a mano | 31 | **0** |
| `ScrollView` con formulario sin `keyboardShouldPersistTaps` | 28 | **0** |

---

## §2 · Herramientas

- **Skills de diseño**: instaladas y versionadas (`.claude/skills/`, `skills-lock.json`).
  Advertencia registrada: están escritas para web (CSS, Tailwind, GSAP, DOM). Sirven para
  criterios de composición y jerarquía, **no** para técnicas.
- **60fps MCP**: **no instalado**. Requiere licencia PRO y no hay ninguna en el sistema.
  Comprobado: `POST https://mcp.60fps.design/mcp` → `401 NO_LICENSE`. No se inventó ningún
  resultado de esa herramienta.
- **GSAP**: **imposible**, no es una decisión de gusto. Anima nodos del DOM y en React Native no
  hay DOM. El movimiento se hizo con `Animated`, que ya venía en el runtime.

## §3 · Sistema compartido

**Contraste.** Medido, no estimado. El texto sobre el botón dorado en claro estaba en **2.95:1**;
ahora **≥5.3**. Se separó `goldInk` (primer plano) de `gold` (superficies) para poder oscurecer
el acento sin apagar rellenos ni sombras: **401 usos** migrados.

Los cinco colores de estado (`#E06A66`, `#70d2a0`, `#4E9F76`, `#4CAF50`, `#f28e8e`) se habían
elegido mirando el tema oscuro y se reutilizaban igual en el claro, donde **todos** caían por
debajo de AA (1.79–3.19 medido sobre `#FDFCFA`). Pasan a tokens `success` / `danger` /
`goldWash` sensibles al tema, en 90 sitios.

La excepción es deliberada: el visor de imágenes y la hoja de compartir son **negras en los dos
temas**, así que ahí el token del tema sería incorrecto y se fijan los valores oscuros
(`ImageViewerModal.tsx`, con la explicación en el código).

**Tipografía.** `'800'` y `'900'` pedían cortes que ni siquiera se cargan, así que Android
sintetizaba la negrita y deformaba la Jost. Los 321 pasan al corte real. Fuera `Arial` del
ranking, con cifras tabulares para no romper la alineación de la columna.

**Táctil.** `GoldButton` medía 45 px, las pestañas 38 y la barra de acciones del Muro 26. Todos
al mínimo de 48–52 px que pide AGENTS.md §4, con realimentación de pulsación.

**Responsive.** El tramo 360–440 px recibía 20 px de margen y AGENTS.md §2 pide 18. Corregido en
`useResponsive`, y unificados los 7 sitios que repetían la fórmula vieja a mano.

## §4 · Las cinco pantallas

Todas verificadas en pantalla, en claro y oscuro, a 375 px.

- **Hoy** — pase completo. Los anillos decorativos se atan al ancho real disponible en vez de a
  medidas fijas y dejan de comerse un tercio del alto: las tarjetas útiles ya entran en pantalla.
  Entrada escalonada con `Animated`, omitida si el sistema pide reducción de movimiento.
- **Plan** — el gráfico de "Arquitectura de tiempo" era **falso**: seis puntos en coordenadas
  fijas (`M6 62 L64 50 … L294 8`) que subían igual el día 2 que el 89. Ahora los tres tramos se
  rellenan con el día real y se destaca el que se cursa. La invitación "Todavía sin definir" se
  leía tres veces; dicha una sola vez, la pantalla entra sin scroll.
- **Training** — la fila de dimensión no tenía `flexShrink` y "VIDA Y NEGOCIO" partía en dos su
  contador.
- **Comunidad** — barra de acciones con iconos reales, 26 → 48 px de zona pulsable, y el botón
  flotante ya no tapa "Compartir" (comprobado por geometría: `seSolapan: false`).
- **Yo** — ver §6.

## §5 · Interacción

**Gesto de cierre en iOS.** `useSystemBackHandler` se apoya en `BackHandler`, que es API de
Android: en iOS no se dispara nunca. Y `onRequestClose` en iOS solo salta con
`presentationStyle` "pageSheet"/"formSheet", que aquí no se puede usar porque todos los modales
son `transparent`. Resultado: **en iOS la única salida era el botón**.

Se añadió `VeloModal` (cierre al tocar fuera) a los **cuatro selectores** — fecha, hora, país y
ubicación — donde cerrar equivale a cancelar. Los **~20 modales restantes se dejaron como
estaban a propósito**: tienen texto a medio escribir o firmas sin guardar, y cerrarlos por un
toque accidental sería peor que obligar a buscar la ✕. Cerrar ese hueco del todo exige cambiar
el aspecto de todos los modales o añadir dependencia: es decisión de producto.

**Accesibilidad.** Login tenía 21 controles pulsables con **1** rol declarado y 12 campos con
**1** etiqueta. Ahora 21/21 y 12/12. En el onboarding, los selectores de sexo, estado civil,
hijos, documento, medicación y fecha eran `Pressable` sin rol: se leían como texto plano, sin
decir que eran opciones ni cuál estaba elegida. Pasan a `radio` con estado; el consentimiento a
`checkbox`.

## §6 · Lógica de producto: datos inventados

Lo más grave de toda la revisión. En **Yo** se mostraba como propio:

| Qué decía | Realidad |
|---|---|
| "37 fotos subidas · 100% verificadas" | Cadena fija, a cualquiera |
| Tres cajas "FOTO" y un "+6" | Insinuaban nueve evidencias inexistentes |
| Cuatro evidencias con hora y "verificada" | Inventadas |
| Tres logros con `unlocked: true` | "30 amaneceres consecutivos", "50 bloques de Deep Work" |
| `STATS`: DISCIPLINA 87, ENFOQUE 92 | Código muerto |

Las evidencias van ahora contra `GET /api/v1/evidence`, que **ya existía**. Verificado con datos
reales: **200**, y una evidencia en estado `REVISION_MANUAL` que el código anterior habría
mostrado como "✓ VERIFICADO".

Los logros **no tienen endpoint** en el backend. Se listan como catálogo de metas del programa,
sin marcar ninguna, y diciéndolo. Sigue pendiente de decisión.

**Mapa de Renacimiento.** Una vez completado, dejaba volver a llenarlo. El estado "activo" vivía
solo en el dispositivo, y `activar()` crea rocas maestras y hábitos contra el backend: recorrerlo
otra vez los **duplicaba**. El backend ya tenía `GET` con `stageCompleted` y `POST /completar`, y
el frontend no llamaba a ninguno. La sincronización es de un solo sentido a propósito: el
servidor puede **confirmar** que está terminado, nunca desmarcarlo.

## §7 · Qué NO está verificado

Se dice explícitamente para que nadie lo dé por bueno:

- **Login y onboarding**: los cambios compilan, pero no se vieron en pantalla. Login exige cerrar
  sesión y el onboarding una cuenta nueva.
- **Los cuatro selectores con `VeloModal`**: viven tras el login y el onboarding.
- **El ciclo completo del Mapa**: se comprobó que el `GET` responde 200 con
  `stageCompleted: false`, pero no se ejecutó `POST /completar` — es una escritura real en
  producción.
- **Nativo**: todo se verificó en web. Una compilación web no demuestra comportamiento en
  Android ni en iOS. Los gestos, el teclado y el movimiento siguen sin probarse en dispositivo.
- **Rendimiento**: no se midió. No se afirma nada sobre él.

## Cosas encontradas de paso

- El **`.env`** no necesita `EXPO_PUBLIC_API_URL`: `src/config` ya elige según plataforma
  (`10.0.2.2` en emulador Android, `localhost` en web e iOS). Fijarla rompía una de las dos.
- El servidor web **debe correr en el puerto 8081**: el backend solo acepta 8081, 19006 y 3000.
  En otro puerto el login falla con "No se pudo conectar con el servidor", que parece el backend
  caído y es CORS.
- `.claude/worktrees/` estaba excluido solo en `.git/info/exclude`, que **no se comparte**.
  Pasó al `.gitignore`.
- El ayudante `validarRespuesta` está **duplicado en 10 features**. No se tocó: unificarlo es un
  refactor transversal, no parte de un pase de diseño.
