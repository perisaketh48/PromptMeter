"""Authentication, profile, and password endpoints."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Profile
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Create a new account and return both user and tokens."""

    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AnonRateThrottle, ScopedRateThrottle)
    throttle_scope = "auth_register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = LoginSerializer.get_token(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Obtain an access/refresh pair using email + password."""

    serializer_class = LoginSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AnonRateThrottle, ScopedRateThrottle)
    throttle_scope = "auth_login"


class LogoutView(APIView):
    """Blacklist a refresh token, ending the session."""

    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """Return or update the authenticated user's own record."""

    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ("get", "patch", "head", "options")

    def get_object(self):
        return self.request.user


class ProfileView(generics.RetrieveUpdateAPIView):
    """Return or update the authenticated user's profile."""

    serializer_class = ProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ("get", "patch", "put", "head", "options")

    def get_object(self):
        profile, _created = Profile.objects.get_or_create(user=self.request.user)
        return profile


class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )
