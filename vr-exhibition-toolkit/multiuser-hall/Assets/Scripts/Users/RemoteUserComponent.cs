using UnityEngine;
using UnityEngine.UI;

public class RemoteUserComponent : MonoBehaviour
{
    [Header("引用")]
    public Transform headTransform;
    public Transform leftHandTransform;
    public Transform rightHandTransform;
    public GameObject laserPointerPrefab;
    public Canvas nameCanvas;
    public Text nameText;
    
    [Header("设置")]
    public float nameTagHeight = 2.5f;
    public Color speakingColor = Color.green;
    public Color defaultColor = Color.white;
    
    [Header("当前状态")]
    [SerializeField] private UserData userData;
    [SerializeField] private GameObject laserPointerObject;
    [SerializeField] private bool isSpeaking;
    [SerializeField] private bool laserPointerActive;
    
    public UserData UserData => userData;
    public string UserId => userData?.id ?? "";
    public string Username => userData?.username ?? "";
    
    private LineRenderer laserLineRenderer;
    
    public void Initialize(UserData data)
    {
        userData = data;
        
        if (nameText != null)
        {
            nameText.text = data.username;
        }
        
        if (nameCanvas != null)
        {
            nameCanvas.worldCamera = Camera.main;
        }
        
        UpdateVisual();
    }
    
    private void Update()
    {
        if (userData == null) return;
        
        UpdateNameTagPosition();
        UpdateLaserPointer();
    }
    
    private void UpdateNameTagPosition()
    {
        if (nameCanvas == null) return;
        
        Vector3 nameTagPosition = transform.position + Vector3.up * nameTagHeight;
        nameCanvas.transform.position = nameTagPosition;
        
        if (Camera.main != null)
        {
            nameCanvas.transform.LookAt(Camera.main.transform);
            nameCanvas.transform.Rotate(0, 180, 0);
        }
    }
    
    public void UpdatePosition(Vector3 position)
    {
        transform.position = position;
    }
    
    public void UpdateRotation(Vector3 rotation)
    {
        if (headTransform != null)
        {
            headTransform.rotation = Quaternion.Euler(rotation);
        }
        else
        {
            transform.rotation = Quaternion.Euler(rotation);
        }
    }
    
    public void SetSpeakingState(bool speaking)
    {
        isSpeaking = speaking;
        userData.isSpeaking = speaking;
        
        UpdateVisual();
    }
    
    public void SetLaserPointerState(bool active, Vector3 position, Vector3 direction)
    {
        laserPointerActive = active;
        userData.laserPointerActive = active;
        userData.laserPointerPosition = position;
        userData.laserPointerDirection = direction;
    }
    
    private void UpdateLaserPointer()
    {
        if (laserPointerActive)
        {
            if (laserPointerObject == null && laserPointerPrefab != null)
            {
                laserPointerObject = Instantiate(laserPointerPrefab, transform);
                laserLineRenderer = laserPointerObject.GetComponent<LineRenderer>();
            }
            
            if (laserLineRenderer != null)
            {
                Vector3 startPos = rightHandTransform != null ? rightHandTransform.position : transform.position;
                Vector3 direction = userData.laserPointerDirection;
                if (direction == Vector3.zero)
                {
                    direction = transform.forward;
                }
                
                Ray laserRay = new Ray(startPos, direction);
                float laserLength = 100f;
                
                laserLineRenderer.SetPosition(0, startPos);
                laserLineRenderer.SetPosition(1, startPos + direction * laserLength);
            }
        }
        else
        {
            if (laserPointerObject != null)
            {
                Destroy(laserPointerObject);
                laserPointerObject = null;
                laserLineRenderer = null;
            }
        }
    }
    
    private void UpdateVisual()
    {
        if (nameText != null)
        {
            nameText.color = isSpeaking ? speakingColor : defaultColor;
        }
    }
    
    public void SetMuted(bool muted)
    {
        if (userData != null)
        {
            userData.isMuted = muted;
        }
    }
}
