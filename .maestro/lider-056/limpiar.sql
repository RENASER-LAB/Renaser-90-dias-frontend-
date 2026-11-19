-- Devuelve la base local de pruebas a como estaba antes de los flujos 04 y 08 de la spec 056. SOLO en `renaser_e2e_056` (base local clonada). Nunca producción.
-- Uso:  docker exec -i renaser-db psql -U postgres -d renaser_e2e_056 < .maestro/lider-056/limpiar.sql
-- Es idempotente: si no hay nada que revertir, no hace nada.
SET search_path = renaser;

-- Flujo 04: borra el grupo «E2E 056 M» y deja otra vez sin grupo a sus aprendices.
UPDATE participantes_programa SET celula_id = NULL
 WHERE celula_id IN (SELECT id FROM celulas WHERE nombre = 'E2E 056 M');
-- (la conversación del grupo se lleva sus mensajes y participantes: ON DELETE CASCADE)
DELETE FROM conversaciones WHERE celula_id IN (SELECT id FROM celulas WHERE nombre = 'E2E 056 M');
DELETE FROM asignaciones_celula WHERE celula_id IN (SELECT id FROM celulas WHERE nombre = 'E2E 056 M');
DELETE FROM celulas WHERE nombre = 'E2E 056 M';

-- Flujo 08: «Célula Aurora (PRUEBA)» vuelve a no tener mentor.
DELETE FROM asignaciones_celula WHERE celula_id = '22222222-2222-4222-8222-222222222222' AND funcion = 'MENTOR' AND fin IS NULL;
UPDATE celulas SET mentor_id = NULL WHERE id = '22222222-2222-4222-8222-222222222222';
