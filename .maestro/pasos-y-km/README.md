# Maestro · pasos y km (spec 037)

Escritos **sin correr** (2026-11-02). Necesitan un build nativo con `react-native-health-connect`
(`eas build --platform android --profile debug-pasos`), un emulador **Android 14 o más** con imagen «Google APIs»
(trae Health Connect como módulo del sistema), el backend con V161 y **Health Connect Toolbox** instalado.

## Sembrar los pasos (una vez por corrida)
1. Abrir **Health Connect Toolbox** → *Insert records* → **Steps**: `count` 7120, de las 06:00 a las 17:00 de HOY, método
   **automático** (no «manual»).
2. Lo mismo con **Distance**: 5400 m, mismo tramo. (Sin Distance la app estima con 0,75 m por paso: 5,34 km, «aprox.».)
3. Para `04-pasos-a-mano-no-cuentan`: otra inserción de **Steps** con método **manual** desde la Toolbox.
4. Para `05`: meta en 5 km (por defecto). Para probar la barra sin llegar: bajar los pasos a 4200 o subir la meta a 8 km en
   Yo → Administración → Más opciones → Hábitos del programa → Kilómetros diarios.

## Flujos
| Archivo | Qué prueba | Cuenta |
|---|---|---|
| `01-conectar.yaml` | enlace «Cuenta tus pasos solo», hoja, permiso del sistema, «Ya contamos tus pasos» | aprendiz |
| `02-meta-lista-y-registrar.yaml` | barra, «Meta lista», «Registrar», aviso, fila cumplida | aprendiz |
| `03-sin-permiso.yaml` | «Perdimos tus pasos» y «Subir captura» | aprendiz |
| `04-pasos-a-mano-no-cuentan.yaml` | solo pasos manuales → «Los pasos escritos a mano no cuentan.» | aprendiz |
| `05-meta-en-administracion.yaml` | Administración cambia la meta y rige | admin |
| `06-ficha-y-ranking.yaml` | el mentor ve la fuente; el ranking marca «auto» | mentor |
| `07-sin-soporte.yaml` | en un emulador con Android 13: «Sube tu captura» (sin instalar nada) | aprendiz |
