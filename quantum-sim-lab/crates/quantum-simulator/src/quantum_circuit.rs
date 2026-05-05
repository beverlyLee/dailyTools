use crate::{QuantumGate, GateType};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QuantumCircuit {
    qubits: usize,
    gates: Vec<QuantumGate>,
    name: Option<String>,
    description: Option<String>,
}

impl QuantumCircuit {
    pub fn new(qubits: usize) -> Self {
        QuantumCircuit {
            qubits,
            gates: Vec::new(),
            name: None,
            description: None,
        }
    }

    pub fn with_name(qubits: usize, name: String) -> Self {
        QuantumCircuit {
            qubits,
            gates: Vec::new(),
            name: Some(name),
            description: None,
        }
    }

    pub fn qubits(&self) -> usize {
        self.qubits
    }

    pub fn gates(&self) -> &[QuantumGate] {
        &self.gates
    }

    pub fn name(&self) -> Option<&String> {
        self.name.as_ref()
    }

    pub fn set_name(&mut self, name: String) {
        self.name = Some(name);
    }

    pub fn description(&self) -> Option<&String> {
        self.description.as_ref()
    }

    pub fn set_description(&mut self, description: String) {
        self.description = Some(description);
    }

    pub fn add_gate(&mut self, gate: QuantumGate) -> Result<(), String> {
        if !self.is_gate_valid(&gate) {
            return Err(format!("Invalid gate {:?} for {} qubits", gate.gate_type(), self.qubits));
        }
        self.gates.push(gate);
        Ok(())
    }

    pub fn insert_gate(&mut self, index: usize, gate: QuantumGate) -> Result<(), String> {
        if !self.is_gate_valid(&gate) {
            return Err(format!("Invalid gate {:?} for {} qubits", gate.gate_type(), self.qubits));
        }
        if index > self.gates.len() {
            return Err(format!("Index {} out of bounds for circuit with {} gates", index, self.gates.len()));
        }
        self.gates.insert(index, gate);
        Ok(())
    }

    pub fn remove_gate(&mut self, index: usize) -> Result<QuantumGate, String> {
        if index >= self.gates.len() {
            return Err(format!("Index {} out of bounds for circuit with {} gates", index, self.gates.len()));
        }
        Ok(self.gates.remove(index))
    }

    pub fn clear(&mut self) {
        self.gates.clear();
    }

    pub fn is_gate_valid(&self, gate: &QuantumGate) -> bool {
        match gate.gate_type() {
            GateType::H | GateType::X | GateType::Y | GateType::Z | 
            GateType::S | GateType::T | GateType::Measurement => {
                gate.qubits().len() == 1 && gate.qubits()[0] < self.qubits
            }
            GateType::CNOT | GateType::Swap => {
                gate.qubits().len() == 2 && 
                gate.qubits()[0] < self.qubits && 
                gate.qubits()[1] < self.qubits &&
                gate.qubits()[0] != gate.qubits()[1]
            }
            GateType::Toffoli => {
                gate.qubits().len() == 3 && 
                gate.qubits()[0] < self.qubits && 
                gate.qubits()[1] < self.qubits &&
                gate.qubits()[2] < self.qubits &&
                gate.qubits()[0] != gate.qubits()[1] &&
                gate.qubits()[0] != gate.qubits()[2] &&
                gate.qubits()[1] != gate.qubits()[2]
            }
        }
    }

    pub fn validate(&self) -> Vec<String> {
        let mut errors = Vec::new();
        for (i, gate) in self.gates.iter().enumerate() {
            if !self.is_gate_valid(gate) {
                errors.push(format!("Gate {}: {:?} is invalid", i, gate.gate_type()));
            }
        }
        errors
    }

    pub fn to_subcircuit(&self, name: String) -> Self {
        let mut subcircuit = self.clone();
        subcircuit.name = Some(name);
        subcircuit
    }
}

impl Default for QuantumCircuit {
    fn default() -> Self {
        QuantumCircuit::new(1)
    }
}
