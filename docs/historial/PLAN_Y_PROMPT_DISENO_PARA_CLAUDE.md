# Renaser: plan y prompt de diseño para Claude

Este documento conserva el plan preparado en la conversación. Guardarlo no implica que se haya implementado el rediseño ni instalado las herramientas.

## Qué aporta cada recurso

| Recurso | Uso en Renaser |
| --- | --- |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Criterios de composición, jerarquía, espaciado y revisión de interfaces existentes. Adaptar sus instrucciones web a React Native. La skill principal consultada es experimental. |
| [60fps MCP](https://60fps.design/mcp) | Referencias de interacciones y desgloses de movimiento. Requiere licencia PRO. Su herramienta de código ofrece SwiftUI: traducir el comportamiento a React Native. El nombre no garantiza rendimiento. |
| [Colors Visualizer](https://colors-visualizer.vercel.app/) | Explorar la paleta sobre diseños. Medir contraste por separado. |
| [BrandBird](https://www.brandbird.app/templates) | Presentar capturas y piezas visuales finales. No incorporarlo como dependencia de la app. |
| [Design Vault](https://www.gooddesign.tools/tools/design-vault) | Referencias de jerarquía, organización de contenido y patrones UX. |

## Prompt listo para Claude: ejecutar desde aquí

Actúa como desarrollador móvil senior y diseñador de producto. Ejecuta este plan en el frontend de Renaser, sin subagentes. Inspecciona, implementa por etapas y verifica el resultado; no te quedes en recomendaciones.

### Contexto y límites

- Proyecto: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-`.
- Rama solicitada: `master`. Comprueba su estado y conserva cualquier trabajo existente. No descartes cambios para cambiar de rama.
- Lee `AGENTS.md`, las instrucciones locales aplicables y https://docs.expo.dev/versions/v57.0.0/ antes de escribir código.
- Stack observado: Expo ~57.0.18, React Native 0.86.3, React 19.2.3, TypeScript y React Navigation.
- Conserva nombres, orden y funciones de Hoy, Plan, Training, Comunidad y Yo.
- No hagas push ni despliegues.

### 1. Dirección visual

Renaser acompaña un proceso personal de 90 días. La dirección será bienestar editorial: cálida, clara, elegante y con personalidad propia. La interfaz debe ayudar a entender el día, elegir una acción, completarla y reconocer el avance.

Conserva crema y blanco cálido en modo claro, carbón y superficies cálidas en modo oscuro, dorado como acento selectivo y tipografía Jost Regular, Medium y Bold.

Da personalidad mediante composición, proporciones, tipografía y detalles. Usa espacios bien medidos, separadores suaves y agrupación por significado. Alterna secciones abiertas con tarjetas cuando estas ayuden a entender la información.

Evita tarjetas idénticas para todo, gradientes omnipresentes, brillos decorativos, emojis como iconos, exceso de cápsulas, textos diminutos y animaciones permanentes. Conserva elementos de marca existentes que aporten identidad. Mantén los textos y conceptos propios de Renaser.

### 2. Herramientas y referencias

Verifica las opciones del instalador e instala estas skills localmente para Claude Code:

```bash
npx skills add Leonxlnx/taste-skill --skill design-taste-frontend
npx skills add Leonxlnx/taste-skill --skill redesign-existing-projects
```

Revisa su contenido y adapta sus criterios a React Native y AGENTS.md. No traslades automáticamente dependencias DOM, CSS, GSAP, Tailwind o componentes web al código nativo. Mantén las dependencias actuales salvo necesidad técnica demostrada.

Si 60fps MCP está conectado y autenticado, consulta patrones de botones, progreso y modales. Si falta licencia, continúa con referencias públicas y registra la limitación; no inventes resultados de herramientas.

La configuración de referencia del proveedor es:

```json
{
  "mcpServers": {
    "60fps": {
      "url": "https://mcp.60fps.design/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_60FPS_PRO_LICENSE_KEY"
      }
    }
  }
}
```

El valor mostrado es un placeholder. Configura el servidor únicamente en el cliente de desarrollo siguiendo su esquema vigente, nunca en el runtime Expo. No guardes una licencia real en archivos versionados. No bloquees el rediseño si el servicio no está disponible.

Consulta también Colors Visualizer, Design Vault y BrandBird, enlazados arriba. Selecciona como máximo cinco referencias y explica qué principio adaptas de cada una. Reserva BrandBird para presentar capturas; no agregues funciones de marketing al producto.

### 3. Audita y corrige el sistema compartido

Inspecciona tokens, tema, responsividad, componentes, navegación y pantallas. Cuando puedas, ejecuta la app y registra capturas iniciales. Distingue hallazgos de código de problemas confirmados visualmente.

Centraliza colores, tipografía, espacios, radios y estados interactivos en el sistema existente. Comprueba estos hallazgos de la revisión inicial:

- `useResponsive` devuelve 20 px de margen móvil estándar; usa 18 px para 360–440 px, 14 px en compactos y 32 px en tablets. Mantén 20 px entre 441–767 px.
- El token `hero` usa `Jost_300Light`: sustituye por un peso permitido.
- El token `tab` tiene 9.5 px: mejora su legibilidad respetando el espacio disponible.
- Mide y corrige el contraste del texto sobre dorado en ambos temas.

Uniforma botones, campos, encabezados, checkboxes, mensajes de error y estados vacíos. Mantén áreas táctiles de al menos 48 px y contenido de tablet centrado con máximo de 560 px.

Conserva las interfaces de componentes compartidos cuando sea posible y revisa sus pantallas consumidoras tras cada cambio transversal.

### 4. Implementa las pantallas en este orden

| Pantalla | Resultado esperado |
| --- | --- |
| Hoy | Día y fase comprensibles, acción prioritaria destacada y progreso fácil de interpretar. Ajusta los anillos decorativos al ancho y alto disponibles para dar protagonismo al contenido útil. |
| Plan | Lectura ordenada de fase, prioridades y distribución del tiempo. Diferencia lo actual de lo siguiente mediante jerarquía y espaciado. |
| Training | Dimensiones y hábitos fáciles de explorar. Estado, siguiente acción y acceso a evidencias claros para cada práctica. |
| Comunidad | Publicaciones cómodas de leer, imágenes proporcionadas y acciones sociales consistentes. Da presencia a las personas y sus aportes. |
| Yo | Perfil y avance personal organizados. Agrupa evidencias, reflexión e identidad con pesos visuales apropiados. |

Usa Hoy como piloto: implementa, revisa ambos temas y corrige antes de extender el sistema. Continúa de forma autónoma con las demás pantallas.

Extrae componentes visuales por feature cuando facilite el trabajo. Reutiliza componentes existentes y evita una reorganización masiva del repositorio.

### 5. Pule las interacciones y preserva los flujos

Añade feedback breve en pulsaciones, cambios de estado y apertura/cierre de modales. Usa las capacidades existentes, con movimiento discreto y soporte para reducción de movimiento.

Cumple íntegramente AGENTS.md:

- Un único scroll principal, sin contenedores internos con altura fija y scroll anidado. Usa el espaciado inferior requerido.
- Formularios compatibles con teclado, texto ampliado y textos largos.
- Validación clara antes de avanzar.
- Respuestas y firmas persistentes al navegar y abrir el teclado.
- Firma dual, gestos protegidos y deserialización segura.
- `useSystemBackHandler` en vistas hijas y flujos.

Comprueba el cierre con `onRequestClose` en modales nativos. Los detalles deben regresar a su vista principal y los formularios al paso anterior sin perder datos. Verifica iOS por separado: el hook actual basado en `hardwareBackPress` no demuestra por sí solo soporte del gesto iOS.

Revisa login, onboarding y Mapa de Renacimiento para asegurar coherencia y ausencia de regresiones por cambios compartidos, sin replantear sus reglas ni contenidos.

### 6. Conserva la lógica del producto

Mantén contratos API, autenticación, almacenamiento, reglas del programa y condiciones de acceso. No agregues funcionalidades ajenas al pulido visual y de interacción.

Conserva los estados reales de carga, vacío y error. Nunca sustituyas información desconocida por progreso, días, métricas o contenido inventados. En Hoy, un día desconocido debe seguir siendo desconocido hasta disponer del dato real.

### 7. Verifica y entrega

Revisa ambos temas en anchos de 320, 360, 390, 440 y 768 px, incluyendo pantalla alta, texto ampliado y teclado abierto.

Comprueba navegación entre tabs, retroceso, formularios, firmas, evidencias y estados de red. Verifica ausencia de texto cortado, desbordamientos, doble scroll y botones ocultos. Mide contraste.

Ejecuta:

```bash
npx tsc --noEmit
npm run build:web
```

Valida gestos, teclado y movimiento en entorno nativo cuando esté disponible. Una compilación web no demuestra funcionamiento nativo. No afirmes rendimiento sin medirlo. Documenta cualquier comprobación pendiente sin presentarla como superada.

Entrega los cambios implementados, capturas comparables antes/después de las cinco pantallas en ambos temas cuando puedas obtenerlas y un resumen breve de mejoras y validaciones. Indica las limitaciones reales de acceso o verificación.

**Criterio de éxito:** Renaser conserva toda su funcionalidad y se siente como una aplicación diseñada específicamente para acompañar a una persona durante sus 90 días: legible, cercana, consistente y visualmente cuidada.
