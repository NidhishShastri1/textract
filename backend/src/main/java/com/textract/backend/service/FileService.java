package com.textract.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.textract.backend.client.AIServiceClient;
import com.textract.backend.model.FileEntity;
import com.textract.backend.repository.FileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
public class FileService {

    @Autowired
    private FileRepository fileRepository;

    @Autowired
    private AIServiceClient aiServiceClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public FileEntity processFile(MultipartFile file) {
        FileEntity entity = new FileEntity();
        entity.setFileName(file.getOriginalFilename());
        entity.setStatus("PROCESSING");
        entity = fileRepository.save(entity);

        try {
            // Call AI Service
            Map<String, Object> aiResult = aiServiceClient.sendToAi(file);

            entity.setRawText((String) aiResult.getOrDefault("raw_text", ""));
            Object data = aiResult.get("extracted_data");
            if (data != null) {
                entity.setExtractedJson(objectMapper.writeValueAsString(data));
            }
            entity.setStatus("COMPLETED");

        } catch (Exception e) {
            entity.setStatus("FAILED");
            entity.setRawText("Error: " + e.getMessage());
        }

        return fileRepository.save(entity);
    }
}
