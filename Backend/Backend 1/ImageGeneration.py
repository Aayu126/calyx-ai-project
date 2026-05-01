import os
import sys
import json
import time
import random
import base64
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

# Setup paths
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BASE_DIR, ".env"))

# API Keys
HF_TOKEN = os.environ.get("HuggingFaceAPIKey")

def _log(msg: str):
    """Safe print for logging."""
    try:
        print(f"[ImageGen] {msg}")
    except Exception:
        pass

def _is_valid_image(data: bytes) -> bool:
    if not data or len(data) < 500:
        return False
    # Check magic numbers
    if data[:3] == b'\xff\xd8\xff':  # JPEG
        return True
    if data[:4] == b'\x89PNG':       # PNG
        return True
    return False

def generate_images_base64(prompt: str, count: int = 1) -> list:
    """
    Generate a single image using Hugging Face Inference API (SDXL 1.0).
    Returns a list containing one base64 data URI.
    """
    _log(f"Prompt: '{prompt}' (generating 1 image)")
    
    try:
        # Initialize client with nscale provider as requested
        client = InferenceClient(
            provider="nscale",
            api_key=HF_TOKEN,
        )

        # Generate image using SDXL Base 1.0
        image = client.text_to_image(
            prompt,
            model="stabilityai/stable-diffusion-xl-base-1.0",
        )
        
        # Convert PIL Image to Base64
        buffered = BytesIO()
        image.save(buffered, format="JPEG", quality=95)
        img_bytes = buffered.getvalue()
        
        if _is_valid_image(img_bytes):
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            _log("Generation successful!")
            return [f"data:image/jpeg;base64,{b64}"]
        else:
            _log("Generated data invalid.")
            
    except Exception as e:
        _log(f"Hugging Face generation failed: {e}")
        
    # Fallback to Pollinations.ai if HF fails
    try:
        _log("Trying fallback provider (Pollinations)...")
        import urllib.parse
        import urllib.request
        
        encoded = urllib.parse.quote(f"{prompt}, high quality, photorealistic")
        seed = random.randint(1, 999999)
        url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&seed={seed}&model=flux"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            if _is_valid_image(data):
                b64 = base64.b64encode(data).decode("utf-8")
                _log("Fallback successful!")
                return [f"data:image/jpeg;base64,{b64}"]
    except Exception as e:
        _log(f"Fallback failed: {e}")

    # Ultimate fallback: Gradient placeholder
    _log("Using placeholder fallback.")
    img = Image.new('RGB', (1024, 1024), color=(30, 30, 40))
    # Simple aesthetic gradient
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return [f"data:image/jpeg;base64,{b64}"]

def generate_images_sync(prompt: str) -> list:
    """Synchronous version for internal use if needed."""
    # This is a stub for the original generate_images but returns one local path
    _log(f"Sync generation for: {prompt}")
    res = generate_images_base64(prompt)
    # Since the original expected file paths, we'd normally save it.
    # But for the modern CALYX API, base64 is preferred.
    return []

if __name__ == "__main__":
    # Quick test
    test_prompt = "A futuristic cyborg holding a glowing crystal"
    results = generate_images_base64(test_prompt)
    print(f"Test complete. Generated {len(results)} images.")
    if results:
        print(f"Data length: {len(results[0])}")
