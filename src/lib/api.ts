import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { API_BASE, SITE_ORIGIN } from "./config";

const BASE = API_BASE;

function assertOk(status: number, json: any) {
  if (status < 200 || status >= 300 || json?.error) {
    throw new Error(json?.error || `http_${status}`);
  }
  return json.data;
}

export async function requestJson(action: string, payload?: unknown): Promise<any> {
  const isGet = payload === undefined;
  const url = `${BASE}?action=${encodeURIComponent(action)}`;

  if (Capacitor.isNativePlatform()) {
    // The Sites gateway rejects /functions calls whose Origin is not the site
    // domain. WebView fetch strips Origin as a forbidden header, so go through
    // the native HTTP plugin, which applies headers verbatim.
    const res = await CapacitorHttp.request({
      url,
      method: isGet ? "GET" : "POST",
      headers: isGet
        ? { Accept: "application/json", Origin: SITE_ORIGIN }
        : { "Content-Type": "application/json", Accept: "application/json", Origin: SITE_ORIGIN },
      data: isGet ? undefined : JSON.stringify(payload),
    });
    const json = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    return assertOk(res.status, json);
  }

  const init: RequestInit = isGet
    ? { method: "GET", headers: { Accept: "application/json" } }
    : { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) };

  const res = await fetch(url, init);
  const json = await res.json();
  return assertOk(res.status, json);
}

export const api = {
  bootstrap: () => requestJson("bootstrap"),
  semesterSave: (data: any) => requestJson("semester.save", data),
  semesterSetCurrent: (id: string) => requestJson("semester.setCurrent", { id }),
  semesterDelete: (id: string) => requestJson("semester.delete", { id }),
  holidaySave: (data: any) => requestJson("holiday.save", data),
  holidayDelete: (id: string) => requestJson("holiday.delete", { id }),
  periodSave: (slots: any[]) => requestJson("period.save", { slots }),
  courseSave: (data: any) => requestJson("course.save", data),
  courseDelete: (id: string) => requestJson("course.delete", { id }),
  taskSave: (data: any) => requestJson("task.save", data),
  taskDelete: (id: string) => requestJson("task.delete", { id }),
  taskBatch: (params: any) => requestJson("task.batch", params),
  taskComplete: (params: any) => requestJson("task.complete", params),
  campaignSave: (data: any) => requestJson("campaign.save", data),
  campaignDelete: (id: string) => requestJson("campaign.delete", { id }),
  campaignAttach: (params: any) => requestJson("campaign.attach", params),
  countdownSave: (data: any) => requestJson("countdown.save", data),
  countdownDelete: (id: string) => requestJson("countdown.delete", { id }),
  homeworkSave: (data: any) => requestJson("homework.save", data),
  homeworkDelete: (id: string) => requestJson("homework.delete", { id }),
  homeworkComplete: (params: any) => requestJson("homework.complete", params),
  dayOverrideSave: (data: any) => requestJson("dayOverride.save", data),
  dayOverrideDelete: (params: any) => requestJson("dayOverride.delete", params),
  settingsSave: (data: any) => requestJson("settings.save", data),
  dataExport: () => requestJson("data.export"),
  dataImport: (data: any) => requestJson("data.import", data),
  seedIfEmpty: () => requestJson("seed.ifEmpty"),
};
