import math
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class Vector3D:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def __add__(self, other: 'Vector3D') -> 'Vector3D':
        return Vector3D(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other: 'Vector3D') -> 'Vector3D':
        return Vector3D(self.x - other.x, self.y - other.y, self.z - other.z)

    def __mul__(self, scalar: float) -> 'Vector3D':
        return Vector3D(self.x * scalar, self.y * scalar, self.z * scalar)

    def __truediv__(self, scalar: float) -> 'Vector3D':
        if scalar == 0:
            raise ValueError("Division by zero")
        return Vector3D(self.x / scalar, self.y / scalar, self.z / scalar)

    def magnitude(self) -> float:
        return math.sqrt(self.x ** 2 + self.y ** 2 + self.z ** 2)

    def normalize(self) -> 'Vector3D':
        mag = self.magnitude()
        if mag == 0:
            return Vector3D(0, 0, 0)
        return self / mag

    def dot(self, other: 'Vector3D') -> float:
        return self.x * other.x + self.y * other.y + self.z * other.z

    def to_list(self) -> List[float]:
        return [self.x, self.y, self.z]

    @classmethod
    def from_list(cls, lst: List[float]) -> 'Vector3D':
        return cls(lst[0], lst[1], lst[2])


@dataclass
class CelestialBody:
    mass: float
    position: Vector3D
    velocity: Vector3D
    acceleration: Vector3D = None
    name: str = "Body"

    def __post_init__(self):
        if self.acceleration is None:
            self.acceleration = Vector3D(0, 0, 0)

    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'mass': self.mass,
            'position': self.position.to_list(),
            'velocity': self.velocity.to_list(),
            'acceleration': self.acceleration.to_list()
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'CelestialBody':
        return cls(
            mass=data['mass'],
            position=Vector3D.from_list(data['position']),
            velocity=Vector3D.from_list(data['velocity']),
            acceleration=Vector3D.from_list(data.get('acceleration', [0, 0, 0])),
            name=data.get('name', 'Body')
        )


class ThreeBodySimulator:
    G = 6.67430e-11

    def __init__(self, dt: float = 1.0):
        self.dt = dt
        self.bodies: List[CelestialBody] = []
        self.time = 0.0
        self.trajectory_history: List[List[dict]] = []

    def add_body(self, body: CelestialBody):
        self.bodies.append(body)

    def set_bodies(self, bodies: List[CelestialBody]):
        self.bodies = bodies
        self.trajectory_history = []
        self.time = 0.0

    def calculate_gravitational_force(self, body_i: CelestialBody, body_j: CelestialBody) -> Vector3D:
        r = body_j.position - body_i.position
        distance_squared = r.dot(r)

        if distance_squared < 1e-10:
            return Vector3D(0, 0, 0)

        distance = math.sqrt(distance_squared)
        force_magnitude = self.G * body_i.mass * body_j.mass / distance_squared
        force_direction = r.normalize()

        return force_direction * force_magnitude

    def calculate_acceleration(self, body: CelestialBody, other_bodies: List[CelestialBody]) -> Vector3D:
        total_force = Vector3D(0, 0, 0)

        for other in other_bodies:
            if body is not other:
                force = self.calculate_gravitational_force(body, other)
                total_force = total_force + force

        if body.mass == 0:
            return Vector3D(0, 0, 0)

        return total_force / body.mass

    def velocity_verlet_step(self):
        if len(self.bodies) < 2:
            return

        old_accelerations = [body.acceleration for body in self.bodies]

        for i, body in enumerate(self.bodies):
            body.position = body.position + body.velocity * self.dt + body.acceleration * (0.5 * self.dt ** 2)

        new_accelerations = []
        for i, body in enumerate(self.bodies):
            other_bodies = [self.bodies[j] for j in range(len(self.bodies)) if j != i]
            new_acc = self.calculate_acceleration(body, other_bodies)
            new_accelerations.append(new_acc)

        for i, body in enumerate(self.bodies):
            avg_acceleration = (old_accelerations[i] + new_accelerations[i]) * 0.5
            body.velocity = body.velocity + avg_acceleration * self.dt
            body.acceleration = new_accelerations[i]

        self.time += self.dt
        self._save_trajectory_point()

    def _save_trajectory_point(self):
        snapshot = {
            'time': self.time,
            'bodies': [body.to_dict() for body in self.bodies]
        }
        self.trajectory_history.append(snapshot)

    def run_simulation(self, steps: int) -> List[dict]:
        for _ in range(steps):
            self.velocity_verlet_step()
        return self.get_latest_snapshot()

    def get_latest_snapshot(self) -> dict:
        if not self.trajectory_history:
            return {'time': 0.0, 'bodies': [body.to_dict() for body in self.bodies]}
        return self.trajectory_history[-1]

    def get_trajectory_history(self) -> List[dict]:
        return self.trajectory_history

    def clear_history(self):
        self.trajectory_history = []

    def reset(self, bodies: List[CelestialBody] = None):
        self.time = 0.0
        self.clear_history()
        if bodies:
            self.set_bodies(bodies)
        else:
            for body in self.bodies:
                body.acceleration = Vector3D(0, 0, 0)
