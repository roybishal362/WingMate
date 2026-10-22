# Free neural voiceover with edge-tts (falls back to Windows SAPI if unavailable).
import asyncio, json, os, subprocess, sys

texts = json.load(open("narration.json", encoding="utf8"))
os.makedirs("audio", exist_ok=True)
VOICE = os.environ.get("VOICE", "en-US-AndrewNeural")

async def edge(name, text):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate="+6%").save(f"audio/{name}.mp3")

def sapi(name, text):
    safe = text.replace("'", "''")
    ps = (
        "Add-Type -AssemblyName System.Speech;"
        "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;$s.Rate=1;"
        f"$s.SetOutputToWaveFile('audio/{name}.wav');$s.Speak('{safe}');$s.Dispose()"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)

async def main():
    for name, text in texts.items():
        try:
            await edge(name, text)
            print("edge", name)
        except Exception as e:
            print("sapi fallback", name, e)
            sapi(name, text)

asyncio.run(main())
