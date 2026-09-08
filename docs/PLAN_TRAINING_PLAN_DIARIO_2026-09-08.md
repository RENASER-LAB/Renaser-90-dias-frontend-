# Plan de Training basado en el plan diario real

**Fecha:** 2026-09-08
**Rama:** `planificar-por-bloque-en-training`
**Estado:** plan técnico; no se modifica código en esta fase.

## Objetivo

Training debe mostrar únicamente lo que corresponde hacer en la fecha actual. La pantalla tiene
que respetar la configuración guardada el día anterior: horas personalizadas, pausas, hábitos
apagados por día de la semana y hábitos todavía bloqueados por el avance del programa.

La regla visual queda así:

> Si el backend devuelve un track para hoy, el hábito aparece y puede recibir evidencia. Si no
> devuelve un track para hoy, no aparece como una tarjeta activa.

## Fuente de verdad

| Necesidad | Fuente | Regla |
|---|---|---|
| Qué se hace hoy | `GET /api/v1/habit-tracks/today` | Lista canónica de tarjetas activas del día |
| Hora que se muestra | `horaDisparo` del track | Es la hora resuelta para esa fecha |
| Estado y evidencia | `estado` y `tieneEvidencia` del track | No se calcula en el móvil |
| Nombre, categoría e icono | `GET /api/v1/habits` | Se cruza por `habitoId` |
| Inventario para Planificar | `usePlanHabitos()` | Incluye hábitos que se pueden reactivar o editar |
| Pausa personal | `GET /api/v1/habit-unlocks` | Se usa en Planificar y para explicar el estado |
| Hora por día de semana | `GET /api/v1/habit-preferences/{id}/weekdays` | Se usa en el editor, no para inventar tarjetas de hoy |

`habit-tracks/today` ya resuelve en backend la zona horaria, la fecha, la pausa y el horario
vigente. No se debe reconstruir esa regla en Training.

## Aislamiento por usuario

La planificación es individual. Las tablas y relaciones que guardan decisiones del aprendiz llevan
`participante_id` junto con el hábito y la fecha o el día de semana:

- `preferencias_horario`: horario general del participante;
- `horario_semanal_habito`: horario y estado por día de semana;
- `horarios_habito_por_fecha`: excepción de una fecha concreta;
- `desbloqueos_habito`: elección, pausa y día de desbloqueo;
- `registros_habito` y `evidencias`: ejecución y prueba del propio participante.

Los controllers reciben el usuario desde `@ActorAutenticado`; el cliente no manda un `participantId`
para elegir a quién modificar. Por eso el refactor de Training solo combinará respuestas del usuario
autenticado y no escribirá en el catálogo compartido.

La única capa compartida es el catálogo de hábitos del sistema y sus horarios por defecto. Una
operación administrativa sobre ese catálogo sí puede afectar a varios participantes; la pantalla
normal de Planificar no usa esas operaciones administrativas. Los hábitos `PERSONAL` llevan además
su propio `participante_id`, por lo que solo pertenecen a quien los creó.

## Cambio de arquitectura en frontend

### 1. Separar la lista activa del inventario de planificación

En `src/features/training/hooks/useTraining.ts` se deben mantener dos resultados:

- `habits`: solo hábitos con track de hoy, destinados a las tarjetas y contadores de Training.
- `planHabits`: catálogo desbloqueado con sus horarios, días y estado de pausa, destinado a
  `PlanificarDimensionModal`.

Actualmente `habits` se construye recorriendo `plan.habits` y crea filas `sin-track-*`. Ese fallback
es el que produce las tarjetas fantasma de hábitos pausados. Debe eliminarse de la lista visible.

### 2. Unir cada track con sus metadatos

El mapeo debe recorrer los tracks recibidos y buscar el hábito de catálogo por `habitoId`.

Cada `HabitItem` visible debe recibir:

- `id` del registro diario, para completar o subir evidencia.
- `habitoId` del catálogo, para abrir Planificar.
- `time` desde `track.horaDisparo`, no desde una hora general reconstruida en el móvil.
- `done` desde `track.estado`.
- `hasEvidence` desde `track.tieneEvidencia`.
- título, categoría, icono y exigencia de evidencia desde el catálogo.

Si `horaDisparo` es `null`, la tarjeta debe decir `Durante el día` o `Sin horario definido`, nunca
dejar un espacio ambiguo.

### 3. Ocultar hábitos pausados o apagados para hoy

No se debe pintar una tarjeta de Training cuando no exista track para la fecha actual. Eso cubre:

- pausas personales indefinidas o con fecha de término;
- días de la semana apagados;
- hábitos todavía bloqueados por `unlockDay`;
- hábitos fuera del calendario del catálogo;
- hábitos cuya generación diaria todavía no corresponde.

El botón `SUBIR` solo existe para un track real. No se debe mostrar un botón deshabilitado en una
tarjeta que representa una actividad que no corresponde hoy.

Si se quiere informar que existen hábitos pausados, debe ser un resumen secundario —por ejemplo,
“2 hábitos pausados · Administrar en Planificar”— y no una tarjeta de actividad.

### 4. Mantener Planificar completo

La hoja de Planificar no debe depender de la lista activa de Training. Debe recibir `planHabits` para
permitir reactivar un hábito pausado o preparar el día siguiente aunque hoy no tenga track.

Al guardar una hora, se conserva la regla del backend: el día actual no se improvisa. Si el servidor
responde un cambio diferido, la interfaz debe conservar la hora vigente de hoy y mostrar el nuevo
horario junto con su `effectiveDate`.

## Ajustes visuales

- El contador de cada dimensión cuenta solo `habits` activos del día.
- El encabezado `HÁBITOS & EVIDENCIAS (N)` usa la misma lista activa.
- Se elimina el estado visual “Aún sin registro de hoy” de las tarjetas de actividad.
- `SUBIR` y `VER` permanecen disponibles únicamente cuando existe `track.id`.
- La hora planificada se muestra con tamaño legible y contraste del tema; no usar tipografías finas.
- Las tarjetas conservan `width: '100%'`, `flexShrink: 1` y `flexWrap: 'wrap'` para Xiaomi y
  tablets.
- El `ScrollView` sigue siendo único y fluido; no se agrega scroll interno.

## Navegación y gestos

Se conserva `useSystemBackHandler` en `TrainingScreen`:

1. cerrar evidencia o modal abierto;
2. cerrar Planificar;
3. volver del detalle de dimensión al menú de Training;
4. permitir el comportamiento del sistema solo desde la raíz de Training.

No se debe cambiar la navegación de los tabs principales.

## Validación antes de cerrar

### Datos

- hábito personalizado cambiado ayer aparece hoy con el `horaDisparo` correcto;
- hábito pausado no aparece como actividad ni permite evidencia;
- hábito apagado solo para un día no aparece ese día y vuelve cuando corresponde;
- cambio hecho después de iniciar la ventana muestra la hora vigente hoy y el cambio pendiente para
  mañana;
- evidencia existente pinta `VER` y no crea un registro duplicado.

### Código y UX

- agregar o ajustar tipos bajo `src/features/training/types/` si el contrato lo requiere;
- mantener la lógica de datos en hooks y APIs, no dentro de la tarjeta visual;
- leer la documentación exacta de Expo SDK 57 antes de escribir código;
- ejecutar `npx tsc --noEmit` sin errores;
- ejecutar una exportación web o el chequeo equivalente del proyecto;
- revisar manualmente Android/Xiaomi, iOS y tablet, incluyendo el gesto lateral;
- revisar que no se hayan alterado `Hoy`, `Plan`, `Comunidad` ni `Yo`.

## Orden de implementación

1. Agregar pruebas del mapeo activo: track presente, track ausente por pausa y hora resuelta por
   fecha.
2. Refactorizar `useTraining` para separar `habits` activos de `planHabits`.
3. Pasar `planHabits` a `PlanificarDimensionModal` y conservar su flujo de reactivación/edición.
4. Ajustar contadores, estados vacíos y tarjetas de Training.
5. Probar con la sesión local y comparar pantalla, endpoint y BD.
6. Ejecutar TypeScript, exportación y revisión táctil.

## Criterio de terminado

La pantalla de Training representa exactamente el plan ejecutable de hoy: una tarjeta equivale a un
track real, su hora viene del track, la evidencia se enlaza a ese track y ningún hábito pausado,
apagado o todavía bloqueado queda visible como actividad disponible.
