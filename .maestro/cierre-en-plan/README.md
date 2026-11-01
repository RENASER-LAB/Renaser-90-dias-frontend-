# «Cierra tu día» en Plan (spec 033; antes en Training, spec 017)

- `01-cerrar-el-dia-desde-plan.yaml`: la tarjeta bajo «Acciones que mueven la meta», la hoja que pregunta por lo que ya llegó
  a su hora, guardar, la tarjeta en verde y «Ver mañana en Plan». Pide el Mapa activo, el día sin cerrar y las dos acciones de
  su precondición.
- `02-dias-anteriores-solo-lectura.yaml`: «Tus cierres de la semana»; tocar un día anterior lo lee y nunca ofrece cerrarlo.
- `03-training-ya-no-tiene-el-cierre.yaml`: Training no muestra «Cierra tu día».

**Escritos y sin correr.** Se corren de a uno con `.maestro/correr.sh .maestro/cierre-en-plan/<flujo>.yaml`.

Lo que Maestro no puede hacer —cambiar la hora del servidor— se probó a mano contra un backend con reloj de prueba cuando el
cierre vivía en Training (06:00 no pregunta por una acción de las 20:30; 21:00 sí; 23:50, 00:30 y 02:00 de quien trabaja de
noche; cierre temprano y luego cumplir): las capturas y el informe están en `~/.config/renaser-e2e/capturas-notas/cierre-017b/`.
La hoja y el servidor son los mismos, así que esas pruebas siguen valiendo; en Jest las cubre `cierreEnPlan`.
