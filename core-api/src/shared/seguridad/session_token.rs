use sha2::{Digest, Sha256};
use uuid::Uuid;

pub fn generar_sid() -> String {
    format!("sid_{}_{}", Uuid::new_v4(), Uuid::new_v4())
}

pub fn hash_token(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    format!("{digest:x}")
}
