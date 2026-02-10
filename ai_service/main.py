import os
import shutil
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from utils.ai import ai_service
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await ai_service.initialize()

@app.post("/process")
async def process_file(file: UploadFile = File(...)):
    temp_path = Path("temp") / file.filename
    temp_path.parent.mkdir(exist_ok=True)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    result = await ai_service.process_document(str(temp_path))
    
    # cleanup
    try:
        os.remove(temp_path)
    except:
        pass
        
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
