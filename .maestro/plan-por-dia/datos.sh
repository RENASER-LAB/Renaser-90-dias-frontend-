#!/usr/bin/env bash
# Datos de prueba del recorrido de Plan por día (2026-11-25). SOLO la base LOCAL `renaser_e2e_plan` (se niega con otra que no empiece con renaser_e2e).
#   datos.sh dia0          el programa empieza mañana (día 0)
#   datos.sh dia <N>       hoy es el día N del programa: fecha_inicio = hoy − (N−1)  (hora de Lima)
#   datos.sh avanzar       pasa un día: corre UN día atrás todo lo de la cuenta (fecha_inicio, acciones, marcas de tiempo) → lo de hoy queda como ayer
#   datos.sh limpiar-objetivos   borra objetivos, semanas y acciones de la cuenta (vuelve a «sin objetivos»)
#   datos.sh por-confirmar  deja los objetivos de 90 días como los crea el diagnóstico: origen DIAGNOSTICO y sin confirmar
#   datos.sh sql "<consulta>"    una consulta suelta
# El backend calcula el día desde `fecha_inicio` y la fecha de hoy (no hay reloj falso): por eso se mueven los datos y no el reloj.
set -euo pipefail
BASE=${E2E_BASE:-renaser_e2e_plan}; CUENTA=${E2E_CORREO:-e2e-ap-web@renaser.test}
[[ $BASE == renaser_e2e* ]] || { echo "Solo bases renaser_e2e*" >&2; exit 2; }
psql_() { docker exec -i renaser-db psql -U postgres -d "$BASE" -v ON_ERROR_STOP=1 -X "$@"; }
U="(SELECT id FROM renaser.usuarios WHERE email='$CUENTA')"
HOY="((now() AT TIME ZONE 'America/Lima')::date)"
case ${1:-} in
  dia0) psql_ -c "UPDATE renaser.participantes_programa SET fecha_inicio=$HOY+1, dia_programa=0, dia_programa_avanzado_el=NULL, dias_ajuste_programa=0 WHERE usuario_id=$U" ;;
  dia) N=${2:?día}; psql_ -c "UPDATE renaser.participantes_programa SET fecha_inicio=$HOY-($N-1), dia_programa=$N, dia_programa_avanzado_el=$HOY, dias_ajuste_programa=0 WHERE usuario_id=$U" ;;
  avanzar) psql_ <<SQL
BEGIN;
UPDATE renaser.participantes_programa SET fecha_inicio=fecha_inicio-1, dia_programa=LEAST(dia_programa+1,90), dia_programa_avanzado_el=$HOY WHERE usuario_id=$U;
-- la restricción única (participante, fecha, eje, posición) se revisa fila a fila: se pasa por una fecha lejana para correr todo un día atrás sin choques
UPDATE renaser.rocas_diarias SET fecha=fecha+3650 WHERE participante_id=$U;
UPDATE renaser.rocas_diarias SET fecha=fecha-3651, completada_en=completada_en-interval '1 day', cierre_en=cierre_en-interval '1 day' WHERE participante_id=$U;
-- la marca de «día cerrado» vive en el diario (EVALUACION_DIA): también corre un día atrás
UPDATE renaser.entradas_diario SET fecha=fecha+3650 WHERE participante_id=$U;
UPDATE renaser.entradas_diario SET fecha=fecha-3651, creado_en=creado_en-interval '1 day', actualizado_en=actualizado_en-interval '1 day' WHERE participante_id=$U;
COMMIT;
SQL
  ;;
  limpiar-objetivos) psql_ <<SQL
DELETE FROM renaser.rocas_diarias WHERE participante_id=$U;
DELETE FROM renaser.rocas_semanales WHERE roca_maestra_id IN (SELECT id FROM renaser.rocas_maestras WHERE participante_id=$U);
DELETE FROM renaser.rocas_mensuales WHERE roca_maestra_id IN (SELECT id FROM renaser.rocas_maestras WHERE participante_id=$U);
DELETE FROM renaser.rocas_maestras WHERE participante_id=$U;
SQL
  ;;
  por-confirmar) psql_ -c "UPDATE renaser.rocas_maestras SET origen='DIAGNOSTICO', confirmada_en=NULL WHERE participante_id=$U" ;;
  sql) psql_ -c "$2" ;;
  *) echo "uso: datos.sh dia0|dia N|avanzar|limpiar-objetivos|sql" >&2; exit 2 ;;
esac
