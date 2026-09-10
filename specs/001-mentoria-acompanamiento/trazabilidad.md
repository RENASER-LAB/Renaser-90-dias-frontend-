# Trazabilidad RF → evidencia (T53)

Una fila por requisito. "Evidencia" es un test que corre o una verificación ejecutada, nunca
"está escrito el código". Donde falta, dice qué falta y por qué.

| RF | Qué exige | Evidencia | Estado |
|---|---|---|---|
| RF-01 | Acompañar sin programa personal | `AcompanamientoServiceTest.acompanarSinProgramaPersonal`, `capacidadesDelMentorSinPrograma` | ✅ |
| RF-02 | Programa personal opcional, activable | `capacidadesDelMentorQueYaCursa`; frontend `useProgramaPersonal` + gate en `AuthContext` | ✅ backend · ⚠️ falta E2E |
| RF-03 | Academy publicada accesible al mentor | `CursoVisibilidadMentorTest` (5 casos) | ✅ sin cambios de código |
| RF-04 | Guías de recepción por UUID/email | `ConfiguracionMentoriaServiceTest` (7 casos de guías) | ✅ |
| RF-05 | Recepción por día local 1–3 | `PlanificadorDeTrasladoTest.diasUnoATresVanARecepcion` | ✅ |
| RF-06 | Membresía de recepción | `TrasladoServiceTest`, `ParticipantesCelulaServiceTest` | ✅ |
| RF-07 | Traslado desde el día 4 | `PlanificadorDeTrasladoTest.diaCuatroPasaAGrupoEstable`, `TrasladoServiceTest.diaCuatroSeMueve` | ✅ |
| RF-08 | Cupo y carrera por el último lugar | `CupoCelulaTest`, restricciones `EXCLUDE` probadas con psql (caso 6) | ⚠️ falta concurrencia real (Testcontainers) |
| RF-09 | Sin cupo, no se pierde el chat | `TrasladoServiceTest.sinCupoConservaRecepcion` | ✅ |
| RF-10 | Rotación mensual/semanal | `PlanificadorDeRotacionTest`, `RotacionServiceTest.cadenciaSemanal` | ✅ |
| RF-11 | Sin sustituto y sin cobertura | `sinSustitutoConserva`, `menosMentoresQueGruposSoloCubre` | ✅ |
| RF-12 | Intervalos temporales coherentes | `PeriodoAsignacionTest`, `ConjuntoAsignacionesTest`, `intervalosCoherentes` | ✅ |
| RF-13 | Chat: revocación al rotar | `MensajeServicePermisosDeGrupoTest` (7 casos) + mutación de control | ✅ |
| RF-14 | Contexto y roster autorizados | `AcompanamientoServiceTest.grupoAjenoNoSeFiltra`, `exmentorNoLee` | ✅ |
| RF-15 | Semana con programación histórica | `SeguimientoServiceTest.sieteDiasSiempre`, `estadosDiferenciados` | ✅ |
| RF-16 | Estados diferenciados, sin datos ≠ incumplir | `semanaVaciaEsSinDatos` | ✅ |
| RF-17 | Evidencias: propias y del alumno asignado | `EvidenciaServiceTest` (5 casos nuevos) | ✅ |
| RF-18 | Avisos con causa y deduplicación | `ReglasDeAvisoTest` (15), `AvisosServiceTest` (8) | ✅ |
| RF-19 | Transporte push nativo | `DespachadorPushTest` (7) | ⚠️ contrato sí, entrega real **bloqueada** sin credenciales |
| RF-20 | Contacto manual, sin envío automático | `AlumnoScreen` abre el directo y no manda nada | ⚠️ falta E2E |
| RF-21 | Fórmula: promedio de porcentajes | `CalculoCumplimientoTest.promedioDePorcentajesNoDeTotales` + mutación (71,43 %) | ✅ |
| RF-22 | Nulos y estados de muestra | `sinMuestraNoEsCero`, `mesSinTramos` | ✅ |
| RF-23 | Atribución temporal exacta | `deudaAnteriorNoSeTrasladar`, `alumnoQueEntraDespues` | ✅ |
| RF-24 | Ranking entre grupos | `RankingDeGruposServiceTest` (7) | ✅ |
| RF-25 | Permisos revalidados en cada acceso | `MensajeServicePermisosDeGrupoTest`, `SeguimientoServiceTest.alumnoAjenoProhibido` | ✅ |
| RF-26 | Entradas desde Hoy y Comunidad | `ComunidadScreen` + `HoyScreen` comparten `MiCelulaScreen` | ⚠️ falta E2E |
| RF-27 | UX móvil y tablet | — | ❌ **bloqueada**: sin dispositivo ni emulador |
| RF-28 | Capacidad configurable 10..15 | `CupoCelulaTest.capacidadFueraDeRango`, `reducirCapacidadNoExpulsa` | ✅ |
| RF-29 | Idempotencia y recuperación | `repetirEsIdempotente`, `jobAtrasadoNoFabricaRotacionesHistoricas`, `barridoRepetidoMismaClave` | ✅ |
| RF-30 | Migración aditiva sin pérdida | V45/V46 replicadas contra PostgreSQL 16; backfill con datos y 3 clases de anomalía | ✅ |

## Verificaciones ejecutadas

- **247 pruebas propias en verde**, incluidas `ArchitectureTest` (8) y
  `EndpointAuthorizationDeclarationTest` (4).
- **Frontend**: `npx tsc --noEmit` sin errores y `expo export --platform web` sin fallos.
- **Migraciones**: cadena `V1..V46` aplicada contra PostgreSQL 16 real; restricciones `EXCLUDE`
  probadas caso por caso con psql.
- **Mutaciones de control** (revertir el código y comprobar que las pruebas fallan): intervalo
  semiabierto, fórmula de cumplimiento, orden de la rotación y guard del chat. Las cuatro
  fallaron con el error exacto que debían.

## Bloqueos que quedan

1. **Testcontainers Cloud sin token** (`~/.config/renaser/testcontainers-cloud.token` vacío) →
   RF-08 sin prueba de concurrencia real; `./mvnw clean verify` completo sin correr.
2. **Sin credenciales de Expo** → RF-19 sin entrega real verificada.
3. **Sin dispositivo ni emulador** → RF-27 sin verificar.
4. **`MentorProfileServiceTest.java`** (sin seguimiento, de la rama `lider-de-mentores`)
   referencia `com.renaser.os.shared.domain.Email`, que no existe. Rompe `testCompile` **y el
   arranque del backend** con `spring-boot:run`. No se tocó por ser de otra sesión.
