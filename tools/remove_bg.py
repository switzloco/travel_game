from PIL import Image
from pathlib import Path

assets_dir = Path(__file__).resolve().parent.parent / "webviews" / "assets"
images = [
    "player.png",
    "npc_staff.png",
    "npc_vendor.png",
    "npc_traveler.png",
    "npc_guard.png",
    "arrow.png",
    "speech_bubble.png"
]

for name in images:
    path = assets_dir / name
    if not path.exists():
        print(f"Skipping {name} (does not exist)")
        continue
        
    print(f"Processing {name}...")
    img = Image.open(path).convert("RGBA")
    
    # We load pixels to process
    pixels = img.load()
    width, height = img.size
    
    # Get the background color from top-left corner
    corner_pixel = pixels[0, 0]
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Check if pixel is very dark (close to black) OR very close to the corner pixel color
            is_black = (r < 80 and g < 80 and b < 80)
            is_bg_match = (abs(r - corner_pixel[0]) < 45 and 
                           abs(g - corner_pixel[1]) < 45 and 
                           abs(b - corner_pixel[2]) < 45)
            
            if is_black or is_bg_match:
                pixels[x, y] = (0, 0, 0, 0)
                
    # Crop to non-transparent bounding box
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(path, "PNG")
    print(f"  [OK] Processed and cropped {name} to {img.size}")
