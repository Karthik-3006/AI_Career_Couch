import os
import io
import logging
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {
    ".txt", ".text",
    ".pdf",
    ".docx", ".doc",
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit

def validate_file(filename: str, file_size: int, content_type: str):
    """
    Validates file extension, size, and mime types to ensure safety.
    """
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 10 MB limit. Please upload a smaller file."
        )
        
    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Only text, Word, PDF, or image files are allowed."
        )

def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Dispatches file data to the correct parser based on file extension.
    Returns plain text or raises an extraction error.
    """
    ext = os.path.splitext(filename.lower())[1]

    if ext in (".txt", ".text"):
        return _extract_txt(file_bytes)
    elif ext == ".pdf":
        return _extract_pdf(file_bytes)
    elif ext in (".docx", ".doc"):
        return _extract_docx(file_bytes, ext)
    elif ext in (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif"):
        return _extract_image(file_bytes)
    else:
        raise ValueError(f"Unsupported file format '{ext}'")

# Format extractors (ports from file_parser.py)

def _extract_txt(data: bytes) -> str:
    for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            return data.decode(enc).strip()
        except (UnicodeDecodeError, ValueError):
            continue
    raise ValueError("Could not decode text file. Please save it as UTF-8.")

def _extract_pdf(data: bytes) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        result = "\n".join(text_parts).strip()
        if result:
            return result
        # PDF is empty / scanned. Let's fall back to OCR
        logger.info("PDF has no embedded text; attempting page-image OCR.")
        return _extract_pdf_via_ocr(data)
    except ImportError:
        raise ImportError("pdfplumber library is not installed. Run: pip install pdfplumber")
    except Exception as exc:
        logger.error("PDF extraction failed: %s", exc)
        raise ValueError(f"Could not read PDF: {exc}")

def _extract_pdf_via_ocr(data: bytes) -> str:
    try:
        import pypdfium2 as pdfium
        from PIL import Image
        import pytesseract

        pdf = pdfium.PdfDocument(data)
        texts = []
        for page_index in range(len(pdf)):
            page = pdf[page_index]
            bitmap = page.render(scale=2)
            pil_img = bitmap.to_pil()
            page_text = pytesseract.image_to_string(pil_img)
            if page_text.strip():
                texts.append(page_text)
        pdf.close()
        result = "\n".join(texts).strip()
        if result:
            return result
        raise ValueError("No text could be extracted from this PDF via OCR.")
    except Exception as exc:
        logger.error("PDF OCR failed: %s", exc)
        raise ValueError("This PDF appears to be a scanned image and OCR failed. Try copying text manually.")

def _extract_docx(data: bytes, ext: str) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(data))
        lines = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        lines.append(cell.text.strip())
        result = "\n".join(lines).strip()
        if result:
            return result
        raise ValueError("The Word document is empty.")
    except ImportError:
        raise ImportError("python-docx library is not installed. Run: pip install python-docx")
    except Exception as exc:
        logger.error("DOCX extraction failed: %s", exc)
        if ext == ".doc":
            raise ValueError("Legacy .doc format is not fully supported. Save as .docx.")
        raise ValueError(f"Could not read Word document: {exc}")

def _extract_image(data: bytes) -> str:
    try:
        from PIL import Image, ImageEnhance, ImageFilter
        import pytesseract

        img = Image.open(io.BytesIO(data)).convert("RGB")
        img = ImageEnhance.Contrast(img).enhance(1.5)
        img = img.filter(ImageFilter.SHARPEN)

        w, h = img.size
        if w < 1000:
            scale = 1000 / w
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        text = pytesseract.image_to_string(img, config="--oem 3 --psm 6")
        result = text.strip()
        if result:
            return result
        raise ValueError("No readable text found in image.")
    except ImportError:
        raise ImportError("Pillow and pytesseract libraries are required for image OCR. Run: pip install Pillow pytesseract")
    except Exception as exc:
        logger.error("Image OCR failed: %s", exc)
        raise ValueError(f"Could not extract text from image: {exc}")
