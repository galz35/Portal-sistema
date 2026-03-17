use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};

fn main() {
    let password = "Portal123!";
    let salt = SaltString::from_b64("c2FsdHNhbHQ").unwrap(); 
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt).unwrap().to_string();
    println!("Hash: {}", password_hash);
}
