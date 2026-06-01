varying vec2 vUv;
varying float vDistance;
varying vec2 vWorldPos;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vDistance = length(worldPosition.xz);
  vWorldPos = worldPosition.xz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
