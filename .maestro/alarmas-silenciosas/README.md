# Alarmas silenciosas (2026-10-31)

Decisión del dueño: la hoja «Tu teléfono cerró Renaser» se quita. La app vuelve a poner las alarmas sola, sin decir
nada (`RearmadorDeAlarmas`), y el push de respaldo del servidor cubre el primer aviso de cada hábito mientras tanto. La
guía de batería queda solo en Yo → Alarmas («Para que tus recordatorios suenen siempre», botón «Revisar»).

**Escritos y todavía sin correr.** Se corren de a uno: `.maestro/correr.sh .maestro/alarmas-silenciosas/<flujo>.yaml`.

| Flujo | Qué prueba |
| --- | --- |
| `01-cerrar-a-la-fuerza-y-reabrir.yaml` | `am force-stop` y abrir la app: no aparece ninguna hoja. |
| `02-yo-alarmas-guia-en-positivo.yaml` | Yo → Alarmas muestra «Para que tus recordatorios suenen siempre» y «Revisar». |

## Que las alarmas sigan puestas (a mano, junto al flujo 01)

Maestro no corre comandos del sistema, así que esto se mira con `adb` antes y después del flujo:

1. Con la cuenta adentro y recordatorios puestos, antes de correr el flujo:
   `adb shell dumpsys alarm | grep -c com.renaser.app` → un número mayor que 0.
2. Mientras corre (o justo después de que `stopApp` cierra la app) el número baja a 0: Android borró las alarmas.
3. Unos segundos después de reabrir, el mismo comando vuelve a dar un número mayor que 0: la app las puso otra vez.

La otra forma de mirarlo: en la app, Yo → Alarmas → «Alarma a las HH:MM» de Despertar sigue ahí.

## Límite del flujo 01

`correr.sh` abre la sesión por adb porque Maestro se traba con la animación de arranque de la build de desarrollo
(Maestro #3667). `launchApp` después de `stopApp` puede tardar los ~10 s por toque que se describen en el README de arriba:
si pasa, cerrar con `adb shell am force-stop com.renaser.app`, abrir con `adb shell monkey -p com.renaser.app -c
android.intent.category.LAUNCHER 1` y correr desde el segundo `ya-adentro` del flujo.
