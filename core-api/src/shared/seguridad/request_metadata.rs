use axum::http::HeaderMap;
use std::net::{IpAddr, SocketAddr};

const MAX_USER_AGENT_CHARS: usize = 512;
const MAX_CORRELATION_ID_CHARS: usize = 128;
const CLIENT_IP_HEADER: &str = "x-client-ip";

pub fn extract_client_ip(headers: &HeaderMap) -> Option<String> {
    extract_single_ip_header(headers, CLIENT_IP_HEADER)
        .or_else(|| extract_forwarded_header_ip(headers))
        .or_else(|| extract_x_forwarded_for_ip(headers))
        .or_else(|| extract_single_ip_header(headers, "x-real-ip"))
}

pub fn extract_user_agent(headers: &HeaderMap) -> Option<String> {
    extract_header_text(headers, "user-agent", MAX_USER_AGENT_CHARS)
}

pub fn extract_correlation_id(headers: &HeaderMap) -> Option<String> {
    let candidate = extract_header_text(headers, "x-correlation-id", MAX_CORRELATION_ID_CHARS)
        .or_else(|| extract_header_text(headers, "x-request-id", MAX_CORRELATION_ID_CHARS))?;

    let sanitized = candidate
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | ':' | '-'))
        .collect::<String>();

    if sanitized.is_empty() {
        None
    } else {
        Some(sanitized)
    }
}

pub fn request_uses_https(headers: &HeaderMap) -> bool {
    if let Some(value) = extract_header_text(headers, "x-forwarded-proto", 32) {
        return value
            .split(',')
            .next()
            .map(|item| item.trim().eq_ignore_ascii_case("https"))
            .unwrap_or(false);
    }

    extract_forwarded_proto(headers)
        .map(|proto| proto.eq_ignore_ascii_case("https"))
        .unwrap_or(false)
}

pub fn resolve_client_ip(
    headers: &HeaderMap,
    remote_addr: Option<SocketAddr>,
    trust_proxy_headers: bool,
) -> Option<String> {
    if trust_proxy_headers {
        extract_forwarded_header_ip(headers)
            .or_else(|| extract_x_forwarded_for_ip(headers))
            .or_else(|| extract_single_ip_header(headers, "x-real-ip"))
            .or_else(|| remote_addr.map(|addr| addr.ip().to_string()))
    } else {
        remote_addr.map(|addr| addr.ip().to_string())
    }
}

fn extract_forwarded_header_ip(headers: &HeaderMap) -> Option<String> {
    let raw = extract_header_text(headers, "forwarded", 512)?;
    for entry in raw.split(',') {
        for segment in entry.split(';') {
            let Some((name, value)) = segment.split_once('=') else {
                continue;
            };
            if name.trim().eq_ignore_ascii_case("for") {
                if let Some(ip) = normalize_ip_candidate(value) {
                    return Some(ip);
                }
            }
        }
    }
    None
}

fn extract_forwarded_proto(headers: &HeaderMap) -> Option<String> {
    let raw = extract_header_text(headers, "forwarded", 512)?;
    for entry in raw.split(',') {
        for segment in entry.split(';') {
            let Some((name, value)) = segment.split_once('=') else {
                continue;
            };
            if name.trim().eq_ignore_ascii_case("proto") {
                let proto = sanitize_header_text(value, 16)?;
                return Some(proto.trim_matches('"').to_string());
            }
        }
    }
    None
}

fn extract_x_forwarded_for_ip(headers: &HeaderMap) -> Option<String> {
    let raw = extract_header_text(headers, "x-forwarded-for", 512)?;
    raw.split(',').find_map(normalize_ip_candidate)
}

fn extract_single_ip_header(headers: &HeaderMap, name: &str) -> Option<String> {
    let raw = extract_header_text(headers, name, 128)?;
    normalize_ip_candidate(&raw)
}

fn extract_header_text(headers: &HeaderMap, name: &str, max_chars: usize) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| sanitize_header_text(value, max_chars))
}

fn sanitize_header_text(value: &str, max_chars: usize) -> Option<String> {
    let mut sanitized = String::new();
    for ch in value.chars().filter(|ch| !ch.is_control()) {
        if sanitized.chars().count() >= max_chars {
            break;
        }
        sanitized.push(ch);
    }

    let trimmed = sanitized.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn normalize_ip_candidate(value: &str) -> Option<String> {
    let trimmed = value.trim().trim_matches('"');
    if trimmed.is_empty() || trimmed == "_" || trimmed.eq_ignore_ascii_case("unknown") {
        return None;
    }

    if let Some(inner) = trimmed
        .strip_prefix('[')
        .and_then(|rest| rest.split(']').next())
    {
        if let Ok(ip) = inner.parse::<IpAddr>() {
            return Some(ip.to_string());
        }
    }

    if let Ok(socket) = trimmed.parse::<SocketAddr>() {
        return Some(socket.ip().to_string());
    }

    trimmed.parse::<IpAddr>().ok().map(|ip| ip.to_string())
}
