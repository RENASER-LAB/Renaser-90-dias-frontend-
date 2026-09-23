/**
 * Shader del orbe líquido ("Glass Liquid", cinta de partículas en un cristal), en SkSL para
 * `@shopify/react-native-skia`.
 *
 * Es la MISMA matemática que `docs/pendientes/orbe-liquido-preview.html` (GLSL). Diferencias de
 * sintaxis, no de fórmula: `float2/3/4` en vez de `vec2/3/4`, `half4 main(float2 fragCoord)` en vez
 * de `out fragColor`, y SIN invertir la Y: en Skia `fragCoord.y` ya crece hacia abajo, y el GLSL de
 * la vista previa invertía justamente para parecerse a Skia.
 *
 * Los colores llegan en espacio LINEAL (se convierten en `coloresDelOrbe`): interpolar en sRGB da
 * un gris sucio a mitad de la transición.
 */
export const ORBE_SKSL = `
uniform float2 uPix;
uniform float  uFase;
uniform float  uEstado;
uniform float3 uIdleA;
uniform float3 uIdleB;
uniform float3 uThinkA;
uniform float3 uThinkB;

const float TAU = 6.28318530718;
const float PI  = 3.14159265359;

const float I_DISP = 0.38; const float T_DISP = 1.00;
const float I_TURB = 0.18; const float T_TURB = 0.85;
const float I_GRO  = 0.058; const float T_GRO = 0.078;
const float I_UMB  = 0.50; const float T_UMB  = 0.34;
const float I_BRI  = 0.62; const float T_BRI  = 1.00;
const float I_ESC  = 0.88; const float T_ESC  = 1.00;

const int   HEBRAS = 3;
const int   POR_HEBRA = 36;
const float GANANCIA = 0.60;

float3 aSrgb(float3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, float3(1.0 / 2.4)) - 0.055, step(float3(0.0031308), c));
}

float3 posCinta(float k, float t, float h, float disp, float turb) {
  float a = k * TAU + t;
  float incl = 0.55 + 0.42 * h;
  float3 p = float3(cos(a), sin(a) * cos(incl), sin(a) * sin(incl));
  float g = t * 0.35 + h * 2.1;
  p = float3(p.x * cos(g) - p.z * sin(g), p.y, p.x * sin(g) + p.z * cos(g));
  float radio = 0.46 + disp * 0.18 * sin(a * 3.0 - t * 1.4 + h * 1.7);
  p *= radio;
  p.xy += turb * 0.07 * float2(sin(a * 5.0 + t * 2.1 + h), cos(a * 4.0 - t * 1.7 + h));
  return p;
}

half4 main(float2 fragCoord) {
  float s = clamp(uEstado, 0.0, 1.0);
  float disp = mix(I_DISP, T_DISP, s);
  float turb = mix(I_TURB, T_TURB, s);
  float gro  = mix(I_GRO,  T_GRO,  s);
  float umb  = mix(I_UMB,  T_UMB,  s);
  float bri  = mix(I_BRI,  T_BRI,  s);
  float esc  = mix(I_ESC,  T_ESC,  s);

  float2 uv = (fragCoord / uPix) * 2.0 - 1.0;
  uv /= esc;

  float r = length(uv);
  float vidrio = 1.0 - smoothstep(0.90, 1.0, r);
  float z = sqrt(max(0.0, 1.0 - min(r * r, 1.0)));
  float2 uvr = uv * (1.0 + 0.22 * (1.0 - z));

  float campo = 0.0;
  float profAcum = 0.0;
  for (int h = 0; h < HEBRAS; h++) {
    float fase = uFase + float(h) * 0.7;
    for (int i = 0; i < POR_HEBRA; i++) {
      float k = (float(i) + 0.5) / float(POR_HEBRA);
      float3 p = posCinta(k, fase, float(h), disp, turb);
      float prof = clamp(0.5 + 0.72 * p.z, 0.0, 1.0);
      float w = gro * (0.78 + 0.22 * sin(k * PI)) * (0.80 + 0.20 * prof);
      float2 d = uvr - p.xy;
      float rad = w * 2.6;
      float q = max(0.0, 1.0 - dot(d, d) / (rad * rad));
      float c = q * q * q;
      c *= 0.45 + 0.55 * prof;
      campo += c;
      profAcum += c * prof;
    }
  }
  profAcum /= max(campo, 1e-4);
  campo *= GANANCIA;

  float m      = smoothstep(umb - 0.18, umb + 0.18, campo);
  float filo   = smoothstep(umb + 0.42, umb + 0.02, campo) * m;
  float nucleo = smoothstep(umb + 0.30, umb + 0.85, campo);
  float aura   = smoothstep(umb * 0.10, umb, campo) * (1.0 - m);

  float g = clamp(0.5 + 0.5 * (uvr.y * 0.75 + uvr.x * 0.35), 0.0, 1.0);
  float3 cA = mix(uIdleA, uThinkA, s);
  float3 cB = mix(uIdleB, uThinkB, s);
  float3 base = mix(cA, cB, g);

  float3 N = float3(uv, z);
  float3 L = normalize(float3(-0.45, -0.62, 0.65));
  float esp  = pow(max(dot(normalize(N), L), 0.0), 26.0);
  float fres = pow(1.0 - z, 2.8);

  float cuerpo = 0.13 * bri;
  float sombra = 0.42 + 0.58 * profAcum;

  float3 col = base * cuerpo * 0.45;
  col += base * aura * 0.55 * sombra * bri;
  col += base * m * (0.90 + 0.70 * filo) * sombra * bri;
  col += mix(base, float3(1.0), 0.30) * nucleo * 0.50 * bri;
  col += float3(1.0) * esp * 0.75;
  col += cB * fres * 0.35 * bri;

  float alfa = clamp(cuerpo + m * 0.92 * sombra + aura * 0.28 * bri + nucleo * 0.30
                   + filo * 0.20 + esp * 0.55 + fres * 0.30, 0.0, 1.0);
  alfa *= vidrio;
  col  *= vidrio;

  float3 srgb = aSrgb(col);
  return half4(half3(srgb * alfa), half(alfa));
}
`;

/** Velocidad de la fase (rad/s): la cinta acelera al pensar, sin saltar de posición. */
export const VEL_IDLE = 0.3;
export const VEL_THINK = 1.15;

/** Transición idle → thinking y vuelta (mismos valores que la vista previa). */
export const MS_ENTRADA = 220;
export const MS_SALIDA = 650;
