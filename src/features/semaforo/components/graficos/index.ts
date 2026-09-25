/**
 * Los gráficos del semáforo, nombrados por lo que MUESTRAN y no por cómo lo dibujan.
 *
 * Las pantallas importan `GraficoDeDias` y `GraficoDeSemanas` de acá, nunca un archivo concreto.
 * Para cambiar el gráfico —animado, con imagen, de otro tipo, como el dueño ya anticipó— se escribe
 * el componente nuevo con las mismas props (`tipos.ts`) y se cambia la línea de abajo. Ni la
 * tarjeta de Hoy ni el detalle se tocan.
 */
export { BarrasDeDias as GraficoDeDias } from './BarrasDeDias';
export { TendenciaSemanal as GraficoDeSemanas } from './TendenciaSemanal';
export type { PropsGraficoDeDias, PropsGraficoDeSemanas } from './tipos';
