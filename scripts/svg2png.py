import os
gtkbin = r'C:\Program Files\GTK3-Runtime Win64\bin'
os.environ['PATH'] = os.pathsep.join((gtkbin, os.environ['PATH']))

import cairosvg
from PIL import Image


def convert_svg_to_png(svg_filename, width=None, height=None, png_filename=None):
    """
    Convert an SVG file to a PNG file while maintaining aspect ratio if only width or height is provided.
    If png_filename is not provided, save the PNG file in the same location as the SVG file.

    :param svg_filename: Path to the SVG file.
    :param width: Width of the output PNG (optional).
    :param height: Height of the output PNG (optional).
    :param png_filename: Path where the PNG file will be saved (optional).
    """
    if png_filename is None:
        png_filename = os.path.splitext(svg_filename)[0] + '.png'

    if width is None and height is None:
        # Convert without resizing
        cairosvg.svg2png(url=svg_filename, write_to=png_filename)
    else:
        # Temporary PNG for aspect ratio calculation
        temp_png = 'temp.png'
        cairosvg.svg2png(url=svg_filename, write_to=temp_png)

        # Open the temporary PNG to calculate aspect ratio
        with Image.open(temp_png) as img:
            original_width, original_height = img.size
            aspect_ratio = original_width / original_height

            if width is None:
                width = int(height * aspect_ratio)
            elif height is None:
                height = int(width / aspect_ratio)

        # Convert with resizing
        cairosvg.svg2png(url=svg_filename, write_to=png_filename,
                         output_width=width, output_height=height)

        # Remove temporary file
        os.remove(temp_png)


svg_dir = os.path.join(r"C:\Users\Zhangty\Downloads\svgs")

for file in os.listdir(svg_dir):
    if file.endswith('.svg'):
        svg_filename = os.path.join(svg_dir, file)
        convert_svg_to_png(svg_filename, height=96)

