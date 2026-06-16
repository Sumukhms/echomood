# Use official slim Python runtime
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies needed for OpenCV, librosa, and ffmpeg
RUN apt-get update --allow-releaseinfo-change -y || true
RUN apt-get install -y --no-install-recommends --fix-missing \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install python packages
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose port 7860 (required by Hugging Face Spaces)
EXPOSE 7860

# Start Flask with Gunicorn production WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "ai_server:app", "--timeout", "120"]
