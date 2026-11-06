# Cronograma de pagos y «Mi ingreso» (spec 032)

Historial de lo que el dueño autorizó, decidió o se corrigió en esta parte de la app. Se movió **tal cual** desde
`AGENTS.md` el 2026-11-06 (antes ocupaba más de 6000 líneas que cada sesión cargaba entera) y quedó ordenado por
fecha, de la más vieja a la más nueva. Es **historia**: si una entrada choca con una más nueva, vale la más nueva
(muchas llevan su nota `> **Corregido …**`). Lo vigente para trabajar está en `AGENTS.md`; el índice de todas las
entradas, con los tabs que nombra cada una, en [`README.md`](README.md). Cuando una entrada dice «más arriba» o
«ver la entrada de …», búscala en el índice por su fecha y su título.

## Cambio por pedido del dueño — 2026-11-01 — cronograma de pagos: «Mi ingreso» en Yo, el bloque «Pago» al aceptar, los pagos en la ficha y los recordatorios de pago (spec 032)

Pedido del dueño (textual, con su maqueta «Mi ingreso»): «al momento de solicitud del usuario sin cronograma o con cronograma de pagos; sin cronograma es que pagó y en Yo debe de salir su pago fue cancelado;
con cronograma de pagos se calendariza de esta forma [la maqueta]… es por fecha como sale la cantidad y el administrador o alquimista puede decir se pagó o no… si es cronograma le debe de salir en Yo su
cronograma y debe de tener recordatorios… si no paga no pasa nada, no se inhabilita la cuenta, ya que gerencia decidió eso… que le salga en Yo los recordatorios y probar los recordatorios». **La app no cobra
ni mueve dinero: solo anota.** Backend D-307 (`specs/032-cronograma-de-pagos/`, V158). Todo vive en `src/features/pagos/`. Lo que cambia y nada más:
* **Yo → fila «Mi ingreso»** (`FilaDeAjuste`, ícono `wallet` nuevo —Lucide, caja de 24, `s24`—, después de «Mi diagnóstico»): **solo si el servidor dice que hay un pago anotado** (`GET /api/v1/me/ingreso` con
  `payments` distinto de `null`; un 404, un 403 o una función apagada la esconden; un fallo de red conserva lo último). Su línea dice «Tu pago fue cancelado», «2 cuotas pendientes» o «Todas tus cuotas figuran
  pagadas» (`detalleDeLaFila`). Quien no tiene nada anotado ve Yo exactamente como antes. Se relee al volver Yo al foco (`useMiIngreso`). **No duplica «Mi onboarding» de Ajustes**: esa es la de los documentos
  (ficha, Términos, Pacto, y desde la 026 «Mi diagnóstico»); esta es la de los pagos, y sus pasos son orientación, no atajos (no se tocan).
* **`MiIngresoScreen`** (pantalla completa de Yo como la Caja; el atrás del sistema y la flecha vuelven a Yo; un solo scroll): la cabecera de la maqueta (`PasosDelIngreso`: Diagnóstico → Acuerdo → Pagos, con ✓ dorado,
  aro dorado en el que toca y círculo vacío; **un paso que no aplica —sin diagnóstico asignado— no se dibuja**), y debajo:
  * **Sin cronograma:** «Tu pago fue cancelado» (texto del dueño; en el Perú, pagado por completo) y una línea «No tienes cuotas por pagar.» para quien lo lea de otro modo. Sin cuotas, sin casilla, sin botón.
  * **Con cronograma:** «Tus fechas de pago · Revisa el cronograma acordado.», una fila por cuota (`FilaDeCuota`: calendario, fecha corta «15 nov» —con el año si no es el actual—, monto con su moneda «US$ 1 000» y
    «✓ Pagado» en verde o «Pendiente» con reloj en dorado; ícono Y palabra, nunca solo color; la fila se lee como una frase), los recordatorios de pago y, **una sola vez**, la casilla «Revisé mis fechas y montos.»,
    «Tu nombre» y «Confirmar cronograma» (`ConfirmarElCronograma`). Sin la casilla o sin el nombre no manda nada, dice qué falta y vibra con `tacto.error()`; el doble toque manda un solo pedido; al confirmar, una línea
    «Cronograma confirmado» (`tacto.logro()`) y la pantalla dice «Confirmaste tu cronograma el 3 de noviembre. Firmó: …». **Si Administración cambia fechas o montos, la confirmación se vuelve a pedir**
    («Tu cronograma cambió. Revísalo y confírmalo de nuevo.»; lo decide el servidor con una huella de lo acordado; marcar un pago no la invalida). **Nunca bloquea nada.**
  > **Corregido 2026-11-02 (#96, el dueño: «tremendo espacio, ajustar»).** La cuota ya no es una sola fila con `flexWrap` (la pastilla de estado bajaba sola a un segundo renglón cuando el monto no cabía): es `DatosDeLaCuota`, en la ficha de Administración y en «Mi ingreso», en dos renglones fijos —calendario y fecha a la izquierda, «✓ Pagado» / «Pendiente» a la derecha; debajo, el monto a 22 px, negrita y tabular, con todo el ancho— y, solo en la ficha, la nota de quién la marcó y los botones (sin cambios). El monto sigue sin `adjustsFontSizeToFit` ni encogerse (#89, #91). Solo JavaScript: hace falta un APK nuevo.
  * **«Pendiente» no es un reproche**: una cuota con la fecha pasada se dice igual (ni «atrasada» ni «vencida»); una prueba lo vigila.
  * Con la funcionalidad `pagos` apagada por Soporte TI, `AvisoDeMantenimiento` reemplaza el contenido. Sin animaciones propias (se ve de vez en cuando): solo `Presionable` y la línea de confirmación.
* **Hoja «Aceptar» de Solicitudes (025): un bloque 4 «Pago»** (`BloqueDeAceptacion`), solo si el servidor lo ofrece (`paymentScheduleAvailable` en `acceptance-options`; contra un backend anterior la hoja queda como era):
  «Sin cronograma (pagó completo)» o «Con cronograma», **para cualquier rol**. Con cronograma, el editor (`EditorDeCronograma`, el mismo de la ficha): la **moneda S/ o US$ sin valor por defecto**, el atajo «Armar cuotas
  mensuales» (cuántas, de cuánto y desde cuándo; un día 31 cae el último día de los meses cortos y vuelve al 31; después se edita cada fila) y las filas (fecha con las ruedas de siempre en `CampoDeFecha compacto`,
  monto, quitar; hasta 60). **El aprendiz parte sin elegir** (así no se anota «pagó completo» por descuido): «Aceptar» espera y la hoja dice «Elige cómo paga…». **El personal viene con «Sin cronograma» y eso NO anota nada**
  (no verá «Tu pago fue cancelado» por algo que nunca pagó; supuesto a confirmar con el dueño). Al aceptar varias a la vez, todas reciben el mismo cronograma. La frase del resumen suma «y con cronograma de 3 cuotas» o «y
  pagó completo». Un plan inválido es 400 y deshace la aceptación entera (una sola transacción en el servidor). **Los flujos de la 025 (`01`, `02`, `04`) piden un toque más: elegir el pago.**
* **Administración → ficha de la persona: sección «Pagos»** (`PagosDeLaPersona`, después de la ficha de ingreso; solo Administración y Alquimista: el servidor responde 403 a los demás y la sección no se dibuja):
  el cronograma con su moneda, quién confirmó y cuándo; por cuota, «Marcar pagado» / «Volver a pendiente» (un toque, sin confirmación; queda **quién y cuándo**), editar y quitar **solo las pendientes** (una pagada
  no se edita ni se quita; quitar pregunta) y «Agregar una cuota» (`HojaDeUnaCuota`); «Asignar un cronograma» o «Marcar sin cronograma (pagó completo)» a quien ya estaba dentro sin nada (respuesta 8 del dueño),
  y «Reemplazar el cronograma» / «Marcar sin cronograma» solo si **no hay cuotas pagadas** (409 en el servidor). **Nada se recalcula solo.** Cada escritura devuelve el pago entero y la sección queda al día.
* **Recordatorios de pago** (alarmas locales como las de eventos y acciones; `notificaciones/`): una alarma por cuota **pendiente** y aviso, **por defecto 3 días antes y el mismo día a las 09:00**, de este teléfono y por
  cuenta (`renaser.pagos.preferencias.<cuenta>`; no viajan). Se configuran en **un solo control** (`ControlDeRecordatoriosDePago`: encendido, avisos «3 días antes» / «1 día antes» / «El mismo día», uno o varios, y la hora
  con `HoraPickerModal`): en **Yo → Alarmas → «Recordatorios de pago»** (solo con un cronograma) y en **Mi ingreso**, como la fila «Recordatorios de pago ›» que abre una hoja con el mismo control (como «Recordatorios de
  tus acciones» en Plan). **Su propio canal con vibración** (`recordatorios-pagos-vib`, E-641; sonido del teléfono). Identificador `pago-<instante>`: programar con el mismo id REEMPLAZA, y dos avisos al mismo instante
  se juntan en uno (E-410). **Se ponen al día** al abrir la app y al volver al frente (`SincronizadorDePagos`, cada 10 min como el rearmado) y cada vez que se lee Mi ingreso, comparando con lo que el sistema tiene
  (`getAllScheduledNotificationsAsync`): una cuota que Administración marcó pagada **deja de recordarse en la siguiente lectura**, una alarma que el teléfono olvidó se vuelve a poner y lo que no cambió no se toca.
  Una pendiente con la fecha ya pasada no suena (ni reproche ni ruido). Un fallo de red no toca las alarmas. Sin permiso de avisos no se programa nada y el control lo dice (el permiso se pide solo con un toque de la
  persona). **Tocar el aviso abre Yo → «Mi ingreso»** (ruta `/mi-ingreso` → `abrirMiIngreso`, como `/caja` y `/mi-radar`; espera a que se cierre una capa obligatoria). Cerrar sesión suelta las alarmas y lo que el teléfono
  guarda de ellas; las preferencias quedan. Sin alarmas locales (web, Expo Go) no se dibuja el control.
* **Lo único que se toca fuera de `pagos/`**, todo aditivo: `CampoDeFecha` suma `compacto` (la fecha corta y sin chevron, para una fila de una lista); `Icon` suma `wallet`; `CLAVES.pagos`; `YoScreen` (la fila, el estado, el parámetro
  `abrirMiIngreso` y la pantalla); `SeccionAlarmas` (`pagos`); `avisosApi` y `abrirAviso` (el destino `miIngreso`); `alarmasDeLaCuenta` (un prefijo); `App.tsx` (`SincronizadorDePagos`); la hoja `AceptarSolicitudSheet` y
  `aceptarSolicitud` (el bloque y sus reglas); `FichaAprendizScreen` (la sección).
* **Compatibilidad:** sin backend nuevo (404) no hay fila, ni bloque «Pago», ni sección «Pagos», y la app queda como antes. Un APK anterior contra el backend nuevo no manda `payment` y nadie queda con un pago anotado.
* **No cambian:** ningún bloqueo ni pausa de la cuenta por no pagar (decisión de gerencia), los demás tabs, «Mi onboarding», la Caja, los términos, el diagnóstico ni los avisos de las demás alarmas.
* **Pruebas:** Jest en `src/features/pagos/__tests__` (`dineroYFechas`, `borradorDelCronograma`, `pagosSchemas`, `pagosApi`, `vistaDeMiIngreso`, `planDeAlarmasDePago`, `preferenciasDePagos`, `alarmasDePagos`,
  `miIngresoScreen`, `pagosDeLaPersona`, `controlDeRecordatoriosDePago`), `aceptarSolicitudConPago` y el pago en `aceptarSolicitudApi`, y `avisoDeMiIngreso`. Maestro, escritos y sin correr: `.maestro/pagos/` (aceptar con y
  sin cronograma, marcar pagado desde la ficha, asignar a quien ya estaba, «Mi ingreso» con y sin cronograma, confirmar, la fila que no existe sin pago anotado, los recordatorios y probar que la alarma suena y abre «Mi ingreso»).
* **Sin comprobar en pantalla** (solo se ve con el emulador): el aspecto de «Mi ingreso» contra la maqueta, el editor de cuotas en un teléfono de 360 dp, el aviso de la alarma con el teléfono en reposo y el permiso de avisos.
* **Hace falta un APK nuevo** (solo JavaScript: ni `package.json`, ni `app.json`, ni código nativo; la app no se actualiza por aire) **y el backend con la spec 032 antes** (V158).

## Decisión del dueño — 2026-11-02 — el cronograma de pagos no va en los términos

Textual: «lo de los pagos no debe de salir en términos y condiciones ya que será asíncrono bro, eso saldrá luego que el administrador lo llene». Corrige la spec 039 (más arriba) y se apoya en la 032. Backend: D-315,
`specs/039-acuerdo-de-transformacion/`. Lo que cambia y nada más:
* **Los términos y la firma NO muestran ni exigen el cronograma**, ni al entrar (el onboarding) ni al aceptar los «términos actualizados». Se quitaron `MiCronogramaDePagos`, la casilla de la cláusula 19, la huella (`useSellarTerminos`,
  `aceptarHito`: el pedido solo lleva `termsVersionId` y `agreementStartDate`), el 409 por cronograma cambiado y las líneas «Firmaste tu cronograma de pagos con los términos.» de «Mis términos» y de la constancia de la ficha. La app
  ignora `agreement.schedule` y `scheduleSigned` aunque un servidor anterior los mande. **«MI ACEPTACIÓN» se queda tal cual** (nombre, programa y fechas que llena el servidor), como las 23 cláusulas y la firma de siempre.
* **El cronograma es asíncrono: lo llena Administración cuando quiera, después de aceptar.** En la hoja «Aceptar» (Pago → «Con cronograma») **las cuotas son opcionales**: la moneda sigue siendo obligatoria (el servidor la guarda con la
  modalidad; no hay valor por defecto) y se manda `SCHEDULE` con la moneda y las cuotas que se hayan escrito (ninguna, si no); una fila sin nada escrito no cuenta y una a medias sigue siendo un error (`problemaDelBorrador(…, {
  permiteSinCuotas })`). La ayuda dice «Eliges la moneda; las cuotas las puedes registrar ahora o después, en su ficha.». La persona queda «con cronograma» **sin cuotas**.
* **Dónde se llenan después (ya existía, la spec 032; no se inventó nada):** la ficha de la persona → «Pagos» (`PagosDeLaPersona`). Con cronograma y sin cuotas dice «Con cronograma en soles (S/). Sin cuotas registradas.» y «Todavía no hay cuotas.
  La persona verá que aparecerán cuando las registres.», con **«Armar las cuotas»** (la hoja del cronograma con la moneda ya puesta y el atajo mensual; puede guardarse otra vez sin cuotas) y «Agregar una cuota» (una por una). Quien ya tiene
  cuotas conserva «Reemplazar el cronograma» y no puede guardarlo sin cuotas.
* **Lo que ve la persona** (Yo → «Mi ingreso», spec 032): la fila existe en cuanto hay un pago anotado y dice «Aún no hay cuotas registradas»; la pantalla, en lugar de la lista vacía y de la casilla de confirmar, dibuja una tarjeta corta con el
  ícono del calendario, «Tu cronograma de pagos» y «Tu cronograma de pagos aparecerá aquí cuando Administración lo registre.» (sin recordatorios de pago, que no hay qué recordar). El paso «Pagos» de arriba queda pendiente. En cuanto hay
  una cuota, es el «Tus fechas de pago» de siempre, con su confirmación **solo aquí** (el servidor responde 409 si se intenta confirmar sin cuotas).
* **No cambian**: el diseño de las demás pantallas, los tabs, el texto de las cláusulas (la 19 sigue hablando del acuerdo de pagos), «Sin cronograma (pagó completo)», los recordatorios de pago ni las reglas de la 032 (lo pagado no se toca,
  nada se recalcula solo, nunca bloquea).
* **Backend** (D-315): el acuerdo de `GET /onboarding/terms` ya no trae `schedule`; sellar los términos ya no lee ni valida ninguna huella (un APK de la 039 que todavía manda `scheduleFingerprint` no falla: se ignora) y no confirma el
  cronograma; «con cronograma» sin cuotas es válido al aceptar y en `PUT /admin/pagos/personas/{id}`. No se borró ninguna tabla ni columna: `aceptaciones_de_terminos.cronograma_huella` queda sin escribir ni leer.
* **Pruebas** (marcadas `decisión 2026-11-02 pagos fuera de términos`): Jest `acuerdoDeTransformacion` (la firma sin cronograma aunque tenga cuotas), `cableadoDeTerminos`, `miAceptacion`, `loMostradoAlAceptar`,
  `borradorDelCronograma`, `aceptarSolicitudConPago` (aceptar «Con cronograma» sin cuotas), `pagosDeLaPersona` (la ficha sin cuotas), `vistaDeMiIngreso` y `miIngresoScreen` («Mi ingreso» sin cuotas, sin hueco). Maestro, escritos y sin
  correr: `.maestro/acuerdo-de-transformacion/02-con-cronograma-la-firma-no-lo-muestra.yaml` (antes firmaba el cronograma), `.maestro/pagos/10-aceptar-con-cronograma-sin-cuotas.yaml` y `11-mi-ingreso-con-cronograma-sin-cuotas.yaml`.
* **Hace falta un APK nuevo** (solo JavaScript: la app no se actualiza por aire). El backend nuevo funciona con el APK de la 039 (ignora `schedule`); el APK nuevo con un backend anterior simplemente no dibuja el cronograma (lo ignora).
