use uuid::Uuid;

pub fn generar_correlation_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn obtener_o_generar_correlation_id(actual: Option<&str>) -> String {
    actual.map(ToOwned::to_owned).unwrap_or_else(generar_correlation_id)
}
