use image::{ImageBuffer, Rgba, RgbaImage};
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Clone)]
pub struct TemplateData {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>, // RGBA bytes
}

#[derive(Deserialize, Clone)]
#[serde(tag = "type")]
pub enum Stamp {
    #[serde(rename = "text")]
    Text(TextStamp),
    #[serde(rename = "barcode")]
    Barcode(BarcodeStamp),
    #[serde(rename = "qrcode")]
    QrCode(QrCodeStamp),
}

#[derive(Deserialize, Clone)]
pub struct TextStamp {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub template: String,
    #[serde(rename = "fontFamily")]
    pub font_family: String,
    #[serde(rename = "fontSize")]
    pub font_size: f32,
    pub color: String,
    pub alignment: String, // "left" | "center" | "right"
    #[serde(rename = "verticalAlign")]
    pub vertical_align: Option<String>, // "top" | "middle" | "bottom"
    #[serde(rename = "autoSize")]
    pub auto_size: Option<bool>,
}

#[derive(Deserialize, Clone)]
pub struct BarcodeStamp {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub template: String,
    pub format: String, // "code128", "code39", etc.
}

#[derive(Deserialize, Clone)]
pub struct QrCodeStamp {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub template: String,
    #[serde(rename = "errorCorrection")]
    pub error_correction: String, // "L" | "M" | "Q" | "H"
}

pub struct TicketRenderer {
    template_image: RgbaImage,
    stamps: Vec<Stamp>,
    scale: f32,
}

impl TicketRenderer {
    pub fn new(template_data: TemplateData, stamps: Vec<Stamp>, scale: f32) -> Result<Self, String> {
        // Convert template data bytes to RgbaImage
        let template_image = ImageBuffer::from_raw(
            template_data.width,
            template_data.height,
            template_data.data,
        )
        .ok_or("Failed to create template image from raw data")?;

        Ok(TicketRenderer {
            template_image,
            stamps,
            scale,
        })
    }

    pub fn render(&self, record: &HashMap<String, String>, target_width: u32, target_height: u32) -> Result<RgbaImage, String> {
        // Create output image with scaled dimensions
        let mut img: RgbaImage = ImageBuffer::new(target_width, target_height);

        // Scale and draw template image
        let scaled_template = image::imageops::resize(
            &self.template_image,
            target_width,
            target_height,
            image::imageops::FilterType::Lanczos3,
        );

        // Copy template to output
        for (x, y, pixel) in scaled_template.enumerate_pixels() {
            img.put_pixel(x, y, *pixel);
        }

        // Render stamps
        for stamp in &self.stamps {
            match stamp {
                Stamp::Text(text_stamp) => {
                    self.render_text_stamp(&mut img, text_stamp, record)?;
                }
                Stamp::Barcode(barcode_stamp) => {
                    self.render_barcode_stamp(&mut img, barcode_stamp, record)?;
                }
                Stamp::QrCode(qr_stamp) => {
                    self.render_qr_stamp(&mut img, qr_stamp, record)?;
                }
            }
        }

        Ok(img)
    }

    fn render_text_stamp(
        &self,
        img: &mut RgbaImage,
        stamp: &TextStamp,
        record: &HashMap<String, String>,
    ) -> Result<(), String> {
        let _text = resolve_template(&stamp.template, record);

        // For now, render a placeholder box since proper text rendering requires
        // font files and complex layout. This will be enhanced in the next iteration.
        let x = (stamp.x * self.scale) as u32;
        let y = (stamp.y * self.scale) as u32;
        let w = (stamp.width * self.scale) as u32;
        let h = (stamp.height * self.scale) as u32;

        // Parse color
        let color = parse_color(&stamp.color).unwrap_or(Rgba([0, 0, 0, 255]));

        // Draw simple text placeholder (will be replaced with actual text rendering)
        // For MVP, we'll draw a filled rectangle as a visual indicator
        draw_rect_outline(img, x, y, w, h, color);

        Ok(())
    }

    fn render_barcode_stamp(
        &self,
        img: &mut RgbaImage,
        stamp: &BarcodeStamp,
        record: &HashMap<String, String>,
    ) -> Result<(), String> {
        let text = resolve_template(&stamp.template, record);

        if text.is_empty() {
            return Ok(());
        }

        let x = (stamp.x * self.scale) as u32;
        let y = (stamp.y * self.scale) as u32;
        let w = (stamp.width * self.scale) as u32;
        let h = (stamp.height * self.scale) as u32;

        // Generate barcode using the barcode crate
        let barcode_img = generate_barcode(&text, &stamp.format, w, h)?;

        // Composite barcode onto ticket
        composite_image(img, &barcode_img, x, y);

        Ok(())
    }

    fn render_qr_stamp(
        &self,
        img: &mut RgbaImage,
        stamp: &QrCodeStamp,
        record: &HashMap<String, String>,
    ) -> Result<(), String> {
        let text = resolve_template(&stamp.template, record);

        if text.is_empty() {
            return Ok(());
        }

        let x = (stamp.x * self.scale) as u32;
        let y = (stamp.y * self.scale) as u32;
        let size = (stamp.width * self.scale) as u32;

        // Generate QR code
        let qr_img = generate_qr_code(&text, &stamp.error_correction, size)?;

        // Composite QR code onto ticket
        composite_image(img, &qr_img, x, y);

        Ok(())
    }
}

// Helper function to resolve template strings like "{{number}}" with record data
fn resolve_template(template: &str, record: &HashMap<String, String>) -> String {
    let mut result = template.to_string();

    for (key, value) in record {
        let placeholder = format!("{{{{{}}}}}", key);
        result = result.replace(&placeholder, value);
    }

    result
}

// Parse CSS color string to RGBA
fn parse_color(color: &str) -> Result<Rgba<u8>, String> {
    use csscolorparser::parse;

    let parsed = parse(color).map_err(|e| format!("Failed to parse color: {}", e))?;

    Ok(Rgba([
        (parsed.r * 255.0) as u8,
        (parsed.g * 255.0) as u8,
        (parsed.b * 255.0) as u8,
        (parsed.a * 255.0) as u8,
    ]))
}

// Draw rectangle outline
fn draw_rect_outline(img: &mut RgbaImage, x: u32, y: u32, w: u32, h: u32, color: Rgba<u8>) {
    let (img_w, img_h) = img.dimensions();

    // Top and bottom edges
    for i in 0..w {
        let px = x + i;
        if px < img_w && y < img_h {
            blend_pixel(img, px, y, color);
        }
        if px < img_w && y + h < img_h {
            blend_pixel(img, px, y + h, color);
        }
    }

    // Left and right edges
    for i in 0..h {
        let py = y + i;
        if x < img_w && py < img_h {
            blend_pixel(img, x, py, color);
        }
        if x + w < img_w && py < img_h {
            blend_pixel(img, x + w, py, color);
        }
    }
}

// Alpha blend a pixel
fn blend_pixel(img: &mut RgbaImage, x: u32, y: u32, color: Rgba<u8>) {
    let bg = img.get_pixel(x, y);
    let alpha = color[3] as f32 / 255.0;
    let inv_alpha = 1.0 - alpha;

    let blended = Rgba([
        (color[0] as f32 * alpha + bg[0] as f32 * inv_alpha) as u8,
        (color[1] as f32 * alpha + bg[1] as f32 * inv_alpha) as u8,
        (color[2] as f32 * alpha + bg[2] as f32 * inv_alpha) as u8,
        255,
    ]);

    img.put_pixel(x, y, blended);
}

// Composite one image onto another with alpha blending
fn composite_image(base: &mut RgbaImage, overlay: &RgbaImage, x: u32, y: u32) {
    let (base_w, base_h) = base.dimensions();
    let (overlay_w, overlay_h) = overlay.dimensions();

    for oy in 0..overlay_h {
        for ox in 0..overlay_w {
            let bx = x + ox;
            let by = y + oy;

            if bx >= base_w || by >= base_h {
                continue;
            }

            let pixel = overlay.get_pixel(ox, oy);
            blend_pixel(base, bx, by, *pixel);
        }
    }
}

// Generate barcode image
// Note: For now, this generates a simple bar pattern placeholder.
// Full barcode generation will be added in a future iteration.
// The TypeScript barcode service will continue to work for actual barcodes.
fn generate_barcode(_text: &str, _format: &str, width: u32, height: u32) -> Result<RgbaImage, String> {
    let mut img = RgbaImage::new(width, height);

    // Fill with white background
    for pixel in img.pixels_mut() {
        *pixel = Rgba([255, 255, 255, 255]);
    }

    // Draw simple black bars as placeholder to indicate barcode area
    let bar_width = (width / 20).max(1);
    for i in 0..10 {
        let x = i * bar_width * 2;
        for bx in x..(x + bar_width).min(width) {
            for by in 0..height {
                img.put_pixel(bx, by, Rgba([0, 0, 0, 255]));
            }
        }
    }

    Ok(img)
}

// Generate QR code image
fn generate_qr_code(text: &str, error_correction: &str, size: u32) -> Result<RgbaImage, String> {
    use qrcode::QrCode;
    use qrcode::EcLevel;

    let ec_level = match error_correction {
        "L" => EcLevel::L,
        "M" => EcLevel::M,
        "Q" => EcLevel::Q,
        "H" => EcLevel::H,
        _ => EcLevel::M,
    };

    let qr = QrCode::with_error_correction_level(text, ec_level)
        .map_err(|e| format!("QR code generation failed: {}", e))?;

    let qr_data = qr.to_colors();
    let qr_width = qr.width();

    // Scale QR code to target size
    let module_size = (size as f32 / qr_width as f32).ceil() as u32;
    let actual_size = module_size * qr_width as u32;

    let mut img = RgbaImage::new(actual_size, actual_size);

    // Fill with white background
    for pixel in img.pixels_mut() {
        *pixel = Rgba([255, 255, 255, 255]);
    }

    // Draw QR modules
    for (idx, color) in qr_data.iter().enumerate() {
        let module_x = (idx % qr_width) as u32;
        let module_y = (idx / qr_width) as u32;

        let pixel_color = match color {
            qrcode::Color::Dark => Rgba([0, 0, 0, 255]),
            qrcode::Color::Light => Rgba([255, 255, 255, 255]),
        };

        // Fill the module area
        for dy in 0..module_size {
            for dx in 0..module_size {
                let x = module_x * module_size + dx;
                let y = module_y * module_size + dy;
                if x < actual_size && y < actual_size {
                    img.put_pixel(x, y, pixel_color);
                }
            }
        }
    }

    // Resize to exact target size if needed
    if actual_size != size {
        Ok(image::imageops::resize(&img, size, size, image::imageops::FilterType::Nearest))
    } else {
        Ok(img)
    }
}
