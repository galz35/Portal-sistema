const MIME_PERMITIDOS: &[&str] = &[
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

pub fn mime_permitido(mime: &str) -> bool {
    MIME_PERMITIDOS.contains(&mime)
}

pub fn extension_permitida(ext: &str) -> bool {
    matches!(ext, "pdf" | "docx")
}
