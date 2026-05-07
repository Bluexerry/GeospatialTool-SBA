FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=app.py

EXPOSE 5005

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5005", "app:app"]
