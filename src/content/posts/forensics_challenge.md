---
title: Hidden in Plain Sight
published: 2025-10-16
description: A steganography CTF challenge walkthrough where secrets hide in pixels.
image: ./forensics_challenge.png
tags: [CTF, Forensics, Steganography, LSB]
category: CTF Writeups
draft: false
series: CTF Writeups
---

# Hidden in Plain Sight

**Challenge**: Secret Message
**Category**: Forensics / Steganography
**Difficulty**: Easy
**Flag**: `FLAG{h1dd3n_1n_pl41n_s1ght}`

## Analysis

The challenge provides a PNG image that appears normal but contains hidden data. Initial analysis shows no obvious anomalies in the file structure:

```bash
$ file secret.png
secret.png: PNG image data, 800 x 600, 8-bit/color RGB, non-interlaced

$ binwalk secret.png
0    0x0    PNG image, 800 x 600, 8-bit/color RGB, non-interlaced
```

Since no embedded files are found, this suggests LSB (Least Significant Bit) steganography where data is hidden in the pixel values.

## Solution

LSB steganography works by modifying the least significant bits of pixel color values. These changes are invisible to the human eye but can be extracted programmatically.

### Exploit Script

```python
#!/usr/bin/env python3
from PIL import Image
import sys

def extract_lsb_message(image_path):
    # Open the image
    img = Image.open(image_path)

    # Get all pixels
    pixels = list(img.getdata())

    # Extract LSBs from each color channel
    lsb_bits = []
    for pixel in pixels:
        r, g, b = pixel
        lsb_bits.append(r & 1)  # Extract LSB of Red
        lsb_bits.append(g & 1)  # Extract LSB of Green
        lsb_bits.append(b & 1)  # Extract LSB of Blue

    # Convert bits to bytes
    message_bytes = []
    for i in range(0, len(lsb_bits) - 7, 8):
        byte = sum((lsb_bits[i + j] << (7 - j)) for j in range(8))
        message_bytes.append(byte)

    # Decode to string and extract flag
    message = bytes(message_bytes).decode('ascii', errors='ignore')
    flag = ''.join(c for c in message if c.isprintable())

    # Find flag in the message
    for word in flag.split():
        if word.startswith('FLAG{'):
            return word

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract.py <image_file>")
        sys.exit(1)

    image_file = sys.argv[1]
    flag = extract_lsb_message(image_file)

    if flag:
        print(f"[+] Flag found: {flag}")
    else:
        print("[-] No flag found in image")

if __name__ == "__main__":
    main()
```

### Execution

```bash
# Extract flag from image
$ python3 extract.py secret.png
[+] Flag found: FLAG{h1dd3n_1n_pl41n_s1ght}
```

The exploit successfully extracts the hidden flag by reading the least significant bits from each color channel of the PNG image and converting them back to ASCII text.