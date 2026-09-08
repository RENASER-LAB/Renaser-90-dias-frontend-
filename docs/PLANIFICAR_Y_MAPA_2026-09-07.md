# Planificar por fecha y recorrido libre del Mapa — 2026-09-07

Lo que se tocó en el frontend este día, y —más importante— **lo que se averiguó y no se tocó**.

---

## 1. La pastilla de cada día ahora dice qué fecha es

**Qué cambió.** En el modal de Planificar, cada pastilla mostraba solo la letra del día y su hora
(`M` / `05:00`). Ahora muestra tres renglones: `M` / `09` / `05:00`.

**Por qué.** Sin el número no se sabe a qué martes le está pegando el cambio. El helper ya existía
(`diasDelMesDeLaSemana` en `semanaDelPlan.ts`); lo único que faltaba era pintarlo.

`pastillaDia` subió de `minHeight: 48` a `58`: con 48 los tres renglones se apretaban y el de la
hora quedaba recortado en pantallas compactas.

---

## 2. El día en curso ya no se puede planificar

**El problema.** Se podía tocar el día de hoy, elegir una hora y apretar GUARDAR. La pantalla decía
que guardaba. **El servidor no cambiaba hoy** — cambiaba la semana siguiente.

Es una regla del backend, explícita y vieja:

> `D-91: el dia en curso NO se toca, sin excepciones.`
> `fijar "los lunes" un lunes rige desde el lunes siguiente.`

`PreferenciaHorarioService` arranca a contar en `hoy.plusDays(1)` tanto para el horario general como
para el semanal. Y `PlanScreen` ya la aplicaba desde D-98 (*"lo que se planifica es de mañana en
adelante"*). **Este modal era el único que no.**

**Qué se hizo.** `esPlanificable(dia)` en `semanaDelPlan.ts`, y el modal deshabilita esos días, los
atenúa y les pone un **candado** en lugar de la hora.

**Por qué el helper vive en `semanaDelPlan.ts` y no en la pantalla.** Ya son dos las pantallas que lo
necesitan, y ese archivo avisa en su propio encabezado qué pasa cuando esta cuenta se copia: *"si las
dos copias se separan un día, la pausa se pinta en la casilla equivocada"*.

**Pendiente:** `PlanScreen` conserva su propia copia (`ULTIMO_INDICE_NO_PLANIFICABLE`), idéntica. No
se unificó en el mismo cambio para no cruzarse con el remodelado visual que corre sobre esa pantalla.

---

## 3. La hora de los hábitos obligatorios no se podía editar

**El síntoma.** Tocar un hábito obligatorio no abría el editor de hora. Solo pasaba con los
obligatorios.

**La causa, que no era el guardado sino el toque:**

| Elemento | Medida |
|---|---|
| `candado` | 44×44 |
| `hitSlop` | +10 px por lado → área real 64×64 |
| separación con el chevron (`gap`) | 8 px |

El `hitSlop` crecía **hacia la izquierda**, se comía los 8 px de separación y llegaba a tapar el
chevron `>`. Como en React Native un `Pressable` anidado se queda con el toque, tocar la flecha de
"abrir" disparaba `alternarActivo` → *"Hábito obligatorio, no se puede pausar"*. El editor no abría
nunca.

Los hábitos **no** obligatorios llevan un `Switch` en ese lugar, sin `hitSlop`, y por eso funcionaban.

**Cómo se descartó el guardado antes de tocar nada:** en los logs de producción de las últimas tres
horas no había **un solo** error de horario — ni `horaLimite`, ni cupo, ni `planificar horarios`. La
petición no fallaba: nunca se enviaba.

**El arreglo.** Se quitó el `hitSlop` y el candado pasó a 48×48, que es el mínimo cómodo de
`AGENTS.md` §4 y hace innecesario el hitSlop. Crece 2 px por lado, que caben en el `gap` de 8.

**Sin verificar:** que abra bien en el dispositivo. Es geometría táctil y eso solo se comprueba con
el dedo.

---

## 4. El Mapa del Día 7 se puede recorrer sin llenar nada

**Para qué.** Cada vista calcula su `valido` con las reglas del manual y con eso apaga el botón. Es
correcto para el aprendiz, pero impide **recorrer** el flujo para ver qué pide cada paso.

**Cómo.** Una bandera en `PantallaPaso.tsx`, que es por donde pasan las once vistas:

```ts
const RECORRIDO_LIBRE = __DEV__ || process.env.EXPO_PUBLIC_MAPA_LIBRE === 'on';
```

Mismo criterio que `MAPA_DIA7_HABILITADO` en `HoyScreen`: suelto en desarrollo, y en un build
publicado solo si alguien lo enciende a propósito. **En producción las reglas siguen exigiéndose.**

**Las reglas no se tocaron.** `objetivoValido`, `definicionDeTerminado` y las demás se siguen
calculando y los avisos de calidad se siguen mostrando: se ve lo que falta, pero no frena. `loading`
se sigue respetando siempre — eso no es una regla de negocio, es que hay algo en vuelo.

---

## 5. Lo que se averiguó y hay que tener presente

### El Mapa de Renacimiento NO se guarda en la base

Se revisó el feature entero buscando llamadas a la API. **No tiene endpoint propio.** Todo vive en
`AsyncStorage`, bajo `renaser.mapa-renacimiento.v1.<usuario>`. Lo dice el propio `almacen.ts`:

> *"El manual pide autoguardado local inmediato y sincronización al servidor después. Hoy existe solo
> la mitad local: el backend todavía no tiene las entidades del mapa."*

Lo único que llega al servidor es al activar: un `POST /api/v1/habits` por cada acción, que crea
hábitos personales. Hitos, recordatorios, control semanal y aviso al mentor **esperan al backend del
mapa**.

**Consecuencia práctica:** si el aprendiz borra la app o cambia de teléfono, **pierde el mapa
entero**. Solo sobreviven los hábitos creados.

### Las alarmas SÍ funcionan en Expo Go

`HAY_RECORDATORIOS` apaga los recordatorios en Expo Go con este argumento: *"el push salió de ahí en
el SDK 53"*. Es cierto para push, **pero estas no son push**: la app usa
`scheduleNotificationAsync` con triggers `DAILY` y `WEEKLY`, y no hay ni un `getExpoPushToken`. Los
docs de SDK 57 son explícitos:

> *"Push notifications (remote notifications) … is unavailable in Expo Go on Android from SDK 53. …
> **Local notifications (in-app notifications) remain available in Expo Go.**"*

O sea: se aplicó la restricción correcta al caso equivocado, y eso está escondiendo una función que
funciona. **No se cambió** — es una línea, pero es una decisión de producto y se deja a la vista para
que la tome quien corresponde.

### El tono de la notificación ya es configurable, pero por el sistema

El código omite `sound` en el canal a propósito, y eso deja **el tono de notificación que la persona
tenga en su teléfono**. Además, desde Android 8 el usuario controla el canal desde *Ajustes → Apps →
Renaser → Notificaciones* y el desarrollador no puede sobreescribirlo — sin recompilar nada.

Lo que sí exige build nativo es empaquetar tonos propios para elegirlos *dentro* de la app
(plugin `expo-notifications` con la clave `sounds`). Hay reportes de que el interruptor global de
*Ringtone* de la app viene apagado por defecto y pisa la configuración del canal: verificar en un
teléfono real.

### El build nativo tiene arreglo

Está en [`BUILD_ANDROID_EN_WINDOWS.md`](BUILD_ANDROID_EN_WINDOWS.md), con el error literal, la
medición de los 438 caracteres, lo que **no** lo arregla y los pasos con CMake 3.31.

---

## Verificación

- `npx tsc --noEmit` en **0 errores**.
- **Sin verificar en dispositivo:** la apertura del editor en hábitos obligatorios, el candado de los
  días no planificables y el recorrido libre del Mapa. Los tres son de interfaz y necesitan el dedo.
