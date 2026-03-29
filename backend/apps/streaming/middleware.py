from urllib.parse import parse_qs
from channels.db import database_sync_to_async

@database_sync_to_async
def get_user(token_key):
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from apps.users.models import CustomUser
        token = AccessToken(token_key)
        user_id = token['user_id']
        user = CustomUser.objects.get(id=user_id)
        return user
    except Exception as e:
        import logging
        logger = logging.getLogger('apps.streaming')
        logger.warning(f"[Auth] Token validation failed: {str(e)}")
        from django.contrib.auth.models import AnonymousUser
        return AnonymousUser()

class TokenAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        # Use parse_qs to correctly handle JWT tokens with '=' padding in base64
        params = parse_qs(query_string)
        token_key = params.get('token', [None])[0]

        if token_key and token_key not in ('undefined', 'null'):
            scope['user'] = await get_user(token_key)
        else:
            from django.contrib.auth.models import AnonymousUser
            scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)
