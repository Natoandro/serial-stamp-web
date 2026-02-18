use printpdf::*;
use serde::Deserialize;
use std::io::Cursor;
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
pub fn generate_pdf(
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

    let (doc, page1, layer1) = PdfDocument::new(
        "Serial Stamp Export",
        Mm(config.paper_width_mm),
        Mm(config.paper_height_mm),
        "Layer 1",
    );

    let mut current_page = page1;
    let mut current_layer = doc.get_page(current_page).get_layer(layer1);

    let tickets_per_page = config.rows * config.cols;
    if tickets_per_page == 0 {
        return Err(JsValue::from_str("Invalid grid layout (zero rows or columns)"));
    }

    // Calculate ticket dimensions in Mm
    let total_spacing_x = (config.cols as f64 - 1.0).max(0.0) * config.spacing_x_mm;
    let available_width =
        config.paper_width_mm - config.margin_left_mm - config.margin_right_mm - total_spacing_x;
    let ticket_width_mm = available_width / config.cols as f64;

    let total_spacing_y = (config.rows as f64 - 1.0).max(0.0) * config.spacing_y_mm;
    let available_height =
        config.paper_height_mm - config.margin_top_mm - config.margin_bottom_mm - total_spacing_y;
    let ticket_height_mm = available_height / config.rows as f64;

    let bytes_per_ticket = (ticket_width_px * ticket_height_px * 4) as usize;
    let total_tickets = image_data.len() / bytes_per_ticket;

    if total_tickets == 0 {
        return Err(JsValue::from_str("No ticket images provided"));
    }

    for i in 0..total_tickets {
        let pos_in_page = i % tickets_per_page;

        if i > 0 && pos_in_page == 0 {
            let (new_page, new_layer) = doc.add_page(
                Mm(config.paper_width_mm),
                Mm(config.paper_height_mm),
                "Layer 1",
            );
            current_page = new_page;
            current_layer = doc.get_page(current_page).get_layer(new_layer);
        }

        let row = pos_in_page / config.cols;
        let col = pos_in_page % config.cols;

        let x = config.margin_left_mm + col as f64 * (ticket_width_mm + config.spacing_x_mm);
        // printpdf uses bottom-left origin. y is distance from bottom.
        let y = config.paper_height_mm
            - config.margin_top_mm
            - (row as f64 + 1.0) * ticket_height_mm
            - (row as f64 * config.spacing_y_mm);

        let start = i * bytes_per_ticket;
        let end = start + bytes_per_ticket;
        let ticket_pixels = &image_data[start..end];

        // Convert RGBA to RGB (dropping alpha channel)
        let mut rgb_pixels = Vec::with_capacity((ticket_width_px * ticket_height_px * 3) as usize);
        for chunk in ticket_pixels.chunks(4) {
            if chunk.len() >= 3 {
                rgb_pixels.push(chunk[0]);
                rgb_pixels.push(chunk[1]);
                rgb_pixels.push(chunk[2]);
            }
        }

        let image = Image {
            width: Px(ticket_width_px as usize),
            height: Px(ticket_height_px as usize),
            color_space: ColorSpace::Rgb,
            bits_per_component: ColorBits::Bit8,
            image_data: rgb_pixels,
        };

        // Scale factors: points per pixel.
        // PDF default coordinate system is 72 DPI (points).
        let target_width_pts = ticket_width_mm * (72.0 / 25.4);
        let target_height_pts = ticket_height_mm * (72.0 / 25.4);
        let scale_x = target_width_pts / ticket_width_px as f64;
        let scale_y = target_height_pts / ticket_height_px as f64;

        image.add_to_layer(
            current_layer.clone(),
            ImageTransform {
                translate_x: Some(Mm(x)),
                translate_y: Some(Mm(y)),
                rotate: None,
                scale_x: Some(scale_x),
                scale_y: Some(scale_y),
                dpi: None,
            },
        );
    }

    let mut pdf_bytes = Vec::new();
    let mut writer = Cursor::new(&mut pdf_bytes);
    doc.save(&mut writer)
        .map_err(|e| JsValue::from_str(&format!("Failed to save PDF: {}", e)))?;

    Ok(pdf_bytes)
}
