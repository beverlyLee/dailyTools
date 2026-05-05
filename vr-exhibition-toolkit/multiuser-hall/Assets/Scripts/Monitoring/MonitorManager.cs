using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;

public class MonitorManager : MonoBehaviour
{
    public static MonitorManager Instance { get; private set; }

    [Header("监控设置")]
    public float refreshInterval = 5f;
    public string serverUrl = "http://localhost:3000";
    public string authToken;

    [Header("当前状态")]
    [SerializeField] private int totalConnectedUsers;
    [SerializeField] private int activeSessionsCount;
    [SerializeField] private List<SessionStats> sessionStatsList = new List<SessionStats>();

    public event Action<int> OnTotalUsersChanged;
    public event Action<int> OnActiveSessionsChanged;
    public event Action<List<SessionStats>> OnSessionStatsUpdated;
    public event Action<SessionStats> OnSessionStatsReceived;

    public int TotalConnectedUsers => totalConnectedUsers;
    public int ActiveSessionsCount => activeSessionsCount;
    public IReadOnlyList<SessionStats> SessionStatsList => sessionStatsList;

    private Coroutine refreshCoroutine;

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
        if (UserManager.Instance != null)
        {
            UserManager.Instance.OnLocalUserInitialized += OnLocalUserInitializedHandler;
        }
    }

    private void OnDestroy()
    {
        StopAutoRefresh();

        if (UserManager.Instance != null)
        {
            UserManager.Instance.OnLocalUserInitialized -= OnLocalUserInitializedHandler;
        }
    }

    private void OnLocalUserInitializedHandler(UserData userData)
    {
        if (userData.role == "admin" || userData.role == "moderator")
        {
            StartAutoRefresh();
        }
    }

    public void StartAutoRefresh()
    {
        if (refreshCoroutine != null)
        {
            StopCoroutine(refreshCoroutine);
        }
        refreshCoroutine = StartCoroutine(AutoRefreshRoutine());
    }

    public void StopAutoRefresh()
    {
        if (refreshCoroutine != null)
        {
            StopCoroutine(refreshCoroutine);
            refreshCoroutine = null;
        }
    }

    private IEnumerator AutoRefreshRoutine()
    {
        while (true)
        {
            yield return StartCoroutine(FetchAllSessionsStats());
            yield return new WaitForSeconds(refreshInterval);
        }
    }

    public IEnumerator FetchAllSessionsStats()
    {
        string url = $"{serverUrl}/api/sessions";

        using (var request = new UnityEngine.Networking.UnityWebRequest(url, "GET"))
        {
            if (!string.IsNullOrEmpty(authToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {authToken}");
            }

            request.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();

            yield return request.SendWebRequest();

            if (request.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                try
                {
                    string json = request.downloadHandler.text;
                    ParseSessionsResponse(json);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"解析会话统计失败: {ex.Message}");
                }
            }
            else
            {
                Debug.LogWarning($"获取会话统计失败: {request.error}");
            }
        }
    }

    public IEnumerator FetchSessionStats(string sessionId)
    {
        string url = $"{serverUrl}/api/sessions/{sessionId}/stats";

        using (var request = new UnityEngine.Networking.UnityWebRequest(url, "GET"))
        {
            if (!string.IsNullOrEmpty(authToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {authToken}");
            }

            request.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();

            yield return request.SendWebRequest();

            if (request.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                try
                {
                    string json = request.downloadHandler.text;
                    ParseSessionStatsResponse(json, sessionId);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"解析会话统计失败: {ex.Message}");
                }
            }
            else
            {
                Debug.LogWarning($"获取会话统计失败: {request.error}");
            }
        }
    }

    public IEnumerator FetchSessionUsers(string sessionId, Action<List<UserSessionStats>> callback)
    {
        string url = $"{serverUrl}/api/sessions/{sessionId}/users";

        using (var request = new UnityEngine.Networking.UnityWebRequest(url, "GET"))
        {
            if (!string.IsNullOrEmpty(authToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {authToken}");
            }

            request.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();

            yield return request.SendWebRequest();

            if (request.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                try
                {
                    string json = request.downloadHandler.text;
                    var users = ParseUsersResponse(json);
                    callback?.Invoke(users);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"解析用户列表失败: {ex.Message}");
                    callback?.Invoke(null);
                }
            }
            else
            {
                Debug.LogWarning($"获取用户列表失败: {request.error}");
                callback?.Invoke(null);
            }
        }
    }

    private void ParseSessionsResponse(string json)
    {
        try
        {
            var response = JsonUtility.FromJson<SessionsApiResponse>(json);

            if (response.data != null)
            {
                int previousTotal = totalConnectedUsers;
                totalConnectedUsers = response.data.totalConnectedUsers;

                if (previousTotal != totalConnectedUsers)
                {
                    OnTotalUsersChanged?.Invoke(totalConnectedUsers);
                }

                if (response.data.sessions != null)
                {
                    int previousCount = activeSessionsCount;
                    activeSessionsCount = response.data.sessions.Count;

                    sessionStatsList.Clear();

                    foreach (var session in response.data.sessions)
                    {
                        sessionStatsList.Add(session);
                    }

                    OnSessionStatsUpdated?.Invoke(sessionStatsList);

                    if (previousCount != activeSessionsCount)
                    {
                        OnActiveSessionsChanged?.Invoke(activeSessionsCount);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"解析会话响应失败: {ex.Message}");
        }
    }

    private void ParseSessionStatsResponse(string json, string sessionId)
    {
        try
        {
            var response = JsonUtility.FromJson<SessionStatsApiResponse>(json);

            if (response.data != null && response.data.stats != null)
            {
                var stats = response.data.stats;
                stats.sessionId = sessionId;

                int index = sessionStatsList.FindIndex(s => s.sessionId == sessionId);
                if (index >= 0)
                {
                    sessionStatsList[index] = stats;
                }
                else
                {
                    sessionStatsList.Add(stats);
                }

                OnSessionStatsReceived?.Invoke(stats);
                OnSessionStatsUpdated?.Invoke(sessionStatsList);
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"解析会话统计响应失败: {ex.Message}");
        }
    }

    private List<UserSessionStats> ParseUsersResponse(string json)
    {
        try
        {
            var response = JsonUtility.FromJson<UsersApiResponse>(json);

            if (response.data != null && response.data.users != null)
            {
                return response.data.users;
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"解析用户响应失败: {ex.Message}");
        }

        return new List<UserSessionStats>();
    }

    public TimeSpan FormatDuration(long durationMs)
    {
        return TimeSpan.FromMilliseconds(durationMs);
    }

    public string FormatDurationString(long durationMs)
    {
        var duration = TimeSpan.FromMilliseconds(durationMs);

        if (duration.TotalHours >= 1)
        {
            return $"{(int)duration.TotalHours}小时 {duration.Minutes}分钟";
        }
        else if (duration.TotalMinutes >= 1)
        {
            return $"{duration.Minutes}分钟 {duration.Seconds}秒";
        }
        else
        {
            return $"{duration.Seconds}秒";
        }
    }

    public string FormatTimestamp(long timestampMs)
    {
        var dateTime = DateTimeOffset.FromUnixTimeMilliseconds(timestampMs).LocalDateTime;
        return dateTime.ToString("yyyy-MM-dd HH:mm:ss");
    }
}

[Serializable]
public class SessionsApiResponse
{
    public string status;
    public int results;
    public SessionsData data;
}

[Serializable]
public class SessionsData
{
    public int totalConnectedUsers;
    public List<SessionStats> sessions;
}

[Serializable]
public class SessionStatsApiResponse
{
    public string status;
    public SessionStatsData data;
}

[Serializable]
public class SessionStatsData
{
    public SessionStats stats;
}

[Serializable]
public class UsersApiResponse
{
    public string status;
    public int results;
    public UsersData data;
}

[Serializable]
public class UsersData
{
    public List<UserSessionStats> users;
}
