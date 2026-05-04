# Extension Icons

This folder should contain the following icon files for the Chrome extension:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extensions page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Creating Icons

You can create simple icons using:

1. **Online tools**:
   - Canva (https://www.canva.com)
   - Figma (https://www.figma.com)
   - Online icon generators

2. **Design suggestions**:
   - Use a brain emoji 🧠 as the main icon
   - Use indigo/purple theme (#6366f1) matching the app
   - Keep it simple and recognizable at small sizes

3. **Quick placeholder**:
   For development testing, you can use simple colored squares:
   - 16x16: Create a small purple square
   - 48x48: Larger version
   - 128x128: Full size with a brain symbol

## Icon Specifications

| Size | Use Case |
|------|----------|
| 16x16 | Extension action button in toolbar |
| 48x48 | Extensions management page (chrome://extensions) |
| 128x128 | Installation dialog, Chrome Web Store listing |

## Development Workaround

For testing without icons:
1. The extension can still be loaded in Chrome Developer mode
2. Chrome will use a default icon if these are missing
3. For production, proper icons are required
