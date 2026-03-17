pub fn content_security_policy() -> &'static str {
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
}

pub fn strict_transport_security() -> &'static str {
    "max-age=31536000; includeSubDomains"
}
