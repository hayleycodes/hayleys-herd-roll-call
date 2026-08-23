FROM python:3.11-slim

# ffmpeg for RTSP frame grabs; libs OpenCV needs at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only torch first (much smaller than the default CUDA build),
# then the rest.
COPY requirements.txt .
RUN pip install --no-cache-dir \
      --extra-index-url https://download.pytorch.org/whl/cpu \
      -r requirements.txt

COPY . .

# Pre-download model weights into the image so boot doesn't fetch them.
RUN python -c "from ultralytics import YOLO; YOLO('yolov8s-worldv2.pt')" \
 && python -c "from transformers import AutoModel, AutoImageProcessor; \
AutoModel.from_pretrained('facebook/dinov2-small'); \
AutoImageProcessor.from_pretrained('facebook/dinov2-small')"

CMD ["python", "main.py"]
