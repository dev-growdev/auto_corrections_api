#!/bin/bash

cd ~/AppData/Local/Android/sdk/emulator; ./emulator -avd Pixel_4_XL_API_31 -wipe-data -no-cache -no-boot-anim -no-snapshot -logcat '*:s'

