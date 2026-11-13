# Decisiones del dueño — índice

Todo lo que el dueño autorizó, decidió o mandó corregir en la app, con fecha. Antes vivía dentro de `AGENTS.md`
(más de 6000 líneas que cada sesión cargaba entera); el 2026-11-06 se movió **tal cual** acá, un archivo por tema
y este índice. No se perdió una línea (comparación línea por línea en el PR del arnés), y
Cada entrada nueva lleva su fila en el índice.

## La regla que no cambia

**Los cinco tabs (`Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`) no se tocan sin una autorización explícita del dueño, y
una autorización puntual no abre el tab.** Antes de tocar un tab, filtra esta tabla por su nombre y lee esas entradas.
La columna «Tabs» sale del título de cada entrada: es una guía, no la última palabra. Para no perder nada, busca
también en el texto (`grep -n "Plan" docs/decisiones/*.md`). Si dos entradas chocan, vale la más nueva.

## Cómo se agrega una decisión nueva

1. Va **al final** del archivo de su tema (o de `transversal.md` si toca varios), con el formato de siempre:
   `## <Cambio por pedido del dueño | Decisión del dueño | Corrección> — AAAA-MM-DD — <qué>`, el pedido textual,
   «lo que cambia y nada más», «no cambian», las pruebas y si hace falta APK o backend.
2. Una fila nueva **arriba** de la tabla de abajo, con el mismo título.
3. **Una decisión vive aquí**, no en otros documentos.
4. Si una entrada vieja queda desmentida, se corrige con una nota `> **Corregido AAAA-MM-DD.** …` debajo de lo que
   corrige (así nadie «arregla» la corrección de vuelta) y se marca «sí» en la columna «Corregida».
5. Si la decisión cambia una **regla vigente** de `AGENTS.md`, la regla se reescribe ahí (sin notas) y el rastro queda
   en la entrada.

## Archivos

| Archivo | Qué guarda | Entradas |
|---|---|---|
| [alarmas.md](alarmas.md) | Alarmas y recordatorios: specs 007–010, voces, canales, el puente de #33 | 9 |
| [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) | Código Renaser (días 1–7) y Mi Radar (desde el día 8) | 7 |
| [comunidad.md](comunidad.md) | Comunidad: Muro, chat, Tribu, Eventos, Cursos y Ranking | 23 |
| [formaciones.md](formaciones.md) | Formaciones (Escuela, Diplomado, Certificación): specs 022–025, 035 y el plazo de cada formación | 8 |
| [hoy.md](hoy.md) | Hoy: tarjetas, frase del día, semáforo y lo que Hoy muestra | 8 |
| [ingreso-y-onboarding.md](ingreso-y-onboarding.md) | Login, onboarding, ficha, diagnóstico, términos y el Día 1 | 11 |
| [kilometros-y-carrera.md](kilometros-y-carrera.md) | Kilómetros diarios: captura, pasos (Health Connect) y la carrera con GPS | 6 |
| [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | Mentor, líder de mentores, Administración, Alquimista y sus fichas | 15 |
| [pagos.md](pagos.md) | Cronograma de pagos y «Mi ingreso» (spec 032) | 2 |
| [plan.md](plan.md) | Plan: objetivos, semana, mes, 80/20, Cierra tu día y el Mapa (retirado) | 12 |
| [ser-y-fenix.md](ser-y-fenix.md) | SER (el acompañante), el orbe, el fénix y las celebraciones | 9 |
| [soporte-ti.md](soporte-ti.md) | Soporte TI: interruptores, despliegue, roles personalizados y «ver como» (spec 002) | 2 |
| [training.md](training.md) | Training: lista por hora, hábitos, evidencias y el editor Planificar | 19 |
| [transversal.md](transversal.md) | Lo que tocó varios tabs a la vez: diseño, fuentes, barra de pestañas, velocidad, CI y arreglos de E2E | 23 |
| [yo.md](yo.md) | Yo: Ajustes, fase, evidencias, Caja, emergencia, perfil, cuenta y privacidad | 13 |
| [reglas-historial.md](reglas-historial.md) | Las reglas de `AGENTS.md` tal como estaban, con sus notas «Corregido» | — |

## Entradas (la más nueva primero)

| Fecha | Tabs | Tipo | Entrada | Archivo | Corregida |
|---|---|---|---|---|---|
| 2026-11-13 | ninguno | Decisión | «El número es único»: «Solicitar acceso» rechaza un WhatsApp que ya es de otra cuenta, con el motivo del servidor en el paso del WhatsApp (spec 051, FR-014 a FR-019) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) |  |
| 2026-11-12 | Yo | Cambio | Yo → Ajustes → Perfil: «WhatsApp» confirmado con un código, para que también el personal recupere su contraseña por WhatsApp (spec 051) | [yo.md](yo.md) |  |
| 2026-11-12 | ninguno | Cambio | «Solicitar acceso» por pasos, con fondo liso y el botón sobre el teclado; el login queda pospuesto (spec 052) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) |  |
| 2026-11-11 | ninguno | Decisión | la app entiende el 429 «Espera un momento» del límite de pedidos y la cola lo reintenta con Retry-After (spec 050, tramo C) | [transversal.md](transversal.md) |  |
| 2026-11-11 | Training | Corrección | la Pastilla entregada sin señal se registra con su hora real (spec 048, issue #186) | [transversal.md](transversal.md) |  |
| 2026-11-10 | Plan | Corrección | «Agendar mis acciones» muestra y conserva lo que el día ya tiene en el servidor (spec 048, issue #185) | [plan.md](plan.md) |  |
| 2026-11-10 | Plan | Corrección | lo agendado sin señal cuenta en «Agendar mis acciones» (spec 048, issue #183) | [transversal.md](transversal.md) |  |
| 2026-11-10 | Hoy, Plan, Training, Comunidad, Yo | Corrección | sin señal se dice «sin señal», no «No se pudo conectar» en rojo (spec 048, issue #182) | [transversal.md](transversal.md) |  |
| 2026-11-10 | Hoy, Plan, Training | Cambio | la app funciona sin internet, fase 3: Plan, Cierra tu día, Código Renaser y planificar hábitos (spec 048, #180) | [transversal.md](transversal.md) |  |
| 2026-11-10 | Comunidad | Cambio | Muro: fotos rápidas con miniatura (spec 049) | [comunidad.md](comunidad.md) |  |
| 2026-11-10 | Training | Cambio | Entrenar pide primero lo esencial | [training.md](training.md) |  |
| 2026-11-10 | Training | Corrección | Kilómetros diarios: una caminata normal cuenta (#172) | [kilometros-y-carrera.md](kilometros-y-carrera.md) |  |
| 2026-11-10 | Hoy, Training, Comunidad | Corrección | sin señal, el Código Renaser ya no atrapa, la Pastilla se entrega y el ranking lo dice (spec 048, issue #178) | [transversal.md](transversal.md) | sí |
| 2026-11-10 | Comunidad | Cambio | Comunidad: sin «Todas» en el selector de formación (#169) | [comunidad.md](comunidad.md) |  |
| 2026-11-09 | Hoy, Plan, Training, Comunidad, Yo | Cambio | la app funciona sin internet, fase 1 (spec 048) | [transversal.md](transversal.md) | sí |
| 2026-11-06 | Comunidad | Cambio | la transcripción de las sesiones por Meet se guarda, cifrada y sin mostrarse (spec 047) | [comunidad.md](comunidad.md) |  |
| 2026-11-06 | Comunidad | Cambio | Comunidad → Eventos: eventos para quien tú elijas, y el líder en el chat de soporte (spec 044, D-326) | [comunidad.md](comunidad.md) |  |
| 2026-11-06 | Hoy, Plan, Training, Comunidad, Yo | Cambio | recorrido de bienvenida hasta el primer post, con confeti, y la pestaña «Entrenar» (spec 045) | [transversal.md](transversal.md) | sí |
| 2026-11-06 | Ingreso | Cambio | el código de verificación también por WhatsApp (spec 043) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) |  |
| 2026-11-06 | Hoy, Comunidad, Yo, Administración | Cambio | el sobrenombre en el Muro (spec 046) | [comunidad.md](comunidad.md) |  |
| 2026-11-05 | Training | Corrección | «Kilómetros diarios»: aceptar los permisos de Health Connect ya no depende de una sola respuesta (issue #127) | [kilometros-y-carrera.md](kilometros-y-carrera.md) | sí |
| 2026-11-05 | Training | Cambio | tab `Training` → Kilómetros en vivo con GPS (spec 042) | [kilometros-y-carrera.md](kilometros-y-carrera.md) | sí |
| 2026-11-05 | Comunidad | Cambio | tab `Comunidad` → Muro en lista compacta estilo Skool | [comunidad.md](comunidad.md) | sí |
| 2026-11-04 | Training | Corrección | las fotos de muchos megapíxeles ya no dan «No se pudo procesar la foto» (issue #120) | [training.md](training.md) |  |
| 2026-11-04 | Comunidad | Cambio | Eventos: el enlace de Meet lo crea el servidor, con una cuenta de Google de Renaser (spec 040, D-321) | [comunidad.md](comunidad.md) | sí |
| 2026-11-04 | Yo | Cambio | Recordatorios de eventos por el chat y por WhatsApp: la baja en Yo → Notificaciones y el aviso de finalidad (spec 041) | [comunidad.md](comunidad.md) |  |
| 2026-11-03 | Plan | Cambio | Cierra tu día con chips de ícono | [plan.md](plan.md) |  |
| 2026-11-03 | Yo | Cambio | Yo → Ajustes → Perfil: sin biografía, sin la fila «Información» y con el WhatsApp de la ficha | [yo.md](yo.md) |  |
| 2026-11-03 | Administración | Cambio | el líder ve los días de sus mentores (D-318, backend #74) | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-11-03 | Hoy, Yo | Cambio | Código Renaser compacto: sin párrafos, con los íconos de voz en el renglón y el borrador al escribir | [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) | sí |
| 2026-11-03 | Hoy, Yo | Cambio | Código Renaser, opción C: sin «Escuchar», con «Dictar» dentro del campo, campo que crece y energía en chips | [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) |  |
| 2026-11-03 | Hoy | Cambio | textos más compactos en Eventos y Hoy, y un tope a la letra del sistema | [transversal.md](transversal.md) |  |
| 2026-11-03 | Plan, Training | Corrección | números y textos que no cuadraban en Plan, Training, Cierra tu día, Eventos y el Muro (issue #115) | [transversal.md](transversal.md) |  |
| 2026-11-02 | Training | Cambio | Training → Planificar: «Siempre \| Por semana» con flechas, lo guardado marcado y menos texto | [training.md](training.md) |  |
| 2026-11-02 | Training | Corrección | Training dice cuándo empieza el programa de quien empieza mañana (issue #101) | [training.md](training.md) |  |
| 2026-11-02 | Training | Corrección | Training → Planificar: «Por semana» abre en la semana con el cambio guardado, también al volver de «Siempre» (issue #106) | [training.md](training.md) |  |
| 2026-11-02 | Training | Corrección | Training abre en MAÑANA en el Día 0 (issue #107) | [training.md](training.md) |  |
| 2026-11-02 | Training | Cambio | «Kilómetros diarios»: los pasos del teléfono llenan los km (spec 037, D-310) | [kilometros-y-carrera.md](kilometros-y-carrera.md) |  |
| 2026-11-02 | Yo | Corrección | Yo: sin fase ni semáforo antes del Día 1 ni sin programa (issue #102) | [yo.md](yo.md) |  |
| 2026-11-02 | Yo, Administración | Decisión | el cronograma de pagos no va en los términos | [pagos.md](pagos.md) |  |
| 2026-11-02 | Administración | Corrección | «Aceptada el …» en la ficha de Administración sale en la zona del teléfono, no en UTC (issue #108) | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-11-02 | Ingreso | Cambio | el programa empieza al día siguiente, sin elegir el Día 1 | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) | sí |
| 2026-11-02 | Ingreso | Cambio | Acuerdo de transformación: los términos nuevos, «Mi aceptación» y el cronograma que se firma al entrar (spec 039) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) | sí |
| 2026-11-02 | Ingreso | Corrección | la Ficha Inicial dice el plazo de la formación de cada persona (issue #103) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) |  |
| 2026-11-02 | varios | Cambio | identidad por formación: la bienvenida y la imagen de cada formación (spec 035) | [formaciones.md](formaciones.md) | sí |
| 2026-11-02 | varios | Corrección | ningún «90 días» escrito a mano en lo que ve la persona (issue #104) | [formaciones.md](formaciones.md) |  |
| 2026-11-02 | Hoy | Cambio | SER al día con la lógica nueva y para las tres formaciones (spec 038) | [ser-y-fenix.md](ser-y-fenix.md) | sí |
| 2026-11-02 | Hoy | Corrección | SER: el texto de respaldo de las propuestas ya no queda encima de la tarjeta ni repetido al releer el historial (issue #105) | [ser-y-fenix.md](ser-y-fenix.md) |  |
| 2026-11-02 | varios | Corrección | el selector de hora sin huecos y con las 24 horas a la vista (issue #97) | [transversal.md](transversal.md) |  |
| 2026-11-02 | varios | Decisión | los botones dorados en tipo oración y sin espaciado, en toda la app | [transversal.md](transversal.md) |  |
| 2026-11-02 | varios | Infraestructura | CI de seguridad y alertas de Dependabot del frontend | [transversal.md](transversal.md) |  |
| 2026-11-01 | Hoy, Plan | Cambio | tab `Hoy` (y Plan): la frase siempre, el programa propio en una fila y la fecha de inicio | [hoy.md](hoy.md) | sí |
| 2026-11-01 | Yo | Cambio | cronograma de pagos: «Mi ingreso» en Yo, el bloque «Pago» al aceptar, los pagos en la ficha y los recordatorios de pago (spec 032) | [pagos.md](pagos.md) | sí |
| 2026-11-01 | Administración | Decisión | Administración: la cabecera en dos renglones, y el espacio libre de las pantallas cortas | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-11-01 | varios | Corrección | lo que salió en la segunda jornada del E2E de las formaciones (issues #73 a #80; backend #53 y #54) | [formaciones.md](formaciones.md) | sí |
| 2026-10-31 | Plan, Training | Cambio | «Cierra tu día» pasa de Training a Plan (spec 033) | [plan.md](plan.md) | sí |
| 2026-10-31 | Plan | Cambio | Plan → «Tu 80/20»: tus cifras y el análisis de SER por semana y por mes (spec 031) | [plan.md](plan.md) |  |
| 2026-10-31 | Plan, Training | Cambio | Training → Planificar y Plan: «Solo esta semana», repetir la semana y planificar el mes (spec 028) | [training.md](training.md) | sí |
| 2026-10-31 | Training | Corrección | registro con foto: la foto no se pierde si Android mata la app con la cámara abierta, y «Reintentar» (issues #49 y #51) | [training.md](training.md) |  |
| 2026-10-31 | Training | Cambio | tab `Training` → Tus prácticas: la dimensión abre Planificar directo | [training.md](training.md) |  |
| 2026-10-31 | Training, Yo | Corrección | un aviso de inicio de hábito ya no se muestra ni se queda en la bandeja después de su hora (issue #40) | [alarmas.md](alarmas.md) |  |
| 2026-10-31 | Training, Yo | Decisión | Alarmas silenciosas: se quita la hoja «Tu teléfono cerró Renaser» | [alarmas.md](alarmas.md) |  |
| 2026-10-31 | Comunidad, Administración | Cambio | tab `Comunidad` (Muro) y Administración: ocultar y eliminar publicaciones, solo ADMIN y ALCHEMIST | [comunidad.md](comunidad.md) | sí |
| 2026-10-31 | Hoy | Cambio | Hoy → «Mis mentores»: el líder ve la ficha de todos los aprendices, estén o no en un grupo | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | sí |
| 2026-10-31 | Yo | Cambio | Yo → «Mis mentores» → «Hábitos de todos»: el líder ve, hábito por hábito, quién cumplió y quién no (spec 029) | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-10-31 | Ingreso | Cambio | Términos y condiciones editables desde la app, por formación y con versiones (spec 027) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) |  |
| 2026-10-31 | Ingreso | Cambio | ficha con diagnóstico: reemplaza al Mapa de Renacimiento (spec 026) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) | sí |
| 2026-10-31 | varios | Cambio | formaciones: Escuela, Diplomado y Certificación (spec 022) | [formaciones.md](formaciones.md) |  |
| 2026-10-31 | varios | Cambio | hábitos y categorías por formación (spec 023) | [formaciones.md](formaciones.md) |  |
| 2026-10-31 | Administración | Cambio | Administración → Solicitudes: aceptar eligiendo formación, duración, rol y ficha (spec 025) | [formaciones.md](formaciones.md) |  |
| 2026-10-31 | Comunidad | Cambio | la Comunidad de cada formación (spec 024) | [formaciones.md](formaciones.md) | sí |
| 2026-10-31 | varios | Cambio | al juntar las formaciones: Ranking según los hábitos de la formación y el nombre del objetivo según la duración | [formaciones.md](formaciones.md) |  |
| 2026-10-31 | Hoy, Yo | Cambio | Código Renaser con la voz: dictar la respuesta y escuchar la pregunta (spec 030) | [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) | sí |
| 2026-10-31 | Administración | Cambio | «Código Renaser en las fichas»: Administración decide si el mentor y el líder lo ven (spec 034) | [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) |  |
| 2026-10-31 | Hoy | Corrección | la guía de arranque de SER ya no se monta sobre el panel de SER (issue #50) | [ser-y-fenix.md](ser-y-fenix.md) |  |
| 2026-10-31 | Hoy, Plan, Training | Cambio | diseño de Hoy, Plan y Training, y la fuente Inter en toda la app | [transversal.md](transversal.md) | sí |
| 2026-10-30 | Hoy | Cambio | tab `Hoy`: la sección del fénix sin el vacío de arriba y de abajo | [hoy.md](hoy.md) |  |
| 2026-10-30 | Comunidad | Decisión | Mentoría del Alquimista solo con semáforo verde (sin cambios en la app) | [comunidad.md](comunidad.md) |  |
| 2026-10-30 | Hoy, Yo | Cambio | tab `Yo` (Mi Radar) y `Hoy`: Mi Radar automático y personalizado (spec 019) | [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) | sí |
| 2026-10-29 | Hoy, Plan | Cambio | tabs `Hoy` y `Plan`: hábito y Radar en una tarjeta, y las acciones de hoy por eje (spec 016) | [hoy.md](hoy.md) | sí |
| 2026-10-29 | Training, Administración | Cambio | tab `Training` (y las fichas del mentor, del líder y de Administración): Cierra tu día (spec 017) | [plan.md](plan.md) | sí |
| 2026-10-29 | Training | Cambio | tab `Training`: Training por hora (spec 014) | [training.md](training.md) | sí |
| 2026-10-29 | Hoy, Training, Yo | Cambio | tabs `Training`, `Yo` y `Hoy` (registro con foto): KILÓMETROS DIARIOS siempre muestra el campo de km y nunca se envía sin el número | [kilometros-y-carrera.md](kilometros-y-carrera.md) |  |
| 2026-10-29 | Hoy, Training, Yo | Cambio | tabs `Training` y `Yo` (y las tarjetas «Tomar foto» de `Hoy` y del chat de SER): KILÓMETROS DIARIOS deja elegir la captura de la galería | [kilometros-y-carrera.md](kilometros-y-carrera.md) |  |
| 2026-10-29 | Comunidad | Cambio | tab `Comunidad` → Ranking: «TÚ» y «Tu posición» solo por id | [comunidad.md](comunidad.md) |  |
| 2026-10-29 | Administración | Cambio | fichas del mentor, del líder y de Administración: tiempo libre de la semana (spec 015) | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | sí |
| 2026-10-29 | Hoy | Cambio | tab `Hoy` (personal con más de un papel) y la ficha del líder (spec 018) | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | sí |
| 2026-10-29 | Yo, Administración | Cambio | tab `Yo` (y las fichas del mentor, del líder y de Administración): Mi Radar desde el día 8 | [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) | sí |
| 2026-10-27 | Plan | Cambio | tab `Plan`: los objetivos esperan al Mapa de Renacimiento (issue #37) | [plan.md](plan.md) | sí |
| 2026-10-27 | Training, Yo | Corrección | los recordatorios de un hábito cumplido ya no suenan ese día (issue #33) | [alarmas.md](alarmas.md) |  |
| 2026-10-27 | Hoy, Administración | Cambio | Administración (estado de `Hoy`): Administración y Alquimista ven las evidencias como el líder | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | sí |
| 2026-10-27 | Administración | Corrección | la ficha del mentor abre las evidencias dentro de la app | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-10-20 | Training | Cambio | tab `Training` → Planificar: días solo con íconos, «Otra» en su lugar y pantalla completa | [training.md](training.md) |  |
| 2026-10-20 | Training | Cambio | tab `Training` → Planificar: el recordatorio por día | [alarmas.md](alarmas.md) | sí |
| 2026-10-20 | Training | Cambio | tab `Training` → Planificar: cómo suena la alarma | [alarmas.md](alarmas.md) | sí |
| 2026-10-20 | Plan, Yo | Cambio | tabs `Plan` y `Yo` → Alarmas: las acciones de los objetivos por día y cómo suenan | [alarmas.md](alarmas.md) |  |
| 2026-10-19 | Hoy | Cambio | tab `Hoy`: la tarjeta del semáforo con el mensaje del día y el sticker del búho | [hoy.md](hoy.md) | sí |
| 2026-10-19 | Training, Yo | Cambio | alarmas como el despertador, aviso cuando el teléfono las borra y guía por marca (tab `Yo` → Alarmas, una hoja global y, en Training → Planificar, una oferta única de la guía) | [alarmas.md](alarmas.md) | sí |
| 2026-10-19 | Comunidad | Cambio | tab `Comunidad` → Ranking: «Descargar» la imagen del podio | [comunidad.md](comunidad.md) |  |
| 2026-10-19 | Hoy, Yo | Cambio | tab `Hoy` (semáforo por grupos del líder), las fichas del mentor y de administración, y `Yo` → Notificaciones: el líder de mentores ve el cumplimiento de cada persona por grupo | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | sí |
| 2026-10-19 | Hoy, Yo | Corrección | Código Renaser sin parpadeo y con el 409 | [codigo-renaser-y-mi-radar.md](codigo-renaser-y-mi-radar.md) |  |
| 2026-10-17 | Training | Corrección | hábitos al cambiar de día | [training.md](training.md) |  |
| 2026-10-14 | Hoy, Plan, Training, Comunidad, Yo, Administración | Cambio | los cinco tabs y Administración: lo no disponible se esconde, y la consola Soporte TI suma despliegue, roles personalizados y «ver como» (spec 002, fase 2) | [soporte-ti.md](soporte-ti.md) | sí |
| 2026-10-13 | Training, Comunidad | Cambio | tabs `Training` y `Comunidad` (ranking): el hábito GIMNASIO y su pestaña | [training.md](training.md) |  |
| 2026-10-13 | Hoy, Comunidad, Administración | Cambio | Administración (estado de `Hoy`) y `Comunidad` (info del chat): el rol «Guía de aprendiz», el rol al aprobar y dos arreglos | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-10-13 | Hoy, Plan, Training, Comunidad, Yo | Cambio | los cinco tabs: aviso de mantenimiento cuando una funcionalidad está apagada (spec 002) | [soporte-ti.md](soporte-ti.md) |  |
| 2026-10-12 | Hoy, Administración | Cambio | Administración (estado de `Hoy`): «Hábitos del programa», con audiencia por rol | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-10-10 | Plan | Corrección | Corrección encontrada en el E2E del Mapa del Poder por rol  (backend E-592) | [plan.md](plan.md) |  |
| 2026-10-10 | Ingreso | Corrección | Recuperación del Día 1 de cuentas anteriores  (backend E-594/E-596/E-597) | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) | sí |
| 2026-10-07 | Training | Cambio | tab `Training` y el botón de SER: el momento de cumplir un hábito | [training.md](training.md) | sí |
| 2026-10-07 | Hoy, Training, Yo | Cambio | tabs `Training`, `Hoy` y `Yo`: «Elegir mi Día 1» para el personal | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) | sí |
| 2026-10-07 | Hoy, Training, Yo | Cambio | tabs `Hoy`, `Training` y `Yo`: pantalla completa para los momentos grandes | [ser-y-fenix.md](ser-y-fenix.md) |  |
| 2026-10-07 | Hoy | Cambio | tab `Hoy` (el centro): el fénix se mueve al escucharte, pensar y hablar | [ser-y-fenix.md](ser-y-fenix.md) | sí |
| 2026-10-06 | Comunidad | Cambio | tab `Comunidad` → Eventos: «Quién respondió» y «Pasar lista» (backend D-256) | [comunidad.md](comunidad.md) |  |
| 2026-10-06 | Yo | Cambio | tab `Yo`: el animal de cada fase | [yo.md](yo.md) |  |
| 2026-10-06 | Yo | Cambio | tab `Yo`: la tarjeta de fase «B · Tarjeta héroe» y las imágenes configurables | [yo.md](yo.md) | sí |
| 2026-10-06 | Plan, Yo | Cambio | tabs `Yo` y `Plan`: la misma fase en las dos | [yo.md](yo.md) |  |
| 2026-10-06 | Yo | Cambio | tab `Yo` (Ajustes) y el ingreso: Política de Privacidad (backend D-245) | [yo.md](yo.md) |  |
| 2026-10-06 | Comunidad | Cambio | tab `Comunidad` (Classroom): sin Sparkie, el curso abre a SER | [ser-y-fenix.md](ser-y-fenix.md) |  |
| 2026-10-06 | Hoy | Cambio | tab `Hoy` (el centro) y SER: el fénix | [ser-y-fenix.md](ser-y-fenix.md) | sí |
| 2026-10-05 | Hoy | Cambio | tab `Hoy`: íconos, tipo oración, respuesta al tacto y el día real en el Mapa | [hoy.md](hoy.md) | sí |
| 2026-10-05 | Plan | Cambio | tab `Plan`: sin la vista muerta de hábitos, selector de eje, las cuatro fases, íconos por eje y hojas desde abajo | [plan.md](plan.md) | sí |
| 2026-10-05 | Training | Cambio | tab `Training`: íconos, hojas desde abajo, tipo oración y respuesta al tacto | [training.md](training.md) | sí |
| 2026-10-05 | Training | Cambio | tab `Training`: la racha real de cada hábito | [training.md](training.md) |  |
| 2026-10-05 | Training | Cambio | tab `Training`: la racha congelada del hábito sin track de hoy | [training.md](training.md) |  |
| 2026-10-05 | Comunidad | Cambio | tab `Comunidad` → Eventos: el logo del servicio junto al «dónde» | [comunidad.md](comunidad.md) |  |
| 2026-10-05 | Comunidad | Excepción | tab `Comunidad` (chat): responder y copiar un mensaje, descartar una nota de voz, y la barra de escribir y las burbujas del rediseño | [comunidad.md](comunidad.md) |  |
| 2026-10-05 | Comunidad | Cambio | tab `Comunidad`: íconos, «Cursos» y respuesta al tacto | [comunidad.md](comunidad.md) |  |
| 2026-10-05 | Comunidad | Excepción | tab `Comunidad`, tanda 2 de la propuesta de rediseño (hojas): | [comunidad.md](comunidad.md) |  |
| 2026-10-05 | Yo | Cambio | tab `Yo` → Evidencia: la foto real en cada miniatura | [yo.md](yo.md) | sí |
| 2026-10-05 | Yo | Cambio | tab `Yo`: Yo y el Centro de Perfil y Ajustes | [yo.md](yo.md) | sí |
| 2026-10-05 | Ingreso | Excepción | alta (`LoginScreen`) y onboarding (Ficha Inicial, Términos, «Elige tu Día 1»): forma «de app» | [ingreso-y-onboarding.md](ingreso-y-onboarding.md) | sí |
| 2026-10-05 | Hoy, Yo | Cambio | tabs `Hoy` y `Yo`: ajustes al rediseño | [transversal.md](transversal.md) | sí |
| 2026-10-05 | Hoy, Plan, Training, Comunidad, Yo | Cambio | barra de pestañas (`TabBar`, los cinco tabs): íconos y pastilla de la pestaña abierta | [transversal.md](transversal.md) |  |
| 2026-10-05 | Hoy | Cambio | tab `Hoy` (y los rótulos de toda la app): la fase sin inventar, el rótulo de sección sin espaciado y el cierre del Mapa | [transversal.md](transversal.md) |  |
| 2026-10-05 | Plan, Training, Comunidad, Yo | Cambio | tab `Training` (y Plan, Yo y Comunidad → Eventos): pulido final tras la prueba en Android | [transversal.md](transversal.md) |  |
| 2026-10-02 | Comunidad | Excepción | tab `Comunidad` → Tribu: los chats de soporte de Admin y Alquimista en una sección plegable | [comunidad.md](comunidad.md) |  |
| 2026-10-02 | Comunidad | Excepción | tab `Comunidad`: el encabezado se esconde al desplazar | [comunidad.md](comunidad.md) |  |
| 2026-10-02 | Yo, Administración | Excepción | tab `Yo` y Administración: eliminar cuenta (backend D-243) | [yo.md](yo.md) | sí |
| 2026-10-02 | Comunidad, Yo | Excepción | tabs `Yo` y `Comunidad` (chat de soporte): el botón de emergencia | [yo.md](yo.md) | sí |
| 2026-10-02 | Hoy, Plan, Training, Comunidad, Yo | Excepción | los cinco tabs: la barra de pestañas se esconde al desplazar | [transversal.md](transversal.md) |  |
| 2026-10-01 | Hoy | Excepción | tab `Hoy`, «Mis mentores» del Líder de Mentores | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | sí |
| 2026-09-30 | Hoy | Excepción | tab `Hoy`, el orbe con la voz en vivo como una conversación abierta | [ser-y-fenix.md](ser-y-fenix.md) |  |
| 2026-09-29 | Comunidad | Excepción | tab `Comunidad` (chat): nombres de los chats y avisos de mensajes | [comunidad.md](comunidad.md) |  |
| 2026-09-28 | Hoy, Yo, Administración | Excepción | tabs `Yo` y `Hoy`, Administración y las dos fichas del aprendiz: la Caja Renaser | [yo.md](yo.md) | sí |
| 2026-09-27 | Hoy | Decisión | semáforo: los días con la cuenta suspendida no se miden (backend D-209) | [hoy.md](hoy.md) |  |
| 2026-09-27 | Hoy | Excepción | tab `Hoy`, cifra de «Hábitos de hoy» (S-9 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, E-257) | [hoy.md](hoy.md) | sí |
| 2026-09-27 | Yo | Excepción | tab `Yo` → Alarmas: la voz Dora dice el nombre del hábito, y sonidos para alertar y para relajar (decisiones del dueño de ese día, con sus notas: «que diga el nombre del hábito nomás y que sea rápido como está», tono antes de la voz «sí», y de los sonidos «déjalos como está y opcional que escoja el usuario») | [alarmas.md](alarmas.md) |  |
| 2026-09-27 | Hoy, Administración | Excepción | Administración (estado de `Hoy`), «Bienvenida» | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |  |
| 2026-09-27 | Training, Comunidad, Administración | Arreglos de E2E | Arreglos del e2e web del 2026-09-27 — tabs `Comunidad` (Classroom) y `Training`, onboarding y Administración (pedido del coordinador sobre los hallazgos TRB-04, TRN-02, PLN-02, PLN-03, ONB-02 y ADM-01) | [transversal.md](transversal.md) | sí |
| 2026-09-27 | varios | Arreglos de E2E | Arreglos del e2e del 2026-09-27 (pedidos del coordinador; hallazgos ADM-12, ADM-13, ADM-14 y CHT-06) | [transversal.md](transversal.md) |  |
| 2026-09-26 | Hoy, Training | Excepción | tabs `Training` y `Hoy`, registro con foto | [training.md](training.md) | sí |
| 2026-09-26 | Plan, Yo | Excepción | tabs `Yo` y `Plan`, aviso con voz y recordatorios de las acciones de los objetivos (decisiones del dueño de ese día) | [alarmas.md](alarmas.md) | sí |
| 2026-09-26 | Comunidad | Excepción | tab `Comunidad`, pestaña *Tribu* y chat (dos pedidos del dueño de ese día) | [comunidad.md](comunidad.md) | sí |
| 2026-09-26 | Plan, Comunidad, Yo | Excepción | tabs `Comunidad`, `Yo` y `Plan`, eventos, avisos y alarmas (E-4 a E-10 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, y §9 con las decisiones del dueño de ese día) | [comunidad.md](comunidad.md) |  |
| 2026-09-26 | Hoy | Excepción | tab `Hoy`, tarjetas del mentor y de administración (retroalimentación del 26/09, spec `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, S-1, S-6 y A-1) | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | sí |
| 2026-09-26 | Hoy | Excepción | tab `Hoy`, la foto de una ACCIÓN del día desde el acompañante (D-178 del backend) | [ser-y-fenix.md](ser-y-fenix.md) |  |
| 2026-09-26 | Hoy, Training, Comunidad | Excepción | tabs `Training`, `Comunidad` y `Hoy`, velocidad (V-1..V-4 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend) | [transversal.md](transversal.md) |  |
| 2026-09-25 | Hoy | Excepción | tab `Hoy`, tarjeta del semáforo | [hoy.md](hoy.md) | sí |
| 2026-09-22 | Plan | Excepción | tab `Plan`, las acciones bajan al día | [plan.md](plan.md) |  |
| 2026-09-22 | Hoy, Plan | Excepción | tabs `Hoy` y `Plan` | [plan.md](plan.md) |  |
| 2026-09-22 | Plan | Excepción | tab `Plan`, la cifra del mes se toca para corregirla | [plan.md](plan.md) |  |
| 2026-09-22 | Plan | Excepción | tab `Plan`, tarjeta del mes | [plan.md](plan.md) | sí |
| 2026-09-22 | Plan, Training | Excepción | tabs `Training` y `Plan` | [training.md](training.md) | sí |
| 2026-09-22 | Comunidad | Excepción | tab `Comunidad`, pestaña *Tribu* | [comunidad.md](comunidad.md) | sí |
| 2026-09-21 | Plan, Comunidad, Yo | Excepción | tabs `Plan`, `Comunidad` y `Yo` | [transversal.md](transversal.md) |  |
| 2026-09-16 | Yo | Excepción | tab `Yo` | [yo.md](yo.md) |  |
