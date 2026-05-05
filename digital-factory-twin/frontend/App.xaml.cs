using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace DigitalFactoryTwin
{
    public partial class App : Application
    {
        public static string ApiBaseUrl { get; private set; }
        public static string WebSocketUrl { get; private set; }

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            
            ApiBaseUrl = "http://localhost:8000/api";
            WebSocketUrl = "ws://localhost:8000/ws";
        }
    }
}
