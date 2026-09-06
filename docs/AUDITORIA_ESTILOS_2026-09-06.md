# Auditoría de estilos y mantenibilidad del frontend

**Fecha:** 2026-09-06
**Rama:** `auditoria`
**Pregunta del dueño:** *"en tsx se maneja css cuando en verdad se debe de manejar diferente, en uno global o sino usar Tailwind directamente, ¿verdad?"*
**Método:** conteo sobre `src/` (51 archivos con `StyleSheet.create`, 24.004 líneas de TSX), clasificación de estilos inline, detección de claves de estilo repetidas entre archivos, y medición de las pantallas más grandes. Todo lo citado salió de `grep`/scripts sobre el código, no de una impresión.

---

## 1. Respuesta corta

**No, no está mal usar `StyleSheet` dentro del `.tsx`.** En React Native eso es lo idiomático: no hay hoja de estilos global como en la web, y `StyleSheet.create` colocado junto al componente es lo que recomienda la propia documentación. No hay que migrar a Tailwind.

**Lo que sí está mal es otra cosa, y los números lo muestran:** la misma idea de estilo está reescrita a mano en muchos archivos, sin que ninguna copia sepa de las otras. Ese es el problema de mantenibilidad real, y se resuelve con **primitivas compartidas**, no con otra herramienta.

## 2. Lo que se midió

| Métrica | Valor |
|---|---|
| Archivos con `StyleSheet.create` | **51** |
| Estilos inline `style={{ ... }}` (objeto literal en el JSX) | **473** |
| Estilos inline `style={[ ... ]}` (arrays mezclando StyleSheet + literal) | **1.261** |
| Total de expresiones de estilo inline | **1.734** |
| Tailwind / NativeWind / styled-components / Tamagui | **ninguno** |
| Sistema de tema | **sí**: `theme/tokens.ts` (paletas claro/oscuro, tipografía, espaciado), `ThemeContext`, `components/ui.tsx` |

### 2.1 La misma idea, reescrita N veces

Claves de estilo definidas de forma independiente en varios archivos (misma intención, copias que ya divergen):

| Clave | En cuántos archivos |
|---|---|
| `container` | 17 |
| `scrollContent` | 9 |
| `header`, `themeBtn`, `topBar`, `safeArea` | 8 cada una |
| `card` | 7 |
| `backBtn`, `content` | 5 |
| `modalCard`, `modalBackdrop`, `input` | 4 |

Y los fragmentos **inline** más repetidos, literales, carácter por carácter:

| Fragmento | Veces |
|---|---|
| `flexDirection: 'row', alignItems: 'center', gap: 10` | 16 |
| `flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'` | 12 |
| `flex: 1, backgroundColor: c.bg` | 7 |
| `flexDirection: 'row', alignItems: 'center', gap: 6` | 6 |

### 2.2 Las pantallas gigantes — el hallazgo que más pesa

| Archivo | Líneas | Componentes | `useState` | `useEffect` |
|---|---|---|---|---|
| `screens/ComunidadScreen.tsx` | **4.630** | 3 | 13 | 5 |
| `screens/PlanScreen.tsx` | 1.881 | 7 | 11 | 2 |
| `screens/LoginScreen.tsx` | 1.723 | 0 (uno solo) | 10 | 1 |
| `screens/TrainingScreen.tsx` | 1.283 | | | |
| `screens/YoScreen.tsx` | 1.279 | | | |

`ComunidadScreen` con **4.630 líneas y 13 estados en un archivo** es el mayor riesgo de mantenibilidad del frontend: es donde más bugs se reportaron hoy (post en comunidad, evidencia desde el chat, categorías del muro, compartir) y donde un cambio tiene más probabilidad de romper otra cosa. Eso importa mucho más que dónde viven los estilos.

## 3. Por qué NO migrar a Tailwind (NativeWind) ahora

Es una opción válida para un proyecto nuevo, no para éste hoy:

1. **Es una reescritura de 1.734 expresiones de estilo en 51 archivos**, sin una suite de pruebas visuales que diga qué se rompió. El proyecto no tiene ningún test runner (`package.json` no declara ninguno).
2. **El producto ya está en manos de usuarios.** Hoy mismo se estabilizaron seis bugs de producción; una migración de estilos a ciegas es la forma más segura de introducir diez más.
3. **No resuelve el problema medido.** Con Tailwind, `flex-row items-center gap-2.5` se copiaría 16 veces igual que hoy se copia el objeto. La duplicación se resuelve con componentes, en cualquiera de las dos herramientas.
4. Ya existe un sistema de tema con tokens y modo oscuro que funciona. NativeWind obligaría a mapearlo entero a un `tailwind.config` y a mantener dos fuentes de verdad durante la transición.

Si en el futuro se arranca una pantalla nueva desde cero, NativeWind es defendible. Para lo existente, no.

## 4. Lo que se hizo hoy (rama `auditoria`)

### 4.1 Primitivas de layout en `components/ui.tsx`

`Row` y `RowBetween`: las dos ideas más repetidas, como componentes con `gap`, `align` y `style` (que gana sobre los defaults, así que `flex: 1` o `marginTop` se pasan ahí sin perder nada).

### 4.2 `PlanScreen` como conversión de referencia

Se convirtieron las **16 filas inline** de `PlanScreen.tsx` que coincidían exactamente con esos dos patrones (10 `Row`, 6 `RowBetween`), con un script que encuentra el `</View>` de cierre **contando anidamiento**, no con una regex — una regex no sabe qué `</View>` cierra qué `<View>`. El script verifica al final que cada `Row`/`RowBetween` abre y cierra, y que las `View` siguen balanceadas (69 abren, 69 cierran).

**Verificado:** `npx tsc --noEmit` en cero. **Sin verificar todavía:** el render visual de `PlanScreen`, porque está detrás del login y esta sesión no tiene una cuenta; queda para cuando el dueño pase el token (mañana). El cambio es mecánico —el objeto de estilo resultante es idéntico— pero eso no reemplaza mirarlo.

Nada más se tocó a propósito: la conversión de las otras 50 pantallas es trabajo mecánico que conviene hacer archivo por archivo, mirando cada una, no en una tarde.

## 5. Qué sigue, en orden de valor

1. **Partir `ComunidadScreen` (4.630 líneas).** Es un módulo entero disfrazado de pantalla: muro, chat, soporte, métricas y grupo conviven en un archivo. Cada pestaña a su propio componente bajo `features/community/screens/`, con el estado que le pertenece. Es el cambio con más retorno y el que más cuidado exige.
2. Extraer las **4 primitivas que faltan** con el mismo criterio que `Row`: `Screen` (el `container`/`safeArea` de 17 archivos), `ScreenTopBar` (`topBar`/`backBtn`/`themeBtn` de 8), `ModalBackdrop` + `ModalCard` (4), `Input` (4).
3. Convertir las pantallas restantes a las primitivas **una por una**, verificando cada una en el navegador, empezando por las que se tocan más seguido (`Comunidad`, `Plan`, `Yo`).
4. Solo entonces evaluar `tokens` para espaciado (`space.gap`, `space.cardPad`) en vez de números sueltos (`gap: 10`, `gap: 6`, `gap: 4` conviven hoy sin una escala).

## 6. Lo que no se hizo y por qué

- **No se tocó `ComunidadScreen`**: partirla es un refactor de varias horas con riesgo real, y hoy se estabilizó producción sobre esa misma pantalla. Se planifica, no se improvisa a última hora.
- **No se instaló un test runner** para probar las primitivas: agregar dependencias no estaba en el pedido, y una prueba de snapshot de `Row` no habría verificado lo que importa (que las pantallas se vean igual).
