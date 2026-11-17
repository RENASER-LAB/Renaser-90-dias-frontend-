-- E2E de la spec 055 (rediseño del rol de mentor, fase 1), SOLO en una base local clonada. Nunca producción.
-- Uso: psql -v h="<hash de la contraseña común de ~/.config/renaser-e2e/habitos-por-rol.json>" -f siembra.sql
-- Deja a e2e-mentor con la contraseña común y al grupo «Cupo [e2e-piso-1314]» con aprendices de colores distintos en los últimos 7
-- días (rojo, ámbar, verde y uno sin datos). Los hábitos con evidencia, los días 78 y las notas se arman con la base `renaser_e2e_048`
-- (ver `specs/055-rediseno-del-mentor/quickstart.md` del backend).
UPDATE renaser.usuarios SET hash_contrasena = :'h', contrasena_actualizada_en = now()
 WHERE email IN ('e2e-mentor@renaser.test','e2e-lider@renaser.test','e2e-admin@renaser.test','e2e-aprendiz@renaser.test');
-- Que el barrido horario del semáforo no pise lo sembrado durante la prueba.
INSERT INTO renaser.shedlock (name, lock_until, locked_at, locked_by)
VALUES ('points-cerrar-semaforo', now() + interval '6 hours', now(), 'e2e-055')
ON CONFLICT (name) DO UPDATE SET lock_until = now() + interval '6 hours', locked_at = now(), locked_by = 'e2e-055';
-- Las notas de pruebas anteriores no se mezclan con las de esta corrida (la tabla existe desde la migración de la spec 055).
DELETE FROM renaser.notas_del_mentor_versiones;
DELETE FROM renaser.notas_del_mentor;
-- Flujo 03 (evidencia): dos hábitos de HOY de E2E Aprendiz cumplidos, cada uno con una evidencia de texto, para el ojo y para
-- «anterior / siguiente». Idempotente: borra antes las evidencias sembradas por este bloque.
DELETE FROM renaser.evidencias WHERE contenido_texto LIKE '[e2e-055]%';
WITH hoy AS (
  SELECT r.id, h.titulo, row_number() OVER (ORDER BY h.orden) n
    FROM renaser.registros_habito r
    JOIN renaser.habitos h ON h.id = r.habito_id
    JOIN renaser.usuarios u ON u.id = r.participante_id
   WHERE u.email = 'e2e-aprendiz@renaser.test'
     AND r.fecha_ejecucion = (now() AT TIME ZONE 'America/Lima')::date
     AND h.titulo IN ('DESPERTAR', 'AGUA TIBIA CON LIMÓN')
), cumplidos AS (
  UPDATE renaser.registros_habito r SET estado = 'COMPLETADO', completado_en = now() - interval '2 hours', actualizado_en = now()
    FROM hoy WHERE r.id = hoy.id RETURNING r.id, r.participante_id
)
INSERT INTO renaser.evidencias (participante_id, registro_habito_id, tipo, contenido_texto, subida_en)
SELECT c.participante_id, c.id, 'TEXTO', '[e2e-055] Me levanté a las 6 y tomé agua tibia con limón.', now() - interval '2 hours'
  FROM cumplidos c;
