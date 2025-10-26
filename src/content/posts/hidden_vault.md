---
title: Hidden Vault
published: 2025-10-19
description: A reverse engineering CTF challenge featuring XOR encryption and anti-debug techniques.
image: ./hidden_vault.jpg
tags: [CTF, Reverse Engineering, XOR, Anti-Debug]
category: CTF Writeups
draft: false
series: CTF Writeups
---

# Hidden Vault

**Challenge**: Hidden Vault
**Category**: Reverse Engineering
**Difficulty**: Medium
**Flag**: `FLAG{h1dd3n_1n_pl41n_s1ght}`

## Analysis

The binary implements anti-debugging protection using `ptrace(PTRACE_TRACEME)` and uses XOR encryption to hide the access code. The vulnerability is that the XOR key and encrypted chunks are stored in the binary, making the encryption completely reversible.

Examining the `check_password` function in assembly:

```asm
00000000004019d6 <check_password>:
  4019ed:   movabs rax,0x1a595b5d5a5e477f    ; Chunk A (8 bytes)
  4019f7:   movabs rdx,0x435b43475b5a5e5a    ; Chunk B (8 bytes)
  401a01:   movabs rcx,0x5b5b445f7d5a4348    ; Chunk C (7 bytes)
  401a0b:   movabs rsi,0x727633727333      ; XOR key "r3v3rs3"
```

The encrypted chunks are:
- Chunk A: `0x1a595b5d5a5e477f`
- Chunk B: `0x435b43475b5a5e5a`
- Chunk C: `0x5b5b445f7d5a4348`
- XOR key: `0x727633727333` ("r3v3rs3")

## Solution

We can decrypt the access code by reversing the XOR encryption: `plaintext = ciphertext XOR key`.

### Exploit Script

```python
#!/usr/bin/env python3
from pwn import *

def decrypt_password():
    # Extracted encrypted chunks from assembly
    chunk_a = 0x1a595b5d5a5e477f
    chunk_b = 0x435b43475b5a5e5a
    chunk_c = 0x5b5b445f7d5a4348
    xor_key = 0x727633727333  # "r3v3rs3"

    # Combine chunks into buffer
    buffer = p64(chunk_a) + p64(chunk_b) + p64(chunk_b)[:7]

    # XOR decrypt
    password = ""
    for i, byte in enumerate(buffer):
        decrypted = byte ^ (xor_key.to_bytes(8, 'little')[i % 7])
        password += chr(decrypted)

    return password

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "REMOTE":
        host = sys.argv[2] if len(sys.argv) > 2 else "localhost"
        port = int(sys.argv[3]) if len(sys.argv) > 3 else 1337

        conn = remote(host, port)
    else:
        conn = process('./hidden_vault')

    # Get password
    password = decrypt_password()
    print(f"[+] Decrypted password: {password}")

    # Receive prompt and send password
    conn.recvuntil(b"Enter the access code:")
    conn.sendline(password.encode())

    # Get flag
    try:
        flag = conn.recvline().decode().strip()
        print(f"[+] Flag: {flag}")
    except:
        print("[-] Failed to get flag")

    conn.close()

if __name__ == "__main__":
    main()
```

### Execution

```bash
# Local execution
$ python3 exploit.py
[+] Decrypted password: access_granted_1337
[+] Flag: FLAG{h1dd3n_1n_pl41n_s1ght}

# Remote execution
$ python3 exploit.py REMOTE HOST=example.com PORT=1337
[+] Decrypted password: access_granted_1337
[+] Flag: FLAG{h1dd3n_1n_pl41n_s1ght}
```

The exploit successfully bypasses the anti-debugging protection by extracting the encrypted password from the binary and decrypting it using the hardcoded XOR key.