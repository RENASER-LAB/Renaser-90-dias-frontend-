# Pendientes del frontend — al 2026-09-22

La lista completa (backend incluido) vive en el otro repositorio, en
`docs/informes/pendientes-2026-09-22.md` del backend. Esto es solo la parte que se resuelve acá.

**Estado:** `master` en `a72214b`, al día con `origin`. El 21 entraron seis cambios de interfaz y el
barrido de voseo.

---

## 1. Probar a mano — nada de esto se vio correr

No hay emulador ni dispositivo en el entorno donde se trabajó. Los seis cambios compilan y pasan las
pruebas, pero **ninguno se vio en una pantalla**.

- [ ] **La firma del Pacto** (`Yo` → Pacto). Lo más importante de la lista. Esa pantalla **era una
      maqueta**: el recuadro punteado mostraba el nombre del perfil en cursiva y debajo el rótulo
      *"FIRMA DIGITAL REGISTRADA & SELLADA"* escrito a mano, afirmando un sellado que no ocurría —
      el botón solo abría un aviso y no guardaba nada. Venía así desde el commit de andamiaje.
      Ahora usa el `SignatureCanvas` de verdad y persiste. **Comprueba que el dedo dibuje en Android
      y que el trazo no se borre al desplazar.**
- [ ] **El teclado del registro** (`LoginScreen`). Que no tape Contraseña ni Confirmar contraseña,
      en las dos pestañas y también en recuperación de contraseña.
- [ ] **La rueda de 1 a 60** del recordatorio propio de un hábito. Y que un valor viejo fuera de
      rango (p. ej. "1 h 30 antes") **siga sonando**: no se recorta el dato guardado, solo dónde
      abre la rueda.
- [ ] **La pestaña Tribu** con la letra del sistema al máximo, y que el desplegable de integrantes
      no empuje la bandeja de conversaciones.
- [ ] **El objetivo mensual**: que muestre cifra cuando el ritmo es razonable y **no** la muestre
      cuando es irreal (el tope es 4 % del peso por mes, o 3× el ritmo que la persona se puso).
- [ ] Las etiquetas en versales que cambiaron con el voseo: `CONFIRMA TUS DATOS` y `SOLO PARA TI`.
      Un carácter menos puede cambiar el calce.

---

## 2. Código pendiente

- [ ] **El renombre de "roca" quedó a medias.** El tab `Hoy` sigue diciendo "roca" en tres sitios
      (`HoyScreen.tsx` ~522 *"Define tu Roca Verde en Plan"*, ~693 *"Rocas y objetivos"*, ~702
      *"rocas selladas hoy"*). No se tocó porque `AGENTS.md` protege ese tab y la autorización del
      21 cubría `Plan`, `Comunidad` y `Yo`, no `Hoy`.
- [ ] **El bug de la coma en el Mapa de Renacimiento.** Hay dos lectores de números que se
      contradicen: `"78,5"` se lee como **78,5** para la Roca Maestra y como **785** para la
      validación, los hitos y el cálculo del objetivo mensual.
- [ ] **Enganchar la cifra mensual en la UI.** La función está lista y probada
      (`src/features/objetivos/utils/objetivoMensual.ts`) pero no se muestra en ningún lado. Los
      tres puntos de enganche —el hook, `PlanScreen` y el render— están descritos en el registro de
      la auditoría.
- [ ] **El nivel mensual ya existe en el backend** (`/api/v1/rocks/monthly`, tabla `rocas_mensuales`
      de la V36) y el frontend **no lo consume**. La cifra calculada tiene dónde guardarse sin
      backend nuevo. Cuidado con el `CHECK meta > 0`, que rechazaría una meta mensual de 0 (saldar
      una deuda entera).
- [ ] **Los tres contadores de Comunidad** ("12 conversaciones · 3 eventos · 2 mentorías") son
      valores fijos: ningún endpoint los calcula. O se cablean, o se quitan. (Decisión de producto.)

---

## 3. Deuda que hace daño callado

- [ ] **La prueba que vigila el voseo tiene la regex incompleta.** En
      `src/features/objetivos/utils/__tests__/objetivoMensual.test.ts` no incluye `intentá`,
      `ingresá` ni `confirmá` — que eran justo las formas más repetidas de las 39 que se
      encontraron el 21. **Da verde con voseo adentro.**
- [ ] **8 coincidencias de voseo en `docs/` y `specs/`.** Son documentos de planificación, no texto
      de la app, así que se dejaron. Si los quieres uniformes, es un barrido más.
- [ ] **13 comentarios y JSDoc citan frases en voseo** (p. ej. `spiritApi.ts:68`,
      `PlanScreen.tsx:205-207`, `habitsApi.ts:185`). No los ve el usuario; se dejaron a propósito.
- [ ] **No hay pruebas de render.** Jest solo toma `.test.ts`, no `.tsx`, así que ninguno de los
      seis cambios de interfaz tiene cobertura visual. Lo que pasó son las pruebas de lógica.

---

## 4. Trampas conocidas del entorno

Anotadas porque costaron tiempo el 21 y van a volver a costarlo:

- **`node_modules` era un enlace simbólico rastreado en git**, y `.gitignore` decía `node_modules/`
  con barra — que **no** cubre un enlace con ese nombre. Un `git add -A` lo metió al repositorio
  apuntándose a sí mismo y llegó a `origin`; se limpió en `a72214b` y se corrigió el `.gitignore`.
  Si vuelves a trabajar con worktrees, **no enlaces `node_modules`**: usa `npm ci` en cada uno.
- **`npx` no está en el PATH.** Para `tsc` y `jest`, con `node_modules` presente, usa el binario
  directo: `node node_modules/typescript/bin/tsc --noEmit` y
  `node node_modules/jest/bin/jest.js`. Para `npm ci` sí hace falta el shim
  (`PATH=~/.local/hostnode-shim:$PATH`).
- **El grep de voseo sin `-i` devuelve cero y parece limpio.** Los textos están capitalizados
  (`Intentá`, `CONFIRMÁ`): hay que barrer sin distinguir mayúsculas o no se ve nada.
