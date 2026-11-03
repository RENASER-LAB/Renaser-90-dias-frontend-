# «Código Renaser en las fichas» (spec 034, D-299)

Administración (ADMIN o ALCHEMIST; Soporte TI también puede desde su consola) decide con un interruptor si el mentor, la guía y el
líder ven el Código Renaser de los aprendices en sus fichas. **De fábrica está apagado.** El servidor lo hace cumplir (404 en las tres
lecturas ajenas); la app además no dibuja ni pide la sección.

| Flujo | Cuenta | Qué prueba |
|---|---|---|
| `01-admin-enciende-y-apaga` | Administración o Alquimista | La pantalla en Más opciones, la confirmación sin motivo, «Listo…» y «Último cambio»; termina apagado |
| `02-mentor-con-el-interruptor-apagado` | El mentor del grupo (ranura `E2E_ADMIN_*`) | Apagado: la ficha del aprendiz no tiene «CÓDIGO RENASER», ni hueco ni mantenimiento |
| `03-mentor-lo-ve-cuando-se-enciende` | El mentor del grupo | Encendido: la ficha trae la sección de siempre |

**Escritos y sin correr.** Piden el backend con la spec 034 (sin migración) y un emulador libre; se corren de a uno, en orden, con
`.maestro/correr.sh .maestro/codigo-renaser-en-fichas/<flujo>.yaml`. Para ver el cambio de punta a punta: 02 (apagado) → 01 sin su
último paso o a mano (encender) → 03 → apagar otra vez. El líder se prueba igual con `mi-radar/12-ficha-del-lider` después de
encender; Administración y Alquimista (`mi-radar/11`) ven la sección siempre, con el interruptor en cualquier estado.

Lo que Maestro no cubre se prueba en el backend: los 404 y la autorización en `CodigoRenaserEnFichasIT`.
