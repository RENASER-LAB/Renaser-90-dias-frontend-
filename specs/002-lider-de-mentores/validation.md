# Validación y criterios de aceptación

Estado: **plan de pruebas. No ejecutado — esta entrega es documental.** Al implementar se registra
el nombre real del test, el comando y el resultado observado.

| Caso | RL | Prueba esperada |
|---|---|---|
| VL-01 | RL-01, RL-03 | Un `MENTOR_LEAD` activa su programa, recorre Hoy, Plan, Training, Comunidad, Yo y Mapa, registra un hábito y sube evidencia propia. Decide no activarlo y conserva cuenta y gestión; lo activa después sin perder nada. |
| VL-02 | RL-01 | **Comprobación endpoint por endpoint** de los guards que dicen «solo un aprendiz» (rocas, Espíritu, Código Renaser, audioterapia, clase diaria). Si alguno rechaza al líder, queda como hallazgo reportado, no como permiso ensanchado. |
| VL-03 | RL-02 | Líder sin programa personal entra a la gestión sin quedar encerrado en el onboarding. Un aprendiz sigue obligado al suyo. Mismo gate que el SDD 001, no una copia. |
| VL-04 | RL-04, RL-05 | Padrón con mentor sin célula, sin aprendices, recién incorporado y dado de baja: cada uno con su estado, ninguno con cero ni verde por defecto. Orden estable entre páginas; ningún elemento repetido ni perdido al paginar. |
| VL-05 | RL-06, RL-12 | La ficha muestra carga, atención y cumplimiento como bloques con estado propio, con período, zona y corte. `SIN_MUESTRA`, `SIN_HISTORIAL` y `COBERTURA_PARCIAL` se distinguen entre sí en pantalla. |
| VL-06 | RL-07, RL-22 | Manipular `mentorId` o el período **no** devuelve el nombre, los hábitos, la evidencia ni un mensaje de ningún aprendiz. Lo compartible del reporte tampoco. |
| VL-07 | RL-08, RL-21 | Mentor inexistente devuelve el error de la convención, no una lista vacía. Con la fuente de tickets caída, el resto de la ficha se entrega y esa parte se marca `SOURCE_UNAVAILABLE`. |
| VL-08 | RL-09, RL-10 | **Test de regresión que falla contra el código de hoy**: A responde un ticket, se cambia `participantes_programa.mentor_id` a B, y la atención sigue siendo de A. |
| VL-09 | RL-09 | Mediana con `n` a la vista: doce respuestas rápidas y una olvidada tres semanas no producen la misma cifra que un promedio. Sin tickets, `NO_SAMPLE`, nunca 0 h. |
| VL-10 | RL-11 | Con el SDD 001 ausente, el cumplimiento responde `SOURCE_UNAVAILABLE` con motivo. **Se busca en todo el repo que no exista una segunda implementación de la fórmula**, ni en backend ni en la app. |
| VL-11 | RL-13 | Un período anterior a la primera fecha verificable sale como no disponible y **no** se reconstruye desde el puntero actual, ni siquiera cuando el puntero coincide. |
| VL-12 | RL-14, RL-17 | «Escribirle» abre el directo canónico existente. Cancelar no envía nada. Enviar produce **solo** el mensaje que el líder confirmó, y llega al chat que el mentor ya usa. |
| VL-13 | RL-15, RL-18 | Observación sin tipo, con texto vacío o excedido, o sobre alguien que no es mentor: rechazadas. Una observación no se edita ni se borra; se corrige con otra y las dos quedan. |
| VL-14 | RL-16 | Con el chat caído, la observación se guarda igual, la pantalla lo dice, y el texto escrito no se pierde. Repetir el envío no duplica ni la fila ni el mensaje. |
| VL-15 | RL-19, RL-20 | Todo valor del reporte lleva denominador, período, zona y corte. Ningún porcentaje aparece solo. Mes corto y zona distinta de la del servidor, cubiertos. |
| VL-16 | RL-23 | Con Ana 12/12 y Marta sin muestra, Marta se nombra en «no incluidos» y **no** aparece última con 0 %. El orden usa el valor sin redondear; el redondeo solo se ve en pantalla. |
| VL-17 | RL-24, RL-26 | Un `MENTOR` y un `TRAINEE` con sesión válida reciben 403 en padrón, ficha, observaciones y reporte. Una cuenta suspendida también. La app no es lo que decide. |
| VL-18 | RL-25 | **El caso crítico**: con la fila de permisos aplicada y el cumplimiento activo, el líder sigue llegando a todo lo que usaba —hábitos, rocas, evidencia propia, contratos de fase, chat, muro, academia, ranking, notificaciones, tickets de soporte y `/home`. Ni un 403 nuevo. |
| VL-19 | RL-27 | El líder mueve el semáforo (si PL-02 se aprueba) y **no** puede promover de nivel, invitar, cambiar roles, administrar células ni aprobar altas. Cada intento, 403. |
| VL-20 | RL-28 | Se llega a Mentores desde Hoy y desde Comunidad, y es el mismo destino. Cinco pestañas intactas. Con una cuenta `MENTOR` se ve la tarjeta del 001 y **no** esta; con `MENTOR_LEAD`, al revés. |
| VL-21 | RL-29 | 320 / 360 / 390 / 440 / 768 px, Android alto y Xiaomi, iOS, fuente del sistema ampliada: sin recortes, sin doble scroll, sin desbordes. El gesto lateral cierra el modal y vuelve de la ficha, y **nunca** cierra la app desde una subpantalla. |
| VL-22 | RL-30 | En escala de grises, cada estado sigue siendo legible por su palabra. Cuerpo a 16 px, controles medidos ≥48 px. Ningún texto esencial en microtexto. |
| VL-23 | RNL-03 | Con un cuerpo de cien mentores, padrón y reporte responden paginados y **sin N+1**: se cuentan las consultas, no se estima. |
| VL-24 | RNL-02 | `ArchitectureTest` y `EndpointAuthorizationDeclarationTest` en verde. El módulo `leadership` no importa `domain` ni `application` de ningún otro módulo, y no manda SQL nativo contra una tabla ajena. |

## Comprobaciones de implementación

- **Backend**: `JAVA_HOME` en el JDK 25 real. `./scripts/test-cloud.sh` / `./mvnw clean verify` con
  Testcontainers Cloud, **avisando y esperando a que el dueño apague la aplicación** antes de
  correrlo. La verificación es la línea `Tests run:` de surefire **y** la de failsafe — un `exit 0`
  sin pruebas no cuenta (E-111). Dos builds no comparten `target/`.
- **Migraciones**: V45 en adelante, aplicadas contra Postgres real por las clases `*IT.java`.
  Ninguna migración ya aplicada se edita.
- **Frontend**: `npx tsc --noEmit` en cero, y `expo export` si se tocan rutas o render web. Los
  errores preexistentes se registran aparte, no se ocultan.
- **Dispositivo**: recorrido completo con una cuenta `MENTOR_LEAD` real y varios `MENTOR`.
  **Ningún mensaje real se envía a un mentor durante las pruebas**; se usa una cuenta de prueba
  como destinatario.
- Toda incidencia va a `docs/BITACORA_ERRORES.md` con el mensaje **literal**, la causa real y cómo
  evitar que vuelva; si la prevención se puede volver ejecutable —un test, una regla de
  `ArchitectureTest`, una entrada en `.claude/rules/`— se hace en ese mismo cambio.

## Comprobación documental de esta entrega

Verificar que existan los diez archivos, que los enlaces relativos resuelvan, que `RL-01` a
`RL-30` aparezcan en especificación, tareas y matriz, y que en Git solo haya documentos nuevos.
No se ejecutan suites de aplicación para una entrega exclusivamente Markdown.

**Resultado documental:** diez archivos canónicos más una referencia en el backend. `RL-01`..`RL-30`
presentes en los tres documentos. 39 tareas, ninguna marcada como implementada. Cero cambios en
código de aplicación, cero migraciones creadas, cero commits. Los archivos sin versionar del SDD
001 (`specs/001-mentoria-acompanamiento/`, `docs/mockups/`) se dejaron intactos.
