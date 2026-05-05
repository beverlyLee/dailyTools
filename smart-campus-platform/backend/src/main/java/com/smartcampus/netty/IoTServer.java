package com.smartcampus.netty;

import com.smartcampus.config.NettyConfig;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.handler.timeout.IdleStateHandler;
import io.netty.util.CharsetUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.annotation.PreDestroy;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class IoTServer implements CommandLineRunner {

    @Autowired
    private NettyConfig nettyConfig;

    @Autowired
    private IoTMessageHandler ioTMessageHandler;

    private EventLoopGroup bossGroup;
    private EventLoopGroup workerGroup;

    @Override
    public void run(String... args) throws Exception {
        start();
    }

    public void start() {
        bossGroup = new NioEventLoopGroup(nettyConfig.getBossThreads());
        workerGroup = new NioEventLoopGroup(nettyConfig.getWorkerThreads());

        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workerGroup)
                    .channel(NioServerSocketChannel.class)
                    .option(ChannelOption.SO_BACKLOG, nettyConfig.getSoBacklog())
                    .childOption(ChannelOption.SO_KEEPALIVE, nettyConfig.isKeepAlive())
                    .childHandler(new ChannelInitializer<SocketChannel>() {
                        @Override
                        protected void initChannel(SocketChannel ch) {
                            ch.pipeline()
                                    .addLast(new IdleStateHandler(
                                            nettyConfig.getReaderIdleTime(),
                                            nettyConfig.getWriterIdleTime(),
                                            nettyConfig.getAllIdleTime(),
                                            TimeUnit.SECONDS))
                                    .addLast(new StringDecoder(CharsetUtil.UTF_8))
                                    .addLast(new StringEncoder(CharsetUtil.UTF_8))
                                    .addLast(ioTMessageHandler);
                        }
                    });

            ChannelFuture future = bootstrap.bind(nettyConfig.getPort()).sync();
            log.info("========== Netty IoT 服务器启动成功，端口: {} ==========", nettyConfig.getPort());
            
            future.channel().closeFuture().addListener(f -> {
                log.info("Netty IoT 服务器已关闭");
            });
            
        } catch (InterruptedException e) {
            log.error("Netty IoT 服务器启动失败", e);
            Thread.currentThread().interrupt();
        }
    }

    @PreDestroy
    public void stop() {
        log.info("========== 关闭 Netty IoT 服务器 ==========");
        if (bossGroup != null) {
            bossGroup.shutdownGracefully();
        }
        if (workerGroup != null) {
            workerGroup.shutdownGracefully();
        }
    }
}
