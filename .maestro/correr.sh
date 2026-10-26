#!/bin/bash
# Corre la suite de regresión de Maestro en el emulador, flujo por flujo, en local (nunca contra producción).
#
# Uso:  E2E_APRENDIZ_EMAIL=… E2E_APRENDIZ_PASSWORD=… E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… .maestro/correr.sh [flujo…]
#       Sin argumentos corre todo .maestro/regresion/ en orden. Cada flujo dice arriba `# cuenta: aprendiz|admin|soporte`.
#       Los flujos `# cuenta: soporte` (consola Soporte TI, spec 002 fase 2) piden además E2E_SOPORTE_EMAIL y
#       E2E_SOPORTE_PASSWORD; la contraseña llega al flujo como `CONTRASENA` (desbloquea la consola).
#
# Por qué la sesión se abre acá, por adb, y no con `launchApp` + `inputText` de Maestro (Maestro #3667, abierto al
# 2026-10-13): la build de desarrollo tarda más de 2 s en tomar la pantalla de bienvenida de Android, el sistema deja
# trabada una animación `starting_reveal` en la actividad y el driver de Maestro espera esa animación en cada toque y en
# cada letra (~10 s cada uno). Un correo de 40 letras pasa el límite de 120 s y `inputText` nunca termina. `adb shell
# input` no espera esa animación. Los toques de Maestro siguen tardando ~10 s, por eso los textos de los flujos son
# cortos. (Recrear la actividad soltaba la animación, pero rompía la cámara de expo-image-picker.)
set -u
cd "$(dirname "$0")/.."
APP=com.renaser.app
SALIDA=${MAESTRO_SALIDA:-/tmp/maestro-renaser}
for v in E2E_APRENDIZ_EMAIL E2E_APRENDIZ_PASSWORD E2E_ADMIN_EMAIL E2E_ADMIN_PASSWORD; do
  [ -n "${!v:-}" ] || { echo "Falta la variable $v" >&2; exit 2; }
done

vista() {
  adb shell rm -f /sdcard/renaser-vista.xml
  timeout 20 adb shell uiautomator dump /sdcard/renaser-vista.xml >/dev/null 2>&1
  adb shell cat /sdcard/renaser-vista.xml 2>/dev/null
}

# Centro de un elemento de la vista por resource-id o content-desc: "x y".
centro() {
  vista | python3 -c "
import re,sys
x=sys.stdin.read(); m=re.search(r'(?:resource-id|content-desc)=\"$1\"[^>]*?bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"',x)
print((int(m.group(1))+int(m.group(3)))//2, (int(m.group(2))+int(m.group(4)))//2) if m else None"
}

esperar() { # esperar <patrón> <intentos>
  for _ in $(seq 1 "$2"); do vista | grep -qE "$1" && return 0; sleep 3; done
  return 1
}

# adb shell input text: los espacios van como %s y los caracteres del shell, escapados. En tandas de 3 letras con una
# pausa: de una sola vez (y a veces en tandas de 6) el teclado se comía letras y la contraseña llegaba incompleta.
escribir() {
  local texto=$1 i
  for ((i = 0; i < ${#texto}; i += 3)); do
    adb shell input text "$(printf '%s' "${texto:i:3}" | sed -e 's/[][\\&|;<>()$`"'"'"' *?#~!{}]/\\&/g' -e 's/ /%s/g')"
    sleep 0.5
  done
}

# El backend limita el login a 10 intentos por hora por correo y origen, y a 50 por IP (AutenticacionService). La suite
# entra una vez por flujo, más los reintentos: con E2E_LIMPIAR_LIMITE_LOCAL=1 se reinician esos contadores en el Redis
# LOCAL (contenedor renaser-redis) antes de cada entrada. Nunca contra otro entorno: sin ese contenedor no hace nada.
limpiar_limite_local() { # limpiar_limite_local <correo>
  [ "${E2E_LIMPIAR_LIMITE_LOCAL:-0}" = 1 ] || return 0
  docker exec renaser-redis redis-cli del "reset-password:rl:login:origen-email:127.0.0.1|$1" \
    "reset-password:rl:login:ip:127.0.0.1" >/dev/null 2>&1 || true
}

intento_de_entrar() { # intento_de_entrar <correo> <clave>
  limpiar_limite_local "$1"
  adb shell pm clear "$APP" >/dev/null
  adb reverse tcp:8081 tcp:8081 >/dev/null
  adb reverse tcp:9002 tcp:9002 >/dev/null 2>&1
  adb shell monkey -p "$APP" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  esperar 'resource-id="campo-email"' 40 || { echo "no apareció el login" >&2; return 1; }
  sleep 2                              # termina la entrada escalonada del login (< 400 ms) con margen
  adb shell input tap $(centro campo-email); sleep 1
  escribir "$1"
  # Al abrirse el teclado el formulario sube: la posición de la contraseña ya no es la de antes. Se pasa con la tecla
  # de acción del correo, que lleva a la contraseña.
  adb shell input keyevent 66; sleep 1
  escribir "$2"
  adb shell input keyevent 66          # la tecla de acción de la contraseña envía
  sleep 8
  # Con el teclado abierto `uiautomator dump` se cuelga; si entró, ya no hay teclado. Si sigue el login, no entró.
  ! vista | grep -qE 'resource-id="campo-email"|contraseña incorrectos'
}

entrar() { # entrar <correo> <clave>: un reintento si no entró (la causa típica es una letra perdida al tipear)
  intento_de_entrar "$1" "$2" && return 0
  echo "  (reintento de entrada)"
  intento_de_entrar "$1" "$2" && return 0
  mkdir -p "$SALIDA"
  adb exec-out screencap -p > "$SALIDA/no-entro-$(date +%H%M%S).png"
  echo "  no entró: captura en $SALIDA" >&2
  return 1
}

tapar() {
  local soporte=${E2E_SOPORTE_PASSWORD:-}
  sed -u -e "s/${E2E_APRENDIZ_PASSWORD//\//\\/}/••••/g" -e "s/${E2E_ADMIN_PASSWORD//\//\\/}/••••/g" \
    ${soporte:+-e "s/${soporte//\//\\/}/••••/g"}
}

# Android deja un solo cliente de automatización a la vez: el servidor de mobile-mcp (mobilecli) en el teléfono bloquea
# `uiautomator dump` y el driver de Maestro. Se cierra; mobile-mcp lo vuelve a abrir solo cuando se lo usa.
for pid in $(adb shell ps -A -o PID,ARGS 2>/dev/null | grep -i 'mobilecli' | grep -v grep | awk '{print $1}'); do
  adb shell kill "$pid" 2>/dev/null
done

flujos=("$@")
[ ${#flujos[@]} -gt 0 ] || flujos=(.maestro/regresion/*.yaml)
ok=0; mal=0; malos=()
for f in "${flujos[@]}"; do
  echo "▶ $(basename "$f")"
  extra=()
  if grep -q '^# cuenta: admin' "$f"; then
    correo=$E2E_ADMIN_EMAIL; clave=$E2E_ADMIN_PASSWORD
  elif grep -q '^# cuenta: soporte' "$f"; then
    if [ -z "${E2E_SOPORTE_EMAIL:-}" ] || [ -z "${E2E_SOPORTE_PASSWORD:-}" ]; then
      echo "  falta E2E_SOPORTE_EMAIL / E2E_SOPORTE_PASSWORD para $(basename "$f")" >&2
      mal=$((mal+1)); malos+=("$(basename "$f")"); echo "✘ $(basename "$f")"; continue
    fi
    correo=$E2E_SOPORTE_EMAIL; clave=$E2E_SOPORTE_PASSWORD; extra=(-e "CONTRASENA=$E2E_SOPORTE_PASSWORD")
  else
    correo=$E2E_APRENDIZ_EMAIL; clave=$E2E_APRENDIZ_PASSWORD
  fi
  estado=1
  if entrar "$correo" "$clave"; then
    ~/.maestro/bin/maestro test "${extra[@]}" "$f" --test-output-dir "$SALIDA" 2>&1 | tapar | grep -E "COMPLETED|FAILED|Flow "
    estado=${PIPESTATUS[0]}
  fi
  if [ "$estado" -eq 0 ]; then
    ok=$((ok+1)); echo "✔ $(basename "$f")"
  else
    mal=$((mal+1)); malos+=("$(basename "$f")"); echo "✘ $(basename "$f")"
  fi
done
echo "Resultado: $ok bien, $mal mal ${malos[*]:-}"
[ "$mal" -eq 0 ]
