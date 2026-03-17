use std::{
    collections::{HashMap, VecDeque},
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};

#[derive(Debug, Clone, Copy)]
pub struct RateLimitDecision {
    pub allowed: bool,
    pub retry_after_seconds: u64,
}

static RATE_LIMIT_STATE: OnceLock<Mutex<HashMap<String, VecDeque<Instant>>>> = OnceLock::new();

pub fn check_sliding_window(
    key: &str,
    max_attempts: u32,
    window_seconds: u64,
) -> RateLimitDecision {
    if max_attempts == 0 || window_seconds == 0 {
        return RateLimitDecision {
            allowed: true,
            retry_after_seconds: 0,
        };
    }

    let now = Instant::now();
    let window = Duration::from_secs(window_seconds);
    let state = RATE_LIMIT_STATE.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = match state.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

    let entry = guard.entry(key.to_string()).or_default();
    while let Some(oldest) = entry.front() {
        if now.duration_since(*oldest) >= window {
            entry.pop_front();
        } else {
            break;
        }
    }

    if entry.len() >= max_attempts as usize {
        let retry_after_seconds = entry
            .front()
            .map(|oldest| {
                window
                    .saturating_sub(now.duration_since(*oldest))
                    .as_secs()
                    .max(1)
            })
            .unwrap_or(1);

        return RateLimitDecision {
            allowed: false,
            retry_after_seconds,
        };
    }

    entry.push_back(now);

    RateLimitDecision {
        allowed: true,
        retry_after_seconds: 0,
    }
}
