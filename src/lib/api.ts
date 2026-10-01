import { API_BASE } from "./config";

const BASE = API_BASE;

export async function requestJson(action: string, payload?: unknown): Promise<any> {
  const isGet = payload === undefined;
  const url = isGet ? `${BASE}?action=${encodeURIComponent(action)}` : `${BASE}?action=${encodeURIComponent(action)}`;
  const init: RequestInit = isGet
    ? { method: "GET", headers: { Accept: "application/json" } }
    : { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) };

  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || `http_${res.status}`);
  }
  return json.data;
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
