import pygame
import random
import asyncio
import edge_tts
import os
from dotenv import dotenv_values

try:
    from langdetect import detect
except ImportError:
    detect = lambda text: 'en'

# Voice mapping for supported languages
VOICE_MAP = {
    'en': 'en-US-JennyNeural',
    'es': 'es-ES-ElviraNeural',
    'fr': 'fr-FR-DeniseNeural',
    'de': 'de-DE-KatjaNeural',
    'hi': 'hi-IN-SwaraNeural',
    'mr': 'mr-IN-AarohiNeural',
    'ja': 'ja-JP-NanamiNeural',
}

def get_voice_for_text(text):
    try:
        lang = detect(text)
        return VOICE_MAP.get(lang, 'en-US-JennyNeural')
    except:
        return 'en-US-JennyNeural'

# Get absolute path to project root (Elon - Copy directory)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, "Data 1")
_SPEECH_PATH = os.path.join(_DATA_DIR, "speech.mp3")

# Ensure data directory exists
os.makedirs(_DATA_DIR, exist_ok=True)

# Use os.environ instead of .env file for production
AssistantVoice = os.environ.get("AssistantVoice", "en-US-JennyNeural")



async def list_available_voices():
    voices = await edge_tts.list_voices()
    print("\nAvailable voices:")
    for voice in voices:
        print(f"- {voice['ShortName']}: {voice['Locale']} ({voice['Gender']})")
    return voices


async def TextToAudioFile(text) -> None:
    try:
        if os.path.exists(_SPEECH_PATH):
            os.remove(_SPEECH_PATH)

        voice = get_voice_for_text(str(text))

        communicate = edge_tts.Communicate(
            text=str(text),
            voice=voice,
            pitch='+5Hz',
            rate='+13%'
        )
        print(f"Using voice: {voice}")
        await communicate.save(_SPEECH_PATH)

    except Exception as e:
        print(f"Error in TextToAudioFile: {e}")
        raise


async def generate_audio_to_file(text, output_path=None):
    """Generate TTS audio and save to a specific path. Returns the file path."""
    if output_path is None:
        output_path = _SPEECH_PATH

    try:
        if os.path.exists(output_path):
            os.remove(output_path)

        voice = get_voice_for_text(str(text))
        communicate = edge_tts.Communicate(
            text=str(text),
            voice=voice,
            pitch='+5Hz',
            rate='+13%'
        )
        await communicate.save(output_path)
        return output_path
    except Exception as e:
        print(f"Error generating audio: {e}")
        raise


def generate_audio_bytes(text):
    """Synchronous function that generates TTS audio and returns the MP3 bytes."""
    import tempfile
    tmp_path = os.path.join(_DATA_DIR, "tts_temp.mp3")
    asyncio.run(generate_audio_to_file(text, tmp_path))
    with open(tmp_path, "rb") as f:
        audio_data = f.read()
    try:
        os.remove(tmp_path)
    except:
        pass
    return audio_data


def TTS(Text, func=lambda r=None: True):
    while True:
        try:
            asyncio.run(TextToAudioFile(str(Text)))

            pygame.mixer.init()
            pygame.mixer.music.load(_SPEECH_PATH)
            pygame.mixer.music.play()

            while pygame.mixer.music.get_busy():
                if func() == False:
                    break
                pygame.time.Clock().tick(10)
            return True

        except Exception as e:
            print(f"Error in TTS: {e}")
            return False

        finally:
            try:
                func(False)
                pygame.mixer.music.stop()
                pygame.mixer.quit()
            except Exception as e:
                print(f"Error in finally block: {e}")


def TextToSpeech(Text, func=lambda r=None: True):
    Data = str(Text).split(".")

    responses = [
        "The rest of the result has been printed to the chat screen, kindly check it out sir.",
        "The rest of the text is now on the chat screen, sir, please check it.",
        "You can see the rest of the text on the chat screen, sir.",
        "The remaining part of the text is now on the chat screen, sir.",
        "Sir, you'll find more text on the chat screen for you to see.",
        "The rest of the answer is now on the chat screen, sir.",
        "Sir, please look at the chat screen, the rest of the answer is there.",
        "You'll find the complete answer on the chat screen, sir.",
        "The next part of the text is on the chat screen, sir.",
        "Sir, please check the chat screen for more information.",
    ]

    if len(Data) > 4 and len(Text) >= 250:
        TTS(" ".join(Text.split(".")[0:2]) + ". " + random.choice(responses), func)
    else:
        TTS(Text, func)


if __name__ == "__main__":
    while True:
        TextToSpeech(input("Enter the text: "))
 