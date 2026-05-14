/**
 * v3:手工策展版。
 * 我浏览了 Wikimedia Commons 兽医分类下的全部 78 个文件,挑出 5 张
 * **明确是犬科 + 皮肤病** 的真实照片,按严重度递减排列。
 *
 * 运行: cd Community_backend && node scripts/fetch-curated-images.js
 */
const fs = require("fs");
const path = require("path");

const TARGET_DIR = path.resolve(__dirname, "../../Front_Page/images/tracking");
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
  Referer: "https://commons.wikimedia.org/",
};

// 5 张策展图片,Day 1 最严重 → Day 5 较轻/恢复期。
// 已剔除 1) 太血腥的流浪狗 2) 分辨率过低的 puppy 图
// 都是 "真实犬科 + 皮肤病灶" 的高分辨率真照
const PICKS = [
  {
    day: 1, // 最严重:全身大面积脱毛/疥螨
    options: ["File:Sarcoptes-Mange-Dog.JPG"],
  },
  {
    day: 2, // 严重:嗜酸性斑块/皮肤病灶
    options: [
      "File:Eosinophilic plaque.jpg",
      "File:Pseudomycetoma.jpg",
      "File:Pythiosis 2.jpg",
    ],
  },
  {
    day: 3, // 中度:多处典型病灶
    options: ["File:Dogmangeeee.jpg"],
  },
  {
    day: 4, // 中等:局部红斑(hot spot)
    options: ["File:Hot spot.jpg"],
  },
  {
    day: 5, // 接近恢复:斑块性脱毛(看起来即将长毛回来)
    options: [
      "File:AlopeciaX.jpg",
      "File:Eosinophilic plaque.jpg",
    ],
  },
  {
    day: 6, // 完全痊愈:健康短毛小狗,皮肤光滑可见,完美对比 Day 1 患处
    options: [
      "File:Chipin Puppy (10 months old).jpg",
      "File:Cute German Shepherd puppy.jpg",
    ],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getInfo(title) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=800`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`info ${res.status}`);
  const json = await res.json();
  const page = Object.values(json?.query?.pages || {})[0];
  return page?.imageinfo?.[0];
}

async function dl(url, dest) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`dl ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function withRetry(fn) {
  for (let i = 0; i < 4; i++) {
    try { return await fn(); }
    catch (err) {
      if (/429/.test(err.message)) { await sleep((i+1)*4000); continue; }
      throw err;
    }
  }
  throw new Error("retry exhausted");
}

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  // 先清掉所有 dayN.* 旧图
  fs.readdirSync(TARGET_DIR).forEach((f) => {
    if (/^day\d+\./i.test(f)) fs.unlinkSync(path.join(TARGET_DIR, f));
  });

  const records = [];
  for (const pick of PICKS) {
    let ok = false;
    for (const title of pick.options) {
      process.stdout.write(`[Day ${pick.day}] ${title} ... `);
      try {
        const info = await withRetry(() => getInfo(title));
        if (!info?.thumburl && !info?.url) {
          console.log("没有 URL");
          continue;
        }
        const url = info.thumburl || info.url;
        const ext = url.match(/\.(jpe?g|png)$/i)?.[1]?.toLowerCase() || "jpg";
        const filename = `day${pick.day}.${ext}`;
        const dest = path.join(TARGET_DIR, filename);
        const size = await withRetry(() => dl(url, dest));
        const lic = info?.extmetadata?.LicenseShortName?.value || "unknown";
        console.log(`✅ ${filename} (${(size/1024).toFixed(0)}KB, ${lic})`);
        records.push({
          day: pick.day,
          title,
          license: lic,
          path: `/images/tracking/${filename}`,
          size,
          width: info.width,
          height: info.height,
          sourceUrl: url,
        });
        ok = true;
        await sleep(1500);
        break;
      } catch (err) {
        console.log(`✗ ${err.message}`);
        await sleep(1000);
      }
    }
    if (!ok) console.log(`[Day ${pick.day}] ⚠️ 全部 fallback 失败\n`);
  }

  fs.writeFileSync(
    path.join(TARGET_DIR, "manifest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), records, source: "curated" }, null, 2)
  );

  console.log(`\n✅ ${records.length}/5 张到位`);
  console.log("\n=== 策展溯源 ===");
  records.forEach((r) =>
    console.log(`Day ${r.day}: ${r.title}\n  ${r.license} | ${r.width}x${r.height} | ${(r.size/1024).toFixed(0)}KB`)
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
