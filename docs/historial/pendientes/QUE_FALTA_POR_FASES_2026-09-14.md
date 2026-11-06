# Qué falta, ordenado por fases

Comparado contra los dos documentos del cliente —**`Codigo Renaser exclusivo.pdf`** y
**`RENASER, PROGRAMA Y FASES.docx`**— y contra el código de `master` de hoy (frontend `3d9a3e2`).

Lo que digo acá lo verifiqué en el código, no de memoria. Lo que no pude comprobar está marcado.

---

## 1. ~~Los días están bien. Los nombres, no.~~ — HECHO el 2026-09-14

> **Cerrado** en la rama `fases/vocabulario-del-cliente` (sólo frontend). Se deja lo que decía,
> porque explica por qué el cambio fue barato.

Los cortes por día del código **coincidían exactamente** con el documento, así que renombrar fue
cambiar texto, no lógica:

| Fase | Días (código y documento) | Nombre que había | Nombre ahora |
|---|---|---|---|
| 1 | 1–7 ✅ | Renaser | **El Espejo** |
| 2 | 8–34 ✅ | Desarrollo | **El Ciclo Alquímico** |
| 3 | 35–64 ✅ | Guerrero Alquimista | **El Maestro Interno** |
| 4 | 65–90 ✅ | Ascensión | **Sistema de Alto Rendimiento** |

Las tres incongruencias de nombre, y qué se hizo con cada una:

1. `useResumenHome.ts` → renombrado, y convertido en la **única definición de fase de la app**
   (exporta `FASES_EN_ORDEN`).
2. `YoScreen.tsx` describía **tres** fases con otros nombres → se le quitó la lista propia; ahora
   deriva nombre, número y rango de `FASES_EN_ORDEN` y sólo guarda lo editorial. **No pueden volver
   a divergir**: falta una fase y no compila.
3. `YoScreen.tsx:81`, *"Completar la Fase 1: días 1 al 30"* → *"los días 1 al 7"*.

De paso se borró `currentPhase: 1 | 2 | 3` de `types/schema.types.ts` (un cuarto vocabulario, con
tres fases, sin un solo consumidor).

**Las claves del enum quedaron intactas**, así que ninguna llamada al backend cambió. Era el riesgo
real: el backend manda la clave (`PHASE_1_REBIRTH`) y el frontend la traduce con un diccionario a
mano; si la clave cambiaba acá, la tarjeta de fase **dejaba de dibujarse en silencio**.

Test nuevo: `features/home/hooks/__tests__/fasesDelPrograma.test.ts`, verificado que **falla contra
el código viejo**. Incluye una prueba de que los cuatro rangos cubren los 90 días sin huecos ni
solapes — es la que atrapa un *"días 1 al 30"* antes de que llegue a la pantalla.

---

## 2. El hueco más grande: la Fase 2 no existe como fase (27 días, del 8 al 34)

Los ciclos de **Intoxicación Consciente / Desintoxicación Absoluta** son el corazón de la Fase 2
y **no hay una sola línea de eso en el frontend** (busqué "intoxicación": cero resultados). En el
backend, `TipoDia` sólo produce dos de sus cuatro valores y su propio javadoc dice que
`INTOXICACION` *"no está implementado en esta versión"*.

**La regla ya está definida en el documento — no hay que inventar nada.** Son 3 días de caos + 6
de disciplina, tres veces:

| Días | Qué es |
|---|---|
| 8–10 | Intoxicación Consciente I |
| 11–16 | Desintoxicación Absoluta |
| 17–19 | Intoxicación Consciente II |
| 20–25 | Desintoxicación Absoluta |
| 26–28 | Intoxicación Consciente III |
| 29–34 | Desintoxicación Absoluta |

Se deriva del día de programa con una cuenta, igual que la fase. Lo que falta construir encima:

- **Checklist dual** con interruptor entre "Observación del Caos" y "Disciplina Absoluta".
- **Checklist "Radiografía de la Víctima"** (5 preguntas: ¿me permití vivir sin estructura? ¿de
  qué me quejé? ¿a quién culpé? ¿qué esperé en vez de actuar? ¿qué evité?).
- **"Modo Caos"**: el documento pide que la app se ponga oscura esos días y **no exija tareas
  productivas**, sólo sinceridad.

> Dato útil: la columna `obligatorio_en_intoxicacion` **ya existe en la base** y nadie la lee. Está
> esperando justamente esto.

---

## 3. El PDF: el ritual está como casilla, no como práctica

Hoy el Ritual Tierra-Agua-Fuego es **un hábito que se marca** (`RITUAL TIERRA - AGUA - FUEGO
(mediodía)`). El PDF no describe una casilla: describe un protocolo con números exactos.

Lo que el PDF especifica y la app no tiene:

| Qué | Detalle del PDF |
|---|---|
| **Los 3 momentos** | 7 minutos al despertar, a mediodía y antes de dormir. **No negociables los 90 días** |
| **Fijar los horarios** | La persona elige y **escribe** su hora permanente de despertar y de dormir, y el momento de mediodía **entre 11/11 · 12/12 · 13/13 · 14/14 · 15/15** |
| **Tierra** | Aceptar lo que acontece sin juzgar. Sentir la respiración y dejarla ser |
| **Agua** | Espalda recta. Inhalar profundo, retener **3 s o más**, soltar por boca y nariz. **21 repeticiones.** En la tercera, tensar todo el cuerpo al inhalar y relajar al soltar |
| **Fuego** | **60 s** de meditación previa. Inhalar por nariz con intensidad, retener **7 s**, soltar. **21 repeticiones**, subiendo la intensidad |
| **Cierre** | Código gratitud: inhalar profundo y sentir el gracias al exhalar. **9 veces** |
| **Frecuencia** | Las tres partes, **3 veces al día, sin fallar** |

Eso es una pantalla guiada con temporizador y contador. Hoy no hay temporizador, ni contador, ni
guía: hay una casilla.

---

## 4. Cuidado con el nombre "Código Renaser": hoy significa otra cosa en la app

Esto no es un bug, es una colisión de nombres que conviene resolver **antes** de construir el
punto 3.

| | Qué es |
|---|---|
| **En la app hoy** | El registro horario de 4 preguntas (qué hago / pienso / siento / evito). 12 franjas de 08:00 a 19:00, **días 1 al 7 y se apaga** |
| **En el PDF** | Los 3 momentos de 7 min + el ritual Tierra-Agua-Fuego, **los 90 días** |

Los días 1–7 del registro horario **son correctos**: el documento lo pide como acción de la
Semana 1 ("alarma cada 60 min, bitácora de 1 minuto"). El problema es sólo que dos cosas distintas
se llaman igual, y la persona vería "Código Renaser" significando una cosa en el día 3 y otra en
el día 40.

**Lo que sí falta del PDF y no existe en ninguna parte** es su primer ejercicio completo:

1. **"Planifica tu vida"** — escribir todo lo que pasa en un día normal, hora por hora (y si se
   puede, cada 5 minutos).
2. **Las tres preguntas de necesidad** por cada actividad, pensamiento o emoción: ¿es necesario que
   esto esté en mi vida? ¿qué pasaría si dejara de hacerlo? ¿mejoraría mi calidad humana?
3. **Tabla de distractores en tres pilares** (actividades/conductas · pensamientos · emociones)
   **puntuados de 0 a 10** por impacto.
4. **Recodificación** de cada uno desde el "yo creador" (el PDF da un ejemplo largo y avisa que
   toma ~3 horas, a solas).

Lo más parecido que existe es `ReemplazosScreen` del Mapa de Renacimiento: patrón → disparador →
conducta actual → respuesta alternativa. Va en la dirección correcta, pero se queda en **3
patrones de un catálogo cerrado**, sin los tres pilares y sin puntuación de impacto.

---

## 5. Lo que el documento dice que se abre en cada día

Ésta es la parte de "por fases podemos aperturar". La columna de la derecha es lo que hay hoy.

| Día | Se abre (según el documento) | Hoy |
|---|---|---|
| **1** | Registro horario, audioterapia diaria obligatoria, post diario, 1 día sin celular | Registro horario **sí**. Audioterapia existe como hábito y contenido. **El día sin celular no tiene pantalla en el frontend** (el Santuario vive en el backend) |
| **8** | Modo Caos + checklist dual | **No existe** (punto 2) |
| **17 / 26** | Segunda y tercera Intoxicación | **No existe** |
| **35** | Fase 3 + Domingo como día sagrado + *"cambio de UI/UX hacia una experiencia más fluida"* | Los hábitos de domingo existen. **El Checklist Dominical de Descanso y el cambio de UI, no** |
| **36–42** | Mantras de poder diarios, ritual de baile, cambiar el decreto "No miedo" por "Gracias vida por este nuevo día" | **Nada.** Busqué mantra/decreto/baile: cero resultados |
| **43–49** | Tracker de 30 min sin celular antes de dormir | **No existe** |
| **65** | Se desbloquea el módulo **"3 Misiones del Día"** + foto de la agenda planificada antes de dormir | `objetivos` ya tiene rocas diarias/semanales y prioridad principal — pero **no está atado al día 65** ni pide la foto |
| **72** | **Modo Enfoque / Pomodoro de 90 min** nativo + alerta de pausa de 10–20 min | **No existe** |
| **79** | Trackear energía (mañana alta · tarde operativa · noche evaluación) | **No existe** |
| **86–90** | Pregunta maestra, firma del "Compromiso del Estratega Renaser" y **graduación** | La firma de fase existe (`phasecontracts`). **La graduación nunca se marca**: hay tres campos en la base sin un solo escritor |

---

## 6. Lo que falta y NO es código — lo tiene que entregar el cliente

El propio documento los marca como **"VACÍO A COMPLETAR"**. Sin esto no se puede construir la
pantalla que los muestra:

- Los **7 títulos de audio** de la Fase 1, y los títulos de clase de los días 2–6 y 12–16.
- Los **títulos diarios de los días 36 al 64** (toda la Fase 3).
- Dos checklists que el documento propone pero no cierra: **Protocolo de Rescate Emocional** y
  **SOS Renaser** (botón de pánico).
- El **Radar Emocional / botiquín SOS**: cinco estados (ansiedad, victimismo, procrastinación,
  cansancio, culpa) cada uno con su audio, su protocolo y sus dos mensajes. El backend tiene
  `EvaluarRiesgoMensajePort` **sin un solo llamador**, y su javadoc avisa que el mapeo necesita
  **criterio clínico confirmado** — no se resuelve programando.

---

## 7. Si hay que arrancar por algo: lo más barato con más efecto

1. ~~**Renombrar las fases y corregir "días 1 al 30" → 7.**~~ ✅ **Hecho el 2026-09-14** — ver §1.
   `YoScreen` ya no puede contradecir a Plan: las dos leen de la misma lista.
2. **Encender el Mapa de Renacimiento** (`EXPO_PUBLIC_MAPA_DIA7=on`). Son 11 pantallas terminadas
   y guardando contra el servidor que hoy **nadie puede ver** porque la variable no está en
   `.env` ni en `eas.json`.
3. **`STORAGE_PROVEEDOR=s3`.** Hoy, en `noop`, **no se sube ni una foto** — y casi todas las
   evidencias que pide el documento son fotos (el jugo, el cuaderno, la agenda planificada).
4. **Los ciclos de Intoxicación.** Es el más grande, pero la regla ya está escrita en el documento
   (3+6 desde el día 8), se deriva del día como la fase, y desbloquea 27 días de programa que hoy
   son indistinguibles de la Fase 1.

---

## 8. Lo único que no se puede saber desde acá

**En qué día de programa está la cohorte real.** Todo calendario que se arme se apoya en datos de
la base local. Si allá la cohorte arrancó otra fecha, el orden de los puntos 5 y 7 cambia. Es una
sola pregunta y hay que hacerla antes de planificar.
