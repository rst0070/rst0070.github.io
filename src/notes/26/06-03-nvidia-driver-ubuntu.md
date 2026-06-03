---
title: happy nvidia driver
---
It feels like almost every month I run into an nvidia driver problem on my ubuntu server, such as the following message  
```bash
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver. Make sure that the latest NVIDIA driver is installed and running.
```

It usually happens when
- The server has been up for several months
- There was an accidental reboot

This time the reason was that the nvidia driver was not rebuilt after the kernel was updated.  

So while I'm at it, I'm going to upgrade the cuda version by reinstalling the nvidia driver.

## Useful commands to diagnosis nvidia driver

Run these read-only checks. None of them modify the system.

__1. Is the GPU hardware actually present?__
```bash
lspci | grep -i -E "vga|3d|nvidia"
```

If this shows your NVIDIA card, the hardware is fine and the problem is software.

__2. Is the `nvidia` kernel module loaded?__  

```bash
lsmod | grep nvidia
```

Empty output = the module is not loaded (the core symptom).

__3. Does an `nvidia` module even exist for the running kernel?__  
```bash
modinfo nvidia
```

`modinfo: ERROR: Module nvidia not found` = no module is available for the
running kernel. This is the smoking gun.

__4. Compare the running kernel vs. the installed NVIDIA module packages__
```bash
uname -r                                # running kernel, e.g. 6.8.0-124-generic
dpkg -l | grep linux-modules-nvidia     # which kernel(s) actually have nvidia modules
```

If the version after `linux-modules-nvidia-<driver>-` does not match
`uname -r`, the module was never built for your current kernel.  
  
Confirm the gap directly with:
```bash
# Returns NOTHING when mismatched
dpkg -l | grep -E "linux-modules-nvidia-[0-9]+-$(uname -r)"
```
