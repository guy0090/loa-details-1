import axios from "axios";
import { Settings } from "../app-settings";
import { sleep } from "../helpers";


export interface User {
  id: string;
  discordId: string;
  discordUsername: string;
  disriminator: string;
  avatar: string;
  registeredDate: number;
  lastSeen: number;
  banned: boolean;
}

export interface OAuthResponse {
  user: User;
  token: string;
}

export async function register(code: string, appSettings: Settings, retries = 5): Promise<OAuthResponse> {
  let count = 0;
  let error: Error | undefined

  while (count < retries) {
    count++
    try {
      const apiUrl = appSettings.uploads.api.value ?? appSettings.uploads.api.defaultValue;
      if (!apiUrl) throw new Error("API URL is not set in settings. Please set it and try again.");

      const loginEndpoint = `${apiUrl}/oauth/${code}`
      const res = await axios.post(loginEndpoint);

      return res.data as OAuthResponse;
    } catch (err) {
      error = err as Error;
    }
    await sleep(1000);
    console.log("Retrying...", count);
  }
  throw error || new Error("Failed to register with API");
}
