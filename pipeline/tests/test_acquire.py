"""Offline downloader tests: every opener is fake; all outputs stay in pytest's OS temp directory."""

import hashlib
import http.client
import io
import stat
import zipfile
from types import SimpleNamespace
from urllib.error import HTTPError, URLError

import pytest
import yaml

from visceral_pipeline import acquire as acquisition
from visceral_pipeline.cli import main
from visceral_pipeline.constants import CONFIG


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


class Response(io.BytesIO):
    def __init__(self, payload, length=None):
        super().__init__(payload)
        self.headers = {"Content-Length": str(len(payload) if length is None else length)}


@pytest.fixture(autouse=True)
def prohibit_network(monkeypatch):
    def blocked(*args, **kwargs):
        raise AssertionError("A fake opener must be supplied; real downloads are prohibited in tests")

    monkeypatch.setattr(acquisition, "urlopen", blocked)


def source(tmp_path, payload=b"SYNTHETIC WHO data"):
    return acquisition.SourceFile(
        "who_ghe_2023",
        "data.xlsx",
        "https://example.invalid/data.xlsx?sfvrsn=test",
        tmp_path / "raw/data.xlsx",
        digest(payload),
    )


def fake_manifest(tmp_path, payload, archive_hash=None):
    archive = "isa_BP3D_4.0_obj_99.zip"
    manifest = {
        "who_ghe_2023": {
            "base_url": "https://example.invalid/who/",
            "files": {"deaths": {2023: "data.xlsx?sfvrsn=test"}},
            "sha256": {"data.xlsx": digest(payload)},
        },
        "bodyparts3d_4_0": {
            "base_url": "https://example.invalid/body/",
            "files": [archive],
            "sha256": {archive: archive_hash},
        },
    }
    path = tmp_path / "sources.yaml"
    path.write_text("# Preserve this comment\n" + yaml.safe_dump(manifest, sort_keys=False), encoding="utf-8")
    return path, manifest


def zip_bytes(names):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name in names:
            archive.writestr(name, "# SYNTHETIC OBJ\nv 0 0 0\n")
    return output.getvalue()


def test_query_stays_in_request_but_not_in_filename(tmp_path):
    _, manifest = fake_manifest(tmp_path, b"test")
    plans = acquisition.source_files(manifest, root=tmp_path, who=True)
    assert len(plans) == 1
    assert plans[0].url == "https://example.invalid/who/data.xlsx?sfvrsn=test"
    assert plans[0].path == tmp_path / "pipeline/data/raw/who_ghe2023/data.xlsx"
    assert (
        acquisition.filename("https://example.invalid/deaths_2023-extra.xlsx?sfvrsn=1#note")
        == "deaths_2023-extra.xlsx"
    )


def test_streamed_matching_hash_publishes_atomically_with_user_agent(tmp_path, monkeypatch):
    payload = b"synthetic" * acquisition.CHUNK_SIZE
    item = source(tmp_path, payload)
    requests = []

    def opener(request, timeout):
        requests.append(request)
        assert timeout == 60
        assert not item.path.exists()
        assert "Visceral" in request.get_header("User-agent")
        return Response(payload)

    monkeypatch.setattr(acquisition, "urlopen", opener)
    result = acquisition.download(item)
    assert result.status == "DOWNLOADED"
    assert result.sha256 == digest(payload)
    assert result.size == len(payload)
    assert item.path.read_bytes() == payload
    assert len(requests) == 1
    assert not list(item.path.parent.glob(".download-*"))


@pytest.mark.parametrize("force", [False, True])
def test_hash_mismatch_preserves_existing_file_and_removes_temp(tmp_path, monkeypatch, force):
    item = source(tmp_path)
    item.path.parent.mkdir()
    item.path.write_bytes(b"previous data")
    monkeypatch.setattr(acquisition, "urlopen", lambda *a, **k: Response(b"corrupt response"))
    with pytest.raises(ValueError, match="SHA-256 mismatch"):
        acquisition.download(item, force=force)
    assert item.path.read_bytes() == b"previous data"
    assert not list(item.path.parent.glob(".download-*"))


def test_skip_matching_file_without_opening_network(tmp_path):
    payload = b"synthetic existing data"
    item = source(tmp_path, payload)
    item.path.parent.mkdir()
    item.path.write_bytes(payload)
    assert acquisition.download(item).status == "SKIPPED"


def test_force_redownloads_but_retains_known_pin(tmp_path, monkeypatch):
    payload = b"synthetic existing data"
    item = source(tmp_path, payload)
    item.path.parent.mkdir()
    item.path.write_bytes(payload)
    calls = []
    monkeypatch.setattr(acquisition, "urlopen", lambda *a, **k: calls.append(1) or Response(payload))
    assert acquisition.download(item, force=True).status == "DOWNLOADED"
    assert calls == [1]


def test_transient_errors_retry_with_backoff(tmp_path, monkeypatch):
    payload = b"synthetic data"
    item = source(tmp_path, payload)
    replies = iter(
        [HTTPError(item.url, 503, "Unavailable", None, None), URLError("connection reset"), Response(payload)]
    )
    delays = []

    def opener(*args, **kwargs):
        reply = next(replies)
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(acquisition, "urlopen", opener)
    monkeypatch.setattr(acquisition.time, "sleep", delays.append)
    assert acquisition.download(item).sha256 == digest(payload)
    assert delays == [1, 2]


def test_permanent_http_error_does_not_retry(tmp_path, monkeypatch):
    calls = []

    def opener(*args, **kwargs):
        calls.append(1)
        raise HTTPError("https://example.invalid", 404, "Missing", None, None)

    monkeypatch.setattr(acquisition, "urlopen", opener)
    with pytest.raises(HTTPError):
        acquisition.download(source(tmp_path))
    assert calls == [1]
    assert not list((tmp_path / "raw").glob(".download-*"))


def test_truncated_response_exhausts_retries_without_publishing(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(
        acquisition, "urlopen", lambda *a, **k: calls.append(1) or Response(b"short", length=20)
    )
    monkeypatch.setattr(acquisition.time, "sleep", lambda delay: None)
    item = source(tmp_path)
    with pytest.raises(http.client.IncompleteRead):
        acquisition.download(item)
    assert calls == [1, 1, 1]
    assert not item.path.exists()


def test_unknown_hash_recorded_after_extraction_and_cached_zip_repairs_objects(tmp_path, monkeypatch, capsys):
    payload = zip_bytes(["isa_BP3D_4.0_obj_99/FJ123.obj"])
    path, original = fake_manifest(tmp_path, b"WHO pin is unchanged")
    monkeypatch.setattr(acquisition, "urlopen", lambda *a, **k: Response(payload))
    results = acquisition.acquire(bodyparts3d=True, manifest_path=path, root=tmp_path)
    assert [r.status for r in results] == ["RECORDED"]
    recorded = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert recorded["bodyparts3d_4_0"]["sha256"]["isa_BP3D_4.0_obj_99.zip"] == digest(payload)
    assert recorded["who_ghe_2023"] == original["who_ghe_2023"]
    assert path.read_text(encoding="utf-8").startswith("# Preserve this comment")
    assert "No prior trusted hash" in capsys.readouterr().out
    obj = tmp_path / "assets/source/bodyparts3d/obj/isa_BP3D_4.0_obj_99/FJ123.obj"
    assert obj.is_file()
    obj.unlink()
    monkeypatch.setattr(acquisition, "urlopen", lambda *a, **k: pytest.fail("matching ZIP must not download"))
    results = acquisition.acquire(bodyparts3d=True, manifest_path=path, root=tmp_path)
    assert results[0].status == "SKIPPED"
    assert obj.is_file()


@pytest.mark.parametrize("prefix", ["", "isa_BP3D_4.0_obj_99/", "obj/isa_BP3D_4.0_obj_99/"])
def test_obj_zip_layout_is_normalized(tmp_path, prefix):
    archive = tmp_path / "isa_BP3D_4.0_obj_99.zip"
    archive.write_bytes(zip_bytes([f"{prefix}FJ123.obj"]))
    assert acquisition.extract_objects(archive) == 1
    assert (tmp_path / "obj/isa_BP3D_4.0_obj_99/FJ123.obj").is_file()


@pytest.mark.parametrize(
    "name", ["../outside.obj", "/absolute.obj", "C:/outside.obj", "tree/../../outside.obj", "..\\outside.obj"]
)
def test_zip_traversal_is_rejected_before_any_extraction(tmp_path, name):
    archive = tmp_path / "isa_BP3D_4.0_obj_99.zip"
    archive.write_bytes(zip_bytes(["FJ123.obj", name]))
    with pytest.raises(ValueError, match="Unsafe ZIP"):
        acquisition.extract_objects(archive)
    assert not (tmp_path / "obj").exists()


def test_zip_symlinks_are_rejected(tmp_path):
    archive = tmp_path / "isa_BP3D_4.0_obj_99.zip"
    with zipfile.ZipFile(archive, "w") as zipped:
        link = zipfile.ZipInfo("FJ123.obj")
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        zipped.writestr(link, "outside.obj")
    with pytest.raises(ValueError, match="Unsafe ZIP"):
        acquisition.extract_objects(archive)


def test_acquire_reports_failure_and_cli_exits_nonzero(tmp_path, monkeypatch, capsys):
    path, _ = fake_manifest(tmp_path, b"expected data")
    monkeypatch.setattr(acquisition, "urlopen", lambda *a, **k: Response(b"wrong data"))
    result = acquisition.acquire(who=True, manifest_path=path, root=tmp_path)
    assert result[0].status == "FAILED"
    assert "SHA-256 mismatch" in capsys.readouterr().out
    calls = []
    monkeypatch.setattr(
        acquisition, "acquire", lambda **kwargs: calls.append(kwargs) or [SimpleNamespace(status="FAILED")]
    )
    with pytest.raises(SystemExit) as error:
        main(["acquire", "--who", "--force"])
    assert error.value.code == 1
    assert calls == [{"who": True, "bodyparts3d": False, "force": True}]


def test_recording_cannot_replace_a_known_hash(tmp_path):
    path, _ = fake_manifest(tmp_path, b"known")
    original = path.read_bytes()
    with pytest.raises(ValueError, match="Refusing to change"):
        acquisition.record_hash(path, "who_ghe_2023", "data.xlsx", digest(b"different"))
    assert path.read_bytes() == original


def test_failed_unknown_archive_keeps_hash_null_and_existing_objects(tmp_path, monkeypatch):
    path, _ = fake_manifest(tmp_path, b"WHO pin")
    original = path.read_bytes()
    payload = zip_bytes(["FJ123.obj", "../outside.obj"])
    monkeypatch.setattr(acquisition, "urlopen", lambda *a, **k: Response(payload))
    obj = tmp_path / "assets/source/bodyparts3d/obj/isa_BP3D_4.0_obj_99/FJ123.obj"
    obj.parent.mkdir(parents=True)
    obj.write_bytes(b"existing OBJ")
    results = acquisition.acquire(bodyparts3d=True, manifest_path=path, root=tmp_path)
    assert results[0].status == "FAILED"
    assert path.read_bytes() == original
    assert obj.read_bytes() == b"existing OBJ"
    assert not list(obj.parents[2].glob(".extract-*"))


def test_real_manifest_selections_are_complete_without_network_or_raw_data(tmp_path):
    manifest = yaml.safe_load((CONFIG / "sources.yaml").read_text(encoding="utf-8"))
    assert len(acquisition.source_files(manifest, root=tmp_path, who=True)) == 19
    body = acquisition.source_files(manifest, root=tmp_path, bodyparts3d=True)
    assert len(body) == 7
    assert "isa_BP3D_4.0_obj_99.zip" in {p.name for p in body}
    assert len(acquisition.source_files(manifest, root=tmp_path)) == 26
