/**
 * 从 Wikimedia Commons 下载 CC 协议的宠物皮肤病/恢复期参考图。
 * 用作病灶跟踪 demo 的真实症状图。
 *
 * 运行: cd Community_backend && node scripts/fetch-wikimedia-images.js
 *
 * Wikimedia Commons API 规则:
 *   - 完全免费,无需 key
 *   - User-Agent 必须设置(否则可能被限流)
 *   - srnamespace=6 = File 命名空间
 *   - prop=imageinfo + iiurlwidth=800 = 直接返回缩略图 URL
 */

const fs = require("fs");
const path = require("path");

const TARGET_DIR = path.resolve(
  __dirname,
  "../../Front_Page/images/tracking"
);

// 浏览器 UA + Referer,避开 Wikimedia 对脚本直链下载的 403 策略
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Referer: "https://commons.wikimedia.org/",
  "Accept-Language": "en-US,en;q=0.9",
};

const SEARCHES = [
  // 7 天的恢复曲线,每天用一组备选关键词,第一个命中即用
  { day: 1, keywords: ["dog mange severe", "Demodicosis dog", "Sarcoptic mange", "Dog skin disease ringworm"] },
  { day: 2, keywords: ["Hot spots dog", "Pyoderma dog", "Dog skin infection", "Dog bald patch"] },
  { day: 3, keywords: ["Dog dermatitis", "Skin lesion dog", "Dog scratching skin", "Atopic dermatitis dog"] },
  { day: 4, keywords: ["Dog scab healing", "Dog skin recovery", "Dog after treatment", "Dog hair regrowth"] },
  { day: 5, keywords: ["Dog veterinary check", "Healthy shiba inu", "Dog fur back", "Shiba Inu portrait"] },
  { day: 6, keywords: ["Shiba Inu", "Akita dog", "Cute shiba", "Dog smiling"] },
  { day: 7, keywords: ["Happy dog", "Shiba inu running", "Healthy dog fur"] },
];

async function searchOneFile(keyword) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
    keyword
  )}&srnamespace=6&srlimit=15&origin=*`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const json = await res.json();
  const hits = json?.query?.search || [];
  // 接受 jpg/jpeg/png,过滤 svg/gif/webp/tiff
  const okExt = /\.(jpe?g|png)$/i;
  const pick = hits.find((h) => okExt.test(h.title));
  return pick ? pick.title : null;
}

async function getThumbUrl(title) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(
    title
  )}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`info ${res.status}`);
  const json = await res.json();
  const pages = json?.query?.pages || {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return {
    url: info.thumburl || info.url,
    license:
      info.extmetadata?.LicenseShortName?.value ||
      info.extmetadata?.License?.value ||
      "unknown",
  };
}

async function downloadOne(url, dest) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 带 429 重试的封装
async function withRetry(fn, label) {
  for (let i = 0; i < 4; i++) {
    try {
      return await fn();
    } catch (err) {
      if (/429/.test(err.message)) {
        const wait = (i + 1) * 4000;
        process.stdout.write(`(429,等${wait / 1000}s) `);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`${label} retry exhausted`);
}

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`==> 目标目录: ${TARGET_DIR}\n`);

  const records = [];

  for (const { day, keywords } of SEARCHES) {
    // 已下载则跳过
    const existing = ["jpg", "jpeg", "png"]
      .map((e) => path.join(TARGET_DIR, `day${day}.${e}`))
      .find((p) => fs.existsSync(p));
    if (existing) {
      console.log(
        `[Day ${day}] ⏭ 已存在 ${path.basename(existing)},跳过`
      );
      records.push({
        day,
        keyword: "(cached)",
        title: "(cached)",
        license: "(cached)",
        path: `/images/tracking/${path.basename(existing)}`,
      });
      continue;
    }

    let success = false;
    for (const keyword of keywords) {
      process.stdout.write(`[Day ${day}] "${keyword}" ... `);
      try {
        const title = await withRetry(() => searchOneFile(keyword), "search");
        await sleep(1500);
        if (!title) {
          console.log("无 jpg/png 结果");
          continue;
        }
        const info = await withRetry(() => getThumbUrl(title), "info");
        await sleep(1500);
        if (!info?.url) {
          console.log("无 URL");
          continue;
        }
        const ext = info.url.match(/\.(jpe?g|png)$/i)?.[1] || "jpg";
        const filename = `day${day}.${ext.toLowerCase()}`;
        const dest = path.join(TARGET_DIR, filename);
        const size = await withRetry(() => downloadOne(info.url, dest), "dl");
        await sleep(1500);
        console.log(
          `✅ ${filename} (${(size / 1024).toFixed(0)}KB,${info.license})`
        );
        records.push({
          day,
          keyword,
          title,
          license: info.license,
          path: `/images/tracking/${filename}`,
          size,
        });
        success = true;
        break;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        await sleep(2000);
      }
    }
    if (!success) console.log(`[Day ${day}] ⚠️ 全部备选失败,跳过\n`);
  }

  // 写一个 manifest 方便后续溯源
  const manifestPath = path.join(TARGET_DIR, "manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2)
  );
  console.log(`\n📋 已生成 ${manifestPath}`);
  console.log(`✅ 完成,${records.length}/7 张图就位`);
  console.log(
    `\n下一步:cd Community_backend && node scripts/seed-tracking-data.js (会用新图重建跟踪数据)`
  );
}

main().catch((err) => {
  console.error("脚本失败:", err);
  process.exit(1);
});
