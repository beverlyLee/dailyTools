package com.bigdata.devkit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BigdataDevKitApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(BigdataDevKitApplication.class, args);
        System.out.println("========================================");
        System.out.println("  大数据处理开发套件后端启动成功!");
        System.out.println("  访问地址: http://localhost:8080");
        System.out.println("  H2控制台: http://localhost:8080/h2-console");
        System.out.println("========================================");
    }
}
