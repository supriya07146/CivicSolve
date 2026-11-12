from unittest.mock import patch

from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings

from .storage import CloudinaryMediaStorage


@override_settings(
    CLOUDINARY_CLOUD_NAME="test-cloud",
    CLOUDINARY_API_KEY="test-key",
    CLOUDINARY_API_SECRET="test-secret",
)
class CloudinaryMediaStorageTests(SimpleTestCase):
    def setUp(self):
        self.storage = CloudinaryMediaStorage()

    def test_unique_names_preserve_upload_directory_and_extension(self):
        first = self.storage.get_available_name(
            "problem_attachments/photo.JPG"
        )
        second = self.storage.get_available_name(
            "problem_attachments/photo.JPG"
        )

        self.assertNotEqual(first, second)
        self.assertTrue(first.startswith("problem_attachments/"))
        self.assertTrue(first.endswith(".jpg"))

    def test_save_uses_media_type_without_marker_directories(self):
        cases = [
            (
                "problem_attachments/photo.jpg",
                "image",
                "problem_attachments/photo",
                "https://res.cloudinary.com/test-cloud/image/upload/"
                "v123/problem_attachments/photo.jpg",
                "v123/problem_attachments/photo.jpg",
            ),
            (
                "problem_attachments/clip.mp4",
                "video",
                "problem_attachments/clip",
                "https://res.cloudinary.com/test-cloud/video/upload/"
                "v123/problem_attachments/clip.mp4",
                "v123/problem_attachments/clip.mp4",
            ),
            (
                "organization_documents/certificate.pdf",
                "raw",
                "organization_documents/certificate.pdf",
                "https://res.cloudinary.com/test-cloud/raw/upload/"
                "v123/organization_documents/certificate.pdf",
                "v123/organization_documents/certificate.pdf",
            ),
        ]

        for filename, resource_type, public_id, secure_url, stored_name in cases:
            with self.subTest(resource_type=resource_type):
                with patch(
                    "config.storage.cloudinary.uploader.upload",
                    return_value={
                        "public_id": public_id,
                        "secure_url": secure_url,
                    },
                ) as upload:
                    saved_name = self.storage._save(
                        filename,
                        ContentFile(b"test media"),
                    )

                self.assertEqual(saved_name, stored_name)
                self.assertEqual(
                    upload.call_args.kwargs["resource_type"],
                    resource_type,
                )
                self.assertEqual(
                    upload.call_args.kwargs["public_id"],
                    public_id,
                )
                self.assertNotIn("folder", upload.call_args.kwargs)

    def test_url_uses_version_from_cloudinary_upload_url(self):
        self.assertEqual(
            self.storage.url("v123/problem_drafts/photo.jpg"),
            "https://res.cloudinary.com/test-cloud/image/upload/"
            "v123/problem_drafts/photo.jpg",
        )

    def test_delete_uses_public_id_from_versioned_storage_name(self):
        with patch(
            "config.storage.cloudinary.uploader.destroy",
            return_value={"result": "ok"},
        ) as destroy:
            self.storage.delete("v123/problem_drafts/photo.jpg")

        self.assertEqual(destroy.call_args.args[0], "problem_drafts/photo")
        self.assertEqual(
            destroy.call_args.kwargs["resource_type"],
            "image",
        )

    def test_url_does_not_add_a_nonexistent_default_version(self):
        url = self.storage.url(
            "problem_drafts/photo.jpg"
        )

        self.assertEqual(
            url,
            "https://res.cloudinary.com/test-cloud/image/upload/"
            "problem_drafts/photo.jpg",
        )
