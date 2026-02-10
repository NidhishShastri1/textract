# Textract: AI-Powered Handwritten Form Extraction System

## 🌟 Executive Summary
Textract is an intelligent automation system designed to bridge the gap between physical paper records and digital databases. It allows users to upload images or PDFs of handwritten forms and uses Advanced Artificial Intelligence to accurately extract the handwriting into structured digital data (JSON/Tables).

This project is built for speed, accuracy, and ease of deployment, utilizing a modern tech stack that combines a high-performance Java backend with a powerful Python AI engine.

---

## 🛠 How It Works (The User Journey)
1. **Upload**: A user selects a scanned image or photo of a handwritten document (e.g., a hospital registration form, a survey, or an application).
2. **Vision (OCR)**: The system uses **EasyOCR** (Computer Vision) to "read" the handwriting letter by letter and word by word.
3. **Intelligence (AI)**: The raw text is passed to an AI processing layer that understands the context (e.g., recognizing that "John Doe" is a name and "12/05/1990" is a date of birth).
4. **Structured Output**: The system converts the messy handwriting into a clean, searchable digital format ready for any database.

---

## 💻 Tech Stack (The Engine Room)
Textract is split into three primary layers, each handled by the best tool for the job:

| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) | Providing a premium, dark-themed user interface with real-time feedback. |
| **Backend** | Spring Boot (Java) | Managing file storage, API security, and orchestrating communication between services. |
| **AI Service** | Python (FastAPI) | Running the heavy-duty Computer Vision and AI logic (EasyOCR & LangChain). |
| **Infrastructure** | Docker & Terraform | Ensuring the entire system can be deployed to the cloud (AWS) in minutes. |

---

## 🏗 System Architecture
Even though the system is made of different technologies, it is bundled into a **Single Monolithic Container** for easy management.

### The Unified Flow:
1. **Nginx** (Web Server) acts as the entry point, serving the React frontend and routing requests.
2. **Spring Boot** manages the "business logic" and temporary file storage.
3. **Python AI Service** processes the images locally within the same container to minimize latency.
4. **Supervisor** manages all three processes, ensuring if one fails, it automatically restarts.

---

## 🚀 Getting Started (Zero to Hero)

### 1. Running Locally (No Installation Required)
If you have Docker installed, you can run the entire project with one command:
```bash
docker build -t textract .
docker run -p 80:80 textract
```
Then visit `http://localhost`.

### 2. Deploying to AWS (Infrastructure as Code)
The project includes **Terraform** scripts to set up a professional cloud environment in Mumbai (`ap-south-1`):
1. Navigate to the project root.
2. Run `terraform init`.
3. Run `terraform apply -auto-approve`.
*Terraform will automatically create a VPC, subnets, security groups, and an EC2 instance, and then pull the latest code from DockerHub.*

---

## 🧪 Quality & Reliability
The project is protected by a massive suite of **500 Playwright Tests** that simulate real user interactions across different browsers. This ensures that every update preserves the high quality and reliability of the platform.

---

## 📁 Project Structure
- `/frontend`: The React UI application.
- `/backend`: The Spring Boot Java API.
- `/ai_service`: The Python AI engine and OCR logic.
- `Dockerfile`: The "recipe" for building the combined system.
- `main.tf`: The Terraform blueprint for AWS deployment.

---

## 📝 Conclusion
Textract demonstrates how modern AI can be practical and accessible. By combining React, Java, and Python into a single, deployable unit, it provides a powerful tool for digitizing handwritten data without complex manual entry.
