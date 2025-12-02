
import { AbcAiService } from "@/models/aiService";
import { CloudAiService } from "./CloudAiService";
// import { LocalAiService } from "./LocalAiService";

// async function hasLocalModelReady(): Promise<boolean> {
//   // TODO: check AsyncStorage flag, device capabilities, model download, settings, etc.
//   return false;
// }

export async function createAbcAiService(): Promise<AbcAiService> {
//   const canUseLocal = await hasLocalModelReady();

//   if (canUseLocal) {
//     const localLlm = /* init your on-device model here */;
//     return new LocalAiService(localLlm);
//   }

  return new CloudAiService();
}
