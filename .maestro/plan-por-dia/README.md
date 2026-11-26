# plan-por-dia — recorrido del tab Plan día por día (2026-11-25)

Flujos numerados como los pasos del recorrido (1 sin empezar, 2 objetivos, 3 mes, 4 semana, 5 agendar, 6 cumplir con evidencia, 7 cierra tu día,
8 día siguiente, 9 revisión semanal, 10 cambio de semana y de mes, 11 Tu 80/20 y recordatorios). Cada uno dice su precondición y su cuenta arriba.

- `datos.sh` mueve los DATOS de la cuenta de prueba (nunca el reloj) en la base local `renaser_e2e_plan`: `dia0`, `dia N`, `avanzar`, `por-confirmar`,
  `limpiar-objetivos`. El backend calcula el día desde `fecha_inicio` y la fecha de hoy.
- Maestro tarda ~10 s por letra al escribir (ver el README de `.maestro/`): los textos son cortos y no llevan «rr» (recarga el JS en la build de desarrollo).
- En la build de desarrollo, el formulario del Código Renaser (cada hora en punto) puede aparecer encima de Plan y hay que registrarlo antes de seguir.
- Lo que no se puede reproducir sin reloj falso en el servidor: el domingo (arma la semana que empieza) y el lunes de cambio de semana.
- Spec 058: estos cuatro flujos (`03`, `05a`, `07a`, `11b`) se corrieron el 26/11 con `plan.ruta` APAGADA (Plan de hoy intacto) con los datos de `../plan-ruta/datos.sh` (`semana-armada` para `03` y `05a`; `11b` sigue a `05a`; `cierre-del-dia` para `07a`). Tras cambiar los datos por SQL hay que cerrar y abrir la app: guarda la semana en caché.
