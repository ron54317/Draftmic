from PIL import Image

icon_path = r"c:\RonsAndroidApps\Draftmic\DraftmicAPP\src-tauri\icons\icon.png"
dialog_out = r"c:\RonsAndroidApps\Draftmic\DraftmicAPP\src-tauri\icons\WixDialog.bmp"
banner_out = r"c:\RonsAndroidApps\Draftmic\DraftmicAPP\src-tauri\icons\WixBanner.bmp"

icon = Image.open(icon_path).convert("RGBA")

# Dialog Image (493x312)
# Background white, left sidebar dark (164 width)
dialog = Image.new("RGB", (493, 312), (255, 255, 255))
sidebar = Image.new("RGB", (164, 312), (24, 24, 27))
dialog.paste(sidebar, (0, 0))

# Resize icon for dialog (approx 120x120)
dialog_icon = icon.resize((120, 120), Image.Resampling.LANCZOS)
dialog.paste(dialog_icon, (22, 96), dialog_icon)
dialog.save(dialog_out, "BMP")

# Banner Image (493x58)
banner = Image.new("RGB", (493, 58), (255, 255, 255))
# Dark rectangle on the right side just to make it consistent
banner_right = Image.new("RGB", (58, 58), (24, 24, 27))
banner.paste(banner_right, (493-58, 0))

banner_icon = icon.resize((46, 46), Image.Resampling.LANCZOS)
# Position on the right
banner.paste(banner_icon, (493-58+6, 6), banner_icon)
banner.save(banner_out, "BMP")

print("Generated Wix BMPs")
