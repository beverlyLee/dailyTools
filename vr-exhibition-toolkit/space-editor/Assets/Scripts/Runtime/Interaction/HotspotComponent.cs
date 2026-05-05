using UnityEngine;
using System;

public class HotspotComponent : MonoBehaviour
{
    public string HotspotId { get; private set; }
    public HotspotType HotspotType { get; private set; }
    public float TriggerRadius { get; private set; }
    public HotspotContent Content { get; private set; }
    
    public event Action<HotspotComponent> OnTriggered;
    public event Action<HotspotComponent> OnSelected;
    public event Action<HotspotComponent> OnDeselected;
    
    [SerializeField] private bool isSelected;
    [SerializeField] private Renderer mainRenderer;
    [SerializeField] private Collider triggerCollider;
    
    private Material originalMaterial;
    private Material selectedMaterial;
    private Material hoverMaterial;
    
    public void Initialize(HotspotData hotspotData)
    {
        HotspotId = hotspotData.id;
        HotspotType = hotspotData.type;
        TriggerRadius = hotspotData.triggerRadius;
        Content = hotspotData.content;
        
        if (triggerCollider == null)
        {
            triggerCollider = GetComponent<Collider>();
        }
        
        if (triggerCollider != null)
        {
            triggerCollider.isTrigger = true;
        }
        
        if (mainRenderer == null)
        {
            mainRenderer = GetComponent<Renderer>();
        }
        
        if (mainRenderer != null)
        {
            originalMaterial = mainRenderer.material;
        }
        
        UpdateVisibility(hotspotData.isVisible);
    }
    
    public void UpdateFromData(HotspotData hotspotData)
    {
        HotspotType = hotspotData.type;
        TriggerRadius = hotspotData.triggerRadius;
        Content = hotspotData.content;
        
        transform.position = hotspotData.position;
        transform.rotation = Quaternion.Euler(hotspotData.rotation);
        
        UpdateVisibility(hotspotData.isVisible);
        
        if (triggerCollider != null && triggerCollider is SphereCollider sphereCollider)
        {
            sphereCollider.radius = TriggerRadius;
        }
    }
    
    public void Select()
    {
        if (isSelected) return;
        
        isSelected = true;
        ApplySelectedVisual();
        OnSelected?.Invoke(this);
    }
    
    public void Deselect()
    {
        if (!isSelected) return;
        
        isSelected = false;
        ApplyOriginalVisual();
        OnDeselected?.Invoke(this);
    }
    
    public void Trigger()
    {
        OnTriggered?.Invoke(this);
        ExecuteHotspotAction();
    }
    
    private void ExecuteHotspotAction()
    {
        switch (HotspotType)
        {
            case HotspotType.Info:
                Debug.Log($"显示信息热点: {Content.title} - {Content.description}");
                break;
            case HotspotType.Teleport:
                Debug.Log($"传送到位置: {Content.targetPosition}");
                break;
            case HotspotType.Audio:
                Debug.Log($"播放音频: {Content.audioUrl}");
                break;
            case HotspotType.Video:
                Debug.Log($"播放视频: {Content.videoUrl}");
                break;
            case HotspotType.URL:
                Debug.Log($"打开URL: {Content.url}");
                break;
            case HotspotType.Custom:
                Debug.Log($"执行自定义热点操作");
                break;
        }
    }
    
    private void ApplySelectedVisual()
    {
        if (mainRenderer != null)
        {
            if (selectedMaterial == null)
            {
                selectedMaterial = new Material(Shader.Find("Standard"));
                selectedMaterial.color = Color.magenta;
                selectedMaterial.SetFloat("_Mode", 3);
                selectedMaterial.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                selectedMaterial.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                selectedMaterial.SetInt("_ZWrite", 0);
                selectedMaterial.DisableKeyword("_ALPHATEST_ON");
                selectedMaterial.EnableKeyword("_ALPHABLEND_ON");
                selectedMaterial.DisableKeyword("_ALPHAPREMULTIPLY_ON");
                selectedMaterial.renderQueue = 3000;
                selectedMaterial.color = new Color(1, 0, 1, 0.6f);
            }
            
            mainRenderer.material = selectedMaterial;
        }
    }
    
    private void ApplyOriginalVisual()
    {
        if (mainRenderer != null && originalMaterial != null)
        {
            mainRenderer.material = originalMaterial;
        }
    }
    
    public void UpdateVisibility(bool isVisible)
    {
        if (mainRenderer != null)
        {
            mainRenderer.enabled = isVisible;
        }
    }
    
    public void SetHoverState(bool isHovering)
    {
        if (isSelected) return;
        
        if (mainRenderer != null)
        {
            if (isHovering)
            {
                if (hoverMaterial == null)
                {
                    hoverMaterial = new Material(Shader.Find("Standard"));
                    hoverMaterial.color = Color.yellow;
                    hoverMaterial.SetFloat("_Mode", 3);
                    hoverMaterial.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                    hoverMaterial.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                    hoverMaterial.SetInt("_ZWrite", 0);
                    hoverMaterial.DisableKeyword("_ALPHATEST_ON");
                    hoverMaterial.EnableKeyword("_ALPHABLEND_ON");
                    hoverMaterial.DisableKeyword("_ALPHAPREMULTIPLY_ON");
                    hoverMaterial.renderQueue = 3000;
                    hoverMaterial.color = new Color(1, 1, 0, 0.5f);
                }
                
                mainRenderer.material = hoverMaterial;
            }
            else
            {
                ApplyOriginalVisual();
            }
        }
    }
    
    public HotspotData ToData()
    {
        return new HotspotData
        {
            id = HotspotId,
            type = HotspotType,
            position = transform.position,
            rotation = transform.rotation.eulerAngles,
            triggerRadius = TriggerRadius,
            content = Content,
            isVisible = mainRenderer != null ? mainRenderer.enabled : true,
            updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
    }
    
    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            Trigger();
        }
    }
}
