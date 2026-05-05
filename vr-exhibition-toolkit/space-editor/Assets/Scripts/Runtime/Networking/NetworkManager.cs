using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine.Networking;

public class NetworkManager : MonoBehaviour
{
    public static NetworkManager Instance { get; private set; }
    
    [Header("服务器设置")]
    public string serverUrl = "http://localhost:3000";
    public float timeout = 30f;
    public int maxRetries = 3;
    
    [Header("当前状态")]
    [SerializeField] private bool isConnected;
    [SerializeField] private string authToken;
    [SerializeField] private string currentUserId;
    
    public event Action OnConnected;
    public event Action OnDisconnected;
    public event Action<string> OnError;
    
    public bool IsConnected => isConnected;
    public string AuthToken => authToken;
    public string CurrentUserId => currentUserId;
    public bool IsAuthenticated => !string.IsNullOrEmpty(authToken);
    
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
        StartCoroutine(CheckConnection());
    }
    
    private IEnumerator CheckConnection()
    {
        using (UnityWebRequest request = UnityWebRequest.Get($"{serverUrl}/api/health"))
        {
            request.timeout = 5;
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                isConnected = true;
                OnConnected?.Invoke();
                Debug.Log("已连接到服务器");
            }
            else
            {
                isConnected = false;
                Debug.LogWarning($"无法连接到服务器: {request.error}");
            }
        }
    }
    
    public void SetAuthToken(string token)
    {
        authToken = token;
    }
    
    public void SetCurrentUserId(string userId)
    {
        currentUserId = userId;
    }
    
    public void ClearAuth()
    {
        authToken = null;
        currentUserId = null;
    }
    
    public IEnumerator GetRequest(string endpoint, Action<string> onSuccess, Action<string> onError = null)
    {
        string url = $"{serverUrl}{endpoint}";
        int retries = 0;
        
        while (retries < maxRetries)
        {
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = timeout;
                
                if (!string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }
                
                yield return request.SendWebRequest();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    onSuccess?.Invoke(request.downloadHandler.text);
                    yield break;
                }
                else
                {
                    retries++;
                    if (retries >= maxRetries)
                    {
                        string errorMsg = $"GET请求失败 ({url}): {request.error}";
                        Debug.LogError(errorMsg);
                        onError?.Invoke(errorMsg);
                        OnError?.Invoke(errorMsg);
                    }
                    else
                    {
                        Debug.LogWarning($"重试 {retries}/{maxRetries}: {url}");
                        yield return new WaitForSeconds(1f);
                    }
                }
            }
        }
    }
    
    public IEnumerator PostRequest(string endpoint, string jsonData, Action<string> onSuccess, Action<string> onError = null)
    {
        string url = $"{serverUrl}{endpoint}";
        int retries = 0;
        
        while (retries < maxRetries)
        {
            using (UnityWebRequest request = UnityWebRequest.PostWwwForm(url, ""))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.timeout = timeout;
                
                if (!string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }
                
                yield return request.SendWebRequest();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    onSuccess?.Invoke(request.downloadHandler.text);
                    yield break;
                }
                else
                {
                    retries++;
                    if (retries >= maxRetries)
                    {
                        string errorMsg = $"POST请求失败 ({url}): {request.error}";
                        Debug.LogError(errorMsg);
                        onError?.Invoke(errorMsg);
                        OnError?.Invoke(errorMsg);
                    }
                    else
                    {
                        Debug.LogWarning($"重试 {retries}/{maxRetries}: {url}");
                        yield return new WaitForSeconds(1f);
                    }
                }
            }
        }
    }
    
    public IEnumerator PutRequest(string endpoint, string jsonData, Action<string> onSuccess, Action<string> onError = null)
    {
        string url = $"{serverUrl}{endpoint}";
        int retries = 0;
        
        while (retries < maxRetries)
        {
            using (UnityWebRequest request = UnityWebRequest.Put(url, jsonData))
            {
                request.SetRequestHeader("Content-Type", "application/json");
                request.timeout = timeout;
                
                if (!string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }
                
                yield return request.SendWebRequest();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    onSuccess?.Invoke(request.downloadHandler.text);
                    yield break;
                }
                else
                {
                    retries++;
                    if (retries >= maxRetries)
                    {
                        string errorMsg = $"PUT请求失败 ({url}): {request.error}";
                        Debug.LogError(errorMsg);
                        onError?.Invoke(errorMsg);
                        OnError?.Invoke(errorMsg);
                    }
                    else
                    {
                        Debug.LogWarning($"重试 {retries}/{maxRetries}: {url}");
                        yield return new WaitForSeconds(1f);
                    }
                }
            }
        }
    }
    
    public IEnumerator DeleteRequest(string endpoint, Action<string> onSuccess, Action<string> onError = null)
    {
        string url = $"{serverUrl}{endpoint}";
        int retries = 0;
        
        while (retries < maxRetries)
        {
            using (UnityWebRequest request = UnityWebRequest.Delete(url))
            {
                request.timeout = timeout;
                
                if (!string.IsNullOrEmpty(authToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {authToken}");
                }
                
                yield return request.SendWebRequest();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    onSuccess?.Invoke(request.downloadHandler?.text ?? "");
                    yield break;
                }
                else
                {
                    retries++;
                    if (retries >= maxRetries)
                    {
                        string errorMsg = $"DELETE请求失败 ({url}): {request.error}";
                        Debug.LogError(errorMsg);
                        onError?.Invoke(errorMsg);
                        OnError?.Invoke(errorMsg);
                    }
                    else
                    {
                        Debug.LogWarning($"重试 {retries}/{maxRetries}: {url}");
                        yield return new WaitForSeconds(1f);
                    }
                }
            }
        }
    }
    
    public IEnumerator UploadFile(string endpoint, string filePath, Action<string> onSuccess, Action<string> onError = null)
    {
        string url = $"{serverUrl}{endpoint}";
        
        byte[] fileData = System.IO.File.ReadAllBytes(filePath);
        string fileName = System.IO.Path.GetFileName(filePath);
        
        List<IMultipartFormSection> formData = new List<IMultipartFormSection>
        {
            new MultipartFormFileSection("file", fileData, fileName, "application/octet-stream")
        };
        
        using (UnityWebRequest request = UnityWebRequest.Post(url, formData))
        {
            request.timeout = timeout * 3;
            
            if (!string.IsNullOrEmpty(authToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {authToken}");
            }
            
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                onSuccess?.Invoke(request.downloadHandler.text);
            }
            else
            {
                string errorMsg = $"文件上传失败: {request.error}";
                Debug.LogError(errorMsg);
                onError?.Invoke(errorMsg);
                OnError?.Invoke(errorMsg);
            }
        }
    }
    
    public void Reconnect()
    {
        StartCoroutine(CheckConnection());
    }
    
    public T ParseJson<T>(string json)
    {
        try
        {
            return JsonUtility.FromJson<T>(json);
        }
        catch (Exception ex)
        {
            Debug.LogError($"JSON解析失败: {ex.Message}");
            return default(T);
        }
    }
    
    public string ToJson(object obj)
    {
        return JsonUtility.ToJson(obj);
    }
}
