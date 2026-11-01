# Comunidad por formación (spec 024)

Flujos de Maestro de la Comunidad de cada formación: el Muro, los eventos, los cursos, la Tribu y el ranking de una no se ven desde otra. **Escritos y sin correr**:
piden el backend con la spec 024 (V137–V139), un emulador libre y cuentas sembradas en la base **local** (nunca producción). Cada archivo dice arriba su precondición.
`../formaciones/correr.sh` abre la sesión con la cuenta de la ranura (`# cuenta: aprendiz|admin`); la ranura `aprendiz` apunta a la cuenta que cada archivo dice.

| Flujo | Cuenta | Qué prueba |
|---|---|---|
| `01-escuela-sin-selector` | aprendiz de la Escuela | Comunidad igual que siempre: sin selector, sin rótulos, «Formación Renaser Global» |
| `02-aprendiz-del-diplomado` | aprendiz del Diplomado | solo su Muro y sus eventos, «Diplomado Renaser Global» y su ranking |
| `03-admin-elige-la-formacion` | admin | selector «Todas · Escuela · Diplomado · Certificación», rótulos, la elección se recuerda y no se publica con «Todas» |
| `04-admin-ranking-todas` | admin | el ranking agrupado por formación y la tabla de una sola |
| `05-admin-tipos-de-comunidad` | admin | Administración → Formaciones → Comunidad: apagar y prender «Directos» con su confirmación |
