# Carrera con GPS (spec 042) — flujos de Maestro

**Escritos y sin correr** (la entrega no usó el emulador). Necesitan:

- Un APK de depuración NUEVO (código nativo: `react-native-maps`, `expo-location` + `expo-task-manager`, `expo-sensors`,
  `expo-keep-awake`). Con la clave de Maps en la variable `GOOGLE_MAPS_ANDROID_KEY` se ve el mapa; sin ella, el fondo neutro (igual
  sirve para estos flujos).
- El backend con la spec 042 (`POST /api/v1/carreras` y `carrerasDelDia` en la agenda) en local, con base clonada. **Nunca producción.**
- Un aprendiz con «Kilómetros diarios» hoy (cuenta `aprendiz` de `../comun`).
- El GPS simulado: `mobile_set_location` de mobile-mcp o `adb emu geo fix <lng> <lat>` en un bucle (ver `simular-ruta.sh` en el
  README de `../pasos-y-km`). Para 01 y 03 basta una caminata recta de ~200 m a 1 punto por segundo.

| Flujo | Qué prueba |
|---|---|
| 01-empezar-y-pausar | 3, 2, 1 → Corriendo (tiempo, distancia, ritmo, calorías, pestañas) → desliza para pausar → pausa → seguir |
| 02-descartar | descartar pide confirmación y no deja nada |
| 03-terminar-y-registrar | terminar → «Terminaste» → «Registramos X km en tu hábito» |
| 04-sin-permiso | sin ubicación no empieza y lo dice |
