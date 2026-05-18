
from faster_whisper import WhisperModel
model = WhisperModel("Systran/faster-distil-whisper-large-v3")
segments, info = model.transcribe("/Users/gustavos/Documents/beta-8links/scripts/temp/d2fb79f5-6f30-4791-85ed-33b1ca8f9d92.wav", language="pt", beam_size=5)
text = " ".join([s.text for s in segments])
print(text)
