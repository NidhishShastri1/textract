from typing import Dict, Any
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

# LangChain Imports
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# LangFuse Import (Optional but recommended)
try:
    from langfuse.callback.langchain import LangchainCallbackHandler
    logger.info("Langfuse LangChain handler imported successfully")
    LANGFUSE_AVAILABLE = True
except Exception as e:
    logger.error(f"Langfuse import failed: {e}")
    LANGFUSE_AVAILABLE = False
    
logger.info(f"LANGFUSE_AVAILABLE = {LANGFUSE_AVAILABLE}")

# HuggingFace Token
HF_TOKEN = os.getenv("HF_TOKEN")

class AIService:
    def __init__(self):
        self.reader = None
        self.chain = None
        
    async def initialize(self):
        logger.info("Initializing AI Service...")
        
        # 1. EasyOCR
        try:
            logger.info("Loading EasyOCR...")
            self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            logger.info("EasyOCR Loaded.")
        except Exception as e:
            logger.error(f"EasyOCR Init Failed: {e}")
        
        # 2. LangChain with HuggingFace
        try:
            logger.info("Setting up LangChain with HuggingFace...")
            
            # Create HuggingFace LLM endpoint
            llm = HuggingFaceEndpoint(
                repo_id="Qwen/Qwen2.5-7B-Instruct",
                huggingfacehub_api_token=HF_TOKEN,
                max_new_tokens=1024,
                temperature=0.1,
                top_p=0.95
            )
            
            # Create Chat Model wrapper
            chat_model = ChatHuggingFace(llm=llm)
            
            # Create Prompt Template
            prompt = ChatPromptTemplate.from_messages([
                ("system",  """You are an expert OCR system specialized in reading handwritten text with maximum accuracy.

Analyze this handwritten document with extreme care and extract ALL the information you can see.

CRITICAL INSTRUCTIONS FOR MAXIMUM ACCURACY:
1. Read each character and word carefully - examine the image in detail
2. DO NOT assume or hallucinate any fields - only extract what is clearly visible
3. Pay special attention to:
   - Numbers (phone numbers, dates, policy numbers, etc.) - read each digit precisely
   - Names - read each letter carefully, including capitalization
   - Addresses - read street names, numbers, and city names accurately
   - Email addresses - verify @ symbols and domain names
4. For partially readable text, extract what you can see clearly, even if incomplete
5. If text is completely illegible or blank, mark it as "unreadable" (not null)
6. Return the data as clean, structured JSON with proper nesting
7. Create field names based on actual labels, headings, and form structure you see
8. Preserve the exact logical structure and grouping of information
9. Be extremely precise with values - read numbers and text character by character
10. Double-check your extraction before returning the JSON

IMPORTANT: Read slowly and carefully. Accuracy is more important than speed.
Return ONLY valid JSON with no additional text, markdown, or explanation before or after.
The JSON should have descriptive keys based on the actual content structure."""
),
                ("human", "Extract all data from this form:\n\n{context}")
            ])
            
            # Build LangChain Chain
            self.chain = prompt | chat_model | StrOutputParser()
            logger.info("LangChain Chain Ready.")
            
        except Exception as e:
            logger.error(f"LangChain Init Failed: {e}")

    async def process_document(self, image_path: str) -> Dict[str, Any]:
        # 1. OCR
        if not self.reader:
            return {"error": "OCR not ready", "raw_text": ""}
            
        try:
            logger.info(f"Running OCR on: {image_path}")
            result = self.reader.readtext(image_path, detail=0, paragraph=True)
            raw_text = "\n".join(result)
            logger.info(f"OCR Success. Text length: {len(raw_text)}")
        except Exception as e:
            logger.error(f"OCR Error: {e}")
            return {"error": f"OCR Error: {e}", "raw_text": ""}

        if not raw_text.strip():
            return {"error": "OCR returned empty text", "raw_text": ""}

        # 2. LangChain Extraction
        if not self.chain:
            return {"raw_text": raw_text, "extracted_data": {"error": "LangChain not ready"}}
        logger.info(f"LANGFUSE_PUBLIC_KEY={os.getenv('LANGFUSE_PUBLIC_KEY')}")
        logger.info(f"LANGFUSE_SECRET_KEY={'SET' if os.getenv('LANGFUSE_SECRET_KEY') else 'MISSING'}")
        logger.info(f"LANGFUSE_HOST={os.getenv('LANGFUSE_HOST')}")

        try:
            logger.info("Invoking LangChain...")
            
            # Prepare Callbacks
            callbacks = []
            if LANGFUSE_AVAILABLE:
                try:
                    langfuse_handler = LangchainCallbackHandler(
                        public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
                        secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
                        host=os.getenv("LANGFUSE_HOST"),
                    )
                    callbacks.append(langfuse_handler)
                    logger.info("Langfuse callback attached.")
                except Exception as e:
                    logger.error(f"Langfuse init failed: {e}")

            # Invoke Chain with Callbacks
            response = self.chain.invoke({"context": raw_text}, config={"callbacks": callbacks})
            logger.info(f"LangChain Raw Response (first 500 chars): {response[:500]}")
            
            # IMPROVED PARSING: Look for JSON blocks or try to parse the whole thing
            extracted = {}
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            
            if json_match:
                try:
                    json_str = json_match.group(0)
                    extracted = json.loads(json_str)
                    logger.info("Successfully parsed JSON from LLM response.")
                except json.JSONDecodeError as jde:
                    logger.error(f"JSON Decode Error: {jde}. Raw snippet: {response[:100]}")
                    extracted = {"raw_output": response, "error": "JSON format invalid"}
            else:
                logger.warning("No JSON block found in LLM response. Attempting line-by-line fallback.")
                # Fallback: create key-value pairs from lines if possible, or just one big block
                extracted = {"unstructured_content": response}

            return {
                "raw_text": raw_text,
                "extracted_data": extracted,
                "status": "SUCCESS"
            }
            
        except Exception as e:
            logger.error(f"LangChain Execution Error: {e}")
            return {
                "raw_text": raw_text,
                "extracted_data": {"error": str(e), "message": "Neural engine reached a processing limit."},
                "status": "ERROR"
            }

ai_service = AIService()
