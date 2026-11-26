# plan-ruta — Plan como ruta de niveles (spec 058, 2026-11-25)

Flujos de la R1. Cada uno dice su precondición y su cuenta arriba; ninguno está «corrido» hasta que su cabecera lo diga.

- Cuenta y datos: los de `.maestro/plan-por-dia/` (`datos.sh`: `dia N`, `limpiar-objetivos`…) en la base local `renaser_e2e_plan`.
- **`plan.ruta` prendida**: Soporte TI → Funcionalidades → «Plan como ruta». En la base local (`renaser_e2e_plan`) el estado vive en la tabla `renaser.funcionalidades_estado`
  (columnas `clave`, `prendida_global`, `aviso`, `version`, `actualizado_por`, `actualizado_en`; V101 del backend); verificado el 25/11 con esta consulta (la app relee cada 60 s o al abrir):
  `INSERT INTO renaser.funcionalidades_estado (clave, prendida_global, aviso, version, actualizado_por, actualizado_en) VALUES ('plan.ruta', true, NULL, nextval('renaser.funcionalidades_version_seq'), '00000000-0000-0000-0000-000000000000', now()) ON CONFLICT (clave) DO UPDATE SET prendida_global = true, version = nextval('renaser.funcionalidades_version_seq'), actualizado_en = now()`
  (con `false` se apaga). Sin fila, la clave nace apagada y escondida. Un despliegue «Solo probadores» usa además `funcionalidades_despliegue` y `funcionalidades_probadores` (V113).
  Con ella apagada, los flujos de `plan-por-dia` deben dar lo mismo que antes (Plan de hoy intacto).
- Backend: el de la rama 058 (trae la clave) contra `renaser_e2e_plan`, puerto 8080 (`~/.config/renaser-e2e/levantar-backend-058.py`).
- En la build de desarrollo, escribir dos «r» seguidas (aunque sea dentro de una palabra: «Trotar», «Madrugar») recarga el JavaScript: usa textos sin dos «r».
- Los efectos (FR-014) no se ven en una captura estática: se revisan a ojo en el emulador (cascada al entrar, pop, salto del fénix, cofre).

## Datos de cada flujo (`datos.sh`, base local `renaser_e2e_plan`)

| Flujo | Preparación |
|---|---|
| `01`, `02` | `datos.sh semana-con-acciones` |
| `03` | `datos.sh semana-con-acciones` y luego `datos.sh semana-sin-revisar` |
| `04` | `datos.sh semana-sin-armar` |

`comun/ya-adentro.yaml` registra el Código Renaser de la hora en punto si aparece y desliza hacia abajo para devolver la barra de pestañas que el scroll del flujo anterior dejó escondida.
- Tras cambiar los datos por SQL (p. ej. `semana-sin-armar`) cierra y abre la app: guarda el plan en caché y el flujo ve el estado viejo.
