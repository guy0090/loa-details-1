import log from "electron-log";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "../app-settings";
import { sleep } from "../helpers";


export interface User {
  id: string;
  discordId: string;
  discordUsername: string;
  discriminator: string;
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
  const apiUrl = appSettings.uploads.api.value ?? appSettings.uploads.api.defaultValue;
  if (!apiUrl || apiUrl === "") throw new Error("API URL is not set in settings. Please set it and try again.");

  let count = 0;
  let error: Error | undefined

  while (count < retries) {
    count++
    try {
      const loginEndpoint = `${apiUrl}/oauth/${code}`
      const options = {
        url: loginEndpoint,
        method: "POST",
        headers: { "x-client": "desktop" },
      } as AxiosRequestConfig

      const res = await axios(options);
      return res.data as OAuthResponse;
    } catch (err) {
      error = err as Error;
    }
    await sleep(1000);
    log.warn(`Retrying Discord OAuth register ${count}/${retries}`);
  }
  throw error || new Error("Failed to register with Discord");
}

export async function login(appSettings: Settings, retries = 5): Promise<OAuthResponse> {
  const token = appSettings.uploads.jwt;
  if (!token || token === "") throw new Error("No token found in settings. Please login again.");

  const apiUrl = appSettings.uploads.api.value ?? appSettings.uploads.api.defaultValue;
  if (!apiUrl || apiUrl === "") throw new Error("API URL is not set in settings. Please set it and try again.");

  let count = 0;
  let error: Error | undefined

  while (count < retries) {
    count++
    try {
      const loginEndpoint = `${apiUrl}/oauth/login`
      const options = {
        url: loginEndpoint,
        method: "GET",
        headers: { "Cookie": `at1=${token}; Path=/;` },
        withCredentials: true,
      } as AxiosRequestConfig

      const res = await axios(options);
      return res.data as OAuthResponse;
    } catch (err) {
      error = err as Error;
    }
    await sleep(1000);
    log.warn(`Retrying Discord OAuth login ${count}/${retries}`);
  }
  throw error || new Error("Failed logging in with Discord");
}
