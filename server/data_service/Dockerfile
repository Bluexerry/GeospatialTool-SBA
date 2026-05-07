FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

ENV FLASK_APP=app.py

EXPOSE 5002

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5002", "app:app"]