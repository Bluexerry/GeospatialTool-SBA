# Usar una imagen base de Python
FROM python:3.10


# Instalar dependencias del sistema para Google Cloud SDK
RUN apt-get update && apt-get install -y curl gcc python3-dev apt-transport-https ca-certificates gnupg

# Descargar e instalar la Google Cloud SDK
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg  add -
RUN apt-get update && apt-get install -y google-cloud-sdk && apt-get install -y jq

# RUN apt-get update && apt-get install -y jq  # Install jq (if needed)  # Optional for JSON parsing

# To enable Google Earth Engine, mount your service account key JSON at runtime:
# docker run -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/gee-key.json \
#            -v /path/to/key.json:/secrets/gee-key.json ...
# Or set GOOGLE_APPLICATION_CREDENTIALS in server/.env
ENV FLASK_APP=app.py

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos de requisitos y instalar las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto en el que se ejecutará el servicio
EXPOSE 5004

# Comando para ejecutar la aplicación
CMD ["flask", "run", "--host=0.0.0.0", "--port=5004"]