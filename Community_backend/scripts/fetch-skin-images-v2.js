/**
 * v2:基于 Wikimedia 分类目录抓兽医皮肤病图,严格标题黑名单。
 * 目标:5 张真实皮肤病/恢复期照片,不要书本插画,不要无关健康宠物。
 *
 * 运行: cd Community_backend && node scripts/fetch-skin-images-v2.js
 */

const fs = require("fs");
const path = require("path");

const TARGET_DIR = path.resolve(__dirname, "../../Front_Page/images/tracking");
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Referer: "https://commons.wikimedia.org/",
};

// 候选分类(Wikimedia Commons 分类名)
const CATEGORIES = [
  "Sarcoptic mange",
  "Demodicosis",
  "Skin diseases of dogs",
  "Dog dermatology",
  "Dermatology of dogs",
  "Veterinary dermatology",
  "Dermatophytosis in animals",
  "Hot spot (veterinary)",
  "Pyoderma in dogs",
  "Mange",
];

// 标题黑名单(过滤掉书本插画、地图、显微镜片、解剖等)
const TITLE_BLOCKLIST = [
  /\b(18\d\d|19[0-2]\d)\b/i, // 1800s ~ 1920s
  /book|treatise|natural history|encyclopedi|engraving|illustration|woodcut|drawing|sketch/i,
  /microscop|histolog|cytolog|anatom|dissection|tissue/i,
  /map|chart|graph|diagram/i,
  /logo|cover|title page|page \d+/i,
  /scanning electron|electron microscop/i,
  /\bgraph\b|\btable\b/i,
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn) {
  for (let i = 0; i < 4; i++) {
    try {
      return await fn();
    } catch (err) {
      if (/429/.test(err.message)) {
        await sleep((i + 1) * 4000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("retry exhausted");
}

async function listCategoryFiles(cat) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:${encodeURIComponent(
    cat
  )}&cmtype=file&cmlimit=50`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`cat ${res.status}`);
  const json = await res.json();
  return (json?.query?.categorymembers || []).map((m) => m.title);
}

async function getFileInfo(title) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(
    title
  )}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=800`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`info ${res.status}`);
  const json = await res.json();
  const page = Object.values(json?.query?.pages || {})[0];
  return page?.imageinfo?.[0];
}

async function download(url, dest) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`dl ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function looksOk(title, info) {
  // 文件后缀
  if (!/\.(jpe?g|png)$/i.test(title)) return false;
  // 标题黑名单
  for (const re of TITLE_BLOCKLIST) {
    if (re.test(title)) return false;
  }
  // 必须有原图,且分辨率合理
  if (!info?.width || !info?.height) return false;
  if (info.width < 400 || info.height < 400) return false;
  // 描述里的可信度提示
  const desc = (info?.extmetadata?.ImageDescription?.value || "").toLowerCase();
  // 描述里有"book""scan""1900s"等的剔除
  if (/book|scan|illustrat|drawing|diagram/i.test(desc)) return false;
  return true;
}

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`==> 目标目录: ${TARGET_DIR}\n`);

  // 1. 收集所有候选标题
  const candidates = [];
  for (const cat of CATEGORIES) {
    process.stdout.write(`[分类] "${cat}" ... `);
    try {
      const files = await withRetry(() => listCategoryFiles(cat));
      console.log(`${files.length} 个文件`);
      candidates.push(...files);
      await sleep(1500);
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  // 去重
  const uniq = Array.from(new Set(candidates));
  console.log(`\n==> 候选 ${uniq.length} 个文件,逐个检查 metadata...\n`);

  // 2. 拉每个文件的 imageinfo,过滤
  const accepted = [];
  for (const title of uniq) {
    if (accepted.length >= 12) break; // 多挑几个备选
    try {
      const info = await withRetry(() => getFileInfo(title));
      if (!looksOk(title, info)) continue;
      console.log(`  ✓ ${title}`);
      accepted.push({ title, info });
      await sleep(800);
    } catch (err) {
      // 静默
    }
  }

  console.log(`\n==> ${accepted.length} 张通过筛选,开始下载前 5 张...\n`);

  // 3. 下载前 5 张到 day1.jpg ~ day5.jpg
  // 删除旧文件
  for (let i = 1; i <= 7; i++) {
    for (const ext of ["jpg", "jpeg", "png"]) {
      const p = path.join(TARGET_DIR, `day${i}.${ext}`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  const records = [];
  let day = 1;
  for (const { title, info } of accepted) {
    if (day > 5) break;
    const url = info.thumburl || info.url;
    const ext = url.match(/\.(jpe?g|png)$/i)?.[1] || "jpg";
    const filename = `day${day}.${ext.toLowerCase()}`;
    const dest = path.join(TARGET_DIR, filename);
    try {
      const size = await withRetry(() => download(url, dest));
      const lic =
        info?.extmetadata?.LicenseShortName?.value || "unknown license";
      console.log(`  Day ${day} ← ${filename} (${(size / 1024).toFixed(0)}KB)`);
      console.log(`         源: ${title}`);
      console.log(`         License: ${lic}`);
      records.push({
        day,
        title,
        license: lic,
        path: `/images/tracking/${filename}`,
        size,
        sourceUrl: url,
      });
      day++;
      await sleep(1500);
    } catch (err) {
      console.log(`  Day ${day} ✗ ${err.message}(尝试下一个)`);
    }
  }

  // 4. 写 manifest
  fs.writeFileSync(
    path.join(TARGET_DIR, "manifest.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), totalCandidates: uniq.length, records },
      null,
      2
    )
  );

  console.log(`\n✅ 完成,${records.length}/5 张图就位`);
  if (records.length < 5) {
    console.log(`⚠️ 不足 5 张,请重跑或换分类`);
  }
}

main().catch((err) => {
  console.error("脚本失败:", err);
  process.exit(1);
});
