# Mapa de Renacimiento · Día 7 — qué se construyó, qué se asumió y qué falta

**Fecha:** 2026-09-06 · **Rama:** `auditoria` · **Fuente:** *Manual Técnico de Implementación · Onboarding · Día 7* (v1.0, septiembre 2026) y los dos mockups de once vistas (V01–V11).
**Estado:** primera versión funcional del lado del cliente, **sin backend propio todavía** (§4).

---

## 1. Qué hay

Un módulo nuevo, `src/features/mapa-renacimiento/`, con las once vistas del manual, a pantalla
completa y sin la navegación inferior (§3 V01, AC-01):

| Vista | Pantalla | Regla del manual que aplica |
|---|---|---|
| V01 | `AperturaScreen` | texto aprobado; "Continuar mi mapa" si hay progreso |
| V02 | `PrioridadScreen` | selección única; no excluye a las otras áreas |
| V03 | `ObjetivoSaludScreen` | tipo, línea base, meta ≠ base, unidad, evidencia, motivo 20–180; aviso para condición clínica |
| V04 | `ObjetivoNegocioScreen` | admite 0; moneda; periodo; una deuda puede bajar |
| V05 | `ObjetivoRelacionesScreen` | escala 1–10 ×2; cambio observable propio; **rechaza control de terceros** |
| V06 | `SistemaEjecucionScreen` | 1–2 acciones por objetivo, máx. 6; verbo + objeto 5–100; frecuencia 1–7 = días; sin "pensar/intentar/mejorar/esforzarme"; aviso de carga > 28/semana |
| V07 | `ReemplazosScreen` | catálogo del manual, 1–3; disparador + conducta + respuesta; guarda "Cuando [x], en lugar de [y], haré [z]." |
| V08 | `HitosScreen` | 9 hitos sugeridos con **progresión no lineal** (40 % / 75 % / 100 %), editables |
| V09 | `RetornoScreen` | 5–120 caracteres, verbo observable; sugerencias **derivadas de las acciones ya elegidas** |
| V10 | `ActivacionScreen` | resumen con Editar por bloque; **activación idempotente**; compromiso de seguimiento (pedido del dueño en §2) |
| V11 | `CierreScreen` | texto final aprobado (§10.1); resumen; audio de bautizo como opcional (hoy "próximamente") |

Además:

- `tipos.ts` — el modelo de §5.1 (`day7_map`, `goal`, `lead_action`, `replacement_protocol`, `milestone`, `return_protocol`) como tipos del cliente.
- `reglas.ts` — **los ocho códigos de calidad de §4.3** (`MISSING_BASELINE`, `MISSING_TARGET`, `VAGUE_RESULT`, `MISSING_EVIDENCE`, `THIRD_PARTY_CONTROL`, `UNSAFE_HEALTH`, `UNIT_MISMATCH`, `UNREALISTIC_LOAD`) con sus mensajes textuales, la **redacción SMART determinista** (§4: solo datos declarados, sin inventar), los hitos sugeridos y la definición de terminado (§1.2).
- `almacen.ts` — **autoguardado local inmediato** por usuario (§2.1, §5.4 "sin conexión"); reanuda en el último paso.
- `hooks/useMapaRenacimiento.ts` — estado, autoguardado y **activación**: crea las acciones como hábitos personales (`POST /api/v1/habits`) recordando `accionId → habitId`, así que un segundo toque no duplica (AC-07).
- Entrada desde Home (`HoyScreen`): tarjeta *"Diseña tu mapa"* desde el Día 7, que pasa a *"Continúa tu mapa"* y *"Tu mapa está activo"*.

**Verificado:** `tsc --noEmit` en cero. **Sin verificar:** el render visual y el recorrido completo — está detrás del login y esta sesión no tiene una cuenta. Queda para la prueba con el dueño.

## 2. Decisiones que tuve que tomar (y que el manual no fija)

1. **Disponible desde el Día 7 hasta activarse**, no solo *el* Día 7. Quien se salte ese día no debería perder el mapa. El manual dice "Dado un usuario en Día 7" y no dice qué pasa el Día 8 sin mapa; esto es lo menos punitivo.
2. **Vista previa en desarrollo.** En builds `__DEV__` la tarjeta aparece siempre (marcada "VISTA PREVIA"), para poder probarlo sin esperar una semana de programa. En el build de Vercel/tiendas no aparece antes del Día 7. La cuenta del dueño empieza el Día 1 el lunes 7; sin esto no se podría probar hasta el 13.
3. **El compromiso de seguimiento es obligatorio para activar.** El manual lo lista como "agregar un botón" en §2; se implementó como casilla que habilita "Activar mi mapa". Si tenía que ser opcional, es un booleano.
4. **La redacción SMART es determinista, sin IA.** El manual la pone como release criterion ("El mapa puede completarse sin IA"). Cuando exista el contrato de §4.2 en el backend, entra como refinamiento de la misma tarjeta *"Tu meta redactada"*.
5. **Escala 1–10 como fila de segmentos táctiles**, no como slider: un slider real exige una dependencia nueva (`@react-native-community/slider`), y la fila cumple los 44×44 de accesibilidad.
6. **Los hábitos creados al activar son diarios.** `POST /api/v1/habits` no acepta días de la semana ni frecuencia; el mapa guarda la frecuencia y los días elegidos, pero el hábito resultante hoy se genera todos los días. Es la limitación más visible para el aprendiz y se resuelve en el backend (§4).

## 3. Qué NO se hizo, a propósito

- **No se eliminó el onboarding actual** (cuestionario profundo, V90, pacto). El manual §1.1 dice qué se saca del *Día 7* — pero hoy esas piezas viven en el onboarding del Día 0 (`features/onboarding/`), no en el Día 7. Sacarlas es decisión del dueño sobre el Día 0, no una consecuencia de este documento.
- **No hay audio de bautizo**: no existe el asset ni el flujo; V11 lo muestra como opcional "próximamente", que es la verdad.
- **No hay panel del mentor (§6)** ni analítica (§7): dependen del backend.

## 4. Lo que falta en el backend (contrato propuesto, a partir de §5)

Entidades de §5.1 en el módulo `onboarding` (o uno propio, `mapa`), con estados de §5.2:

```
POST   /api/v1/mapa-renacimiento                 crea/actualiza el borrador (upsert por usuario)   -> in_progress
GET    /api/v1/mapa-renacimiento                 el mapa del actor (borrador o activo), con version
POST   /api/v1/mapa-renacimiento/redaccion       §4.2: {area, tipo_resultado, linea_base, resultado_objetivo, unidad, evidencia, motivo}
                                                 -> {status, goal_text, missing_fields, clarifying_question, risk_flags, suggested_milestones}
POST   /api/v1/mapa-renacimiento/activar         §5.3, idempotente: valida definición de terminado, snapshot v1,
                                                 crea hábitos CON frecuencia/días, 9 hitos + recordatorios,
                                                 control semanal, aviso al mentor, marca completed_at, abre Día 8
GET    /api/v1/admin/mapas/{usuarioId}           §6 panel del mentor: prioridad, metas, carga, riesgos, hitos, retorno
```

Reglas que hoy viven en `reglas.ts` y que el servidor debe repetir (nunca confiar en el cliente): definición de terminado, máximo 6 acciones / 2 por objetivo, 1–3 patrones, `THIRD_PARTY_CONTROL`, idempotencia de activación por `map_id + version`.

Con ese backend, la sincronización se agrega **encima** de `almacen.ts` (escribir local primero, sincronizar al salir del campo, §2.1) sin tocar las pantallas.

## 5. Cómo probarlo

1. `npx expo start --web`, entrar con una cuenta con onboarding completo.
2. En Home aparece la tarjeta **"Diseña tu mapa"** (en desarrollo, siempre; en producción, desde el Día 7).
3. Recorrer V01–V10; cerrar la app a mitad y volver: reanuda en el mismo paso con todo guardado.
4. En V10, "Activar mi mapa" crea las acciones en Plan → Hábitos (visibles al volver). Tocarlo dos veces no duplica.
5. Los casos mínimos de §9 del manual: "Tener más energía" pide indicador; "Que mi hijo obedezca" se bloquea; "Esforzarme más" no vale como acción; 82 → 75 kg propone 79,2 / 76,8 / 75.
