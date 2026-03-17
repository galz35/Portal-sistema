use argon2::{password_hash::PasswordHash, Argon2, PasswordVerifier};
use std::env;

fn main() {
    let mut args = env::args().skip(1);
    let Some(hash) = args.next() else {
        eprintln!("usage: cargo run --example verify_argon2 -- <hash> <password> [password...]");
        std::process::exit(2);
    };

    let candidates: Vec<String> = args.collect();
    if candidates.is_empty() {
        eprintln!("usage: cargo run --example verify_argon2 -- <hash> <password> [password...]");
        std::process::exit(2);
    }

    let parsed = match PasswordHash::new(&hash) {
        Ok(value) => value,
        Err(err) => {
            eprintln!("invalid hash: {err}");
            std::process::exit(1);
        }
    };

    for candidate in candidates {
        let ok = Argon2::default()
            .verify_password(candidate.as_bytes(), &parsed)
            .is_ok();
        println!("{candidate}: {ok}");
    }
}
