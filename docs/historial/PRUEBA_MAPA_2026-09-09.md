# Prueba del Mapa de Renacimiento de punta a punta

**Fecha:** 2026-09-09 · **Dónde:** el desplegado (Vercel + backend en CloudFront), navegador, cuenta
de prueba en el **Día 2 de 90**. **Camino:** Yo → Etapa 2 → Mapa de Renacimiento → Activar.

---

## 1. Lo que se verificó: el circuito cierra

Activar el Mapa dispara, **en este orden**:

```
PUT  /api/v1/rocks/master/CUERPO      → 200
PUT  /api/v1/rocks/master/TRABAJO     → 200
PUT  /api/v1/rocks/master/RELACIONES  → 200
POST /api/v1/habits  ×3               → 201
```

Los objetivos van **antes** que los hábitos, que es lo que evita dejar el Mapa a medio activar.
Después:

- `GET /rocks/master` devuelve **tres filas**, una por eje.
- **RELACIONES va sin meta cuantitativa** (`meta`, `avance`, `unidad` y `porcentaje` en `null`), tal
  como se diseñó: su escala 1-10 no es una unidad de negocio.
- `GET /rocks/weekly` responde **200** en vez de `403 ROCKS_LOCKED`. **La cadena quedó abierta.**
- **Plan** muestra los tres objetivos reales del aprendiz, y cada tarjeta abre su propio eje.
- `FASE ACTUAL` dice **01 Renaser**, la misma que Hoy y Yo. Ya no hay dos vocabularios de fase.

También funcionó bien lo que no se estaba probando: las frases SMART se arman solas y quedan
legibles, los hitos intermedios se calculan (S/ 9000 → 12 500 → 15 000), y el borrador local
sobrevivió a dos salidas accidentales a otra pestaña a mitad del formulario.

---

## 2. Lo que hay que arreglar

### 🔴 1. Una meta que baja se muestra al 100 % desde el primer día

**Es el más grave, porque es un dato falso, no una molestia.**

Con el objetivo *"pesaré 75 kg, partiendo de 82 kg"*, el Plan muestra:

```
Avance cuantitativo:  100% CUMPLIDO
Llevas: 82 kg                Meta: 75 kg
```

**Causa.** `MetaCuantitativa.porcentaje()` hace `min(100, avance × 100 / objetivo)`. Con 82 y 75 da
109, que se acota a 100. La fórmula asume que **más es mejor**, y hay objetivos donde menos es
mejor.

**Cuánto alcanza.** El Mapa ofrece `peso` y `deuda` como tipos de resultado, así que no es un caso
raro: cualquiera que quiera bajar de peso o reducir deuda ve "100 % cumplido" el día 1.

**Por qué no se arregla de una.** Para medir una meta descendente hace falta el punto de partida
—`(base − avance) / (base − meta)`— y `rocas_maestras` **no lo guarda**: `avance` es el valor actual
y pisa al inicial en cuanto la persona lo actualiza. O sea: columna nueva, migración, y decidir qué
pasa con las filas que ya existen. Es una decisión de producto, no un parche.

### 🔴 2. El botón bloqueado no dice qué falta

Pasó **dos veces** en el mismo recorrido:

| Paso | Botón | Qué faltaba de verdad |
|---|---|---|
| 6 · acciones | *Confirmar mi sistema* | elegir **Evidencia** (Check/Foto/…) en cada acción |
| 10 · resumen | *Activar mi mapa* | marcar el compromiso de seguimiento, al final de todo |

En los dos casos el botón **no responde y no pasa nada**: sin mensaje, sin resaltar el campo, sin
llevar la pantalla hasta el problema. Se descubre por prueba y error. Alguien de 55 años ahí no
concluye "me falta un campo", concluye "esto está roto" — y llama a soporte o abandona.

Es el hallazgo con peor relación esfuerzo/beneficio: la validación ya existe, solo no se muestra.

### 🟡 3. El paso 3 señala el campo equivocado

Faltaba elegir el **tipo de resultado** (peso / medidas / energía / …), que **no viene
preseleccionado**. El mensaje que apareció fue:

> ¿A qué número o resultado concreto quieres llegar?

…apuntando al *Resultado Día 90*, que estaba lleno. Se pierden varios minutos revisando un campo
correcto. O se preselecciona un tipo por defecto, o el mensaje nombra lo que falta.

### 🟡 4. La escala 1–10 son botones de 22 × 10 px

En el paso 5 (relaciones), "Situación actual" y "Resultado Día 90" se eligen tocando una de diez
barritas de **22 × 10 px**. El piso del proyecto es **48 × 48** (`AGENTS.md` §4). Con el público de
50-60 años, acertarle al 7 y no al 6 es cuestión de suerte.

### 🟡 5. Los bloques del día siguen dentro del Mapa

Cada acción del paso 6 tiene **"Momento (opcional): Mañana / Tarde / Noche"**. Es el mismo concepto
que se sacó de Entrenamiento porque el cliente ya no lo quiere ver, y porque hay aprendices que
trabajan de noche o de madrugada. Acá quedó. **Falta confirmar si también se saca.**

---

## 3. Detalles del despliegue que conviene tener anotados

- **La tarjeta del Mapa que está en Hoy no existe en producción.** `MAPA_DIA7_HABILITADO` es
  `__DEV__ || EXPO_PUBLIC_MAPA_DIA7 === 'on'`; las dos son falsas al compilar en Vercel y el
  minificador **elimina el bloque entero** (por eso `MAPA_DIA7` no aparece ni una vez en el bundle).
  La entrada que sí funciona es **Yo → Etapa 2**, que no pasa por ese flag. Para encender la de Hoy
  hay que poner `EXPO_PUBLIC_MAPA_DIA7=on` en Vercel y redesplegar.
- **Para probar en un navegador contra el backend local** no sirve el `.env` del repo: apunta a
  `10.0.2.2:8080`, que es el alias del host **desde el emulador de Android**. Y hay que servir la
  app en **8081, 19006 o 3000**, que son los únicos orígenes que acepta `CORS_ORIGENES`.

---

## 4. Lo que quedó sin probar

- **El nivel semanal y el diario.** Con las maestras cargadas, `POST /rocks/weekly` ya está
  disponible, pero no se llegó a armar una semana ni a agendar acciones.
- **Completar una acción desde Entrenamiento**, que es el arreglo de `sellarRocaDiaria`. Depende de
  lo anterior.
- **El repaso con la fuente del sistema agrandada**, que es como lo va a tener el público objetivo.
