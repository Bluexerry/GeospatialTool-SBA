FROM python:3.10

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

ENV FLASK_APP=app.py

EXPOSE 5002

CMD ["flask", "run", "--host=0.0.0.0", "--port=5002"]