/*
 * 产线 3D 监控 - Unity 集成脚本
 * 
 * 此脚本示例展示如何在 Unity 中集成产线 3D 监控服务，
 * 实现实时 PLC 数据映射到 3D 设备状态，以及设备拆解查看功能。
 */

using UnityEngine;
using WebSocketSharp;
using System;
using System.Collections.Generic;
using Newtonsoft.Json;

public class ProductionLine3DManager : MonoBehaviour
{
    [Header("WebSocket 设置")]
    public string webSocketUrl = "ws://localhost:8765";
    
    [Header("产线设置")]
    public string lineId = "LINE-001";
    
    [Header("设备预制体")]
    public GameObject cncMillPrefab;
    public GameObject cncLathePrefab;
    public GameObject robotPrefab;
    public GameObject inspectionPrefab;
    
    [Header("状态颜色")]
    public Color runningColor = Color.green;
    public Color stoppedColor = Color.gray;
    public Color faultColor = Color.red;
    public Color maintenanceColor = Color.yellow;
    
    private WebSocket webSocket;
    private Dictionary<string, GameObject> deviceObjects = new Dictionary<string, GameObject>();
    private Dictionary<string, GameObject> componentObjects = new Dictionary<string, GameObject>();
    private bool isConnected = false;
    private string selectedDeviceId = "";
    private int currentDisassemblyStep = -1;
    
    void Start()
    {
        ConnectToServer();
    }
    
    void OnDestroy()
    {
        DisconnectFromServer();
    }
    
    void ConnectToServer()
    {
        try
        {
            webSocket = new WebSocket(webSocketUrl);
            
            webSocket.OnOpen += (sender, e) =>
            {
                isConnected = true;
                Debug.Log("WebSocket 连接成功");
                RequestLineScene();
            };
            
            webSocket.OnMessage += (sender, e) =>
            {
                ProcessMessage(e.Data);
            };
            
            webSocket.OnError += (sender, e) =>
            {
                Debug.LogError($"WebSocket 错误: {e.Message}");
            };
            
            webSocket.OnClose += (sender, e) =>
            {
                isConnected = false;
                Debug.Log("WebSocket 连接关闭");
            };
            
            webSocket.Connect();
        }
        catch (Exception ex)
        {
            Debug.LogError($"连接服务器失败: {ex.Message}");
        }
    }
    
    void DisconnectFromServer()
    {
        if (webSocket != null && webSocket.ReadyState == WebSocketState.Open)
        {
            webSocket.Close();
        }
    }
    
    void ProcessMessage(string message)
    {
        try
        {
            var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(message);
            
            if (data.ContainsKey("type"))
            {
                string messageType = data["type"].ToString();
                
                switch (messageType)
                {
                    case "device_status_change":
                        HandleDeviceStatusChange(data);
                        break;
                }
            }
            else if (data.ContainsKey("success"))
            {
                bool success = Convert.ToBoolean(data["success"]);
                
                if (success)
                {
                    if (data.ContainsKey("devices") && data["devices"] is List<object>)
                    {
                        HandleLineSceneData(data);
                    }
                    else if (data.ContainsKey("components"))
                    {
                        HandleDeviceSceneData(data);
                    }
                }
                else
                {
                    Debug.LogError($"服务器返回错误: {data["error"]}");
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理消息失败: {ex.Message}");
        }
    }
    
    void RequestLineScene()
    {
        var request = new Dictionary<string, object>
        {
            { "type", "get_line_scene" },
            { "line_id", lineId }
        };
        
        SendMessage(request);
    }
    
    void HandleLineSceneData(Dictionary<string, object> data)
    {
        var devices = data["devices"] as List<object>;
        
        foreach (var deviceObj in devices)
        {
            var deviceDict = deviceObj as Dictionary<string, object>;
            CreateDeviceObject(deviceDict);
        }
        
        Debug.Log($"成功创建 {devices.Count} 个设备");
    }
    
    void CreateDeviceObject(Dictionary<string, object> deviceData)
    {
        string deviceId = deviceData["device_id"].ToString();
        string deviceName = deviceData["device_name"].ToString();
        string modelPath = deviceData["model_path"].ToString();
        string status = deviceData["status"].ToString();
        
        var positionData = deviceData["position"] as Dictionary<string, object>;
        float x = Convert.ToSingle(positionData["x"]);
        float y = Convert.ToSingle(positionData["y"]);
        float z = Convert.ToSingle(positionData["z"]);
        
        var rotationData = deviceData["rotation"] as Dictionary<string, object>;
        float rx = Convert.ToSingle(rotationData["x"]);
        float ry = Convert.ToSingle(rotationData["y"]);
        float rz = Convert.ToSingle(rotationData["z"]);
        
        GameObject prefab = GetDevicePrefab(modelPath);
        GameObject deviceObj = Instantiate(prefab, new Vector3(x, y, z), Quaternion.Euler(rx, ry, rz));
        deviceObj.name = deviceId;
        
        DeviceStatusController controller = deviceObj.AddComponent<DeviceStatusController>();
        controller.deviceId = deviceId;
        controller.deviceName = deviceName;
        controller.manager = this;
        
        UpdateDeviceStatus(deviceId, status);
        
        deviceObjects[deviceId] = deviceObj;
    }
    
    GameObject GetDevicePrefab(string modelPath)
    {
        if (modelPath.Contains("cnc_mill") && cncMillPrefab != null)
            return cncMillPrefab;
        if (modelPath.Contains("cnc_lathe") && cncLathePrefab != null)
            return cncLathePrefab;
        if (modelPath.Contains("robot") && robotPrefab != null)
            return robotPrefab;
        if (modelPath.Contains("inspection") && inspectionPrefab != null)
            return inspectionPrefab;
        
        GameObject defaultPrefab = GameObject.CreatePrimitive(PrimitiveType.Cube);
        Destroy(defaultPrefab);
        return GameObject.CreatePrimitive(PrimitiveType.Cube);
    }
    
    void HandleDeviceStatusChange(Dictionary<string, object> data)
    {
        string deviceId = data["device_id"].ToString();
        string newStatus = data["new_status"].ToString();
        string oldStatus = data["old_status"].ToString();
        
        Debug.Log($"设备 {deviceId} 状态变化: {oldStatus} -> {newStatus}");
        
        UpdateDeviceStatus(deviceId, newStatus);
    }
    
    public void UpdateDeviceStatus(string deviceId, string status)
    {
        if (deviceObjects.TryGetValue(deviceId, out GameObject deviceObj))
        {
            Color statusColor = GetStatusColor(status);
            
            Renderer renderer = deviceObj.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.material.color = statusColor;
            }
            
            Light statusLight = deviceObj.GetComponentInChildren<Light>();
            if (statusLight != null)
            {
                statusLight.color = statusColor;
                statusLight.enabled = status != "stopped";
            }
            
            Animator animator = deviceObj.GetComponent<Animator>();
            if (animator != null)
            {
                animator.SetBool("IsRunning", status == "running");
                animator.SetBool("IsFault", status == "fault");
            }
        }
    }
    
    Color GetStatusColor(string status)
    {
        switch (status.ToLower())
        {
            case "running":
                return runningColor;
            case "stopped":
                return stoppedColor;
            case "fault":
                return faultColor;
            case "maintenance":
                return maintenanceColor;
            default:
                return stoppedColor;
        }
    }
    
    public void SelectDevice(string deviceId)
    {
        selectedDeviceId = deviceId;
        currentDisassemblyStep = -1;
        
        var request = new Dictionary<string, object>
        {
            { "type", "get_device_scene" },
            { "line_id", lineId },
            { "device_id", deviceId }
        };
        
        SendMessage(request);
    }
    
    void HandleDeviceSceneData(Dictionary<string, object> data)
    {
        var components = data["components"] as List<object>;
        var disassemblySteps = data["disassembly_steps"] as List<object>;
        
        Debug.Log($"设备 {selectedDeviceId} 有 {components.Count} 个组件, {disassemblySteps.Count} 个拆解步骤");
        
        foreach (var componentObj in components)
        {
            var componentDict = componentObj as Dictionary<string, object>;
            string componentId = componentDict["component_id"].ToString();
            
            if (deviceObjects.TryGetValue(selectedDeviceId, out GameObject deviceObj))
            {
                Transform componentTransform = deviceObj.transform.Find(componentId);
                if (componentTransform != null)
                {
                    ComponentController controller = componentTransform.gameObject.AddComponent<ComponentController>();
                    controller.componentId = componentId;
                    controller.componentName = componentDict["component_name"].ToString();
                    controller.canDisassemble = Convert.ToBoolean(componentDict["can_disassemble"]);
                    controller.disassembleOrder = Convert.ToInt32(componentDict["disassemble_order"]);
                    
                    string status = componentDict["status"].ToString();
                    controller.UpdateStatus(status);
                }
            }
        }
    }
    
    public void NextDisassemblyStep()
    {
        if (string.IsNullOrEmpty(selectedDeviceId))
        {
            Debug.LogWarning("请先选择设备");
            return;
        }
        
        var request = new Dictionary<string, object>
        {
            { "type", "disassembly_next_step" },
            { "line_id", lineId },
            { "device_id", selectedDeviceId }
        };
        
        SendMessage(request);
    }
    
    public void PreviousDisassemblyStep()
    {
        if (string.IsNullOrEmpty(selectedDeviceId))
        {
            Debug.LogWarning("请先选择设备");
            return;
        }
        
        var request = new Dictionary<string, object>
        {
            { "type", "disassembly_previous_step" },
            { "line_id", lineId },
            { "device_id", selectedDeviceId }
        };
        
        SendMessage(request);
    }
    
    public void ResetDisassembly()
    {
        if (string.IsNullOrEmpty(selectedDeviceId))
        {
            Debug.LogWarning("请先选择设备");
            return;
        }
        
        currentDisassemblyStep = -1;
        
        var request = new Dictionary<string, object>
        {
            { "type", "disassembly_reset" },
            { "line_id", lineId },
            { "device_id", selectedDeviceId }
        };
        
        SendMessage(request);
    }
    
    public void UpdatePLCData(string deviceId, string tagName, string tagValue)
    {
        var request = new Dictionary<string, object>
        {
            { "type", "update_plc_data" },
            { "line_id", lineId },
            { "device_id", deviceId },
            { "tag_name", tagName },
            { "tag_value", tagValue },
            { "timestamp", DateTime.UtcNow.ToString("o") }
        };
        
        SendMessage(request);
    }
    
    void SendMessage(Dictionary<string, object> message)
    {
        if (webSocket != null && webSocket.ReadyState == WebSocketState.Open)
        {
            string json = JsonConvert.SerializeObject(message);
            webSocket.Send(json);
        }
        else
        {
            Debug.LogWarning("WebSocket 未连接");
        }
    }
}

public class DeviceStatusController : MonoBehaviour
{
    public string deviceId;
    public string deviceName;
    public ProductionLine3DManager manager;
    
    public string currentStatus = "stopped";
    
    void OnMouseDown()
    {
        if (manager != null)
        {
            manager.SelectDevice(deviceId);
            Debug.Log($"选中设备: {deviceName} ({deviceId})");
        }
    }
}

public class ComponentController : MonoBehaviour
{
    public string componentId;
    public string componentName;
    public bool canDisassemble;
    public int disassembleOrder;
    
    private Color originalColor;
    private Vector3 originalPosition;
    private Quaternion originalRotation;
    
    void Start()
    {
        Renderer renderer = GetComponent<Renderer>();
        if (renderer != null)
        {
            originalColor = renderer.material.color;
        }
        
        originalPosition = transform.localPosition;
        originalRotation = transform.localRotation;
    }
    
    public void UpdateStatus(string status)
    {
        Renderer renderer = GetComponent<Renderer>();
        if (renderer == null) return;
        
        switch (status.ToLower())
        {
            case "normal":
                renderer.material.color = originalColor;
                break;
            case "warning":
                renderer.material.color = Color.yellow;
                break;
            case "fault":
                renderer.material.color = Color.red;
                break;
        }
    }
    
    public void Disassemble(Vector3 targetPosition, Quaternion targetRotation, float duration)
    {
        if (!canDisassemble) return;
        
        StartCoroutine(AnimateDisassembly(targetPosition, targetRotation, duration));
    }
    
    System.Collections.IEnumerator AnimateDisassembly(Vector3 targetPosition, Quaternion targetRotation, float duration)
    {
        float elapsed = 0f;
        Vector3 startPos = transform.localPosition;
        Quaternion startRot = transform.localRotation;
        
        while (elapsed < duration)
        {
            float t = elapsed / duration;
            transform.localPosition = Vector3.Lerp(startPos, targetPosition, t);
            transform.localRotation = Quaternion.Lerp(startRot, targetRotation, t);
            
            elapsed += Time.deltaTime;
            yield return null;
        }
        
        transform.localPosition = targetPosition;
        transform.localRotation = targetRotation;
    }
    
    public void ResetPosition()
    {
        transform.localPosition = originalPosition;
        transform.localRotation = originalRotation;
    }
}
