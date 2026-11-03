# Tu 80/20 con IA (spec 031)

- `01-la-hoja-trae-semana-y-mes.yaml`: Plan → «Tu 80/20» abre en «Hoy» (la regla de Pareto de siempre) y ofrece Semana y Mes con las
  cifras de todos los ejes; cada periodo se puede recorrer con las flechas.
- `02-el-analisis-listo.yaml`: el periodo cerrado con su análisis: las cuatro partes en orden, «Para la próxima semana» y de dónde viene.
  Pide un análisis LISTO sembrado en la base local (ver su precondición).
- `03-el-aviso-abre-la-hoja.yaml`: tocar el aviso «Tu análisis de la semana está listo» abre Plan con la hoja en «Semana».
- `04-el-mentor-lo-ve-en-la-ficha.yaml`: la ficha del aprendiz muestra «Tu 80/20» al mentor con «Código Renaser en las fichas» encendido
  y no la muestra cuando se apaga (spec 034).

**Escritos y sin correr.** Se corren de a uno con `.maestro/correr.sh .maestro/analisis-80-20/<flujo>.yaml`, contra el backend local con la
base clonada (nunca producción). El texto del análisis lo escribe la IA: el flujo 02 no depende de sus palabras sino de los títulos de las
cuatro partes, que son fijos. Para no gastar IA en el E2E se siembra una fila `analisis_80_20` en estado `LISTO` (o se corre el barrido con
`GenerarAnalisis8020Port` en doble de prueba).
