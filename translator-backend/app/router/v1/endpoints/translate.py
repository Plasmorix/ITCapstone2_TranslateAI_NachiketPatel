import asyncio
import base64
import json
import io
from fastapi import (
    APIRouter,
    HTTPException,
    File,
    UploadFile,
    Form,
    WebSocket,
    WebSocketDisconnect,
    Depends,
)
from app.schemas.translate import (
    TextTranslateRequest,
    TextTranslateResponse,
    DocumentTranslateResponse,
    ImageTranslateResponse,
)
from app.services.translator import TranslatorService
from app.services.audio import AudioService
from app.services.database import DatabaseService
from app.core.auth import get_current_user, get_current_user_with_token
from typing import Optional, Dict, Any
import PyPDF2

router = APIRouter()
translator_service = TranslatorService()
audio_service = AudioService()
database_service = DatabaseService()


@router.post("/text", response_model=TextTranslateResponse)
async def translate_text(
    request: TextTranslateRequest,
    user_data: tuple[Dict[str, Any], str] = Depends(get_current_user_with_token)
):
    """Translate text from source language to target language"""
    current_user, access_token = user_data
    
    try:
        result = await translator_service.text_translate(
            text=request.text,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
        )
        
        try:
            await database_service.save_translation(
                user_id=current_user["sub"],
                input_text=request.text,
                output_text=result,
                source_lang=request.source_lang,
                target_lang=request.target_lang,
                modality="text",
                access_token=access_token
            )
        except Exception as db_error:
            print(f"Failed to save translation to database: {db_error}")
        
        return TextTranslateResponse(
            translated_text=result,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            original_text=request.text,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document", response_model=DocumentTranslateResponse)
async def translate_document(
    file: UploadFile = File(...),
    target_lang: str = Form("en"),
    source_lang: str = Form("auto"),
    user_data: tuple[Dict[str, Any], str] = Depends(get_current_user_with_token),
):
    """Upload and translate document file (supports .txt, .md, .csv, .yaml, .yml, .pdf)"""
    current_user, access_token = user_data

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        file_extension = file.filename.lower().split(".")[-1]
        supported_extensions = ["txt", "md", "csv", "yaml", "yml", "pdf"]

        if file_extension not in supported_extensions:
            error_msg = f"Unsupported file type: .{file_extension}. Supported types: {', '.join(supported_extensions)}"
            raise HTTPException(status_code=400, detail=error_msg)

        document_content = await file.read()
        text_content = ""

        if file_extension == "pdf":
            try:
                pdf_file = io.BytesIO(document_content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)

                text_content = ""
                for page in pdf_reader.pages:
                    text_content += page.extract_text() + "\n"

                if not text_content.strip():
                    raise HTTPException(
                        status_code=400,
                        detail="No text could be extracted from the PDF",
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=400, detail=f"Error processing PDF: {str(e)}"
                )
        else:
            try:
                text_content = document_content.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="Unable to decode file. Please ensure it's a valid text file in UTF-8 encoding.",
                )

        if not text_content.strip():
            raise HTTPException(status_code=400, detail="Document appears to be empty")

        translated_content = await translator_service.document_translate(
            document_content=text_content,
            source_lang=source_lang,
            target_lang=target_lang,
        )

        try:
            await database_service.save_translation(
                user_id=current_user["sub"],
                input_text=text_content,
                output_text=translated_content,
                source_lang=source_lang,
                target_lang=target_lang,
                modality="document",
                access_token=access_token
            )
        except Exception as db_error:
            print(f"Failed to save translation to database: {db_error}")

        return DocumentTranslateResponse(
            translated_text=translated_content,
            source_lang=source_lang,
            target_lang=target_lang,
            original_filename=file.filename,
            document_type=file_extension,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image", response_model=ImageTranslateResponse)
async def translate_image(
    file: UploadFile = File(...),
    target_lang: str = Form("en"),
    source_lang: str = Form("auto"),
    user_data: tuple[Dict[str, Any], str] = Depends(get_current_user_with_token),
):
    """Upload and translate text from image file (supports .jpg, .jpeg, .png, .gif, .bmp, .webp)"""
    current_user, access_token = user_data

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        file_extension = file.filename.lower().split(".")[-1]
        supported_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"]

        if file_extension not in supported_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image type: .{file_extension}. Supported types: {', '.join(supported_extensions)}",
            )

        image_content = await file.read()

        image_base64 = base64.b64encode(image_content).decode("utf-8")

        result = await translator_service.image_translate(
            image_base64=image_base64, source_lang=source_lang, target_lang=target_lang
        )

        extracted_text = result.get("extracted_text", "")
        translated_text = result.get("translated_text", "")

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400, detail="No text could be extracted from the image"
            )

        try:
            await database_service.save_translation(
                user_id=current_user["sub"],
                input_text=extracted_text,
                output_text=translated_text,
                source_lang=source_lang,
                target_lang=target_lang,
                modality="image",
                access_token=access_token
            )
        except Exception as db_error:
            print(f"Failed to save translation to database: {db_error}")

        return ImageTranslateResponse(
            extracted_text=extracted_text,
            translated_text=translated_text,
            source_lang=source_lang,
            target_lang=target_lang,
            original_filename=file.filename,
            image_type=file_extension,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio")
async def translate_audio(
    file: UploadFile = File(...),
    target_lang: Optional[str] = Form("en"),
    user_data: tuple[Dict[str, Any], str] = Depends(get_current_user_with_token),
):
    """Upload and process audio file for transcription and optional translation"""
    current_user, access_token = user_data
    
    try:
        audio_content = await file.read()

        result = await audio_service.process_audio_file(audio_content, target_lang)

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        transcribed_text = result.get("transcribed_text", "")
        translated_text = result.get("translated_text")
        
        if transcribed_text and translated_text:
            try:
                await database_service.save_translation(
                    user_id=current_user["sub"],
                    input_text=transcribed_text,
                    output_text=translated_text,
                    source_lang="auto",  # Audio transcription auto-detects language
                    target_lang=target_lang,
                    modality="audio",
                    access_token=access_token
                )
            except Exception as db_error:
                print(f"Failed to save translation to database: {db_error}")

        return {
            "transcribed_text": transcribed_text,
            "translated_text": translated_text,
            "target_lang": target_lang,
            "original_filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/audio/realtime")
async def websocket_realtime_audio(websocket: WebSocket):
    """WebSocket endpoint for real-time audio translation using OpenAI Realtime API"""

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Authentication token required")
        return

    try:
        from app.core.auth import supabase_auth
        user_data = await supabase_auth.verify_token(token)
        print(f"WebSocket authenticated user: {user_data.get('sub')}")
    except Exception as e:
        print(f"WebSocket authentication failed: {e}")
        await websocket.close(code=1008, reason="Invalid authentication token")
        return
    
    await websocket.accept()

    realtime_service = audio_service.get_realtime_service()
    target_language = "en"  # Default to English
    session_initialized = False
    
    current_transcript = ""
    current_translation = ""
    
    async def save_realtime_translation():
        """Save the current transcript and translation to database"""
        if current_transcript and current_translation:
            try:
                await database_service.save_translation(
                    user_id=user_data["sub"],
                    input_text=current_transcript,
                    output_text=current_translation,
                    source_lang="auto",  # Real-time audio auto-detects language
                    target_lang=target_language,
                    modality="realtime_audio",
                    access_token=token
                )
                print(f"Saved real-time translation to database: '{current_transcript[:50]}...' -> '{current_translation[:50]}...'")
            except Exception as db_error:
                print(f"Failed to save real-time translation to database: {db_error}")

    connected = await realtime_service.connect_realtime()
    if not connected:
        await websocket.send_text(
            json.dumps(
                {"type": "error", "error": "Failed to connect to OpenAI Realtime API"}
            )
        )
        await websocket.close()
        return

    async def handle_openai_response(data: dict):
        """Handle responses from OpenAI Realtime API"""
        nonlocal session_initialized, current_transcript, current_translation

        try:
            event_type = data.get("type")

            if event_type == "session.created":
                session_initialized = True
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_created",
                            "message": "Connected to OpenAI Realtime API",
                        }
                    )
                )
                await realtime_service.send_session_update(target_language)
            elif event_type == "session.updated":
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "session_updated",
                            "message": "Session configuration updated",
                        }
                    )
                )
            elif event_type == "input_audio_buffer.committed":
                await websocket.send_text(
                    json.dumps(
                        {"type": "audio_committed", "message": "Audio buffer committed"}
                    )
                )
            elif event_type == "input_audio_buffer.speech_started":
                current_transcript = ""
                current_translation = ""
                await websocket.send_text(
                    json.dumps({"type": "speech_started", "message": "Speech detected"})
                )
            elif event_type == "input_audio_buffer.speech_stopped":
                await websocket.send_text(
                    json.dumps({"type": "speech_stopped", "message": "Speech ended"})
                )
            elif event_type == "conversation.item.created":
                item = data.get("item", {})
                print(f"Conversation item created: {item.get('type')}")
            elif event_type == "conversation.item.input_audio_transcription.completed":
                transcript = data.get("transcript", "")
                current_transcript = transcript
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "input_transcription",
                            "text": transcript,
                            "is_final": True,
                        }
                    )
                )
            elif event_type == "response.created":
                await websocket.send_text(
                    json.dumps(
                        {"type": "response_started", "message": "Generating response"}
                    )
                )
            elif event_type == "response.done":
                response = data.get("response", {})
                status = response.get("status")

                if status == "completed":
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "response_complete",
                                "message": "Translation complete",
                            }
                        )
                    )
                elif status == "failed":
                    await websocket.send_text(
                        json.dumps(
                            {"type": "error", "error": "Response generation failed"}
                        )
                    )
            elif event_type == "response.output_item.added":
                item = data.get("item", {})
                print(f"Output item added: {item.get('type')}")
            elif event_type == "response.content_part.added":
                part = data.get("part", {})
                print(f"Content part added: {part.get('type')}")
            elif event_type == "response.audio_transcript.delta":
                delta = data.get("delta", "")
                if not current_translation:
                    current_translation = delta
                else:
                    current_translation += delta
                await websocket.send_text(
                    json.dumps(
                        {"type": "translation_delta", "text": delta, "is_final": False}
                    )
                )
            elif event_type == "response.audio_transcript.done":
                transcript = data.get("transcript", "")
                current_translation = transcript
                await websocket.send_text(
                    json.dumps(
                        {"type": "translation", "text": transcript, "is_final": True}
                    )
                )
                print(f"Attempting to save real-time translation: transcript='{current_transcript[:50]}...', translation='{current_translation[:50]}...'")
                await save_realtime_translation()
            elif event_type == "response.audio.delta":
                audio_delta = data.get("delta", "")
                await websocket.send_text(
                    json.dumps({"type": "audio_delta", "audio": audio_delta})
                )
            elif event_type == "response.audio.done":
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "audio_complete",
                            "message": "Audio translation complete",
                        }
                    )
                )
            elif event_type == "response.text.delta":
                delta = data.get("delta", "")
                if not current_translation:
                    current_translation = delta
                else:
                    current_translation += delta
                await websocket.send_text(
                    json.dumps({"type": "text_delta", "text": delta, "is_final": False})
                )
            elif event_type == "response.text.done":
                text = data.get("text", "")
                current_translation = text
                await websocket.send_text(
                    json.dumps(
                        {"type": "text_response", "text": text, "is_final": True}
                    )
                )
                print(f"Attempting to save real-time translation (text): transcript='{current_transcript[:50]}...', translation='{current_translation[:50]}...'")
                await save_realtime_translation()
            elif event_type == "error":
                error = data.get("error", {})
                error_message = error.get("message", "Unknown error")
                error_code = error.get("code", "")

                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "error": (
                                f"{error_code}: {error_message}"
                                if error_code
                                else error_message
                            ),
                        }
                    )
                )
        except Exception as e:
            print(f"Error handling OpenAI response: {e}")
            import traceback

            traceback.print_exc()
            await websocket.send_text(
                json.dumps(
                    {"type": "error", "error": f"Error handling response: {str(e)}"}
                )
            )

    listen_task = asyncio.create_task(
        realtime_service.listen_for_responses(handle_openai_response)
    )

    try:
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type")

                if message_type == "config":
                    target_language = message.get("target_lang", "en")

                    if session_initialized:
                        await realtime_service.send_session_update(target_language)

                    await websocket.send_text(
                        json.dumps(
                            {"type": "config_updated", "target_lang": target_language}
                        )
                    )
                    print(f"Updated target language for real-time translation: {target_language}")
                elif message_type == "audio":
                    audio_data = message.get("data")
                    if audio_data:
                        try:
                            audio_bytes = base64.b64decode(audio_data)
                            await realtime_service.send_audio_chunk(audio_bytes)
                        except Exception as e:
                            print(f"Error processing audio chunk: {e}")
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "error",
                                        "error": f"Error processing audio: {str(e)}",
                                    }
                                )
                            )
                elif message_type == "commit":
                    await realtime_service.commit_audio_buffer()
                elif message_type == "start":
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "session_started",
                                "message": "Real-time translation session started",
                            }
                        )
                    )
                elif message_type == "stop":
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "session_stopped",
                                "message": "Real-time translation session stopped",
                            }
                        )
                    )
                    break
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"type": "error", "error": "Invalid JSON message"})
                )
    except WebSocketDisconnect:
        print("Client disconnected from realtime audio")
    except Exception as e:
        print(f"WebSocket error: {e}")
        import traceback

        traceback.print_exc()
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "error": f"Server error: {str(e)}"})
            )
        except:
            pass
    finally:
        if listen_task:
            listen_task.cancel()
            try:
                await listen_task
            except asyncio.CancelledError:
                pass
        await realtime_service.disconnect_realtime()


@router.get("/text/languages")
async def get_supported_languages():
    """Get list of supported languages - public endpoint"""
    return {"languages": translator_service.get_supported_languages()}


@router.get("/history")
async def get_translation_history(
    limit: int = 100,
    offset: int = 0,
    user_data: tuple[Dict[str, Any], str] = Depends(get_current_user_with_token)
):
    """Get translation history for the authenticated user"""
    current_user, access_token = user_data
    
    try:
        translations = await database_service.get_user_translations(
            user_id=current_user["sub"],
            access_token=access_token,
            limit=limit,
            offset=offset
        )
        return {"translations": translations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{translation_id}")
async def delete_translation(
    translation_id: str,
    user_data: tuple[Dict[str, Any], str] = Depends(get_current_user_with_token)
):
    """Delete a specific translation from history"""
    current_user, access_token = user_data
    
    try:
        success = await database_service.delete_translation(
            translation_id=translation_id,
            user_id=current_user["sub"],
            access_token=access_token
        )
        
        if not success:
            raise HTTPException(
                status_code=404, 
                detail="Translation not found or you don't have permission to delete it"
            )
        
        return {"message": "Translation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
