import log from "electron-log";
import { createWriteStream, readFileSync } from "fs";
import { LogParser } from "loa-details-log-parser";
import { MeterData } from "meter-core/data";
import { Decompressor } from "meter-core/decompressor";
import { LegacyLogger } from "meter-core/legacy-logger";
import { PktCaptureAll, PktCaptureMode } from "meter-core/pkt-capture";
import { PKTStream } from "meter-core/pkt-stream";
import { join } from "path";
import { mainFolder } from "./util/directories.js";

export function InitLogger(
  logParser: LogParser,
  useRawSocket: boolean,
  listenPort: number
) {
  // create MeterData and read data
  const meterData = new MeterData();
  meterData.processEnumData(
    JSON.parse(readFileSync("./meter-data/databases/Enums.json", "utf-8"))
  );
  meterData.processNpcData(
    JSON.parse(readFileSync("./meter-data/databases/Npc.json", "utf-8"))
  );
  meterData.processPCData(
    JSON.parse(readFileSync("./meter-data/databases/PCData.json", "utf-8"))
  );
  meterData.processSkillData(
    JSON.parse(readFileSync("./meter-data/databases/Skill.json", "utf-8"))
  );
  meterData.processSkillBuffData(
    JSON.parse(readFileSync("./meter-data/databases/SkillBuff.json", "utf-8"))
  );
  meterData.processSkillBuffEffectData(
    JSON.parse(readFileSync("./meter-data/databases/SkillEffect.json", "utf-8"))
  );

  // create Decompressor
  const oodle_state = readFileSync("./meter-data/oodle_state.bin");
  const xorTable = readFileSync("./meter-data/xor.bin");
  const compressor = new Decompressor(oodle_state, xorTable);
  /*
  //Stress test repro-code
  const lines = readFileSync(
    process.env.APPDATA + "/LOA Details/logs/repro2.log",
    "utf-8"
  ).split(/\r?\n/);
  setTimeout(() => {
    setInterval(() => {
      let index = 0;
      while (index < 1) {
        lines.forEach((line) => {
          const split = line.split("|");
          if (split.length < 4) return;
          try {
            const data = compressor.decrypt(
              Buffer.from(split[3], "hex"),
              parseInt(split[0]),
              parseInt(split[1]),
              split[2] == "true"
            );
          } catch (e) {
            //console.error(e);
          }
        });
        index++;
      }
      console.log("done");
    }, 50);
  }, 10000);
  */
  /*
  let prevTime: number;
  setTimeout(async () => {
    const lines = readFileSync(
      process.env.APPDATA + "/LOA Details/logs/repro_dmg2.log",
      "utf-8"
    ).split(/\r?\n/);
    for (const line of lines) {
      logParser.parseLogLine(line);
      const split = line.split("|");
      const date = Date.parse(split[1]);
      if (!prevTime) prevTime = date;
      console.log(line, date - prevTime);
      await new Promise((r) => setTimeout(r, date - prevTime));
      prevTime = date;
    }
  }, 10000);
  */
  // create Decompressor & LegacyLogger
  const stream = new PKTStream(compressor);
  const legacyLogger = new LegacyLogger(stream, meterData);

  // log file stuff
  const padTo2Digits = (num: number) => num.toString().padStart(2, "0");
  const date = new Date();
  const filename =
    "LostArk_" +
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
    ].join("-") +
    ".log";
  const logfile = createWriteStream(join(mainFolder, filename), {
    highWaterMark: 0,
    encoding: "utf-8",
  });
  //TODO: write version to log?
  legacyLogger.on("line", (line) => {
    logParser.parseLogLine(line);
    logfile?.write(line);
    logfile?.write("\n");
  });
  // finaly create packet capture
  const capture = new PktCaptureAll(
    useRawSocket ? PktCaptureMode.MODE_RAW_SOCKET : PktCaptureMode.MODE_PCAP,
    listenPort
  );
  log.info(
    `Listening on ${capture.captures.size} devices(s): ${[
      ...capture.captures.keys(),
    ].join(", ")}`
  );
  capture.on("packet", (buf) => {
    try {
      const badPkt = stream.read(buf);
      if (badPkt === false) log.error(`bad pkt ${buf.toString("hex")}`);
    } catch (e) {
      log.error(e);
    }
  });
}
