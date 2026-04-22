import { getServerEnvVariables } from "./env";
import { TransmissionResponse } from "../types";

export type TransmissionTorrent = {
  id: number;
  name: string;
  hashString: string;
  percentDone: number;
  status: number;
  rateDownload: number;
  eta: number;
  downloadDir: string;
};

export async function listTorrents(): Promise<TransmissionTorrent[]> {
  const { TRANSMISSION_URL } = getServerEnvVariables();
  const payload = {
    method: "torrent-get",
    arguments: {
      fields: [
        "id",
        "name",
        "hashString",
        "percentDone",
        "status",
        "rateDownload",
        "eta",
        "downloadDir",
      ],
    },
  };
  let res = await makeTransmissionRequest(TRANSMISSION_URL, payload);
  if (res.status === 409) {
    const sid = res.headers.get("X-Transmission-Session-Id");
    if (!sid) throw new Error("Failed to get Transmission session ID");
    res = await makeTransmissionRequest(TRANSMISSION_URL, payload, sid);
  }
  if (!res.ok) {
    throw new Error(`Transmission RPC ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    arguments?: { torrents?: TransmissionTorrent[] };
  };
  return data.arguments?.torrents ?? [];
}

export async function addTorrent(
  torrentUrl: string,
  category: "audiobook" | "ebook",
): Promise<TransmissionResponse> {
  try {
    const {
      TRANSMISSION_URL,
      AUDIOBOOK_DESTINATION_PATH,
      EBOOK_DESTINATION_PATH,
    } = getServerEnvVariables();

    // Determine the download path based on category
    const downloadDir =
      category === "audiobook"
        ? AUDIOBOOK_DESTINATION_PATH
        : EBOOK_DESTINATION_PATH;

    // Prepare the request payload for Transmission RPC
    const payload = {
      method: "torrent-add",
      arguments: {
        filename: torrentUrl,
        "download-dir": downloadDir,
        paused: false,
      },
    };

    // First attempt without session ID
    let response = await makeTransmissionRequest(TRANSMISSION_URL, payload);

    // If we get a 409 response, it means we need to use the session ID
    if (response.status === 409) {
      const sessionId = response.headers.get("X-Transmission-Session-Id");
      if (!sessionId) {
        throw new Error("Failed to get Transmission session ID");
      }

      // Retry with the session ID
      response = await makeTransmissionRequest(
        TRANSMISSION_URL,
        payload,
        sessionId,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Transmission API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    if (result.result !== "success") {
      return {
        success: false,
        message: "Failed to add torrent",
        error: result.result,
      };
    }

    return {
      success: true,
      message: "Torrent added successfully",
    };
  } catch (error) {
    console.error("Error adding torrent:", error);
    return {
      success: false,
      message: "Failed to add torrent",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function makeTransmissionRequest(
  url: string,
  payload: any,
  sessionId?: string,
): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    // 'Authorization': `Basic ${apiKey}`
  };

  if (sessionId) {
    headers["X-Transmission-Session-Id"] = sessionId;
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}
