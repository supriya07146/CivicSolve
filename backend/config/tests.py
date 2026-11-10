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

    def test_save_uses_media_type_and_records_it_in_cloudinary_id(self):
        cases = [
            ("problem_attachments/photo.jpg", "image"),
            ("problem_attachments/clip.mp4", "video"),
            ("organization_documents/certificate.pdf", "raw"),
        ]

        for filename, resource_type in cases:
            with self.subTest(resource_type=resource_type):
                with patch(
                    "config.storage.cloudinary.uploader.upload",
                    return_value={
                        "public_id": (
                            f"problem_attachments/__{resource_type}__/asset"
                        )
                    },
                ) as upload:
                    saved_name = self.storage._save(
                        filename,
                        ContentFile(b"test media"),
                    )

                self.assertIn(f"__{resource_type}__", saved_name)
                self.assertEqual(
                    upload.call_args.kwargs["resource_type"],
                    resource_type,
                )
                self.assertEqual(
                    upload.call_args.kwargs["folder"],
                    f"{filename.rsplit('/', 1)[0]}/__{resource_type}__",
                )

    def test_url_uses_the_resource_type_in_the_saved_id(self):
        with patch(
            "config.storage.cloudinary.CloudinaryResource"
        ) as resource:
            resource.return_value.url = (
                "https://res.cloudinary.com/test-cloud/image/upload/photo"
            )

            url = self.storage.url(
                "problem_attachments/__image__/photo"
            )

        self.assertIn("cloudinary.com", url)
        resource.assert_called_once_with(
            "problem_attachments/__image__/photo",
            default_resource_type="image",
        )
