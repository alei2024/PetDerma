/**
 * 列出兽医皮肤病分类下的所有候选标题(不下载,只浏览)
 */
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CATS = [
  "Sarcoptic mange",
  "Veterinary dermatology",
  "Dermatophytosis in animals",
  "Dogs with skin conditions", // 试一下
  "Mange in dogs",
];

(async () => {
  for (const cat of CATS) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:${encodeURIComponent(cat)}&cmtype=file&cmlimit=80`;
    try {
      const res = await fetch(url, { headers: HEADERS });
      const json = await res.json();
      const titles = (json?.query?.categorymembers || []).map((m) => m.title);
      console.log(`\n=== Category: ${cat}(${titles.length}个)===`);
      titles.forEach((t) => console.log("  " + t));
    } catch (e) {
      console.log(`\n=== Category: ${cat} → ERR ${e.message} ===`);
    }
    await sleep(1500);
  }
})();
