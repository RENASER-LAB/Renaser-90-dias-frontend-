-- E2E de la spec 057 (rol de mentor, fase 2), SOLO en una base local clonada. Nunca producción.
-- Uso: psql -f siembra.sql sobre una base que ya tenga la siembra de `../rediseno-del-mentor/siembra.sql` (e2e-mentor con la clave común).
-- «Grupo Plan E2E» queda en curso (período hasta fin de año) para que Api Aprendiz E2E, que tiene objetivos del programa, se abra desde
-- «Mi grupo»; los demás tramos cerrados de e2e-mentor (Grupo del mentor, rotación y destino) siguen en «Anteriores».
UPDATE renaser.celulas SET periodo_fin = date '2026-12-31' WHERE id = '67ab6d9c-6b21-4791-b65a-24479e1f493f';
