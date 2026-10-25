FROM python:3.11-slim

WORKDIR /app

# Both scrapers are plain HTTPS API clients — no browser or system packages needed
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Railway overrides this with `python -m app.main --once` (see railway.toml)
CMD ["python", "-m", "app.main"]
