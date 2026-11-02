# Training por hora (spec 014)

Flujos de Maestro de la lista por hora, la semana y el engranaje de Training. Se corren con `.maestro/correr.sh` (una cuenta
de aprendiz; ver `../README.md`):

```bash
.maestro/correr.sh .maestro/training-por-hora/01-lista-por-hora.yaml
```

- **Datos**: un aprendiz en el día 20 con hábitos de todos los tipos a distintas horas, dos acciones con hora, un evento de hoy
  al que dijo «Voy», un evento ya terminado, guías en varios hábitos, un hábito propio y la semana (lun–mié) ya vivida.
  Cada flujo dice arriba su precondición; los que registran necesitan el hábito pendiente y los que miran lo hecho lo piden hecho: **cada uno trae su línea
  `# antes:`** (02/11/2026) que lo deja así con `comun/estado-de-hoy.sh`, así el orden de los flujos no importa (ver `../README.md`). El `reset-hoy.sql` de la
  spec ya no hace falta. `10` deja «Meditar 10 minutos» en pausa «solo hoy»: para repetirlo el mismo día hay que reactivarlo (Planificar) o sembrarlo de nuevo.
- **Fechas**: `09` no escribe ninguna; saca los nombres de los días de la fecha de hoy (`comun/dias-de-la-semana.js`), así sirve cualquier día. El lunes no tiene día
  anterior y el domingo no tiene día que viene: esa parte se salta sola.
- **Textos largos**: `inputText` con el dev client tarda ~7 a 10 s por letra y pasa de 120 s con más de ~10 letras. Los campos que piden 15 (la Pastilla en `05`, la clase
  en `06`) se escriben en dos comandos de 8 letras.
- **01** lista por hora · **02** hábito con guía + foto + «¿Qué sentiste?» · **03** hábito sin guía (cámara directa) ·
  **04** ✓ de Despertar y Dormir · **05** Pastilla · **06** Clase diaria · **07** acción del día · **08** evento ·
  **09** días anteriores (✓ y candado) y que vienen · **10** engranaje, Planificar y pausa «Solo hoy» ·
  **11** hábito de evidencia opcional: «Subir» (cuatro formas, con Texto) y ✓ · **12** «Tus prácticas»: la dimensión abre
  «Planificar» directo, «Cambiar nombre» en el editor de Jugo verde y el atrás sube un nivel por vez (2026-10-31).
- Los flujos **no** dependen de la hora del día: el primero de la lista dice «Te toca ahora» o «Lo que sigue» según el reloj.
- Los de `regresion/` que pasaban por las dimensiones de Training (01, 08, 10) y `comun/abrir-cuerpo.yaml` ya usan la lista
  nueva y el engranaje.
