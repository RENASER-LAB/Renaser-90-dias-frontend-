#!/bin/bash
# evento-de-prueba.sh "<TÍTULO EXACTO>" <minutos>: pone el comienzo del evento de prueba a <minutos> desde ahora (puede ser negativo), en la base
# LOCAL de pruebas. Sirve a los flujos que miran un evento «de hoy» (training-por-hora/08): el evento sembrado tiene una hora fija y, pasada
# esa hora y su duración, sale de la lista de hoy ("los eventos terminados salen"). Mismas variables y mismo seguro que `estado-de-hoy.sh`
# (E2E_CONTENEDOR, E2E_BASE: nunca una base que no empiece con `renaser_e2e`). Imprime cuántos eventos movió.
set -eu
TITULO=${1:?falta el título del evento}; MIN=${2:?faltan los minutos desde ahora}
case "$MIN" in -[0-9]*|[0-9]*) ;; *) echo "minutos no numéricos: $MIN" >&2; exit 2;; esac
CONTENEDOR=${E2E_CONTENEDOR:-renaser-db}
BASE=${E2E_BASE:-renaser_e2e_final}
case "$BASE" in renaser_e2e*) ;; *) echo "la base $BASE no es de pruebas (renaser_e2e*)" >&2; exit 2;; esac
t=${TITULO//\'/\'\'}
n=$(docker exec -i "$CONTENEDOR" psql -U postgres -d "$BASE" -At -c "set search_path=renaser;
  update eventos set inicia_en = now() + interval '$MIN minutes', estado='PUBLICADO' where titulo='$t'" | grep -E '^UPDATE ' | tail -1)
echo "evento ${TITULO} a ${MIN} min: ${n:-UPDATE 0}"
