uniform float uPixelRatio;
uniform float uSize;

attribute vec3 aVelocity;
attribute vec3 aColor;

varying vec3 vColor;
varying float vSpeed;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float speed = length(aVelocity);
  vSpeed = speed;
  vColor = aColor;

  gl_PointSize = uSize * uPixelRatio * (320.0 / -mvPosition.z) * (1.0 + speed * 4.5);
}
