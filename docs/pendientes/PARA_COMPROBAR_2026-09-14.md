# Qué falta comprobar · 14 de septiembre de 2026

Lo que quedó **hecho y verificado**, lo que quedó **hecho pero sin ver con los ojos**, y lo que
**no se hizo**. Escrito para poder cerrar la máquina sin perder el hilo.

Rama: `avance-diseno-y-backend-completo`, en los dos repos (frontend `C:\dev\renaser` y backend).

---

## 1. Verificado de verdad

| Qué | Cómo se comprobó |
|---|---|
| Frontend compila | `npx tsc --noEmit` → exit 0 |
| Pruebas del frontend | **103/103**, 9 suites |
| Backend unitarias | **3011**, 0 fallos (394 clases) |
| Backend integración | **52**, 0 fallos — Testcontainers con Postgres y Redis reales, sobre Docker |
| Sin ciclos entre módulos | `ArchitectureTest` 8/8 |
| Todo endpoint declara permiso | `EndpointAuthorizationDeclarationTest` 4/4 |
| El bundle de Metro se construye | HTTP 200, 7.9 MB, las 5 pantallas dentro, cero errores de sintaxis |
| El login, en pantalla | Visto en el navegador: sin destello, formulario entero sin scroll |
| Los anclajes de los E2E siguen | Comprobado en vivo sobre el árbol de accesibilidad: `Correo electrónico`, `Contraseña`, `Continuar`, `Continuar con Google` |
| CORS acepta el 8081 | Preflight real contra el backend corriendo: `Access-Control-Allow-Origin: http://localhost:8081` |

---

## 2. Hecho, pero NO visto renderizado

**Todas las pantallas internas están detrás del login**, y no se usaron credenciales. Compilan,
pasan tipos y pruebas, y el bundle las incluye — pero nadie las miró.

- **Hoy** — la tarjeta de confrontación, la partícula de ritmo y el separador de pelo entre
  Coherencia y Racha. El separador en modo claro es `#EDE7DC` sobre `#FCFBF9`: deliberadamente
  sutil, hay que confirmar que se vea.
- **Plan** — la tarjeta de fase apilada. El nombre más largo ahora es "Sistema de Alto Rendimiento"
  (27 caracteres, antes "Renaser" tenía 7): **desbordaba** y se reacomodó, falta verlo en 360 px.
- **Training** — el botón PLANIFICAR pasó de borde dorado a un lavado al 10 %. Es a propósito más
  discreto, pero es una acción primaria: conviene un ojo humano.
- **Comunidad** — el ancho que le queda al campo de escribir en la barra de chat con los tres
  botones a 48 px, en un teléfono de 360.
- **Yo** — las tres cifras (coherencia / puntos / racha) como columnas separadas por líneas de pelo.
- **La barra de pestañas** — el nombre solo en la activa. El hueco del texto queda reservado para
  que el ícono no salte; hay que confirmar que no se vea un vacío raro.

---

## 3. Los E2E: NO se ejecutaron

Se intentaron y **fallaron al arrancar**: 3 fallaron, **26 no llegaron a correr**. Los dos motivos
son de entorno, ninguno es código.

**a) Falta el entorno de pruebas declarado.** La suite se niega a correr sin credenciales
explícitas, por diseño (`specs/003-admin-alquimista/e2e.md` §8: las credenciales van fuera de Git).
Necesita siete pares:

```
E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
E2E_ALCHEMIST_EMAIL / E2E_ALCHEMIST_PASSWORD
E2E_MENTOR_EMAIL / E2E_MENTOR_PASSWORD
E2E_TRAINEE_EMAIL / E2E_TRAINEE_PASSWORD
E2E_SUSPENDED_EMAIL / E2E_SUSPENDED_PASSWORD
E2E_FRESH_ADMIN_EMAIL / E2E_FRESH_ADMIN_PASSWORD
E2E_FRESH_ALCHEMIST_EMAIL / E2E_FRESH_ALCHEMIST_PASSWORD
```

Si no están a mano, salen de sembrar `e2e/admin-alquimista/soporte/escenarios.sql`, que es
idempotente.

**b) Falta el navegador de Playwright en esta máquina.**

```
Error: browserType.launch: Executable doesn't exist at
...\ms-playwright\chromium_headless_shell-1148\chrome-win\headless_shell.exe
```

Se resuelve con `npx playwright install chromium` (~150 MB desde el CDN de Microsoft).

> **Ojo con los documentos viejos.** `specs/003-admin-alquimista/PENDIENTES.md` dice que las 24
> pruebas pasaron el 2026-09-11. Eso fue en otra máquina o con el entorno puesto: **acá nunca se
> ejecutaron**, y nada de lo cambiado hoy está cubierto por ellas.

---

## 4. Antes de desplegar

1. **Reiniciar el backend.** Sin eso, la racha sigue saliendo de una fila que nadie actualiza (por
   eso se ve `0 días` con `récord 3`) y el endpoint de compartir responde 404.
2. **Confirmar los parámetros de AWS**: `CORS_ORIGENES`, `RESET_PASSWORD_URL`,
   `ACTIVATE_ACCOUNT_URL`. Si falta alguno **no falla nada**: hereda el default y el problema
   aparece en la cara del usuario.
3. **`STORAGE_PROVEEDOR=s3`.** Sin eso ninguna subida funciona y toda URL sale como
   `about:blank#pendiente-s3/...`.
4. **Probar compartir una foto del Muro de punta a punta**, que es el arreglo de hoy: compartir →
   abrir la conversación → ver la foto → **volver a abrirla al día siguiente**. Ese último paso es
   el que prueba que se corrigió: antes moría a los 15 minutos.

---

## 5. No se hizo

| Qué | Por qué |
|---|---|
| **Graduación al día 90** | Reglas confirmadas (día 90 sin condiciones · `dia_post_programa` en 0 · los hábitos se siguen generando). Falta escribirlo |
| **Patrón del agente para el 80/20** | Hoy se guarda el texto de cada conversación pero **nada lo clasifica**, así que no hay nada agregable. Es backend |
| **Coherencia diaria** | El hueco más grande: nada la calcula, y arrastra rachas, semáforo, ranking y Verdugo. **Falta definir la fórmula** — es una regla de negocio, no código |
| **Ocultar la barra al bajar** | Se puede; hay que cablear un contexto compartido en las 5 pantallas. Sin aprobar |
| **Metáforas de los íconos** | Los íconos **ya no son de Lucide ni Feather** (están dibujados a mano en el repo): lo genérico es la metáfora — un sol para "Hoy", un diamante para "Training". Falta decidir qué evoca cada pestaña |

---

## 6. Cosas sueltas que aparecieron y no se tocaron

- **El círculo dorado de Hoy**: botón dentro de botón (`GoldCircle` renderiza su propio `Pressable`
  dentro del que navega a Plan). En web funciona porque los eventos burbujean; **en nativo podría
  tragarse el toque**. Los E2E corren en web, así que no lo verían.
- **`ui.tsx` con valores fijos**: `Card` usa `borderRadius: 16` y `padding: 17` en vez de los
  tokens. Mientras siga así, una tarjeta dentro de otra apila bordes en toda la app.
- **`bg` y `cardBg` casi idénticos en modo claro** (#FCFBF9 vs #FDFCFA): es la razón de fondo por la
  que toda tarjeta necesita borde para verse. Si el objetivo es estructura por espacio y no por
  contorno, ése es el cambio de raíz.
- **Datos inventados vivos**: "37 días consecutivos" y "94 %" cableados en Training, iguales para
  las 5 dimensiones y para cualquier aprendiz. `GROUP_MEMBERS` y `METRICAS` en Comunidad.
  `'Grupo 07 · Día 37'` en el compositor y `'16 miembros'` en el encabezado del chat.
- **Compartir una publicación que todavía se está subiendo** ahora falla a la vista con un aviso.
  Antes "funcionaba" mandando la ruta local del teléfono. Es mejor, pero convendría deshabilitar
  el botón mientras esté pendiente.
- **`core.longpaths` quedó activado globalmente en git** (2026-09-14). Sin eso no se puede crear un
  worktree de este repo en Windows: 21 archivos pasan el límite de 260 caracteres, porque los
  nombres hexagonales son largos y el worktree cuelga un nivel más abajo.
