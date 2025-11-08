from pydantic import BaseModel, Field
from typing import Optional


class TextTranslateRequest(BaseModel):
    """Request model for translation"""

    text: str = Field(..., description="Text to translate", min_length=1)
    source_lang: str = Field(
        ...,
        description="Source language (e.g., 'english') or 'auto' for automatic detection",
    )
    target_lang: str = Field("english", description="Target language (e.g., 'spanish')")


class TextTranslateResponse(BaseModel):
    """Response model for translation"""

    translated_text: str = Field(..., description="Translated text")
    source_lang: str = Field(..., description="Source language")
    target_lang: str = Field(..., description="Target language")
    original_text: str = Field(..., description="Original text")


class DocumentTranslateResponse(BaseModel):
    """Response model for document translation"""

    translated_text: str = Field(..., description="Translated document text")
    source_lang: str = Field(..., description="Source language")
    target_lang: str = Field(..., description="Target language")
    original_filename: str = Field(..., description="Original document filename")
    document_type: str = Field(..., description="Type of document processed")


class ImageTranslateResponse(BaseModel):
    """Response model for image translation"""

    extracted_text: str = Field(..., description="Text extracted from image")
    translated_text: str = Field(..., description="Translated text from image")
    source_lang: str = Field(..., description="Source language")
    target_lang: str = Field(..., description="Target language")
    original_filename: str = Field(..., description="Original image filename")
    image_type: str = Field(..., description="Type of image processed")
