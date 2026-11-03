# Acuerdo de transformación (spec 039)

Flujos de Maestro del **texto nuevo de los términos** (23 cláusulas del dueño), de **«Mi aceptación»** y del **cronograma de pagos, que ya NO se firma con los términos** (decisión del dueño del 2026-11-02: los pagos son asíncronos, los llena Administración después y se ven en Yo → «Mi ingreso»). **Escritos y sin
correr**: piden el backend con la spec 039 (V162) y las specs 027, 032 y 036, un emulador libre y cuentas sembradas en la base **local** (nunca producción). Cada archivo dice
arriba su precondición y su cuenta (`# cuenta: aprendiz`).

| Flujo | Cuenta | Qué prueba |
|---|---|---|
| `01-sin-cronograma-lee-mi-aceptacion-y-firma` | aprendiz | el texto con «Formación RENASER», «Mi aceptación» con las dos frases y los cinco datos, sin sección de cronograma, firma de siempre y «Tu programa empieza mañana» |
| `02-con-cronograma-la-firma-no-lo-muestra` | aprendiz | aunque tenga cuotas, la firma no muestra «Mi cronograma de pagos» ni pide su casilla; con la de los términos y la firma basta, y «Mi ingreso» lo sigue pidiendo confirmar |
| `03-volver-a-aceptar-sin-cronograma` | aprendiz | «Actualizamos nuestros términos» con «Mi aceptación» con las fechas reales, sin la sección del cronograma; «Mi ingreso» lo sigue pidiendo |
| `04-el-programa-del-diplomado` | aprendiz | «Diplomado RENASER · 3 meses» / «· 1 año» y su fin |

`comun-firmar.yaml` solo lo incluyen los demás (variable `BOTON`). Se corre de a uno: `.maestro/correr.sh .maestro/acuerdo-de-transformacion/<flujo>.yaml`.

Los flujos de Términos de la spec 027 (`terminos-editables/`) siguen valiendo: el texto vigente ahora es el del Acuerdo (versión 2 de la Escuela, versión 1 del Diplomado y de la
Certificación). Ningún flujo anterior busca las cláusulas viejas.

## Semilla

- **Aprendiz sin activar con ficha hecha**: aprobar la solicitud (Administración → Solicitudes) y completar la ficha; la fila de `participantes_programa` nace sin `programa_activado_en`.
- **Con cronograma**: `PUT /api/v1/admin/pagos/personas/{id}` con `{ "mode": "SCHEDULE", "currency": "PEN", "installments": [ {"dueDate": "2026-11-15", "amount": 500}, {"dueDate": "2026-12-15", "amount": 500} ] }`.
- **Sin cronograma**: `{ "mode": "NONE" }`.
- **Quien ya estaba dentro** (`03`): un aprendiz con el programa activado y aceptada la versión 1; V162 ya pidió aceptar de nuevo.

## Lo que no se puede probar con Maestro

- Que las fechas de «Mi aceptación» y las de «Tu programa empieza mañana» sean las mismas: Maestro no compara dos textos de pantallas distintas; se ve en las capturas `A01a` y
  `A01b`, y lo comprueba `AcuerdoDeTransformacionIT` en el backend.
- La medianoche con la pantalla abierta (409 «Pasó la medianoche…»): lo cubren la prueba de integración y las de Jest.
