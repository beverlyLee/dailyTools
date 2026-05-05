using UnityEngine;
using System;
using System.Collections.Generic;

[Serializable]
public class UserData
{
    public string id;
    public string username;
    public string avatar;
    public string role;
    public Vector3 position;
    public Vector3 rotation;
    public long joinedAt;
    public long lastActive;
    public bool isSpeaking;
    public bool isMuted;
    public bool laserPointerActive;
    public Vector3 laserPointerPosition;
    public Vector3 laserPointerDirection;
}

[Serializable]
public class SessionData
{
    public string sessionId;
    public string sessionName;
    public string exhibitionId;
    public int maxUsers;
    public bool isPrivate;
    public long startTime;
    public List<UserData> users;
}

[Serializable]
public class ChatMessage
{
    public string id;
    public string userId;
    public string username;
    public string message;
    public long timestamp;
    public MessageType type;
}

public enum MessageType
{
    Text,
    System,
    Emote
}

[Serializable]
public class SessionStats
{
    public string sessionId;
    public int userCount;
    public int maxUsers;
    public long startTime;
    public long duration;
    public List<UserSessionStats> users;
}

[Serializable]
public class UserSessionStats
{
    public string id;
    public string username;
    public long joinedAt;
    public long lastActive;
    public long duration;
    public Vector3 position;
    public Vector3 rotation;
}

[Serializable]
public class LaserPointerData
{
    public string userId;
    public bool isActive;
    public Vector3 position;
    public Vector3 direction;
    public Color color;
}

[Serializable]
public class VoiceChatData
{
    public string userId;
    public bool isSpeaking;
    public float volume;
    public byte[] audioData;
}
