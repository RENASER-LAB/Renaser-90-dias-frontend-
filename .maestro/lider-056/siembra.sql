-- E2E de la spec 056 (rediseño del líder de mentores), SOLO en una base local clonada (renaser_e2e_056). Nunca producción.
-- Uso:  docker exec -i renaser-db psql -U postgres -d renaser_e2e_056 < .maestro/lider-056/siembra.sql
-- Es idempotente. Revertirlo (y lo que dejan los flujos 04 y 08): `limpiar.sql`.
SET search_path = renaser;

-- Flujo 03: dos hábitos de HOY de E2E Aprendiz cumplidos, cada uno con una evidencia de texto, para el ojo de la ficha (la misma siembra de la 055).
DELETE FROM evidencias WHERE contenido_texto LIKE '[e2e-056]%' OR contenido_texto LIKE '[e2e-055]%';
WITH hoy AS (
  SELECT r.id, h.titulo
    FROM registros_habito r
    JOIN habitos h ON h.id = r.habito_id
    JOIN usuarios u ON u.id = r.participante_id
   WHERE u.email = 'e2e-aprendiz@renaser.test'
     AND r.fecha_ejecucion = (now() AT TIME ZONE 'America/Lima')::date
     AND h.titulo IN ('DESPERTAR', 'AGUA TIBIA CON LIMÓN')
), cumplidos AS (
  UPDATE registros_habito r SET estado = 'COMPLETADO', completado_en = now() - interval '2 hours', actualizado_en = now()
    FROM hoy WHERE r.id = hoy.id RETURNING r.id, r.participante_id
)
INSERT INTO evidencias (participante_id, registro_habito_id, tipo, contenido_texto, subida_en)
SELECT c.participante_id, c.id, 'TEXTO', '[e2e-056] Me levanté a las 6 y tomé agua tibia con limón.', now() - interval '2 hours'
  FROM cumplidos c;
