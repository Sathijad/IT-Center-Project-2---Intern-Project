"""
OWASP ZAP hook to suppress known development-only endpoints and alerts.

This runs inside the ZAP container path /zap/wrk/hook.py
"""

import re


def zap_started(zap, target):
    # Disable alpha/beta passive scan rules to reduce noise in dev
    try:
        zap.pscan.set_enabled(False)
        zap.pscan.set_enabled(True)
    except Exception:
        pass


def scanners_to_exclude():
    # Return scanner IDs to ignore (examples for mixed content, CSP in dev)
    return {
        # 10055: Mixed content (passive)
        10055,
        # 10038: Content Security Policy (missing)
        10038,
    }


def alert_filter(alert):
    """
    Return True to keep the alert, False to suppress it.
    """
    url = alert.get('url', '')
    risk = alert.get('risk', '')
    plugin_id = int(alert.get('pluginId', -1))

    # Ignore dev-only paths and mocks
    dev_path_patterns = [
        r"/mock/",
        r"/swagger(?:-ui)?/",
        r"/v3/api-docs",
        r"/h2-console",
        r"/actuator(?:/.*)?",
    ]

    if any(re.search(p, url) for p in dev_path_patterns):
        return False

    if plugin_id in scanners_to_exclude():
        return False

    # Example: suppress Medium on static assets in dev
    if risk == 'Medium' and re.search(r"\.(?:png|jpg|jpeg|gif|css|js|map)$", url):
        return False

    return True


def alerts_process(alerts):
    return [a for a in alerts if alert_filter(a)]


