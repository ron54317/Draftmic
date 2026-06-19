import sharp from 'sharp';

async function run() {
  try {
    const { data, info } = await sharp('public/LogoNobackround.png')
      .trim()
      .toBuffer({ resolveWithObject: true });

    const maxDim = Math.max(info.width, info.height);
    const padding = Math.floor(maxDim * 0.002);
    const extendX = maxDim - info.width + padding * 2;
    const extendY = maxDim - info.height + padding * 2;

    await sharp(data)
      .extend({
        top: Math.floor(extendY / 2),
        bottom: Math.ceil(extendY / 2),
        left: Math.floor(extendX / 2),
        right: Math.ceil(extendX / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile('public/LogoNobackround_trimmed.png');

    console.log("Trimmed, squared, and added padding successfully.");
  } catch (err) {
    console.error(err);
  }
}

run();
