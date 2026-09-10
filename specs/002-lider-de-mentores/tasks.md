# Tareas de ejecución

Todas pendientes. Una a la vez. Para reglas de dominio y adaptadores, **la prueba se escribe
primero y tiene que fallar contra el código viejo** — si pasa con y sin el arreglo, no es un test
de regresión, es decoración. Cada fila apunta a 15–30 minutos; si al abrirla resulta mayor, se
parte en hijas con el mismo `RL` y los mismos criterios antes de escribir código. Las pruebas en
Cloud o en dispositivo tardan más por infraestructura: eso no las da por hechas.

## Bloque 0 · Punto de partida

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-01 | Revalidar HEAD, reglas y estado de ambos repos; comprobar qué del SDD 001 ya aterrizó | — | RL-11, RL-13 | Inventario actualizado; cambios locales y `specs/`+`docs/mockups` sin versionar, preservados. Lo que el 001 ya haya hecho, recortado de este plan. |
| [ ] TL-02 | Leer la matriz de los 5 roles de `docs/spec/Especificacion_Requisitos_Renaser_OS.docx` y cerrar PL-01 y PL-02 con el dueño | TL-01 | RL-24, RL-27 | Contraste con la matriz documentado. Decisión escrita sobre el cierre de A-1 y sobre el semáforo. Sin respuesta, se continúa por lo independiente y no se marcan como aprobadas. |
| [ ] TL-03 | **Comprobar con una cuenta real si `MENTOR_LEAD` puede operar el programa** (rocas, Espíritu, hábitos, evidencia propia) | TL-01 | RL-01 | Resultado documentado endpoint por endpoint. Si algún guard exige `TRAINEE` literal, se reporta como hallazgo — **no se ensancha un permiso a mano**. |

## Bloque 1 · Autorización (va primero: todo lo demás cuelga de aquí)

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-04 | Declarar los 4 permisos nuevos en `Permission` con javadoc que cite su guard | TL-02 | RL-24 | `VIEW_MENTOR_CORPS`, `FOLLOW_UP_MENTOR`, `VIEW_MENTOR_REPORT`, `SET_MENTOR_OPERATIONAL_STATUS` declarados. `ArchitectureTest` verde. |
| [ ] TL-05 | Derivar la fila `PERMISOS_MENTOR_LEAD` del inventario de endpoints, no de memoria | TL-04 | RL-25 | Lista completa, con el endpoint que justifica cada permiso. Ningún permiso de ADMIN dentro. |
| [ ] TL-06 | Pruebas positivas y negativas de la matriz | TL-05 | RL-25, RL-26 | Rojas antes del cambio: líder llega a lo suyo; MENTOR y TRAINEE reciben 403 en la gestión; cuenta suspendida también. |
| [ ] TL-07 | Aplicar la fila y el **modo sombra** del interceptor | TL-06 | RL-24, RL-25 | El interceptor evalúa a `MENTOR_LEAD` y **registra** lo que denegaría, sin denegar. Log sin datos privados. Reversible. |
| [ ] TL-08 | Separar `MANAGE_MENTOR_PROFILE` en nivel y semáforo | TL-04 | RL-27 | Nivel sigue siendo de ADMIN/ALCHEMIST. Prueba de que el líder no puede promover. Solo si PL-02 se aprueba. |

## Bloque 2 · Módulo `leadership`: padrón y ficha

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-09 | Crear el módulo con su `package-info` y las fronteras Modulith | TL-04 | RNL-02 | `ArchitectureTest` verde; el módulo importa solo `api/` ajenas. |
| [ ] TL-10 | Añadir `contarAprendicesDeMentor` a `users.api` y `celulaDeMentor` a `community.api` | TL-09 | RL-04, RL-06 | Puertos aditivos, con prueba de adaptador contra Postgres real. Ningún SQL nativo sobre tabla ajena. |
| [ ] TL-11 | Pruebas del padrón: sin célula, sin aprendices, mentor recién creado, mentor de baja | TL-10 | RL-04, RL-05, RL-08 | Rojas. Cubren orden estable, paginación y que un dato ausente **no** sea cero ni verde. |
| [ ] TL-12 | Implementar padrón y ficha, con `dataCoverage` por bloque | TL-11 | RL-04, RL-05, RL-06, RL-21 | Verdes. Una fuente caída no vacía la respuesta. Sin N+1. |
| [ ] TL-13 | Comprobar que la ficha **no** filtra datos de aprendices | TL-12 | RL-07, RL-22 | Prueba explícita: manipular `mentorId` no devuelve nombre, evidencia ni mensaje de ningún aprendiz. |

## Bloque 3 · Atención de tickets, atribuida de verdad

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-14 | Prueba de que hoy la atribución se pierde tras una rotación | TL-01 | RL-10, RL-13 | Roja contra el código actual: un ticket respondido por A se atribuye a B al cambiar `mentor_id`. |
| [ ] TL-15 | Migración aditiva `tickets_mentor.respondido_por` + campo de dominio + evento | TL-14 | RL-10 | Primera versión libre (V45), con cabecera que justifica la columna. `NULL` = no disponible. Prueba de integración contra Postgres real. |
| [ ] TL-16 | `support.api.TicketMentorFinder` con agregados por lotes | TL-15 | RL-09 | Abiertos, respondidos, el más antiguo, mediana con `n`. Sin N+1. Prueba de adaptador. |
| [ ] TL-17 | Integrar la atención en padrón y ficha con etiqueta de atribución | TL-12, TL-16 | RL-09, RL-12, RL-13 | Períodos anteriores a la columna nueva salen etiquetados, **no deducidos** del puntero actual. |

## Bloque 4 · Observaciones

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-18 | Pruebas de dominio de la observación | TL-09 | RL-15, RL-18 | Rojas: tipo obligatorio, texto no vacío y acotado, período válido, destinatario tiene que ser MENTOR, append-only. `Clock` inyectado. |
| [ ] TL-19 | Migración `observaciones_mentor` e índices | TL-18 | RL-15 | Cabecera que explica por qué el chat no sirve como registro. Prueba de integración e idempotencia por clave de operación. |
| [ ] TL-20 | Caso de uso de registrar observación | TL-19 | RL-15, RL-18 | Verdes. Repetir la operación no crea dos filas ni dos mensajes. |
| [ ] TL-21 | Envío opcional por el chat directo existente | TL-20 | RL-14, RL-16, RL-17 | Reutiliza `conversations/direct`. Si el chat falla, la observación se conserva y se informa. **Ningún envío automático.** |
| [ ] TL-22 | Cambio de semáforo con motivo, si PL-02 se aprueba | TL-08, TL-20 | RL-27 | Queda registro de quién y por qué. El nivel sigue intocable. |

## Bloque 5 · Reporte

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-23 | Declarar `CumplimientoDeMentorFinder` como puerto sin implementación | TL-09 | RL-11 | Devuelve `SOURCE_UNAVAILABLE` con motivo. **Prohibido** escribir una segunda fórmula. |
| [ ] TL-24 | Pruebas del reporte: sin muestra, sin historial, cobertura parcial, fuente caída, mes corto, zona distinta | TL-17, TL-20, TL-23 | RL-12, RL-19, RL-20, RL-21, RL-23 | Rojas. Ningún `null` se vuelve cero. Quien no tiene muestra queda **excluido del orden**, no último. |
| [ ] TL-25 | Implementar el reporte del período | TL-24 | RL-19, RL-20, RL-21, RL-23 | Verdes. Cabecera con período, zona, corte y versión de fórmula. Paginado. |
| [ ] TL-26 | Comprobar que el reporte no expone datos de aprendices | TL-25 | RL-22 | Prueba explícita sobre la respuesta completa y sobre lo compartible. |

## Bloque 6 · Frontend

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-27 | `src/features/lider-mentores/` con cliente y schemas validados | TL-12 | RL-04, RL-06 | Errores y `null` diferenciados; ningún dato simulado. `tsc` en cero. **No se abre `src/features/mentor/`.** |
| [ ] TL-28 | `useEsLiderDeMentores()` y normalización única de `MENTOR_LEAD` / `LIDER_MENTORES` | TL-27 | RL-28 | Un solo lugar traduce el rol. Decide qué se muestra, nunca qué se puede hacer. |
| [ ] TL-29 | Reutilizar el gate de navegación del 001 para staff sin programa personal | TL-01, TL-28 | RL-02, RL-03 | El líder entra a su gestión sin quedar encerrado en el onboarding. **Compartido con el 001, no clonado.** |
| [ ] TL-30 | Pantalla de padrón | TL-27 | RL-04, RL-05, RL-30 | Una columna, nombre primero, estado en palabras, 16 px de cuerpo, controles de 48 px, un solo scroll. |
| [ ] TL-31 | Pantalla de ficha | TL-30 | RL-06, RL-07, RL-12, RL-30 | Bloques con su estado propio; «Sin datos» explicado; nada de un aprendiz por su nombre. |
| [ ] TL-32 | Modal de observación con envío opcional | TL-21, TL-31 | RL-14, RL-15, RL-16 | Casilla apagada por defecto; `useSystemBackHandler`; el texto no se pierde con el teclado ni al volver atrás. |
| [ ] TL-33 | Pantalla de reporte | TL-25, TL-30 | RL-19, RL-20, RL-23 | Cifras siempre con denominador; cabecera con zona y corte; excluidos nombrados aparte. |
| [ ] TL-34 | Entradas en Hoy y Comunidad | TL-30 | RL-28 | Dos inserciones mínimas. Cinco pestañas intactas. Comprobado que la tarjeta del 001 y esta **nunca** coinciden en la misma persona. |
| [ ] TL-35 | Recorrido de UX real: 320/360/390/440/768 px, fuente ampliada, gesto atrás, Android e iOS | TL-31, TL-32, TL-33, TL-34 | RL-29, RL-30 | Matriz completada con capturas. Sin recortes, sin doble scroll, sin salir de la app desde una subpantalla. |

## Bloque 7 · Cierre

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [ ] TL-36 | Enchufar el cumplimiento del 001 cuando exista | TL-23 | RL-11, RL-19 | **Solo un adaptador.** El reporte no se toca. Si el 001 no aterrizó, se deja declarado como bloqueo. |
| [ ] TL-37 | Revisar el registro del modo sombra y activar el cumplimiento de permisos | TL-07, TL-35 | RL-24, RL-25, RL-26 | Registro limpio en uso real. Si no lo está, se corrige la fila — **nunca** se concede un permiso de ADMIN. |
| [ ] TL-38 | Ejecutar las comprobaciones obligatorias de ambos repos | TL-35, TL-37 | RL-01..RL-30 | `clean verify` con Cloud —avisando y esperando a que el dueño apague la app—, `ArchitectureTest`, `EndpointAuthorizationDeclarationTest` y `tsc` documentados con su salida real. |
| [ ] TL-39 | Trazabilidad y bitácora | TL-38 | RL-01..RL-30 | Cada `RL` con su prueba o su bloqueo. Toda incidencia en `docs/BITACORA_ERRORES.md` con síntoma literal, causa y prevención. |

## Registro por tarea

Al cerrar cada una: archivos tocados, prueba ejecutada y resultado observado. Una tarea no se
marca por haber escrito el código si su criterio exige pruebas. Una prueba bloqueada se registra
**como bloqueada**, con la causa concreta.

## Límites

Seguir esta lista no autoriza a desplegar, migrar producción, enviar un mensaje real a un mentor,
commitear, pushear ni instalar servicios. La implementación la inicia el dueño con el prompt del
paquete.
