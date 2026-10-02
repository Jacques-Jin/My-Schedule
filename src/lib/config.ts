import { Capacitor } from "@capacitor/core";

export const SITE_ORIGIN = "https://my-schedule-akzzfsdx3vh.qoder.zone";

const API_BASE_NATIVE = `${SITE_ORIGIN}/functions/v1/app`;
const API_BASE_WEB = "/functions/v1/app";

export const API_BASE = Capacitor.isNativePlatform() ? API_BASE_NATIVE : API_BASE_WEB;
