# Textract: Titanium AI Deployment Guide

## 🚀 1. System Overview (Titanium Elite Core)
Textract is a forensic-grade document extraction system designed to convert complex handwritten forms into structured JSON data.
- **Frontend**: React (Vite) - Dark Mode "Project Guardian" UI
- **Backend**: Spring Boot (Java 23) - Secure Data Bridge
- **AI Core**: Python (FastAPI) + **Llama-3.3-70B** + **EasyOCR Titanium Fusion**

---

## 🧹 2. Pre-Deployment Cleanup
Before shipping, run the following cleanup to remove build artifacts and logs:
```bash
# Windows
Get-ChildItem -Path . -Include *.log,*.tmp,*.bak,.DS_Store,__pycache__ -Recurse -Force | Remove-Item -Force -Recurse
```

---

## ☁ 3. AWS Deployment Workflow
The system is containerized for seamless AWS deployment (EC2 or ECS).

### **Step A: Build the Monolith Container**
This single Docker image contains the Frontend, Backend, AI Engine, and Nginx.
```bash
docker build -t textract-titanium:latest .
```

### **Step B: Push to AWS ECR (Elastic Container Registry)**
1. Authenticate Docker to your AWS account:
   ```bash
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin [YOUR_AWS_ACCOUNT_ID].dkr.ecr.ap-south-1.amazonaws.com
   ```
2. Tag and Push:
   ```bash
   docker tag textract-titanium:latest [YOUR_AWS_ACCOUNT_ID].dkr.ecr.ap-south-1.amazonaws.com/textract:[TAG]
   docker push [YOUR_AWS_ACCOUNT_ID].dkr.ecr.ap-south-1.amazonaws.com/textract:[TAG]
   ```

### **Step C: Deploy Infrastructure (Terraform)**
Navigate to the root directory and run the verified Terraform script to provision a **g4dn.xlarge** instance (GPU recommended for Llama-70B speed) or **t3.2xlarge** (CPU optimized).
```bash
terraform init
terraform apply -auto-approve
```
*Note: Ensure your `.env` variables (HF_TOKEN, etc.) are injected into the EC2 User Data script.*

---

## 🔑 4. Environment Variables (Critical)
Set these on your production server:
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `HF_TOKEN` | `hf_...` | Unlocks Llama-3.3-70B on Hugging Face |
| `VITE_API_URL` | `http://[EC2_PUBLIC_IP]:8080` | Points React to the Backend |
| `LANGFUSE_PUBLIC_KEY` | `pk-lf-...` | Enables Forensic Telemetry |

---

## 🛡 5. Post-Deployment Verification
1. Access the UI at `http://[EC2_PUBLIC_IP]`.
2. Confirm the UI shows **"Titanium Elite Core"** during scanning.
3. Upload a sample form.
4. Verify the **JSON** output contains fields like `Physical_Layout_Reconstruction` without "Ghosting".

---

*Verified for Production Release - version: Titanium-1.0*
