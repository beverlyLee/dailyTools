import numpy as np
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import json

@dataclass
class Body:
    id: int
    mass: float
    position: np.ndarray
    velocity: np.ndarray
    acceleration: np.ndarray
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "mass": self.mass,
            "position": self.position.tolist(),
            "velocity": self.velocity.tolist(),
            "acceleration": self.acceleration.tolist()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Body":
        return cls(
            id=data["id"],
            mass=data["mass"],
            position=np.array(data["position"], dtype=np.float64),
            velocity=np.array(data["velocity"], dtype=np.float64),
            acceleration=np.array(data["acceleration"], dtype=np.float64)
        )


class ThreeBodySimulator:
    G = 6.67430e-11
    
    def __init__(self, softening: float = 1e-6):
        self.softening = softening
        self.bodies: List[Body] = []
        self.time: float = 0.0
        self.trajectory_history: List[Dict] = []
    
    def init_bodies(self, bodies_config: List[Dict]):
        self.bodies = []
        for config in bodies_config:
            body = Body(
                id=config["id"],
                mass=config["mass"],
                position=np.array(config["position"], dtype=np.float64),
                velocity=np.array(config["velocity"], dtype=np.float64),
                acceleration=np.zeros(3, dtype=np.float64)
            )
            self.bodies.append(body)
        
        self._compute_accelerations()
        self.time = 0.0
        self.trajectory_history = []
        self._save_state()
    
    def _compute_accelerations(self):
        n = len(self.bodies)
        for i in range(n):
            self.bodies[i].acceleration = np.zeros(3, dtype=np.float64)
        
        for i in range(n):
            for j in range(i + 1, n):
                r_ij = self.bodies[j].position - self.bodies[i].position
                dist_sq = np.dot(r_ij, r_ij) + self.softening ** 2
                dist = np.sqrt(dist_sq)
                dist_cubed = dist ** 3
                
                force_mag = self.G * self.bodies[i].mass * self.bodies[j].mass / dist_cubed
                force = force_mag * r_ij
                
                self.bodies[i].acceleration += force / self.bodies[i].mass
                self.bodies[j].acceleration -= force / self.bodies[j].mass
    
    def _save_state(self):
        state = {
            "time": self.time,
            "bodies": [body.to_dict() for body in self.bodies]
        }
        self.trajectory_history.append(state)
    
    def step(self, dt: float):
        for body in self.bodies:
            body.position += body.velocity * dt + 0.5 * body.acceleration * dt ** 2
        
        old_accelerations = [body.acceleration.copy() for body in self.bodies]
        
        self._compute_accelerations()
        
        for i, body in enumerate(self.bodies):
            body.velocity += 0.5 * (old_accelerations[i] + body.acceleration) * dt
        
        self.time += dt
        self._save_state()
    
    def run(self, dt: float, num_steps: int, save_every: int = 1) -> List[Dict]:
        for step in range(num_steps):
            self.step(dt)
            if (step + 1) % save_every == 0:
                pass
        
        return self.trajectory_history
    
    def get_current_state(self) -> Dict:
        return {
            "time": self.time,
            "bodies": [body.to_dict() for body in self.bodies]
        }
    
    def get_trajectory(self) -> List[Dict]:
        return self.trajectory_history
    
    def reset(self):
        self.bodies = []
        self.time = 0.0
        self.trajectory_history = []
