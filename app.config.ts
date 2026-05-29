import type { ExpoConfig } from "expo/config";

const TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

const baseConfig = require("./app.json").expo as ExpoConfig;

function withAdMobPlugin(config: ExpoConfig): ExpoConfig {
  const androidAppId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim() || TEST_ANDROID_APP_ID;
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim() || TEST_IOS_APP_ID;

  const plugins = [...(config.plugins ?? [])];
  const pluginName = "react-native-google-mobile-ads";
  const pluginTuple: [string, { androidAppId: string; iosAppId: string }] = [pluginName, {
    androidAppId,
    iosAppId,
  }];

  const existingIndex = plugins.findIndex((entry) =>
    Array.isArray(entry) ? entry[0] === pluginName : entry === pluginName
  );

  if (existingIndex >= 0) {
    plugins[existingIndex] = pluginTuple;
  } else {
    plugins.push(pluginTuple);
  }

  return {
    ...config,
    plugins,
  };
}

export default withAdMobPlugin(baseConfig);
