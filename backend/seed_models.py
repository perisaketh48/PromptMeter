import requests

BASE_URL = "https://promptmeter.onrender.com/api/v1/catalog/models/"

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc4MzA4NjY4LCJpYXQiOjE3NzgzMDc3NjgsImp0aSI6ImU5ZDVjYTVkYWY4ZjQ5ZDE5MjU2NTk0Y2E1MDNmYmY2IiwidXNlcl9pZCI6MiwiZW1haWwiOiJwZXJpc2FrZXRoNTQ1QGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX3N0YWZmIjp0cnVlfQ.VcARggGzyeui2FJTkZgT7Z-YeHJOlqIgP9LcxbLq0Eo"  # your token here

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

models = [
    # OpenAI
    {
        "provider": 1,
        "name": "gpt-4o",
        "slug": "gpt-4o",
        "input_price": 5,
        "output_price": 15,
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["chat", "vision"],
        "is_active": True
    },
    {
        "provider": 1,
        "name": "gpt-4o-mini",
        "slug": "gpt-4o-mini",
        "input_price": 0.15,
        "output_price": 0.6,
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["chat"],
        "is_active": True
    },

    # Anthropic
    {
        "provider": 2,
        "name": "claude-3-5-sonnet",
        "slug": "claude-3-5-sonnet",
        "input_price": 3,
        "output_price": 15,
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["chat"],
        "is_active": True
    },

    # Gemini
    {
        "provider": 3,
        "name": "gemini-1.5-pro",
        "slug": "gemini-1.5-pro",
        "input_price": 3.5,
        "output_price": 10,
        "context_window": 1000000,
        "max_output_tokens": 8192,
        "capabilities": ["chat", "vision"],
        "is_active": True
    },

    # Mistral
    {
        "provider": 5,
        "name": "mistral-large",
        "slug": "mistral-large",
        "input_price": 2,
        "output_price": 6,
        "context_window": 32000,
        "max_output_tokens": 4096,
        "capabilities": ["chat"],
        "is_active": True
    },
]

for model in models:
    response = requests.post(BASE_URL, json=model, headers=headers)

    if response.status_code in [200, 201]:
        print(f"✅ Added: {model['name']}")
    else:
        print(f"❌ Failed: {model['name']}")
        print(response.json())