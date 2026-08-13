"""
Extraction de contenu texte des fichiers uploadés.
RÈGLE (DECISIONS_FIGEES §13) : les fichiers sont traités comme contenu non fiable.
On extrait le texte, on ne l'exécute jamais.
"""
import asyncio
import io


def _extract_txt_sync(data: bytes) -> str:
    return data.decode("utf-8", errors="ignore")


def _extract_pdf_sync(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001 - contenu non fiable, on continue
            pages.append("")
    return "\n".join(pages)


def _extract_docx_sync(data: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


async def extract_text(file_type: str, data: bytes) -> str | None:
    """
    Retourne le texte extrait, ou None si le type n'est pas analysable en texte.
    NOTE HONNÊTE : jpeg/png n'ont pas d'OCR dans le V0 (voir ROADMAP).
    """
    if file_type == "txt":
        return await asyncio.to_thread(_extract_txt_sync, data)
    if file_type == "pdf":
        return await asyncio.to_thread(_extract_pdf_sync, data)
    if file_type == "docx":
        return await asyncio.to_thread(_extract_docx_sync, data)
    return None