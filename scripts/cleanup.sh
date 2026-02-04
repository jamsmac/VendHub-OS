#!/bin/bash
# Cleanup script for VendHub project
# Run this locally to clean up backup files and temporary data

echo "🧹 VendHub Cleanup Script"
echo "========================="

# Count files before
BAK_COUNT=$(find . -name "*.bak" -type f 2>/dev/null | wc -l)
echo "Found $BAK_COUNT .bak files"

# Delete .bak files
echo "Deleting .bak files..."
find . -name "*.bak" -type f -delete 2>/dev/null

# Verify
BAK_AFTER=$(find . -name "*.bak" -type f 2>/dev/null | wc -l)
echo "Remaining .bak files: $BAK_AFTER"

# Delete other temporary files
echo "Cleaning other temporary files..."
find . -name "*.tmp" -type f -delete 2>/dev/null
find . -name "*.log" -type f -not -path "./logs/*" -delete 2>/dev/null
find . -name ".DS_Store" -type f -delete 2>/dev/null
find . -name "Thumbs.db" -type f -delete 2>/dev/null

# Clean empty directories
echo "Removing empty directories..."
find . -type d -empty -delete 2>/dev/null

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Note: To also clean node_modules and rebuild:"
echo "  pnpm clean && pnpm install"
