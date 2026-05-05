using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace DigitalFactoryTwin.Services
{
    public class WebSocketService
    {
        private static WebSocketService _instance;
        private static readonly object _lock = new object();
        private ClientWebSocket _webSocket;
        private string _webSocketUrl;
        private CancellationTokenSource _cancellationTokenSource;
        private bool _isConnected;

        public event EventHandler<DeviceStatusChangedEventArgs> DeviceStatusChanged;
        public event EventHandler<PLCDataReceivedEventArgs> PLCDataReceived;
        public event EventHandler<AlertReceivedEventArgs> AlertReceived;
        public event EventHandler<string> ConnectionStatusChanged;

        public bool IsConnected => _isConnected;

        public static WebSocketService Instance
        {
            get
            {
                if (_instance == null)
                {
                    lock (_lock)
                    {
                        if (_instance == null)
                        {
                            _instance = new WebSocketService();
                        }
                    }
                }
                return _instance;
            }
        }

        private WebSocketService()
        {
            _webSocketUrl = App.WebSocketUrl;
        }

        public void Initialize(string webSocketUrl)
        {
            _webSocketUrl = webSocketUrl;
        }

        public async Task ConnectAsync()
        {
            try
            {
                _cancellationTokenSource = new CancellationTokenSource();
                _webSocket = new ClientWebSocket();
                
                await _webSocket.ConnectAsync(new Uri(_webSocketUrl), _cancellationTokenSource.Token);
                _isConnected = true;
                ConnectionStatusChanged?.Invoke(this, "已连接");
                
                _ = ReceiveLoopAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket Connection Error: {ex.Message}");
                _isConnected = false;
                ConnectionStatusChanged?.Invoke(this, "连接失败");
            }
        }

        public async Task DisconnectAsync()
        {
            try
            {
                _cancellationTokenSource?.Cancel();
                
                if (_webSocket != null && _webSocket.State == WebSocketState.Open)
                {
                    await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                }
                
                _isConnected = false;
                ConnectionStatusChanged?.Invoke(this, "已断开");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket Disconnect Error: {ex.Message}");
            }
        }

        private async Task ReceiveLoopAsync()
        {
            var buffer = new byte[4096];
            
            while (_webSocket.State == WebSocketState.Open && !_cancellationTokenSource.Token.IsCancellationRequested)
            {
                try
                {
                    var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cancellationTokenSource.Token);
                    
                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        ProcessMessage(message);
                    }
                    else if (result.MessageType == WebSocketMessageType.Close)
                    {
                        _isConnected = false;
                        ConnectionStatusChanged?.Invoke(this, "连接已关闭");
                        break;
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"WebSocket Receive Error: {ex.Message}");
                    _isConnected = false;
                    ConnectionStatusChanged?.Invoke(this, "连接中断");
                    break;
                }
            }
        }

        private void ProcessMessage(string message)
        {
            try
            {
                var messageObj = JsonConvert.DeserializeObject<Dictionary<string, object>>(message);
                
                if (messageObj.TryGetValue("type", out var typeObj))
                {
                    var type = typeObj.ToString();
                    
                    switch (type)
                    {
                        case "device_status":
                            var deviceStatus = JsonConvert.DeserializeObject<DeviceStatusMessage>(message);
                            DeviceStatusChanged?.Invoke(this, new DeviceStatusChangedEventArgs
                            {
                                DeviceId = deviceStatus.DeviceId,
                                NewStatus = deviceStatus.NewStatus,
                                Timestamp = deviceStatus.Timestamp
                            });
                            break;
                            
                        case "plc_data":
                            var plcData = JsonConvert.DeserializeObject<PLCDataMessage>(message);
                            PLCDataReceived?.Invoke(this, new PLCDataReceivedEventArgs
                            {
                                DeviceId = plcData.DeviceId,
                                TagName = plcData.TagName,
                                TagValue = plcData.TagValue,
                                Timestamp = plcData.Timestamp
                            });
                            break;
                            
                        case "alert":
                            var alert = JsonConvert.DeserializeObject<AlertMessage>(message);
                            AlertReceived?.Invoke(this, new AlertReceivedEventArgs
                            {
                                AlertCode = alert.AlertCode,
                                AlertMessage = alert.AlertMessage,
                                AlertLevel = alert.AlertLevel,
                                DeviceId = alert.DeviceId,
                                Timestamp = alert.Timestamp
                            });
                            break;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Message Processing Error: {ex.Message}");
            }
        }

        public async Task SubscribeAsync(string channel)
        {
            if (_webSocket?.State == WebSocketState.Open)
            {
                var message = JsonConvert.SerializeObject(new { action = "subscribe", channel = channel });
                var bytes = Encoding.UTF8.GetBytes(message);
                await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cancellationTokenSource.Token);
            }
        }

        public async Task UnsubscribeAsync(string channel)
        {
            if (_webSocket?.State == WebSocketState.Open)
            {
                var message = JsonConvert.SerializeObject(new { action = "unsubscribe", channel = channel });
                var bytes = Encoding.UTF8.GetBytes(message);
                await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cancellationTokenSource.Token);
            }
        }
    }

    public class DeviceStatusChangedEventArgs : EventArgs
    {
        public string DeviceId { get; set; }
        public string NewStatus { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class PLCDataReceivedEventArgs : EventArgs
    {
        public string DeviceId { get; set; }
        public string TagName { get; set; }
        public string TagValue { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class AlertReceivedEventArgs : EventArgs
    {
        public string AlertCode { get; set; }
        public string AlertMessage { get; set; }
        public string AlertLevel { get; set; }
        public string DeviceId { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class DeviceStatusMessage
    {
        public string Type { get; set; }
        public string DeviceId { get; set; }
        public string NewStatus { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class PLCDataMessage
    {
        public string Type { get; set; }
        public string DeviceId { get; set; }
        public string TagName { get; set; }
        public string TagValue { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class AlertMessage
    {
        public string Type { get; set; }
        public string AlertCode { get; set; }
        public string AlertMessage { get; set; }
        public string AlertLevel { get; set; }
        public string DeviceId { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
