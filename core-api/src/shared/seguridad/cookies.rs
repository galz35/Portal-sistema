use std::env;

use axum::http::HeaderMap;

pub struct CookiePolicy {
    pub name: &'static str,
    pub secure: bool,
    pub http_only: bool,
    pub same_site: &'static str,
    pub domain: Option<String>,
    pub path: &'static str,
    pub max_age_seconds: i64,
}

pub fn access_cookie_policy() -> CookiePolicy {
    CookiePolicy {
        name: "portal_sid",
        secure: env_flag("COOKIE_SECURE", !is_local_host_env("CORE_API_HOST")),
        http_only: true,
        same_site: "Lax",
        domain: cookie_domain("PORTAL_COOKIE_DOMAIN"),
        path: "/",
        max_age_seconds: 15 * 60,
    }
}

pub fn refresh_cookie_policy() -> CookiePolicy {
    CookiePolicy {
        name: "portal_refresh",
        secure: env_flag("COOKIE_SECURE", !is_local_host_env("CORE_API_HOST")),
        http_only: true,
        same_site: "Lax",
        domain: cookie_domain("PORTAL_COOKIE_DOMAIN"),
        path: "/",
        max_age_seconds: 7 * 24 * 60 * 60,
    }
}

pub fn csrf_cookie_policy() -> CookiePolicy {
    CookiePolicy {
        name: "portal_csrf",
        secure: env_flag("COOKIE_SECURE", !is_local_host_env("CORE_API_HOST")),
        http_only: false,
        same_site: "Lax",
        domain: cookie_domain("PORTAL_COOKIE_DOMAIN"),
        path: "/",
        max_age_seconds: 2 * 60 * 60,
    }
}

pub fn build_set_cookie(policy: &CookiePolicy, value: &str) -> String {
    format!(
        "{}={}; Path={}; Max-Age={}; SameSite={}; {}{}{}",
        policy.name,
        value,
        policy.path,
        policy.max_age_seconds,
        policy.same_site,
        policy
            .domain
            .as_deref()
            .map(|domain| format!("Domain={domain}; "))
            .unwrap_or_default(),
        if policy.http_only { "HttpOnly; " } else { "" },
        if policy.secure { "Secure" } else { "" }
    )
    .trim_end_matches("; ")
    .to_string()
}

pub fn build_clear_cookie(policy: &CookiePolicy) -> String {
    format!(
        "{}=; Path={}; Max-Age=0; SameSite={}; {}{}{}",
        policy.name,
        policy.path,
        policy.same_site,
        policy
            .domain
            .as_deref()
            .map(|domain| format!("Domain={domain}; "))
            .unwrap_or_default(),
        if policy.http_only { "HttpOnly; " } else { "" },
        if policy.secure { "Secure" } else { "" }
    )
    .trim_end_matches("; ")
    .to_string()
}

pub fn read_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    let cookie_header = headers.get("cookie")?.to_str().ok()?;

    cookie_header.split(';').find_map(|part| {
        let mut pieces = part.trim().splitn(2, '=');
        let key = pieces.next()?.trim();
        let value = pieces.next()?.trim();

        if key == name {
            Some(value.to_string())
        } else {
            None
        }
    })
}

fn env_flag(name: &str, default: bool) -> bool {
    env::var(name)
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(default)
}

fn cookie_domain(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().trim_start_matches('.').to_string())
        .filter(|value| !value.is_empty())
        .map(|value| format!(".{value}"))
}

fn is_local_host_env(name: &str) -> bool {
    env::var(name)
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "127.0.0.1" | "localhost" | "::1"
            )
        })
        .unwrap_or(true)
}
