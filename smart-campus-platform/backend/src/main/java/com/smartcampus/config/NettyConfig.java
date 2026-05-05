package com.smartcampus.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "netty")
public class NettyConfig {
    
    private int port = 8090;
    private int bossThreads = 1;
    private int workerThreads = 4;
    private int soBacklog = 1024;
    private boolean keepAlive = true;
    private int readerIdleTime = 30;
    private int writerIdleTime = 0;
    private int allIdleTime = 0;
}
