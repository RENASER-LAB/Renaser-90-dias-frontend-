# Cronograma de pagos (spec 032)

Flujos de Maestro de **Administración → Solicitudes / ficha** (asignar y marcar los pagos) y de **Yo → «Mi ingreso»** (lo que ve la persona, su confirmación y
sus recordatorios). **Escritos y sin correr**: piden el backend con la spec 032 (V158), un emulador libre y personas sembradas en la base **local** (nunca
producción). Cada archivo dice arriba su precondición y su cuenta (`# cuenta: admin|aprendiz`).

| Flujo | Cuenta | Qué prueba |
|---|---|---|
| `01-aceptar-con-cronograma` | admin | en la hoja «Aceptar», el bloque «Pago»: «Con cronograma», la moneda (US$), «Armar cuotas mensuales» (3 de 1000) y la frase del resumen |
| `02-aceptar-sin-cronograma` | admin | el aprendiz tiene que elegir cómo paga («Elige cómo paga…»); «Sin cronograma (pagó completo)» y su frase |
| `03-ficha-marcar-pagado` | admin | la sección «Pagos» de la ficha: «Marcar pagado» (queda quién y cuándo), «Volver a pendiente», agregar una cuota |
| `04-ficha-asignar-a-quien-ya-estaba` | admin | quien ya estaba dentro, sin pago anotado: «Marcar sin cronograma (pagó completo)» |
| `05-mi-ingreso-con-cronograma` | aprendiz | la fila «Mi ingreso» en Yo, los pasos, «Tus fechas de pago», las cuotas y confirmar UNA vez (casilla, nombre, botón) |
| `06-mi-ingreso-sin-cronograma` | aprendiz | «Tu pago fue cancelado», sin cuotas ni botón de confirmar |
| `07-sin-pago-anotado-no-hay-fila` | aprendiz | quien no tiene nada anotado no ve «Mi ingreso» y Yo queda como siempre |
| `08-recordatorios-de-pago` | aprendiz | Yo → Alarmas → «Recordatorios de pago» y la fila «Recordatorios de pago ›» de «Mi ingreso» (el mismo control) |
| `09-el-recordatorio-suena-y-abre-mi-ingreso` | aprendiz | PROBAR LOS RECORDATORIOS: una cuota que vence hoy, la hora del aviso en el próximo múltiplo de 5 minutos, y tocar la alarma abre «Mi ingreso» |

`comun-abrir-mi-ingreso.yaml` solo lo incluyen los demás flujos. Se corre de a uno: `.maestro/correr.sh .maestro/pagos/<flujo>.yaml`.

## Semilla de las precondiciones (base local)

La forma más rápida de sembrar es por la API con la sesión de Administración (`PUT /api/v1/admin/pagos/personas/{id}`, ver `specs/032-cronograma-de-pagos/contracts/pagos.md`):

- **Con cronograma** (`05`, `08`, `09`): `{ "mode": "SCHEDULE", "currency": "USD", "installments": [ {"dueDate": "<hace un mes>", "amount": 1000}, {"dueDate": "<hoy>", "amount": 1000}, {"dueDate": "<en un mes>", "amount": 1000} ] }`
  y marcar la primera «PAID» (`PUT …/cuotas/{id}/estado` con `{"status": "PAID"}`). El `09` necesita una cuota que **venza hoy**.
- **Sin cronograma** (`06`): `{ "mode": "NONE" }`.
- **Sin nada anotado** (`04`, `07`): cuentas que se aceptaron sin `payment` o que nunca se tocaron.

## Lo que no se puede probar con Maestro

- Que la alarma suene con el teléfono bloqueado y en reposo: se mira con `adb shell dumpsys alarm` (la de pago aparece como `pago-<ms>`) y con el sonido real.
- La fecha de la primera cuota se elige con las ruedas: los flujos aceptan la de hoy (`LISTO`) y verifican solo lo que no depende del día.
