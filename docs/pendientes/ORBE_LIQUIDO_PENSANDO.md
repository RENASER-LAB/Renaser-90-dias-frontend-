# Orbe líquido animado para el estado "pensando" de los chats con IA

**Estado: DESCARTADO el mismo 2026-09-23, reemplazado por `expo-thinking-orbs`.** Se implementó
(ver abajo) y al verlo en el emulador el dueño lo rechazó: *"se ve feo"* — dentro del cristal quedaba
un disco beige con una mancha dorada. El centro de Hoy usa ahora `ThinkingOrb` de
`expo-thinking-orbs` (puntos 3D teñidos de dorado) en `OrbeAcompanante`. El código del orbe líquido se
borró; el shader sigue en `orbe-liquido-preview.html` por si se retoma.

~~**Estado: RETOMADO e implementado el 2026-09-23**~~ (pedido del dueño: el orbe en el centro de Hoy,
como acompañante por voz). Rama `acompanante-ia`.

- Shader: `src/features/renasia/components/orbe/orbeShader.ts` (SkSL, misma matemática que el GLSL de
  `orbe-liquido-preview.html`; sin invertir la Y, porque en Skia ya crece hacia abajo).
- Componente: `orbe/OrbeLiquido.tsx` con `@shopify/react-native-skia` + `react-native-reanimated`
  (camino 1 de abajo). La fase se acumula en el hilo de UI con `useFrameCallback`; la transición
  idle↔thinking es la del diseño (220 ms ease-out cúbico / 650 ms smoothstep).
- Se usa en `OrbeAcompanante` (Hoy), con los halos de `Animated` como respaldo si Skia no está en el
  binario o el shader no compila.
- **No se aplicó todavía** a los indicadores de "pensando" de los chats, que era el pedido original.

> Decía: «PARADO el 2026-09-05 por decisión del dueño — "el orbe animado documentalo para otro día,
> ahora no va". No hay código de esta funcionalidad en la app.» Más abajo, la regla de "no tocar las
> cinco pantallas principales": el dueño autorizó explícitamente cambiar el centro de Hoy.

---

## Qué se pidió

Reemplazar el indicador de "la IA está pensando" de **todos los agentes de chat** (el acompañante
Renasia, el tutor Sparkie, el chat del curso) por un orbe líquido animado.

El dueño pasó el shader en dos formatos, los dos del mismo efecto ("Glass Liquid", estilo 24 =
`glsParticleRibbonFluid`, un sistema de partículas en cinta):

- una página **WebGPU / WGSL** autónoma;
- un componente **SwiftUI + Metal (MSL)**.

Ambos definen dos estados de uniforms, `idle` y `thinking`, y la transición entre ellos:

| Transición | Duración | Easing |
|---|---|---|
| entrar en `thinking` | 220 ms | ease-out cúbico (`1 - (1-t)³`) |
| volver a `idle` | 650 ms | smoothstep (`t²(3-2t)`) |

**Detalle que es fácil pasar por alto:** los colores se interpolan en espacio **lineal**, no en sRGB
directo. El código fuente trae `srgbToLinear` / `linearToSrgb` justamente para eso; interpolar en
sRGB da un gris sucio a mitad de la transición.

---

## El hallazgo que hay que tener presente al retomarlo

**Ninguno de los dos formatos corre en esta app tal cual.** Verificado el 2026-09-05:

- **WebGPU no está disponible** en el WebView de React Native (ni Android WebView, ni WKWebView de
  forma confiable). La página WGSL sirve para mirar el efecto en Chrome de escritorio, no para
  embeberla.
- **El código Metal/SwiftUI es para una app iOS nativa**, no para React Native.
- El `package.json` **no tiene** `@shopify/react-native-skia`, `expo-gl`, `lottie-react-native` ni
  `react-native-reanimated`. Lo único instalado que se acerca es `react-native-webview`.

### Caminos posibles, sin evaluar a fondo

1. **`@shopify/react-native-skia` con runtime shader (SkSL).** Probablemente el de mayor fidelidad:
   los comentarios del propio shader dicen que existe una versión `.sksl` de cada archivo
   (*"THREE files must agree — edge.wgsl, edge.metal, edge.sksl"*), así que el port ya existe en el
   proyecto de origen. **Antes de elegirlo hay que confirmar si la app usa Expo Go o un development
   build**: con Expo Go, una dependencia nativa nueva no funciona sin rebuild.
2. **`expo-gl` + WebGL**, portando WGSL a GLSL ES a mano.
3. **WebView con WebGL** (no WebGPU). Ojo con el costo de un WebView por burbuja de chat.
4. **Una aproximación más simple** con las APIs que ya tiene el proyecto, aceptando menos fidelidad.

---

## Qué quedó guardado

`docs/pendientes/orbe-liquido-preview.html` — la página WebGPU autónoma.
**Abrir con Chrome de escritorio** (no con el navegador del teléfono, no con el WebView de la app).
Es para ver el efecto y decidir si vale el trabajo, no es código de la app.

> El agente que la armó reportó, justo antes de que se lo parara, que *"el núcleo se está yendo a
> blanco y perdiendo el dorado"* — o sea que la vista previa **todavía no reproducía fielmente el
> original**. Si al abrirla se ve lavada, es eso y no un problema de tu máquina.

## Al retomarlo

- **`AGENTS.md` §1 prohíbe alterar las cinco pantallas principales.** El orbe va dentro de los
  componentes de chat (`features/renasia/`, `features/sparkie/`), no tocando Hoy/Plan/Training/
  Comunidad/Yo.
- Un solo componente reusable, no una copia por pantalla.
- Tiene que dejar de animarse cuando no está visible: es un shader por fotograma dentro de un chat.
- Colores desde los tokens de `src/theme/`, respetando claro/oscuro.
