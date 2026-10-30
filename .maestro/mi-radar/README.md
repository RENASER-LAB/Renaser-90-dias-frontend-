# Mi Radar en Maestro (spec 012)

Flujos de Yo → Mi Radar: el Código Renaser desde el día 8, que la persona enciende y configura. Se corren de a uno y **en
orden**, en el emulador, contra un backend local con base clonada (nunca producción):

```bash
E2E_APRENDIZ_EMAIL=… E2E_APRENDIZ_PASSWORD=… .maestro/correr.sh .maestro/mi-radar/02-dia10-apagado.yaml
```

Las cuentas (`# cuenta:` arriba de cada flujo) las pone `correr.sh`; los mentores, el líder, Administración y Alquimista
entran por la ranura `E2E_ADMIN_*` (`correr.sh` solo conoce aprendiz, admin y soporte: en los flujos 10 y 11, que cuenta
sea `E2E_ADMIN_EMAIL` apuntando a quien toque). Los textos que se escriben son de una letra: cada letra tarda ~10 s con la
build de desarrollo (ver `../README.md`).

| Flujo | Cuenta y estado de partida | Qué prueba (escenario del quickstart de la spec) |
|---|---|---|
| `01-dia3-igual-que-hoy` | Aprendiz en el día 3, entre las 08:00 y las 19:59, hora sin registro | El Código Renaser se abre solo e innegociable; Yo no tiene «Mi Radar» (1) |
| `02-dia10-apagado` | Aprendiz en el día 10, Mi Radar apagado | La fila de Yo y la pantalla con solo el interruptor (2) |
| `03-encender-09-14-20` | Igual, después de 02 | Encender con 09:00, 14:00 y 20:00 y «Guardar y encender» (3) |
| `04-tope-de-12-horas` | Día 10 encendido, después de 03 | Marcar 12 y no dejar la 13.ª: «Puedes elegir hasta 12» (4) |
| `05-registrar-ahora` | Día 10 encendido, hora en curso sin registro | «Registrar ahora»: el formulario se cierra y registra; «Prevista …» solo si la hora es una elegida (5) |
| `06-hoy-a-una-hora-elegida` | Día 10 encendido, hora en curso elegida y sin registro | Hoy sin tarjeta del Radar y sin formulario automático (6) |
| `07-apagar` | Día 10 encendido, después de 05 | Apagar rige en el acto y el historial sigue (7) |
| `13-horas-por-dia` | Día 10 encendido, sin días propios; después de 05 y **antes de 07** | Por día de la semana (cuarta ronda): sábado «Sin Radar», domingo con sus horas, la fila de Yo lo resume y «Dejar … como los demás días» lo devuelve (13) |
| `14-hoy-sin-radar` | Igual que 13, después de 13 y **antes de 07** | Marca el día de hoy «Sin Radar»: no hay «Registrar ahora», dice «Hoy no tienes Mi Radar»; al dejarlo como los demás vuelve (14) |
| `10-ficha-del-mentor` | Mentor del grupo | La ficha del aprendiz dice «Mi Radar: encendido · …» y sus registros (10) |
| `11-ficha-de-administracion` | Admin o Alquimista | La ficha de la persona, con el mismo bloque (11) |
| `12-ficha-del-lider` | Líder de mentores | Hoy → Semáforo por grupos → persona: el mismo bloque (11) |

Los escenarios 8, 9 y 12 (409, 400 y 403) son de la API y se prueban con curl; el 5, tocando el aviso del teléfono, y los
avisos programados (`dumpsys alarm` / `dumpsys notification`) se miran a mano con mobile-mcp: con días distintos (flujo 13)
deben verse alarmas **semanales** `renaser.radar.slot.d{día}.HH` (lunes = 1) y ninguna el día sin Radar; sin días distintos,
las **diarias** `renaser.radar.slot.HH` de siempre.

Los flujos 13 y 14 se numeran aparte de los 8 y 9 (que son de la API) y los textos nuevos que miran son: «Todos los días»,
«Solo sáb», «Sin Radar ese día» / «Sin Radar estos días», «Guardar horas · sáb», «Estos días tienen horas distintas»,
«Dejar sáb como los demás días» y «Hoy no tienes Mi Radar». Aún no se corrieron (se escribieron sin emulador).

`../comun/llenar-formulario-radar.yaml` llena el formulario del Código Renaser y lo envía.
