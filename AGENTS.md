# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# AGENTS.md — Renaser 90 días (app)

App de React Native + Expo 57 (TypeScript) del programa Renaser. El backend (Java 25, Spring Boot) y **las specs**
viven en `../Renaser-90-dias-backend/`. Este archivo es el **mapa**: por dónde empezar, cómo verificar y qué reglas
valen siempre. Lo largo vive en los documentos que enlaza. **Mantenlo corto** (≤ 200 líneas): una decisión del
dueño, un plan o un informe nunca se escriben acá (`src/__tests__/harness/agentsCorto.test.ts` lo frena).

## Al empezar

1. `pwd`, `git status --short`, `git log --oneline -5`: el repo, la rama, si es un worktree y si hay cambios ajenos.
   No mezcles tu trabajo con cambios ajenos sin commitear.
2. Lee `PROGRESO.md`: qué está verificado, qué sigue, qué quedó a medias. Bugs abiertos:
   `gh issue list --label bug --state open`. En Claude Code el hook de inicio (`scripts/inicio-de-sesion.mjs`) ya te
   pone ese resumen al abrir la sesión.
3. **Antes de tocar uno de los cinco tabs**, lee sus entradas en `docs/decisiones/README.md` (columna «Tabs»).
4. **Grafo primero**: `graphify query "…"` (o `path` / `explain`) antes de abrir archivos; después lee solo los que
   nombra. Un worktree nuevo se crea con `scripts/worktree-nuevo.sh <rama>`, que arma el grafo antes que nada; en un
   worktree el hook de graphify no corre: `scripts/grafo-al-dia.sh`. Qué cargar según lo que tocas: `docs/arnes/README.md`.
5. Si la verificación ya está en rojo antes de empezar, arréglala primero o dilo: no apiles trabajo encima.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Estado verificado, siguiente paso y lo que quedó a medias | `PROGRESO.md` |
| Lo que el dueño autorizó, decidió o mandó corregir (historial con fecha) | `docs/decisiones/README.md` |
| Specs, planes y contratos (las nuevas viven en el backend) | `../Renaser-90-dias-backend/specs/`, `specs/README.md` |
| Constitución de spec-kit (la misma en los dos repos) | `.specify/memory/constitution.md` |
| E2E nativo (Maestro) y web (Playwright) | `.maestro/README.md`, `e2e/` |
| Mapa de los demás documentos (vigentes e históricos) | `docs/README.md` |
| El arnés (metodología, ciclo de una spec, módulos, grafo) y las familias de errores con su chequeo | `docs/arnes/README.md`, `docs/arnes/familias-de-errores.md` |
| Backend: reglas, bitácora de errores (E-NN) y decisiones (D-NN) | `../Renaser-90-dias-backend/AGENTS.md` |
| Un comentario del código dice «ver `AGENTS.md`» sobre una excepción o una autorización | Búscala por fecha en `docs/decisiones/README.md`; las reglas §1–§6 siguen al final de este archivo |

## Reglas que no se negocian

1. **Los cinco tabs (`Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`) no cambian sin autorización explícita del dueño.**
   Una autorización puntual no abre el tab. Lo autorizado se anota en `docs/decisiones/` (cómo: su `README.md`).
2. **Una funcionalidad o un bug por rama y por commit.** Commits en castellano, en imperativo, diciendo qué cambia y
   por qué. Sin `Co-Authored-By` ni pie de herramienta en commits ni PR. Nunca `--no-verify`.
3. **Un bug, primero un issue** (`gh issue create --label bug`, campos de `.github/ISSUE_TEMPLATE/bug.yml`); el PR lo
   cierra con `Closes #N` y la causa queda en la bitácora (`../Renaser-90-dias-backend/docs/BITACORA_ERRORES.md`).
4. **Nunca se prueba contra producción**: backend local con base clonada, build debug y emulador.
5. **La máquina se comparte entre sesiones.** `npm ci`, Jest, Gradle y Maven van con
   `~/.config/renaser-e2e/herramientas/pesado.sh` (uno a la vez, con tope de memoria) y Jest con `--maxWorkers=2`.
   Antes de usar el emulador o Maestro, pregunta quién lo tiene.
6. **Texto que ve el usuario: español de Perú, con tuteo** (el voseo nuevo es regresión), tipo oración, sin emojis
   como íconos.
7. **Identidad por formación**: el nombre, la bienvenida, la imagen y el plazo son los de la formación de cada persona.
   Nunca «90 días» escrito a mano (`ningunNoventaDiasEscrito.test.ts`).
8. **Trazabilidad**: cada `FR-NNN` / `SC-NNN` de una spec exigida tiene una prueba con la marca `// spec NNN FR-NNN`
   (en Maestro, `# spec NNN FR-NNN`). Solo cuentan pruebas de Jest bajo `src/` y flujos de Maestro; no se marca por
   marcar (si la prueba no falla cuando el requisito se rompe, no lleva marca). Regla completa:
   `.claude/rules/06-trazabilidad-de-specs.md` del backend.
9. **Si cambias un comportamiento**, en el mismo cambio: su spec, su entrada en `docs/decisiones/` y las pruebas.
10. **Una corrección que se repite se vuelve prueba**, no un párrafo más (como `rotulosEnTipoOracion.test.ts` o
    `interruptoresDeLaApp.test.ts`). El mensaje de la prueba dice qué está mal y cómo se arregla.
11. **No toques lo que no te pidieron.** Un segundo bug encontrado de paso se reporta (issue), no se mezcla.

## Errores que se repiten y no tienen chequeo automático

Los que sí lo tienen fallan solos (`src/__tests__/harness/familiasDeErrores.test.ts` y las guardas de texto). Estos
dependen de ti (detalle y ejemplos en `docs/arnes/familias-de-errores.md`):

- **Un toque, un pedido**: botón apagado mientras el pedido viaja; una lectura vieja nunca pisa a la nueva (E-380, E-597).
- **El motivo del servidor se muestra**: un 409 o un 404 con `codigo` no es «No se pudo…» genérico (E-373, E-416, #81).
- **Cada rol y cada estado** (sin programa, Día 0, suspendido) ve lo suyo, sin huecos en blanco (#82, #101, #107).
- **Lo que cambia se ve**: tras guardar, la pantalla relee o refleja lo confirmado por el servidor (E-315, #106, #133).

## Cómo se verifica

Un solo camino, el mismo que corre el CI:

| Comando | Qué corre | Cuándo |
|---|---|---|
| `npm run verificar` | parches de postinstall, tipos (`tsc`), Jest completo (incluye las reglas del arnés), trazabilidad de specs contra el backend y el conteo de flujos de Maestro sin correr | antes de decir «terminado» |
| `npm run verificar -- --rapido` | parches, tipos y solo las pruebas de lo cambiado | mientras trabajas: **no cierra nada** (sale con 2) |
| `npm run verificar -- --e2e [flujo…]` | lo anterior + Maestro en el emulador | si el cambio se ve en la app |

Sale con **0** si todo corrió y pasó, **1** si algo falló y **2** si nada falló pero algo quedó sin correr (eso no es
verde: dilo en el PR). Si ve el emulador, Maestro o Gradle ocupados, no corre lo pesado (`--forzar` si es tuyo).

## Cuándo algo está terminado

Solo con evidencia que se pueda volver a correr, no porque el código «se ve bien»:

1. `npm run verificar` en 0, con su resumen pegado en el PR, y el CI del PR en verde.
2. Si se ve en la app: la suite de Maestro y los casos de la spec con mobile-mcp en el emulador, con capturas. Solo
   JavaScript → build debug instalado + Metro del worktree; cambios nativos → build nuevo. Revisa todos los estados y
   roles: un hueco en blanco anómalo es un bug bloqueante.
3. **Un flujo de Maestro «escrito y sin correr» no es evidencia.** Cuando lo corras en verde, cambia en su cabecera
   «sin correr» por `# corrido: AAAA-MM-DD` (`node scripts/flujos-sin-correr.mjs` lleva la cuenta).
4. Lo que no se pudo verificar se dice con todas sus letras, en el PR y en `PROGRESO.md`.
5. **Un PR no está listo sin el E2E de su spec y los logs revisados**: el del backend local y `adb logcat` de la app,
   sin errores nuevos (pégalo en el PR).
6. Docs al día (spec, `docs/decisiones/`) y `scripts/grafo-al-dia.sh`.

## Al cerrar la sesión

1. `PROGRESO.md`: estado verificado, siguiente paso, lo que quedó a medias y tu sesión (solo las cinco últimas).
2. El trabajo seguro, commiteado en su rama; nada a medio hacer sin anotar; sin archivos temporales en el repo.
3. `scripts/grafo-al-dia.sh` (el hook no corre en los worktrees). Si la rama ya se fusionó: `scripts/worktree-cerrar.sh
   <rama>` (nunca borra cambios sin commitear ni ramas sin fusionar); `scripts/worktree-viejos.sh` lista qué limpiar.

---

# Reglas de la app (React Native / Expo)

Al crear o cambiar una pantalla o un componente se cumplen siempre. Lo que el dueño decidió distinto para un caso
concreto está en `docs/decisiones/` y gana sobre lo general. El rastro de cómo eran antes: `docs/decisiones/reglas-historial.md`.

## 1. Arquitectura
* **Por funcionalidad**: `src/features/<modulo>/` con `screens/`, `components/`, `hooks/`, `api/`, `utils/` (lógica
  pura, con pruebas), `types/` y `data/`.
* **Componentes compartidos** en `src/components/` (`FormField`, `GoldButton`, `SliderRating`, `Checkbox`,
  `SignatureCanvas`, `Icon`, `LogoDeMarca`, `HojaDesdeAbajo`, `Presionable`, `Interruptor`…): úsalos antes de crear otro.
* **Logos de marcas** (Google, Apple, Meet, Zoom, Drive) → `LogoDeMarca` (SVG oficiales de svgl, sin recolorear),
  nunca `Icon`. Los casos `google` y `apple` de `Icon` quedan solo por `LoginScreen`: no sumarles usos.
* **`Icon`**: trazo de 1,75 px reales (`GROSOR_TRAZO_PX`) a cualquier tamaño; tamaños 16 / 20 / 24 (`TAMANO_ICONO`).
  Un ícono nuevo se dibuja con forma de Lucide en caja de 24 y usa `s24` (`grosorDeIconos.test.ts`). Nada de emojis
  como íconos.
* **Diálogos con `Alert` de `src/components/Alerta`**, nunca el de `react-native`: en la web no hace nada y nunca
  llama a los `onPress` (E-144).
* **Los cinco tabs**: ver la regla 1 de arriba.

## 2. Responsividad (Android, Xiaomi, iOS y tablets)
* **Un solo scroll por pantalla**: nada de `maxHeight` fijo con scroll adentro de otro `ScrollView`. El contenedor lleva
  `contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}` (o el espacio de los botones flotantes).
* **Márgenes con `useResponsive()`**: < 360 px → 14; 360–440 px → 18; ≥ 768 px → 32 y tarjeta centrada de 560.
* **Sin desbordes**: `width: '100%'`, `flexShrink: 1` y `flexWrap: 'wrap'` en filas y tarjetas. La letra del sistema
  tiene tope global de 1,2 (`theme/topeDeLetra.ts`).
* **Formularios** con `keyboardShouldPersistTaps="handled"`.

## 3. Gestos y firma
* Un lienzo táctil (`SignatureCanvas`, `PanResponder`) declara `onStartShouldSetPanResponderCapture: () => true`,
  `onPanResponderTerminationRequest: () => false` y `onShouldBlockNativeResponder: () => true`, para que el
  `ScrollView` de Android no robe el trazo.
* Firmas y respuestas viven en el estado raíz o en el contexto (`OnboardingFlow`, `AuthContext`): no se pierden al ir y
  volver ni al abrir el teclado. Modo dibujo con el dedo y modo nombre caligráfico. Los trazos se leen con
  `safeParsePaths`.

## 4. Tipografía, contraste y accesibilidad
* **La fuente es Inter y se nombra solo en `src/theme/fuentes.ts`**, que exporta roles (`fuentes.regular`, `.media`,
  `.seminegrita`, `.negrita`, `.display`). Ningún otro archivo escribe `Inter_…` ni un `fontFamily` con texto: se pide el
  rol o se usan los tokens `t.*` (`fuenteUnica.test.ts`). Nada ultrafino. El display (`t.hero`, `t.screenTitle`, ≥ 24 px)
  nunca va en un párrafo.
* **El espaciado de letras no es jerarquía**: un titular grande lleva tracking negativo; un rótulo en tipo oración no
  lleva espaciado (`MicroLabel`: 13 px, negrita, `letterSpacing: 0`).
* **Cifras que cambian, tabulares** (`fontVariant: ['tabular-nums']`, ya en `t.metric`).
* **Tamaños mínimos**: párrafos, cláusulas e inputs 14–15,5 px (en Mentoría y Administración, 16); ayudas 12–13,5 px;
  insignias 10–11,5 px.
* **Contraste**: oscuro, texto `#FFFFFF` / `#F6F4EE` y secundario `#C5BEB3`; claro, `#1E1B18` y `#4A453D`. Los colores
  salen del tema, no a mano.
* **Toques de 48–52 px** de alto (44 solo donde el dueño lo decidió, con `hitSlop` hasta 48).

## 5. Validación y experiencia
* Se validan los campos de cada paso antes de avanzar, diciendo qué falta (aviso claro y borde de error `#E06A66`).
* Todo código nuevo compila con 0 errores (`tsc --noEmit`, dentro de `npm run verificar`).

## 6. El gesto de volver del sistema
* Toda subpantalla, modal o flujo por pasos usa `useSystemBackHandler`: un modal abierto se cierra; un detalle vuelve al
  menú; un formulario por pasos vuelve al paso anterior. **Nunca** se deja que el gesto cierre o minimice la app desde una
  vista hija o un modal.
