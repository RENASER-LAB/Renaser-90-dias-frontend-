# E2E del Mapa del Poder por rol

Playwright recorre la app web a 360 × 800 contra Spring, Postgres y Redis reales. Incluye
MENTOR, ADMIN, ALCHEMIST, MENTOR_LEAD y TRAINEE: login por pantalla, elección del Día 1,
los diez pasos del mapa, activación, lectura de lo persistido y reapertura desde otro navegador
sin el borrador local. No se simulan respuestas HTTP ni se crean objetivos o hábitos por API.

El fixture prepara cuentas aprobadas y activas con el onboarding inicial completado, para
empezar en Hoy. El personal no tiene participación; el aprendiz tiene la participación pendiente
que se crea al aprobarlo. **No prueba el alta ni la aprobación de cuentas.** El mapa se configura
con los formularios; este recorrido no incluye transferencia de archivos a S3.

## Preparar el entorno

Desde un worktree propio del backend (nunca el checkout usado por el IDE):

```bash
./mvnw -B -ntp spring-boot:test-run \
  -Dspring-boot.run.main-class=com.renaser.os.TestRenaserOsApplication \
  -Dspring-boot.run.arguments='--server.port=8095 --management.server.port=8105 --renaser.web.cors.origenes=http://localhost:8085 --spring.session.data.redis.namespace=renaser:e2e:mapa:session'
```

`TestRenaserOsApplication` crea sus contenedores. Esperar el arranque y comprobar
`http://localhost:8105/actuator/health`. Identificar el **nuevo** Postgres de Testcontainers con
`docker ps`; no usar `renaser-db` ni otra base compartida.

Desde este repositorio, iniciar Expo con las dependencias ya instaladas:

```bash
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://localhost:8095 EXPO_PUBLIC_MAPA_DIA7=on CI=1 \
  node node_modules/expo/bin/cli start --web --port 8085
```

Preparar cinco cuentas nuevas, sustituyendo `ID_DEL_POSTGRES_DE_TESTCONTAINERS`:

```bash
python3 e2e/mapa-poder/preparar.py \
  --container ID_DEL_POSTGRES_DE_TESTCONTAINERS \
  --redis-container ID_DEL_REDIS_DE_TESTCONTAINERS \
  --out "$HOME/.cache/renaser-e2e/mapa-poder/actores.json"
```

El script comprueba la etiqueta de Testcontainers, el motor y la base `test`. Solo inserta cuentas
nuevas con UUID aleatorios. Genera la contraseña y guarda el fixture fuera del repositorio con
permiso `0600`. Para repetir el recorrido hay que volver a preparar cuentas nuevas: nunca se
borra un mapa activo para hacer pasar una prueba.

`--redis-container` es opcional y permite repetir la batería sin acumular el límite de 50 logins
por origen/hora. Comprueba que Redis y Postgres pertenezcan a la misma sesión de Testcontainers y
retira solo `reset-password:rl:login:*`; no borra sesiones ni cambia los límites de producción.
Usarlo al preparar una batería, sin otra ejecución E2E activa en ese entorno.

## Ejecutar

```bash
E2E_API_URL=http://localhost:8095 E2E_APP_URL=http://localhost:8085 \
E2E_MAPA_ACTORES="$HOME/.cache/renaser-e2e/mapa-poder/actores.json" \
  node node_modules/@playwright/test/cli.js test --config playwright.mapa.config.ts
```

Un worker, cero reintentos. El informe HTML y JUnit quedan en `artifacts/e2e-mapa/` (ignorado por
Git); las trazas y capturas se conservan al fallar. Si el navegador instalado está en otra ruta,
usar `E2E_CHROME_BIN`.

Al terminar, detener los procesos creados para la prueba y borrar el fixture privado. Los
contenedores creados por la aplicación de Testcontainers se retiran al cerrar esa aplicación.

## Cuentas anteriores que no eligieron Día 1

La suite `dia-uno.spec.ts` añade 34 recorridos. Cruza los cinco roles con participación pendiente,
fecha futura, programa en curso, programa completado y ausencia de participación. Las cuentas
pendientes tienen una fecha provisional de hace 60 días y `programa_activado_en = NULL`: actualizar la app
debe ofrecer el selector y conservar el programa pausado hasta que la persona confirme.

Comprueba las entradas de Hoy, Yo y Training, volver sin elegir, «Ahora no» por cuenta, recargar,
actualizar las otras pestañas después de confirmar y reanudar el onboarding después de aceptar
términos y cerrar la app. Para un aprendiz sin participación verifica el 404 y el aviso de revisar
la inscripción: es una anomalía del fixture, ya que aprobarlo crea su participación.

Los casos de recuperación interrumpen peticiones del navegador para reproducir errores de red,
espera de 15 segundos y pérdida de la respuesta de una confirmación que el servidor **sí guardó**.
También envían una fecha inválida para probar la recuperación de un 400 y activan desde otra sesión
para comprobar un 409. Las confirmaciones y las relecturas restantes usan el backend real. Las
confirmaciones simultáneas se prueban adicionalmente por HTTP con Postgres en
`ActivacionProgramaConcurrenteIT` del backend.

Preparar las 40 cuentas (cinco para el mapa y 35 para Día 1):

```bash
python3 e2e/mapa-poder/preparar.py \
  --container ID_DEL_POSTGRES_DE_TESTCONTAINERS \
  --redis-container ID_DEL_REDIS_DE_TESTCONTAINERS \
  --out "$HOME/.cache/renaser-e2e/mapa-poder/actores.json" \
  --con-casos-dia-uno

E2E_API_URL=http://localhost:8095 E2E_APP_URL=http://localhost:8085 \
E2E_MAPA_ACTORES="$HOME/.cache/renaser-e2e/mapa-poder/actores.json" \
  node node_modules/@playwright/test/cli.js test --config playwright.dia-uno.config.ts
```

El informe queda en `artifacts/e2e-dia-uno/`. Se puede usar la misma semilla para ejecutar una vez
cada suite: los cinco actores del mapa son distintos de los actores de Día 1. `CI=1` desactiva la
recarga de Metro; reiniciar el proceso propio de Expo después de modificar código de la app.

## Resultado comprobado

El 2026-10-12 pasaron **34/34 casos de Día 1 y 5/5 mapas completos**, sin reintentos ni omitidos,
con las fuentes finales y 40 cuentas nuevas. Los dos informes JUnit tienen cero fallos y errores.
`artifacts/e2e-mapa/persistencia.json` recoge la comprobación SQL: por cada rol, tres rocas, tres
hábitos, tres acciones, un reemplazo, 37 respuestas, compromiso y etapa completos, y cero ajustes
de inicio. Los fixtures privados se borraron y el entorno propio se cerró después de verificar.
