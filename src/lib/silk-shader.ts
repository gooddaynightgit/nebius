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
  float fade = smoothstep(0.0, 0.14, travel) * (1.0 - smoothstep(0.84, 1.0, travel));
  float x = clamp(xBias + 0.14 * sin(t / sway + phase * 6.28318), 0.06, 0.94);
  float y = travel;
  float ang = 0.68 + 0.16 * sin(t / (swell * 1.7) + phase * 3.0);
  float ca = cos(ang);
  float sa = sin(ang);
  vec2 delta = uv - vec2(x, y);
  vec2 fold = mat2(ca, -sa, sa, ca) * delta;
  float across = fold.x / max((0.16 + 0.03 * sin(t / swell + phase)) * scale, 0.07);
  float along = fold.y / max((0.92 + 0.16 * sin(t / (swell * 1.2))) * scale, 0.32);
  float q = across * across + along * along;
  float reach = clamp(1.0 - sqrt(q), 0.0, 1.0);
  float core = fade * reach * reach * (3.0 - 2.0 * reach);
  float haloReach = clamp(1.0 - sqrt(q) * 0.72, 0.0, 1.0);
  float pulse = 0.7 + 0.3 * sin(t * 0.74 + phase * 6.28318);
  float wide = fade * pulse * haloReach * haloReach;
  vec3 emit = mix(ink, pearlWhite(), glowBoost * reach * reach * 0.72);
  field += core;
  tint += ink * core;
  weight += core;
  bloom += emit * wide * (0.7 + glowBoost);
  bloomW += wide;
}

void blobs(vec2 uv, float t, out float field, out vec3 tint, out float weight, out vec3 bloom, out float bloomW) {
  field = 0.0;
  tint = vec3(0.0);
  weight = 0.0;
  bloom = vec3(0.0);
  bloomW = 0.0;
  addBlob(uv, t, 0.12, 15.4, 19.5, 9.2, mix(pearlWhite(), pearl(), 0.28), 1.0, 0.56, 1.02, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.46, 13.8, 16.2, 8.4, mix(yellow(), gold(), 0.45), 0.82, 0.78, 1.05, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.7, 17.2, 21.4, 10.8, aqua(), 0.38, 0.46, 1.16, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.33, 14.6, 18.8, 7.9, sky(), 0.42, 0.24, 1.08, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.88, 16.8, 13.4, 11.1, pink(), 0.34, 0.84, 1.0, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.58, 12.8, 22.6, 9.6, lilac(), 0.2, 0.18, 0.86, field, tint, weight, bloom, bloomW);
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

  float dome = clamp(field, 0.0, 1.2) / 1.2;
  float h = clamp(pow(dome, 1.05) * 0.8 + silk * 0.16, 0.0, 1.0);
  float dx = dFdx(h) * uRes.x;
  float dy = dFdy(h) * uRes.y;
  float slope = length(vec2(dx, dy));
  vec3 n = normalize(vec3(-dx, -dy, 0.4));

  vec3 light = normalize(vec3(-0.22, 0.48, 0.85));
  vec3 halfV = normalize(light + vec3(0.0, 0.0, 1.0));
  float ndl = clamp(dot(n, light), 0.0, 1.0);
  float ndh = clamp(dot(n, halfV), 0.0, 1.0);
  float satin = pow(ndh, 28.0);
  float gloss = pow(ndh, 128.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.65);
  float ridge = smoothstep(0.45, 1.6, slope) * (1.0 - smoothstep(2.4, 4.0, slope));

  vec3 base = weight > 0.02 ? tint / weight : mix(sky(), aqua(), 0.55);
  float lit = mix(0.8, 1.04, smoothstep(0.02, 0.8, ndl));
  vec3 col = min(base * lit, vec3(1.0));
  col = mix(col, mix(base, pearlWhite(), 0.16), satin * 0.12);

  vec3 glow = halo / max(haloW, 0.001);
  float breathe = 0.78 + 0.22 * sin(t * 0.72);
  float haloAmt = clamp(bloomW * 0.85, 0.0, 1.0);
  col = mix(col, min(glow * (0.92 + 0.14 * breathe), vec3(1.0)), haloAmt * smoothstep(0.12, 0.55, dome) * 0.3);
  float crest = max(ridge, smoothstep(0.7, 2.4, slope) * gloss);
  float filmU = clamp(fres * 1.35 + n.x * 0.28 - n.y * 0.08, 0.0, 1.0);
  vec3 rim = mix(pink(), yellow(), smoothstep(0.0, 0.4, filmU));
  rim = mix(rim, aqua(), smoothstep(0.28, 0.72, filmU));
  rim = mix(rim, pearlWhite(), smoothstep(0.58, 1.0, filmU) * 0.4);
  col = mix(col, rim, crest * 0.62);
  col += mix(pearlWhite(), yellow(), 0.46) * crest * 0.55;
  float valley = smoothstep(0.28, 0.02, dome) + smoothstep(0.34, 0.0, ndl);
  col = mix(col, crease(), clamp(valley, 0.0, 1.0) * 0.8);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
