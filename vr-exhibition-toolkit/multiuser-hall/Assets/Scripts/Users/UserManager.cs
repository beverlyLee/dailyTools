using UnityEngine;
using System;
using System.Collections.Generic;

public class UserManager : MonoBehaviour
{
    public static UserManager Instance { get; private set; }
    
    [Header("用户设置")]
    public string localUserId;
    public string localUsername = "用户";
    public string localAvatar = "";
    public GameObject userPrefab;
    
    [Header("当前状态")]
    [SerializeField] private UserData localUserData;
    [SerializeField] private List<UserData> remoteUsersData = new List<UserData>();
    
    private Dictionary<string, GameObject> userObjects = new Dictionary<string, GameObject>();
    private Dictionary<string, UserData> usersDictionary = new Dictionary<string, UserData>();
    
    public event Action<UserData> OnLocalUserInitialized;
    public event Action<UserData> OnRemoteUserJoined;
    public event Action<UserData> OnRemoteUserLeft;
    public event Action<string, Vector3> OnUserPositionChanged;
    public event Action<string, Vector3> OnUserRotationChanged;
    
    public UserData LocalUser => localUserData;
    public IReadOnlyList<UserData> RemoteUsers => remoteUsersData;
    public int UserCount => remoteUsersData.Count + 1;
    
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
        InitializeLocalUser();
        
        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnUserJoined += OnRemoteUserJoinedHandler;
            SocketIOClient.Instance.OnUserLeft += OnRemoteUserLeftHandler;
            SocketIOClient.Instance.OnUserPositionUpdated += OnUserPositionUpdatedHandler;
            SocketIOClient.Instance.OnUserRotationUpdated += OnUserRotationUpdatedHandler;
        }
    }
    
    private void OnDestroy()
    {
        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnUserJoined -= OnRemoteUserJoinedHandler;
            SocketIOClient.Instance.OnUserLeft -= OnRemoteUserLeftHandler;
            SocketIOClient.Instance.OnUserPositionUpdated -= OnUserPositionUpdatedHandler;
            SocketIOClient.Instance.OnUserRotationUpdated -= OnUserRotationUpdatedHandler;
        }
    }
    
    private void InitializeLocalUser()
    {
        if (string.IsNullOrEmpty(localUserId))
        {
            localUserId = Guid.NewGuid().ToString();
        }
        
        localUserData = new UserData
        {
            id = localUserId,
            username = localUsername,
            avatar = localAvatar,
            role = "user",
            position = Vector3.zero,
            rotation = Vector3.zero,
            joinedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            lastActive = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            isSpeaking = false,
            isMuted = false,
            laserPointerActive = false
        };
        
        usersDictionary[localUserId] = localUserData;
        
        OnLocalUserInitialized?.Invoke(localUserData);
        Debug.Log($"本地用户初始化: {localUserData.id} - {localUserData.username}");
    }
    
    public void JoinSession(string sessionId)
    {
        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.JoinSession(
                sessionId,
                localUserData.id,
                localUserData.username,
                localUserData.avatar
            );
        }
    }
    
    public void LeaveSession(string sessionId)
    {
        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.LeaveSession(sessionId, localUserData.id);
        }
        
        ClearRemoteUsers();
    }
    
    private void ClearRemoteUsers()
    {
        foreach (var kvp in userObjects)
        {
            if (kvp.Value != null)
            {
                Destroy(kvp.Value);
            }
        }
        
        userObjects.Clear();
        remoteUsersData.Clear();
        
        var keysToRemove = new List<string>();
        foreach (var kvp in usersDictionary)
        {
            if (kvp.Key != localUserId)
            {
                keysToRemove.Add(kvp.Key);
            }
        }
        
        foreach (var key in keysToRemove)
        {
            usersDictionary.Remove(key);
        }
    }
    
    private void OnRemoteUserJoinedHandler(Dictionary<string, object> data)
    {
        try
        {
            string userId = GetStringValue(data, "id");
            
            if (userId == localUserId) return;
            
            var userData = new UserData
            {
                id = userId,
                username = GetStringValue(data, "username"),
                avatar = GetStringValue(data, "avatar"),
                position = GetVector3FromDict(data, "position"),
                rotation = GetVector3FromDict(data, "rotation"),
                joinedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                lastActive = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
            
            usersDictionary[userId] = userData;
            remoteUsersData.Add(userData);
            
            CreateRemoteUserObject(userData);
            
            OnRemoteUserJoined?.Invoke(userData);
            Debug.Log($"远程用户加入: {userData.id} - {userData.username}");
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理远程用户加入失败: {ex.Message}");
        }
    }
    
    private void OnRemoteUserLeftHandler(Dictionary<string, object> data)
    {
        try
        {
            string userId = GetStringValue(data, "id");
            
            if (userId == localUserId) return;
            
            if (usersDictionary.TryGetValue(userId, out UserData userData))
            {
                remoteUsersData.Remove(userData);
                usersDictionary.Remove(userId);
                
                if (userObjects.TryGetValue(userId, out GameObject userObj))
                {
                    Destroy(userObj);
                    userObjects.Remove(userId);
                }
                
                OnRemoteUserLeft?.Invoke(userData);
                Debug.Log($"远程用户离开: {userId} - {userData.username}");
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理远程用户离开失败: {ex.Message}");
        }
    }
    
    private void OnUserPositionUpdatedHandler(Dictionary<string, object> data)
    {
        try
        {
            string userId = GetStringValue(data, "id");
            
            if (userId == localUserId) return;
            
            if (usersDictionary.TryGetValue(userId, out UserData userData))
            {
                Vector3 newPosition = GetVector3FromDict(data, "position");
                userData.position = newPosition;
                userData.lastActive = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                if (userObjects.TryGetValue(userId, out GameObject userObj))
                {
                    StartCoroutine(SmoothMovePosition(userObj, newPosition));
                }
                
                OnUserPositionChanged?.Invoke(userId, newPosition);
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理用户位置更新失败: {ex.Message}");
        }
    }
    
    private void OnUserRotationUpdatedHandler(Dictionary<string, object> data)
    {
        try
        {
            string userId = GetStringValue(data, "id");
            
            if (userId == localUserId) return;
            
            if (usersDictionary.TryGetValue(userId, out UserData userData))
            {
                Vector3 newRotation = GetVector3FromDict(data, "rotation");
                userData.rotation = newRotation;
                userData.lastActive = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                
                if (userObjects.TryGetValue(userId, out GameObject userObj))
                {
                    StartCoroutine(SmoothRotate(userObj, newRotation));
                }
                
                OnUserRotationChanged?.Invoke(userId, newRotation);
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理用户旋转更新失败: {ex.Message}");
        }
    }
    
    private void CreateRemoteUserObject(UserData userData)
    {
        if (userPrefab == null)
        {
            Debug.LogWarning("用户预制体未设置，创建默认用户对象");
            GameObject userObj = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            userObj.name = $"RemoteUser_{userData.username}";
            userObj.transform.position = userData.position;
            userObj.transform.rotation = Quaternion.Euler(userData.rotation);
            
            var userComponent = userObj.AddComponent<RemoteUserComponent>();
            userComponent.Initialize(userData);
            
            userObjects[userData.id] = userObj;
        }
        else
        {
            GameObject userObj = Instantiate(userPrefab, userData.position, Quaternion.Euler(userData.rotation));
            userObj.name = $"RemoteUser_{userData.username}";
            
            var userComponent = userObj.GetComponent<RemoteUserComponent>();
            if (userComponent == null)
            {
                userComponent = userObj.AddComponent<RemoteUserComponent>();
            }
            userComponent.Initialize(userData);
            
            userObjects[userData.id] = userObj;
        }
    }
    
    private System.Collections.IEnumerator SmoothMovePosition(GameObject obj, Vector3 targetPosition)
    {
        float duration = 0.1f;
        Vector3 startPosition = obj.transform.position;
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            if (obj == null) yield break;
            
            elapsed += Time.deltaTime;
            obj.transform.position = Vector3.Lerp(startPosition, targetPosition, elapsed / duration);
            yield return null;
        }
        
        if (obj != null)
        {
            obj.transform.position = targetPosition;
        }
    }
    
    private System.Collections.IEnumerator SmoothRotate(GameObject obj, Vector3 targetEulerAngles)
    {
        float duration = 0.1f;
        Quaternion startRotation = obj.transform.rotation;
        Quaternion targetRotation = Quaternion.Euler(targetEulerAngles);
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            if (obj == null) yield break;
            
            elapsed += Time.deltaTime;
            obj.transform.rotation = Quaternion.Lerp(startRotation, targetRotation, elapsed / duration);
            yield return null;
        }
        
        if (obj != null)
        {
            obj.transform.rotation = targetRotation;
        }
    }
    
    public void UpdateLocalPosition(Vector3 position)
    {
        if (localUserData == null) return;
        
        localUserData.position = position;
        localUserData.lastActive = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        if (SocketIOClient.Instance != null && !string.IsNullOrEmpty(SocketIOClient.Instance.CurrentSessionId))
        {
            SocketIOClient.Instance.UpdatePosition(
                localUserData.id,
                SocketIOClient.Instance.CurrentSessionId,
                position
            );
        }
    }
    
    public void UpdateLocalRotation(Vector3 rotation)
    {
        if (localUserData == null) return;
        
        localUserData.rotation = rotation;
        localUserData.lastActive = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        if (SocketIOClient.Instance != null && !string.IsNullOrEmpty(SocketIOClient.Instance.CurrentSessionId))
        {
            SocketIOClient.Instance.UpdateRotation(
                localUserData.id,
                SocketIOClient.Instance.CurrentSessionId,
                rotation
            );
        }
    }
    
    public UserData GetUserData(string userId)
    {
        usersDictionary.TryGetValue(userId, out UserData userData);
        return userData;
    }
    
    public GameObject GetUserObject(string userId)
    {
        userObjects.TryGetValue(userId, out GameObject userObj);
        return userObj;
    }
    
    private string GetStringValue(Dictionary<string, object> dict, string key)
    {
        if (dict.TryGetValue(key, out object value))
        {
            return value?.ToString() ?? "";
        }
        return "";
    }
    
    private Vector3 GetVector3FromDict(Dictionary<string, object> dict, string key)
    {
        if (dict.TryGetValue(key, out object value) && value is Dictionary<string, object> vecDict)
        {
            float x = 0f, y = 0f, z = 0f;
            
            if (vecDict.TryGetValue("x", out object xVal))
            {
                float.TryParse(xVal.ToString(), out x);
            }
            if (vecDict.TryGetValue("y", out object yVal))
            {
                float.TryParse(yVal.ToString(), out y);
            }
            if (vecDict.TryGetValue("z", out object zVal))
            {
                float.TryParse(zVal.ToString(), out z);
            }
            
            return new Vector3(x, y, z);
        }
        
        return Vector3.zero;
    }
}
