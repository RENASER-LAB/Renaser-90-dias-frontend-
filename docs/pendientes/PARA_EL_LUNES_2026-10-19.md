# Pendientes para el lunes 19 de octubre de 2026

Registrado el 17 de octubre de 2026 por pedido del dueño. Fecha objetivo: lunes 19 de octubre. Estado: pendiente de implementación y diagnóstico; esta nota no programa una ejecución automática.

## Líder de mentores ve el cumplimiento individual por grupo

El dueño confirma que el líder necesita **solo consultar**: tocar un grupo, ver sus personas y abrir una persona para consultar qué hábitos cumplió y cuáles tiene pendientes, con el período consultado visible.

- Habilitar la navegación desde la lista de grupos hasta el cumplimiento individual.
- Reutilizar la lectura de cumplimiento que ya tienen mentor y administración, con autorización explícita para el líder en el backend.
- Mantener el acceso del mentor limitado a los grupos que acompaña y el alcance actual de administración.
- El nuevo acceso del líder es de lectura: no incluye editar hábitos, registrar por otra persona, aprobar evidencias, reasignar personas ni cambiar roles.
- Mostrar estados de carga, grupo vacío, falta de datos y error con opción de reintentar. No presentar falta de datos como incumplimiento.
- Conservar las cinco pestañas y la navegación existente; agregar el acceso dentro del recorrido de grupos del líder.

Este pedido amplía el alcance anterior de [RL-07 de la spec de líder de mentores](../../specs/002-lider-de-mentores/spec.md): el resumen agregado deja de ser el único acceso del líder. Al implementar, actualizar la spec canónica y sus contratos y pruebas. El cambio de día del 17 de octubre no agregó este permiso.

### Comprobación para aceptar el cambio

1. Una cuenta de líder abre un grupo, selecciona una persona y ve su cumplimiento real en modo de lectura.
2. Un mentor sigue viendo únicamente a las personas de sus grupos; administración conserva su acceso.
3. El servidor rechaza las escrituras que este nuevo acceso de consulta no autoriza.
4. La navegación se recupera de una respuesta lenta, un error y la falta de conexión sin quedar vacía ni mostrar datos de otra persona.

## Revisar pantallas negras o blancas en celulares

El dueño pide atender el problema de pantalla negra o blanca y revisar caché y rendimiento, teniendo en cuenta un celular **Honor**. La caché es una hipótesis a comprobar, no una causa confirmada.

- Identificar el modelo Honor, versión de Android y de la app, si ocurre en APK o navegador, la pantalla afectada y los pasos que lo reproducen. Estos datos quedan pendientes de recopilar.
- Revisar arranque, reapertura tras segundo plano, cambios de pantalla y recuperación después de una actualización.
- Comprobar si intervienen datos guardados o recursos antiguos, restauración de sesión, carga de recursos, errores de render o falta de memoria. Registrar la causa antes de elegir la corrección.
- Optimizar la pantalla o el arranque que origine el fallo y ofrecer un estado visible de carga o recuperación cuando corresponda.
- Evitar que borrar los datos de la app o reinstalarla sea la solución habitual; conservar la sesión y los datos pendientes cuando sea posible.
- Probar en Honor y otro Android de referencia, con conexión lenta o interrumpida, arranque en frío y regreso desde segundo plano.

### Comprobación para aceptar la corrección

La app abre y recupera la pantalla afectada sin permanecer negra o blanca. Si falla la carga, informa el problema y permite recuperarse. Documentar dispositivo, versión, recorrido y resultado antes y después de la corrección.

## Entrega y seguimiento

- Atender ambos pendientes con objetivo del lunes 19 de octubre de 2026.
- La autorización funcional del líder queda limitada a consulta por grupo y persona.
- Al implementar, comprobar los permisos en backend y la navegación en la app, y registrar la validación del problema de pantalla en dispositivo.
- Identificar qué versión del backend y de la app necesita publicarse; generar un APK nuevo si la corrección nativa lo requiere.
