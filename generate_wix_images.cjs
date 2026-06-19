const sharp = require('sharp');
const path = require('path');

const iconPath = path.join(__dirname, 'src-tauri', 'icons', 'icon.png');
const dialogOutPath = path.join(__dirname, 'src-tauri', 'icons', 'WixDialog.bmp');
const bannerOutPath = path.join(__dirname, 'src-tauri', 'icons', 'WixBanner.bmp');

async function generate() {
    try {
        // Create left sidebar image (164x312)
        const sidebar = await sharp({
            create: {
                width: 164,
                height: 312,
                channels: 3,
                background: { r: 24, g: 24, b: 27 } // Zinc 900
            }
        })
        .composite([
            {
                input: await sharp(iconPath).resize(120, 120, { fit: 'contain' }).toBuffer(),
                left: 22,
                top: 96
            }
        ])
        .toBuffer();

        // Create the full dialog (493x312) - white background
        await sharp({
            create: {
                width: 493,
                height: 312,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
        .composite([
            {
                input: sidebar,
                left: 0,
                top: 0
            }
        ])
        .bmp()
        .toFile(dialogOutPath);

        console.log('Created WixDialog.bmp');

        // Create the full banner (493x58) - white background with icon on right
        await sharp({
            create: {
                width: 493,
                height: 58,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
        .composite([
            {
                input: await sharp(iconPath).resize(46, 46, { fit: 'contain' }).toBuffer(),
                left: 437,
                top: 6
            }
        ])
        .bmp()
        .toFile(bannerOutPath);

        console.log('Created WixBanner.bmp');
    } catch (e) {
        console.error(e);
    }
}

generate();
