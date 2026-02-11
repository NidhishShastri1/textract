from typing import Dict, Any, List, Set
import logging
import json
import re
import easyocr
import os
from pathlib import Path
from dotenv import load_dotenv

# Robustly load .env from ai_service/ directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# LangChain & HuggingFace & Langfuse Imports
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langfuse.callback import CallbackHandler
from PIL import Image


# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Credentials
HF_TOKEN = os.getenv("HF_TOKEN")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_HOST = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

class AIService:
    def __init__(self):
        self.reader = None
        self.llm = None
        self.chain = None
        self.langfuse_handler = None
        
    async def initialize(self):
        logger.info("INITIATING CORTEX TITANIUM ELITE...")
        
        # 1. Langfuse Telemetry
        try:
            if LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY:
                self.langfuse_handler = CallbackHandler(
                    public_key=LANGFUSE_PUBLIC_KEY,
                    secret_key=LANGFUSE_SECRET_KEY,
                    host=LANGFUSE_HOST
                )
        except: pass

        # 2. EasyOCR Engine
        try:
            self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            logger.info("Vision Core Online.")
        except Exception as e:
            logger.error(f"Vision Core Fault: {e}")
        
        # 3. Neural Core (Llama-3.3-70B)
        try:
            llm = HuggingFaceEndpoint(
                repo_id="meta-llama/Llama-3.3-70B-Instruct",
                huggingfacehub_api_token=HF_TOKEN,
                max_new_tokens=4096,
                temperature=0.01,
                timeout=240
            )
            self.llm = ChatHuggingFace(llm=llm)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are the SUPREME AUDITOR. 
Your task is to transform a visual grid of text into a clean digital record.

MANDATORY OUTPUT SECTIONS:

### PHYSICAL_LAYOUT_RECONSTRUCTION
[A detailed Markdown table mapping the labels and values to their spatial positions.]

### STRUCTURED_DATABASE_JSON
[A hierarchical JSON object.
- Map printed labels (e.g., 'NAME', 'ADDRESS', 'VIOLATIONS') to their handwritten values.
- Clean up OCR noise.
- Group tabular data such as violation lists or employment history into arrays.]"""),
                ("human", "DOCUMENT GRID MAP:\n\n{context}\n\nRECONSTRUCT STRUCTURED DATA:")
            ])
            
            self.chain = prompt | self.llm | StrOutputParser()
            logger.info("Cortex Titanium Core Ready.")
        except Exception as e:
            logger.error(f"Neural Core Deployment Failed: {e}")

    def deduplicate_results(self, results: List[Any]) -> List[Any]:
        """Prevents text ghosting/doubling from multi-pass OCR."""
        deduped = []
        if not results: return []
        results.sort(key=lambda x: x[2], reverse=True)
        added_rects = []
        for res in results:
            bbox, text, prob = res
            cx = (bbox[0][0] + bbox[1][0]) / 2
            cy = (bbox[0][1] + bbox[2][1]) / 2
            is_duplicate = False
            for (acx, acy, alen) in added_rects:
                if abs(cx - acx) < 12 and abs(cy - acy) < 12:
                    is_duplicate = True
                    break
            if not is_duplicate:
                deduped.append(res)
                added_rects.append((cx, cy, len(text)))
        deduped.sort(key=lambda x: (x[0][0][1], x[0][0][0]))
        return deduped

    def generate_elite_grid(self, results, img_width: int) -> str:
        """Transforms clean atoms into an 120-column spatial map."""
        try:
            if not results: return ""
            lines = []
            current_line = [results[0]]
            line_y_ths = 15
            for i in range(1, len(results)):
                if abs(results[i][0][0][1] - current_line[-1][0][0][1]) < line_y_ths:
                    current_line.append(results[i])
                else:
                    lines.append(sorted(current_line, key=lambda x: x[0][0][0]))
                    current_line = [results[i]]
            lines.append(sorted(current_line, key=lambda x: x[0][0][0]))
            grid_output = []
            for line in lines:
                row_str = [" "] * 125
                for (bbox, text, prob) in line:
                    x_start = int((bbox[0][0] / img_width) * 120)
                    for j, char in enumerate(text):
                        if x_start + j < 120:
                            row_str[x_start + j] = char
                grid_output.append("".join(row_str).rstrip())
            return "\n".join(grid_output)
        except: return ""

    async def process_document(self, image_path: str) -> Dict[str, Any]:
        if not self.reader: return {"error": "Vision Core Offline"}
        try:
            with Image.open(image_path) as img:
                img_width, _ = img.size

            logger.info("Engaging High-Fidelity Crystal Vision...")
            results = self.reader.readtext(image_path, detail=1)
            clean_results = self.deduplicate_results(results)
            fusion_grid = self.generate_elite_grid(clean_results, img_width)
            
            if not self.chain: return {"raw_text": fusion_grid, "error": "Neural Offline"}

            logger.info("Executing Supreme Auditor Synthesis...")
            config = {"callbacks": [self.langfuse_handler]} if self.langfuse_handler else {}
            response = self.chain.invoke({"context": fusion_grid}, config=config)
            
            table_part = "Processing..."
            json_part = {}
            
            table_search = re.search(r'### PHYSICAL_LAYOUT_RECONSTRUCTION\s*(.*?)(?=\n###|$)', response, re.DOTALL | re.IGNORECASE)
            if table_match := table_search: table_part = table_match.group(1).strip()
            
            json_search = re.search(r'### STRUCTURED_DATABASE_JSON\s*(.*?)(?=\n###|$)', response, re.DOTALL | re.IGNORECASE)
            json_str = json_search.group(1).strip() if json_search else response
            
            json_str = re.sub(r'```json\s*', '', json_str)
            json_str = re.sub(r'```\s*', '', json_str)
            json_str = re.sub(r',\s*\}', '}', json_str)
            json_str = re.sub(r',\s*\]', ']', json_str)
            
            try:
                obj_m = re.search(r'(\{.*\})', json_str, re.DOTALL)
                json_part = json.loads(obj_m.group(0)) if obj_m else json.loads(json_str)
            except:
                json_part = {"status": "TITANIUM_RECOVERY", "raw": json_str}

            return {
                "raw_text": fusion_grid,
                "extracted_table": table_part,
                "extracted_data": json_part,
                "status": "SUCCESS"
            }
        except Exception as e:
            logger.error(f"Fault: {e}")
            return {"error": str(e)}

ai_service = AIService()
