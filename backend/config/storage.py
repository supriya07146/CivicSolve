import os
import uuid
from pathlib import PurePosixPath

import cloudinary
import cloudinary.uploader
import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from django.utils.text import get_valid_filename


IMAGE_EXTENSIONS = {
    ".avif",
    ".bmp",
    ".gif",
    ".heic",
    ".heif",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".tif",
    ".tiff",
    ".webp",
}

VIDEO_EXTENSIONS = {
    ".3g2",
    ".3gp",
    ".avi",
    ".flv",
    ".m4v",
    ".mkv",
    ".mov",
    ".mp4",
    ".mpeg",
    ".mpg",
    ".ogv",
    ".webm",
    ".wmv",
}

RESOURCE_TYPE_MARKERS = {
    "__image__": "image",
    "__raw__": "raw",
    "__video__": "video",
}


@deconstructible
class CloudinaryMediaStorage(Storage):
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )

    def get_available_name(self, name, max_length=None):
        path = PurePosixPath(name.replace("\\", "/"))
        extension = path.suffix.lower()
        stem = get_valid_filename(path.stem) or "upload"
        unique_name = f"{uuid.uuid4().hex}_{stem}{extension}"
        return str(path.parent / unique_name) if str(path.parent) != "." else unique_name

    @staticmethod
    def _resource_type(name):
        path = PurePosixPath(name.replace("\\", "/"))

        for segment in path.parts:
            if segment in RESOURCE_TYPE_MARKERS:
                return RESOURCE_TYPE_MARKERS[segment]

        if path.suffix.lower() in IMAGE_EXTENSIONS:
            return "image"
        if path.suffix.lower() in VIDEO_EXTENSIONS:
            return "video"
        return "raw"

    def _save(self, name, content):
        path = PurePosixPath(name.replace("\\", "/"))
        resource_type = self._resource_type(name)
        public_id = (
            (path.parent / path.stem).as_posix()
            if resource_type in {"image", "video"}
            else path.as_posix()
        )

        result = cloudinary.uploader.upload(
            content,
            public_id=public_id,
            resource_type=resource_type,
            unique_filename=False,
            overwrite=False,
            invalidate=True,
        )

        saved_name = result.get("public_id")
        if not saved_name:
            raise RuntimeError("Cloudinary did not return an uploaded asset ID.")

        return saved_name

    def _open(self, name, mode="rb"):
        response = requests.get(self.url(name), timeout=30)
        response.raise_for_status()
        return ContentFile(response.content, name=name)

    def url(self, name):
        resource_type = self._resource_type(name)
        asset = cloudinary.CloudinaryResource(
            name,
            default_resource_type=resource_type,
            url_options={"force_version": False},
        )
        return asset.url

    def delete(self, name):
        result = cloudinary.uploader.destroy(
            name,
            resource_type=self._resource_type(name),
            invalidate=True,
        )
        if result.get("result") not in {"ok", "not found"}:
            raise RuntimeError(
                f"Cloudinary could not delete media asset: {result!r}"
            )

    def exists(self, name):
        response = requests.head(self.url(name), timeout=30)
        if response.status_code == 404:
            return False
        response.raise_for_status()
        return True

    def size(self, name):
        response = requests.head(self.url(name), timeout=30)
        response.raise_for_status()
        return int(response.headers["Content-Length"])
