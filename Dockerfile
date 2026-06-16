FROM python:3.9-slim-bookworm

WORKDIR /app

# Install system dependencies required for OpenCV, DeepFace, etc.
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them
COPY ai-models/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the AI model and server files
COPY ai-models/ /app/

# Hugging Face Spaces expose port 7860 by default
EXPOSE 7860

# Run the Flask API using Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:7860", "-w", "1", "--timeout", "120", "ai_server:app"]
