# Cambios autorizados por el dueño — índice

Qué autorizó el dueño en cada tab y «lo que cambia y nada más». Es el historial que antes vivía dentro de
`AGENTS.md` (§1, «Integridad del Core»): se movió tal cual el 2026-10-29 para que `AGENTS.md` vuelva a ser corto
(antes se cargaban ~260 KB en cada sesión). La regla no cambió: **los cinco tabs principales no se tocan sin una
autorización explícita del dueño, y una autorización puntual no abre el tab.**

## Cómo se usa

1. **Antes de tocar un tab**, filtra esta tabla por su nombre (columna «Tabs») y lee esas entradas en su archivo.
   Una entrada que toca varios tabs vive en un solo archivo; por eso hay que filtrar por la columna, no por el archivo.
2. **Cuando el dueño autoriza un cambio nuevo**, la entrada va al final del archivo de su dominio, con el mismo
   formato (`## <tipo> — AAAA-MM-DD — <qué>`, el pedido textual, «lo que cambia y nada más», «no cambian» y si hace
   falta APK o backend), y una fila nueva **arriba** de esta tabla. **Nunca en `AGENTS.md`**:
   `src/__tests__/harness/agentsCorto.test.ts` lo frena.
3. Si una entrada vieja queda desmentida por el código, se corrige con una nota `> **Corregido AAAA-MM-DD.** …`
   debajo de lo que corrige, como siempre.

| Archivo | Qué guarda |
|---|---|
| [hoy.md](hoy.md) | Hoy: tarjetas, semáforo, SER y el fénix, Código Renaser |
| [plan.md](plan.md) | Plan: objetivos, semana, mes y el Mapa de Renacimiento |
| [training.md](training.md) | Training: hábitos, evidencias, racha y el editor Planificar (forma) |
| [alarmas.md](alarmas.md) | Alarmas y recordatorios: specs 007–010, voces, canales y el puente de #33 |
| [comunidad.md](comunidad.md) | Comunidad: Muro, chat, Tribu, Eventos, Cursos y Ranking |
| [yo.md](yo.md) | Yo: Ajustes, fase, evidencias, Caja, emergencia, cuenta y privacidad |
| [liderazgo-y-administracion.md](liderazgo-y-administracion.md) | Mentor, líder de mentores, administración, alquimista y sus fichas |
| [ingreso.md](ingreso.md) | Login, onboarding y elegir el Día 1 |
| [transversal.md](transversal.md) | Lo que cambió varios tabs a la vez: barra de pestañas, interruptores, velocidad, arreglos de E2E |

## Entradas (la más nueva primero)

| Fecha | Tabs | Tipo | Entrada | Archivo |
|---|---|---|---|---|
| 2026-10-27 | Training, Yo | Corrección | los recordatorios de un hábito cumplido ya no suenan ese día (issue #33) | [alarmas.md](alarmas.md) |
| 2026-10-27 | Hoy, Administración | Cambio | Administración (estado de `Hoy`): Administración y Alquimista ven las evidencias como el líder | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-10-27 | Administración | Corrección | la ficha del mentor abre las evidencias dentro de la app | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-10-27 | Plan | Cambio | tab `Plan`: los objetivos esperan al Mapa de Renacimiento (issue #37) | [plan.md](plan.md) |
| 2026-10-20 | Training | Cambio | tab `Training` → Planificar: días solo con íconos, «Otra» en su lugar y pantalla completa | [training.md](training.md) |
| 2026-10-20 | Training | Cambio | tab `Training` → Planificar: el recordatorio por día | [alarmas.md](alarmas.md) |
| 2026-10-20 | Training | Cambio | tab `Training` → Planificar: cómo suena la alarma | [alarmas.md](alarmas.md) |
| 2026-10-20 | Plan, Yo | Cambio | tabs `Plan` y `Yo` → Alarmas: las acciones de los objetivos por día y cómo suenan | [alarmas.md](alarmas.md) |
| 2026-10-19 | Hoy | Corrección | Código Renaser sin parpadeo y con el 409 | [hoy.md](hoy.md) |
| 2026-10-19 | Yo, Training | Cambio | alarmas como el despertador, aviso cuando el teléfono las borra y guía por marca (tab `Yo` → Alarmas, una hoja global y, en Training → Planificar, una oferta única de la guía) | [alarmas.md](alarmas.md) |
| 2026-10-19 | Hoy, Yo | Cambio | tab `Hoy` (semáforo por grupos del líder), las fichas del mentor y de administración, y `Yo` → Notificaciones: el líder de mentores ve el cumplimiento de cada persona por grupo | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-10-19 | Hoy | Cambio | tab `Hoy`: la tarjeta del semáforo con el mensaje del día y el sticker del búho | [hoy.md](hoy.md) |
| 2026-10-19 | Comunidad | Cambio | tab `Comunidad` → Ranking: «Descargar» la imagen del podio | [comunidad.md](comunidad.md) |
| 2026-10-17 | Training | Corrección | hábitos al cambiar de día | [training.md](training.md) |
| 2026-10-14 | Hoy, Plan, Training, Comunidad, Yo, Administración | Cambio | los cinco tabs y Administración: lo no disponible se esconde, y la consola Soporte TI suma despliegue, roles personalizados y «ver como» (spec 002, fase 2) | [transversal.md](transversal.md) |
| 2026-10-13 | Hoy, Comunidad, Administración | Cambio | Administración (estado de `Hoy`) y `Comunidad` (info del chat): el rol «Guía de aprendiz», el rol al aprobar y dos arreglos | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-10-13 | Training, Comunidad | Cambio | tabs `Training` y `Comunidad` (ranking): el hábito GIMNASIO y su pestaña | [training.md](training.md) |
| 2026-10-13 | Hoy, Plan, Training, Comunidad, Yo | Cambio | los cinco tabs: aviso de mantenimiento cuando una funcionalidad está apagada (spec 002) | [transversal.md](transversal.md) |
| 2026-10-12 | Hoy, Administración | Cambio | Administración (estado de `Hoy`): «Hábitos del programa», con audiencia por rol | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-10-10 | Plan | Corrección | Corrección encontrada en el E2E del Mapa del Poder por rol — 2026-10-10 (backend E-592). | [plan.md](plan.md) |
| 2026-10-10 | Hoy, Training, Yo | Corrección | Recuperación del Día 1 de cuentas anteriores — 2026-10-10 (backend E-594/E-596/E-597). | [ingreso.md](ingreso.md) |
| 2026-10-07 | Hoy, Training, Yo | Cambio | tabs `Training`, `Hoy` y `Yo`: «Elegir mi Día 1» para el personal | [ingreso.md](ingreso.md) |
| 2026-10-07 | Training | Cambio | tab `Training` y el botón de SER: el momento de cumplir un hábito | [training.md](training.md) |
| 2026-10-07 | Hoy, Training, Yo | Cambio | tabs `Hoy`, `Training` y `Yo`: pantalla completa para los momentos grandes | [hoy.md](hoy.md) |
| 2026-10-07 | Hoy | Cambio | tab `Hoy` (el centro): el fénix se mueve al escucharte, pensar y hablar | [hoy.md](hoy.md) |
| 2026-10-06 | Yo | Cambio | tab `Yo`: el animal de cada fase | [yo.md](yo.md) |
| 2026-10-06 | Yo | Cambio | tab `Yo`: la tarjeta de fase «B · Tarjeta héroe» y las imágenes configurables | [yo.md](yo.md) |
| 2026-10-06 | Plan, Yo | Cambio | tabs `Yo` y `Plan`: la misma fase en las dos | [yo.md](yo.md) |
| 2026-10-06 | Comunidad | Cambio | tab `Comunidad` (Classroom): sin Sparkie, el curso abre a SER | [comunidad.md](comunidad.md) |
| 2026-10-06 | Yo | Cambio | tab `Yo` (Ajustes) y el ingreso: Política de Privacidad (backend D-245). | [yo.md](yo.md) |
| 2026-10-06 | Comunidad | Cambio | tab `Comunidad` → Eventos: «Quién respondió» y «Pasar lista» (backend D-256). | [comunidad.md](comunidad.md) |
| 2026-10-06 | Hoy | Cambio | tab `Hoy` (el centro) y SER: el fénix | [hoy.md](hoy.md) |
| 2026-10-05 | Plan | Cambio | tab `Plan`: sin la vista muerta de hábitos, selector de eje, las cuatro fases, íconos por eje y hojas desde abajo | [plan.md](plan.md) |
| 2026-10-05 | Hoy | Cambio | tab `Hoy`: íconos, tipo oración, respuesta al tacto y el día real en el Mapa | [hoy.md](hoy.md) |
| 2026-10-05 | Yo | Cambio | tab `Yo` → Evidencia: la foto real en cada miniatura | [yo.md](yo.md) |
| 2026-10-05 | Comunidad | Cambio | tab `Comunidad` → Eventos: el logo del servicio junto al «dónde». | [comunidad.md](comunidad.md) |
| 2026-10-05 | Comunidad | Excepción | tab `Comunidad` (chat): responder y copiar un mensaje, descartar una nota de voz, y la barra de escribir y las burbujas del rediseño | [comunidad.md](comunidad.md) |
| 2026-10-05 | Comunidad | Cambio | tab `Comunidad`: íconos, «Cursos» y respuesta al tacto | [comunidad.md](comunidad.md) |
| 2026-10-05 | Yo | Cambio | tab `Yo`: Yo y el Centro de Perfil y Ajustes | [yo.md](yo.md) |
| 2026-10-05 | Training | Cambio | tab `Training`: íconos, hojas desde abajo, tipo oración y respuesta al tacto | [training.md](training.md) |
| 2026-10-05 | Training | Cambio | tab `Training`: la racha real de cada hábito | [training.md](training.md) |
| 2026-10-05 | Training | Cambio | tab `Training`: la racha congelada del hábito sin track de hoy | [training.md](training.md) |
| 2026-10-05 | Hoy, Yo | Cambio | tabs `Hoy` y `Yo`: ajustes al rediseño | [hoy.md](hoy.md) |
| 2026-10-05 | Hoy, Plan, Training, Comunidad, Yo | Cambio | barra de pestañas (`TabBar`, los cinco tabs): íconos y pastilla de la pestaña abierta | [transversal.md](transversal.md) |
| 2026-10-05 | Hoy | Cambio | tab `Hoy` (y los rótulos de toda la app): la fase sin inventar, el rótulo de sección sin espaciado y el cierre del Mapa | [hoy.md](hoy.md) |
| 2026-10-05 | Training | Cambio | tab `Training` (y Plan, Yo y Comunidad → Eventos): pulido final tras la prueba en Android | [training.md](training.md) |
| 2026-10-05 | Ingreso | Excepción | alta (`LoginScreen`) y onboarding (Ficha Inicial, Términos, «Elige tu Día 1»): forma «de app» | [ingreso.md](ingreso.md) |
| 2026-10-05 | Comunidad | Excepción | tab `Comunidad`, tanda 2 de la propuesta de rediseño (hojas): | [comunidad.md](comunidad.md) |
| 2026-10-02 | Yo, Administración | Excepción | tab `Yo` y Administración: eliminar cuenta (backend D-243). | [yo.md](yo.md) |
| 2026-10-02 | Comunidad, Yo | Excepción | tabs `Yo` y `Comunidad` (chat de soporte): el botón de emergencia | [yo.md](yo.md) |
| 2026-10-02 | Comunidad | Excepción | tab `Comunidad` → Tribu: los chats de soporte de Admin y Alquimista en una sección plegable | [comunidad.md](comunidad.md) |
| 2026-10-02 | Comunidad | Excepción | tab `Comunidad`: el encabezado se esconde al desplazar | [comunidad.md](comunidad.md) |
| 2026-10-02 | Hoy, Plan, Training, Comunidad, Yo | Excepción | los cinco tabs: la barra de pestañas se esconde al desplazar | [transversal.md](transversal.md) |
| 2026-10-01 | Hoy | Excepción | tab `Hoy`, «Mis mentores» del Líder de Mentores | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-09-30 | Hoy | Excepción | tab `Hoy`, el orbe con la voz en vivo como una conversación abierta | [hoy.md](hoy.md) |
| 2026-09-29 | Comunidad | Excepción | tab `Comunidad` (chat): nombres de los chats y avisos de mensajes | [comunidad.md](comunidad.md) |
| 2026-09-28 | Hoy, Yo, Administración | Excepción | tabs `Yo` y `Hoy`, Administración y las dos fichas del aprendiz: la Caja Renaser | [yo.md](yo.md) |
| 2026-09-27 | Yo | Excepción | tab `Yo` → Alarmas: la voz Dora dice el nombre del hábito, y sonidos para alertar y para relajar (decisiones del dueño de ese día, con sus notas: «que diga el nombre del hábito nomás y que sea rápido como está», tono antes de la voz «sí», y de los sonidos «déjalos como está y opcional que escoja el usuario»). | [alarmas.md](alarmas.md) |
| 2026-09-27 | Hoy | Decisión | semáforo: los días con la cuenta suspendida no se miden (backend D-209). | [hoy.md](hoy.md) |
| 2026-09-27 | Hoy | Excepción | tab `Hoy`, cifra de «Hábitos de hoy» (S-9 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, E-257). | [hoy.md](hoy.md) |
| 2026-09-27 | Hoy, Administración | Excepción | Administración (estado de `Hoy`), «Bienvenida» | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-09-27 | Training, Comunidad, Administración, Ingreso | Arreglos E2E | Arreglos del e2e web del 2026-09-27 — tabs `Comunidad` (Classroom) y `Training`, onboarding y Administración (pedido del coordinador sobre los hallazgos TRB-04, TRN-02, PLN-02, PLN-03, ONB-02 y ADM-01). | [transversal.md](transversal.md) |
| 2026-09-27 | Comunidad, Administración | Arreglos E2E | Arreglos del e2e del 2026-09-27 (pedidos del coordinador; hallazgos ADM-12, ADM-13, ADM-14 y CHT-06). | [transversal.md](transversal.md) |
| 2026-09-26 | Comunidad | Excepción | tab `Comunidad`, pestaña *Tribu* y chat (dos pedidos del dueño de ese día). | [comunidad.md](comunidad.md) |
| 2026-09-26 | Plan, Yo | Excepción | tabs `Yo` y `Plan`, aviso con voz y recordatorios de las acciones de los objetivos (decisiones del dueño de ese día). | [alarmas.md](alarmas.md) |
| 2026-09-26 | Plan, Comunidad, Yo | Excepción | tabs `Comunidad`, `Yo` y `Plan`, eventos, avisos y alarmas (E-4 a E-10 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, y §9 con las decisiones del dueño de ese día). | [comunidad.md](comunidad.md) |
| 2026-09-26 | Hoy, Training, Comunidad | Excepción | tabs `Training`, `Comunidad` y `Hoy`, velocidad (V-1..V-4 de `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend). | [transversal.md](transversal.md) |
| 2026-09-26 | Hoy, Administración | Excepción | tab `Hoy`, tarjetas del mentor y de administración (retroalimentación del 26/09, spec `docs/specs/RETROALIMENTACION_2026-09-26.md` del backend, S-1, S-6 y A-1). | [liderazgo-y-administracion.md](liderazgo-y-administracion.md) |
| 2026-09-26 | Hoy, Training | Excepción | tabs `Training` y `Hoy`, registro con foto. | [training.md](training.md) |
| 2026-09-26 | Hoy | Excepción | tab `Hoy`, la foto de una ACCIÓN del día desde el acompañante (D-178 del backend). | [hoy.md](hoy.md) |
| 2026-09-25 | Hoy | Excepción | tab `Hoy`, tarjeta del semáforo. | [hoy.md](hoy.md) |
| 2026-09-22 | Plan, Training | Excepción | tabs `Training` y `Plan`. | [training.md](training.md) |
| 2026-09-22 | Plan | Excepción | tab `Plan`, las acciones bajan al día. | [plan.md](plan.md) |
| 2026-09-22 | Hoy, Plan | Excepción | tabs `Hoy` y `Plan`. | [plan.md](plan.md) |
| 2026-09-22 | Plan | Excepción | tab `Plan`, la cifra del mes se toca para corregirla. | [plan.md](plan.md) |
| 2026-09-22 | Plan | Excepción | tab `Plan`, tarjeta del mes. | [plan.md](plan.md) |
| 2026-09-22 | Comunidad | Excepción | tab `Comunidad`, pestaña *Tribu*. | [comunidad.md](comunidad.md) |
| 2026-09-21 | Plan, Comunidad, Yo | Excepción | tabs `Plan`, `Comunidad` y `Yo`. | [transversal.md](transversal.md) |
| 2026-09-16 | Yo | Excepción | tab `Yo`. | [yo.md](yo.md) |
