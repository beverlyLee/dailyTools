use quantum_simulator::{
    CircuitSimulator, ProbabilityDistribution, QuantumCircuit, QuantumGate, GateType,
    StateVector,
};
use num_complex::Complex64;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplexNumber {
    pub real: f64,
    pub imag: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GateInfo {
    pub gate_type: String,
    pub qubits: Vec<usize>,
    pub parameters: Vec<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitState {
    pub amplitudes: Vec<ComplexNumber>,
    pub probabilities: Vec<f64>,
    pub bloch_spheres: Vec<BlochSphereState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlochSphereState {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResult {
    pub final_state: CircuitState,
    pub step_states: Vec<CircuitState>,
    pub probability_distribution: HashMap<String, f64>,
    pub measurement_results: Vec<Vec<usize>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

#[tauri::command]
fn create_circuit(qubits: usize) -> String {
    let circuit = QuantumCircuit::new(qubits);
    serde_json::to_string(&circuit).unwrap_or_default()
}

#[tauri::command]
fn add_gate(circuit_json: String, gate_info: GateInfo) -> Result<String, String> {
    let mut circuit: QuantumCircuit = serde_json::from_str(&circuit_json)
        .map_err(|e| format!("Failed to parse circuit: {}", e))?;
    
    let gate_type = match gate_info.gate_type.as_str() {
        "H" => GateType::H,
        "X" => GateType::X,
        "Y" => GateType::Y,
        "Z" => GateType::Z,
        "S" => GateType::S,
        "T" => GateType::T,
        "CNOT" => GateType::CNOT,
        "Toffoli" => GateType::Toffoli,
        "Swap" => GateType::Swap,
        "Measurement" => GateType::Measurement,
        _ => return Err(format!("Unknown gate type: {}", gate_info.gate_type)),
    };
    
    let gate = if gate_info.parameters.is_empty() {
        QuantumGate::new(gate_type, gate_info.qubits)
    } else {
        QuantumGate::with_parameters(gate_type, gate_info.qubits, gate_info.parameters)
    };
    
    circuit.add_gate(gate)?;
    Ok(serde_json::to_string(&circuit).unwrap_or_default())
}

#[tauri::command]
fn remove_gate(circuit_json: String, index: usize) -> Result<String, String> {
    let mut circuit: QuantumCircuit = serde_json::from_str(&circuit_json)
        .map_err(|e| format!("Failed to parse circuit: {}", e))?;
    
    circuit.remove_gate(index)?;
    Ok(serde_json::to_string(&circuit).unwrap_or_default())
}

#[tauri::command]
fn validate_circuit(circuit_json: String) -> ValidationResult {
    let circuit: QuantumCircuit = match serde_json::from_str(&circuit_json) {
        Ok(c) => c,
        Err(_) => return ValidationResult {
            valid: false,
            errors: vec!["Failed to parse circuit".to_string()],
        },
    };
    
    let errors = circuit.validate();
    ValidationResult {
        valid: errors.is_empty(),
        errors,
    }
}

#[tauri::command]
fn run_simulation(circuit_json: String, shots: Option<usize>) -> Result<SimulationResult, String> {
    let circuit: QuantumCircuit = serde_json::from_str(&circuit_json)
        .map_err(|e| format!("Failed to parse circuit: {}", e))?;
    
    let mut simulator = CircuitSimulator::new(circuit.clone());
    let step_states = simulator.run_step_by_step();
    
    let final_state = simulator.state();
    let step_circuit_states: Vec<CircuitState> = step_states
        .iter()
        .map(|state| state_to_circuit_state(state))
        .collect();
    
    let prob_dist = ProbabilityDistribution::from_probabilities(
        final_state.get_probabilities(),
        final_state.qubits()
    );
    
    let measurement_results = if let Some(s) = shots {
        let mut results = Vec::new();
        for _ in 0..s {
            let mut sim = CircuitSimulator::new(circuit.clone());
            sim.run();
            results.push(sim.measure_all());
        }
        results
    } else {
        Vec::new()
    };
    
    Ok(SimulationResult {
        final_state: state_to_circuit_state(final_state),
        step_states: step_circuit_states,
        probability_distribution: prob_dist.probabilities().clone(),
        measurement_results,
    })
}

fn state_to_circuit_state(state: &StateVector) -> CircuitState {
    let amplitudes: Vec<ComplexNumber> = state
        .amplitudes()
        .iter()
        .map(|c| ComplexNumber {
            real: c.re,
            imag: c.im,
        })
        .collect();
    
    let probabilities = state.get_probabilities();
    
    let bloch_spheres: Vec<BlochSphereState> = (0..state.qubits())
        .map(|qubit| {
            let (x, y, z) = state.to_bloch_sphere(qubit);
            BlochSphereState { x, y, z }
        })
        .collect();
    
    CircuitState {
        amplitudes,
        probabilities,
        bloch_spheres,
    }
}

#[tauri::command]
fn get_available_gates() -> Vec<String> {
    vec![
        "H".to_string(),
        "X".to_string(),
        "Y".to_string(),
        "Z".to_string(),
        "S".to_string(),
        "T".to_string(),
        "CNOT".to_string(),
        "Toffoli".to_string(),
        "Swap".to_string(),
        "Measurement".to_string(),
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_circuit,
            add_gate,
            remove_gate,
            validate_circuit,
            run_simulation,
            get_available_gates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
