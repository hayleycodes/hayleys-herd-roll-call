"""Entry point: run recognition every INTERVAL_SECONDS, during daylight only."""
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import config
import pipeline


def is_daylight():
    hour = datetime.now(ZoneInfo(config.TZ)).hour
    return config.DAYLIGHT_START_HOUR <= hour < config.DAYLIGHT_END_HOUR


def main():
    cams = ", ".join(config.CAMERAS) or "(none configured!)"
    print(
        f"pig-recognizer starting. cameras: {cams} | "
        f"every {config.INTERVAL_SECONDS}s | "
        f"daylight {config.DAYLIGHT_START_HOUR:02d}:00-{config.DAYLIGHT_END_HOUR:02d}:00 {config.TZ}"
    )
    while True:
        if is_daylight():
            try:
                pipeline.run_once()
            except Exception as e:
                print(f"run failed: {e}")
        else:
            print("outside daylight hours, skipping")
        time.sleep(config.INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
