-- Escenarios de prueba para la suite E2E. Base LOCAL, nunca producción.
--
-- Se ejecuta con el hash de contraseña como parámetro, para no dejar ninguna credencial escrita
-- en el repositorio:
--
--   psql ... -v hash="'{bcrypt}\$2a\$10\$...'" -f escenarios.sql
--
-- Es IDEMPOTENTE y además LIBERA a los aprendices al empezar. Eso segundo no es un detalle: cada
-- corrida de la suite asigna gente a los grupos que crea, así que sin liberarlos la reserva se
-- agota y E05 —que necesita once libres para forzar el rechazo del doceavo— empieza a saltearse
-- después de un par de ejecuciones. Una prueba que solo funciona la primera vez no es una prueba.

BEGIN;

-- ── 1. Liberar a los aprendices de corridas anteriores ─────────────────────
-- El historial de asignaciones se BORRA, no se cierra: son grupos de prueba que ya no existen o
-- que no le importan a nadie. En datos reales esto se cerraría, jamás se borraría.
DELETE FROM renaser.asignaciones_celula
WHERE usuario_id IN (SELECT id FROM renaser.usuarios WHERE email LIKE 'e2e-libre%');

UPDATE renaser.participantes_programa
SET celula_id = NULL, mentor_id = NULL
WHERE usuario_id IN (SELECT id FROM renaser.usuarios WHERE email LIKE 'e2e-libre%');

-- ── 2. Veinte aprendices activos y sin grupo ───────────────────────────────
INSERT INTO renaser.usuarios (id, email, nombre_completo, rol, estado, hash_contrasena)
SELECT ('e2e1' || lpad(i::text, 4, '0') || '-0000-4000-8000-00000000' || lpad(i::text, 4, '0'))::uuid,
       'e2e-libre' || lpad(i::text, 2, '0') || '@renaser.test',
       'E2E Libre ' || lpad(i::text, 2, '0'),
       CAST('APRENDIZ' AS renaser.rol_usuario), 'ACTIVO', :hash
FROM generate_series(1, 20) i
ON CONFLICT (id) DO NOTHING;

INSERT INTO renaser.participantes_programa (usuario_id, fecha_inicio, dia_programa, programa_activado_en)
SELECT ('e2e1' || lpad(i::text, 4, '0') || '-0000-4000-8000-00000000' || lpad(i::text, 4, '0'))::uuid,
       CURRENT_DATE - 10, 10, now()
FROM generate_series(1, 20) i
ON CONFLICT (usuario_id) DO NOTHING;

-- ── 3. Grupo del mentor, con dos alumnos vigentes ──────────────────────────
-- Lo necesitan E08 (comparar la semana administrativa con la del mentor) y E15c (que el guard del
-- mentor siga negando sobre un alumno ajeno).
INSERT INTO renaser.celulas (id, nombre, cohorte_id, tipo, periodo_inicio, periodo_fin, mentor_id)
SELECT 'e2e22220-0000-4000-8000-000000000001', 'Grupo del mentor E2E', c.id,
       CAST('REGULAR' AS renaser.tipo_celula), CURRENT_DATE - 5, CURRENT_DATE + 25,
       'e2e00000-0000-4000-8000-000000000003'
FROM renaser.cohortes c WHERE c.estado = 'ACTIVA' ORDER BY c.creado_en DESC LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- El mentor va al HISTORIAL, que es de donde leen el chat y el seguimiento. El puntero de
-- `celulas.mentor_id` no alcanza: esa fue exactamente la causa de E-177.
INSERT INTO renaser.asignaciones_celula (id, celula_id, usuario_id, funcion, inicio, motivo, clave_operacion)
VALUES ('e2e33330-0000-4000-8000-000000000001', 'e2e22220-0000-4000-8000-000000000001',
        'e2e00000-0000-4000-8000-000000000003', CAST('MENTOR' AS renaser.funcion_acompanamiento),
        now() - interval '5 days', CAST('ADMINISTRATIVO' AS renaser.motivo_asignacion), 'e2e-seed-mentor')
ON CONFLICT DO NOTHING;

INSERT INTO renaser.asignaciones_celula (id, celula_id, usuario_id, funcion, inicio, motivo, clave_operacion)
SELECT ('e2e33330-0000-4000-8000-00000000001' || i::text)::uuid,
       'e2e22220-0000-4000-8000-000000000001',
       ('e2e1' || lpad(i::text, 4, '0') || '-0000-4000-8000-00000000' || lpad(i::text, 4, '0'))::uuid,
       CAST('APRENDIZ' AS renaser.funcion_acompanamiento), now() - interval '5 days',
       CAST('ADMINISTRATIVO' AS renaser.motivo_asignacion), 'e2e-seed-alumno-' || i::text
FROM generate_series(1, 2) i
ON CONFLICT DO NOTHING;

UPDATE renaser.participantes_programa
SET celula_id = 'e2e22220-0000-4000-8000-000000000001',
    mentor_id = 'e2e00000-0000-4000-8000-000000000003'
WHERE usuario_id IN (
  SELECT ('e2e1' || lpad(i::text, 4, '0') || '-0000-4000-8000-00000000' || lpad(i::text, 4, '0'))::uuid
  FROM generate_series(1, 2) i);

-- ── 4. Grupo ya cerrado ────────────────────────────────────────────────────
-- E13: administración lo sigue consultando aunque el aprendiz ya no lo vea.
INSERT INTO renaser.celulas (id, nombre, cohorte_id, tipo, periodo_inicio, periodo_fin)
SELECT 'e2e22220-0000-4000-8000-000000000002', 'Grupo cerrado E2E', c.id,
       CAST('REGULAR' AS renaser.tipo_celula), CURRENT_DATE - 40, CURRENT_DATE - 7
FROM renaser.cohortes c WHERE c.estado = 'ACTIVA' ORDER BY c.creado_en DESC LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ── 5. Dos cuentas administrativas que NUNCA iniciaron su programa ────────
-- Las necesita E02, que mide la invitación al programa propio: esa invitación solo existe para
-- quien todavía puede iniciarlo, y E02b activa el de la cuenta principal a propósito.
--
-- Antes esto se resolvía BORRÁNDOLE la participación a `e2e-admin` en cada siembra. Funcionaba
-- para la prueba y arruinaba todo lo demás: sin fila de programa, cada carga de Hoy pedía datos
-- inexistentes y el log del backend se llenaba de 404 que no eran un fallo de nada. Mutar la
-- cuenta principal para satisfacer un caso era el error; el caso se trae las suyas.
--
-- Nacen SIN fila en `participantes_programa`: eso es justo lo que las hace útiles.
INSERT INTO renaser.usuarios (id, email, nombre_completo, rol, estado, hash_contrasena) VALUES
  ('e2e44440-0000-4000-8000-000000000001', 'e2e-nuevo-admin@renaser.test', 'E2E Admin sin programa',
   CAST('ADMIN' AS renaser.rol_usuario), 'ACTIVO', :hash),
  ('e2e44440-0000-4000-8000-000000000002', 'e2e-nuevo-alq@renaser.test', 'E2E Alquimista sin programa',
   CAST('ALQUIMISTA' AS renaser.rol_usuario), 'ACTIVO', :hash)
ON CONFLICT (id) DO NOTHING;

-- Y se les quita el programa si alguna corrida anterior se lo activó: son de un solo uso.
DELETE FROM renaser.participantes_programa
WHERE usuario_id IN ('e2e44440-0000-4000-8000-000000000001',
                     'e2e44440-0000-4000-8000-000000000002');

-- ── 6. Devolverle la participación a las cuentas principales ──────────────
-- Reparación de la versión anterior de este archivo, que se la borraba. Sin esto, `e2e-admin`
-- sigue generando 404 en cada pantalla que consulta el programa.
INSERT INTO renaser.participantes_programa (usuario_id, fecha_inicio, dia_programa, programa_activado_en)
VALUES ('e2e00000-0000-4000-8000-000000000001', CURRENT_DATE - 10, 10, now()),
       ('e2e00000-0000-4000-8000-000000000002', CURRENT_DATE - 10, 10, now())
ON CONFLICT (usuario_id) DO NOTHING;

COMMIT;
