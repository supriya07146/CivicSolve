import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or promote the admin user from environment variables."

    def handle(self, *args, **options):
        User = get_user_model()

        email = os.getenv("ADMIN_EMAIL", "").lower().strip()
        password = os.getenv("ADMIN_PASSWORD", "")

        if not email or not password:
            self.stdout.write("ADMIN_EMAIL / ADMIN_PASSWORD not set. Skipping.")
            return

        user = User.objects.filter(email=email).first()

        if user is None:
            user = User(
                email=email,
                full_name="CivicSolve Admin",
                phone="0000000000",
            )

        user.role = "admin"
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.email_verified = True
        user.set_password(password)
        user.save()

        self.stdout.write(f"Admin ready: {email}")