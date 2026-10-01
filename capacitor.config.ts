import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jack.myschedule",
  appName: "我的日程",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0a0f",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0a0f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
    },
  },
};

export default config;
