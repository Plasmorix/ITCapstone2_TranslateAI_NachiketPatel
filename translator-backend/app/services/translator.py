from typing import List, Dict
from langchain_openai import ChatOpenAI
from langchain.messages import HumanMessage
from app.core.config import settings
from app.core.languages import (
    get_supported_languages,
    is_supported_language,
    get_language_name,
    SUPPORTED_LANGUAGE_CODES
)


class TranslatorService:
    """Service for handling translation logic"""

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.1,
        )

    async def text_translate(
        self, text: str, source_lang: str, target_lang: str
    ) -> str:
        """Translate given text using LangChain with OpenAI"""

        if not is_supported_language(target_lang):
            raise ValueError(f"Unsupported target language: {target_lang}")

        if source_lang != "auto" and not is_supported_language(source_lang):
            raise ValueError(f"Unsupported source language: {source_lang}")

        target_lang_name = get_language_name(target_lang) if target_lang != "auto" else target_lang
        source_lang_name = get_language_name(source_lang) if source_lang != "auto" else source_lang

        if source_lang == "auto":
            prompt = f"""Detect the language of the following text and translate it to {target_lang_name}. 
Only return the translated text, nothing else.

Text to translate: {text}"""
        else:
            prompt = f"""Translate the following text from {source_lang_name} to {target_lang_name}. 
Only return the translated text, nothing else.

Text to translate: {text}"""

        message = HumanMessage(content=prompt)
        response = await self.llm.ainvoke([message])

        return response.content.strip()

    async def document_translate(
        self, document_content: str, source_lang: str, target_lang: str
    ) -> str:
        """Translate document content using LangChain with OpenAI"""

        if not is_supported_language(target_lang):
            raise ValueError(f"Unsupported target language: {target_lang}")

        if source_lang != "auto" and not is_supported_language(source_lang):
            raise ValueError(f"Unsupported source language: {source_lang}")

        target_lang_name = get_language_name(target_lang) if target_lang != "auto" else target_lang
        source_lang_name = get_language_name(source_lang) if source_lang != "auto" else source_lang

        if source_lang == "auto":
            prompt = f"""Detect the language of the following document and translate it to {target_lang_name}. 
Preserve the document structure and formatting as much as possible.
Only return the translated document content, nothing else.

Document content: {document_content}"""
        else:
            prompt = f"""Translate the following document from {source_lang_name} to {target_lang_name}. 
Preserve the document structure and formatting as much as possible.
Only return the translated document content, nothing else.

Document content: {document_content}"""

        message = HumanMessage(content=prompt)
        response = await self.llm.ainvoke([message])

        return response.content.strip()

    async def image_translate(
        self, image_base64: str, source_lang: str, target_lang: str
    ) -> dict:
        """Extract text from image and translate it using OpenAI Vision API"""

        if not is_supported_language(target_lang):
            raise ValueError(f"Unsupported target language: {target_lang}")

        if source_lang != "auto" and not is_supported_language(source_lang):
            raise ValueError(f"Unsupported source language: {source_lang}")

        target_lang_name = get_language_name(target_lang) if target_lang != "auto" else target_lang
        source_lang_name = get_language_name(source_lang) if source_lang != "auto" else source_lang

        if source_lang == "auto":
            prompt = f"""Please analyze this image and:
1. Extract all visible text from the image
2. Detect the language of the extracted text
3. Translate the extracted text to {target_lang_name}

Return your response in this exact JSON format:
{{
    "extracted_text": "the original text found in the image",
    "translated_text": "the text translated to {target_lang_name}"
}}

If no text is found in the image, return:
{{
    "extracted_text": "",
    "translated_text": ""
}}"""
        else:
            prompt = f"""Please analyze this image and:
1. Extract all visible text from the image (expected to be in {source_lang_name})
2. Translate the extracted text to {target_lang_name}

Return your response in this exact JSON format:
{{
    "extracted_text": "the original text found in the image",
    "translated_text": "the text translated to {target_lang_name}"
}}

If no text is found in the image, return:
{{
    "extracted_text": "",
    "translated_text": ""
}}"""

        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                },
            ]
        )

        response = await self.llm.ainvoke([message])

        try:
            import json
            import re

            content = response.content.strip()

            json_match = re.search(
                r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL
            )
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    json_str = content

            result = json.loads(json_str)
            return result
        except (json.JSONDecodeError, AttributeError):
            content = response.content.strip()

            extracted_match = re.search(r'"extracted_text":\s*"([^"]*)"', content)
            translated_match = re.search(r'"translated_text":\s*"([^"]*)"', content)

            if extracted_match and translated_match:
                return {
                    "extracted_text": extracted_match.group(1),
                    "translated_text": translated_match.group(1),
                }
            else:
                return {"extracted_text": content, "translated_text": content}

    def get_supported_languages(self) -> List[Dict[str, str]]:
        """Get list of supported languages with codes and names."""
        return get_supported_languages()
