import { aplicarTopeDeLetra } from './topeDeLetra';

/**
 * Lo primero que carga `index.ts`: pone el tope de letra (`TOPE_DE_LETRA`) a `Text` y `TextInput` ANTES de que se evalúe ninguna
 * pantalla ni librería, para que lo que se guarda de `Text` al cargar (p. ej. `Animated.createAnimatedComponent(TextInput)`)
 * ya reciba el componente con el tope. Es un módulo aparte porque los `import` se evalúan antes que cualquier línea de `index.ts`.
 */
aplicarTopeDeLetra();
