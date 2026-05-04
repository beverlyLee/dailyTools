from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from .physics.simulator import ThreeBodySimulator, CelestialBody, Vector3D
from .models.database import DatabaseManager, SimulationRecord

app = FastAPI(
    title="Three-Body Simulator API",
    description="A high-performance three-body motion simulation API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = ThreeBodySimulator(dt=1.0)
db_manager = DatabaseManager()


class BodyInput(BaseModel):
    name: str = "Body"
    mass: float
    position: List[float]
    velocity: List[float]


class SimulationConfig(BaseModel):
    bodies: List[BodyInput]
    dt: float = 1.0
    steps: int = 1000


class SimulationSaveRequest(BaseModel):
    simulation_name: str
    notes: str = ""


class AnalysisResult(BaseModel):
    simulation_id: int
    simulation_name: str
    total_time: float
    dt: float
    body_analysis: dict


@app.get("/")
def read_root():
    return {"message": "Three-Body Simulator API", "version": "1.0.0"}


@app.post("/api/simulation/initialize")
def initialize_simulation(config: SimulationConfig):
    try:
        bodies = []
        for body_input in config.bodies:
            body = CelestialBody(
                mass=body_input.mass,
                position=Vector3D.from_list(body_input.position),
                velocity=Vector3D.from_list(body_input.velocity),
                name=body_input.name
            )
            bodies.append(body)

        simulator.reset(bodies)
        simulator.dt = config.dt

        initial_snapshot = simulator.get_latest_snapshot()
        return {
            "status": "initialized",
            "message": "Simulation initialized successfully",
            "initial_state": initial_snapshot
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulation/step")
def run_simulation_step(steps: int = Query(1, ge=1, le=1000)):
    try:
        if len(simulator.bodies) < 2:
            raise HTTPException(status_code=400, detail="Simulation not initialized. Please initialize with at least 2 bodies.")

        snapshot = simulator.run_simulation(steps)
        return {
            "status": "running",
            "steps_executed": steps,
            "current_time": simulator.time,
            "snapshot": snapshot
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulation/state")
def get_simulation_state():
    try:
        snapshot = simulator.get_latest_snapshot()
        return {
            "time": simulator.time,
            "bodies": snapshot['bodies'],
            "history_length": len(simulator.trajectory_history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulation/trajectory")
def get_trajectory_history(limit: int = Query(1000, ge=1, le=10000)):
    try:
        history = simulator.get_trajectory_history()
        if limit < len(history):
            history = history[-limit:]
        return {
            "time_range": {
                "start": history[0]['time'] if history else 0,
                "end": history[-1]['time'] if history else 0
            },
            "data_points": len(history),
            "trajectory": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulation/reset")
def reset_simulation():
    try:
        simulator.reset()
        return {
            "status": "reset",
            "message": "Simulation reset successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulation/save")
def save_simulation(request: SimulationSaveRequest):
    try:
        if len(simulator.bodies) == 0:
            raise HTTPException(status_code=400, detail="No simulation data to save")

        initial_bodies = [
            {
                'name': body.name,
                'mass': body.mass,
                'position': [body.position.x, body.position.y, body.position.z],
                'velocity': [body.velocity.x, body.velocity.y, body.velocity.z]
            }
            for body in simulator.bodies
        ]

        trajectory_data = simulator.get_trajectory_history()

        record = db_manager.create_simulation_record(
            simulation_name=request.simulation_name,
            dt=simulator.dt,
            total_time=simulator.time,
            initial_bodies=initial_bodies,
            trajectory_data=trajectory_data,
            notes=request.notes
        )

        record_id = db_manager.save_simulation(record)

        return {
            "status": "saved",
            "message": "Simulation saved successfully",
            "simulation_id": record_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulations")
def get_all_simulations(limit: int = Query(100, ge=1, le=1000)):
    try:
        records = db_manager.get_all_simulations(limit)
        return {
            "count": len(records),
            "simulations": [record.to_dict() for record in records]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulations/{simulation_id}")
def get_simulation(simulation_id: int):
    try:
        record = db_manager.get_simulation(simulation_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Simulation not found")
        return record.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/simulations/{simulation_id}")
def delete_simulation(simulation_id: int):
    try:
        if db_manager.delete_simulation(simulation_id):
            return {
                "status": "deleted",
                "message": f"Simulation {simulation_id} deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Simulation not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analysis/{simulation_id}")
def analyze_simulation(simulation_id: int):
    try:
        analysis = db_manager.analyze_periodicity(simulation_id)
        if 'error' in analysis:
            raise HTTPException(status_code=404, detail=analysis['error'])
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/presets")
def get_presets():
    return {
        "presets": [
            {
                "name": "Sun-Earth-Moon System",
                "description": "Simplified solar system with three bodies",
                "bodies": [
                    {
                        "name": "Sun",
                        "mass": 1.989e30,
                        "position": [0, 0, 0],
                        "velocity": [0, 0, 0]
                    },
                    {
                        "name": "Earth",
                        "mass": 5.972e24,
                        "position": [1.496e11, 0, 0],
                        "velocity": [0, 29783, 0]
                    },
                    {
                        "name": "Moon",
                        "mass": 7.342e22,
                        "position": [1.496e11 + 3.844e8, 0, 0],
                        "velocity": [0, 29783 + 1022, 0]
                    }
                ]
            },
            {
                "name": "Equal Mass Triangular",
                "description": "Three equal masses in equilateral triangle configuration",
                "bodies": [
                    {
                        "name": "Body A",
                        "mass": 1e24,
                        "position": [1e11, 0, 0],
                        "velocity": [0, 1e4, 0]
                    },
                    {
                        "name": "Body B",
                        "mass": 1e24,
                        "position": [-5e10, 8.66e10, 0],
                        "velocity": [-8660, -5000, 0]
                    },
                    {
                        "name": "Body C",
                        "mass": 1e24,
                        "position": [-5e10, -8.66e10, 0],
                        "velocity": [8660, -5000, 0]
                    }
                ]
            },
            {
                "name": "Chaotic Configuration",
                "description": "A configuration likely to exhibit chaotic behavior",
                "bodies": [
                    {
                        "name": "Heavy Body",
                        "mass": 2e30,
                        "position": [0, 0, 0],
                        "velocity": [0, 0, 0]
                    },
                    {
                        "name": "Light Body 1",
                        "mass": 1e24,
                        "position": [1e11, 0, 0],
                        "velocity": [0, 2e4, 1e4]
                    },
                    {
                        "name": "Light Body 2",
                        "mass": 1e24,
                        "position": [-1e11, 5e10, 0],
                        "velocity": [1e4, -2e4, 5e3]
                    }
                ]
            }
        ]
    }
