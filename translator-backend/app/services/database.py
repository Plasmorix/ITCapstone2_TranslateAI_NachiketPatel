from typing import Dict, Any, Optional
from supabase import create_client, Client
from supabase.client import ClientOptions
from app.core.config import settings
import uuid
from datetime import datetime


class DatabaseService:
    """Service for handling database operations with Supabase"""

    def __init__(self):
        self.base_supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY
        )
    
    def get_authenticated_client(self, access_token: str) -> Client:
        """Get a Supabase client authenticated with the user's JWT token"""

        options = ClientOptions()
        options.headers = {"Authorization": f"Bearer {access_token}"}
        
        supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
            options=options
        )
        return supabase

    async def save_translation(
        self,
        user_id: str,
        input_text: str,
        output_text: str,
        source_lang: Optional[str],
        target_lang: str,
        modality: str,
        access_token: str
    ) -> Dict[str, Any]:
        """Save a translation record to the database"""
        try:
            supabase = self.get_authenticated_client(access_token)
            
            translation_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "input_text": input_text,
                "output_text": output_text,
                "source_lang": source_lang if source_lang != "auto" else None,
                "target_lang": target_lang,
                "modality": modality,
                "created_at": datetime.utcnow().isoformat()
            }

            result = supabase.table("translations").insert(translation_data).execute()
            
            if result.data:
                return result.data[0]
            else:
                raise Exception("Failed to save translation")
                
        except Exception as e:
            print(f"Error saving translation: {e}")
            raise e

    async def get_user_translations(
        self,
        user_id: str,
        access_token: str,
        limit: int = 100,
        offset: int = 0
    ) -> list:
        """Get translations for a specific user"""
        try:
            supabase = self.get_authenticated_client(access_token)
            
            result = supabase.table("translations")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .offset(offset)\
                .execute()
            
            return result.data or []
                
        except Exception as e:
            print(f"Error fetching user translations: {e}")
            raise e

    async def delete_translation(
        self,
        translation_id: str,
        user_id: str,
        access_token: str
    ) -> bool:
        """Delete a translation record (only if it belongs to the user)"""
        try:
            supabase = self.get_authenticated_client(access_token)
            
            result = supabase.table("translations")\
                .delete()\
                .eq("id", translation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return len(result.data) > 0
                
        except Exception as e:
            print(f"Error deleting translation: {e}")
            raise e