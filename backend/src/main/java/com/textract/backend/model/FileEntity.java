package com.textract.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "files")
public class FileEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String status; // UPLOADED, PROCESSING, COMPLETED, FAILED

    @Column(length = 5000)
    private String rawText;

    @Column(columnDefinition = "TEXT")
    private String extractedJson;

    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
