#!/usr/bin/env bash
# Datos de los flujos de plan-ruta (spec 058). SOLO la base LOCAL `renaser_e2e_plan` (se niega con otra que no empiece con renaser_e2e).
#   datos.sh semana-con-acciones   Día 1, objetivos de 90 días intactos y sin avance, la semana 1 armada en Cuerpo (sin revisar) y tres acciones de Cuerpo:
#                                  «Caminar» (1.ª) y «Leer» (2.ª, con candado) hoy, y «Ver» mañana. Deja la cuenta sin graduar.
#   datos.sh cierre-del-dia        Como `semana-con-acciones` pero con las acciones de `plan-por-dia/07a`: «Trotar» (05:00, cumplida), «Vender» (06:00, ya pasó y sin cumplir; con 13:00 el flujo falla antes de esa hora) y «Llamar» (sin hora, cumplida).
#   datos.sh semana-armada         Como `semana-con-acciones` pero SIN acciones (la semana 1 armada; `plan-por-dia/05a` las agenda).
#   datos.sh semana-sin-armar      Día 1, objetivos de 90 días intactos y sin avance, y la semana 1 SIN armar (sin acciones): el primer nivel es «Arma tu semana».
#   datos.sh sin-objetivos         Día 1 y SIN objetivos de 90 días (borra sus rocas, semanales y diarias): el formulario «Define tu objetivo» arranca desde cero (spec 058 FR-015). `semana-con-acciones` los deja como estaban.
#   datos.sh semana-sin-revisar    Quita la revisión de la semana (para que el cofre se pueda abrir) sin tocar lo demás.
#   datos.sh sql "<consulta>"      una consulta suelta
set -euo pipefail
BASE=${E2E_BASE:-renaser_e2e_plan}; CUENTA=${E2E_CORREO:-e2e-ap-web@renaser.test}
[[ $BASE == renaser_e2e* ]] || { echo "Solo bases renaser_e2e*" >&2; exit 2; }
psql_() { docker exec -i renaser-db psql -U postgres -d "$BASE" -v ON_ERROR_STOP=1 -X "$@"; }
U="(SELECT id FROM renaser.usuarios WHERE email='$CUENTA')"
HOY="((now() AT TIME ZONE 'America/Lima')::date)"
CUERPO="(SELECT id FROM renaser.rocas_maestras WHERE participante_id=$U AND eje='CUERPO')"
case ${1:-} in
  semana-con-acciones) psql_ <<SQL
BEGIN;
UPDATE renaser.participantes_programa SET fecha_inicio=$HOY, dia_programa=1, dia_programa_avanzado_el=$HOY, dias_ajuste_programa=0, programa_completado=false, programa_completado_en=NULL, dia_post_programa=0 WHERE usuario_id=$U;
UPDATE renaser.rocas_maestras SET avance=linea_base WHERE participante_id=$U AND linea_base IS NOT NULL;
DELETE FROM renaser.rocas_diarias WHERE participante_id=$U;
DELETE FROM renaser.rocas_semanales WHERE roca_maestra_id IN (SELECT id FROM renaser.rocas_maestras WHERE participante_id=$U);
INSERT INTO renaser.rocas_semanales (roca_maestra_id, numero_semana, titulo) VALUES ($CUERPO, 1, 'Llegar a 81.4 kg');
INSERT INTO renaser.rocas_diarias (participante_id, fecha, posicion, titulo, color, puntaje_impacto, eje, roca_semanal_id)
SELECT $U, $HOY, 1, 'Caminar', 'VERDE'::renaser.color_pareto, 5, 'CUERPO'::renaser.eje_objetivo, s.id FROM renaser.rocas_semanales s WHERE s.roca_maestra_id=$CUERPO
UNION ALL SELECT $U, $HOY, 2, 'Leer', 'AMARILLA'::renaser.color_pareto, 5, 'CUERPO'::renaser.eje_objetivo, s.id FROM renaser.rocas_semanales s WHERE s.roca_maestra_id=$CUERPO
UNION ALL SELECT $U, $HOY+1, 1, 'Ver', 'VERDE'::renaser.color_pareto, 5, 'CUERPO'::renaser.eje_objetivo, s.id FROM renaser.rocas_semanales s WHERE s.roca_maestra_id=$CUERPO;
COMMIT;
SQL
  ;;
  semana-armada) "$0" semana-con-acciones >/dev/null; psql_ -c "DELETE FROM renaser.rocas_diarias WHERE participante_id=$U" ;;
  cierre-del-dia) "$0" semana-con-acciones >/dev/null; psql_ <<SQL
DELETE FROM renaser.rocas_diarias WHERE participante_id=$U;
INSERT INTO renaser.rocas_diarias (participante_id, fecha, posicion, titulo, color, puntaje_impacto, eje, roca_semanal_id, hora_inicio, completada, completada_en, puntos_otorgados)
SELECT $U, $HOY, 1, 'Trotar', 'VERDE'::renaser.color_pareto, 5, 'CUERPO'::renaser.eje_objetivo, s.id, '05:00'::time, true, now(), 10 FROM renaser.rocas_semanales s WHERE s.roca_maestra_id=$CUERPO
UNION ALL SELECT $U, $HOY, 2, 'Vender', 'AMARILLA'::renaser.color_pareto, 5, 'CUERPO'::renaser.eje_objetivo, s.id, '06:00'::time, false, NULL, 0 FROM renaser.rocas_semanales s WHERE s.roca_maestra_id=$CUERPO
UNION ALL SELECT $U, $HOY, 3, 'Llamar', 'ROJA'::renaser.color_pareto, 5, 'CUERPO'::renaser.eje_objetivo, s.id, NULL::time, true, now(), 10 FROM renaser.rocas_semanales s WHERE s.roca_maestra_id=$CUERPO;
SQL
  ;;
  semana-sin-armar) psql_ <<SQL
BEGIN;
UPDATE renaser.participantes_programa SET fecha_inicio=$HOY, dia_programa=1, dia_programa_avanzado_el=$HOY, dias_ajuste_programa=0, programa_completado=false, programa_completado_en=NULL, dia_post_programa=0 WHERE usuario_id=$U;
UPDATE renaser.rocas_maestras SET avance=linea_base WHERE participante_id=$U AND linea_base IS NOT NULL;
DELETE FROM renaser.rocas_diarias WHERE participante_id=$U;
DELETE FROM renaser.rocas_semanales WHERE roca_maestra_id IN (SELECT id FROM renaser.rocas_maestras WHERE participante_id=$U);
COMMIT;
SQL
  ;;
  sin-objetivos) psql_ <<SQL
BEGIN;
UPDATE renaser.participantes_programa SET fecha_inicio=$HOY, dia_programa=1, dia_programa_avanzado_el=$HOY, dias_ajuste_programa=0, programa_completado=false, programa_completado_en=NULL, dia_post_programa=0 WHERE usuario_id=$U;
DELETE FROM renaser.rocas_diarias WHERE participante_id=$U;
DELETE FROM renaser.rocas_semanales WHERE roca_maestra_id IN (SELECT id FROM renaser.rocas_maestras WHERE participante_id=$U);
DELETE FROM renaser.rocas_maestras WHERE participante_id=$U;
COMMIT;
SQL
  ;;
  semana-sin-revisar) psql_ -c "UPDATE renaser.rocas_semanales SET autoevaluacion_fin=NULL, bloqueo_principal=NULL, correccion=NULL WHERE roca_maestra_id IN (SELECT id FROM renaser.rocas_maestras WHERE participante_id=$U)" ;;
  sql) psql_ -c "$2" ;;
  *) echo "uso: datos.sh semana-con-acciones|semana-armada|cierre-del-dia|semana-sin-armar|sin-objetivos|semana-sin-revisar|sql" >&2; exit 2 ;;
esac
