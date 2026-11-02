#!/bin/bash
# antes-del-flujo.sh <flujo.yaml>...: corre la línea `# antes: <comando>` que un flujo trae arriba (si la trae), desde la raíz del repo.
# La usa `correr.sh`; otro corredor (un lote que no pase por `correr.sh`) la llama antes de cada flujo para que el flujo parta del estado de
# datos que necesita aunque el anterior lo haya dejado distinto (ver `estado-de-hoy.sh` y `evento-de-prueba.sh`). Solo base LOCAL de pruebas.
# Un fallo del paso previo se dice en la salida de error, pero no corta: el flujo corre igual y mostrará qué faltaba.
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
for f in "$@"; do
  antes=$(grep -m1 '^# antes: ' "$f" | sed 's/^# antes: //')
  [ -n "$antes" ] || continue
  echo "  antes: $antes"
  ( cd "$RAIZ" && bash -c "$antes" ) || echo "  (el paso previo falló; el flujo corre igual)" >&2
done
exit 0
