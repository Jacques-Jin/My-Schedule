import { Capacitor } from "@capacitor/core";

const API_BASE_NATIVE = "https://my-schedule-akzzfsdx3vh.qoder.zone/functions/v1/app";
const API_BASE_WEB = "/functions/v1/app";

export const API_BASE = Capacitor.isNativePlatform() ? API_BASE_NATIVE : API_BASE_WEB;
