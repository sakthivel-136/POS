from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import create_client, Client
import re
import supabase._sync.client as supabase_client_mod

original_match = re.match
def mock_match(pattern, string, flags=0):
    if string and (string.startswith("sb_") or "ey" in string):
        return True
    return original_match(pattern, string, flags)
supabase_client_mod.re.match = mock_match

class Settings(BaseSettings):
    secret_key: str = "sakthi_spices_super_secret_jwt_key_please_change_in_production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 365 # 1 year expiration to keep them logged in
    
    # Supabase config
    supabase_url: str = ""
    supabase_secret_key: str = ""
    supabase_jwks_url: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

supabase_client: Client = create_client(settings.supabase_url, settings.supabase_secret_key)

def get_supabase():
    return supabase_client
