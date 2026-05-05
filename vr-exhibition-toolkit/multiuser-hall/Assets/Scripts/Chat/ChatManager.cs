using UnityEngine;
using System;
using System.Collections.Generic;

public class ChatManager : MonoBehaviour
{
    public static ChatManager Instance { get; private set; }

    [Header("聊天设置")]
    public int maxMessages = 100;
    public bool showSystemMessages = true;

    [Header("当前状态")]
    [SerializeField] private List<ChatMessage> messages = new List<ChatMessage>();

    public event Action<ChatMessage> OnMessageReceived;
    public event Action OnMessagesCleared;

    public IReadOnlyList<ChatMessage> Messages => messages;
    public int MessageCount => messages.Count;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void Start()
    {
        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnChatMessageReceived += OnChatMessageReceivedHandler;
        }

        if (UserManager.Instance != null)
        {
            UserManager.Instance.OnRemoteUserJoined += OnRemoteUserJoinedHandler;
            UserManager.Instance.OnRemoteUserLeft += OnRemoteUserLeftHandler;
        }
    }

    private void OnDestroy()
    {
        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnChatMessageReceived -= OnChatMessageReceivedHandler;
        }

        if (UserManager.Instance != null)
        {
            UserManager.Instance.OnRemoteUserJoined -= OnRemoteUserJoinedHandler;
            UserManager.Instance.OnRemoteUserLeft -= OnRemoteUserLeftHandler;
        }
    }

    public void SendMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return;
        if (SocketIOClient.Instance == null) return;
        if (string.IsNullOrEmpty(SocketIOClient.Instance.CurrentSessionId)) return;
        if (UserManager.Instance == null || UserManager.Instance.LocalUser == null) return;

        var chatMessage = new ChatMessage
        {
            id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
            userId = UserManager.Instance.LocalUser.id,
            username = UserManager.Instance.LocalUser.username,
            message = message,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            type = MessageType.Text
        };

        AddMessage(chatMessage);

        SocketIOClient.Instance.SendChatMessage(
            UserManager.Instance.LocalUser.id,
            SocketIOClient.Instance.CurrentSessionId,
            message
        );
    }

    private void OnChatMessageReceivedHandler(Dictionary<string, object> data)
    {
        try
        {
            string userId = GetStringValue(data, "userId");
            string username = GetStringValue(data, "username");
            string message = GetStringValue(data, "message");
            long timestamp = GetLongValue(data, "timestamp");
            string messageId = GetStringValue(data, "id");

            if (userId == UserManager.Instance?.LocalUser?.id) return;

            var chatMessage = new ChatMessage
            {
                id = messageId ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
                userId = userId,
                username = username,
                message = message,
                timestamp = timestamp,
                type = MessageType.Text
            };

            AddMessage(chatMessage);
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理聊天消息失败: {ex.Message}");
        }
    }

    private void OnRemoteUserJoinedHandler(UserData userData)
    {
        if (!showSystemMessages) return;

        var systemMessage = new ChatMessage
        {
            id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
            userId = "system",
            username = "系统",
            message = $"{userData.username} 加入了会话",
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            type = MessageType.System
        };

        AddMessage(systemMessage);
    }

    private void OnRemoteUserLeftHandler(UserData userData)
    {
        if (!showSystemMessages) return;

        var systemMessage = new ChatMessage
        {
            id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
            userId = "system",
            username = "系统",
            message = $"{userData.username} 离开了会话",
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            type = MessageType.System
        };

        AddMessage(systemMessage);
    }

    private void AddMessage(ChatMessage message)
    {
        messages.Add(message);

        while (messages.Count > maxMessages)
        {
            messages.RemoveAt(0);
        }

        OnMessageReceived?.Invoke(message);
    }

    public void ClearMessages()
    {
        messages.Clear();
        OnMessagesCleared?.Invoke();
    }

    public List<ChatMessage> GetMessagesByUser(string userId)
    {
        return messages.FindAll(m => m.userId == userId);
    }

    public List<ChatMessage> GetMessagesSince(long timestamp)
    {
        return messages.FindAll(m => m.timestamp >= timestamp);
    }

    private string GetStringValue(Dictionary<string, object> dict, string key)
    {
        if (dict.TryGetValue(key, out object value))
        {
            return value?.ToString() ?? "";
        }
        return "";
    }

    private long GetLongValue(Dictionary<string, object> dict, string key)
    {
        if (dict.TryGetValue(key, out object value))
        {
            if (value is long longValue)
            {
                return longValue;
            }
            if (value is int intValue)
            {
                return intValue;
            }
            long.TryParse(value.ToString(), out long result);
            return result;
        }
        return 0;
    }
}
