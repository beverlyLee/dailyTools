import * as CANNON from 'cannon-es'

export interface AeroForces {
  lift: CANNON.Vec3
  drag: CANNON.Vec3
  torque: CANNON.Vec3
  aoa: number
  speed: number
  cl: number
}

const AIR_DENSITY = 1.225
const WING_AREA = 0.55
const WING_SPAN = 1.5
const CL_ALPHA = 3.5
const CD0 = 0.035
const ASPECT_RATIO = (WING_SPAN * WING_SPAN) / WING_AREA
const OSWALD_EFFICIENCY = 0.75
const STALL_ANGLE_DEG = 18
const STALL_ANGLE_RAD = (STALL_ANGLE_DEG * Math.PI) / 180
const PITCH_STABILITY = 0.35
const PITCH_DAMPING = 0.8
const PITCH_TRIM = 0.05
const YAW_STABILITY = 0.05
const ROLL_DAMPING = 0.4

function computeCL(aoa: number): number {
  const aoaDeg = (aoa * 180) / Math.PI
  const absAoA = Math.abs(aoaDeg)

  if (absAoA < STALL_ANGLE_DEG) {
    return CL_ALPHA * aoa
  }

  const clAtStall = CL_ALPHA * STALL_ANGLE_RAD
  const sign = Math.sign(aoa)
  const excessDeg = absAoA - STALL_ANGLE_DEG
  const postStallFactor = Math.exp(-excessDeg / 12)
  const flatPlateLift = 1.2 * Math.sin(2 * aoa)
  return sign * clAtStall * postStallFactor + flatPlateLift * (1 - postStallFactor)
}

function computeCD(cl: number): number {
  const induced = (cl * cl) / (Math.PI * ASPECT_RATIO * OSWALD_EFFICIENCY)
  return CD0 + induced
}

export function computeAerodynamicForces(body: CANNON.Body): AeroForces {
  const velocity = body.velocity.clone()
  const speed = velocity.length()

  const zeroResult: AeroForces = {
    lift: new CANNON.Vec3(),
    drag: new CANNON.Vec3(),
    torque: new CANNON.Vec3(),
    aoa: 0,
    speed: 0,
    cl: 0,
  }

  if (speed < 0.5) return zeroResult

  const forward = new CANNON.Vec3(1, 0, 0)
  const up = new CANNON.Vec3(0, 1, 0)
  const right = new CANNON.Vec3(0, 0, 1)
  body.quaternion.vmult(forward, forward)
  body.quaternion.vmult(up, up)
  body.quaternion.vmult(right, right)

  const velDir = velocity.clone().unit()

  const dotForward = velDir.dot(forward)
  const dotUp = velDir.dot(up)
  const aoa = Math.atan2(-dotUp, Math.max(dotForward, 0.01))

  const cl = computeCL(aoa)
  const cd = computeCD(cl)

  const q = 0.5 * AIR_DENSITY * speed * speed
  const liftMag = q * WING_AREA * cl
  const dragMag = q * WING_AREA * cd

  let liftDir = up.clone()
  const proj = liftDir.dot(velDir)
  liftDir = liftDir.vsub(velDir.scale(proj))
  const liftDirLen = liftDir.length()
  if (liftDirLen > 0.001) {
    liftDir = liftDir.scale(1 / liftDirLen)
  } else {
    liftDir = new CANNON.Vec3(0, 1, 0)
  }

  const lift = liftDir.scale(liftMag)
  const drag = velDir.scale(-dragMag)

  const pitchTorqueMag = -PITCH_STABILITY * speed * speed * (aoa - PITCH_TRIM) * 0.01
  const pitchDampingTorque = -PITCH_DAMPING * body.angularVelocity.dot(right) * speed * 0.02
  const pitchTorque = right.scale(pitchTorqueMag + pitchDampingTorque)

  const yawTorqueMag = -YAW_STABILITY * velDir.dot(right) * speed * speed * 0.002
  const yawDamping = -0.3 * body.angularVelocity.dot(up) * speed * 0.01
  const yawTorque = up.scale(yawTorqueMag + yawDamping)

  const rollDampingTorque = forward.scale(-ROLL_DAMPING * body.angularVelocity.dot(forward) * speed * 0.01)

  const torque = new CANNON.Vec3()
  torque.vadd(pitchTorque, torque)
  torque.vadd(yawTorque, torque)
  torque.vadd(rollDampingTorque, torque)

  return { lift, drag, torque, aoa, speed, cl }
}
