# Mi Radar en Maestro (spec 012, rehecha por la 019)

Flujos de Yo → Mi Radar: el Código Renaser desde el día 8, que la persona enciende y configura. Se corren de a uno y **en
orden**, en el emulador, contra un backend local con base clonada (nunca producción):

```bash
E2E_APRENDIZ_EMAIL=… E2E_APRENDIZ_PASSWORD=… .maestro/correr.sh .maestro/mi-radar/02-dia10-apagado.yaml
```

Las cuentas (`# cuenta:` arriba de cada flujo) las pone `correr.sh`; los mentores, el líder, Administración y Alquimista
entran por la ranura `E2E_ADMIN_*` (`correr.sh` solo conoce aprendiz, admin y soporte: en los flujos 10 y 11, que cuenta
sea `E2E_ADMIN_EMAIL` apuntando a quien toque). Los textos que se escriben son de una letra: cada letra tarda ~10 s con la
build de desarrollo (ver `../README.md`).

| Flujo | Cuenta y estado de partida | Qué prueba (escenario de la spec) |
|---|---|---|
| `01-dia3-igual-que-hoy` | Aprendiz en el día 3, entre las 08:00 y las 19:59, hora sin registro | El Código Renaser se abre solo e innegociable; Yo no tiene «Mi Radar» (1) |
| `02-dia10-apagado` | Aprendiz en el día 10, Mi Radar apagado | La fila de Yo y la pantalla con solo «Encendido» (2) |
| `03-encender-automatico` | Igual, con Despertar 05:30 y Dormir 22:30, después de 02 | Encender rige en el acto, queda Automático con «Ahora: 05:30 a 22:30» y 17 veces; hoy y lo pasado con candado (3) |
| `04-personalizado-veces` | Día 10 encendido, después de 03 | Personalizado: «Veces al día» propone 6, − / + de a una, sin horas a la vista, límite de 1; no se guarda nada (4) |
| `05-registrar-ahora` | Día 10 encendido, hora en curso sin registro | «Registrar ahora»: el formulario se cierra y registra; «Prevista …» solo si la hora es de Mi Radar (5) |
| `06-hoy-a-una-hora-elegida` | Día 10 encendido, hora en curso de Mi Radar y sin registro | Hoy sin tarjeta del Código Renaser aparte y sin formulario automático (6) |
| `07-apagar` | Día 10 encendido, después de 05 | Apagar rige en el acto y el historial sigue (7) |
| `13-fin-de-semana-personalizado` | Día 10 encendido, después de 05 y **antes de 07**; **de lunes a viernes** | Sábado y domingo en Personalizado con 3 veces, hoy con candado que no se marca, domingo «Sin Radar» (13) |
| `14-hoy-sin-despertar` | Día 10 encendido y SIN hora de Despertar | «Falta tu hora de Despertar», «Programar mi Despertar» que lleva a Training, y no hay «Registrar ahora» (14) |
| `15-personal-con-programa` | Mentor con su programa propio (día 11), Despertar y Dormir, Mi Radar apagado | Mi Radar es para todos los roles: la mitad de Hoy «Planifica tu Radar», la pantalla y encender (15) |
| `16-personal-sin-programa` | Líder sin fila en el programa | La fila de Yo «Primero elige tu Día 1», el motivo, «Elegir mi Día 1», elegir y volver; dice cuándo empieza (16) |
| `10-ficha-del-mentor` | Mentor del grupo | La ficha del aprendiz dice «Mi Radar: encendido · 05:30 a 22:30 · 17 veces» y sus registros (10) |
| `11-ficha-de-administracion` | Admin o Alquimista | La ficha de la persona, con el mismo bloque (11) |
| `12-ficha-del-lider` | Líder de mentores | Hoy → Mis mentores → persona: el mismo bloque (11) |

Los escenarios 8, 9 y 12 (409, 400 y 403) son de la API y se prueban con curl o con los `*IT` del backend; el 5, tocando el aviso
del teléfono, y los avisos programados (`dumpsys alarm` / `dumpsys notification`) se miran a mano con mobile-mcp: deben verse
alarmas **semanales** `renaser.radar.slot.d{día}.HH` (lunes = 1), una por hora y día de las que toca (de 06 a 22 con Despertar
05:30 y Dormir 22:30), y ninguna el día sin Radar.

Se siembran en `renaser.preferencias_horario` el Despertar (`899a2151-e98c-4b61-a46c-b55134240d17`) y el Dormir
(`48d68c12-72a9-428c-a8c6-02b9b01bc2fe`) de la cuenta de partida, y se borran al terminar. Spec 019 (2026-10-30): se escribieron
los flujos 03, 04, 13 y 14 nuevos en lugar de los de las horas a mano (03 «encender 09-14-20», 04 «tope de 12», 13 «horas por día»
y 14 «hoy sin Radar» de la 012).

`../comun/llenar-formulario-radar.yaml` llena el formulario del Código Renaser y lo envía.
