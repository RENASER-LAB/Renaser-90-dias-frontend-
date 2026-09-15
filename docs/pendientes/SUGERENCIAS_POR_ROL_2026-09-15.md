# Sugerencias por rol · 15 de septiembre de 2026

Relevamiento de las superficies de **Líder de Mentores**, **Administrador** y **Alquimista**, con
lo que conviene hacer en cada una, **el archivo donde se toca y el riesgo de tocarlo**.

Todo lo de acá está verificado contra el código de los dos repos, no contra la documentación.

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
