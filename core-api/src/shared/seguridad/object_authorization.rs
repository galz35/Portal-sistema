pub fn puede_acceder_objeto(id_cuenta_portal: i32, owner_id: i32) -> bool {
    id_cuenta_portal == owner_id
}

pub fn campo_permitido(nombre_campo: &str) -> bool {
    !matches!(nombre_campo, "ScoreRH" | "ScoreJefe" | "EstadoActual" | "IdResponsableRH" | "EsPublica")
}
