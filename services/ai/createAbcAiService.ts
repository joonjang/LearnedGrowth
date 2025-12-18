import { AbcAiService, AiError } from "@/models/aiService";
import { CloudAiService } from "./CloudAiService";
import { DevAiService } from "./DevAiService";
import { LocalAiService } from "./LocalAiService";
import { OfflineAiService } from "./OfflineAiService";

const mode = (process.env.EXPO_PUBLIC_AI_MODE as string | undefined)?.toLowerCase();

export async function createAbcAiService(): Promise<AbcAiService> {
  if (mode === "dev") {
    return new DevAiService();
  }

  if (mode === "offline") {
    return new OfflineAiService();
  }

  if (mode === "local") {
    const local = new LocalAiService();
    if (!(await local.ready())) {
      throw new AiError("local-unavailable", "Local AI mode selected but model is not ready");
    }
    return local;
  }

  const cloud = new CloudAiService();
  if (!(await cloud.ready())) {
    throw new AiError("config", "Cloud AI mode selected but API base URL is missing");
  }
  return cloud;
}
