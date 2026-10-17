# Hábitos del día anterior al cruzar medianoche

Fecha: 2026-10-17. Estado: corrección implementada en app y backend, con verificación automatizada completa en verde. Pendientes de publicación y comprobación en dispositivo; el recorrido histórico exacto sigue sin identificarse.
Alcance autorizado: documentar, especificar e implementar la corrección con pruebas. Sin despliegue en producción en esta tarea.

> **Corregido 2026-10-17.** Antes solo estaba autorizado documentar y no se había corregido código. El dueño pidió continuar con spec-kit para implementar, leyó la spec y después indicó «sigue nomás». El diagnóstico original se conserva debajo como evidencia del incidente.

## Especificación y corrección

Spec canónica en el backend: [comportamiento](../../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/spec.md), [plan](../../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/plan.md), [tareas](../../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/tasks.md) y [resultados de validación](../../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/validation.md). Registro D-268/E-615.

- El backend agrega `/api/v1/habit-tracks/today/snapshot` con fecha, zona, siguiente medianoche, instante del servidor y los tracks de la misma proyección, aun vacía. `/today` sigue devolviendo su array; no cambia la regla de cierre ni la historia.
- Training invalida al cierre del snapshot y al recuperar foco/actividad. No conserva datos vencidos cuando falla la red, ni los ofrece en el render previo al efecto de foco. Una respuesta vencida o anterior no restaura ayer.
- Cierre y evidencia genéricos verifican el ID original con `/today` antes de escribir. Si ya no está o llega el 409 por día cerrado, se notifica la relectura y se conserva el rechazo, sin reasignar el intento ni anunciar puntos.
- Clase/Pastilla abiertas desde Training conservan el ID elegido antes de enviar. El flujo de foto compartido con avisos/SER conserva foto y respuesta ante el rechazo y notifica el cambio de día. No se tocan las sesiones especiales que legítimamente cruzan medianoche.
- Contra un backend anterior (404 del snapshot), se relee cada 60 s en actividad y al volver, y se valida antes de enviar. Ese modo es recuperación eventual: no inventa una zona ni promete detectar el instante exacto del corte.

Hace falta publicar el backend y una versión nueva de la app/APK para disponer del cierre preciso. La integración HTTP del bug pasó con PostgreSQL/Redis descartables y reloj controlado; el resultado final de las baterías completas se registra en el enlace de validación.

**Verificación de la app integrada con `master`:** 346 suites y 2.874 pruebas de Jest, TypeScript sin errores y exportación web correcta. Los resultados completos del backend y sus límites se conservan en la [validación canónica](../../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/validation.md). No se generó APK ni se comprobó cámara nativa en emulador en esta tarea.

## Regla confirmada por el dueño

El día cierra a las **00:00 de la zona horaria del participante**, en cualquier país. No hay un corte único en hora de Perú para todos.

Al comenzar el nuevo día, la app debe mostrar los hábitos que el servidor devuelve para ese día y esa persona. Los registros del día anterior deben dejar de ofrecerse como completables. Un intento atrasado no debe trasladarse automáticamente al hábito del nuevo día.

## Evidencia de producción

La revisión del 17 de octubre encontró dos respuestas HTTP 409 al completar un hábito del 16:

| Instante UTC | Equivalente en Perú | Operación | Respuesta |
| --- | --- | --- | --- |
| 2026-10-17 05:30:02 | 2026-10-17 00:30:02 | POST /api/v1/habit-tracks/{id}/complete | 409 |
| 2026-10-17 05:30:10 | 2026-10-17 00:30:10 | POST /api/v1/habit-tracks/{id}/complete | 409 |

Mensaje registrado: «Este hábito era del 16 de octubre; ese día ya cerró y no se puede registrar.»

Las horas de Perú sirven solo para leer estos logs. No establecen una zona global ni identifican el país de la persona. Los logs confirman dos intentos rechazados: no prueban que se haya completado un hábito fuera de su día ni muestran qué pantalla los originó.

## Problema a investigar

Posible interfaz o acción pendiente que conserva un registro de ayer después del cambio de día y permite intentar completarlo. El rechazo del servidor protege correctamente el cierre diario; falta comprobar por qué la app envió esos intentos y si mostró los hábitos nuevos.

El código del backend ya valida el cierre según `progreso.timezone()` en `RegistroService.requireDeUnDiaQueNoTermino`, anterior a esta revisión. En el frontend existe una recarga `onDiaCambiado` en el flujo de registro con foto de Training; no asumir que falta todo manejo del cambio de día ni que ese flujo causó el incidente.

No hay evidencia de que estos dos rechazos expliquen el tiempo de espera agotado al abrir Vercel de la captura original.

## Criterios para cerrar el bug

- Con la app abierta al pasar de 23:59 a 00:00, cargar los hábitos del nuevo día según la zona del participante y dejar de ofrecer como completables los de ayer.
- Al volver del segundo plano o de una pestaña suspendida después de medianoche, actualizar el día antes de permitir registrar un hábito antiguo.
- Revisar también formularios, cámara, evidencia pendiente y accesos desde avisos o SER abiertos antes del corte. Las sesiones especiales que legítimamente cruzan medianoche conservan sus reglas.
- Si no hay conexión, evitar registrar hábitos de un día cerrado y explicar que hace falta actualizar; no presentar datos viejos como si fueran los de hoy.
- Ante un 409 por día cerrado, actualizar la lista e informar el cambio de día; no completar automáticamente un registro distinto ni atribuirle puntos.
- Probar al menos dos zonas horarias de países distintos con medianoches diferentes y un dispositivo cuya zona difiera de la configurada para el participante. La referencia debe seguir siendo la del programa que usa el servidor.

## Diagnóstico del 17 de octubre

La revisión posterior encontró un defecto concreto de actualización en Training:

1. `src/features/training/hooks/useTraining.ts:91` carga los datos con un efecto al montar. No tiene un disparador por cambio de fecha, regreso del segundo plano ni foco de la pestaña. `TrainingScreen` tampoco registra esos disparadores para su lista de hábitos. Las pestañas conservan su instancia; volver a Training no garantiza montar de nuevo el hook.
2. Los cierres directos (`registrarSoloHora`, `TrainingScreen.tsx:625`, y `completarHabitoSimple`, línea 691) envían el ID de la tarjeta en memoria sin consultar de nuevo el día. Sus bloques de error muestran el aviso, pero no recargan la lista cuando el registro es de un día cerrado. Por eso otro toque puede repetir el rechazo.
3. El `onDiaCambiado` de la foto es una protección específica del inicio de ese flujo, no una sincronización general de Training. En web se omite la consulta previa a la cámara para conservar el gesto del navegador; el rechazo durante el envío tampoco dispara ese callback.
4. `obtenerTracksDeHoy` solo comparte consultas mientras están en vuelo y libera la promesa al terminar; no se encontró una caché persistente en ese cliente que explique la lista vieja. El problema principal está en cuándo se consulta y en la recuperación tras el rechazo.

Se cotejaron las funciones con el JavaScript servido por la web (`index-949a455d7619f9c7f097c26195712b31.js`, descargado durante esta sesión). La carga al montar y los cierres sin recarga tras el error también están en esa versión publicada; no es solo una observación del checkout local.

### Cronología adicional de producción

Horas de Perú usadas únicamente para presentar los instantes de los logs:

- **16 de octubre, 23:32:22:** último `GET /api/v1/habit-tracks/today` registrado antes de los rechazos.
- **17 de octubre, 00:00:03:** barrido del servidor: 306 registros expirados, 0 fallidos, 20 participantes con pendientes.
- **00:30:00:** consultas a `/home`, `/me/semaforo` y `/funcionalidades/mias`, todas normales. No aparece una consulta nueva a `/habit-tracks/today`.
- **00:30:02 y 00:30:10:** los dos intentos de completar un registro del día 16 reciben 409. Entre ambos no se consulta de nuevo la lista de hábitos. Tampoco aparece esa consulta en el resto de la ventana revisada, hasta las 00:40.

**Conclusión y límite:** el frontend puede conservar y ofrecer registros de ayer después del corte, y repetir el envío porque el rechazo no actualiza la lista. La secuencia observada encaja con ese defecto, mientras que el servidor sí ejecutó la expiración y rechazó los registros atrasados. Los logs HTTP normalizan los IDs y no incluyen usuario ni pantalla: no permiten asegurar que las consultas anteriores correspondan a la misma persona, identificar el hábito exacto o demostrar el recorrido exacto de ese dispositivo. No se atribuyen estos intentos a las personas de la captura sin evidencia adicional.

## Pendiente al terminar el diagnóstico inicial

Reproducir el recorrido exacto y confirmar la zona configurada para el caso. La corrección debe actualizar al cambiar de día y al recuperar foco/actividad, impedir acciones de fechas cerradas y recuperar la lista tras el 409 de día cerrado, respetando la zona del participante. No se implementó ninguna corrección ni se modificó código en esta tarea.

> **Corregido 2026-10-17.** El párrafo anterior describe únicamente la tarea inicial de diagnóstico. La implementación posterior se describe en «Especificación y corrección» y su verificación en la spec. No se afirma haber identificado al dispositivo o a la persona de los logs.
