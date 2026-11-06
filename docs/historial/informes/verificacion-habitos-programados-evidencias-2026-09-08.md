# Verificación de hábitos programados y evidencias

**Fecha de consulta:** 2026-09-08 10:30 aprox. (America/Lima)
**Entorno:** backend local en `http://localhost:8080`, Postgres `renaser-db`, migraciones hasta V40
**Participante:** cuenta local de desarrollo, programa en día 1
**Alcance:** solo lectura. No se modificó código ni se ejecutó ningún endpoint de escritura.

Aunque `GET /api/v1/habit-tracks/today` tiene una red de seguridad que puede generar tracks si
faltan, los 14 tracks del día ya existían antes de esta consulta; la verificación no creó datos
nuevos.

## Resultado

La programación sí está llegando a Training con la hora planificada. En el contrato de tracks, el
campo `horaDisparo` es la hora del plan; `completadoEn` pertenece al registro del hábito y
`subidaEn` pertenece a la evidencia. No son la misma hora.

La prueba real de la base es `JUGO VERDE`:

| Dato | Valor |
|---|---|
| Hora planificada (`horaDisparo`) | `09:00:00` |
| Estado del registro | `COMPLETADO` |
| Hora de evidencia (`subidaEn`) | `2026-09-08T15:25:00.742321Z` |
| Hora de completado (`completadoEn`) | `2026-09-08T15:25:00.872370Z` |
| Hora local de subida/completado | aproximadamente `10:25` en America/Lima |
| Evidencia | `FOTO`, enlazada al registro de JUGO VERDE |

Por lo tanto, si la tarjeta muestra `09:00`, está mostrando el horario programado. La hora cercana
a `10:25`/`10:29` corresponde al momento en que se subió o se selló la evidencia.

## Hábitos personales programados

`GET /api/v1/habit-preferences?date=2026-09-07` respondió `200` y devolvió los horarios guardados
para la fecha consultada. Los hábitos personales encontrados fueron:

| Hábito | Hora que devuelve el endpoint |
|---|---:|
| Caminar 40 minutos | `07:00:00` |
| Genera 10 km | `07:00:00` |
| Mejorar con mi familia | `15:00:00` |

El mismo endpoint para la fecha actual también respondió `200`. Eso confirma que la planificación
se conserva y que la pantalla puede resolver la hora sin depender de un dato escrito solo en la
memoria del teléfono.

## Qué devolvió Training

`GET /api/v1/habit-tracks/today` respondió `200` con 14 registros del día actual:

- 14 registros en total.
- 13 en estado `PENDIENTE`.
- 1 en estado `COMPLETADO`.
- El registro de `JUGO VERDE` incluyó `horaDisparo: "09:00:00"` y `tieneEvidencia: true`.
- Los tres hábitos personales también aparecieron con su hora: `07:00`, `07:00` y `15:00`.

`GET /api/v1/evidence` respondió `200` con una evidencia. La evidencia está vinculada al registro
de JUGO VERDE y no es una evidencia suelta sin relación con un hábito.

El intento de usar `GET /api/v1/evidence?tipoDestino=HABITO` respondió `400` porque `HABITO` no es
un valor válido del enum de ese filtro. Para esta revisión se usó correctamente el endpoint sin ese
filtro, que devolvió la evidencia de hábito existente.

## Por qué ayer no aparece una tarjeta de evidencia

La base no tiene registros de hábitos para `2026-09-07`. Solo existen registros para `2026-09-08`.
Esto coincide con el estado del programa:

- `fecha_inicio`: `2026-09-08`.
- `dia_programa`: `1`.
- `programa_activado_en`: `2026-09-07T16:38:13Z`.

El endpoint de Training consultado es `habit-tracks/today`; no es un endpoint histórico de ayer. El
endpoint de preferencias sí acepta `?date=2026-09-07` para consultar un horario, pero eso no crea un
registro de ejecución ni una ventana para subir evidencia de una fecha pasada.

Con estos datos, que ayer no aparezca una evidencia es correcto: el programa todavía no tenía un
track de ejecución para ayer. Desde el día de inicio, los hábitos programados aparecen en Training
con `horaDisparo` y cada evidencia queda enlazada al registro del día.

## Aclaración: lo configurado ayer sí debe regir hoy

La expectativa funcional es correcta: una hora o una pausa guardada ayer debe resolverse para el
día actual. La comprobación lo confirma en el backend. Por ejemplo, `AGUA TIBIA CON LIMÓN` tiene
una hora personalizada de `07:00:00` para el día actual, y los hábitos personales siguen llegando
con `07:00:00`, `07:00:00` y `15:00:00`. Los cambios de horario hechos después de que empezó la
ventana del día se difieren al siguiente día; la API lo informa en `pendingChange` con su
`effectiveDate`.

También se comprobó una diferencia entre el dato y la lista visual. `DÍA SIN CELULAR` y
`PRIMERA COMIDA (ROMPO EL AYUNO)` están pausados en `habit-unlocks` y, correctamente, no tienen
track en `habit-tracks/today`. Sin embargo, el hook de Training todavía arma la lista desde el
catálogo/plan y no elimina los hábitos pausados que no tienen track; por eso pueden aparecer como
tarjetas sin registro y con el botón deshabilitado. Esas tarjetas son un remanente visual, no una
actividad vigente ni una ventana válida para subir evidencia.

Los hábitos bloqueados por día de programa sí se filtran en el hook (`locked`). La misma revisión
debe extenderse a las pausas y a los días semanales apagados para que Training muestre únicamente
lo que realmente corresponde al día.

## Conclusión

La persistencia y resolución del backend funcionan correctamente para el día activo:

1. La hora programada se guarda y se devuelve por API.
2. El track diario se genera con esa hora.
3. La tarjeta puede ofrecer la subida de evidencia.
4. La evidencia queda relacionada con el track y se puede distinguir de la hora planificada.

La lista visual de Training queda parcialmente desalineada cuando un hábito fue pausado o apagado
para un día: puede mostrar una tarjeta sin track, aunque no la deja marcar ni subir evidencia. Para
cumplir exactamente la expectativa del plan diario, Training debería ocultar esas tarjetas y dejar
solo los hábitos activos de la fecha.

Lo que no existe actualmente es una consulta de Training para cargar tracks históricos de ayer y
subir evidencia retroactiva. Eso sería una capacidad nueva del backend; no se cambió en esta revisión.
