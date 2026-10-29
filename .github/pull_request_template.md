<!-- Una funcionalidad o un bug por PR. Sin Co-Authored-By ni pie de herramienta. -->

## Qué cambia y nada más



Closes #

## El contrato (se escribe antes de empezar)

- **Cuenta como «pasando» cuando**:
- **No debe cambiar**:

## Evidencia

<!-- Pega el resumen de `npm run verificar`. Lo que no se pudo correr se dice acá, no se calla. -->

```
```

- [ ] `npm run verificar` sale con 0 (tipos, Jest completo y parches).
- [ ] Si se ve en la app: `npm run verificar -- --e2e` (Maestro) y los casos de la spec con mobile-mcp, con capturas.
      Nunca contra producción.

## Estado limpio

- [ ] `funcionalidades.json` y `PROGRESO.md` dicen la verdad después de este PR.
- [ ] Si toca uno de los cinco tabs: la autorización del dueño está en `docs/producto/`, con su fila en el índice.
- [ ] Si es un bug: entrada E-NN en la bitácora (síntoma literal, causa real, cómo evitarlo) y, si se puede, una prueba
      que lo frene.
- [ ] Dice si hace falta un APK nuevo y si el backend tiene que salir antes.
