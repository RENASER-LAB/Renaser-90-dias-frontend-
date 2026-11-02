#!/bin/bash
# estado-de-hoy.sh <PENDIENTE|COMPLETADO> "<CLAVE_DE_SISTEMA o TÍTULO DEL CATÁLOGO>" ...
# Deja los registros de HOY de una cuenta de prueba en ese estado, en la base LOCAL de pruebas. Es lo que usa la línea `# antes:` de los
# flujos que piden un estado de hábito distinto del que dejó el flujo anterior (Maestro no puede deshacer un hábito cumplido desde la
# app). Pasa la clave de sistema (WAKE_UP, SLEEP, WARM_LEMON_WATER, RITUAL_MORNING, GYM, DAILY_KM…) o, si el hábito no tiene, el título
# EXACTO del catálogo (viene en mayúsculas: «ÚLTIMA COMIDA DEL DÍA»). Con el prefijo `accion:` es una acción del día de los objetivos
# (`rocas_diarias`): «accion:Llamar a mi mentor». Ejemplos:
#   .maestro/comun/estado-de-hoy.sh PENDIENTE WAKE_UP SLEEP
#   .maestro/comun/estado-de-hoy.sh COMPLETADO WARM_LEMON_WATER
#   .maestro/comun/estado-de-hoy.sh PENDIENTE "ÚLTIMA COMIDA DEL DÍA" "accion:Enviar la propuesta al cliente"
# Variables (con su valor por omisión): E2E_CONTENEDOR=renaser-db, E2E_BASE=renaser_e2e_final, E2E_CORREO=ef-aprendiz-escuela@renaser.test.
# El día de hoy es el de Lima. Se niega a tocar una base cuyo nombre no empiece con `renaser_e2e`: nunca la del dueño ni producción.
# Imprime cuántos registros cambió por cada título (0 = no encontró ese hábito hoy para esa cuenta).
set -eu
ESTADO=${1:?falta el estado (PENDIENTE|COMPLETADO)}; shift
case "$ESTADO" in PENDIENTE|COMPLETADO) ;; *) echo "estado desconocido: $ESTADO" >&2; exit 2;; esac
CONTENEDOR=${E2E_CONTENEDOR:-renaser-db}
BASE=${E2E_BASE:-renaser_e2e_final}
CORREO=${E2E_CORREO:-ef-aprendiz-escuela@renaser.test}
case "$BASE" in renaser_e2e*) ;; *) echo "la base $BASE no es de pruebas (renaser_e2e*)" >&2; exit 2;; esac
HOY="(now() at time zone 'America/Lima')::date"
COMPLETADA=$([ "$ESTADO" = COMPLETADO ] && echo true || echo false)
for t in "$@"; do
  if [ "${t#accion:}" != "$t" ]; then
    titulo=${t#accion:}; titulo=${titulo//\'/\'\'}
    sql="update rocas_diarias r
           set completada=($COMPLETADA), completada_en=case when $COMPLETADA then now() else null end,
               puntos_otorgados=case when $COMPLETADA then 10 else 0 end
          from usuarios u
         where u.id=r.participante_id and u.email='$CORREO' and r.fecha=$HOY and r.titulo='$titulo'"
  else
    titulo=${t//\'/\'\'}
    sql="update registros_habito r
           set estado='$ESTADO',
               completado_en=case when '$ESTADO'='COMPLETADO' then now() else null end,
               puntos_otorgados=case when '$ESTADO'='COMPLETADO' then 10 else 0 end,
               valor_medido=case when '$ESTADO'='PENDIENTE' then null else r.valor_medido end,
               origen_medicion=case when '$ESTADO'='PENDIENTE' then null else r.origen_medicion end
          from habitos h, usuarios u
         where h.id=r.habito_id and u.id=r.participante_id and u.email='$CORREO'
           and r.fecha_ejecucion=$HOY
           and (h.titulo='$titulo' or h.clave_sistema='$titulo')"
  fi
  n=$(docker exec -i "$CONTENEDOR" psql -U postgres -d "$BASE" -At -c "set search_path=renaser; $sql" | grep -E '^UPDATE ' | tail -1)
  echo "$ESTADO ${t}: ${n:-UPDATE 0}"
done
