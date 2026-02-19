use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};
use std::collections::HashMap;
use std::sync::Mutex;

// Global font cache
lazy_static::lazy_static! {
    static ref FONT_CACHE: Mutex<HashMap<String, Vec<u8>>> = Mutex::new(HashMap::new());
}

/// Fetch a font from a URL and cache it
pub async fn load_font(font_name: &str, url: &str) -> Result<Vec<u8>, JsValue> {
    // Check cache first
    {
        let cache = FONT_CACHE.lock().unwrap();
        if let Some(font_data) = cache.get(font_name) {
            return Ok(font_data.clone());
        }
    }

    // Fetch font from URL
    let mut opts = RequestInit::new();
    opts.set_method("GET");
    opts.set_mode(RequestMode::Cors);

    let request = Request::new_with_str_and_init(url, &opts)?;

    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window object"))?;
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    let resp: Response = resp_value.dyn_into()?;

    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "Failed to fetch font '{}' from {}: HTTP {}",
            font_name,
            url,
            resp.status()
        )));
    }

    // Get response as array buffer
    let array_buffer = JsFuture::from(resp.array_buffer()?).await?;
    let uint8_array = js_sys::Uint8Array::new(&array_buffer);
    let font_data = uint8_array.to_vec();

    // Cache the font
    {
        let mut cache = FONT_CACHE.lock().unwrap();
        cache.insert(font_name.to_string(), font_data.clone());
    }

    Ok(font_data)
}

/// Clear the font cache
#[allow(dead_code)]
pub fn clear_font_cache() {
    let mut cache = FONT_CACHE.lock().unwrap();
    cache.clear();
}
