"""Security utilities for JWT tokens and encryption."""

from datetime import datetime, timedelta
from typing import Optional

from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.logger import get_logger

logger = get_logger(__name__)

# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    data: dict,
    secret_key: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Payload data to encode (should include 'sub' for user identifier)
        secret_key: Secret key for signing the token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })

    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    logger.info(f"Created JWT token for user: {data.get('sub', 'unknown')}")

    return encoded_jwt


def verify_token(token: str, secret_key: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string
        secret_key: Secret key for verification

    Returns:
        Decoded payload dict if valid, None if invalid or expired
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])

        # Check if token is expired
        exp = payload.get("exp")
        if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
            logger.warning("Token has expired")
            return None

        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        return None


def encrypt_data(data: str, encryption_key: str) -> str:
    """
    Encrypt data using Fernet symmetric encryption.

    Args:
        data: Plain text data to encrypt
        encryption_key: Fernet encryption key

    Returns:
        Encrypted data as string
    """
    try:
        f = Fernet(encryption_key.encode())
        encrypted = f.encrypt(data.encode())
        return encrypted.decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise


def decrypt_data(encrypted_data: str, encryption_key: str) -> str:
    """
    Decrypt data using Fernet symmetric encryption.

    Args:
        encrypted_data: Encrypted data string
        encryption_key: Fernet encryption key

    Returns:
        Decrypted plain text data
    """
    try:
        f = Fernet(encryption_key.encode())
        decrypted = f.decrypt(encrypted_data.encode())
        return decrypted.decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise


def encrypt_api_credentials(
    api_id: int,
    api_hash: str,
    encryption_key: str
) -> tuple[str, str]:
    """
    Encrypt Telegram API credentials.

    Args:
        api_id: Telegram API ID
        api_hash: Telegram API Hash
        encryption_key: Fernet encryption key

    Returns:
        Tuple of (encrypted_api_id, encrypted_api_hash)
    """
    encrypted_id = encrypt_data(str(api_id), encryption_key)
    encrypted_hash = encrypt_data(api_hash, encryption_key)

    logger.info("API credentials encrypted successfully")
    return encrypted_id, encrypted_hash


def decrypt_api_credentials(
    encrypted_api_id: str,
    encrypted_api_hash: str,
    encryption_key: str
) -> tuple[int, str]:
    """
    Decrypt Telegram API credentials.

    Args:
        encrypted_api_id: Encrypted API ID string
        encrypted_api_hash: Encrypted API Hash string
        encryption_key: Fernet encryption key

    Returns:
        Tuple of (api_id, api_hash)
    """
    api_id = int(decrypt_data(encrypted_api_id, encryption_key))
    api_hash = decrypt_data(encrypted_api_hash, encryption_key)

    return api_id, api_hash


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to check against

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)
