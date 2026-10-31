-- E2E de la spec 020 (Mentoría del Alquimista solo con semáforo verde), SOLO en una base local clonada. Nunca producción.
-- Uso: psql -v h="<hash de la contraseña común de ~/.config/renaser-e2e/habitos-por-rol.json>" -f siembra.sql
-- Deja a e2e-ap-emu en verde (10 de 10 los últimos 7 días) y a e2e-ap-web en amarillo (7 de 10); bloquea el barrido horario del semáforo 6 h.
UPDATE renaser.usuarios SET hash_contrasena = :'h', contrasena_actualizada_en = now()
 WHERE email IN ('e2e-ap-emu@renaser.test','e2e-ap-web@renaser.test','e2e-mentor@renaser.test','e2e-admin@renaser.test');
-- Que el barrido horario del semaforo no pise lo sembrado durante la prueba.
INSERT INTO renaser.shedlock (name, lock_until, locked_at, locked_by)
VALUES ('points-cerrar-semaforo', now() + interval '6 hours', now(), 'e2e-020')
ON CONFLICT (name) DO UPDATE SET lock_until = now() + interval '6 hours', locked_at = now(), locked_by = 'e2e-020';
-- Siete dias cerrados (hoy en Lima menos 7 a menos 1): verde = 10 de 10, amarillo = 7 de 10.
DELETE FROM renaser.semaforo_dias WHERE participante_id IN
  (SELECT id FROM renaser.usuarios WHERE email IN ('e2e-ap-emu@renaser.test','e2e-ap-web@renaser.test'));
INSERT INTO renaser.semaforo_dias (participante_id, fecha, habitos_programados, habitos_cumplidos, objetivos_programados, objetivos_cumplidos, calculado_en)
SELECT u.id, (now() AT TIME ZONE 'America/Lima')::date - d, 10, CASE u.email WHEN 'e2e-ap-emu@renaser.test' THEN 10 ELSE 7 END, 0, 0, now()
  FROM renaser.usuarios u, generate_series(1, 7) AS d
 WHERE u.email IN ('e2e-ap-emu@renaser.test','e2e-ap-web@renaser.test');
