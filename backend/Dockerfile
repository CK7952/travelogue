FROM python:3.12-slim

# Install system dependencies for faster-whisper / ctranslate2 and audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download Whisper model if specified (optional build arg)
ARG WHISPER_MODEL=base
ENV WHISPER_MODEL=${WHISPER_MODEL}
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')" || true

# Expose port
EXPOSE 8000

# Entrypoint handles DB migrations then starts server
RUN chmod +x entrypoint.sh
CMD ["./entrypoint.sh"]
