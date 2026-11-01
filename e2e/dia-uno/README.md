# E2E de la recuperación del Día 1

> **Cambio 2026-10-31 (spec 026).** Esta carpeta se llamaba `e2e/mapa-poder/` y traía también el recorrido del Mapa del Poder por
> rol (`mapa-por-rol.spec.ts`). El Mapa de Renacimiento se retiró de la app y ese recorrido se borró; queda la suite del Día 1,
> que no dependía de él. La preparación de cuentas (`preparar.py`) sigue creando los cinco actores base que usa el fixture.

Playwright recorre la app web a 360 × 800 contra Spring, Postgres y Redis reales. La suite `dia-uno.spec.ts` añade 34 recorridos.
Cruza los cinco roles (MENTOR, ADMIN, ALCHEMIST, MENTOR_LEAD y TRAINEE) con participación pendiente, fecha futura, programa en
curso, programa completado y ausencia de participación. Las cuentas pendientes tienen una fecha provisional de hace 60 días y
`programa_activado_en = NULL`: actualizar la app debe ofrecer el selector y conservar el programa pausado hasta que la persona
confirme.

Comprueba las entradas de Hoy, Yo y Training, volver sin elegir, «Ahora no» por cuenta, recargar, actualizar las otras pestañas
después de confirmar y reanudar el onboarding después de aceptar términos y cerrar la app. Para un aprendiz sin participación
verifica el 404 y el aviso de revisar la inscripción: es una anomalía del fixture, ya que aprobarlo crea su participación.

Los casos de recuperación interrumpen peticiones del navegador para reproducir errores de red, espera de 15 segundos y pérdida de
la respuesta de una confirmación que el servidor **sí guardó**. También envían una fecha inválida para probar la recuperación de
un 400 y activan desde otra sesión para comprobar un 409. Las confirmaciones y las relecturas restantes usan el backend real. Las
confirmaciones simultáneas se prueban adicionalmente por HTTP con Postgres en `ActivacionProgramaConcurrenteIT` del backend.

**No prueba el alta ni la aprobación de cuentas.** El fixture prepara cuentas aprobadas y activas con el onboarding inicial
completado, para empezar en Hoy.

## Preparar el entorno

Desde un worktree propio del backend (nunca el checkout usado por el IDE):

```bash
./mvnw -B -ntp spring-boot:test-run \
  -Dspring-boot.run.main-class=com.renaser.os.TestRenaserOsApplication \
  -Dspring-boot.run.arguments='--server.port=8095 --management.server.port=8105 --renaser.web.cors.origenes=http://localhost:8085 --spring.session.data.redis.namespace=renaser:e2e:dia-uno:session'
```

`TestRenaserOsApplication` crea sus contenedores. Esperar el arranque y comprobar `http://localhost:8105/actuator/health`.
Identificar el **nuevo** Postgres de Testcontainers con `docker ps`; no usar `renaser-db` ni otra base compartida.

Desde este repositorio, iniciar Expo con las dependencias ya instaladas:

```bash
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://localhost:8095 CI=1 \
  node node_modules/expo/bin/cli start --web --port 8085
```

Preparar las 40 cuentas (cinco base y 35 de Día 1), sustituyendo `ID_DEL_POSTGRES_DE_TESTCONTAINERS`:

```bash
python3 e2e/dia-uno/preparar.py \
  --container ID_DEL_POSTGRES_DE_TESTCONTAINERS \
  --redis-container ID_DEL_REDIS_DE_TESTCONTAINERS \
  --out "$HOME/.cache/renaser-e2e/dia-uno/actores.json" \
  --con-casos-dia-uno
```

El script comprueba la etiqueta de Testcontainers, el motor y la base `test`. Solo inserta cuentas nuevas con UUID aleatorios.
Genera la contraseña y guarda el fixture fuera del repositorio con permiso `0600`. Para repetir el recorrido hay que volver a
preparar cuentas nuevas.

`--redis-container` es opcional y permite repetir la batería sin acumular el límite de 50 logins por origen/hora. Comprueba que
Redis y Postgres pertenezcan a la misma sesión de Testcontainers y retira solo `reset-password:rl:login:*`; no borra sesiones ni
cambia los límites de producción. Usarlo al preparar una batería, sin otra ejecución E2E activa en ese entorno.

## Ejecutar

```bash
E2E_API_URL=http://localhost:8095 E2E_APP_URL=http://localhost:8085 \
E2E_ACTORES="$HOME/.cache/renaser-e2e/dia-uno/actores.json" \
  node node_modules/@playwright/test/cli.js test --config playwright.dia-uno.config.ts
```

(`E2E_MAPA_ACTORES`, el nombre de antes, se sigue aceptando.) Un worker, cero reintentos. El informe HTML y JUnit quedan en
`artifacts/e2e-dia-uno/` (ignorado por Git); las trazas y capturas se conservan al fallar. Si el navegador instalado está en otra
ruta, usar `E2E_CHROME_BIN`. `CI=1` desactiva la recarga de Metro; reiniciar el proceso propio de Expo después de modificar código
de la app.

Al terminar, detener los procesos creados para la prueba y borrar el fixture privado. Los contenedores creados por la aplicación de
Testcontainers se retiran al cerrar esa aplicación.
