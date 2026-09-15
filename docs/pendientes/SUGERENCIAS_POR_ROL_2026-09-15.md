# Sugerencias por rol · 15 de septiembre de 2026

Relevamiento de las superficies de **Líder de Mentores**, **Administrador** y **Alquimista**, con
lo que conviene hacer en cada una, **el archivo donde se toca y el riesgo de tocarlo**.

Todo lo de acá está verificado contra el código de los dos repos, no contra la documentación.

---

## Qué de esto ya está hecho (15 de septiembre de 2026, misma fecha)

Se atacaron las superficies de **Administrador**, **Alquimista** y **Líder de Mentores**. **Nada de
lo que ve un aprendiz se tocó**: toda la §3 y toda la §4 siguen tal cual se describen más abajo.

| Punto | Estado |
|---|---|
| A1 — la tarjeta prometía evidencias | **Hecho.** El texto dice «Grupos, personas y solicitudes» |
| A2 — el rol era una suposición del cliente | **Hecho, en aditivo.** Sección «Staff» nueva desde `GET /api/v1/admin/staff`, con el rol real. Las dos listas viejas quedaron intactas |
| A3 — puerta de un solo sentido con los roles | **Hecho.** Un MENTOR_LEAD, ADMIN o ALQUIMISTA vuelve a verse y se le puede cambiar el rol. La advertencia de «va a desaparecer» se fue con el problema |
| A4 — cuatro filas muertas en «Más opciones» | **Hecho.** Borde punteado, sin fondo de tarjeta, candado, y el motivo escrito en cada fila. Las dos que sí abren ganaron su flecha |
| A5 — mensaje que afirmaba lo que no sabía | **Hecho.** Tres desenlaces (entró / no entró / no se pudo averiguar), en `mensajeDeAltaAprobada`, con pruebas |
| §2.1 — la tarjeta vacía del líder de mentores | **Hecho, en la versión segura.** La entrada no se dibuja cuando el servidor dice que no acompaña ningún grupo; `mentor.types.ts:19` **no se tocó**, así que un MENTOR_LEAD con asignación heredada la sigue viendo. Un MENTOR sin grupo tampoco cambia |
| §2.2 — bandeja de tickets para el líder | **Hecho.** Pantalla nueva de solo lectura sobre `GET /api/v1/admin/tickets`, con su propia entrada en Hoy, reusando `features/tickets` |
| A6 (evidencias), A7 (ajustar el día), §2.3 (`leadership`) | **Sin hacer.** A1 se cerró quitando la promesa, no construyendo la bandeja |

Lo que quedó **pendiente y detectado de paso** está al final, en §5.

---

## 0. Tres hechos que explican todo lo demás

1. **No hay ruteo por rol.** `RootNavigator.tsx:17-27` monta los mismos 5 tabs para todos. Las
   superficies de rol son estado interno de Hoy y de Yo, no rutas.
2. **ADMIN y ALQUIMISTA son hoy el mismo rol.** No hay un solo `if` que los distinga, ni en el
   frontend ni en el backend (`AcompanamientoService.java:206-208` los agrupa en
   `esAdministrador`). Si tienen que diferenciarse, eso es una decisión de producto que todavía
   no se tomó — no un bug.
3. **LÍDER DE MENTORES no tiene ninguna pantalla propia**, y la única entrada que ve está rota
   por construcción (§2).

---

## 1. Administrador / Alquimista

**Es la parte más sana del proyecto.** Nueve vistas, casi todas sobre datos reales, distinguiendo
`null` de `0` y fallando por panel sin arrastrar a los demás. No hay mocks acá. Las sugerencias
son de cierre, no de rescate.

| # | Sugerencia | Dónde | Riesgo |
|---|---|---|---|
| A1 | **La tarjeta promete evidencias que no existen.** Dice "Grupos, personas, solicitudes **y evidencias**" y no hay ninguna pantalla de evidencias | `TarjetaAdminHoy.tsx:30` | **Nulo** — es una cadena de texto |
| A2 | **El rol que se muestra es una suposición del cliente.** `StaffRolesScreen` deduce "Aprendiz"/"Mentor" de qué lista vino la persona (`:186`, `:195`), porque los esquemas no traen `role`. **`GET /api/v1/admin/staff` ya existe, con filtro `?role=` y el campo `role` de verdad** — y `specs/003/PENDIENTES.md` §4 afirma lo contrario, que "haría falta un endpoint nuevo" | `StaffRolesScreen.tsx:174-203` | **Medio** — toca una pantalla que funciona; se puede sumar como sección nueva sin quitar la actual |
| A3 | **Puerta de un solo sentido con los roles.** Promover a MENTOR_LEAD/ADMIN/ALCHEMIST saca a la persona de las dos listas y ya no se la vuelve a ver. Se mitiga con "Cambios de esta sesión", que se pierde al salir | `StaffRolesScreen.tsx:32` | **Medio** — se arregla solo con A2 |
| A4 | **Cuatro filas muertas** en "Más opciones": se ven igual que las dos que sí funcionan | `MasOpcionesScreen.tsx:105-117` | **Nulo** |
| A5 | **Mensaje que afirma lo que no sabe.** Tras aprobar una solicitud, si la consulta previa falló, siempre dice "quedó SIN grupo" aunque haya entrado | `SolicitudesAdminScreen.tsx:78` | **Bajo** |
| A6 | **Bandeja de evidencias** (`GET /admin/evidence` + `review` + `void`): construida y probada en backend, sin una sola pantalla. Cumpliría A1 | pantalla nueva | **Bajo-medio** — es alcance, no rotura |
| A7 | **Ajustar el día del programa** (`PUT /admin/trainees/{id}/program-day`): la funcionalidad estrella del reloj ("viajé, devolveme al día 34") no tiene UI | `FichaAprendizScreen.tsx` | **Medio** — es una escritura sobre el reloj; pide confirmación fuerte |

Además hay **~30 endpoints de admin construidos y sin consumir** (catálogo de hábitos, cohortes,
soporte, muro, puntos, calendario entero). Cuatro de esos bloques están declarados a propósito
como "desde el panel web" (`MasOpcionesScreen.tsx:55-60`); el resto no tiene esa justificación.

---

## 2. Líder de Mentores — el rol más roto de los tres

La cadena, verificada de punta a punta:

1. `useEsMentor()` lo trata como mentor (`mentor.types.ts:19`), así que ve la tarjeta "Mi grupo".
2. La tarjeta se alimenta de `GET /api/v1/mentor/context` → `assignments`.
3. **Un MENTOR_LEAD no puede tener asignaciones**: asignar mentor a un grupo exige rol
   MENTOR/ADMIN/ALCHEMIST (`ComposicionDeCelulaService.java:354`).
4. → La tarjeta dice para siempre *"Todavía no tienes aprendices asignados"*, y la pantalla
   detrás está vacía. No tiene acceso a Administración.

**La única entrada visible de un líder de mentores en toda la app es una tarjeta permanentemente
vacía.**

Y tiene capacidad construida que nadie expone:

| Qué | Estado |
|---|---|
| `GET /api/v1/admin/tickets` — bandeja de tickets de mentoría | Backend listo, **permiso ya concedido** a MENTOR_LEAD. Sin consumidor: el apartado se retiró de la app el 2026-09-07 y dejó `src/features/tickets/**` como código muerto |
| `PATCH /users/{mentorId}/mentor-profile/operational-status` — semáforo del mentor | Backend listo. Sin consumidor |
| `VIEW_MENTOR_CORPS`, `VIEW_MENTOR_REPORT`, `FOLLOW_UP_MENTOR` | Permisos declarados **sin ningún controller detrás**. El paquete `leadership` del SDD 002 nunca se construyó |

**Sugerencia, en orden de costo:**

1. **Lo más barato y honesto hoy**: que la tarjeta vacía no aparezca para MENTOR_LEAD (sacarlo de
   `ROL_MENTOR`, `mentor.types.ts:19`). Riesgo **medio**: cambia comportamiento actual, aunque ese
   comportamiento sea un estado vacío permanente. **Antes hay que confirmar en la base que no haya
   un MENTOR_LEAD con asignación heredada.**
2. **Darle algo real**: la bandeja de tickets, que ya tiene permiso y backend. Reusa los 4
   archivos hoy muertos de `features/tickets`.
3. **Lo grande**: el paquete `leadership` (cuerpo de mentores, observaciones, reporte). Es un SDD
   entero sin construir — no entra en un día.

> **Ojo con el enforcement.** El interceptor de permisos está en **modo sombra**
> (`PermissionEnforcementInterceptor.java:34-42`): registra, no deniega. Cualquier plan que asuma
> que los permisos bloquean hoy, está asumiendo de más.

---

## 3. Lo que ven los tres roles (y todos los demás): cifras inventadas

Los tres usan los mismos 5 tabs que un aprendiz. Ahí está concentrada la invención que queda:

| Dato | Dónde | Qué se ve |
|---|---|---|
| `METRICAS` — "12 conversaciones", "3 eventos próximos", "2 mentorías" | `ComunidadScreen.tsx:381-385` | Tres cifras inventadas bajo "Interacciones clave". "3 eventos" es doblemente falso: el módulo `calendar` no se consume en ningún lado |
| "37 días consecutivos" y "94 %" | `TrainingScreen.tsx:1088-1091` | Iguales para las 5 dimensiones y para cualquier persona |
| `'16 miembros'` y `'● En línea'` | `ComunidadScreen.tsx:3095` | El conteo real está cargado al lado; no hay presencia en el backend |
| `?? 100` en coherencia y puntos | `HoyScreen.tsx:252-253`, `YoScreen.tsx:393` | Si el backend falla, dice **100 % y "Nivel de excelencia"**. Agravante: la coherencia del backend **queda en 100 para siempre** porque nadie la calcula |
| `diaPrograma ?? 1` | `YoScreen.tsx:374` | Sin datos, dice "DÍA 1" |
| Gráficos "TU EVOLUCIÓN" y "Patrones" | `YoScreen.tsx:45-50` | Polilíneas SVG fijas, idénticas para todos, presentadas como evolución personal |
| Botón "+ Subir Foto" | `YoScreen.tsx:1105` | Promete abrir la cámara y solo muestra un `Alert` |
| `GROUP_MEMBERS` | `ComunidadScreen.tsx:291-332` | Roster con nombres, profesiones y rachas inventadas |

Las siete primeras son **borrar o cambiar un default**: riesgo nulo o bajo, y se van las mentiras
más visibles. La última (`GROUP_MEMBERS`) **no la tocaría ahora**: el JSX usa campos que el backend
no tiene (`badge`, `streakDays`, `cell`, `focus`), así que no es cambiar la fuente de datos, es
rediseñar la tarjeta.

---

## 4. Lo que rompe la pantalla del mentor entera, y no es de rol

`GET /api/v1/mentor/groups/{id}/learners` devuelve solo `{userId, fullName, avatarUrl, active}`, así
que `mentorApi.ts:50-62` mapea a `null` el día de programa, la última actividad, los hábitos
programados, los cumplidos y las evidencias pendientes.

Efecto en cadena: `esEvaluable()` siempre falso → **las secciones "Requieren seguimiento" y "Al día"
de `MiCelulaScreen` no aparecen nunca**, y todo el grupo cae en "Sin avance registrado".

**La función central de la pantalla del mentor —saber a quién escribirle— está inerte.** El arreglo
correcto es que el backend agregue ese resumen a la respuesta del listado; el parche barato es N
llamadas a `/progress` al abrir (un grupo son 10 personas). Riesgo **alto** en los dos casos: es la
pantalla del mentor cambiando de aspecto por primera vez.

---

## 5. Lo que apareció mientras se arreglaba lo de arriba

Tres cosas vistas al tocar este código. La 2 **ya está arreglada** (ver abajo); las otras dos
siguen sin arreglar, porque cada una es otro cambio:

1. **Un mentor sin grupo lee «No pudimos cargar tu grupo», que es falso.** En
   `TarjetaMentorHoy.tsx:43-52` el fallo `sin_celula` cae en la rama genérica de error. No falló
   nada: el servidor respondió 200 con `assignments: []`. La pantalla completa sí lo distingue
   bien (`EstadoCelula`, caso `sin_celula`: «Todavía no lideras ningún grupo»); es solo la tarjeta
   la que colapsa los dos casos. Afecta al **mentor**, no al líder — y el rol mentor quedó
   deliberadamente fuera de este encargo.
2. **Un mentor SUSPENDIDO no se ve en ninguna lista del panel.** `GET /admin/cells/mentores` sale
   de `usuariosActivosConRol`, que filtra `estado = 'ACTIVO'`; y la sección «Staff» nueva pide solo
   los tres roles de conducción, para no duplicar a cada mentor activo. Un mentor suspendido, por
   lo tanto, no se puede devolver a aprendiz desde la app. Se arregla el día que se decida cómo
   mostrar mentores en dos secciones sin repetirlos.

   > **Corregido 2026-09-15 (mismo día).** **Hecho, solo en el frontend.** Lo de arriba describe
   > bien el bug; lo que estaba de más era el «se arregla el día que se decida»: no hacía falta
   > decidir nada nuevo. La sección «Mentores» ahora pide también
   > `GET /admin/staff?role=MENTOR` **sin** `status` —el backend aplica el filtro de estado solo
   > si el parámetro viene, así que esa consulta trae cualquier estado— y suma los que
   > `/admin/cells/mentores` no devolvió. **El cruce entre las dos listas es por id**
   > (`utils/staff.ts`, `mentoresQueFaltan`), que es «mostrarlos sin repetirlos» sin tener que
   > razonar sobre estados. El suspendido queda al final de la sección, con «Cuenta suspendida» en
   > su línea, y con el mismo menú de roles que cualquier otra fila. Sin tocar el backend.

3. **La bandeja de tickets no dice de quién es cada ticket.** `TicketMentorResponse` trae
   `traineeProfileId` y ningún nombre. La pantalla nueva lo dice con todas las letras en vez de
   mostrar un UUID o de resolverlo con una consulta que el líder quizá no tenga permitida. Si el
   nombre importa, el cambio es del backend: agregarlo a esa proyección.
