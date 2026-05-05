import { invoke } from '@tauri-apps/api';
import type {
  NetworkInterface, Packet, SnifferStats, ApiResult,
  TcpStream, SessionStats, ExtractedFile, ViewMode,
  HexViewResult,
} from '../types';

function handleResult<T>(result: ApiResult<T>): T {
  if (result.success && result.data !== null) {
    return result.data;
  }
  throw new Error(result.error || 'Unknown error');
}

export const networkInterfaceApi = {
  async getInterfaces(): Promise<NetworkInterface[]> {
    const result = await invoke<ApiResult<NetworkInterface[]>>('get_network_interfaces');
    return handleResult(result);
  },
  
  async selectInterface(interfaceName: string): Promise<void> {
    const result = await invoke<ApiResult<void>>('select_interface', {
      interfaceName,
    });
    return handleResult(result);
  },
};

export const snifferApi = {
  async setBpfFilter(filter: string): Promise<void> {
    const result = await invoke<ApiResult<void>>('set_bpf_filter', { filter });
    return handleResult(result);
  },
  
  async setPromiscuous(enabled: boolean): Promise<void> {
    const result = await invoke<ApiResult<void>>('set_promiscuous', { enabled });
    return handleResult(result);
  },
  
  async start(): Promise<boolean> {
    const result = await invoke<ApiResult<boolean>>('start_sniffer');
    return handleResult(result);
  },
  
  async stop(): Promise<boolean> {
    const result = await invoke<ApiResult<boolean>>('stop_sniffer');
    return handleResult(result);
  },
  
  async isRunning(): Promise<boolean> {
    return invoke<boolean>('is_sniffer_running');
  },
  
  async getStats(): Promise<SnifferStats> {
    return invoke<SnifferStats>('get_sniffer_stats');
  },
  
  async getSelectedInterface(): Promise<string | null> {
    return invoke<string | null>('get_selected_interface');
  },
  
  async getBpfFilter(): Promise<string> {
    return invoke<string>('get_bpf_filter');
  },
  
  async isPromiscuous(): Promise<boolean> {
    return invoke<boolean>('is_promiscuous');
  },
};

export const databaseApi = {
  async init(): Promise<void> {
    const result = await invoke<ApiResult<void>>('init_database');
    return handleResult(result);
  },
  
  async getPackets(limit: number = 100, offset: number = 0): Promise<Packet[]> {
    const result = await invoke<ApiResult<Packet[]>>('get_packets_from_db', {
      limit,
      offset,
    });
    return handleResult(result);
  },
  
  async getPacketCount(): Promise<number> {
    const result = await invoke<ApiResult<number>>('get_packet_count');
    return handleResult(result);
  },
  
  async searchPackets(query: string, limit: number = 100): Promise<Packet[]> {
    const result = await invoke<ApiResult<Packet[]>>('search_packets', {
      query,
      limit,
    });
    return handleResult(result);
  },
  
  async clear(): Promise<number> {
    const result = await invoke<ApiResult<number>>('clear_database');
    return handleResult(result);
  },
};

export const sessionApi = {
  async getAllSessions(): Promise<TcpStream[]> {
    return invoke<TcpStream[]>('get_all_sessions');
  },
  
  async getActiveSessions(): Promise<TcpStream[]> {
    return invoke<TcpStream[]>('get_active_sessions');
  },
  
  async getHttpSessions(): Promise<TcpStream[]> {
    return invoke<TcpStream[]>('get_http_sessions');
  },
  
  async getStats(): Promise<SessionStats> {
    return invoke<SessionStats>('get_session_stats');
  },
  
  async getSession(sessionId: string): Promise<TcpStream> {
    const result = await invoke<ApiResult<TcpStream>>('get_session', {
      sessionId,
    });
    return handleResult(result);
  },
  
  async removeSession(sessionId: string): Promise<boolean> {
    const result = await invoke<ApiResult<boolean>>('remove_session', {
      sessionId,
    });
    return handleResult(result);
  },
  
  async clearAll(): Promise<void> {
    return invoke<void>('clear_all_sessions');
  },
  
  async reassembleStreamData(sessionId: string, isClient: boolean): Promise<number[]> {
    const result = await invoke<ApiResult<number[]>>('reassemble_stream_data', {
      sessionId,
      isClient,
    });
    return handleResult(result);
  },
};

export const fileApi = {
  async getAllExtractedFiles(): Promise<ExtractedFile[]> {
    return invoke<ExtractedFile[]>('get_all_extracted_files');
  },
  
  async getFilesBySession(sessionId: string): Promise<ExtractedFile[]> {
    return invoke<ExtractedFile[]>('get_files_by_session', { sessionId });
  },
  
  async getFilesByType(contentType: string): Promise<ExtractedFile[]> {
    return invoke<ExtractedFile[]>('get_files_by_type', { contentType });
  },
  
  async getExtractedFile(id: string): Promise<ExtractedFile> {
    const result = await invoke<ApiResult<ExtractedFile>>('get_extracted_file', { id });
    return handleResult(result);
  },
  
  async clearAll(): Promise<void> {
    return invoke<void>('clear_extracted_files');
  },
};

export const hexViewerApi = {
  async setViewMode(mode: ViewMode): Promise<void> {
    return invoke<void>('set_hex_view_mode', { mode });
  },
  
  async getViewMode(): Promise<ViewMode> {
    return invoke<ViewMode>('get_hex_view_mode');
  },
  
  async formatHexView(data: number[], offset: number = 0): Promise<HexViewResult[]> {
    return invoke<HexViewResult[]>('format_hex_view', { data, offset });
  },
  
  async formatTextView(data: number[]): Promise<string> {
    return invoke<string>('format_text_view', { data });
  },
  
  async formatHexDump(data: number[], offset: number = 0): Promise<string> {
    return invoke<string>('format_hex_dump', { data, offset });
  },
  
  async searchHex(data: number[], hexPattern: string): Promise<number[]> {
    const result = await invoke<ApiResult<number[]>>('search_hex', {
      data,
      hexPattern,
    });
    return handleResult(result);
  },
  
  async searchText(data: number[], textPattern: string): Promise<number[]> {
    return invoke<number[]>('search_text', { data, textPattern });
  },
};
