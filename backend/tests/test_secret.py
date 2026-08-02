from app.secret import load_or_create_secret


def test_generates_and_persists_secret(tmp_path):
    secret_file = tmp_path / "jwt_secret"
    first = load_or_create_secret(secret_file)
    assert first and secret_file.exists()
    assert oct(secret_file.stat().st_mode)[-3:] == "600"


def test_reuses_persisted_secret(tmp_path):
    secret_file = tmp_path / "jwt_secret"
    first = load_or_create_secret(secret_file)
    assert load_or_create_secret(secret_file) == first
