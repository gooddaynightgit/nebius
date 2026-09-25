/** Full-screen satin. Domain-warped fbm is the fold height; lighting does the sheen. */

export const SILK_VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const SILK_FRAG = `
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
  float a = 0.52;
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p * 2.02;
    a *= 0.5;
  }
  return v;
}

vec2 warp(vec2 p) {
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(
    fbm(p + 1.55 * q + vec2(1.7, 9.2)),
    fbm(p + 1.55 * q + vec2(8.3, 2.8))
  );
  return r;
}

float height(vec2 p) {
  vec2 r = warp(p);
  float along = fbm(p + 1.25 * r);
  float c = 0.54;
  float s = 0.841;
  vec2 x = mat2(c, -s, s, c) * (p + 0.35 * r);
  float cross = fbm(vec2(x.x * 1.15, x.y * 0.72));
  return along * 0.8 + cross * 0.2;
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

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.042;
  float ca = 0.882;
  float sa = 0.469;
  vec2 d = mat2(ca, -sa, sa, ca) * p;
  vec2 sp = vec2(d.x * 2.35, d.y * 1.05);
  sp += vec2(t * 0.16, t * 0.05);
  sp += vec2(sin(d.y * 1.15 + t), cos(d.x * 0.9 - t * 0.7)) * 0.035;

  float e = 0.022;
  float h = clamp((height(sp) - 0.36) * 2.25 + 0.42, 0.0, 1.0);
  float hx = clamp((height(sp + vec2(e, 0.0)) - 0.36) * 2.25 + 0.42, 0.0, 1.0);
  float hy = clamp((height(sp + vec2(0.0, e)) - 0.36) * 2.25 + 0.42, 0.0, 1.0);
  float dx = (hx - h) / e;
  float dy = (hy - h) / e;
  float slope = length(vec2(dx, dy));
  vec3 n = normalize(vec3(-dx, -dy, 0.46));

  vec3 light = normalize(vec3(-0.28, 0.58, 0.76));
  vec3 view = vec3(0.0, 0.0, 1.0);
  vec3 halfV = normalize(light + view);
  float ndl = clamp(dot(n, light), 0.0, 1.0);
  float ndh = clamp(dot(n, halfV), 0.0, 1.0);
  float satin = pow(ndh, 20.0);
  float gloss = pow(ndh, 128.0);
  float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.7);
  float ridge = smoothstep(0.4, 1.35, slope) * (1.0 - smoothstep(2.0, 3.2, slope));

  vec2 flow = warp(sp);
  float tone = fract((flow.x - 0.42) * 2.2 + (flow.y - 0.42) * 1.5 + p.y * 0.38 + p.x * 0.16 + 0.2);
  vec3 base = palette(tone);
  vec3 col = mix(crease(), base, 0.05 + 0.95 * smoothstep(0.02, 0.7, ndl));
  col = mix(col, crease(), smoothstep(0.56, 0.14, h) * 0.82);
  vec3 film = palette(tone + 0.18 + fres * 0.42);
  col = mix(col, film, satin * 0.34 + fres * 0.12);
  col = mix(col, aqua(), fres * 0.34);
  col += yellow() * (gloss * 0.58 + ridge * 0.1);
  col += vec3(1.0, 0.98, 0.9) * gloss * gloss * 0.4;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
