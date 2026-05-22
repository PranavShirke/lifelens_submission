"""
Sync enrolled face images to known_faces/ for DeepFace
=======================================================
One-time migration: copies existing enrollment photos from
``photo/enrolled/`` to ``known_faces/{person_name}/`` so that
DeepFace.find() can recognize previously enrolled people.

Usage::

    python -m lifelens.avatar.sync_faces_to_disk
"""

from __future__ import annotations

import re
import shutil
import logging
from pathlib import Path

logger = logging.getLogger("lifelens.avatar.sync_faces")

ENROLL_DIR = Path(__file__).resolve().parents[2] / "photo" / "enrolled"
KNOWN_FACES_DIR = Path(__file__).resolve().parents[2] / "known_faces"


def sync_enrolled_photos():
    """
    Parse filenames in photo/enrolled/ to extract person names and
    copy each image into known_faces/{name}/.

    Filename pattern: ``{Name}_{uuid}.jpg``
    Examples:
        Pranav_Shirke_21948c7a-46da-459e-b539-db8ff87b45d4.jpg  → known_faces/Pranav_Shirke/
        Deepkumar_Das_c2aeacdd-c4e6-463f-a271-337ecacdd844.jpg  → known_faces/Deepkumar_Das/
    """
    if not ENROLL_DIR.exists():
        logger.warning("Enrollment directory not found: %s", ENROLL_DIR)
        return 0

    KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)

    # UUID pattern (8-4-4-4-12 hex chars)
    uuid_pattern = re.compile(r"_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)

    synced = 0
    for image_file in ENROLL_DIR.iterdir():
        if not image_file.is_file():
            continue
        if image_file.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue

        # Extract person name by stripping the UUID suffix
        stem = image_file.stem  # e.g., "Pranav_Shirke_21948c7a-..."
        name = uuid_pattern.sub("", stem).rstrip("_")

        if not name:
            logger.warning("Could not extract name from: %s", image_file.name)
            continue

        # Create person directory
        person_dir = KNOWN_FACES_DIR / name
        person_dir.mkdir(parents=True, exist_ok=True)

        # Copy if not already there
        dest = person_dir / image_file.name
        if dest.exists():
            logger.debug("Already synced: %s", dest)
            continue

        shutil.copy2(image_file, dest)
        logger.info("Synced: %s → %s", image_file.name, person_dir.name)
        synced += 1

    # Clean up any stale DeepFace .pkl caches
    for pkl in KNOWN_FACES_DIR.rglob("*.pkl"):
        try:
            pkl.unlink()
        except Exception:
            pass

    return synced


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    count = sync_enrolled_photos()
    print(f"\n✅ Synced {count} face image(s) to {KNOWN_FACES_DIR}")

    # Show final state
    for person_dir in sorted(KNOWN_FACES_DIR.iterdir()):
        if person_dir.is_dir() and not person_dir.name.startswith("."):
            images = list(person_dir.glob("*.*"))
            print(f"   {person_dir.name}: {len(images)} image(s)")
