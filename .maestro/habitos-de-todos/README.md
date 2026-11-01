# Maestro — Hábitos de todos (spec 029)

ESCRITOS Y SIN CORRER (2026-10-31): necesitan el backend con la spec 029 (`GET /leadership/habits`) y un emulador libre.
Se usan las ranuras E2E de siempre: la cuenta `E2E_ADMIN_*` apunta al LÍDER DE MENTORES (como en `lider-ve-a-todos/01`) y la
cuenta `E2E_MENTOR_*` a un mentor, que NO debe ver la fila.

| Flujo | Qué prueba |
|---|---|
| `01-habitos-del-dia-y-sus-personas.yaml` | Líder → Yo → «Mis mentores» → «Hábitos de todos» → un hábito → sus personas → la ficha de una persona → atrás nivel por nivel |
| `02-ayer-y-limites.yaml` | ‹ lleva a ayer, › se apaga en hoy, y 7 días atrás ‹ se apaga |
| `03-un-mentor-no-ve-la-fila.yaml` | Un mentor no ve «Mis mentores» ni «Hábitos de todos» |

Variables: `HABITO` = parte del nombre de un hábito que hoy le toca a alguien (p. ej. `Despertar`); `PERSONA` = parte del nombre de
una persona que tenía ese hábito.
