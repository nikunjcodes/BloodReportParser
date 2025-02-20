import os
import io
import json
import fitz
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pytesseract
from PIL import Image
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
print("🚀 Starting FastAPI Server...")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("❌ ERROR: GOOGLE_API_KEY is missing! Set it before running the server.")
    raise RuntimeError("GOOGLE_API_KEY is missing! Set it before running the server.")
print("✅ GOOGLE_API_KEY Loaded Successfully.")
genai.configure(api_key=GOOGLE_API_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✅ CORS Middleware Configured.")


def extract_text_from_file(contents: bytes, filename: str) -> str:
    try:
        print(f"📄 Processing file: {filename}")

        if filename.lower().endswith(".pdf"):
            print("📝 Detected PDF file. Extracting text...")

            try:
                pdf_document = fitz.open(stream=contents, filetype="pdf")
                text = ""
                for page_num, page in enumerate(pdf_document, start=1):
                    print(f"🔹 Extracting text from page {page_num}...")

                    page_text = page.get_text()
                    if page_text.strip():
                        text += page_text + " "
                        print(f"✅ Extracted text from page {page_num}: {len(page_text)} characters")
                    else:
                        print(f"⚠️ No text found on page {page_num}, using OCR...")
                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        ocr_text = pytesseract.image_to_string(img)
                        text += ocr_text + " "
                        print(f"✅ OCR extracted text from page {page_num}: {len(ocr_text)} characters")

                pdf_document.close()

            except Exception as pdf_error:
                print(f"❌ ERROR in PDF processing: {str(pdf_error)}")
                raise HTTPException(status_code=500, detail="PDF processing failed")

        elif filename.lower().endswith((".png", ".jpg", ".jpeg")):
            print("🖼 Detected Image file. Extracting text...")
            try:
                image = Image.open(io.BytesIO(contents))
                text = pytesseract.image_to_string(image)
                print(f"✅ Extracted {len(text)} characters from image.")
            except Exception as img_error:
                print(f"❌ ERROR in Image OCR: {str(img_error)}")
                raise HTTPException(status_code=500, detail="Image processing failed")

        else:
            print(f"❌ Unsupported file format: {filename}")
            raise ValueError("Unsupported file format")

        if not text.strip():
            print("⚠️ No text extracted from file.")
            raise ValueError("No text extracted")

        print("✅ Text extraction successful.")
        return text.strip()

    except Exception as e:
        print(f"❌ ERROR in text extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


def analyze_with_gemini(text: str) -> dict:
    try:
        print("🤖 Sending text to Gemini AI for analysis...")
        model = genai.GenerativeModel("gemini-pro")

        prompt = f"""
        Analyze this blood test report and provide a structured response.
        Format your response exactly as a JSON object with the following structure:
        {{
            "patientInfo": {{
                "name": "string",
                "age": "string",
                "gender": "string",
                "date": "string"
            }},
            "abnormalResults": [
                {{
                    "parameter": "string",
                    "value": number,
                    "unit": "string",
                    "interpretation": "string"
                }}
            ],
            "allResults": [
                {{
                    "parameter": "string",
                    "value": number,
                    "unit": "string",
                    "referenceRange": "string",
                    "status": "string"
                }}
            ],
            "recommendations": [
                "string"
            ]
        }}

        The response must be valid JSON. Extract all relevant information from this blood report:
        {text}
        """

        response = model.generate_content(prompt)
        try:
            response_text = response.text
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1

            if json_start == -1 or json_end == 0:
                raise ValueError("No JSON found in response")

            json_str = response_text[json_start:json_end]
            analysis_data = json.loads(json_str)

            print("✅ AI Analysis Successful. Returning structured response.")
            required_fields = ["patientInfo", "abnormalResults", "allResults", "recommendations"]
            for field in required_fields:
                if field not in analysis_data:
                    analysis_data[field] = [] if field != "patientInfo" else {}

            return analysis_data
        except json.JSONDecodeError as json_error:
            print(f"❌ JSON parsing error: {str(json_error)}")
            print(f"Response text: {response.text}")
            return {
                "patientInfo": {},
                "abnormalResults": [],
                "allResults": [],
                "recommendations": []
            }

    except Exception as e:
        print(f"❌ ERROR: Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI analysis failed")


@app.post("/api/analyze-report")
async def analyze_report(file: UploadFile = File(...)):
    try:
        print(f"📥 Received file: {file.filename}")
        contents = await file.read()
        print(f"📜 File size: {len(contents)} bytes")
        text = extract_text_from_file(contents, file.filename)
        print(f"📄 Extracted text: {text[:500]}...")
        analysis = analyze_with_gemini(text)

        print("📤 Returning analysis results to frontend.")
        return JSONResponse(content=analysis, status_code=200)

    except Exception as e:
        print(f"❌ ERROR: Internal Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/")
def home():
    print("🏠 Home route accessed")
    return {"message": "Blood Report Analyzer API is running 🚀"}

if __name__ == "__main__":
    import uvicorn

    print("🔥 Starting Uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
