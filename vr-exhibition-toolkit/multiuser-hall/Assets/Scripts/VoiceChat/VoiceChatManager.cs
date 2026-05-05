using UnityEngine;
using System;
using System.Collections.Generic;

public class VoiceChatManager : MonoBehaviour
{
    public static VoiceChatManager Instance { get; private set; }

    [Header("语音设置")]
    public int sampleRate = 16000;
    public int sampleLength = 160;
    public float voiceActivationThreshold = 0.01f;
    public bool pushToTalk = false;
    public KeyCode pushToTalkKey = KeyCode.V;

    [Header("调试")]
    public bool debugMode = false;

    [Header("当前状态")]
    [SerializeField] private bool isRecording;
    [SerializeField] private bool isSpeaking;
    [SerializeField] private string currentMicDevice;
    [SerializeField] private int micPosition;

    public event Action<string, bool> OnUserSpeaking;
    public event Action<string, float[]> OnVoiceDataReceived;

    public bool IsSpeaking => isSpeaking;
    public bool IsRecording => isRecording;

    private AudioClip microphoneClip;
    private int lastSamplePosition;
    private Dictionary<string, AudioSource> userAudioSources = new Dictionary<string, AudioSource>();
    private Dictionary<string, Queue<float[]>> voiceDataQueues = new Dictionary<string, Queue<float[]>>();

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
        InitializeMicrophone();

        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnVoiceChatData += OnVoiceChatDataHandler;
        }
    }

    private void OnDestroy()
    {
        StopRecording();

        if (SocketIOClient.Instance != null)
        {
            SocketIOClient.Instance.OnVoiceChatData -= OnVoiceChatDataHandler;
        }
    }

    private void Update()
    {
        if (pushToTalk)
        {
            if (Input.GetKeyDown(pushToTalkKey))
            {
                StartRecording();
            }
            else if (Input.GetKeyUp(pushToTalkKey))
            {
                StopRecording();
            }
        }

        ProcessVoiceData();
    }

    private void InitializeMicrophone()
    {
        if (Microphone.devices.Length == 0)
        {
            Debug.LogWarning("未找到麦克风设备");
            return;
        }

        currentMicDevice = Microphone.devices[0];
        if (debugMode)
        {
            Debug.Log($"麦克风设备: {currentMicDevice}");
            foreach (var device in Microphone.devices)
            {
                Debug.Log($"可用设备: {device}");
            }
        }
    }

    public void StartRecording()
    {
        if (isRecording) return;
        if (string.IsNullOrEmpty(currentMicDevice))
        {
            Debug.LogWarning("没有可用的麦克风设备");
            return;
        }

        try
        {
            microphoneClip = Microphone.Start(currentMicDevice, true, 10, sampleRate);
            lastSamplePosition = 0;
            isRecording = true;

            if (debugMode)
            {
                Debug.Log($"开始录音: {currentMicDevice}, 采样率: {sampleRate}");
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"启动录音失败: {ex.Message}");
        }
    }

    public void StopRecording()
    {
        if (!isRecording) return;

        try
        {
            if (Microphone.IsRecording(currentMicDevice))
            {
                Microphone.End(currentMicDevice);
            }

            isRecording = false;
            isSpeaking = false;

            if (UserManager.Instance != null && UserManager.Instance.LocalUser != null)
            {
                UpdateSpeakingState(false);
            }

            if (debugMode)
            {
                Debug.Log("停止录音");
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"停止录音失败: {ex.Message}");
        }
    }

    private void ProcessVoiceData()
    {
        if (!isRecording || microphoneClip == null) return;

        micPosition = Microphone.GetPosition(currentMicDevice);

        if (micPosition < lastSamplePosition)
        {
            lastSamplePosition = 0;
        }

        int samplesAvailable = micPosition - lastSamplePosition;
        if (samplesAvailable >= sampleLength)
        {
            float[] samples = new float[sampleLength];
            microphoneClip.GetData(samples, lastSamplePosition);
            lastSamplePosition = micPosition;

            float volume = CalculateVolume(samples);
            bool currentlySpeaking = volume > voiceActivationThreshold;

            if (currentlySpeaking != isSpeaking)
            {
                isSpeaking = currentlySpeaking;
                UpdateSpeakingState(currentlySpeaking);
            }

            if (currentlySpeaking || !pushToTalk)
            {
                SendVoiceData(samples, currentlySpeaking);
            }
        }
    }

    private float CalculateVolume(float[] samples)
    {
        float sum = 0f;
        foreach (float sample in samples)
        {
            sum += Mathf.Abs(sample);
        }
        return sum / samples.Length;
    }

    private void UpdateSpeakingState(bool speaking)
    {
        if (UserManager.Instance == null || UserManager.Instance.LocalUser == null) return;

        UserManager.Instance.LocalUser.isSpeaking = speaking;
        OnUserSpeaking?.Invoke(UserManager.Instance.LocalUser.id, speaking);
    }

    private void SendVoiceData(float[] samples, bool speaking)
    {
        if (SocketIOClient.Instance == null) return;
        if (string.IsNullOrEmpty(SocketIOClient.Instance.CurrentSessionId)) return;
        if (UserManager.Instance == null || UserManager.Instance.LocalUser == null) return;

        short[] pcmData = ConvertFloatToPCM16(samples);
        byte[] byteData = new byte[pcmData.Length * 2];
        Buffer.BlockCopy(pcmData, 0, byteData, 0, byteData.Length);

        SocketIOClient.Instance.SendVoiceChat(
            UserManager.Instance.LocalUser.id,
            SocketIOClient.Instance.CurrentSessionId,
            byteData,
            speaking
        );
    }

    private short[] ConvertFloatToPCM16(float[] samples)
    {
        short[] pcm = new short[samples.Length];
        for (int i = 0; i < samples.Length; i++)
        {
            pcm[i] = (short)(Mathf.Clamp(samples[i], -1f, 1f) * short.MaxValue);
        }
        return pcm;
    }

    private float[] ConvertPCM16ToFloat(byte[] byteData)
    {
        short[] pcm = new short[byteData.Length / 2];
        Buffer.BlockCopy(byteData, 0, pcm, 0, byteData.Length);

        float[] samples = new float[pcm.Length];
        for (int i = 0; i < pcm.Length; i++)
        {
            samples[i] = pcm[i] / (float)short.MaxValue;
        }
        return samples;
    }

    private void OnVoiceChatDataHandler(Dictionary<string, object> data)
    {
        try
        {
            string userId = GetStringValue(data, "id");
            bool isSpeaking = GetBoolValue(data, "isSpeaking");
            string audioDataBase64 = GetStringValue(data, "audioData");

            if (userId == UserManager.Instance?.LocalUser?.id) return;

            OnUserSpeaking?.Invoke(userId, isSpeaking);

            var userObj = UserManager.Instance?.GetUserObject(userId);
            if (userObj != null)
            {
                var remoteUser = userObj.GetComponent<RemoteUserComponent>();
                if (remoteUser != null)
                {
                    remoteUser.SetSpeakingState(isSpeaking);
                }
            }

            if (!string.IsNullOrEmpty(audioDataBase64))
            {
                try
                {
                    byte[] audioBytes = Convert.FromBase64String(audioDataBase64);
                    float[] audioSamples = ConvertPCM16ToFloat(audioBytes);

                    QueueVoiceData(userId, audioSamples);

                    OnVoiceDataReceived?.Invoke(userId, audioSamples);
                }
                catch (Exception ex)
                {
                    if (debugMode)
                    {
                        Debug.LogWarning($"解码音频数据失败: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"处理语音数据失败: {ex.Message}");
        }
    }

    private void QueueVoiceData(string userId, float[] samples)
    {
        if (!voiceDataQueues.ContainsKey(userId))
        {
            voiceDataQueues[userId] = new Queue<float[]>();
        }

        voiceDataQueues[userId].Enqueue(samples);

        if (!userAudioSources.ContainsKey(userId))
        {
            CreateUserAudioSource(userId);
        }
    }

    private void CreateUserAudioSource(string userId)
    {
        var userObj = UserManager.Instance?.GetUserObject(userId);
        if (userObj == null) return;

        AudioSource audioSource = userObj.AddComponent<AudioSource>();
        audioSource.clip = AudioClip.Create($"Voice_{userId}", sampleRate * 2, 1, sampleRate, false);
        audioSource.playOnAwake = false;
        audioSource.loop = true;
        audioSource.spatialBlend = 1f;
        audioSource.minDistance = 1f;
        audioSource.maxDistance = 10f;

        userAudioSources[userId] = audioSource;
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

    public void MuteUser(string userId)
    {
        if (userAudioSources.TryGetValue(userId, out AudioSource audioSource))
        {
            audioSource.mute = true;
        }

        var userObj = UserManager.Instance?.GetUserObject(userId);
        if (userObj != null)
        {
            var remoteUser = userObj.GetComponent<RemoteUserComponent>();
            if (remoteUser != null)
            {
                remoteUser.SetMuted(true);
            }
        }
    }

    public void UnmuteUser(string userId)
    {
        if (userAudioSources.TryGetValue(userId, out AudioSource audioSource))
        {
            audioSource.mute = false;
        }

        var userObj = UserManager.Instance?.GetUserObject(userId);
        if (userObj != null)
        {
            var remoteUser = userObj.GetComponent<RemoteUserComponent>();
            if (remoteUser != null)
            {
                remoteUser.SetMuted(false);
            }
        }
    }

    public void SetPushToTalk(bool enabled)
    {
        pushToTalk = enabled;
        if (!enabled && !isRecording)
        {
            StartRecording();
        }
    }
}
