import asyncio
import json
import base64
import websockets
from typing import Optional, Dict, Any, Callable
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.languages import get_language_name, is_supported_language


class OpenAIRealtimeAudioService:
    """Service for handling real-time audio processing using OpenAI Realtime API"""

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.realtime_ws = None
        self.target_language = None
        self.session_config = {
            "modalities": ["text", "audio"],
            "voice": "alloy",
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500,
            },
            "temperature": 0.8,
        }

    async def connect_realtime(self) -> bool:
        """Connect to OpenAI Realtime API"""
        try:
            url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"

            print(f"Attempting to connect to OpenAI Realtime API: {url}")
            print(f"Using API key: {settings.OPENAI_API_KEY[:20]}...")

            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1",
            }

            self.realtime_ws = await asyncio.wait_for(
                websockets.connect(url, additional_headers=headers), timeout=10.0
            )

            print("Successfully connected to OpenAI Realtime API")

            return True
        except asyncio.TimeoutError:
            print("Realtime API connection timed out after 10 seconds")
            return False
        except websockets.exceptions.InvalidStatusCode as e:
            print(f"Realtime API returned status code: {e.status_code}")
            if e.status_code == 401:
                print("Authentication failed - check your API key")
            elif e.status_code == 403:
                print("Access forbidden - Realtime API might require special access")
            elif e.status_code == 404:
                print("Endpoint not found - Realtime API might not be available")
            return False
        except Exception as e:
            print(f"Realtime API connection failed: {type(e).__name__}: {e}")
            import traceback

            traceback.print_exc()
            return False

    async def disconnect_realtime(self):
        """Disconnect from OpenAI Realtime API"""
        if self.realtime_ws:
            await self.realtime_ws.close()
            self.realtime_ws = None

    def _get_translation_instructions(self, target_language: str) -> str:
        """Get language-specific translation instructions"""
        target_lang_name = get_language_name(target_language) if target_language != "english" else target_language
        return f"""You are a real-time speech translator. When you hear speech in any language, immediately translate it to {target_lang_name} and speak the translation naturally. Do not explain, just translate and speak. Maintain the speaker's tone and emotion."""

    async def send_session_update(self, target_language: Optional[str] = "english"):
        """Update session configuration for real-time translation"""
        if not self.realtime_ws:
            return

        self.target_language = target_language

        instructions = self._get_translation_instructions(target_language)

        session_update = {
            "type": "session.update",
            "session": {**self.session_config, "instructions": instructions},
        }

        await self.realtime_ws.send(json.dumps(session_update))
        print(f"Sent session update for translation to: {target_language}")

    async def send_audio_chunk(self, audio_data: bytes):
        """Send audio chunk to Realtime API"""
        if not self.realtime_ws:
            return

        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        audio_message = {"type": "input_audio_buffer.append", "audio": audio_base64}

        await self.realtime_ws.send(json.dumps(audio_message))

    async def commit_audio_buffer(self):
        """Commit the audio buffer and request response"""
        if not self.realtime_ws:
            return

        commit_message = {"type": "input_audio_buffer.commit"}
        await self.realtime_ws.send(json.dumps(commit_message))
        print("Committed audio buffer")

        response_message = {
            "type": "response.create",
            "response": {
                "modalities": ["text", "audio"],
                "instructions": "Translate the speech you just heard and respond in audio.",
            },
        }
        await self.realtime_ws.send(json.dumps(response_message))
        print("Requested response from model")

    async def listen_for_responses(self, callback: Callable[[Dict[str, Any]], None]):
        """Listen for responses from OpenAI Realtime API"""
        if not self.realtime_ws:
            return

        try:
            async for message in self.realtime_ws:
                try:
                    data = json.loads(message)
                    event_type = data.get("type", "unknown")
                    print(f"Received from OpenAI: {event_type}")
                    await callback(data)
                except json.JSONDecodeError as e:
                    print(f"Failed to parse message: {e}")
        except websockets.exceptions.ConnectionClosed:
            print("OpenAI Realtime connection closed")
        except Exception as e:
            print(f"Error listening for responses: {e}")
            import traceback

            traceback.print_exc()


class AudioService:
    """Wrapper service for audio processing"""

    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.realtime_service = OpenAIRealtimeAudioService()

    async def process_audio_file(
        self, audio_data: bytes, target_language: Optional[str] = "english"
    ) -> Dict[str, str]:
        """Process uploaded audio file using OpenAI Whisper API"""
        try:
            import tempfile
            import os

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name

            try:
                with open(temp_file_path, "rb") as audio_file:
                    transcript = await self.openai_client.audio.transcriptions.create(
                        model="whisper-1", file=audio_file, response_format="text"
                    )

                transcribed_text = transcript.strip() if transcript else ""

                result = {"transcribed_text": transcribed_text}

                if target_language and transcribed_text:
                    from app.services.translator import TranslatorService

                    translator = TranslatorService()

                    translated_text = await translator.text_translate(
                        text=transcribed_text,
                        source_lang="auto",
                        target_lang=target_language,
                    )
                    result["translated_text"] = translated_text

                return result
            finally:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        except Exception as e:
            print(f"Error processing audio file: {e}")
            return {"error": str(e)}

    def get_realtime_service(self) -> OpenAIRealtimeAudioService:
        """Get the realtime audio service instance"""
        return self.realtime_service
