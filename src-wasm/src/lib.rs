use image::{ImageBuffer, RgbaImage, Rgba};
use serde::Deserialize;
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
pub struct SheetConfig {
    pub paper_width_mm: f64,
    pub paper_height_mm: f64,
    pub rows: usize,
    pub cols: usize,
    pub margin_top_mm: f64,
    pub margin_right_mm: f64,
    pub margin_bottom_mm: f64,
    pub margin_left_mm: f64,
    pub spacing_x_mm: f64,
    pub spacing_y_mm: f64,
}

#[wasm_bindgen]
pub fn generate_preview_png(
    config_json: &str,
    image_data: &[u8],
    ticket_width_px: u32,
    ticket_height_px: u32,
) -> Result<Vec<u8>, JsValue> {
    let config: SheetConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid config JSON: {}", e)))?;

    if ticket_width_px == 0 || ticket_height_px == 0 {
        return Err(JsValue::from_str("Invalid ticket dimensions (zero)"));
    }

    let tickets_per_page = config.rows * config.cols;
    if tickets_per_page == 0 {
        return Err(JsValue::from_str("Invalid grid layout (zero rows or columns)"));
    }

    // Assume 300 DPI for preview
    let dpi = 300.0;
    let mm_per_inch = 25.4;
    let pixels_per_mm = dpi / mm_per_inch;

    let page_width_px = (config.paper_width_mm * pixels_per_mm) as u32;
    let page_height_px = (config.paper_height_mm * pixels_per_mm) as u32;

    // Create a white background image (exact paper size)
    let mut img: RgbaImage = ImageBuffer::new(page_width_px, page_height_px);
    for pixel in img.pixels_mut() {
        *pixel = Rgba([255, 255, 255, 255]);
    }

    // Use actual ticket dimensions passed from JS - no recalculation or scaling
    let bytes_per_ticket = (ticket_width_px * ticket_height_px * 4) as usize;
    let total_tickets = image_data.len() / bytes_per_ticket;

    if total_tickets == 0 {
        return Err(JsValue::from_str("No ticket images provided"));
    }

    // Convert margins and spacing to pixels
    let margin_left_px = (config.margin_left_mm * pixels_per_mm) as u32;
    let margin_top_px = (config.margin_top_mm * pixels_per_mm) as u32;
    let spacing_x_px = (config.spacing_x_mm * pixels_per_mm) as u32;
    let spacing_y_px = (config.spacing_y_mm * pixels_per_mm) as u32;

    // Only render the first page
    let tickets_to_render = total_tickets.min(tickets_per_page);

    for i in 0..tickets_to_render {
        let row = i / config.cols;
        let col = i % config.cols;

        // Calculate position using actual ticket pixel dimensions and spacing
        let x_px = margin_left_px + col as u32 * (ticket_width_px + spacing_x_px);
        let y_px = margin_top_px + row as u32 * (ticket_height_px + spacing_y_px);

        let start = i * bytes_per_ticket;
        let end = start + bytes_per_ticket;
        let ticket_pixels = &image_data[start..end];

        // Composite the ticket image onto the page (no scaling - tickets are pre-rendered)
        for ty in 0..ticket_height_px {
            for tx in 0..ticket_width_px {
                let src_idx = ((ty * ticket_width_px + tx) * 4) as usize;
                if src_idx + 3 >= ticket_pixels.len() {
                    continue;
                }

                let r = ticket_pixels[src_idx];
                let g = ticket_pixels[src_idx + 1];
                let b = ticket_pixels[src_idx + 2];
                let a = ticket_pixels[src_idx + 3];

                let final_x = x_px + tx;
                let final_y = y_px + ty;

                if final_x >= page_width_px || final_y >= page_height_px {
                    continue;
                }

                // Simple alpha blending
                let bg_pixel = img.get_pixel(final_x, final_y);
                let alpha = a as f32 / 255.0;
                let inv_alpha = 1.0 - alpha;

                let new_r = (r as f32 * alpha + bg_pixel[0] as f32 * inv_alpha) as u8;
                let new_g = (g as f32 * alpha + bg_pixel[1] as f32 * inv_alpha) as u8;
                let new_b = (b as f32 * alpha + bg_pixel[2] as f32 * inv_alpha) as u8;

                img.put_pixel(final_x, final_y, Rgba([new_r, new_g, new_b, 255]));
            }
        }
    }

    // Encode to PNG
    let mut png_bytes = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("Failed to encode PNG: {}", e)))?;

    Ok(png_bytes)
}
