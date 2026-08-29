#!/usr/bin/env python3
"""Install and verify Dashboard Help Badge on an explicitly authorized lab.

The script parses literal KEY=value credentials without shell evaluation and
emits only source-safe evidence. It never prints credentials, endpoints,
response bodies, or its one-use package URL.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import socket
import ssl
import tarfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from secrets import token_urlsafe
from typing import Any, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import HTTPHandler, HTTPRedirectHandler, HTTPSHandler, Request, build_opener


MAX_PACKAGE_BYTES = 16_777_216
MAX_RESPONSE_BYTES = 65_536
SAFE_NAME = re.compile(r"^[a-z][a-z0-9_]{0,99}$")
REQUIRED_VISUALIZATIONS = ("help_badge", "help_panel", "help_tooltip", "help_trigger")
EXPECTED_NAVIGATION_ICONS = {
    "/app/dashboard_help_badge/dashboard_help_badge_demo": "organizernotebook",
    "/app/dashboard_help_badge/dashboard_help_badge_dark_demo": "monitor",
}


class InstallError(RuntimeError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


class NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        return None


def load_env(path: Path) -> dict[str, str]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise InstallError("env_read_failed") from exc
    values: dict[str, str] = {}
    for line in lines:
        if not line or line.lstrip().startswith("#"):
            continue
        if "=" not in line:
            raise InstallError("env_line_invalid")
        key, value = line.split("=", 1)
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key) or key in values:
            raise InstallError("env_key_invalid")
        values[key] = value
    return values


def env_key(prefix: str, suffix: str) -> str:
    if not re.fullmatch(r"[A-Z][A-Z0-9_]{0,63}", prefix):
        raise InstallError("prefix_invalid")
    return f"{prefix}_SPLUNK_{suffix}"


def authorization(values: Mapping[str, str], prefix: str) -> str:
    bearer = values.get(env_key(prefix, "BEARER_TOKEN"), "").strip()
    if bearer:
        return "Bearer " + bearer
    username = values.get(env_key(prefix, "USERNAME"), "").strip()
    password = values.get(env_key(prefix, "PASSWORD"), "")
    if not username or not password:
        raise InstallError("authentication_missing")
    encoded = base64.b64encode(f"{username}:{password}".encode()).decode("ascii")
    return "Basic " + encoded


def ssl_context(values: Mapping[str, str], prefix: str) -> tuple[ssl.SSLContext, bool]:
    verify_text = values.get(env_key(prefix, "VERIFY_TLS"), "true").strip().lower()
    if verify_text not in {"true", "false"}:
        raise InstallError("tls_setting_invalid")
    verify = verify_text == "true"
    ca_path = values.get(env_key(prefix, "CA_CERT_PATH"), "").strip()
    try:
        if verify:
            return ssl.create_default_context(cafile=ca_path or None), True
        return ssl._create_unverified_context(), False
    except (OSError, ssl.SSLError) as exc:
        raise InstallError("tls_context_failed") from exc


def timeout_seconds(values: Mapping[str, str], prefix: str) -> int:
    raw = values.get(f"{prefix}_REQUEST_TIMEOUT_SECONDS", "15").strip() or "15"
    try:
        timeout = int(raw)
    except ValueError as exc:
        raise InstallError("timeout_invalid") from exc
    if timeout < 1 or timeout > 60:
        raise InstallError("timeout_out_of_bounds")
    return timeout


def management_origins(values: Mapping[str, str], prefix: str) -> list[str]:
    port_text = values.get(env_key(prefix, "MANAGEMENT_PORT"), "8089").strip() or "8089"
    try:
        management_port = int(port_text)
    except ValueError as exc:
        raise InstallError("management_port_invalid") from exc
    origins: list[str] = []
    for raw in (
        values.get(env_key(prefix, "URL"), "").strip(),
        values.get(env_key(prefix, "HOST"), "").strip(),
    ):
        if not raw:
            continue
        parsed = urlparse(raw if "://" in raw else "//" + raw)
        if not parsed.hostname or parsed.username or parsed.password:
            continue
        scheme = parsed.scheme or "https"
        if scheme not in {"http", "https"}:
            continue
        derived = f"{scheme}://{parsed.hostname}:{management_port}"
        if derived not in origins:
            origins.append(derived)
        try:
            configured_port = parsed.port
        except ValueError:
            configured_port = None
        if configured_port:
            configured = f"{scheme}://{parsed.hostname}:{configured_port}"
            if configured not in origins:
                origins.append(configured)
    if not origins:
        raise InstallError("connection_target_missing")
    return origins


def opener(context: ssl.SSLContext):
    return build_opener(HTTPHandler(), HTTPSHandler(context=context), NoRedirectHandler())


def request_json(
    web_opener,
    origin: str,
    path: str,
    authorization_value: str,
    timeout: int,
    *,
    form: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    body = urlencode(form).encode() if form is not None else None
    request = Request(
        origin + path,
        data=body,
        headers={
            "Authorization": authorization_value,
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST" if form is not None else "GET",
    )
    try:
        with web_opener.open(request, timeout=timeout) as response:
            payload = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        raise InstallError(f"http_{exc.code}") from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise InstallError("request_failed") from exc
    if len(payload) > MAX_RESPONSE_BYTES:
        raise InstallError("response_too_large")
    try:
        decoded = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InstallError("response_invalid_json") from exc
    if not isinstance(decoded, Mapping):
        raise InstallError("response_invalid_shape")
    return decoded


def select_origin(
    origins: list[str],
    authorization_value: str,
    context: ssl.SSLContext,
    timeout: int,
) -> tuple[str, Mapping[str, Any]]:
    web_opener = opener(context)
    for origin in origins:
        try:
            payload = request_json(
                web_opener,
                origin,
                "/services/server/info?output_mode=json",
                authorization_value,
                timeout,
            )
            return origin, payload
        except InstallError:
            continue
    raise InstallError("server_info_probe_failed")


def first_entry_content(payload: Mapping[str, Any], error_code: str) -> Mapping[str, Any]:
    entries = payload.get("entry")
    if not isinstance(entries, list) or not entries or not isinstance(entries[0], Mapping):
        raise InstallError(error_code)
    content = entries[0].get("content")
    if not isinstance(content, Mapping):
        raise InstallError(error_code)
    return content


def server_version(payload: Mapping[str, Any]) -> str:
    version = first_entry_content(payload, "server_info_invalid").get("version")
    if not isinstance(version, str) or not version:
        raise InstallError("server_version_invalid")
    return version


def origin_matches_ipv4_last_octet(origin: str, expected_last_octet: int) -> bool:
    parsed = urlparse(origin)
    if not parsed.hostname or expected_last_octet < 0 or expected_last_octet > 255:
        return False
    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 8089, socket.AF_INET)
    except OSError:
        return False
    return any(address[4][0].rsplit(".", 1)[-1] == str(expected_last_octet) for address in addresses)


def inspect_archive(archive: Path, app_id: str) -> str:
    try:
        package_bytes = archive.read_bytes()
        if len(package_bytes) > MAX_PACKAGE_BYTES:
            raise InstallError("package_too_large")
        digest = hashlib.sha256(package_bytes).hexdigest()
        with tarfile.open(archive, "r:gz") as package:
            members = package.getmembers()
    except (OSError, tarfile.TarError) as exc:
        raise InstallError("package_read_failed") from exc
    if not members:
        raise InstallError("package_empty")
    names = {member.name.rstrip("/") for member in members}
    for member in members:
        normalized = member.name.rstrip("/")
        if (
            member.name.startswith("/")
            or ".." in Path(member.name).parts
            or not (normalized == app_id or normalized.startswith(app_id + "/"))
            or member.issym()
            or member.islnk()
        ):
            raise InstallError("package_structure_invalid")
        if any(
            part == ".DS_Store" or part == "__MACOSX" or part.startswith("._")
            for part in Path(member.name).parts
        ):
            raise InstallError("package_macos_metadata_found")
    required = {
        f"{app_id}/default/app.conf",
        f"{app_id}/default/visualizations.conf",
        f"{app_id}/default/data/ui/views/dashboard_help_badge_demo.xml",
    }
    for visualization in REQUIRED_VISUALIZATIONS:
        required.add(
            f"{app_id}/appserver/static/visualizations/{visualization}/config.json"
        )
        required.add(
            f"{app_id}/appserver/static/visualizations/{visualization}/visualization.js"
        )
    if not required.issubset(names):
        raise InstallError("package_runtime_payload_missing")
    return digest


def route_local_ip(origin: str) -> str:
    parsed = urlparse(origin)
    if not parsed.hostname or not parsed.port:
        raise InstallError("origin_invalid")
    try:
        candidates = socket.getaddrinfo(parsed.hostname, parsed.port, socket.AF_INET, socket.SOCK_DGRAM)
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(candidates[0][4])
            local_ip = probe.getsockname()[0]
    except OSError as exc:
        raise InstallError("local_route_unavailable") from exc
    if not local_ip or local_ip.startswith("127."):
        raise InstallError("local_route_unavailable")
    return local_ip


class OneUsePackageServer:
    def __init__(self, archive: Path, origin: str) -> None:
        self.archive = archive
        self.path = "/" + token_urlsafe(24) + "/" + archive.name
        self.served = threading.Event()
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:  # noqa: N802
                if self.path != outer.path or outer.served.is_set():
                    self.send_error(404)
                    return
                try:
                    size = outer.archive.stat().st_size
                    self.send_response(200)
                    self.send_header("Content-Type", "application/gzip")
                    self.send_header("Content-Length", str(size))
                    self.end_headers()
                    with outer.archive.open("rb") as package:
                        while chunk := package.read(65_536):
                            self.wfile.write(chunk)
                    outer.served.set()
                except (OSError, BrokenPipeError):
                    return

            def log_message(self, format: str, *args: object) -> None:
                return

        self.local_ip = route_local_ip(origin)
        self.server = ThreadingHTTPServer(("0.0.0.0", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    @property
    def package_url(self) -> str:
        return f"http://{self.local_ip}:{self.server.server_port}{self.path}"

    def __enter__(self) -> OneUsePackageServer:
        self.thread.start()
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:  # type: ignore[no-untyped-def]
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)


def exact_object_present(
    web_opener,
    origin: str,
    authorization_value: str,
    timeout: int,
    path: str,
) -> bool:
    payload = request_json(web_opener, origin, path, authorization_value, timeout)
    entries = payload.get("entry")
    return isinstance(entries, list) and len(entries) == 1


def navigation_icons_present(
    web_opener,
    origin: str,
    authorization_value: str,
    timeout: int,
    app_id: str,
) -> dict[str, bool]:
    payload = request_json(
        web_opener,
        origin,
        f"/servicesNS/nobody/{app_id}/data/ui/nav/default?output_mode=json",
        authorization_value,
        timeout,
    )
    navigation = first_entry_content(payload, "navigation_invalid").get("eai:data")
    if not isinstance(navigation, str):
        raise InstallError("navigation_invalid")
    return {
        icon: bool(
            re.search(
                rf'<a\s+href="{re.escape(href)}"\s+icon="{re.escape(icon)}">',
                navigation,
            )
        )
        for href, icon in EXPECTED_NAVIGATION_ICONS.items()
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--target-alias", required=True)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--app-id", required=True)
    parser.add_argument("--expected-version-prefix", required=True)
    parser.add_argument("--expected-ip-last-octet", type=int, required=True)
    parser.add_argument("--confirm-install")
    parser.add_argument("--confirm-update")
    parser.add_argument("--verify-installed", action="store_true")
    arguments = parser.parse_args()

    result: dict[str, Any] = {
        "target_alias": arguments.target_alias,
        "app_id": arguments.app_id,
        "credential_values_logged": False,
        "endpoint_logged": False,
        "mutation_count": 0,
        "status": "fail",
    }
    try:
        if not SAFE_NAME.fullmatch(arguments.target_alias):
            raise InstallError("target_alias_invalid")
        if not SAFE_NAME.fullmatch(arguments.app_id):
            raise InstallError("app_id_invalid")
        values = load_env(arguments.env_file)
        package_sha256 = inspect_archive(arguments.archive, arguments.app_id)
        authorization_value = authorization(values, arguments.prefix)
        context, tls_verification = ssl_context(values, arguments.prefix)
        timeout = timeout_seconds(values, arguments.prefix)
        origin, info_payload = select_origin(
            management_origins(values, arguments.prefix),
            authorization_value,
            context,
            timeout,
        )
        if not origin_matches_ipv4_last_octet(origin, arguments.expected_ip_last_octet):
            raise InstallError("target_address_mismatch")
        version = server_version(info_payload)
        if not version.startswith(arguments.expected_version_prefix):
            raise InstallError("server_version_mismatch")
        web_opener = opener(context)

        installed_payload: Mapping[str, Any] | None = None
        try:
            installed_payload = request_json(
                web_opener,
                origin,
                f"/services/apps/local/{arguments.app_id}?output_mode=json",
                authorization_value,
                timeout,
            )
        except InstallError as exc:
            if exc.code != "http_404":
                raise

        if installed_payload is not None:
            if not arguments.verify_installed and arguments.confirm_update != arguments.app_id:
                raise InstallError("app_already_installed")
        else:
            if arguments.verify_installed:
                raise InstallError("app_not_installed")
            if arguments.confirm_install != arguments.app_id:
                raise InstallError("install_confirmation_mismatch")

        if not arguments.verify_installed:
            with OneUsePackageServer(arguments.archive, origin) as package_server:
                install_payload = request_json(
                    web_opener,
                    origin,
                    "/services/apps/local?output_mode=json",
                    authorization_value,
                    max(timeout, 30),
                    form={
                        "filename": "true",
                        "name": package_server.package_url,
                        "update": "true" if installed_payload is not None else "false",
                    },
                )
                if not package_server.served.is_set():
                    raise InstallError("package_not_retrieved")
            entries = install_payload.get("entry")
            if not isinstance(entries, list) or not entries:
                raise InstallError("install_response_invalid")
            result["mutation_count"] = 1

            request_json(
                web_opener,
                origin,
                "/services/apps/local/_reload?output_mode=json&count=0",
                authorization_value,
                timeout,
                form={},
            )
            result["app_reload_performed"] = True

        metadata_payload = request_json(
            web_opener,
            origin,
            f"/services/apps/local/{arguments.app_id}?output_mode=json&refresh=true",
            authorization_value,
            timeout,
        )
        metadata = first_entry_content(metadata_payload, "app_metadata_invalid")
        visualization_results = {
            visualization: exact_object_present(
                web_opener,
                origin,
                authorization_value,
                timeout,
                f"/servicesNS/nobody/{arguments.app_id}/configs/conf-visualizations/"
                f"{visualization}?output_mode=json",
            )
            for visualization in REQUIRED_VISUALIZATIONS
        }
        demo_dashboard_loaded = exact_object_present(
            web_opener,
            origin,
            authorization_value,
            timeout,
            f"/servicesNS/nobody/{arguments.app_id}/data/ui/views/"
            "dashboard_help_badge_demo?output_mode=json",
        )
        navigation_icon_results = navigation_icons_present(
            web_opener,
            origin,
            authorization_value,
            timeout,
            arguments.app_id,
        )
        if (
            not all(visualization_results.values())
            or not demo_dashboard_loaded
            or not all(navigation_icon_results.values())
        ):
            raise InstallError("runtime_objects_missing")

        result.update(
            {
                "app_version": metadata.get("version"),
                "configured": metadata.get("configured"),
                "disabled": metadata.get("disabled"),
                "visible": metadata.get("visible"),
                "package_sha256": package_sha256,
                "server_version": version,
                "target_address_constraint_met": True,
                "tls_verification": tls_verification,
                "visualizations": visualization_results,
                "demo_dashboard_loaded": demo_dashboard_loaded,
                "navigation_icons": navigation_icon_results,
                "status": "pass",
            }
        )
    except InstallError as exc:
        result["error_code"] = exc.code

    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
