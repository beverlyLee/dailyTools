use num_complex::Complex64;
use serde::{Deserialize, Serialize};
use std::f64::consts::SQRT_2;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StateVector {
    qubits: usize,
    amplitudes: Vec<Complex64>,
}

impl StateVector {
    pub fn new(qubits: usize) -> Self {
        let size = 1 << qubits;
        let mut amplitudes = vec![Complex64::new(0.0, 0.0); size];
        amplitudes[0] = Complex64::new(1.0, 0.0);
        StateVector { qubits, amplitudes }
    }

    pub fn qubits(&self) -> usize {
        self.qubits
    }

    pub fn amplitudes(&self) -> &[Complex64] {
        &self.amplitudes
    }

    pub fn amplitudes_mut(&mut self) -> &mut [Complex64] {
        &mut self.amplitudes
    }

    pub fn get_probability(&self, index: usize) -> f64 {
        self.amplitudes[index].norm_sqr()
    }

    pub fn get_probabilities(&self) -> Vec<f64> {
        self.amplitudes.iter().map(|a| a.norm_sqr()).collect()
    }

    pub fn normalize(&mut self) {
        let norm: f64 = self.amplitudes.iter().map(|a| a.norm_sqr()).sum();
        if norm > 0.0 {
            let factor = 1.0 / norm.sqrt();
            for amp in &mut self.amplitudes {
                *amp *= factor;
            }
        }
    }

    pub fn get_single_qubit_state(&self, qubit: usize) -> (Complex64, Complex64) {
        let mut alpha = Complex64::new(0.0, 0.0);
        let mut beta = Complex64::new(0.0, 0.0);

        for (i, amp) in self.amplitudes.iter().enumerate() {
            if (i >> qubit) & 1 == 0 {
                alpha += amp * amp.conj();
            } else {
                beta += amp * amp.conj();
            }
        }

        let total = alpha.re + beta.re;
        if total > 0.0 {
            alpha = Complex64::new(alpha.re.sqrt(), 0.0);
            beta = Complex64::new(beta.re.sqrt(), 0.0);
        }

        (alpha, beta)
    }

    pub fn to_bloch_sphere(&self, qubit: usize) -> (f64, f64, f64) {
        let (alpha, beta) = self.get_single_qubit_state(qubit);
        
        let theta = 2.0 * alpha.re.acos();
        let phi = beta.arg();
        
        let x = theta.sin() * phi.cos();
        let y = theta.sin() * phi.sin();
        let z = theta.cos();
        
        (x, y, z)
    }
}

impl Default for StateVector {
    fn default() -> Self {
        StateVector::new(1)
    }
}
