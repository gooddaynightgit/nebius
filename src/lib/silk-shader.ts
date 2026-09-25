/** Full-screen satin. Metaball lamps ride a domain-warped silk height; lighting and bloom do the glow. */

export const SILK_VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const SILK_FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = m * p * 2.02;
    a *= 0.5;
  }
  return v;
}

vec2 warp(vec2 p) {
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(
    fbm(p + 1.45 * q + vec2(1.7, 9.2)),
    fbm(p + 1.45 * q + vec2(8.3, 2.8))
  );
  return r;
}

vec3 lilac() { return vec3(0.788, 0.714, 0.949); } /* #C9B6F2 */
vec3 pink() { return vec3(0.957, 0.722, 0.894); } /* #F4B8E4 */
vec3 violet() { return vec3(0.663, 0.545, 0.941); } /* #A98BF0 */
vec3 aqua() { return vec3(0.624, 0.902, 0.933); } /* #9FE6EE */
vec3 sky() { return vec3(0.718, 0.867, 0.984); } /* #B7DDFB */
vec3 yellow() { return vec3(1.0, 0.945, 0.659); } /* #FFF1A8 */
vec3 gold() { return vec3(1.0, 0.914, 0.541); } /* #FFE98A */
vec3 pearl() { return vec3(0.957, 0.941, 1.0); } /* #F4F0FF */
vec3 pearlWhite() { return vec3(1.0, 1.0, 1.0); } /* #FFFFFF */
vec3 crease() { return vec3(0.435, 0.373, 0.784); } /* #6F5FC8 */

vec3 palette(float x) {
  x = fract(x);
  float u = x * 5.0;
  float i = floor(u);
  float f = smoothstep(0.0, 1.0, fract(u));
  vec3 a = lilac();
  vec3 b = pink();
  if (i < 0.5) { a = lilac(); b = pink(); }
  else if (i < 1.5) { a = pink(); b = violet(); }
  else if (i < 2.5) { a = violet(); b = aqua(); }
  else if (i < 3.5) { a = aqua(); b = sky(); }
  else { a = sky(); b = yellow(); }
  return mix(a, b, f);
}

void addBlob(
  vec2 uv, float t, float phase, float dur, float sway, float swell, vec3 ink, float glowBoost, float xBias, float scale,
  inout float field, inout vec3 tint, inout float weight, inout vec3 bloom, inout float bloomW
) {
  float travel = fract(phase + t / dur);
  float fade = smoothstep(0.0, 0.28, travel) * (1.0 - smoothstep(0.72, 1.0, travel));
  float x = xBias + 0.12 * sin(t / sway + phase * 6.28318);
  float y = travel;
  float ang = 0.62 + 0.22 * sin(t / (swell * 1.8) + phase * 2.4);
  float ca = cos(ang);
  float sa = sin(ang);
  vec2 fold = mat2(ca, -sa, sa, ca) * (uv - vec2(x, y));
  float ax = (0.14 + 0.025 * sin(t / swell + phase)) * scale;
  float ay = (0.62 + 0.08 * sin(t / (swell * 1.25) + phase)) * scale;
  float q = (fold.x * fold.x) / (ax * ax) + (fold.y * fold.y) / (ay * ay);
  float pulse = 0.72 + 0.28 * sin(t * 0.74 + phase * 6.28318);
  float core = fade * exp(-q * 2.2);
  float wide = fade * pulse * exp(-q * 0.42);
  vec3 emit = mix(ink, pearlWhite(), glowBoost * exp(-q * 2.4) * 0.55);
  field += core;
  tint += ink * core;
  weight += core;
  bloom += emit * wide * (0.65 + glowBoost);
  bloomW += wide;
}

void blobs(vec2 uv, float t, out float field, out vec3 tint, out float weight, out vec3 bloom, out float bloomW) {
  field = 0.0;
  tint = vec3(0.0);
  weight = 0.0;
  bloom = vec3(0.0);
  bloomW = 0.0;
  addBlob(uv, t, 0.16, 15.2, 19.0, 9.4, mix(pearlWhite(), pearl(), 0.15), 0.9, 0.58, 1.0, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.48, 14.4, 16.8, 8.6, mix(yellow(), gold(), 0.35), 0.75, 0.86, 0.78, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.72, 17.6, 21.0, 10.6, aqua(), 0.22, 0.4, 1.38, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.34, 13.2, 18.4, 8.1, sky(), 0.26, 0.18, 1.28, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.88, 16.4, 13.6, 11.2, pink(), 0.24, 0.74, 1.34, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.6, 12.6, 22.2, 9.8, lilac(), 0.12, 0.28, 0.84, field, tint, weight, bloom, bloomW);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;

  vec2 flow = warp(vec2(p.x * 0.9, p.y * 1.7) + vec2(t * 0.011, t * 0.006));
  vec2 bend = flow - 0.48;
  vec2 sp = uv + vec2(bend.x * 0.05 + bend.y * 0.04, bend.y * 0.16);
  float silk = fbm(vec2(p.x * 1.1, p.y * 2.1) + 1.05 * flow + vec2(t * 0.016, t * 0.008));

  float field, weight, bloomW;
  vec3 tint, bloom;
  blobs(sp, t, field, tint, weight, bloom, bloomW);

  vec3 halo = bloom;
  float haloW = bloomW;

  float dome = field / (field + 0.55);
  float h = clamp(0.22 + dome * 0.48 + (silk - 0.4) * 0.9, 0.0, 1.0);
  float dx = dFdx(h) * uRes.x;
  float dy = dFdy(h) * uRes.y;
  float slope = length(vec2(dx, dy));
  vec3 n = normalize(vec3(-dx * 2.1, -dy * 2.1, 0.46));

  vec3 light = normalize(vec3(-0.22, 0.48, 0.85));
  vec3 halfV = normalize(light + vec3(0.0, 0.0, 1.0));
  float ndl = clamp(dot(n, light), 0.0, 1.0);
  float ndh = clamp(dot(n, halfV), 0.0, 1.0);
  float satin = pow(ndh, 28.0);
  float gloss = pow(ndh, 128.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.65);
  float ridge = smoothstep(0.45, 1.6, slope) * (1.0 - smoothstep(2.4, 4.0, slope));

  vec3 base = tint / max(weight, 0.0001);
  float shade = smoothstep(0.0, 0.88, ndl);
  vec3 col = mix(base * 0.78, min(base * 1.05, vec3(1.0)), shade);
  col = mix(col, mix(base, pearlWhite(), 0.2), satin * 0.28);

  vec3 glow = halo / max(haloW, 0.0001);
  float breathe = 0.78 + 0.22 * sin(t * 0.72);
  col = mix(col, glow, smoothstep(0.15, 0.85, bloomW) * breathe * 0.22);
  float crest = smoothstep(0.35, 1.15, slope) * (0.25 + 0.75 * gloss);
  float filmU = clamp(0.15 + fres * 0.9 + n.x * 0.25, 0.0, 1.0);
  vec3 rim = mix(pink(), yellow(), smoothstep(0.05, 0.48, filmU));
  rim = mix(rim, aqua(), smoothstep(0.38, 0.82, filmU));
  col = mix(col, rim, smoothstep(0.12, 0.7, fres) * crest * 0.55);
  col += mix(pearlWhite(), yellow(), 0.4) * (gloss * 0.9 + satin * 0.12 + ridge * 0.15);
  float trough = smoothstep(0.48, 0.2, h) * smoothstep(0.55, 0.12, ndl);
  col = mix(col, crease(), trough * 0.55);
  col = max(col, vec3(0.0));
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float floorL = dot(crease(), vec3(0.299, 0.587, 0.114));
  // One 8-bit code above the crease so UNORM rounding cannot slip under #6F5FC8.
  col = mix(crease(), col, step(floorL + 1.0 / 255.0, luma));

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
