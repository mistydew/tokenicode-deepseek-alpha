//! cc-switch configuration integration
//!
//! Reads API provider configurations from cc-switch's SQLite database and
//! converts them to TOKENICODE format.
//!
//! Real cc-switch `providers` table schema (composite PK `id, app_type`):
//!   id, app_type, name, settings_config (JSON), website_url, category,
//!   created_at, sort_index, notes, icon, icon_color, meta (JSON),
//!   is_current, in_failover_queue, cost_multiplier, ...
//!
//! Connection info lives inside `settings_config.env` (e.g.
//! `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_DEFAULT_*_MODEL`),
//! and `apiFormat` lives inside `meta`. Only `app_type = 'claude'` rows are
//! imported — TOKENICODE speaks the Anthropic protocol that Claude Code uses.

use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Raw cc-switch provider row mirroring the real SQLite schema.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CCSwitchProvider {
    pub id: String,
    pub app_type: String,
    pub name: String,
    /// JSON blob: holds `env`, `hooks`, `permissions`, ... We only read `env`.
    pub settings_config: String,
    /// JSON blob: holds `apiFormat`, `usage_script`, ... We only read `apiFormat`.
    pub meta: String,
    pub is_current: bool,
    pub created_at: Option<i64>,
    pub sort_index: Option<i64>,
}

/// Provider configuration compatible with TOKENICODE's provider system.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(non_snake_case)]
pub struct TokenicodeProvider {
    pub id: String,
    pub name: String,
    pub baseUrl: String,
    pub apiFormat: String,
    pub apiKey: String,
    pub modelMappings: Vec<ModelMapping>,
    pub extra_env: Option<HashMap<String, String>>,
    pub createdAt: i64,
    pub updatedAt: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(non_snake_case)]
pub struct ModelMapping {
    pub tier: String,
    pub providerModel: String,
}

/// Fallback model used when the cc-switch env does not specify one.
const DEFAULT_OPUS_MODEL: &str = "deepseek-v4-pro";
const DEFAULT_FLASH_MODEL: &str = "deepseek-v4-flash";

/// Find cc-switch database file in the standard location.
pub fn find_cc_switch_db() -> Option<PathBuf> {
    // cc-switch stores its database at ~/.cc-switch/cc-switch.db on every
    // platform (the home dir differs by OS but `dirs::home_dir` handles that).
    let mut db_path = dirs::home_dir()?;
    db_path.push(".cc-switch");
    db_path.push("cc-switch.db");
    if db_path.exists() {
        Some(db_path)
    } else {
        None
    }
}

/// Read all `app_type = 'claude'` providers from cc-switch's database.
pub fn read_cc_switch_providers() -> Result<Vec<CCSwitchProvider>, String> {
    let db_path = find_cc_switch_db().ok_or_else(|| {
        "cc-switch database not found. Please ensure cc-switch is installed and has been configured."
            .to_string()
    })?;

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open cc-switch database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, app_type, name, settings_config, meta, is_current, created_at, sort_index
             FROM providers
             WHERE app_type = 'claude'
             ORDER BY sort_index, created_at",
        )
        .map_err(|e| format!("Failed to query providers: {}", e))?;

    let providers = stmt
        .query_map([], |row| {
            Ok(CCSwitchProvider {
                id: row.get(0)?,
                app_type: row.get(1)?,
                name: row.get(2)?,
                settings_config: row.get(3)?,
                meta: row.get(4)?,
                is_current: row.get(5)?,
                created_at: row.get(6)?,
                sort_index: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to map providers: {}", e))?
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| format!("Failed to collect providers: {}", e))?;

    Ok(providers)
}

/// Pull a string value out of a JSON object by key.
fn json_string(value: &serde_json::Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Convert a raw cc-switch row into TOKENICODE's provider format.
///
/// Returns `Err` with a per-row reason when the row should be skipped (e.g.
/// missing base URL, or an unsupported apiFormat), so the caller can decide
/// whether to log and continue.
pub fn cc_switch_to_tokenicode(
    provider: &CCSwitchProvider,
) -> Result<TokenicodeProvider, String> {
    // Parse the settings_config JSON blob — only the `env` object is needed.
    let settings: serde_json::Value = serde_json::from_str(&provider.settings_config)
        .map_err(|e| format!("Failed to parse settings_config: {}", e))?;
    let env = settings
        .get("env")
        .and_then(|v| v.as_object())
        .ok_or_else(|| "settings_config has no env object".to_string())?;

    let base_url = env
        .get("ANTHROPIC_BASE_URL")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "env has no ANTHROPIC_BASE_URL".to_string())?;

    let api_key = env
        .get("ANTHROPIC_AUTH_TOKEN")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    // apiFormat lives in the meta blob. claude rows should be "anthropic";
    // anything else is unexpected for app_type=claude, so skip it.
    let meta: serde_json::Value = serde_json::from_str(&provider.meta).unwrap_or_default();
    let api_format = json_string(&meta, "apiFormat").unwrap_or_else(|| "anthropic".to_string());
    if api_format != "anthropic" {
        return Err(format!(
            "unsupported apiFormat '{}' for app_type=claude (expected 'anthropic')",
            api_format
        ));
    }

    let env_string = |key: &str| -> Option<String> {
        env.get(key)
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    };
    let default_model = env_string("ANTHROPIC_MODEL");

    let opus_model = env_string("ANTHROPIC_DEFAULT_OPUS_MODEL")
        .or_else(|| default_model.clone())
        .unwrap_or_else(|| DEFAULT_OPUS_MODEL.to_string());
    let sonnet_model = env_string("ANTHROPIC_DEFAULT_SONNET_MODEL")
        .or_else(|| default_model.clone())
        .unwrap_or_else(|| DEFAULT_FLASH_MODEL.to_string());
    let haiku_model = env_string("ANTHROPIC_DEFAULT_HAIKU_MODEL")
        .or_else(|| default_model)
        .unwrap_or_else(|| DEFAULT_FLASH_MODEL.to_string());

    // Carry over non-ANTHROPIC env vars (e.g. API_TIMEOUT_MS) as extra_env.
    let extra_env: HashMap<String, String> = env
        .iter()
        .filter_map(|(k, v)| {
            if k.starts_with("ANTHROPIC_") {
                return None;
            }
            let val = v.as_str()?.trim();
            if val.is_empty() {
                return None;
            }
            Some((k.clone(), val.to_string()))
        })
        .collect();
    let extra_env = if extra_env.is_empty() {
        None
    } else {
        Some(extra_env)
    };

    let name = if provider.name.trim().is_empty() {
        base_url.clone()
    } else {
        provider.name.clone()
    };

    let now = chrono::Utc::now().timestamp_millis();
    let created = provider.created_at.unwrap_or(now);

    Ok(TokenicodeProvider {
        id: format!("ccswitch_{}", provider.id),
        name,
        baseUrl: base_url,
        apiFormat: api_format,
        apiKey: api_key,
        modelMappings: vec![
            ModelMapping {
                tier: "opus".to_string(),
                providerModel: opus_model,
            },
            ModelMapping {
                tier: "sonnet".to_string(),
                providerModel: sonnet_model,
            },
            ModelMapping {
                tier: "haiku".to_string(),
                providerModel: haiku_model,
            },
        ],
        extra_env,
        createdAt: created,
        updatedAt: created,
    })
}

/// Get all cc-switch providers (claude app_type) in TOKENICODE format.
///
/// Rows that fail conversion are skipped silently — they represent incomplete
/// or unsupported configurations (e.g. a provider with no base URL).
pub fn get_tokenicode_providers() -> Result<Vec<TokenicodeProvider>, String> {
    let cc_providers = read_cc_switch_providers()?;
    Ok(cc_providers
        .iter()
        .filter_map(|p| match cc_switch_to_tokenicode(p) {
            Ok(tp) => Some(tp),
            Err(reason) => {
                eprintln!(
                    "[cc_switch] skipping provider '{}' ({}): {}",
                    p.name, p.id, reason
                );
                None
            }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_cc_switch_db() {
        // Passes when cc-switch is installed on this machine.
        let result = find_cc_switch_db();
        println!("cc-switch DB path: {:?}", result);
    }

    #[test]
    fn test_full_chain_read_and_convert() {
        // End-to-end: read the real cc-switch database and convert every row.
        // Only asserts when cc-switch is actually installed.
        if find_cc_switch_db().is_none() {
            println!("cc-switch not installed — skipping");
            return;
        }

        let providers = get_tokenicode_providers().expect("read should succeed");
        println!("✅ converted {} cc-switch provider(s):", providers.len());
        for p in &providers {
            println!(
                "  - id={} name={} baseUrl={} apiKey={} apiFormat={} opus={} sonnet={} haiku={} extra_env={:?}",
                p.id,
                p.name,
                p.baseUrl,
                if p.apiKey.is_empty() { "<empty>" } else { "<set>" },
                p.apiFormat,
                p.modelMappings[0].providerModel,
                p.modelMappings[1].providerModel,
                p.modelMappings[2].providerModel,
                p.extra_env,
            );
            assert!(!p.baseUrl.is_empty(), "baseUrl must not be empty");
            assert_eq!(p.apiFormat, "anthropic", "apiFormat must be anthropic");
            assert_eq!(p.modelMappings.len(), 3, "must have 3 model mappings");
            assert!(
                p.modelMappings.iter().all(|m| !m.providerModel.is_empty()),
                "no providerModel may be empty"
            );
        }
        assert!(
            !providers.is_empty(),
            "expected at least one claude provider in cc-switch"
        );
    }

    #[test]
    fn test_convert_skips_unsupported_api_format() {
        let row = CCSwitchProvider {
            id: "x".into(),
            app_type: "claude".into(),
            name: "test".into(),
            settings_config: r#"{"env":{"ANTHROPIC_BASE_URL":"https://example.com","ANTHROPIC_AUTH_TOKEN":"k"}}"#.into(),
            meta: r#"{"apiFormat":"openai_chat"}"#.into(),
            is_current: false,
            created_at: None,
            sort_index: None,
        };
        let err = cc_switch_to_tokenicode(&row).unwrap_err();
        assert!(err.contains("unsupported apiFormat"));
    }

    #[test]
    fn test_convert_extracts_env_and_extra_env() {
        let row = CCSwitchProvider {
            id: "y".into(),
            app_type: "claude".into(),
            name: "test".into(),
            settings_config: r#"{"env":{"ANTHROPIC_BASE_URL":"https://api.example.com","ANTHROPIC_AUTH_TOKEN":"secret","ANTHROPIC_DEFAULT_OPUS_MODEL":"m-opus","ANTHROPIC_MODEL":"m-default","API_TIMEOUT_MS":"30000","CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC":"1"}}"#.into(),
            meta: r#"{"apiFormat":"anthropic"}"#.into(),
            is_current: false,
            created_at: Some(1700000000000),
            sort_index: Some(0),
        };
        let tp = cc_switch_to_tokenicode(&row).expect("conversion should succeed");
        assert_eq!(tp.baseUrl, "https://api.example.com");
        assert_eq!(tp.apiKey, "secret");
        assert_eq!(tp.apiFormat, "anthropic");
        assert_eq!(tp.modelMappings[0].tier, "opus");
        assert_eq!(tp.modelMappings[0].providerModel, "m-opus");
        // ANTHROPIC_DEFAULT_SONNET_MODEL missing → falls back to ANTHROPIC_MODEL.
        assert_eq!(tp.modelMappings[1].providerModel, "m-default");
        assert_eq!(tp.modelMappings[2].providerModel, "m-default");
        // extra_env keeps only non-ANTHROPIC_ keys.
        let extra = tp.extra_env.expect("extra_env should be set");
        assert_eq!(extra.get("API_TIMEOUT_MS").map(String::as_str), Some("30000"));
        assert_eq!(
            extra.get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC").map(String::as_str),
            Some("1")
        );
        assert!(extra.keys().all(|k| !k.starts_with("ANTHROPIC_")));
    }

    #[test]
    fn test_convert_skips_missing_base_url() {
        let row = CCSwitchProvider {
            id: "z".into(),
            app_type: "claude".into(),
            name: "empty".into(),
            settings_config: r#"{"env":{"ANTHROPIC_AUTH_TOKEN":"k"}}"#.into(),
            meta: r#"{"apiFormat":"anthropic"}"#.into(),
            is_current: false,
            created_at: None,
            sort_index: None,
        };
        let err = cc_switch_to_tokenicode(&row).unwrap_err();
        assert!(err.contains("ANTHROPIC_BASE_URL"));
    }
}
