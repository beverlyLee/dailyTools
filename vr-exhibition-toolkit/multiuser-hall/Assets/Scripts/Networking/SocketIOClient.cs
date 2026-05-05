using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;

public class SocketIOClient : MonoBehaviour
{
    public static SocketIOClient Instance { get; private set; }
    
    [Header("服务器设置")]
    public string serverUrl = "http://localhost:3000";
    public float reconnectInterval = 3f;
    public int maxReconnectAttempts = 5;
    
    [Header("当前状态")]
    [SerializeField] private bool isConnected;
    [SerializeField] private int reconnectAttempts;
    [SerializeField] private string currentSessionId;
    
    public event Action OnConnected;
    public event Action OnDisconnected;
    public event Action<int> OnReconnectAttempt;
    public event Action<string> OnError;
    
    public event Action<Dictionary<string, object>> OnSessionJoined;
    public event Action<Dictionary<string, object>> OnUserJoined;
    public event Action<Dictionary<string, object>> OnUserLeft;
    public event Action<Dictionary<string, object>> OnUserPositionUpdated;
    public event Action<Dictionary<string, object>> OnUserRotationUpdated;
    public event Action<Dictionary<string, object>> OnLaserPointerUpdated;
    public event Action<Dictionary<string, object>> OnVoiceChatData;
    public event Action<Dictionary<string, object>> OnChatMessageReceived;
    public event Action<Dictionary<string, object>> OnHotspotInteraction;
    
    public bool IsConnected => isConnected;
    public string CurrentSessionId => currentSessionId;
    
    private WebSocketSharp.WebSocket ws;
    private Coroutine reconnectCoroutine;
    
    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
    
    private void Start()
    {
        Connect();
    }
    
    private void OnDestroy()
    {
        Disconnect();
    }
    
    public void Connect()
    {
        if (ws != null && ws.IsAlive)
        {
            Debug.Log("Socket.IO 已经连接");
            return;
        }
        
        try
        {
            string wsUrl = serverUrl.Replace("http://", "ws://").Replace("https://", "wss://");
            wsUrl += "/socket.io/?EIO=4&transport=websocket";
            
            ws = new WebSocketSharp.WebSocket(wsUrl);
            
            ws.OnOpen += OnWebSocketOpen;
            ws.OnMessage += OnWebSocketMessage;
            ws.OnError += OnWebSocketError;
            ws.OnClose += OnWebSocketClose;
            
            ws.Connect();
        }
        catch (Exception ex)
        {
            Debug.LogError($"Socket.IO 连接失败: {ex.Message}");
            OnError?.Invoke(ex.Message);
            StartReconnect();
        }
    }
    
    public void Disconnect()
    {
        if (ws != null)
        {
            if (ws.IsAlive)
            {
                ws.Close();
            }
            ws = null;
        }
        
        if (reconnectCoroutine != null)
        {
            StopCoroutine(reconnectCoroutine);
            reconnectCoroutine = null;
        }
        
        isConnected = false;
        OnDisconnected?.Invoke();
    }
    
    private void OnWebSocketOpen(object sender, EventArgs e)
    {
        Debug.Log("WebSocket 连接已打开");
    }
    
    private void OnWebSocketMessage(object sender, WebSocketSharp.MessageEventArgs e)
    {
        if (e.IsText)
        {
            ParseSocketIOMessage(e.Data);
        }
    }
    
    private void OnWebSocketError(object sender, WebSocketSharp.ErrorEventArgs e)
    {
        Debug.LogError($"WebSocket 错误: {e.Message}");
        OnError?.Invoke(e.Message);
    }
    
    private void OnWebSocketClose(object sender, WebSocketSharp.CloseEventArgs e)
    {
        Debug.Log($"WebSocket 连接已关闭: {e.Reason}");
        isConnected = false;
        OnDisconnected?.Invoke();
        StartReconnect();
    }
    
    private void ParseSocketIOMessage(string message)
    {
        if (string.IsNullOrEmpty(message)) return;
        
        int packetType = int.Parse(message[0].ToString());
        
        switch (packetType)
        {
            case 0:
                HandleOpenPacket();
                break;
            case 40:
                HandleConnectPacket();
                break;
            case 42:
                HandleEventPacket(message.Substring(2));
                break;
            case 3:
                HandlePongPacket();
                break;
        }
    }
    
    private void HandleOpenPacket()
    {
        Debug.Log("Socket.IO 握手成功");
        StartCoroutine(SendHeartbeat());
    }
    
    private void HandleConnectPacket()
    {
        isConnected = true;
        reconnectAttempts = 0;
        OnConnected?.Invoke();
        Debug.Log("Socket.IO 已连接到服务器");
    }
    
    private void HandleEventPacket(string message)
    {
        try
        {
            int startIndex = message.IndexOf('[');
            int endIndex = message.LastIndexOf(']');
            
            if (startIndex >= 0 && endIndex > startIndex)
            {
                string jsonArray = message.Substring(startIndex, endIndex - startIndex + 1);
                List<object> array = JsonUtility.FromJson<ListWrapper<object>>("{\"items\":" + jsonArray + "}")?.items;
                
                if (array != null && array.Count >= 1)
                {
                    string eventName = array[0].ToString();
                    Dictionary<string, object> data = null;
                    
                    if (array.Count >= 2)
                    {
                        data = ParseDictionary(array[1].ToString());
                    }
                    
                    DispatchEvent(eventName, data);
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"解析 Socket.IO 事件失败: {ex.Message}");
        }
    }
    
    private void HandlePongPacket()
    {
    }
    
    private void DispatchEvent(string eventName, Dictionary<string, object> data)
    {
        switch (eventName)
        {
            case "session_joined":
                OnSessionJoined?.Invoke(data);
                break;
            case "user_joined":
                OnUserJoined?.Invoke(data);
                break;
            case "user_left":
                OnUserLeft?.Invoke(data);
                break;
            case "user_position_updated":
                OnUserPositionUpdated?.Invoke(data);
                break;
            case "user_rotation_updated":
                OnUserRotationUpdated?.Invoke(data);
                break;
            case "laser_pointer_updated":
                OnLaserPointerUpdated?.Invoke(data);
                break;
            case "voice_chat_data":
                OnVoiceChatData?.Invoke(data);
                break;
            case "chat_message_received":
                OnChatMessageReceived?.Invoke(data);
                break;
            case "hotspot_interaction":
                OnHotspotInteraction?.Invoke(data);
                break;
        }
    }
    
    public void Emit(string eventName, object data = null)
    {
        if (ws == null || !ws.IsAlive)
        {
            Debug.LogWarning("Socket.IO 未连接，无法发送事件");
            return;
        }
        
        try
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("42[");
            sb.Append($"\"{eventName}\"");
            
            if (data != null)
            {
                sb.Append(",");
                sb.Append(JsonUtility.ToJson(data));
            }
            
            sb.Append("]");
            
            ws.Send(sb.ToString());
        }
        catch (Exception ex)
        {
            Debug.LogError($"发送 Socket.IO 事件失败: {ex.Message}");
        }
    }
    
    public void JoinSession(string sessionId, string userId, string username, string avatar = "")
    {
        var joinData = new
        {
            sessionId,
            userId,
            username,
            avatar
        };
        
        Emit("join_session", joinData);
        currentSessionId = sessionId;
    }
    
    public void LeaveSession(string sessionId, string userId)
    {
        var leaveData = new
        {
            sessionId,
            userId
        };
        
        Emit("leave_session", leaveData);
        currentSessionId = null;
    }
    
    public void UpdatePosition(string userId, string sessionId, Vector3 position)
    {
        var positionData = new
        {
            userId,
            sessionId,
            position = new { x = position.x, y = position.y, z = position.z }
        };
        
        Emit("update_position", positionData);
    }
    
    public void UpdateRotation(string userId, string sessionId, Vector3 rotation)
    {
        var rotationData = new
        {
            userId,
            sessionId,
            rotation = new { x = rotation.x, y = rotation.y, z = rotation.z }
        };
        
        Emit("update_rotation", rotationData);
    }
    
    public void UpdateLaserPointer(string userId, string sessionId, bool isActive, Vector3 position, Vector3 direction)
    {
        var laserData = new
        {
            userId,
            sessionId,
            isActive,
            position = new { x = position.x, y = position.y, z = position.z },
            direction = new { x = direction.x, y = direction.y, z = direction.z }
        };
        
        Emit("laser_pointer", laserData);
    }
    
    public void SendVoiceChat(string userId, string sessionId, byte[] audioData, bool isSpeaking)
    {
        var voiceData = new
        {
            userId,
            sessionId,
            audioData = Convert.ToBase64String(audioData),
            isSpeaking
        };
        
        Emit("voice_chat", voiceData);
    }
    
    public void SendChatMessage(string userId, string sessionId, string message)
    {
        var chatData = new
        {
            userId,
            sessionId,
            message,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        
        Emit("chat_message", chatData);
    }
    
    public void InteractHotspot(string userId, string sessionId, string hotspotId, string action)
    {
        var hotspotData = new
        {
            userId,
            sessionId,
            hotspotId,
            action
        };
        
        Emit("interact_hotspot", hotspotData);
    }
    
    private void StartReconnect()
    {
        if (reconnectCoroutine != null)
        {
            StopCoroutine(reconnectCoroutine);
        }
        reconnectCoroutine = StartCoroutine(ReconnectRoutine());
    }
    
    private IEnumerator ReconnectRoutine()
    {
        while (reconnectAttempts < maxReconnectAttempts)
        {
            reconnectAttempts++;
            OnReconnectAttempt?.Invoke(reconnectAttempts);
            Debug.Log($"尝试重新连接 ({reconnectAttempts}/{maxReconnectAttempts})...");
            
            yield return new WaitForSeconds(reconnectInterval);
            
            if (!isConnected)
            {
                Connect();
            }
            
            if (isConnected)
            {
                yield break;
            }
        }
        
        Debug.LogError("达到最大重连次数，停止重连");
    }
    
    private IEnumerator SendHeartbeat()
    {
        while (ws != null && ws.IsAlive)
        {
            yield return new WaitForSeconds(25f);
            if (ws != null && ws.IsAlive)
            {
                ws.Send("2");
            }
        }
    }
    
    private Dictionary<string, object> ParseDictionary(string json)
    {
        try
        {
            var dict = new Dictionary<string, object>();
            json = json.Trim();
            
            if (json.StartsWith("{") && json.EndsWith("}"))
            {
                json = json.Substring(1, json.Length - 2);
                
                int depth = 0;
                int startIndex = 0;
                bool inString = false;
                char stringChar = '\0';
                
                for (int i = 0; i < json.Length; i++)
                {
                    char c = json[i];
                    
                    if (inString)
                    {
                        if (c == stringChar && (i == 0 || json[i - 1] != '\\'))
                        {
                            inString = false;
                        }
                        continue;
                    }
                    
                    switch (c)
                    {
                        case '{':
                        case '[':
                            depth++;
                            break;
                        case '}':
                        case ']':
                            depth--;
                            break;
                        case '"':
                        case '\'':
                            inString = true;
                            stringChar = c;
                            break;
                        case ',':
                            if (depth == 0)
                            {
                                ParseKeyValuePair(json.Substring(startIndex, i - startIndex), dict);
                                startIndex = i + 1;
                            }
                            break;
                    }
                }
                
                if (startIndex < json.Length)
                {
                    ParseKeyValuePair(json.Substring(startIndex), dict);
                }
            }
            
            return dict;
        }
        catch
        {
            return new Dictionary<string, object>();
        }
    }
    
    private void ParseKeyValuePair(string pair, Dictionary<string, object> dict)
    {
        int colonIndex = pair.IndexOf(':');
        if (colonIndex > 0)
        {
            string key = pair.Substring(0, colonIndex).Trim().Trim('"', '\'');
            string value = pair.Substring(colonIndex + 1).Trim();
            
            if (value.StartsWith("{") || value.StartsWith("["))
            {
                dict[key] = ParseDictionary(value);
            }
            else if (value.StartsWith("\"") || value.StartsWith("'"))
            {
                dict[key] = value.Trim().Trim('"', '\'');
            }
            else if (value == "true")
            {
                dict[key] = true;
            }
            else if (value == "false")
            {
                dict[key] = false;
            }
            else if (value == "null")
            {
                dict[key] = null;
            }
            else if (int.TryParse(value, out int intValue))
            {
                dict[key] = intValue;
            }
            else if (float.TryParse(value, out float floatValue))
            {
                dict[key] = floatValue;
            }
            else
            {
                dict[key] = value;
            }
        }
    }
    
    [Serializable]
    private class ListWrapper<T>
    {
        public List<T> items;
    }
}
