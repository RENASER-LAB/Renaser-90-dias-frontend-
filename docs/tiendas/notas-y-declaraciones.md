# Notas para el revisor y declaraciones de las tiendas

Texto listo para copiar en App Store Connect y Google Play Console (spec 060, FR-006 a FR-009). Cada punto cita el patrón del
playbook [app-store-compliance](https://github.com/mjmirza/app-store-compliance) (`data/rejection-patterns.json`) que evita.
**Es lo que hay que revisar antes de cada subida**: si algo de abajo ya no es cierto, se corrige acá y en la consola.

> Las contraseñas no se escriben en este archivo (repo público). La cuenta de demostración es la que ya está cargada en
> App Store Connect («Información de revisión») y su equivalente en Play Console («Acceso de la app»). Fecha de la
> última revisión de este documento: 2026-11-27, versión nativa 1.8.0.

---

## 1. Notas para el revisor de Apple (campo «Notes» de Información de revisión)

Patrones: `APPLE-2.1-REVIEW-NOTES-INCOMPLETE`, `APPLE-2.1-MISSING-DEMO-ACCOUNT`, `APPLE-2.1-DEBUG-FEATURES`,
`APPLE-2.3-FUTURE-FUNCTIONALITY`. Las seis secciones de la plantilla del playbook, en español de Perú:

```text
1. VIDEO DE PANTALLA
Enlace al video grabado en un dispositivo físico: <pegar el enlace>. Muestra: ingreso, ficha inicial, un hábito, el chat con el
acompañante (con el aviso de consentimiento de IA), «Correr con GPS» con su aviso de ubicación, el permiso de Salud, el muro
(publicar y comentar) y «Eliminar mi cuenta».

2. PARA QUÉ SIRVE
Renaser (NaSer) es la app de un programa de transformación personal de varias semanas. La persona recibe un plan diario de
hábitos, entrega evidencias (foto, video o audio) a un mentor, ve su avance, participa en la comunidad de su grupo y conversa con
un acompañante de inteligencia artificial. No vende nada dentro de la app: el acceso al programa lo gestiona la organización fuera
de la app.

3. CÓMO ENTRAR Y CUENTA DE DEMOSTRACIÓN
Usuario y contraseña: los de la cuenta de demostración (aprendiz) ya cargados en App Store Connect; la contraseña no se
repite en esta nota. La cuenta ya terminó el ingreso, tiene programa activo y audio desde el primer día, y se mantiene activa y sin
doble verificación hasta que termine la revisión. Pasos: Hoy (hábitos del día) → Plan (objetivos) → Entrenar (lista de hoy,
audioterapia, «Correr con GPS») → Comunidad (muro y chats del grupo) → Yo (perfil, notificaciones, «Mi ingreso», «Salud de
Apple», «Eliminar mi cuenta»). El botón flotante con el fénix abre al acompañante.

4. SERVICIOS EXTERNOS
- Google (Gemini API): respuestas del acompañante, voz en vivo, voz del acompañante y análisis 80/20. La primera vez que la persona
  abre el chat o toca el orbe de voz, la app muestra un aviso que nombra a Google (Gemini) y qué datos viajan, y pide que lo acepte.
- Amazon Web Services (S3, servidores): almacenamiento de evidencias y alojamiento del servicio.
- Google Maps (mapa de la carrera) y Google Calendar / Meet (eventos y sesiones en vivo).
- Expo (EAS Update y notificaciones push): ver el punto de actualizaciones por internet más abajo.
- YCloud (WhatsApp): códigos de verificación y avisos al número que la persona registra.

5. DIFERENCIAS POR REGIÓN
La app funciona igual en todas las regiones. Los textos están en español de Perú.

6. INDUSTRIA REGULADA
No aplica. La app no da consejo médico ni financiero ni hace diagnósticos clínicos.
```

### Notas por función (se pegan debajo de la sección 3 cuando la función aparece en la versión)

**Widget de acciones de hoy** (spec 059). Muestra las acciones del día de la persona (ruta del día, qué cumplió) en la pantalla de
inicio. Es solo de lectura: **no completa nada por sí mismo**; tocarlo abre la app en la acción. No lee datos de otras apps y solo
guarda lo que la app le comparte en el contenedor compartido del dispositivo.

**Actualizaciones por internet (EAS Update).** La app usa `expo-updates` con el canal `production`. Las actualizaciones traen solo
JavaScript y recursos de la misma versión nativa: no cambian el propósito de la app, no agregan permisos ni funciones nuevas que no
estén en la versión revisada, y no descargan código ejecutable de otra fuente (guideline 2.5.2).

**Funciones detrás de interruptores del servidor.** Algunas funciones (voz en vivo, «Correr con GPS», pagos, podio semanal) se
prenden o apagan desde el servidor por cuenta y por formación. Lo que ve el revisor con la cuenta de demostración es lo que está
prendido para esa cuenta; ninguna función apagada promete nada en la ficha de la tienda (`APPLE-2.3-FUTURE-FUNCTIONALITY`).

**«Correr con GPS» y el modo de ubicación** (justifica el permiso de ubicación y el servicio en primer plano). Paso a paso:
1. Entrar con la cuenta de demostración → pestaña Entrenar → fila «Kilómetros diarios» → botón «Correr».
2. La app muestra el aviso del sistema: «Renaser usa tu ubicación solo mientras corres con «Correr con GPS», para contar tus
   kilómetros y dibujar tu ruta.» Aceptar «Al usar la app».
3. Cuenta regresiva 3, 2, 1 y se ve el mapa con tiempo, distancia, ritmo y calorías. Se puede pausar deslizando.
4. Mientras la pantalla está bloqueada la carrera sigue contando (en Android, con una notificación fija de servicio en primer plano
   que dice que hay una carrera en curso; en iPhone, indicador de ubicación). **No se pide ubicación «siempre»** y no se usa fuera
   de una carrera iniciada por la persona.
5. «Terminar» → «Carrera terminada» → «Registramos X km en tu hábito». Se guarda solo el recorrido de esa carrera.
Si la persona rechaza el permiso, puede subir una captura como siempre (`ANDROID-RUNTIME-PERMISSIONS`).

**«Mi ingreso» no cobra.** Yo → «Mi ingreso» solo muestra el cronograma de cuotas que la organización acordó con la persona por
fuera de la app (fechas, montos y estado que registra Administración). No hay botón de pago, ni enlace a pagar, ni compra de
bienes digitales dentro de la app (`APPLE-3.1.1-EXTERNAL-PAYMENT`: no aplica; el programa es un servicio de acompañamiento
personal contratado fuera).

**La Pastilla Renacer como reproductor del sistema** (norma 2.5.4). El audio en segundo plano es solo de audioterapia y de la
pastilla del día: la persona lo inicia y aparece como reproductor del sistema (pantalla de bloqueo, centro de control, auriculares)
con título y pausa. No hay audio en segundo plano sin esa reproducción.

**Salud de Apple y Health Connect: solo lectura de pasos y distancia.** Solo se pide leer el total diario de pasos y de distancia
para llenar los kilómetros del día. No se escribe nada en Salud (`NSHealthUpdateUsageDescription` lo dice), no se lee frecuencia
cardiaca, sueño, rutas ni ubicación, y no se usa para publicidad ni se vende (guideline 2.5.1 y 5.1.3). La persona lo conecta
desde Yo → «Salud de Apple» (en Android, Health Connect desde el hábito de kilómetros) y puede desconectarlo cuando quiera
(`ANDROID-HEALTH-PERMISSIONS`).

**Contenido generado por usuarios.** Hay muro, comentarios, reacciones y chats de grupo. Hoy: términos que se aceptan al ingresar,
moderación por Administración (ocultar publicaciones), contacto de soporte publicado y eliminación de cuenta dentro de la app.
**Pendiente (no incluido en esta versión): «Denunciar» y «Bloquear» dentro de Comunidad**, a la espera de la autorización del dueño
(`APPLE-1.2-UGC-24H-ACTION`, `BOTH-AI-GENERATED-CONTENT`). Si el revisor lo pide, es el primer trabajo de la siguiente versión.

---

## 2. Notas para el revisor de Google Play («Acceso de la app» y «Declaraciones»)

Patrones: `ANDROID-USER-DATA-DISCLOSURE`, `ANDROID-HEALTH-PERMISSIONS`, `ANDROID-RUNTIME-PERMISSIONS`.

```text
Renaser (NaSer) es la app de un programa de transformación personal con plan diario de hábitos, evidencias para un mentor,
comunidad por grupo y un acompañante de IA. Acceso: usuario y contraseña de la cuenta de demostración cargados en «Acceso de la
app» (sin doble verificación). No hay compras dentro de la app.
- Ubicación (solo en primer plano, mientras corres con «Correr con GPS»): contar kilómetros y dibujar la ruta. Servicio en primer
  plano de tipo ubicación con notificación visible. No se pide ubicación en segundo plano.
- Health Connect (solo lectura de pasos y distancia): llenar los kilómetros del día. No se escribe en Health Connect.
- Micrófono: dictar mensajes y voz en vivo con el acompañante. Cámara y fotos: evidencias de hábitos y fotos del muro.
- Servicio en primer plano de reproducción multimedia: audioterapia y pastilla del día.
- Alarmas exactas: despertar y recordatorios que la persona programa.
- IA generativa: respuestas del acompañante con Google (Gemini API). Aviso y aceptación dentro de la app antes del primer envío.
- Actualizaciones por internet (EAS Update): solo JavaScript y recursos, sin cambiar permisos ni propósito.
- Contenido de usuarios (muro, comentarios, chats): moderación por Administración; denuncia y bloqueo en la siguiente versión.
- Eliminación de cuenta: dentro de la app (Yo → «Eliminar mi cuenta») y en la página pública de eliminación.
```

---

## 3. Etiquetas de privacidad de Apple y Seguridad de los datos (Data safety) de Google

Patrones: `APPLE-PRIVACY-NUTRITION-LABELS`, `GOOGLE-DATASAFETY-MISMATCH`, `ANDROID-USER-DATA-DISCLOSURE`,
`APPLE-5.1.1-UNNECESSARY-DATA`. La fuente es el código de la app y la política (`public/privacidad/index.html`, secciones 3 y 5).
Todos los datos se cifran en tránsito (HTTPS) y la persona puede pedir que se eliminen desde la app. **Ningún dato se usa para
rastreo (tracking) ni publicidad, y ninguno se vende.** Marcar «Vinculado a la identidad: Sí» en todo.

| Dato que la app pide | De dónde sale | Apple: tipo de dato | Google: categoría y tipo | Finalidad | ¿Se comparte? |
|---|---|---|---|---|---|
| Nombre | Alta y ficha inicial | Contact Info → Name | Personal info → Name | Funciones de la app, cuenta | No |
| Correo | Alta | Contact Info → Email Address | Personal info → Email address | Cuenta, funciones | No |
| **Teléfono / WhatsApp** (con código de país) | Alta, ficha, Yo → WhatsApp | Contact Info → Phone Number | Personal info → Phone number | Verificación, avisos, funciones | Sí, con YCloud (proveedor de WhatsApp) |
| **Dirección** (país, departamento, ciudad, distrito, dirección) y la de entrega de la Caja Renaser (quién recibe, referencias, otro celular) | Ficha inicial y Caja | Contact Info → Physical Address | Personal info → Address | Funciones (programa y envío físico) | Solo con el transportista cuando hay envío |
| **Fecha de nacimiento** | Ficha inicial | Other Data (fecha de nacimiento) | Personal info → Other info | Funciones (perfil del programa) | No |
| **DNI / tipo y número de documento** | Ficha inicial y Caja | Other Data (documento de identidad) | Personal info → Other info (identificadores oficiales) | Funciones; el envío de la Caja | Solo con el transportista cuando hay envío |
| Sexo, estado civil, hijos, ocupación, negocio | Ficha inicial | Sensitive Info (solo si se elige) / Other Data | Personal info → Other info | Funciones | No |
| Peso, estatura, sueño, condiciones de salud, medicación, objetivo de salud | Ficha inicial | Health & Fitness → Health | Health and fitness → Health info | Funciones | Sí, con Google (Gemini) solo si la persona usa el acompañante con diagnóstico |
| Respuestas del diagnóstico inicial (mente, emociones, dinero, familia) | Diagnóstico | Sensitive Info / Other User Content | Personal info → Other info | Funciones | Sí, con Google (Gemini) |
| Firma (imagen) y fechas de aceptación de términos y pacto | Onboarding | Other User Content | App activity → Other user-generated content | Funciones, constancia legal | No |
| Pasos y distancia (Salud de Apple / Health Connect, solo lectura) y kilómetros | Salud, carrera | Health & Fitness → Fitness | Health and fitness → Fitness info | Funciones | No |
| **Ubicación precisa** (solo durante «Correr con GPS»), recorrido y movimiento | Carrera con GPS | Location → Precise Location | Location → Precise location | Funciones | No |
| Fotos, videos y audios de evidencia, fotos del muro, adjuntos de soporte | Hábitos, muro, soporte | Photos or Videos; Audio Data; Other User Content | Photos and videos; Audio files | Funciones | No |
| **Voz** (voz en vivo y dictado) | Acompañante, Código Renaser | Audio Data | Audio → Voice or sound recordings | Funciones | Sí, con Google (Gemini): se procesa al instante, el audio no se guarda |
| **Mensajes al acompañante de IA** y sus respuestas | Chat con SER | User Content → Other User Content | Messages → Other in-app messages | Funciones | Sí, con Google (Gemini) |
| Mensajes de chat con mentor, grupo y soporte | Chat | User Content → Customer Support / Other User Content | Messages → Other in-app messages | Funciones | No |
| Publicaciones, comentarios y reacciones del muro | Comunidad | User Content → Other User Content | App activity → Other user-generated content | Funciones | Con el grupo de la persona |
| Hábitos, objetivos, diario, radar, «Cierra tu día», puntos y ranking | Hoy, Plan, Training | Usage Data → Product Interaction; Other User Content | App activity → App interactions; Other user-generated content | Funciones, análisis dentro de la app | Sí, con Google (Gemini) solo el análisis 80/20, sin nombre ni contacto |
| Cuotas y pagos acordados (cronograma de «Mi ingreso») | Pagos | Financial Info → Other Financial Info | Financial info → Other financial info | Funciones | No |
| Identificador del dispositivo para notificaciones (token de push) | Notificaciones | Identifiers → Device ID | Device or other IDs → Device or other IDs | Funciones (avisos) | Sí, con Expo / Apple / Google (envío de push) |
| Datos técnicos de la app para soporte | Soporte | Diagnostics → Other Diagnostic Data | App info and performance → Diagnostics | Funciones, soporte | No |

Notas para llenar:
- **Apple: «Data Used to Track You»: ninguno.** No hay SDK de anuncios ni ATT (`APPLE-5.1.2-MISSING-ATT`: no aplica; confirmar
  con `app.json` antes de cada subida).
- **Google: «Datos recopilados» = Sí; «Datos compartidos» = Sí** solo por los proveedores de la columna final; marcar «Los datos se
  cifran en tránsito» y «Los usuarios pueden pedir que se borren los datos» (con enlace a la página de eliminación de cuenta).
- **Declaración de salud de Google (Health Connect):** pasos y distancia, solo lectura, para calcular kilómetros diarios; política
  de privacidad con la sección «Tus pasos y tu distancia».
- La declaración de la IA: «Datos compartidos con un tercero de IA (Google Gemini) con consentimiento dentro de la app, antes del
  primer envío» (`APPLE-5.1.2-AI-NO-CONSENT-MODAL`; ver la spec 060, FR-001 a FR-005).

---

## 4. Declaración de red social de Apple

Patrones: `APPLE-1.2-UGC-24H-ACTION`, `BOTH-AI-GENERATED-CONTENT`.

- **¿La app tiene funciones de red social o de contenido de usuarios?** **Sí.** Muro de la comunidad (publicaciones con foto),
  chats de grupo y 1 a 1, comentarios y reacciones.
- **¿Quién ve el contenido?** Solo los integrantes del programa y del grupo de la persona; no hay perfiles públicos ni búsqueda
  de desconocidos ni mensajes de extraños.
- **Moderación hoy:** términos aceptados al ingresar, Administración y el Alquimista pueden ocultar publicaciones, contacto de
  soporte publicado, eliminación de cuenta.
- **Pendiente, sin autorización todavía:** «Denunciar a Administración» y «Bloquear» en Comunidad (ver spec 060, «Lo que no cubre»).

## 5. Cuestionario de edad nuevo de Apple (2026)

Patrón: `APPLE-2.3-AGE-RATING-2026`. Respuestas de la versión 1.8.0:

| Pregunta | Respuesta |
|---|---|
| Contenido generado por usuarios / red social | Sí (muro, chats, comentarios, reacciones) |
| **Ubicación compartida con otras personas** | **No se comparte con otros.** La ubicación se usa solo para contar los kilómetros de la persona y no la ve nadie más (la persona puede compartir en el muro una carrera ya terminada, con su mapa: si el cuestionario lo cuenta como ubicación compartida, responder «Sí, de forma limitada») |
| **Citas o contenido de citas** | No |
| Chatbot de IA / contenido generado por IA | Sí: el acompañante (Google Gemini), con filtros del proveedor y reglas del programa |
| Contenido médico o de salud | Solo lectura de pasos y distancia; sin consejo médico |
| Compras dentro de la app, juegos de azar, violencia, contenido sexual, drogas | No |
| Edad sugerida | 17+ si Apple lo exige por el chatbot de IA con contenido sin filtrar; con las respuestas de arriba se espera 12+ o 13+. Aplicar la que calcule el cuestionario |

---

## 6. Lista de verificación antes de cada subida

Marca cada punto en el PR de la subida. Patrón entre paréntesis.

- [ ] La cuenta de demostración entra, tiene programa activo y no pide doble verificación; la contraseña en la consola es la vigente (`APPLE-2.1-MISSING-DEMO-ACCOUNT`).
- [ ] El backend al que apunta la build es producción, no local ni pruebas (`APPLE-2.1-STAGING-BACKEND`, `APPLE-2.1-CLOUD-NOT-IN-PRODUCTION`).
- [ ] Sin pantallas de depuración ni texto de relleno (`APPLE-2.1-DEBUG-FEATURES`, `APPLE-2.1-PLACEHOLDER-CONTENT`).
- [ ] Cada texto de permiso de `app.json` dice para qué y es específico (`APPLE-5.1.1-VAGUE-PURPOSE-STRING`, `APPLE-5.1.1-MISSING-USAGE-DESCRIPTION`).
- [ ] No hay permisos o capacidades de más: lo que está en `app.json` se usa en la app (`APPLE-2.4.5-UNUSED-ENTITLEMENTS`, `ANDROID-RUNTIME-PERMISSIONS`).
- [ ] El aviso de consentimiento de IA sigue nombrando a Google (Gemini) y los datos que viajan, y coincide con la política (`APPLE-5.1.2-AI-NO-CONSENT-MODAL`).
- [ ] Las etiquetas de privacidad y la Data safety de la sección 3 siguen siendo ciertas: si la build suma un dato o un SDK, se actualiza esta tabla y las dos consolas (`APPLE-PRIVACY-NUTRITION-LABELS`, `GOOGLE-DATASAFETY-MISMATCH`).
- [ ] Los manifiestos de privacidad de la app y del widget están completos y la revisión del manifiesto del AAB no encuentra permisos nuevos sin justificar (spec 060, FR-010 a FR-015 y FR-020 a FR-022; `APPLE-PRIVACY-MANIFEST-MISSING`).
- [ ] La política de privacidad publicada coincide con la app (`APPLE-5.1.1-MISSING-PRIVACY-POLICY`) y «Eliminar mi cuenta» funciona dentro de la app (`APPLE-5.1.1-NO-ACCOUNT-DELETION`).
- [ ] Declaración de cifrado: la app no usa cifrado propio (`ITSAppUsesNonExemptEncryption` en falso) (`APPLE-EXPORT-COMPLIANCE-MISSING`).
- [ ] Declaración de red social y cuestionario de edad contestados con la sección 4 y 5 (`APPLE-1.2-UGC-24H-ACTION`, `APPLE-2.3-AGE-RATING-2026`).
- [ ] La ficha de la tienda no promete nada que la build no tenga (`APPLE-2.3-FUTURE-FUNCTIONALITY`) y no nombra a otra plataforma (`APPLE-2.3-CROSS-PLATFORM-REFERENCE`).
- [ ] Notas del revisor al día con las secciones 1 y 2, video grabado en un dispositivo físico si Apple lo pidió (`APPLE-2.1-REVIEW-NOTES-INCOMPLETE`).
- [ ] `SCHEDULE_EXACT_ALARM` declarado en Play Console («Permisos de alarmas y recordatorios exactos») como app de alarma o despertador: la función principal incluye despertar y recordatorios programados por la persona (`ANDROID-RUNTIME-PERMISSIONS`).
- [ ] La clave de Google Maps está restringida por nombre de paquete y huella SHA-1 (Android) y por identificador de paquete (iPhone); sin restricción cualquiera puede gastar la cuota (`ANDROID-USER-DATA-DISCLOSURE`: revisar en Google Cloud antes de la subida).
- [ ] Health Connect: la declaración de la consola coincide con los permisos del manifiesto, solo `READ_STEPS` y `READ_DISTANCE` (`ANDROID-HEALTH-PERMISSIONS`).
- [ ] Lo que el dueño decidió sale completo: revisar «Lo que no cubre» de las specs del alcance (regla 7 de `.arnes/AGENTS.md`).
- [ ] `npm run verificar` en 0 y el CI de la rama en verde.
