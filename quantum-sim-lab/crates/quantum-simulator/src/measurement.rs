use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MeasurementResult {
    qubit_index: usize,
    result: usize,
    timestamp: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProbabilityDistribution {
    probabilities: HashMap<String, f64>,
    total_shots: usize,
}

impl MeasurementResult {
    pub fn new(qubit_index: usize, result: usize) -> Self {
        MeasurementResult {
            qubit_index,
            result,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        }
    }

    pub fn qubit_index(&self) -> usize {
        self.qubit_index
    }

    pub fn result(&self) -> usize {
        self.result
    }

    pub fn timestamp(&self) -> u64 {
        self.timestamp
    }
}

impl ProbabilityDistribution {
    pub fn new() -> Self {
        ProbabilityDistribution {
            probabilities: HashMap::new(),
            total_shots: 0,
        }
    }

    pub fn from_probabilities(probabilities: Vec<f64>, qubits: usize) -> Self {
        let mut dist = ProbabilityDistribution::new();
        for (i, &prob) in probabilities.iter().enumerate() {
            let label = Self::index_to_binary(i, qubits);
            dist.probabilities.insert(label, prob);
        }
        dist.total_shots = probabilities.len();
        dist
    }

    pub fn from_measurements(measurements: &[Vec<usize>]) -> Self {
        let mut dist = ProbabilityDistribution::new();
        let mut counts: HashMap<String, usize> = HashMap::new();

        for measurement in measurements {
            let label: String = measurement.iter().map(|&b| if b == 0 { '0' } else { '1' }).collect();
            *counts.entry(label).or_insert(0) += 1;
        }

        let total = measurements.len();
        dist.total_shots = total;

        for (label, count) in counts {
            dist.probabilities.insert(label, count as f64 / total as f64);
        }

        dist
    }

    pub fn probabilities(&self) -> &HashMap<String, f64> {
        &self.probabilities
    }

    pub fn total_shots(&self) -> usize {
        self.total_shots
    }

    pub fn get_probability(&self, state: &str) -> f64 {
        self.probabilities.get(state).copied().unwrap_or(0.0)
    }

    pub fn most_probable(&self) -> Option<(String, f64)> {
        self.probabilities
            .iter()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(k, v)| (k.clone(), *v))
    }

    pub fn least_probable(&self) -> Option<(String, f64)> {
        self.probabilities
            .iter()
            .min_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(k, v)| (k.clone(), *v))
    }

    pub fn entropy(&self) -> f64 {
        let mut entropy = 0.0;
        for &prob in self.probabilities.values() {
            if prob > 0.0 {
                entropy -= prob * prob.log2();
            }
        }
        entropy
    }

    fn index_to_binary(index: usize, qubits: usize) -> String {
        (0..qubits)
            .rev()
            .map(|i| if (index >> i) & 1 == 1 { '1' } else { '0' })
            .collect()
    }
}

impl Default for ProbabilityDistribution {
    fn default() -> Self {
        ProbabilityDistribution::new()
    }
}
