# Objetivos del Plan: qué se conectó, qué quedó vacío y por qué

**Fecha:** 2026-09-07 · **Pantalla:** Plan → PRIORIDADES CLAVE → Objetivos.
**Estado:** superado el 2026-09-08. Ver `docs/PLAN_TRES_NIVELES_2026-09-08.md`.

> **Corregido 2026-09-08.** Este documento describía un estado intermedio: solo el objetivo de 90
> días estaba conectado, y solo para el eje TRABAJO. Ya no es así — los tres niveles y los tres ejes
> están contra el backend. Las secciones 3 y 4 quedaron obsoletas y están marcadas abajo. Se
> conserva el resto porque explica **por qué** se borraron los datos inventados, que sigue siendo la
> decisión de fondo.

---

## 1. El problema que había

La pantalla mostraba un plan que no era de nadie. Estaba escrito a mano en `PlanScreen.tsx`:

- Objetivo de 90 días: *"Facturar $30,000 USD en Contratos High-Ticket"*, 19.500 de 30.000, 65 % cumplido.
- Sprint semanal: *"Enviar propuesta a Corporación Delta ($8,500 USD)"*, *"Cerrar contrato Grupo Sol ($11,000 USD)"*, con tres de cuatro tareas ya tildadas.
- Roca del día: *"Cerrar el Bloque de 90m y sellar la evidencia fotográfica antes de las 12:00"*.

**Todos los aprendices veían exactamente eso**, como si fuera su plan. El botón Editar funcionaba, pero solo cambiaba un estado de React: al recargar volvía lo inventado y nunca llegaba al servidor.

Es la misma clase de problema que ya se había corregido con `INITIAL_HABITS` (cinco hábitos inventados que se mostraban como el plan del aprendiz). Los objetivos quedaron sin arreglar entonces.

Del lado del backend la causa era más profunda: `rocas_maestras` **solo se podía leer**. No había puerto de guardado ni un solo INSERT en todo el código, y la tabla estaba **vacía en producción**. Ver `docs/MODULO_ROCKS.md` RK-9 en el repo del backend.

## 2. Lo que se conectó

| Pieza | Dónde |
|---|---|
| Tipos del cable y etiquetas de eje | `features/objetivos/types/objetivos.types.ts` |
| Validación en runtime de la respuesta | `features/objetivos/api/objetivosSchemas.ts` |
| Llamadas | `features/objetivos/api/objetivosApi.ts` |
| Estado, carga y guardado | `features/objetivos/hooks/useRocasMaestras.ts` |
| Mes y semana derivados del día | `features/objetivos/utils/periodoDelPrograma.ts` |

Endpoints: `GET /api/v1/rocks/master` y `PUT /api/v1/rocks/master/{eje}`.

~~**El eje de esta pantalla es `TRABAJO`**, porque es la de "Diseñar libertad financiera". Los otros dos (`CUERPO`, `RELACIONES`) existen en el backend y todavía no tienen pantalla; cuando la tengan, `EJE_DE_ESTA_PANTALLA` deja de ser constante.~~

> **Corregido 2026-09-08.** Ya la tienen: es esta misma pantalla, y el eje lo fija la tarjeta que se toca. `EJE_DE_ESTA_PANTALLA` pasó a ser `EJE_POR_DEFECTO`, solo el valor inicial.

### La meta medible

Es **opcional pero entera**: quien la quiera carga cuánto lleva, cuánto quiere llegar y **en qué se mide**. La unidad dejó de estar fija en dólares — un objetivo puede medirse en kilos, horas o clientes.

Si faltara una de las tres, el backend responde 400, así que la pantalla avisa antes y en el idioma de la persona. Si no escribe ninguna, se guarda un objetivo cualitativo, que es válido y no dibuja barra.

**El porcentaje llega calculado del servidor** y ya no se recalcula acá. Es una regla de negocio (incluido el tope al 100 % cuando alguien supera su meta) y si cada pantalla la recalculara, dos vistas mostrarían números distintos para el mismo dato.

### Dónde está parado en el programa

`periodoDelPrograma.ts` deriva mes y semana **del día, de corrido**, sin fechas ni zonas horarias.

- **El mes es un bloque contado desde que la persona arrancó**, no un mes del calendario. Dos aprendices que empezaron en fechas distintas están en su mes 2 en momentos distintos, y eso es lo correcto.
- **12 semanas y no 13.** El programa dura 90 días, que son 12 semanas y 6 días. La tabla del backend admite hasta 13, pero 13 no se divide en meses de cuatro: quedarían tres meses y una semana suelta. Con 12 son tres meses exactos.

> **Ojo con esta diferencia**, que es real y está asumida: el backend cuenta el mes **de a 30 días** (mes 1 cierra el día 30, mes 2 el 60, mes 3 el 90), porque así los tres meses cubren los 90 exactos y ningún día queda fuera. Esta utilidad del frontend agrupa **de a 4 semanas** (28 días) para la etiqueta "Mes N · Semanas X a Y". Sirven a cosas distintas —una es el hito del plan, la otra es cómo se rotula la pantalla— pero si algún día se muestran juntas hay que unificarlas.

## 3. Lo que quedó vacío, a propósito  ·  ⚠️ obsoleto desde el 2026-09-08

El objetivo **semanal** y el **diario** arrancan sin contenido, con un texto que invita a escribirlo, en vez de los datos inventados.

~~Siguen viviendo solo en memoria y se pierden al recargar.~~ Sus endpoints existen en el backend (`/api/v1/rocks/weekly`, `/api/v1/rocks`, y desde el 7/9 también `/api/v1/rocks/monthly`), **pero el modelo real no coincide con lo que dibuja hoy la tarjeta**: la semanal del backend tiene título, obstáculo, contingencia, autoevaluación del 1 al 10 y hasta tres acciones críticas, mientras que la pantalla muestra una lista de tildes. Conectarlas es rediseñar la tarjeta, no cablearla.

Se prefirió dejarlas vacías antes que seguir mostrando el plan inventado de nadie.

> **Corregido 2026-09-08.** Ya no viven en memoria. El rediseño que este párrafo pedía —"conectarlas
> es rediseñar la tarjeta, no cablearla"— se hizo: `features/objetivos/components/NivelesDelPlan`.

## 4. Lo que falta

> **Corregido 2026-09-08.** Tres de los cuatro puntos están hechos. Se dejan tachados en vez de
> borrados para que se vea qué se cerró y cuándo.

1. ~~**Rediseñar la tarjeta semanal** contra el modelo real, y recién ahí conectarla.~~ Hecho.
2. **El nivel mensual**, que el backend ya expone desde el 7/9 (`GET /rocks/monthly`, `PUT /rocks/monthly/{eje}/{numeroMes}`) y la pantalla todavía no muestra. **Sigue pendiente.**
3. ~~**Las tres actividades diarias**: el backend pide 3 por día y da puntaje por puntualidad; la tarjeta muestra una sola "roca innegociable".~~ Hecho: hasta 3 por eje, con hora.
4. ~~**Los otros dos ejes.** Hoy solo hay pantalla para Trabajo.~~ Hecho: la vista se abre en el eje de la tarjeta que se toca.

## 5. Cómo verificarlo

`npx tsc --noEmit` en cero y `npx expo export --platform web` compilando. Verificado además sobre el bundle publicado: el objetivo inventado y las tareas de "Corporación Delta" tienen **cero apariciones**, y la llamada al endpoint real está presente.

**Sin verificar:** el recorrido visual con una sesión iniciada y datos reales. Al escribir esto, `rocas_maestras` estaba vacía en producción, así que lo que se ve es el estado vacío.
