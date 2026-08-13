"""
Rate limiting applicatif (ZG-4 : slowapi).

Nginx assure la première ligne de défense (voir nginx/nginx.conf),
slowapi protège finement les endpoints sensibles côté application.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Clé = adresse IP du client. Suffisant pour le V0.
limiter = Limiter(key_func=get_remote_address)