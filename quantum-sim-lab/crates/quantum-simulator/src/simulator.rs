use crate::{StateVector, QuantumCircuit, QuantumGate, GateType};
use num_complex::Complex64;
use rand::Rng;

pub struct CircuitSimulator {
    circuit: QuantumCircuit,
    state: StateVector,
}

impl CircuitSimulator {
    pub fn new(circuit: QuantumCircuit) -> Self {
        let state = StateVector::new(circuit.qubits());
        CircuitSimulator { circuit, state }
    }

    pub fn state(&self) -> &StateVector {
        &self.state
    }

    pub fn circuit(&self) -> &QuantumCircuit {
        &self.circuit
    }

    pub fn run(&mut self) {
        self.state = StateVector::new(self.circuit.qubits());
        for gate in self.circuit.gates() {
            self.apply_gate(gate);
        }
    }

    pub fn run_step_by_step(&mut self) -> Vec<StateVector> {
        let mut states = Vec::new();
        self.state = StateVector::new(self.circuit.qubits());
        states.push(self.state.clone());

        for gate in self.circuit.gates() {
            self.apply_gate(gate);
            states.push(self.state.clone());
        }
        states
    }

    fn apply_gate(&mut self, gate: &QuantumGate) {
        if gate.gate_type() == GateType::Measurement {
            return;
        }

        let matrix = gate.matrix();
        let qubits = gate.qubits();

        match qubits.len() {
            1 => self.apply_single_qubit_gate(&matrix, qubits[0]),
            2 => self.apply_two_qubit_gate(&matrix, qubits[0], qubits[1]),
            3 => self.apply_three_qubit_gate(&matrix, qubits[0], qubits[1], qubits[2]),
            _ => (),
        }
    }

    fn apply_single_qubit_gate(&mut self, matrix: &[Vec<Complex64>], qubit: usize) {
        let n = self.state.qubits();
        let size = 1 << n;
        let mut new_amplitudes = vec![Complex64::new(0.0, 0.0); size];

        for i in 0..size {
            let bit = (i >> qubit) & 1;
            let other = i ^ (1 << qubit);

            if bit == 0 {
                new_amplitudes[i] += matrix[0][0] * self.state.amplitudes()[i];
                new_amplitudes[i] += matrix[0][1] * self.state.amplitudes()[other];
            } else {
                new_amplitudes[i] += matrix[1][0] * self.state.amplitudes()[other];
                new_amplitudes[i] += matrix[1][1] * self.state.amplitudes()[i];
            }
        }

        self.state.amplitudes_mut().copy_from_slice(&new_amplitudes);
    }

    fn apply_two_qubit_gate(&mut self, matrix: &[Vec<Complex64>], qubit1: usize, qubit2: usize) {
        let n = self.state.qubits();
        let size = 1 << n;
        let mut new_amplitudes = vec![Complex64::new(0.0, 0.0); size];

        for i in 0..size {
            let bit1 = (i >> qubit1) & 1;
            let bit2 = (i >> qubit2) & 1;
            let row = (bit1 << 1) | bit2;

            for col in 0..4 {
                let cbit1 = (col >> 1) & 1;
                let cbit2 = col & 1;
                let mut j = i;
                
                if cbit1 != bit1 {
                    j ^= 1 << qubit1;
                }
                if cbit2 != bit2 {
                    j ^= 1 << qubit2;
                }

                new_amplitudes[i] += matrix[row][col] * self.state.amplitudes()[j];
            }
        }

        self.state.amplitudes_mut().copy_from_slice(&new_amplitudes);
    }

    fn apply_three_qubit_gate(&mut self, matrix: &[Vec<Complex64>], qubit1: usize, qubit2: usize, qubit3: usize) {
        let n = self.state.qubits();
        let size = 1 << n;
        let mut new_amplitudes = vec![Complex64::new(0.0, 0.0); size];

        for i in 0..size {
            let bit1 = (i >> qubit1) & 1;
            let bit2 = (i >> qubit2) & 1;
            let bit3 = (i >> qubit3) & 1;
            let row = (bit1 << 2) | (bit2 << 1) | bit3;

            for col in 0..8 {
                let cbit1 = (col >> 2) & 1;
                let cbit2 = (col >> 1) & 1;
                let cbit3 = col & 1;
                let mut j = i;
                
                if cbit1 != bit1 {
                    j ^= 1 << qubit1;
                }
                if cbit2 != bit2 {
                    j ^= 1 << qubit2;
                }
                if cbit3 != bit3 {
                    j ^= 1 << qubit3;
                }

                new_amplitudes[i] += matrix[row][col] * self.state.amplitudes()[j];
            }
        }

        self.state.amplitudes_mut().copy_from_slice(&new_amplitudes);
    }

    pub fn measure_qubit(&mut self, qubit: usize) -> usize {
        let probabilities = self.state.get_probabilities();
        let mut prob0 = 0.0;
        let mut prob1 = 0.0;

        for (i, &prob) in probabilities.iter().enumerate() {
            if (i >> qubit) & 1 == 0 {
                prob0 += prob;
            } else {
                prob1 += prob;
            }
        }

        let mut rng = rand::thread_rng();
        let random: f64 = rng.gen();
        let result = if random < prob0 { 0 } else { 1 };

        self.collapse_qubit(qubit, result);
        result
    }

    fn collapse_qubit(&mut self, qubit: usize, result: usize) {
        let size = 1 << self.state.qubits();
        let mut new_amplitudes = vec![Complex64::new(0.0, 0.0); size];
        let mut total_prob = 0.0;

        for (i, &amp) in self.state.amplitudes().iter().enumerate() {
            if ((i >> qubit) & 1) == result {
                new_amplitudes[i] = amp;
                total_prob += amp.norm_sqr();
            }
        }

        if total_prob > 0.0 {
            let factor = 1.0 / total_prob.sqrt();
            for amp in &mut new_amplitudes {
                *amp *= factor;
            }
        }

        self.state.amplitudes_mut().copy_from_slice(&new_amplitudes);
    }

    pub fn measure_all(&mut self) -> Vec<usize> {
        let mut results = Vec::new();
        for i in 0..self.state.qubits() {
            results.push(self.measure_qubit(i));
        }
        results
    }
}
