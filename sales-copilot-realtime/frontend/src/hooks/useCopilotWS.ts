import { useState, useRef, useCallback, useEffect } from "react";
import type { Transcript, Recommendation, WSMessage, ConnectionStatus } from "@/types";
import { generateId } from "@/lib/utils";

interface UseCopilotWSProps {
  onTranscript?: (transcript: Transcript) => void;
  onRecommendation?: (recommendation: Recommendation) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export function useCopilotWS({
  onTranscript,
  onRecommendation,
  onStatusChange,
}: UseCopilotWSProps = {}) {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    message: "未连接",
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateStatus = useCallback(
    (connected: boolean, message?: string) => {
      const newStatus = { connected, message };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    updateStatus(false, "正在连接...");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        updateStatus(true, "已连接");
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error("Failed to parse message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        updateStatus(false, "连接错误");
      };

      ws.onclose = () => {
        updateStatus(false, "已断开");
        scheduleReconnect();
      };
    } catch (err) {
      console.error("Failed to connect:", err);
      updateStatus(false, "连接失败");
      scheduleReconnect();
    }
  }, [updateStatus]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, 3000);
  }, [connect]);

  const handleMessage = useCallback(
    (message: WSMessage) => {
      switch (message.type) {
        case "status":
          updateStatus(true, message.message);
          break;

        case "pong":
          break;

        case "transcript":
          const transcript: Transcript = {
            id: generateId(),
            text: message.text,
            timestamp: message.timestamp,
            speaker: message.speaker,
          };
          onTranscript?.(transcript);
          break;

        case "recommendation":
          const recommendation: Recommendation = {
            id: generateId(),
            intent: message.intent,
            intentLabel: message.intent_label,
            trigger: message.trigger,
            scripts: message.scripts,
            timestamp: message.timestamp,
          };
          onRecommendation?.(recommendation);
          break;
      }
    },
    [updateStatus, onTranscript, onRecommendation]
  );

  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendText = useCallback(
    (text: string) => {
      send(JSON.stringify({ type: "transcript", text }));
    },
    [send]
  );

  const sendAudio = useCallback(
    (audioData: Blob) => {
      audioData.arrayBuffer().then((buffer) => {
        send(buffer);
      });
    },
    [send]
  );

  const reset = useCallback(() => {
    send(JSON.stringify({ type: "reset" }));
  }, [send]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    updateStatus(false, "已断开");
  }, [updateStatus]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    sendText,
    sendAudio,
    reset,
  };
}
