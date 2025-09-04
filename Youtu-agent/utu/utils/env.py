import importlib.metadata
import os
import pathlib

from dotenv import find_dotenv, load_dotenv

# Load .env from the root directory (parent of Youtu-agent)
root_env_path = pathlib.Path(__file__).parent.parent.parent.parent / '.env'
if root_env_path.exists():
    env_file = str(root_env_path)
    load_dotenv(env_file, verbose=True, override=True)
else:
    # Fallback to find_dotenv if root .env doesn't exist
    env_file = find_dotenv(raise_error_if_not_found=False)
    if env_file:
        load_dotenv(env_file, verbose=True, override=True)


class EnvUtils:
    @staticmethod
    def get_env(key: str, default: str | None = None) -> str | None:
        if default is None:
            res = os.getenv(key)
            if not res:
                raise ValueError(f"Environment variable {key} is not set")
            return res
        return os.getenv(key, default)

    @staticmethod
    def assert_env(key: str | list[str]) -> None:
        if isinstance(key, list):
            for k in key:
                EnvUtils.assert_env(k)
        else:
            if not os.getenv(key):
                raise ValueError(f"Environment variable {key} is not set")

    @staticmethod
    def ensure_package(package_name: str) -> None:
        try:
            importlib.metadata.version(package_name)
        except importlib.metadata.PackageNotFoundError:
            raise ValueError(f"Package {package_name} is required but not installed!") from None
