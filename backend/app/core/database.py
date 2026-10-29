import os
import sys
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ai_career_coach")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_career_coach")

_client = None
_db = None

def get_db():
    """
    Returns the MongoDB database instance.
    Tests connection on startup, raises clear error messages, and creates indexes.
    """
    global _client, _db
    if _db is not None:
        return _db

    # Clean display URI for logging (hiding password)
    display_uri = MONGODB_URI
    if "@" in MONGODB_URI:
        parts = MONGODB_URI.split("@")
        prefix = parts[0].split("://")
        display_uri = f"{prefix[0]}://****:****@{parts[-1]}"

    try:
        import certifi
        logger.info(f"Connecting to MongoDB: {display_uri}")
        # Use serverSelectionTimeoutMS to fail fast if DB is down, and certifi for TLS CA authority
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
        
        # Ping the admin database to verify connection
        _client.admin.command("ping")
        _db = _client[DATABASE_NAME]
        
        logger.info("Successfully connected to MongoDB Atlas / Server.")
        
        # Ensure critical database indexes
        _db.users.create_index("email", unique=True)
        _db.resources.create_index("category")
        _db.resources.create_index("tags")
        _db.resources.create_index("status")
        _db.resources.create_index("creator_id")
        _db.purchases.create_index("user_id")
        _db.purchases.create_index("resource_id")
        _db.interviews.create_index("user_id")
        _db.learning_progress.create_index("user_id")
        _db.roadmaps.create_index("user_id")
        
        logger.info("Successfully verified and created database indexes.")
        return _db

    except ConnectionFailure as e:
        msg = (
            f"\n"
            f"========================================================================\n"
            f"DATABASE CONNECTION FAILURE:\n"
            f"Could not connect to MongoDB at: {display_uri}\n"
            f"Error details: {e}\n"
            f"========================================================================\n"
            f"Please verify:\n"
            f"1. Your local MongoDB instance is running, OR\n"
            f"2. Your MongoDB Atlas cluster connection URI is correct, and\n"
            f"3. Your IP address is whitelisted in MongoDB Atlas Network Access.\n"
            f"========================================================================\n"
        )
        logger.error(msg)
        print(msg, file=sys.stderr)
        raise ConnectionFailure(msg) from e
    except ConfigurationError as e:
        msg = (
            f"\n"
            f"========================================================================\n"
            f"DATABASE CONFIGURATION ERROR:\n"
            f"Your MONGODB_URI environment variable is misconfigured: {e}\n"
            f"========================================================================\n"
        )
        logger.error(msg)
        print(msg, file=sys.stderr)
        raise ConfigurationError(msg) from e
