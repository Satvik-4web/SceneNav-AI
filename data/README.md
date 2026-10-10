# SceneNav AI — Data Directory

This directory contains image data for the matching pipeline.

## Subdirectories

- `references/` — Reference (map/database) images.
- `queries/`    — Query (scene) images to match against references.
- `manifests/`  — JSON evaluation manifests linking pairs with metadata.

## Adding Images

Place your images in the appropriate subdirectory.
Supported formats: JPEG, PNG, TIFF, BMP, WEBP.
Maximum size: 50 MB per image (configurable in `.env`).

## Generating Synthetic Test Data

```bash
python scripts/generate_test_pairs.py
```

## License Note

Images in `references/` and `queries/` may have their own licenses.
The `synthetic_*` images are procedurally generated and carry no restrictions.
Always verify the license of any third-party images before redistribution.
