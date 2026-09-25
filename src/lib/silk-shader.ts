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
  vec2 uv, float t, float phase, float dur, float sway, float swell, float hue, float xBias,
  inout float field, inout vec3 tint, inout float weight, inout vec3 bloom, inout float bloomW
) {
  float travel = fract(phase + t / dur);
  float fade = smoothstep(0.0, 0.14, travel) * (1.0 - smoothstep(0.84, 1.0, travel));
  float x = clamp(xBias + 0.18 * sin(t / sway + phase * 6.28318), 0.08, 0.92);
  float y = travel;
  float rx = 0.28 + 0.08 * sin(t / swell + phase * 4.2);
  float ry = 0.24 + 0.08 * sin(t / (swell * 1.37) + phase * 2.6);
  vec2 d = (uv - vec2(x, y)) / vec2(max(rx, 0.08), max(ry, 0.08));
  float q = dot(d, d);
  float reach = clamp(1.0 - sqrt(q), 0.0, 1.0);
  float core = fade * reach * reach * (3.0 - 2.0 * reach);
  float haloReach = clamp(1.0 - sqrt(q) * 0.62, 0.0, 1.0);
  float pulse = 0.7 + 0.3 * sin(t * 0.74 + phase * 6.28318);
  float wide = fade * pulse * haloReach * haloReach;
  vec3 ink = palette(hue + q * 0.05 + t * 0.028);
  field += core;
  tint += ink * core;
  weight += core;
  bloom += ink * wide;
  bloomW += wide;
}

void blobs(vec2 uv, float t, out float field, out vec3 tint, out float weight, out vec3 bloom, out float bloomW) {
  field = 0.0;
  tint = vec3(0.0);
  weight = 0.0;
  bloom = vec3(0.0);
  bloomW = 0.0;
  addBlob(uv, t, 0.04, 13.6, 21.0, 8.6, 0.02, 0.28, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.23, 16.4, 14.8, 11.4, 0.22, 0.72, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.41, 18.2, 17.5, 7.8, 0.41, 0.5, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.57, 12.4, 23.2, 9.7, 0.58, 0.22, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.74, 15.3, 12.9, 10.6, 0.76, 0.8, field, tint, weight, bloom, bloomW);
  addBlob(uv, t, 0.89, 17.6, 19.4, 8.9, 0.93, 0.56, field, tint, weight, bloom, bloomW);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;

  vec2 flow = warp(p * 1.35 + vec2(t * 0.012, t * 0.007));
  vec2 sp = uv + (flow - 0.48) * 0.14;
  float silk = fbm(p * 1.8 + 1.2 * flow + vec2(t * 0.018, t * 0.01));

  float field, weight, bloomW;
  vec3 tint, bloom;
  blobs(sp, t, field, tint, weight, bloom, bloomW);

  vec3 halo = bloom;
  float haloW = bloomW;

  float dome = clamp(field, 0.0, 1.6) / 1.6;
  float h = clamp(pow(dome, 0.9) * 0.86 + silk * 0.16, 0.0, 1.0);
  float dx = dFdx(h) * uRes.x;
  float dy = dFdy(h) * uRes.y;
  float slope = length(vec2(dx, dy));
  vec3 n = normalize(vec3(-dx, -dy, 0.62));

  vec3 light = normalize(vec3(-0.22, 0.48, 0.85));
  vec3 halfV = normalize(light + vec3(0.0, 0.0, 1.0));
  float ndl = clamp(dot(n, light), 0.0, 1.0);
  float ndh = clamp(dot(n, halfV), 0.0, 1.0);
  float satin = pow(ndh, 28.0);
  float gloss = pow(ndh, 128.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.65);
  float ridge = smoothstep(0.45, 1.6, slope) * (1.0 - smoothstep(2.4, 4.0, slope));

  float bandA = fract(flow.x * 1.25 + flow.y * 0.55 + uv.y * 0.42 + t * 0.046);
  float bandB = fract(flow.y * 1.05 - flow.x * 0.72 + uv.x * 0.55 - t * 0.031);
  float loom = 0.5 + 0.5 * sin(uv.y * 1.7 + uv.x * 1.15 + t * 0.2);
  vec3 woven = mix(palette(bandA), palette(bandB), loom);
  vec3 blobCol = tint / max(weight, 0.001);
  vec3 base = mix(woven, blobCol, smoothstep(0.12, 0.72, dome));
  vec3 film = palette(bandA + 0.18 + fres * 0.4);

  vec3 col = mix(crease(), base, 0.08 + 0.92 * smoothstep(0.0, 0.72, ndl));
  col = mix(col, crease(), smoothstep(0.58, 0.12, dome) * 0.62);
  col = mix(col, film, satin * 0.36 + fres * 0.12);

  vec3 glow = halo / max(haloW, 0.001);
  float breathe = 0.78 + 0.22 * sin(t * 0.72);
  float haloAmt = clamp(bloomW * 0.22, 0.0, 1.0);
  col += glow * haloAmt * breathe * (0.28 + 0.45 * dome);
  col += mix(yellow(), vec3(1.0, 0.98, 0.9), 0.22) * (gloss * 1.05 + ridge * 0.16);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
