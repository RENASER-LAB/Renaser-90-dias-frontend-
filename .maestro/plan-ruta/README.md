# plan-ruta — Plan como ruta de niveles (spec 058, 2026-11-25)

Flujos de la R1. Cada uno dice su precondición y su cuenta arriba; ninguno está «corrido» hasta que su cabecera lo diga.

- Cuenta y datos: los de `.maestro/plan-por-dia/` (`datos.sh`: `dia N`, `limpiar-objetivos`…) en la base local `renaser_e2e_plan`.
- **`plan.ruta` prendida** para la cuenta: Soporte TI → Funcionalidades → «Plan como ruta» (o, en la base local, `UPDATE renaser.funcionalidades SET encendida = true WHERE clave = 'plan.ruta'`).
  Con ella apagada, los flujos de `plan-por-dia` deben dar lo mismo que antes (Plan de hoy intacto).
- Los efectos (FR-014) no se ven en una captura estática: se revisan a ojo en el emulador (cascada al entrar, pop, salto del fénix, cofre).
