export const vertexShader = /* glsl */ `
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
uniform mat4 modelViewMatrix, projectionMatrix;
uniform float furLen, windAmp, windFreq, time;
uniform int   layerMax;
uniform vec2  windDir, strokePos, strokeDir;
uniform float strokeRad;
out vec2  vUv; out float vFrac;

void main(){
  vUv = uv;
  float idx   = float(gl_InstanceID);
  vFrac       = idx / float(layerMax-1);
  vec3 p      = position + normal * furLen * vFrac;

  /* 風 */
  float sway  = sin(time*windFreq + (uv.x+uv.y)*14.0);
  p.xy       += windDir * windAmp * sway * vFrac;

  /* 撫で */
  float d     = distance(uv, strokePos);
  float infl  = d < strokeRad ? 1.0 - d/strokeRad : 0.0;
  p.xy       += strokeDir * furLen * vFrac * infl;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
}`;

export const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D mapRGB, mapA;
uniform bool invertA;
in vec2  vUv; in float vFrac; out vec4 frag;
void main(){
  vec3  col = texture(mapRGB, vUv).rgb;
  float a   = texture(mapA  , vUv).r;
  if(invertA) a = 1.0 - a;
  a *= 1.0 - 0.8*vFrac;
  if(a < .01) discard;
  frag = vec4(col, a);
}`;
