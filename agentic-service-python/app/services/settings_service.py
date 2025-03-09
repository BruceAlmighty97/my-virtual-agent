
from pydantic_settings import BaseSettings

class SettingsService(BaseSettings):
    LANGSMITH_API_KEY: str = "abcd"
    OPENAI_API_KEY: str = "abcd"
    MY_VIRTUAL_AGENT_API_KEY: str = "abcd"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: str = "6379"