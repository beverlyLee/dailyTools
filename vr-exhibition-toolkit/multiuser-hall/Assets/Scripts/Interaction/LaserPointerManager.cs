using UnityEngine;
using System;
using System.Collections.Generic;

public class LaserPointerManager : MonoBehaviour
{
    public static LaserPointerManager Instance { get; private set; }

    [Header("激光指针设置")]
    public float maxLaserDistance = 100f;
    public float laserWidth = 0.005f;
    public Color laserColor = Color.red;
    public KeyCode toggleKey = KeyCode.LeftShift;
    public LayerMask interactableLayers;

    [Header("预制体")]
    public GameObject laserDotPrefab;
    public GameObject laserLinePrefab;

    [Header("当前状态")]
    [SerializeField] private bool localLaserActive;
    [SerializeField] private string currentTargetId;
    [SerializeField] private Vector3 currentTargetPosition;

    public event Action<LaserPointerData> OnLaserPointerActivated;
    public event Action<LaserPointerData> OnLaserPointerDeactivated;
    public event Action<string, Vector3> OnLaserHit;

    public bool IsLocalLaserActive => localLaserActive;

    private LineRenderer localLaserLine;
    private GameObject localLaserDot;
    private Transform laserOrigin;

    private Dictionary<string, LineRenderer> remoteLaserLines = new Dictionary<string, LineRenderer>();
    private Dictionary<string, GameObject> remoteLaserDots = new Dictionary<string, GameObject>();

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
        InitializeLocalLaser();

        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnLaserPointerUpdated += OnLaserPointerUpdatedHandler;
        }

        if (UserManager.Instance != null)
        {
            UserManager.Instance.OnRemoteUserLeft += OnRemoteUserLeftHandler;
        }
    }

    private void OnDestroy()
    {
        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnLaserPointerUpdated -= OnLaserPointerUpdatedHandler;
        }

        if (UserManager.Instance != null)
        {
            UserManager.Instance.OnRemoteUserLeft -= OnRemoteUserLeftHandler;
        }
    }

    private void Update()
    {
        HandleInput();
        UpdateLocalLaser();
    }

    private void InitializeLocalLaser()
    {
        if (laserLinePrefab != null)
        {
            GameObject lineObj = Instantiate(laserLinePrefab, transform);
            localLaserLine = lineObj.GetComponent<LineRenderer>();

            if (localLaserLine == null)
            {
                localLaserLine = lineObj.AddComponent<LineRenderer>();
            }

            localLaserLine.startWidth = laserWidth;
            localLaserLine.endWidth = laserWidth;
            localLaserLine.startColor = laserColor;
            localLaserLine.endColor = laserColor;
            localLaserLine.positionCount = 2;
            localLaserLine.enabled = false;
        }
        else
        {
            GameObject lineObj = new GameObject("LocalLaserLine");
            lineObj.transform.SetParent(transform);
            localLaserLine = lineObj.AddComponent<LineRenderer>();

            localLaserLine.material = new Material(Shader.Find("Sprites/Default"));
            localLaserLine.startWidth = laserWidth;
            localLaserLine.endWidth = laserWidth;
            localLaserLine.startColor = laserColor;
            localLaserLine.endColor = laserColor;
            localLaserLine.positionCount = 2;
            localLaserLine.enabled = false;
        }

        if (laserDotPrefab != null)
        {
            localLaserDot = Instantiate(laserDotPrefab, transform);
            localLaserDot.SetActive(false);
        }
    }

    private void HandleInput()
    {
        if (Input.GetKeyDown(toggleKey))
        {
            ToggleLocalLaser();
        }
    }

    public void ToggleLocalLaser()
    {
        SetLocalLaserActive(!localLaserActive);
    }

    public void SetLocalLaserActive(bool active)
    {
        if (localLaserActive == active) return;

        localLaserActive = active;

        if (localLaserLine != null)
        {
            localLaserLine.enabled = active;
        }

        if (localLaserDot != null)
        {
            localLaserDot.SetActive(active);
        }

        if (active)
        {
            var data = new LaserPointerData
            {
                userId = UserManager.Instance?.LocalUser?.id ?? "",
                isActive = true,
                position = transform.position,
                direction = transform.forward,
                color = laserColor
            };
            OnLaserPointerActivated?.Invoke(data);
        }
        else
        {
            var data = new LaserPointerData
            {
                userId = UserManager.Instance?.LocalUser?.id ?? "",
                isActive = false
            };
            OnLaserPointerDeactivated?.Invoke(data);
        }

        SendLaserState(active);
    }

    private void UpdateLocalLaser()
    {
        if (!localLaserActive) return;

        Transform origin = laserOrigin ?? Camera.main?.transform ?? transform;
        Vector3 startPos = origin.position;
        Vector3 direction = origin.forward;

        if (Physics.Raycast(startPos, direction, out RaycastHit hit, maxLaserDistance, interactableLayers))
        {
            UpdateLaserVisual(startPos, hit.point);
            currentTargetPosition = hit.point;

            var hotspot = hit.collider.GetComponent<HotspotComponent>();
            if (hotspot != null)
            {
                currentTargetId = hotspot.HotspotId;
                OnLaserHit?.Invoke(currentTargetId, hit.point);
            }
            else
            {
                currentTargetId = null;
            }

            if (localLaserDot != null)
            {
                localLaserDot.transform.position = hit.point;
                localLaserDot.transform.rotation = Quaternion.LookRotation(hit.normal);
            }
        }
        else
        {
            Vector3 endPos = startPos + direction * maxLaserDistance;
            UpdateLaserVisual(startPos, endPos);
            currentTargetPosition = endPos;
            currentTargetId = null;

            if (localLaserDot != null)
            {
                localLaserDot.SetActive(false);
            }
        }
    }

    private void UpdateLaserVisual(Vector3 startPos, Vector3 endPos)
    {
        if (localLaserLine != null)
        {
            localLaserLine.SetPosition(0, startPos);
            localLaserLine.SetPosition(1, endPos);
        }
    }

    private void SendLaserState(bool active)
    {
        if (SocketIOClient.Instance == null) return;
        if (string.IsNullOrEmpty(SocketIOClient.Instance.CurrentSessionId)) return;
        if (UserManager.Instance == null || UserManager.Instance.LocalUser == null) return;

        Transform origin = laserOrigin ?? Camera.main?.transform ?? transform;

        SocketIOClient.Instance.UpdateLaserPointer(
            UserManager.Instance.LocalUser.id,
            SocketIOClient.Instance.CurrentSessionId,
            active,
            origin.position,
            origin.forward
        );
    }

    private void OnLaserPointerUpdatedHandler(Dictionary<string, object> data)
    {
        try
        {
            string userId = GetStringValue(data, "id");
            bool isActive = GetBoolValue(data, "isActive");

            if (userId == UserManager.Instance?.LocalUser?.id) return;

            if (isActive)
            {
                Vector3 position = GetVector3FromDict(data, "position");
                Vector3 direction = GetVector3FromDict(data, "direction");

                UpdateRemoteLaser(userId, true, position, direction);

                var userObj = UserManager.Instance?.GetUserObject(userId);
                if (userObj != null)
                {
                    var remoteUser = userObj.GetComponent<RemoteUserComponent>();
                    if (remoteUser != null)
                    {
                        remoteUser.SetLaserPointerState(true, position, direction);
                    }
                }
            }
            else
            {
                UpdateRemoteLaser(userId, false, Vector3.zero, Vector3.zero);

                var userObj = UserManager.Instance?.GetUserObject(userId);
                if (userObj != null)
                {
                    var remoteUser = userObj.GetComponent<RemoteUserComponent>();
                    if (remoteUser != null)
                    {
                        remoteUser.SetLaserPointerState(false, Vector3.zero, Vector3.zero);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理激光指针更新失败: {ex.Message}");
        }
    }

    private void UpdateRemoteLaser(string userId, bool active, Vector3 position, Vector3 direction)
    {
        if (active)
        {
            if (!remoteLaserLines.ContainsKey(userId))
            {
                CreateRemoteLaser(userId);
            }

            if (remoteLaserLines.TryGetValue(userId, out LineRenderer lineRenderer))
            {
                lineRenderer.enabled = true;
                lineRenderer.SetPosition(0, position);
                lineRenderer.SetPosition(1, position + direction * maxLaserDistance);
            }

            if (remoteLaserDots.TryGetValue(userId, out GameObject dot))
            {
                dot.SetActive(true);
            }
        }
        else
        {
            if (remoteLaserLines.TryGetValue(userId, out LineRenderer lineRenderer))
            {
                lineRenderer.enabled = false;
            }

            if (remoteLaserDots.TryGetValue(userId, out GameObject dot))
            {
                dot.SetActive(false);
            }
        }
    }

    private void CreateRemoteLaser(string userId)
    {
        var userObj = UserManager.Instance?.GetUserObject(userId);
        if (userObj == null) return;

        GameObject lineObj;
        if (laserLinePrefab != null)
        {
            lineObj = Instantiate(laserLinePrefab, userObj.transform);
        }
        else
        {
            lineObj = new GameObject($"RemoteLaser_{userId}");
            lineObj.transform.SetParent(userObj.transform);
        }

        LineRenderer lineRenderer = lineObj.GetComponent<LineRenderer>();
        if (lineRenderer == null)
        {
            lineRenderer = lineObj.AddComponent<LineRenderer>();
        }

        lineRenderer.material = new Material(Shader.Find("Sprites/Default"));
        lineRenderer.startWidth = laserWidth;
        lineRenderer.endWidth = laserWidth;
        lineRenderer.startColor = Color.blue;
        lineRenderer.endColor = Color.blue;
        lineRenderer.positionCount = 2;
        lineRenderer.enabled = false;

        remoteLaserLines[userId] = lineRenderer;

        if (laserDotPrefab != null)
        {
            GameObject dotObj = Instantiate(laserDotPrefab, userObj.transform);
            dotObj.SetActive(false);
            remoteLaserDots[userId] = dotObj;
        }
    }

    private void OnRemoteUserLeftHandler(UserData userData)
    {
        CleanupRemoteLaser(userData.id);
    }

    private void CleanupRemoteLaser(string userId)
    {
        if (remoteLaserLines.TryGetValue(userId, out LineRenderer lineRenderer))
        {
            if (lineRenderer != null)
            {
                Destroy(lineRenderer.gameObject);
            }
            remoteLaserLines.Remove(userId);
        }

        if (remoteLaserDots.TryGetValue(userId, out GameObject dot))
        {
            if (dot != null)
            {
                Destroy(dot);
            }
            remoteLaserDots.Remove(userId);
        }
    }

    public void SetLaserOrigin(Transform origin)
    {
        laserOrigin = origin;
    }

    private string GetStringValue(Dictionary<string, object> dict, string key)
    {
        if (dict.TryGetValue(key, out object value))
        {
            return value?.ToString() ?? "";
        }
        return "";
    }

    private bool GetBoolValue(Dictionary<string, object> dict, string key)
    {
        if (dict.TryGetValue(key, out object value))
        {
            if (value is bool boolValue)
            {
                return boolValue;
            }
            bool.TryParse(value.ToString(), out bool result);
            return result;
        }
        return false;
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
