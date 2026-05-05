use num_complex::Complex64;
use serde::{Deserialize, Serialize};
use std::f64::consts::SQRT_2;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GateType {
    H,
    X,
    Y,
    Z,
    S,
    T,
    CNOT,
    Toffoli,
    Swap,
    Measurement,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QuantumGate {
    gate_type: GateType,
    qubits: Vec<usize>,
    parameters: Vec<f64>,
}

impl QuantumGate {
    pub fn new(gate_type: GateType, qubits: Vec<usize>) -> Self {
        QuantumGate {
            gate_type,
            qubits,
            parameters: Vec::new(),
        }
    }

    pub fn with_parameters(gate_type: GateType, qubits: Vec<usize>, parameters: Vec<f64>) -> Self {
        QuantumGate {
            gate_type,
            qubits,
            parameters,
        }
    }

    pub fn gate_type(&self) -> GateType {
        self.gate_type
    }

    pub fn qubits(&self) -> &[usize] {
        &self.qubits
    }

    pub fn parameters(&self) -> &[f64] {
        &self.parameters
    }

    pub fn matrix(&self) -> Vec<Vec<Complex64>> {
        match self.gate_type {
            GateType::H => Self::hadamard_matrix(),
            GateType::X => Self::pauli_x_matrix(),
            GateType::Y => Self::pauli_y_matrix(),
            GateType::Z => Self::pauli_z_matrix(),
            GateType::S => Self::phase_gate_matrix(),
            GateType::T => Self::t_gate_matrix(),
            GateType::CNOT => Self::cnot_matrix(),
            GateType::Toffoli => Self::toffoli_matrix(),
            GateType::Swap => Self::swap_matrix(),
            GateType::Measurement => vec![],
        }
    }

    fn hadamard_matrix() -> Vec<Vec<Complex64>> {
        let h = 1.0 / SQRT_2;
        vec![
            vec![Complex64::new(h, 0.0), Complex64::new(h, 0.0)],
            vec![Complex64::new(h, 0.0), Complex64::new(-h, 0.0)],
        ]
    }

    fn pauli_x_matrix() -> Vec<Vec<Complex64>> {
        vec![
            vec![Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0)],
            vec![Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0)],
        ]
    }

    fn pauli_y_matrix() -> Vec<Vec<Complex64>> {
        vec![
            vec![Complex64::new(0.0, 0.0), Complex64::new(0.0, -1.0)],
            vec![Complex64::new(0.0, 1.0), Complex64::new(0.0, 0.0)],
        ]
    }

    fn pauli_z_matrix() -> Vec<Vec<Complex64>> {
        vec![
            vec![Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(-1.0, 0.0)],
        ]
    }

    fn phase_gate_matrix() -> Vec<Vec<Complex64>> {
        vec![
            vec![Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(0.0, 1.0)],
        ]
    }

    fn t_gate_matrix() -> Vec<Vec<Complex64>> {
        let angle = std::f64::consts::FRAC_PI_4;
        vec![
            vec![Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(angle.cos(), angle.sin())],
        ]
    }

    fn cnot_matrix() -> Vec<Vec<Complex64>> {
        vec![
            vec![Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0)],
        ]
    }

    fn toffoli_matrix() -> Vec<Vec<Complex64>> {
        let mut matrix = vec![vec![Complex64::new(0.0, 0.0); 8]; 8];
        for i in 0..8 {
            if i != 6 && i != 7 {
                matrix[i][i] = Complex64::new(1.0, 0.0);
            } else if i == 6 {
                matrix[6][7] = Complex64::new(1.0, 0.0);
            } else {
                matrix[7][6] = Complex64::new(1.0, 0.0);
            }
        }
        matrix
    }

    fn swap_matrix() -> Vec<Vec<Complex64>> {
        vec![
            vec![Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0)],
            vec![Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(0.0, 0.0), Complex64::new(1.0, 0.0)],
        ]
    }
}
