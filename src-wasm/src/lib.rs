mod ticket_renderer;

use image::{ImageBuffer, RgbaImage, Rgba};
use serde::Deserialize;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use ticket_renderer::{TicketRenderer, TemplateData, Stamp};

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

#[derive(Deserialize)]
pub struct RenderConfig {
    pub sheet_config: SheetConfig,
    pub template_width: u32,
    pub template_height: u32,
    pub stamps: Vec<Stamp>,
    pub records: Vec<HashMap<String, String>>,
    pub dpi: f64,
}

/// Renders a complete sheet with tickets generated entirely in WASM.
/// This is the main entry point for high-performance preview generation.
///
/// Returns raw RGBA bytes that can be directly used with ImageData or canvas.
#[wasm_bindgen]
pub fn render_sheet(config_json: &str, template_data: &[u8], font_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let request: RenderConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid config JSON: {}", e)))?;

    let config = &request.sheet_config;
    let dpi = request.dpi;
    let mm_per_inch = 25.4;
    let pixels_per_mm = dpi / mm_per_inch;

    // Calculate page dimensions (must match TypeScript's Math.round())
    let page_width_px = (config.paper_width_mm * pixels_per_mm).round() as u32;
    let page_height_px = (config.paper_height_mm * pixels_per_mm).round() as u32;

    // Create white background
    let mut sheet_img: RgbaImage = ImageBuffer::new(page_width_px, page_height_px);
    for pixel in sheet_img.pixels_mut() {
        *pixel = Rgba([255, 255, 255, 255]);
    }

    // Calculate ticket dimensions
    let tickets_per_page = config.rows * config.cols;

    // Calculate ticket size in mm
    let ticket_width_mm = if config.cols > 0 {
        (config.paper_width_mm
            - config.margin_left_mm
            - config.margin_right_mm
            - (config.cols - 1) as f64 * config.spacing_x_mm)
        / config.cols as f64
    } else {
        0.0
    };

    let ticket_height_mm = if config.rows > 0 {
        (config.paper_height_mm
            - config.margin_top_mm
            - config.margin_bottom_mm
            - (config.rows - 1) as f64 * config.spacing_y_mm)
        / config.rows as f64
    } else {
        0.0
    };

    if ticket_width_mm <= 0.0 || ticket_height_mm <= 0.0 {
        return Err(JsValue::from_str("Invalid ticket dimensions"));
    }

    // Calculate target ticket dimensions in pixels (must match TypeScript's Math.round())
    let target_ticket_width_px = (ticket_width_mm * pixels_per_mm).round() as u32;
    let target_ticket_height_px = (ticket_height_mm * pixels_per_mm).round() as u32;

    // Calculate uniform scale factor for template
    let template_width = request.template_width;
    let template_height = request.template_height;

    let scale_x = target_ticket_width_px as f32 / template_width as f32;
    let scale_y = target_ticket_height_px as f32 / template_height as f32;
    let scale = scale_x.min(scale_y); // Uniform scaling - CRITICAL

    // Calculate actual scaled template dimensions (maintaining aspect ratio)
    let scaled_template_width = (template_width as f32 * scale).round() as u32;
    let scaled_template_height = (template_height as f32 * scale).round() as u32;

    // Validate template data length
    let expected_len = (template_width * template_height * 4) as usize;
    if template_data.len() != expected_len {
        return Err(JsValue::from_str(&format!(
            "Invalid template data length. Expected {} bytes ({}x{}x4), got {}",
            expected_len, template_width, template_height, template_data.len()
        )));
    }

    // Create template data structure
    let template = TemplateData {
        width: template_width,
        height: template_height,
        data: template_data.to_vec(),
    };

    // Create ticket renderer
    let renderer = TicketRenderer::new(template, request.stamps, font_data.to_vec())
        .map_err(|e| JsValue::from_str(&e))?;

    // Convert margins and spacing to pixels (must match TypeScript's Math.round())
    let margin_left_px = (config.margin_left_mm * pixels_per_mm).round() as u32;
    let margin_top_px = (config.margin_top_mm * pixels_per_mm).round() as u32;
    let spacing_x_px = (config.spacing_x_mm * pixels_per_mm).round() as u32;
    let spacing_y_px = (config.spacing_y_mm * pixels_per_mm).round() as u32;

    // Render tickets on the first page
    let records_to_render = request.records.len().min(tickets_per_page);

    for i in 0..records_to_render {
        let record = &request.records[i];

        // Calculate grid position
        let row = i / config.cols;
        let col = i % config.cols;

        // Calculate position on sheet (top-left of cell)
        let cell_x_px = margin_left_px + col as u32 * (target_ticket_width_px + spacing_x_px);
        let cell_y_px = margin_top_px + row as u32 * (target_ticket_height_px + spacing_y_px);

        // Render ticket with uniformly scaled dimensions
        let ticket_img = renderer.render(record, scaled_template_width, scaled_template_height)
            .map_err(|e| JsValue::from_str(&format!("Failed to render ticket {}: {}", i, e)))?;

        // Center the scaled template within the cell
        let offset_x = (target_ticket_width_px.saturating_sub(scaled_template_width)) / 2;
        let offset_y = (target_ticket_height_px.saturating_sub(scaled_template_height)) / 2;
        let final_x = cell_x_px + offset_x;
        let final_y = cell_y_px + offset_y;

        // Composite onto sheet
        composite_image(&mut sheet_img, &ticket_img, final_x, final_y);
    }

    // Return raw RGBA bytes
    Ok(sheet_img.into_raw())
}

/// Legacy function for compositing pre-rendered tickets (kept for compatibility).
/// Use render_sheet for better performance.
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

/// Helper function to composite images with alpha blending
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
            let bg = base.get_pixel(bx, by);

            let alpha = pixel[3] as f32 / 255.0;
            let inv_alpha = 1.0 - alpha;

            let blended = Rgba([
                (pixel[0] as f32 * alpha + bg[0] as f32 * inv_alpha) as u8,
                (pixel[1] as f32 * alpha + bg[1] as f32 * inv_alpha) as u8,
                (pixel[2] as f32 * alpha + bg[2] as f32 * inv_alpha) as u8,
                255,
            ]);

            base.put_pixel(bx, by, blended);
        }
    }
}
