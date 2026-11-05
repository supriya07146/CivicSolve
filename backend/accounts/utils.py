import hashlib
import secrets

from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone


OTP_EXPIRY_MINUTES = 10
RESET_TOKEN_EXPIRY_MINUTES = 10
MAX_OTP_ATTEMPTS = 5


def generate_otp():
    """
    Generate a secure 6-digit OTP.
    """
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_reset_token():
    """
    Generate a secure password reset token.
    """
    return secrets.token_urlsafe(48)


def hash_token(value):
    """
    SHA-256 hash for reset tokens.
    """
    return hashlib.sha256(
        value.encode("utf-8")
    ).hexdigest()


def otp_expiry():
    return timezone.now() + timedelta(
        minutes=OTP_EXPIRY_MINUTES
    )


def reset_token_expiry():
    return timezone.now() + timedelta(
        minutes=RESET_TOKEN_EXPIRY_MINUTES
    )


def create_otp_hash(otp):
    return make_password(otp)


def send_email(
    subject,
    recipient,
    text_content,
    html_content
):

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )

    email.attach_alternative(
        html_content,
        "text/html"
    )

    email.send(
        fail_silently=False
    )


def send_registration_otp(
    email,
    name,
    otp,
    account_type
):

    subject = "Verify your CivicSolve account"

    text = f"""
Hello {name},

Welcome to CivicSolve.

Your {account_type} verification code is:

{otp}

This OTP is valid for {OTP_EXPIRY_MINUTES} minutes.

If you did not create this account, please ignore this email.

Regards,
CivicSolve Team
"""

    html = f"""
<!DOCTYPE html>
<html>
<body>

<h2>Welcome to CivicSolve</h2>

<p>Hello <strong>{name}</strong>,</p>

<p>
Thank you for registering as a
<strong>{account_type}</strong>.
</p>

<p>Your verification code is:</p>

<h1>{otp}</h1>

<p>
This OTP will expire in
<strong>{OTP_EXPIRY_MINUTES} minutes</strong>.
</p>

<p>
If you did not create this account,
you can safely ignore this email.
</p>

<p>
Regards,<br>
<strong>CivicSolve Team</strong>
</p>

</body>
</html>
"""

    send_email(
        subject,
        email,
        text,
        html
    )


def send_password_reset_otp(
    email,
    name,
    otp
):

    subject = "CivicSolve password reset code"

    text = f"""
Hello {name},

We received a request to reset your CivicSolve password.

Your verification code is:

{otp}

This OTP is valid for {OTP_EXPIRY_MINUTES} minutes.

If you did not request a password reset,
please ignore this email.

Regards,
CivicSolve Team
"""

    html = f"""
<!DOCTYPE html>
<html>
<body>

<h2>Password Reset</h2>

<p>Hello <strong>{name}</strong>,</p>

<p>
We received a request to reset your CivicSolve password.
</p>

<p>Your verification code is:</p>

<h1>{otp}</h1>

<p>
This OTP expires in
<strong>{OTP_EXPIRY_MINUTES} minutes</strong>.
</p>

<p>
If you did not request this password reset,
you can safely ignore this email.
</p>

<p>
Regards,<br>
<strong>CivicSolve Team</strong>
</p>

</body>
</html>
"""

    send_email(
        subject,
        email,
        text,
        html
    )


def send_welcome_email(
    email,
    name,
    account_type
):

    subject = "Welcome to CivicSolve!"

    text = f"""
Hello {name},

Welcome to CivicSolve!

Your {account_type} account has been successfully verified.

You can now log in and use CivicSolve.

Report Problems.
Collaborate on Solutions.
Create Impact.

Regards,
CivicSolve Team
"""

    html = f"""
<!DOCTYPE html>
<html>
<body>

<h2>Welcome to CivicSolve!</h2>

<p>Hello <strong>{name}</strong>,</p>

<p>
Your <strong>{account_type}</strong> account
has been successfully verified.
</p>

<p>
You can now log in and start using CivicSolve.
</p>

<h3>
Report Problems. Collaborate on Solutions. Create Impact.
</h3>

<p>
Regards,<br>
<strong>CivicSolve Team</strong>
</p>

</body>
</html>
"""

    send_email(
        subject,
        email,
        text,
        html
    )


def send_organization_approval_email(
    email,
    organization_name
):

    subject = "Your CivicSolve organization has been approved"

    text = f"""
Hello {organization_name},

Good news!

Your CivicSolve organization account has been approved
by the CivicSolve administration team.

You can now log in and start responding to community problems.

Regards,
CivicSolve Team
"""

    html = f"""
<!DOCTYPE html>
<html>
<body>

<h2>Organization Approved</h2>

<p>
Hello <strong>{organization_name}</strong>,
</p>

<p>
Good news!
</p>

<p>
Your CivicSolve organization account has been
approved by the administration team.
</p>

<p>
You can now log in and start responding
to community problems.
</p>

<p>
Regards,<br>
<strong>CivicSolve Team</strong>
</p>

</body>
</html>
"""

    send_email(
        subject,
        email,
        text,
        html
    )