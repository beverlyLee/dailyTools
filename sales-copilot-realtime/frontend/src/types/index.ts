export interface Transcript {
  id: string;
  text: string;
  timestamp: number;
  speaker: "customer" | "sales";
}

export interface Recommendation {
  id: string;
  intent: string;
  intentLabel: string;
  trigger: string;
  scripts: string[];
  timestamp: number;
}

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface ConnectionStatus {
  connected: boolean;
  message?: string;
}
