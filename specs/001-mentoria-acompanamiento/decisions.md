# Registro de ejecución (T01 – T03)

Este archivo lo escribe el agente que implementa. Separa tres cosas que no deben
confundirse: lo que el usuario confirmó (D-01..D-09), lo que el agente adoptó para poder
escribir código (P-01..P-08) y lo que sigue sin resolver.

## T01 · Inventario real de ambos repositorios

Fecha de verificación: 2026-09-09.

| Repositorio | Rama de trabajo | HEAD | Diferencia contra research.md |
|---|---|---|---|
| Renaser-90-dias-frontend- | `mentor` (creada desde `master`) | `f076afd` | Coincide con el inventario. |
| Renaser-90-dias-backend | `mentor` (creada desde `master`) | `e2150ae` | research.md registró `3c590ad`. Después entraron `3c590ad` "Asegurar manejo de Redis y sesiones" y `e2150ae` "Dejar que Spring Session lea su propia metadata del hash de Redis". |

Los cambios de Redis **ya estaban commiteados en `master`**, no en el árbol de trabajo. La
rama `mentor` sale de `master`, así que los hereda; no hubo nada que preservar a mano y no
se ejecutó ningún `stash`, `reset` ni `checkout` destructivo.

Sin seguimiento en el momento de ramificar, y se dejan igual:
- frontend: `docs/mockups/`, `specs/`
- backend: `docs/spec/SDD_MENTORIA_ACOMPANAMIENTO.md`

Inventario de migraciones: 43 archivos, la versión más alta es `V44__meta_cero_con_linea_base.sql`.
**Versión libre para esta feature: V45.**

Hallazgos del inventario que corrigen supuestos del paquete:
- `celulas` no tiene columna de capacidad ni de tipo. El límite de 10 no existe en ninguna
  parte del código: `CelulaService.asignar` valida rol y estado del aprendiz, nunca ocupación.
- `cohortes` no tiene capacidad, cadencia ni zona horaria. La zona vive por participante en
  `participantes_programa.timezone` (default `America/Lima`).
- `celulas.mentor_id` es UNIQUE contra `perfiles_mentor(usuario_id)`, con `ON DELETE SET NULL`.
- `participantes_programa` tiene `celula_id` y `mentor_id` como punteros sin historial, tal
  como anticipó research.md.
- `ranking_celulas(fecha, celula_id, posicion, puntaje_grupo)` existe y se puede reutilizar.

## T02 · P-01 a P-04

Estado: **adoptadas por el agente implementador**, no aprobadas por el usuario. La
distinción importa y por eso está escrita: si el usuario ajusta una, se cambia el valor, no
el código.

La forma de adoptarlas es la que hace el cambio barato: **cada una entra como configuración
por cohorte con el valor de la propuesta como default**, no como constante compilada.

| ID | Adoptada como | Dónde vive el valor |
|---|---|---|
| P-01 | Recepción cubre los días 1–3 del programa; el traslado se evalúa desde el día 4. | `politicas_mentoria.dia_traslado` (default 4) |
| P-02 | Rotación mensual anclada al día 1; semanal anclada al lunes; en la zona de la cohorte. | `politicas_mentoria.cadencia_rotacion` + `zona_horaria` |
| P-03 | Sin mentor alternativo se conserva el actual y la rotación queda pendiente; sin ninguno, el grupo queda cubierto por soporte y visible como tal. | Regla de dominio (`CoberturaCelula`), sin valor configurable |
| P-04 | Al no haber cupo se conserva acceso a recepción y se marca `ESPERANDO_GRUPO`. La creación automática de un grupo nuevo **no se implementa en este alcance**. | Regla de dominio + estado observable |

Ajuste explícito sobre P-04: la propuesta original permitía crear una célula regular nueva
automáticamente. No se implementa. Crear un grupo implica nombre, mentor y conversación, y
hacerlo desde un job sin un humano que lo revise produce grupos huérfanos. El fallback que
sí queda es el que la propuesta pedía como mínimo: nadie se queda sin chat, y el
administrador recibe la señal.

## T03 · P-05 a P-08

| ID | Adoptada como | Nota |
|---|---|---|
| P-05 | Promedio de porcentajes individuales, solo obligaciones vencidas dentro del intervalo del mentor. | Fijado en test con el ejemplo 75 % (Ana 2/4, Luis 3/3), que descarta 5/7 = 71,43 %. |
| P-06 | Ausencia = 3 días locales completos sin actividad; los pendientes solo avisan tras vencer. | Default 3 configurable; coincide con `DIAS_SIN_ACTIVIDAD_ALERTA` que ya usa el frontend. |
| P-07 | Tras el traslado el aprendiz pierde recepción; el mentor entrante lee el historial; el saliente conserva solo su agregado. | La evaluación histórica no lleva nombres de alumnos. |
| P-08 | Ranking mensual dentro de la cohorte, recepción excluida, empate comparte posición. | Orden por valor sin redondear. |

## Lo que sigue abierto y no se puede cerrar desde el código

1. **Usuarios reales para guías y soporte.** No se inventan correos. Hasta que el
   administrador designe usuarios existentes, la política queda con la lista vacía y el
   estado de cobertura lo refleja.
2. **Credenciales de push nativo.** Sin proyecto Expo con credenciales no hay forma de
   probar entrega real en dispositivo. El contrato de transporte se puede escribir y probar
   con un doble; el envío real queda bloqueado.
3. **Historial anterior a la migración.** No es reconstruible: `mentor_id` es un puntero.
   Los períodos previos se marcan `SIN_HISTORIAL` y no se fabrican.

---

## Cambio de modelo de agrupación — 2026-09-11

El cliente cambió cómo se arman los grupos. **Esto invalida parte de la especificación**, y conviene
que quede escrito aquí y no solo en los commits: quien lea `spec.md` mañana va a encontrar RF-10 y
RF-11 describiendo un sistema que ya no es el que corre.

### Lo que decía el SDD

| | |
|---|---|
| **RF-10** | Al vencer el período, el sistema cambia **automáticamente** al mentor (mensual, opción semanal). |
| **D-02 / P-02** | Rotación mensual el primer día del mes, semanal el lunes, en la zona de la cohorte. |
| **D-06** | Rotan los mentores; alumnos, identidad del grupo y chat permanecen. |

### Lo que pidió el cliente

Nada de eso es automático. **El administrador arma cada grupo a mano**, desde un CRUD web que ya
existía casi entero (`/api/v1/admin/cells`):

1. Crea el grupo con **nombre y período**: *"septiembre, del 1 al 30, se llama Fénix"*.
2. Elige el mentor. Los mentores ahora tienen **especialidad**: NEGOCIO, MENTE o RELACIONES.
3. Mete a los alumnos.
4. Al terminar el período el grupo **se cierra y deja de verse desde la app del alumno**; solo queda
   para el administrador.
5. Antes de vencer, **le llega un aviso** para que mueva a la gente o programe el siguiente.

Sigue habiendo dos fases, y esa parte no cambió: un grupo de **bienvenida de 7 días** para recién
registrados —a ese la entrada sí es automática, al que esté vigente— y después el **grupo mensual**.

### Cómo se aplicó

- **Los dos schedulers quedan apagados por configuración, no borrados**
  (`renaser.scheduling.rotacion-mentores.enabled`, `…traslado-aprendices.enabled`). El código y sus
  pruebas siguen ahí. Es una decisión, no una limpieza pendiente: la lógica está probada y volver a
  pedirla es plausible — ya cambiaron de idea una vez. Se apagaron **antes** de construir lo nuevo
  porque, mientras corran, mueven a gente que el administrador colocó a mano.
- `V48` agrega el período a `celulas` y la especialidad a `perfiles_mentor`, **ambos nulables**: las
  células que ya existen no deben empezar a vencerse por una migración.
- `V49` agrega `GRUPO_POR_VENCER` a `tipo_notificacion` — un valor más, no una tabla de alertas
  propia, misma decisión que tomó V46.

### Lo que NO se tocó, y por qué

`ConjuntoAsignaciones` y las tres restricciones `EXCLUDE` de V45 **siguen valiendo**: un aprendiz en
un grupo vivo, un mentor por grupo, un grupo por mentor. Que las asignaciones las haga un humano en
vez de un job no cambia las invariantes — de hecho las hace más necesarias, porque un humano
armando grupos a mano se equivoca de maneras que un job no.

La evaluación mensual, el ranking y los avisos de acompañamiento tampoco cambian: se apoyan en el
historial de `asignaciones_celula`, que se sigue escribiendo igual venga de un job o del admin.
