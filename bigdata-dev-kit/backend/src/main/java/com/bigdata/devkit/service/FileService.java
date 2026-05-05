package com.bigdata.devkit.service;

import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileService {
    
    @Value("${file.upload.dir:./uploads/jars}")
    private String jarUploadDir;
    
    @Value("${file.sql.dir:./uploads/sqls}")
    private String sqlUploadDir;
    
    public String uploadJarFile(MultipartFile file) throws IOException {
        createDirectoryIfNotExists(jarUploadDir);
        
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".") 
            ? originalFilename.substring(originalFilename.lastIndexOf(".")) 
            : ".jar";
        String filename = UUID.randomUUID() + extension;
        
        Path targetPath = Paths.get(jarUploadDir, filename);
        Files.write(targetPath, file.getBytes());
        
        return targetPath.toString();
    }
    
    public String saveSqlFile(String sqlName, String sqlContent) throws IOException {
        createDirectoryIfNotExists(sqlUploadDir);
        
        String filename = UUID.randomUUID() + ".sql";
        Path targetPath = Paths.get(sqlUploadDir, filename);
        Files.write(targetPath, sqlContent.getBytes());
        
        return targetPath.toString();
    }
    
    public String readFile(String path) throws IOException {
        return Files.readString(Paths.get(path));
    }
    
    public void deleteFile(String path) throws IOException {
        Files.deleteIfExists(Paths.get(path));
    }
    
    public String getFilenameFromPath(String path) {
        if (path == null) return null;
        return Paths.get(path).getFileName().toString();
    }
    
    private void createDirectoryIfNotExists(String dir) throws IOException {
        Path path = Paths.get(dir);
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }
    }
}
