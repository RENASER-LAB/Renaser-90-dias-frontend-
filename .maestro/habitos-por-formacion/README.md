# Hábitos y categorías por formación (spec 023)

Flujos de Maestro de «cada formación tiene sus categorías y sus hábitos». **Escritos y sin correr**: piden el backend con la spec 023 (V134–V136, y la 022), un
emulador libre y cuentas sembradas en la base **local** (nunca producción). Cada archivo dice arriba su precondición. Las ranuras `E2E_APRENDIZ_*` y `E2E_ADMIN_*`
apuntan a la cuenta que el archivo dice (como en `../formaciones/README.md`).

| Flujo | Ranura | Qué prueba |
|---|---|---|
| `01-admin-arma-el-diplomado` | `admin` | crear la categoría «Estudio E2E» y su primer hábito en el Diplomado desde Administración |
| `02-aprendiz-del-diplomado-ve-lo-suyo` | `aprendiz` (del Diplomado) | Training muestra el hábito del Diplomado y nada de la Escuela |
| `03-aprendiz-de-la-escuela-no-ve-el-diplomado` | `aprendiz` (de la Escuela) | Training sigue como siempre y no aparece el hábito del Diplomado |
| `04-admin-copia-un-habito` | `admin` | «Copiar a otra formación» crea un hábito independiente en la Certificación |
| `05-programa-propio-en-otra-formacion` | `aprendiz` (mentor con Escuela y Diplomado, programa propio en la Escuela, activa el Diplomado) | «Tu programa propio está en Escuela Renaser. Cámbiate a ella para verlo.» |

Orden sugerido: 01 → 02 → 03 → 04. El 01 deja la categoría y el hábito sembrados para el 02; el 04 deja una copia en la Certificación que se borra desde
Administración → «Hábitos del programa» → Certificación → el hábito → «Eliminar».

> **02/11/2026.** `04` copiaba «Agua tibia con limón», que ya está copiado en la Certificación de la base local (E2E del 01/11): ahora copia «Descanso profundo» (el siguiente
> que sirve es «Ducha fria»; cada corrida deja una copia más, que se borra a mano como arriba). `02` y `03` abren el engranaje por su nombre de hoy, «Tus prácticas: planificar».
> `01` escribe los nombres largos en comandos de 8 letras (`inputText` con el dev client pasa de 120 s con más de ~10 letras).
