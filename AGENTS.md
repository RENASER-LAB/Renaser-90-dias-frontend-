# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# AGENTS.md — Renaser 90 días (app)

Este archivo es el **mapa** del repo, no la enciclopedia: dice por dónde empezar, dónde está cada cosa y qué reglas
valen siempre. Lo largo vive en los documentos que enlaza. **Mantenlo corto**: un cambio autorizado, un plan o un
informe nunca se escriben acá (`src/__tests__/harness/agentsCorto.test.ts` lo frena).

## Al empezar

1. `pwd`, `git status --short` y `git log --oneline -5`: confirma el repo, la rama y si estás en un worktree. No
   mezcles tu trabajo con cambios ajenos sin commitear.
2. Lee `PROGRESO.md` (qué está verificado, qué sigue y qué quedó pendiente) y, si vas a trabajar una
   funcionalidad, su fila en `funcionalidades.json`. Bugs abiertos: `gh issue list --label bug --state open`. En
   Claude Code, el hook de inicio (`scripts/inicio-de-sesion.mjs`) ya te pone el resumen al abrir la sesión.
3. **Antes de tocar uno de los cinco tabs**, lee en `docs/producto/README.md` las entradas de ese tab: qué autorizó
   el dueño y qué no se puede cambiar.
4. Para entender código, primero el grafo (`graphify query`, ver `CLAUDE.md`); después los archivos.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado de hoy, siguiente paso y pendientes | `PROGRESO.md` |
| Cada funcionalidad: estado, evidencia, si está en producción y si falta APK | `funcionalidades.json` |
| Lo que el dueño autorizó en cada tab (historial) | `docs/producto/README.md` |
| Specs (las nuevas viven en el backend) | `specs/README.md` |
| Constitución de spec-kit (la misma en los dos repos) | `.specify/memory/constitution.md` |
| E2E nativo (Maestro) y web (Playwright) | `.maestro/README.md`, `e2e/` |
| Backend: reglas, specs y bitácora de errores | `../Renaser-90-dias-backend/` (`CLAUDE.MD`, `specs/`, `docs/BITACORA_ERRORES.md`) |

## Cómo se trabaja

- **Un bug, primero un issue.** `gh issue create --label bug` en el repo que corresponda, con los campos de
  `.github/ISSUE_TEMPLATE/bug.yml` (qué pasa tal cual, dónde, cómo reproducirlo, qué se espera, en qué versión).
  Después la rama; el PR sigue `.github/pull_request_template.md` y lo cierra con `Closes #N`. Al cerrarlo, una
  entrada E-NN en la bitácora del backend: síntoma literal, causa real, cómo evitarlo y el PR.
- **Una funcionalidad o un bug por rama y por commit.** Sin `Co-Authored-By` ni pie de herramienta en commits ni PR.
- **Nunca se prueba contra producción**: backend local con base clonada, build debug y emulador.
- **La máquina se comparte**: antes de levantar un backend, el emulador, Maestro o el jest completo, pregunta a las
  otras sesiones quién la tiene, y avisa cuando la sueltes.
- **El texto que ve el usuario va en español de Perú**, con tuteo: el voseo nuevo es regresión.
- **Si cambias un comportamiento**, en el mismo cambio actualiza su entrada en `docs/producto/` y su spec.
- **Una corrección que se repite se vuelve prueba**, no un párrafo más: como `rotulosEnTipoOracion.test.ts`,
  `interruptoresDeLaApp.test.ts` o `barraDePestanasIconos.test.ts`.

## Cuándo algo está terminado

Solo con evidencia que se pueda volver a correr, no porque el código se vea bien:

1. `npm run verificar` en verde (sale con 0): parches de postinstall, tipos y Jest completo, con un resumen para
   pegar en el PR. Si otra sesión tiene la máquina, se frena antes de lo pesado; mientras tanto, `-- --rapido`
   corre solo las pruebas de lo cambiado, pero eso no cierra nada (sale con 2).
2. Si se ve en la app: `npm run verificar -- --e2e` (la suite de Maestro) y los casos de la spec con mobile-mcp en
   el emulador, con capturas. Solo JavaScript → el build debug instalado con Metro; cambios nativos → build nuevo.
3. La evidencia queda en el PR o en la spec, y lo que no se pudo verificar se dice con todas sus letras. En
   `funcionalidades.json`, nada pasa a `pasando` sin esa evidencia (`estado.test.ts` lo frena).
4. Docs al día (`docs/producto/`, la spec) y `graphify update .`.

## Al cerrar la sesión

Deja el repo listo para que otra sesión siga sin adivinar:

1. `PROGRESO.md`: el estado verificado, el siguiente paso, los pendientes y tu sesión (solo las cinco últimas).
2. `funcionalidades.json`: el estado de lo que tocaste, con su evidencia.
3. Nada a medio hacer sin anotar, el trabajo seguro commiteado en su rama y `graphify update .`.

---

# 📱 REGLAS Y BUENAS PRÁCTICAS DE DESARROLLO MÓVIL (REACT NATIVE / EXPO)

Actúa como un Desarrollador Móvil Senior y Diseñador UX/IA de Alto Nivel especializado en React Native, Expo y TypeScript. Al crear, refactorizar o modificar cualquier pantalla o componente, debes cumplir OBLIGATORIAMENTE con los siguientes estándares:

---

## 1. 🏗️ ARQUITECTURA LIMPIA Y SEPARACIÓN DE RESPONSABILIDADES
* **Estructura Modular por Feature**: Agrupa el código bajo `src/features/<nombre_modulo>/`:
  * `screens/`: Coordinadores y pantallas completas.
  * `components/`: Subcomponentes visuales reutilizables.
  * `types/`: Tipos TypeScript (`.types.ts`).
  * `data/`: Constantes, cláusulas, configuraciones estáticas.
* **Componentes de UI Atómicos**: Utiliza componentes compartidos bajo `src/components/` (`FormField`, `GoldButton`, `SliderRating`, `Checkbox`, `SignatureCanvas`, `Icon`, `LogoDeMarca`).
  * **Logos de marcas (Google, Apple, Google Meet, Zoom, Google Drive) → `LogoDeMarca`, nunca `Icon`**
    (2026-10-05, pedido del dueño de usar svgl). Son los SVG oficiales de svgl con sus colores, sin
    redibujar ni recolorear; Apple cambia a blanco en modo oscuro. Una marca nueva se agrega desde
    `static/library/` de svgl siguiendo la cabecera de `LogoDeMarca.tsx`. Los casos `google` y `apple`
    de `Icon` quedan solo hasta que `LoginScreen` pase a `LogoDeMarca`; no sumarles usos.
  * **`Icon`: un solo grosor real y tres tamaños** (decisión del dueño, 2026-10-05). El trazo se dibuja a
    **1,75 px reales** a cualquier tamaño (`GROSOR_TRAZO_PX`, `grosorDelTrazo`): antes era `strokeWidth = 1.1`
    en la caja de 20 y a 14 px quedaba en 0,77 px. Un `strokeWidth` explícito se respeta solo si es más grueso
    (el ✓ sobre dorado); nunca deja el trazo más fino. Tamaños de uso **16 / 20 / 24** (`TAMANO_ICONO`); la
    flecha de volver, 24 en un área de 48. Un ícono nuevo se dibuja con forma de **Lucide** (ISC) en caja de 24
    y usa **`s24`** —con `s` saldría a 1,46 px; `grosorDeIconos.test.ts` lo frena—. Nada de emojis como
    íconos: cambian de forma entre Android, iOS y web e ignoran el color del tema.
* **Integridad del Core**: NUNCA alterar, romper ni desconfigurar las pantallas existentes ni los tabs principales (`Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`).
  * Lo que el dueño ya autorizó en cada tab, y cómo anotar una autorización nueva: `docs/producto/README.md`. Una
    autorización puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales vuelve a necesitar
    autorización explícita.

---

## 2. 📱 RESPONSIVIDAD UNIVERSAL (XIAOMI, ANDROID, IOS Y TABLETS)
* **Cero Doble Scroll**: NUNCA coloques un contenedor con `maxHeight` fijo o scroll interno dentro de otro `ScrollView`. Toda pantalla debe tener UN ÚNICO contenedor de scroll fluido con `contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}`.
* **Adaptabilidad a Xiaomi y Pantallas Altas (20:9 / 19.5:9)**:
  * Utiliza márgenes dinámicos basados en `useResponsive()`:
    * Pantallas compactas (<360px): `paddingHorizontal: 14`
    * Móviles estándar y Xiaomi (360px - 440px): `paddingHorizontal: 18`
    * Tablets (≥768px): `paddingHorizontal: 32` con tarjeta centrada a `maxWidth: 560`.
* **Cero Desbordamientos**:
  * Utiliza `width: '100%'`, `flexShrink: 1` y `flexWrap: 'wrap'` en filas y tarjetas para evitar que botones o textos sobresalgan de la pantalla.
* **Manejo de Teclado**: Envuelve siempre los formularios con `keyboardShouldPersistTaps="handled"`.

---

## 3. ✍️ MANEJO DE GESTOS TÁCTILES Y FIRMA DIGITAL
* **Prevención de Cancelación Táctil en Android / Xiaomi**:
  * Al implementar lienzos o componentes táctiles (ej. `SignatureCanvas` con `PanResponder` o `react-native-svg`), SIEMPRE declara:
    * `onStartShouldSetPanResponderCapture: () => true`
    * `onPanResponderTerminationRequest: () => false`
    * `onShouldBlockNativeResponder: () => true`
  * Esto impide que el `ScrollView` nativo de Android intercepte y borre los trazos del dedo.
* **Persistencia Incondicional**: Las firmas y respuestas de formularios deben guardarse en el estado raíz o contexto (`OnboardingFlow` / `AuthContext`) para que NO se pierdan al retroceder, avanzar o abrir el teclado.
* **Modo Dual**: Proveer modo de trazado con el dedo (dibujo vectorial) y modo de firma electrónica estilizada (nombre caligráfico).
* **Parche Seguro de JSON**: Utilizar `safeParsePaths` al deserializar datos de firma para evitar excepciones `JSON.parse`.

---

## 4. 👁️ TIPOGRAFÍA, CONTRASTE Y ACCESIBILIDAD (UX/IA)
* **Grosor y Claridad**: Prohibido usar fuentes ultrafinas (`300Light` o `200ExtraLight`) para lectura prolongada. Usar siempre **`Jost_400Regular`**, **`Jost_500Medium`** y **`Jost_700Bold`**.
* **Serif editorial, SOLO en display** *(agregado 2026-09-14)*: **`Fraunces_600SemiBold`** y **`Fraunces_700Bold`** se usan únicamente en los tokens `t.hero` y `t.screenTitle` (≥ 24 px). **Nada que se lea en párrafo la toca**: texto corrido, inputs, cláusulas y etiquetas siguen en Jost, que es lo que esta regla protege. Entró porque la jerarquía estaba construida sobre `letterSpacing` (el `hero` llegaba a 8) en vez de sobre familia y peso, y eso hacía que cada pantalla se leyera como plantilla. Si alguna vez se quiere volver atrás, es un valor en `theme/tokens.ts` y dos imports en `App.tsx`.
* **El espaciado de letras no es jerarquía** *(agregado 2026-09-14)*: un titular grande lleva tracking **negativo** (junta, pesa); sólo los rótulos chicos en versales (`micro`, `sectionTitle`) llevan tracking positivo, y por debajo de 1.5. Estirar un texto para que parezca importante es el gesto que hay que evitar.
  > **Corregido 2026-10-05 (decisión del dueño).** Un rótulo en **tipo oración** no lleva espaciado: `MicroLabel` (el rótulo de sección de toda la app) pasó a 13 px, `Jost_700Bold` y `letterSpacing: 0`; con el 1,1 de `t.micro` se leía «H á b i t o s». El tracking positivo queda solo para lo que todavía va en versales.
* **Cifras que cambian, tabulares**: todo número que se actualiza en pantalla (día de programa, puntos, racha) va con `fontVariant: ['tabular-nums']` — ya está en el token `t.metric`. Sin eso, pasar de 9 a 10 corre de lugar todo lo que tenga al lado.
* **Tamaño Mínimo de Lectura**:
  * Textos de párrafo / cláusulas / inputs: **14px a 15.5px**.
  * Etiquetas de ayuda / subtítulos: **12px a 13.5px**.
  * Badges: **10px a 11.5px (Medium/Bold)**.
  * Rótulos de sección (`MicroLabel`): **13px, Bold, sin espaciar**.
    > **Corregido 2026-10-05.** Decía «Badges / MicroLabels: 10px a 11.5px (Medium/Bold)». `MicroLabel` se leía chico y estirado en tipo oración; el dueño pidió quitarle el espaciado en toda la app, y con 13 px en negrita queda como «Coherencia» y «Racha» de Hoy.
* **Alto Contraste de Color**:
  * Modo Oscuro: Texto principal `#FFFFFF` / `#F6F4EE`, secundario `#C5BEB3`.
  * Modo Claro: Texto principal `#1E1B18`, secundario `#4A453D`.
* **Touch Targets Cómodos**: Botones y casillas de checkbox con altura mínima de **48px - 52px** para pulsación cómoda con una sola mano.

---

## 5. 🔒 VALIDACIÓN ESTRICTA Y EXPERIENCIA DE USUARIO
* **Validación Antes de Avanzar**: Validar campos requeridos por cada paso o capítulo antes de cambiar de pantalla.
* **Feedback Visual y Alertas Amigables**: Mostrar con precisión qué campo falta por completar mediante alertas claras (`Alert.alert`) y bordes de estado de error (`#E06A66`).
* **Seguridad TypeScript**: Todo código nuevo debe compilar con 0 errores mediante `npx tsc --noEmit`.

---

## 6. 📱 NAVEGACIÓN UNIVERSAL POR GESTOS DEL SISTEMA (EDGE SWIPE & BACKHANDLER)
* **Soporte Obligatorio para Pantallas Táctiles y Gestos (Xiaomi / Android / iOS)**:
  * En dispositivos modernos con navegación por gestos en pantalla (deslizar desde el borde lateral para volver atrás sin botones físicos), toda subpantalla, modal o flujo multinivel DEBE implementar `useSystemBackHandler`:
    * Si hay un **modal abierto** (ej. Subir Evidencia, Agregar Hábito): el gesto lateral debe cerrar el modal.
    * Si está en el **detalle de una categoría/dimensión**: el gesto lateral debe regresar al menú principal.
    * Si está en un **formulario por pasos / onboarding**: el gesto lateral debe retroceder al paso anterior.
  * **Prohibido**: Permitir que el gesto lateral del sistema cierre o minimice la aplicación cuando el usuario se encuentre en una vista hija o modal.
