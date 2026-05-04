export interface PureStrategyEquilibrium {
  type: string;
  player1_strategy: string;
  player2_strategy: string;
  player1_payoff: number;
  player2_payoff: number;
  row_index: number;
  col_index: number;
}

export interface MixedStrategyEquilibrium {
  type: string;
  player1_distribution: Record<string, number>;
  player2_distribution: Record<string, number>;
  player1_expected_payoff: number;
  player2_expected_payoff: number;
  player1_support: number[];
  player2_support: number[];
}

export interface NashEquilibriumResponse {
  pure_equilibria: PureStrategyEquilibrium[];
  mixed_equilibria: MixedStrategyEquilibrium[];
  has_pure_equilibrium: boolean;
  has_mixed_equilibrium: boolean;
  message: string;
}

export interface GameExample {
  id: number;
  name: string;
  description: string | null;
  player1_strategies: string[];
  player2_strategies: string[];
  payoff_matrix_player1: number[][];
  payoff_matrix_player2: number[][];
  category: string | null;
}

export interface GameExampleListResponse {
  examples: GameExample[];
}

export interface PayoffMatrixData {
  player1_strategies: string[];
  player2_strategies: string[];
  payoff_matrix_player1: number[][];
  payoff_matrix_player2: number[][];
}
