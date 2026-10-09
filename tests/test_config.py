import pytest

from sync.config import NotConfiguredError, SyncConfig, collect_secret_values, drive_credentials


def test_full_trio_is_refresh_mode():
    env = {"GOOGLE_DRIVE_REFRESH_TOKEN": "r", "GOOGLE_DRIVE_CLIENT_ID": "c",
           "GOOGLE_DRIVE_CLIENT_SECRET": "s"}
    assert drive_credentials(env) == "refresh_token"


def test_access_token_wins():
    env = {"GOOGLE_DRIVE_ACCESS_TOKEN": "a"}
    assert drive_credentials(env) == "access_token"


def test_service_account_mode():
    env = {"GOOGLE_SERVICE_ACCOUNT_JSON": "{}"}
    assert drive_credentials(env) == "service_account"


def test_half_trio_is_not_configured_and_names_only():
    env = {"GOOGLE_DRIVE_REFRESH_TOKEN": "VALUE-rt-9182736455",
           "GOOGLE_DRIVE_CLIENT_ID": "VALUE-cid-9182736455"}
    with pytest.raises(NotConfiguredError) as exc:
        drive_credentials(env)
    assert exc.value.missing == ["GOOGLE_DRIVE_CLIENT_SECRET"]
    message = str(exc.value)
    # NAMES of the missing vars appear; VALUES never do
    assert "GOOGLE_DRIVE_CLIENT_SECRET" in message
    assert "VALUE-rt-9182736455" not in message
    assert "VALUE-cid-9182736455" not in message


def test_nothing_configured_lists_full_trio():
    with pytest.raises(NotConfiguredError) as exc:
        drive_credentials({})
    assert len(exc.value.missing) == 3


def test_collect_secret_values():
    env = {"GOOGLE_DRIVE_CLIENT_SECRET": "abcdefghijklmnopqrstuvwxyz",
           "MY_CUSTOM_TOKEN": "0123456789abcdef",
           "PATH": "/usr/bin", "SYNC_VAULT_KEY": "k" * 32}
    values = collect_secret_values(env)
    assert "abcdefghijklmnopqrstuvwxyz" in values
    assert "0123456789abcdef" in values
    assert "k" * 32 in values
    assert "/usr/bin" not in values


def test_config_load_defaults_and_overrides(tmp_path):
    cfg = SyncConfig.load(tmp_path / "does-not-exist.yaml")
    assert cfg.sanitize is True and cfg.drive.max_file_bytes == 524288

    custom = tmp_path / "sync.yaml"
    custom.write_text("sanitize: false\ndrive:\n  max_files: 7\n", encoding="utf-8")
    cfg2 = SyncConfig.load(custom)
    assert cfg2.sanitize is False and cfg2.drive.max_files == 7


def test_config_load_rejects_non_mapping_yaml(tmp_path):
    bad = tmp_path / "sync.yaml"
    bad.write_text("- just\n- a\n- list\n", encoding="utf-8")
    with pytest.raises(ValueError) as exc:
        SyncConfig.load(bad)
    assert "must be a mapping" in str(exc.value)


def test_unknown_top_level_keys_are_ignored(tmp_path):
    cfg_file = tmp_path / "sync.yaml"
    cfg_file.write_text("sanitize: false\nnot_a_real_field: 42\ndrive:\n  max_files: 3\n",
                        encoding="utf-8")
    cfg = SyncConfig.load(cfg_file)
    assert cfg.sanitize is False
    assert cfg.drive.max_files == 3
    assert not hasattr(cfg, "not_a_real_field")


def test_unknown_drive_keys_are_rejected(tmp_path):
    cfg_file = tmp_path / "sync.yaml"
    cfg_file.write_text("drive:\n  folder_id: F\ntypo_field: 1\n", encoding="utf-8")
    SyncConfig.load(cfg_file)                      # unknown top-level: ignored
    cfg_file.write_text("drive:\n  not_a_drive_field: 1\n", encoding="utf-8")
    with pytest.raises(TypeError):
        SyncConfig.load(cfg_file)                  # unknown drive field: loud failure


def test_empty_config_file_yields_defaults(tmp_path):
    cfg_file = tmp_path / "sync.yaml"
    cfg_file.write_text("", encoding="utf-8")
    cfg = SyncConfig.load(cfg_file)
    assert cfg.sanitize is True and cfg.encrypt_raw is True
    assert cfg.drive.max_file_bytes == 524_288


def test_secret_values_ignore_short_and_empty():
    env = {"SYNC_VAULT_KEY": "short", "GITHUB_TOKEN": "", "MY_ADMIN_TOKEN": "a" * 12}
    values = collect_secret_values(env)
    assert "short" not in values and "" not in values
    assert "a" * 12 in values                      # *_TOKEN suffix, long enough
