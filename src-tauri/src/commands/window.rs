use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn open_container_creation_window(app: AppHandle) -> Result<(), String> {
    let _window = WebviewWindowBuilder::new(
        &app,
        "container-creation",
        WebviewUrl::App("create-container.html".into()),
    )
    .title("Create Database")
    .inner_size(600.0, 500.0)
    .center()
    .resizable(false)
    .hidden_title(true)
    .title_bar_style(tauri::TitleBarStyle::Overlay)
    .minimizable(false)
    .maximizable(false)
    .build()
    .map_err(|e| format!("Error creating window: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn open_container_edit_window(
    app: AppHandle,
    container_id: String,
) -> Result<(), String> {
    let url = format!("edit-container.html?id={}", container_id);
    let _window = WebviewWindowBuilder::new(&app, "container-edit", WebviewUrl::App(url.into()))
        .title("Edit Container")
        .inner_size(600.0, 500.0)
        .center()
        .resizable(false)
        .hidden_title(true)
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .minimizable(false)
        .maximizable(false)
        .build()
        .map_err(|e| format!("Error creating window: {}", e))?;

    Ok(())
}
