import requests, json, time

BASE = "http://localhost:80/api/v1"
r = requests.post(f"{BASE}/auth/login", json={"email":"test@analystaff.com","password":"password123"})
token = r.json().get("access_token","")
print(f"Login: {r.status_code} — token {token[:20]}...")

H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
url = f"{BASE}/clubs/1/ai/actions/SUGGEST_LINEUP"

print(f"Sending 105 requests to {url}...")
for i in range(1, 106):
    r = requests.post(url, json={"context": {"test": True}}, headers=H)
    if r.status_code == 429:
        print(f"REQ {i}: BLOCKED (429) — {r.json().get('detail','')}")
        break
    elif r.status_code == 503:
        print(f"REQ {i}: 503 — skipping")
    elif i % 10 == 1:
        print(f"REQ {i}: {r.status_code}")
print("Done.")
