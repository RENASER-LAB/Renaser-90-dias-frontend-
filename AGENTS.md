# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# 📱 REGLAS Y BUENAS PRÁCTICAS DE DESARROLLO MÓVIL (REACT NATIVE / EXPO)

Actúa como un Desarrollador Móvil Senior y Diseñador UX/IA de Alto Nivel especializado en React Native, Expo y TypeScript. Al crear, refactorizar o modificar cualquier pantalla o componente, debes cumplir OBLIGATORIAMENTE con los siguientes estándares:

---

## 1. 🏗️ ARQUITECTURA LIMPIA Y SEPARACIÓN DE RESPONSABILIDADES
* **Estructura Modular por Feature**: Agrupa el código bajo `src/features/<nombre_modulo>/`:
  * `screens/`: Coordinadores y pantallas completas.
  * `components/`: Subcomponentes visuales reutilizables.
  * `types/`: Tipos TypeScript (`.types.ts`).
  * `data/`: Constantes, cláusulas, configuraciones estáticas.
* **Componentes de UI Atómicos**: Utiliza componentes compartidos bajo `src/components/` (`FormField`, `GoldButton`, `SliderRating`, `Checkbox`, `SignatureCanvas`, `Icon`).
* **Integridad del Core**: NUNCA alterar, romper ni desconfigurar las pantallas existentes ni los tabs principales (`Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`).
  * **Excepción autorizada por el dueño del producto — 2026-09-16 — tab `Yo`.** Se autorizó
    expresamente agregar la fila **"Modo oscuro"** (ícono + `Switch`) a la sección
    *FASE 4: PREFERENCIAS & SISTEMA* de `src/screens/YoScreen.tsx`, porque hasta entonces el tema
    solo se podía cambiar desde el botón de luna/sol de la cabecera y el dueño lo quería como una
    fila de ajustes más. Queda anotado acá para que esta regla no contradiga al código.
    El alcance autorizado fue **solo esa fila**: el resto de `Yo` no se tocó, el botón de la
    cabecera sigue donde estaba, y "Notificaciones & Alarmas" sigue navegando a su sub-vista con
    chevron (convertirla en `Switch` habría tapado los tres ajustes detallados que viven adentro).
    Una excepción puntual **no abre** el tab: cualquier otro cambio sobre los cinco principales
    vuelve a necesitar autorización explícita.

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
* **Cifras que cambian, tabulares**: todo número que se actualiza en pantalla (día de programa, puntos, racha) va con `fontVariant: ['tabular-nums']` — ya está en el token `t.metric`. Sin eso, pasar de 9 a 10 corre de lugar todo lo que tenga al lado.
* **Tamaño Mínimo de Lectura**:
  * Textos de párrafo / cláusulas / inputs: **14px a 15.5px**.
  * Etiquetas de ayuda / subtítulos: **12px a 13.5px**.
  * Badges / MicroLabels: **10px a 11.5px (Medium/Bold)**.
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

