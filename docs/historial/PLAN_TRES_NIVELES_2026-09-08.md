# El Plan, de punta a punta: 90 días → semana → día

**Fecha:** 2026-09-08 · **Pantalla:** Plan → PRIORIDADES CLAVE → Objetivos.
**Estado:** los tres niveles y los tres ejes, contra el backend. Sin cambios de backend.

Reemplaza a `OBJETIVOS_DEL_PLAN_2026-09-07.md`, que describía el estado intermedio.

---

## 1. Por qué estaba bloqueado

Las tres tarjetas de PRIORIDADES CLAVE decían *"Disponible en la próxima actualización"* y estaban
con `disabled`. No faltaba construir: faltaba **el primer dato de la cadena**.

`RocaSemanalService.requireRocasMaestrasCompletas` responde `403 ROCKS_LOCKED` con menos de tres
Rocas Maestras, y hacia abajo la cadena es dura: la roca diaria exige la semanal del eje
(`NO_WEEKLY_ROCK`), y la mensual exige la maestra (404). Con `rocas_maestras` vacía, todo el Plan
queda cerrado.

Y el dato **ya existía**: el Mapa del Día 7 pregunta exactamente tres objetivos a 90 días, uno por
área, que mapean uno a uno con los tres ejes. Solo que al activar el Mapa esos objetivos se usaban
como etiqueta del hábito y nunca llegaban a `rocas_maestras`. El aprendiz llenaba un formulario cuyo
resultado no aparecía en ninguna pantalla.

## 2. Qué se hizo

| # | Cambio | Dónde |
|---|---|---|
| 1 | Activar el Mapa escribe las 3 Rocas Maestras, antes de crear los hábitos | `features/mapa-renacimiento/hooks/useMapaRenacimiento.ts` |
| 2 | El Mapa disponible desde el Día 0, opcional | `screens/HoyScreen.tsx` |
| 3 | La vista de Objetivos, desbloqueada y por eje | `screens/PlanScreen.tsx` |
| 4 | Nivel semanal contra el modelo real | `features/objetivos/components/TarjetaPlanSemanal.tsx` |
| 5 | Nivel diario: acciones críticas con hora | `features/objetivos/components/TarjetaAccionesDelDia.tsx` |
| 6 | Los textos que mentían | `screens/PlanScreen.tsx` |

**El mapeo área → eje**, que estaba implícito y ahora es explícito:

| Área del Mapa | Eje de la roca |
|---|---|
| `salud` | `CUERPO` |
| `negocio_dinero` | `TRABAJO` |
| `relaciones` | `RELACIONES` |

Relaciones va **sin** meta cuantitativa: su escala 1-10 no es una unidad de negocio, y el backend
rechaza media meta con un 400 (`meta`, `avance` y `unidad` van los tres o ninguno).

Se escribe **antes** de los hábitos para que un fallo no deje el Mapa a medio activar, con hábitos
creados y sin objetivos. Es idempotente: `PUT /rocks/master/{eje}` hace upsert por
`(participante, eje)`, así que activar dos veces deja tres filas, no seis.

## 3. El nivel semanal no era una lista de tildes

Lo que había era una checklist en `useState` cuyo `Alert` decía *"Los cambios han sido guardados en
tu plan"* — falso: se perdía al recargar.

El modelo del backend es **un ciclo que se abre y se cierra**:

- **Abrir** (`POST /rocks/weekly`) crea **el trío completo**: una roca por eje, las tres o ninguna
  (*"se requiere exactamente una roca semanal por eje"*). Por eje: título, **exactamente tres**
  acciones críticas, obstáculo, contingencia y autoevaluación de entrada.
- **Corregir** (`PATCH /rocks/weekly/{id}`), parcial.
- **Cerrar** (`PATCH /rocks/weekly/{id}/review`): autoevaluación final, bloqueo principal y
  corrección, los tres obligatorios.

Cuatro cosas del contrato que hay que tener a mano, porque no se adivinan leyendo la pantalla:

1. **El número de semana lo decide el servidor**, no el cliente: la semana de hoy, +1 si hoy es
   domingo. La app no lo manda al crear — solo lo usa para rotular.
2. **La respuesta no trae el eje**, trae `rocaMaestraId`. Para saber que una roca es de CUERPO hay
   que cruzarla contra las maestras. Por eso `useRocasSemanales` las recibe por parámetro.
3. **Asimetría real del contrato:** crear manda tres campos escalares `accionCriticaN`; editar manda
   `accionesCriticas: string[]` de tamaño 3.
4. **La ventana no son 48 h**, pese a que el caso de uso se llame `EditarDentroDe48hUseCase`: es
   domingo 12:00 → lunes 09:00 en la zona del participante, con 2 h de margen para lo creado a
   destiempo. **Crear no tiene ventana; solo editar la tiene.**

Tres estados que la pantalla distingue, porque significan cosas distintas y ninguno es "un error":

| Situación | Respuesta | Qué se muestra |
|---|---|---|
| Sin las 3 maestras | `403 ROCKS_LOCKED` | "Primero definí tus tres objetivos de 90 días", con botón al Mapa |
| La semana ya está abierta | `409 ALREADY_PLANNED` | se recarga y se muestra la existente, no el formulario vacío |
| Fuera de la ventana | `403` | se ve, no se edita, y **se dice desde cuándo** se va a poder |

## 4. El nivel diario cierra el circuito

> **Agregado 2026-09-08.** Al verificar apareció que el circuito **no cerraba**: Training abría el
> modal de evidencia de hábitos para las tarjetas de VIDA Y NEGOCIO, y ese modal pega siempre contra
> `/api/v1/habit-tracks/{id}/...`. A una roca se le pasaba su id de roca → 404. No se notaba porque
> esa dimensión estaba siempre vacía. Corregido con `sellarRocaDiaria`, que usa
> `/api/v1/rocks/{id}/evidence[/upload-url]`. Ver §4.1.

Las tres acciones críticas de cada roca semanal se agendan como rocas diarias, con hora opcional
(`POST /rocks/plan`). Eso es exactamente lo que Training lee para la dimensión **VIDA Y NEGOCIO**,
que mostraba `0/0 CUMPLIDOS` porque nadie planificaba rocas.

```
Mapa (Día 0+)  →  3 objetivos de 90 días        → parte 1
Cada semana    →  3 rocas + 3 acciones críticas → parte 2
Cada día       →  las acciones, con hora        → parte 3  →  Training · VIDA Y NEGOCIO
```

Restricciones del endpoint que la pantalla respeta en vez de descubrir con un error:

- **Qué fechas acepta:** desde las 18:00 locales, **solo mañana**; antes, hoy o mañana. Otra fecha da
  `400 INVALID_DATE`. Por eso la fecha propuesta se calcula en cada render y no se memoiza: con la
  app abierta a las 17:59 seguiría ofreciendo "hoy" pasadas las 18:00.
- **Posiciones contiguas por eje**, de 1 a 3, sin huecos. La numeración sale del orden en que la
  persona elige, no se le pide.
- **El color es Pareto, no decoración:** 1ª VERDE, 2ª AMARILLA, 3ª ROJA, y hasta completar la VERDE
  de un eje las otras dos de ese eje llegan con `bloqueada: true`.
- **La hora es opcional.** El programa dio libertad total de horario —hay gente que trabaja de noche
  y de madrugada—, y una acción sin hora es igual de válida.

## 5. Los textos que mentían

- `2. OBJETIVO SEMANAL (SEM 06)` fijo, justo debajo de una tarjeta que sí calculaba la semana.
- `FASE ACTUAL · 01 Fundamentación · Días 1–30`, que decía lo mismo en el día 75.
- El encabezado *"Diseñar libertad financiera & Metas"*, cuando la vista ya sirve a los tres ejes.

### La fase: tres pantallas decían dos cosas distintas

Al verificar apareció que el choque **ya estaba vivo en producción**, no era latente:

| Pantalla | De dónde sacaba la fase | Qué mostraba en el día 40 |
|---|---|---|
| Hoy | `GET /home` → `rotuloDeFase` | GUERRERO ALQUIMISTA |
| Yo | `GET /home` → `rotuloDeFase` | GUERRERO ALQUIMISTA |
| Plan | un arreglo local de 3 fases inventadas | ACELERACIÓN · Fase 2 |

**Las fases del programa son cuatro y las define el backend**, y no son decorativas: cada una tiene
su contrato firmado en `contratos_fase` (Fase I día 1, Fase II día 8 con firma el 17, Fase III día
35, Fase IV día 65). Las tres de Plan estaban escritas a mano en `PlanScreen.tsx`.

Se resolvió **sin tocar el backend**: Plan ahora lee `fase` de `GET /home` —que ya venía y la
pantalla tiraba— y la rotula con `descripcionDeFase`, el mismo lugar donde ya vivían los nombres que
usan Hoy y Yo. El arreglo local pasó a llamarse `TRAMOS_DEL_RECORRIDO`: sigue dibujando la curva de
ARQUITECTURA DE TIEMPO, pero ya no se llama "fase", para que la palabra tenga un solo significado.

> **Sobre "meses":** el rótulo *"Mes 2 · Semanas 5 a 8"* **se deja como está**. "Mes" no es un
> invento de la pantalla: es el `numeroMes` (1 a 3) de las rocas mensuales del backend
> (`PUT /rocks/monthly/{eje}/{numeroMes}`). Fases y meses son dos ejes distintos y los dos son
> reales: 4 fases con contrato, 3 meses de planificación.

## 6. Doce semanas, y por qué

**Confirmado por el dueño del programa el 2026-09-08: son 12.** El backend admite
`numero_semana BETWEEN 1 AND 13` porque 90 ÷ 7 = 12,86, pero la planificación **no arranca el día
1**: arranca cuando el aprendiz llena su Mapa. Del día 8 al 90 hay 83 días ≈ 12 semanas.

La cabecera de `periodoDelPrograma.ts` justificaba el 12 con otro motivo ("13 no se divide en meses
de 4"). Se corrigió: eso es una consecuencia cómoda, no la razón, y dejaba la puerta abierta a que
alguien viera el `BETWEEN 1 AND 13` y "corrigiera" el archivo a 13.

## 7. El diseño, para 50-60 años

- Cuerpo de texto en **15-16 px**; se subieron los `fontSize: 9.5 / 10 / 10.5` que quedaban en la
  vista de Objetivos.
- **48×48 de área táctil** como piso, incluidos los botones de cerrar y los puntos de la escala 1-10.
- **Menos animación, no más.** El progreso de los pasos es una fila de puntos, no una barra que se
  mueve.
- **Un paso por pantalla.** Planificar la semana son tres rocas con seis campos cada una: se hace de
  a un eje, con un resumen antes de guardar. Elegir la hora reemplaza el contenido del modal en vez
  de abrir otro encima — un `<Modal>` dentro de otro es la única forma que este repo no usa en
  ningún lado, y en iOS dos modales encimados se pelean por la pantalla.
- **Decir siempre hasta cuándo se puede cambiar**, en vez de dejar que la persona lo descubra con un
  403.

## 8. Archivos

**Nuevos**

- `features/objetivos/hooks/useRocasSemanales.ts` — abrir, corregir y cerrar la semana; distingue
  `ROCKS_LOCKED` de `ALREADY_PLANNED`.
- `features/objetivos/hooks/useRocasDiarias.ts` — hoy, mañana, y agendar; `posicionarPorEje`.
- `features/objetivos/utils/ventanasDePlanificacion.ts` — las dos ventanas, en palabras.
- `features/objetivos/components/` — `NivelesDelPlan`, `TarjetaPlanSemanal`, `PlanSemanalModal`,
  `RevisionSemanalModal`, `TarjetaAccionesDelDia`, `AgendarAccionesModal`.

**Modificados**

- `features/objetivos/{api,types}` — las cuatro llamadas de `/weekly` y las tres de las diarias.
- `features/objetivos/utils/periodoDelPrograma.ts` — solo la cabecera.
- `features/mapa-renacimiento/hooks/useMapaRenacimiento.ts`, `screens/HoyScreen.tsx`,
  `screens/PlanScreen.tsx`.

`PlanScreen.tsx` bajó de 2046 a ~1890 líneas: las partes 2 y 3 se fueron a componentes propios, y
`WeeklyGoalItem`, `PlanGoals` e `INITIAL_GOALS` —el estado en memoria— se borraron.

## 9. Cómo verificarlo

`npx tsc --noEmit` en cero. **Es la única red automática que hay**: este repo no tiene suite de
pruebas —ni script `test` ni un solo `.test.tsx`—, así que el resto se comprueba a mano contra el
backend local.

Con el backend levantado y una cuenta de aprendiz:

1. Recorrer el Mapa hasta *Activar*. En la base tienen que aparecer **tres** filas:
   ```sql
   select eje, objetivo, meta, avance, unidad from renaser.rocas_maestras
   where participante_id = '<id>';
   ```
2. Activar dos veces: siguen siendo tres, no seis.
3. **Plan → PRIORIDADES CLAVE**: las tres tarjetas abren, cada una con su objetivo real.
4. Armar la semana. Tienen que quedar tres filas con 3 acciones cada una:
   ```sql
   select rs.numero_semana, rm.eje, rs.titulo, rs.autoevaluacion_inicio,
          (select count(*) from renaser.acciones_criticas ac where ac.roca_semanal_id = rs.id) as acciones
   from renaser.rocas_semanales rs join renaser.rocas_maestras rm on rm.id = rs.roca_maestra_id
   where rm.participante_id = '<id>';
   ```
5. Intentar armarla otra vez: `409`, y la pantalla muestra la semana existente.
6. Cerrar una roca y verificar `autoevaluacion_fin`, `bloqueo_principal` y `correccion`.
7. Agendar una acción con hora y verificar `hora_inicio` en `rocas_diarias`.
8. Abrir **Training**: VIDA Y NEGOCIO tiene que dejar de mostrar `0/0`.
9. Un aprendiz **sin** Mapa activado sigue viendo el estado vacío, nunca un dato inventado.

**Sin verificar:** todo lo de arriba. Al escribir esto no se corrió el recorrido con backend
levantado ni en un dispositivo real — queda pendiente, incluido el punto 15 del plan (revisar las
tres partes con el tamaño de fuente del sistema aumentado).


## 4.1 Completar una acción del día

Una roca no se cierra como un hábito, y por eso no se pudo reusar aquel camino:

| | Hábito | Roca |
|---|---|---|
| Endpoints | `/habit-tracks/{id}/...` | `/rocks/{id}/...` |
| Pasos | 4 — y es `/complete` el que da los puntos | 3 — `/evidence` cierra **y** premia |
| Repetir | el backend rechaza completar dos veces | `409 ALREADY_COMPLETED` |
| Foto | acepta `timestampExif` nulo | **lo exige** (Ley VI, ±15 min) |

**Cómo se evitó atar `habits` a `objetivos`:** el modal no conoce rocas. Recibe un
`sellarPersonalizado` opcional —una función que devuelve los puntos— y quien compone las dos cosas
es `TrainingScreen`, que ya importa los dos módulos. La orquestación vive en
`features/objetivos/utils/sellarRocaDiaria.ts`, y desde ahí sí se reusan `subirArchivoAS3` y la
guardia de almacenamiento de `habits`: son un PUT genérico a una URL prefirmada, sin nada de hábitos.

**La Ley VI obligó a capturar el instante de la foto**, que la app no tenía: el picker nunca pedía
EXIF y `normalizarFoto` lo borra al reencodear. Ahora `ArchivoEvidencia` lleva `tomadaEn`:

- **Cámara** → el EXIF si está, y si no el instante en que la app recibió la captura, que acaba de
  pasar y la app sí puede atestiguar.
- **Galería** → el EXIF `DateTimeOriginal`, y `null` si la imagen no lo tiene (una captura de
  pantalla, una foto reenviada por WhatsApp, una ya editada).

Con `null` **no se manda igual**: se corta antes con un mensaje que la persona pueda entender.

> **Corregido 2026-09-08.** Acá decía que mandar `null` hacía estallar al servidor con un **500**, y
> que era un bug del backend pendiente de arreglar. **Es falso.** El constructor compacto de
> `CompletarRocaDiariaCommand` ya rechaza ese caso y el cliente recibe un **400** limpio:
> `timestampExif es obligatorio para evidencia de tipo FOTO (Ley VI)`. El diagnóstico salió de leer
> `requireExifDentroDeMargen` en aislamiento, sin seguir a quién construye el comando; lo destapó el
> test de regresión al fallar por un motivo distinto del esperado. Queda registrado como E-165.
>
> La guardia del cliente **se mantiene igual**, pero por otro motivo: el mensaje del backend es
> correcto y está escrito para quien programa. "timestampExif es obligatorio" no le dice nada a un
> aprendiz de 55 años; "sacá la foto con la cámara desde aquí" sí.
