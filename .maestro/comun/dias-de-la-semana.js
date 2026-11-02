// Los días de la semana de Training respecto de HOY (zona del teléfono y del servidor: Lima), para flujos que no pueden
// escribir una fecha fija. Lo usa `runScript: ../comun/dias-de-la-semana.js`; deja en `output`:
//   hoy        «Lunes 2, hoy»      (el nombre accesible de la pastilla de hoy)
//   ayer       «Domingo 1»         (si hay día anterior en la semana; la semana va de lunes a domingo)
//   manana     «Martes 3»          (si hay día que viene en la semana)
//   hayAnterior / hayPosterior     'si' | 'no' (lunes no tiene anterior; domingo no tiene posterior)
//   lunes / domingo                el primero y el último de la semana
var NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
function nombre(fecha) { return NOMBRES[fecha.getDay()] + ' ' + fecha.getDate(); }
function desplazar(fecha, dias) { var f = new Date(fecha.getTime()); f.setDate(f.getDate() + dias); return f; }

var hoy = new Date();
var indice = (hoy.getDay() + 6) % 7; // 0 = lunes … 6 = domingo
output.hoy = nombre(hoy) + ', hoy';
output.ayer = nombre(desplazar(hoy, -1));
output.manana = nombre(desplazar(hoy, 1));
output.lunes = nombre(desplazar(hoy, -indice));
output.domingo = nombre(desplazar(hoy, 6 - indice));
output.hayAnterior = indice > 0 ? 'si' : 'no';
output.hayPosterior = indice < 6 ? 'si' : 'no';
