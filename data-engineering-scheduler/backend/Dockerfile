FROM apache/airflow:2.8.1-python3.11

USER root

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

USER airflow

CMD ["python", "run.py"]
