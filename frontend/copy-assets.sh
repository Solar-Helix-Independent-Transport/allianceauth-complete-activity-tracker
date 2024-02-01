#!/bin/bash

echo "Cleaning old assets."
rm -rf ../aacat/static/aacat/assets
rm ../aacat/static/aacat/manifest.json
echo "Copying new assets."
cp build/static/.vite/manifest.json ../aacat/static/aacat/manifest.json
cp -r build/static/assets ../aacat/static/aacat/assets
echo "Assets copied successfully."
