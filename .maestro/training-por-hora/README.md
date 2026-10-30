# Training por hora (spec 014)

Flujos de Maestro de la lista por hora, la semana y el engranaje de Training. Se corren con `.maestro/correr.sh` (una cuenta
de aprendiz; ver `../README.md`):

```bash
.maestro/correr.sh .maestro/training-por-hora/01-lista-por-hora.yaml
```

- **Datos**: un aprendiz en el día 20 con hábitos de todos los tipos a distintas horas, dos acciones con hora, un evento de hoy
  al que dijo «Voy», un evento ya terminado, guías en varios hábitos, un hábito propio y la semana (lun–mié) ya vivida.
  Cada flujo dice arriba su precondición; los que registran necesitan el hábito pendiente: se repone el día con un script
  idempotente (en el E2E de la spec: `reset-hoy.sql`).
- **01** lista por hora · **02** hábito con guía + foto + «¿Qué sentiste?» · **03** hábito sin guía (cámara directa) ·
  **04** ✓ de Despertar y Dormir · **05** Pastilla · **06** Clase diaria · **07** acción del día · **08** evento ·
  **09** días anteriores (✓ y candado) y que vienen · **10** engranaje, Planificar y pausa «Solo hoy» ·
  **11** hábito de evidencia opcional: «Subir» (cuatro formas, con Texto) y ✓.
- Los flujos **no** dependen de la hora del día: el primero de la lista dice «Te toca ahora» o «Lo que sigue» según el reloj.
- Los de `regresion/` que pasaban por las dimensiones de Training (01, 08, 10) y `comun/abrir-cuerpo.yaml` ya usan la lista
  nueva y el engranaje.
