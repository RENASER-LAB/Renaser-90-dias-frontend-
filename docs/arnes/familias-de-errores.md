# Familias de errores que se repiten — la app

Fecha: 2026-11-06. El inventario completo (604 entradas de la bitácora y 83 issues `bug` de los dos repos, contadas por
familia) está en el backend: `../Renaser-90-dias-backend/docs/arnes/familias-de-errores.md`. Acá va lo que toca a la app:
qué familias aparecen en sus issues y qué chequeo de este repo las frena.

## Las familias en los 57 issues `bug` de la app

| Familia | Issues de la app | Qué la frena |
|---|---|---|
| Huecos en blanco, contenido tapado o cortado | #82, #85, #87, #88, #90, #91, #96, #97, #101, #107 | El E2E con capturas en todos los estados y roles (AGENTS.md, «Cuándo algo está terminado») |
| Textos: MAYÚSCULAS, «90 días» fijo, texto viejo, placeholder sin reemplazar | #75, #77, #84, #94, #98, #103, #104, #122 | `rotulosEnTipoOracion`, `botonesDoradosSinMayusculas`, `ningunNoventaDiasEscrito`, `tituloEnTodaLaApp`, `rotuloSinEspaciado` |
| Lo que ve la persona no corresponde a su estado (sin programa, Día 0, rol) | #72, #81, #83, #86, #101, #102, #136 | Pruebas de cada pantalla por estado (`hoySinDatosInventados`, `planSinProgramaPropio`…) |
| Concurrencia y reintentos (doble toque, lectura vieja que pisa a la nueva) | #42, #51, #106, #133 | Regla de AGENTS.md (sin chequeo general) |
| Fechas en UTC | #74, #108 | **Nuevo**: `familiasDeErrores.test.ts` («fechas en UTC») |
| Pruebas que no corren | #47, #52, #100 | `jest.config.js` (worktrees); **nuevo**: «pruebas que no corren» |
| Nativo y Android (cámara, Health Connect, GPS) | #49, #120, #127, #137, #142 | Pruebas de cada caso; **nuevo**: parches de postinstall y `buildFromSource` |
| Avisos y alarmas | #33, #40, #99 | Pruebas de `alarmas/` y `habits/notificaciones/` |

## Chequeos agregados el 2026-11-06 (`src/__tests__/harness/familiasDeErrores.test.ts`)

| Chequeo | Familia y origen |
|---|---|
| `toISOString().slice(0, 10)` solo sobre una fecha armada en UTC | Fechas (E-336, E-534, #108) |
| Nadie convierte `'AAAA-MM-DD'` con `new Date('…')` | Fechas (E-392) |
| El `Alert` sale de `src/components/Alerta`, nunca de react-native | Diálogos muertos en la web (E-144, E-606) |
| Las excepciones de `Alert` siguen existiendo (la lista solo se achica) | idem |
| Toda prueba de `src/` se llama `*.test.ts` (Jest no corre `.test.tsx` ni `.spec.ts`) | Pruebas que no corren (E-27, E-489, #47) |
| Cada `scripts/arreglar-*.js` está en `postinstall` y existe | Parches que no llegan (E-637) |
| Un parche al Kotlin de un módulo `expo-*` precompilado lleva el módulo en `buildFromSource` | Parches que no llegan al APK (E-637) |
| Ningún archivo de texto con CRLF | Entorno (E-52) |

Cada uno se probó con una violación plantada (falla) y con el código actual (pasa). Las excepciones están en
`src/__tests__/harness/excepciones.json`, con fecha e issue.

## Violaciones reales encontradas

- `src/features/mentor/screens/AlumnoScreen.tsx` y `src/features/pasos/hooks/usePasosDelDia.ts` usan el `Alert` de
  react-native: en la web el aviso no sale. Issue [#144](https://github.com/RENASER-LAB/Renaser-90-dias-frontend-/issues/144).
  Quedaron como excepción con fecha hasta que #155 las arregló (2026-11-06); ya no están en `excepciones.json`.

## Sin chequeo automático

Huecos en pantalla, concurrencia, lecturas viejas y el estado de cada rol se ven corriendo la app: los cubre el E2E de la
spec y las pruebas de cada pantalla. Las reglas cortas están en `AGENTS.md` («Errores que se repiten»).
