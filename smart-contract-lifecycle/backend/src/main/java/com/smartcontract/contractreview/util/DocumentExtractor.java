package com.smartcontract.contractreview.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Component
public class DocumentExtractor {

    public String extractText(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("文件名为空");
        }
        
        String fileName = originalFilename.toLowerCase();
        try (InputStream inputStream = file.getInputStream()) {
            if (fileName.endsWith(".pdf")) {
                return extractFromPDF(inputStream);
            } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
                return extractFromWord(inputStream, fileName);
            } else {
                throw new IllegalArgumentException("不支持的文件格式: " + originalFilename);
            }
        }
    }

    public String extractFromPDF(InputStream inputStream) throws IOException {
        try (PDDocument document = PDDocument.load(inputStream)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        }
    }

    public String extractFromWord(InputStream inputStream, String fileName) throws IOException {
        if (fileName.endsWith(".docx")) {
            return extractFromDocx(inputStream);
        } else {
            // 对于 .doc 文件，可以使用 Apache POI 的 HWPF 模块
            // 这里简单处理，建议在实际项目中完善
            return "旧版 Word 文档 (.doc) 支持有限，建议转换为 .docx 格式";
        }
    }

    private String extractFromDocx(InputStream inputStream) throws IOException {
        StringBuilder text = new StringBuilder();
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            List<XWPFParagraph> paragraphs = document.getParagraphs();
            for (XWPFParagraph paragraph : paragraphs) {
                text.append(paragraph.getText()).append("\n");
            }
        }
        return text.toString();
    }

    public String getFileExtension(String fileName) {
        if (fileName == null || fileName.lastIndexOf(".") == -1) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }
}
