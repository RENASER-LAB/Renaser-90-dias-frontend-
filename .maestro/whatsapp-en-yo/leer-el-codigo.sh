#!/usr/bin/env bash
# Imprime el último código de 6 dígitos que el YCloud FALSO (127.0.0.1:9099) anotó para un número: `leer-el-codigo.sh +51987654321`.
# Solo para el E2E local: el YCloud falso nunca sale a internet.
set -euo pipefail
NUMERO=${1:?número en formato internacional, por ejemplo +51987654321}
ARCHIVO=${ENVIOS:-$HOME/.config/renaser-e2e/herramientas/ycloud-falso/envios.jsonl}
python3 -I - "$NUMERO" "$ARCHIVO" <<'PY'
import json, sys
numero, archivo = sys.argv[1], sys.argv[2]
codigo = None
for linea in open(archivo, encoding='utf-8'):
    try:
        fila = json.loads(linea)
    except ValueError:
        continue
    if fila.get('to') == numero and fila.get('plantilla') == 'renaser_codigo_v1':
        codigo = fila['cuerpo']['template']['components'][0]['parameters'][0]['text']
if not codigo:
    sys.exit('el YCloud falso no anotó ningún código para ese número')
print(codigo)
PY
