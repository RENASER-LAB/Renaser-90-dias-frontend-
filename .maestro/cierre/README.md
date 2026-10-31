# «Cierra tu día» (spec 017, corregida el 2026-10-30)

- `01-cerrar-el-dia.yaml`: la fila al final de hoy, la hoja que pregunta por lo que ya llegó a su hora, guardar y la fila en verde.
  Pide el día sin cerrar y las dos acciones de su precondición. Se corre con `.maestro/correr.sh .maestro/cierre/01-cerrar-el-dia.yaml`.

Lo que Maestro no puede hacer —cambiar la hora del servidor— se probó a mano contra un backend con reloj de prueba
(06:00 no pregunta por una acción de las 20:30; 21:00 sí; 23:50, 00:30 y 02:00 de quien trabaja de noche; cierre temprano y
luego cumplir): las capturas y el informe están en `~/.config/renaser-e2e/capturas-notas/cierre-017b/`.
